import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

/* === The vendored Germany data ===
 *
 * Structural checks over the committed files: the geometry, the metadata and
 * the Landeswappen must agree on the same sixteen ISO 3166-2 keys, with no
 * orphans in any direction. The same checks run in tools/data-review.html.
 */

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));

const topology = readJson('data/bundeslaender.topo.json');
const kulisse = readJson('data/kulisse.topo.json');
const metadata = readJson('data/bundeslaender.json');
const wappenFiles = fs.readdirSync(new URL('wappen/', root)).filter(f => !f.startsWith('.'));

const ISO_KEYS = [
  'DE-BB', 'DE-BE', 'DE-BW', 'DE-BY', 'DE-HB', 'DE-HE', 'DE-HH', 'DE-MV',
  'DE-NI', 'DE-NW', 'DE-RP', 'DE-SH', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-TH',
];

const geometries = topology.objects.bundeslaender.geometries;
const geometryKeys = geometries.map(g => g.id);
const metadataKeys = Object.keys(metadata);
const wappenFile = key => `${key.toLowerCase()}.svg`;

/**
 * Bundesländer that share at least one arc — a stretch of border, not a single
 * point — keyed by id. An arc index i is stored as ~i when a ring runs it
 * backwards, so both spellings name the same arc.
 */
function adjacencyFromArcs(geoms) {
  const owners = new Map();
  const visit = (arcs, id) => {
    for (const a of arcs) {
      if (Array.isArray(a)) { visit(a, id); continue; }
      const index = a < 0 ? ~a : a;
      if (!owners.has(index)) owners.set(index, new Set());
      owners.get(index).add(id);
    }
  };
  for (const g of geoms) visit(g.arcs, g.id);

  const neighbours = Object.fromEntries(geoms.map(g => [g.id, new Set()]));
  for (const ids of owners.values()) {
    for (const a of ids) for (const b of ids) if (a !== b) neighbours[a].add(b);
  }
  return neighbours;
}

/* === Geometry === */

test('the geometry holds exactly sixteen Bundesländer', () => {
  assert.strictEqual(geometries.length, 16);
  assert.strictEqual(new Set(geometryKeys).size, 16);
});

test('every geometry is keyed by an ISO 3166-2 code', () => {
  assert.deepStrictEqual([...geometryKeys].sort(), ISO_KEYS);
});

test('the Kulisse holds no German territory', () => {
  const ids = kulisse.objects.kulisse.geometries.map(g => g.id);
  assert.ok(ids.length > 0);
  assert.ok(!ids.includes('DE'));
  assert.ok(ids.every(id => !String(id).startsWith('DE-')));
});

/* === The three sets agree === */

test('every geometry key has metadata', () => {
  assert.deepStrictEqual(geometryKeys.filter(k => !(k in metadata)), []);
});

test('every metadata key has geometry', () => {
  assert.deepStrictEqual(metadataKeys.filter(k => !geometryKeys.includes(k)), []);
});

test('every geometry key has a Landeswappen file', () => {
  assert.deepStrictEqual(geometryKeys.filter(k => !wappenFiles.includes(wappenFile(k))), []);
});

test('there are no orphan Landeswappen files', () => {
  const expected = geometryKeys.map(wappenFile);
  assert.deepStrictEqual(wappenFiles.filter(f => !expected.includes(f)), []);
});

/* === Metadata === */

test('every metadata field is populated with the right type', () => {
  for (const [key, m] of Object.entries(metadata)) {
    const where = `${key}: `;
    assert.ok(typeof m.name === 'string' && m.name.length > 0, where + 'name');
    assert.ok(typeof m.capital === 'string' && m.capital.length > 0, where + 'capital');
    assert.ok(Number.isInteger(m.population) && m.population > 0, where + 'population');
    assert.ok(typeof m.area_km2 === 'number' && m.area_km2 > 0, where + 'area_km2');
    assert.ok(typeof m.highest_point?.name === 'string' && m.highest_point.name.length > 0,
      where + 'highest_point.name');
    assert.ok(typeof m.highest_point?.elevation_m === 'number' && m.highest_point.elevation_m > 0,
      where + 'highest_point.elevation_m');
    assert.ok(Number.isInteger(m.neighbour_count) && m.neighbour_count > 0, where + 'neighbour_count');
    if ('capital_variants' in m) {
      assert.ok(Array.isArray(m.capital_variants) && m.capital_variants.length > 0, where + 'capital_variants');
      assert.ok(m.capital_variants.every(v => typeof v === 'string' && v.length > 0), where + 'capital_variants[]');
    }
  }
});

test('the Stadtstaaten have the Nachbarländer counts that are easy to get wrong', () => {
  assert.strictEqual(metadata['DE-BE'].neighbour_count, 1);
  assert.strictEqual(metadata['DE-HB'].neighbour_count, 1);
  assert.strictEqual(metadata['DE-HH'].neighbour_count, 2);
});

test('every curated Nachbarländer count matches the borders shared in the topology', () => {
  const neighbours = adjacencyFromArcs(geometries);
  for (const key of metadataKeys) {
    assert.strictEqual(metadata[key].neighbour_count, neighbours[key].size,
      `${key}: curated ${metadata[key].neighbour_count}, topology ${[...neighbours[key]].sort()}`);
  }
});

/* === The Gewässer & Städte data ===
 *
 * The OSM-derived geometry (data/gewaesser.topo.json, data/staedte.json) and
 * the hand-curated data/landmarks.json must agree on the same 53 feature ids,
 * and the curated facts must fit the geometry: cities inside their
 * Bundesland, lakes in the Länder they list, rivers no further out than the
 * clip to Germany + 5 km allows. Spec: .scratch/gewaesser-staedte/spec.md.
 */

const gewaesser = readJson('data/gewaesser.topo.json');
const staedte = readJson('data/staedte.json');
const landmarks = readJson('data/landmarks.json');

const riverGeoms = gewaesser.objects.rivers.geometries;
const lakeGeoms = gewaesser.objects.lakes.geometries;
const cityPoints = staedte.features;
const records = Object.entries(landmarks);
const ofType = type => records.filter(([, r]) => r.type === type);

/**
 * The rings of a TopoJSON (Multi)Polygon as arrays of [lon, lat]. The vendored
 * files are unquantized (no `transform`), so an arc is its coordinates as is;
 * arc ~i is arc i run backwards.
 */
function polygonsOf(topology, geometry) {
  const arc = i => (i < 0 ? [...topology.arcs[~i]].reverse() : topology.arcs[i]);
  const ring = indices => indices.flatMap((i, n) => (n === 0 ? arc(i) : arc(i).slice(1)));
  const polygon = rings => rings.map(ring);
  if (geometry.type === 'Polygon') return [polygon(geometry.arcs)];
  if (geometry.type === 'MultiPolygon') return geometry.arcs.map(polygon);
  return [];
}

/** Every [lon, lat] of a TopoJSON line or polygon geometry. */
function coordinatesOf(topology, geometry) {
  const flat = a => (typeof a === 'number' ? [a] : a.flatMap(flat));
  return flat(geometry.arcs).flatMap(i => topology.arcs[i < 0 ? ~i : i]);
}

/** Even-odd ray casting, so holes are respected. */
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygons = (point, polygons) =>
  polygons.some(([outer, ...holes]) => inRing(point, outer) && !holes.some(h => inRing(point, h)));

/** Area-weighted centroid of a polygon's outer ring, in plain lon/lat. */
function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  return { area: Math.abs(a / 2), point: [cx / (3 * a), cy / (3 * a)] };
}

const bundeslandPolygons = Object.fromEntries(geometries.map(g => [g.id, polygonsOf(topology, g)]));

/* === The three sets agree === */

test('the landmark geometry holds 18 rivers, 11 lakes and 24 city points', () => {
  assert.strictEqual(riverGeoms.length, 18);
  assert.strictEqual(lakeGeoms.length, 11);
  assert.strictEqual(cityPoints.length, 24);
  assert.ok(cityPoints.every(f => f.geometry.type === 'Point'));
});

test('every landmark record has geometry of its own type', () => {
  const geometryIds = {
    river: riverGeoms.map(g => g.id),
    lake: lakeGeoms.map(g => g.id),
    city: cityPoints.map(f => f.id),
  };
  assert.deepStrictEqual(records.filter(([id, r]) => !geometryIds[r.type]?.includes(id)).map(([id]) => id), []);
});

test('every landmark geometry has a record', () => {
  const ids = [...riverGeoms, ...lakeGeoms, ...cityPoints].map(g => g.id);
  assert.strictEqual(new Set(ids).size, 53);
  assert.deepStrictEqual(ids.filter(id => !(id in landmarks)), []);
});

/* === Counts, pool flags, articles === */

test('10 pool and 8 background rivers, 7 pool and 4 background lakes, 8 + 16 cities all in the pool', () => {
  const count = (type, pool) => ofType(type).filter(([, r]) => r.pool === pool).length;
  assert.strictEqual(count('river', true), 10);
  assert.strictEqual(count('river', false), 8);
  assert.strictEqual(count('lake', true), 7);
  assert.strictEqual(count('lake', false), 4);
  assert.strictEqual(count('city', false), 0);
  assert.strictEqual(ofType('city').filter(([, r]) => !r.capital_of).length, 8);
  assert.strictEqual(ofType('city').filter(([, r]) => r.capital_of).length, 16);
  assert.strictEqual(records.length, 53);
});

test('every id is a typed slug and every record carries its Wikidata and OSM ids', () => {
  for (const [id, r] of records) {
    assert.match(id, new RegExp(`^${r.type}-[a-z]+(-[a-z]+)*$`), id);
    assert.match(r.wikidata, /^Q\d+$/, id);
    assert.ok(Array.isArray(r.osm) && r.osm.length > 0, id);
    assert.ok(r.osm.every(o => /^(node|way|relation)\/\d+$/.test(o)), id);
    assert.strictEqual(typeof r.pool, 'boolean', id);
    assert.ok(typeof r.name === 'string' && r.name.length > 0, id);
  }
});

test('waters carry der/die/das, cities no article', () => {
  for (const [id, r] of records) {
    if (r.type === 'city') assert.strictEqual(r.article, null, id);
    else assert.ok(['der', 'die', 'das'].includes(r.article), `${id}: ${r.article}`);
  }
});

test('every landmark fact is populated with the right type', () => {
  const positive = v => typeof v === 'number' && v > 0;
  for (const [id, r] of records) {
    if (r.type === 'river') assert.ok(Number.isInteger(r.length_km) && r.length_km > 0, `${id}: length_km`);
    if (r.type === 'lake') {
      assert.ok(positive(r.area_km2), `${id}: area_km2`);
      assert.ok(positive(r.max_depth_m), `${id}: max_depth_m`);
      assert.ok(Array.isArray(r.bundeslaender) && r.bundeslaender.length > 0, `${id}: bundeslaender`);
      assert.ok(r.bundeslaender.every(k => ISO_KEYS.includes(k)), `${id}: bundeslaender keys`);
    }
    if (r.type === 'city') {
      assert.ok(Number.isInteger(r.population) && r.population > 0, `${id}: population`);
      assert.ok(ISO_KEYS.includes(r.bundesland), `${id}: bundesland`);
    } else {
      assert.ok(!('capital_of' in r), `${id}: capital_of on a water`);
    }
  }
});

test('the Bodensee lists exactly the German Länder it touches', () => {
  assert.deepStrictEqual(landmarks['lake-bodensee'].bundeslaender, ['DE-BW', 'DE-BY']);
});

test('the Schweriner See is pinned to the Außensee and the Innensee', () => {
  assert.deepStrictEqual(landmarks['lake-schweriner-see'].osm, ['relation/1104680', 'relation/21142']);
});

/* === Landeshauptstädte === */

test('each Landeshauptstadt is named exactly as bundeslaender.json names the capital', () => {
  const capitals = ofType('city').filter(([, r]) => r.capital_of);
  assert.deepStrictEqual(capitals.map(([, r]) => r.capital_of).sort(), ISO_KEYS);
  for (const [id, r] of capitals) {
    assert.strictEqual(r.name, metadata[r.capital_of].capital, id);
    assert.strictEqual(r.bundesland, r.capital_of, id);
  }
});

/* === Geometry fits the facts === */

test('every city point lies inside its Bundesland', () => {
  const outside = cityPoints
    .filter(f => !inPolygons(f.geometry.coordinates, bundeslandPolygons[landmarks[f.id].bundesland]))
    .map(f => `${f.id} ${f.geometry.coordinates} not in ${landmarks[f.id].bundesland}`);
  assert.deepStrictEqual(outside, []);
});

test('city points are stored at 4 decimals', () => {
  const decimals = v => (String(v).split('.')[1] || '').length;
  assert.ok(cityPoints.every(f => f.geometry.coordinates.every(v => decimals(v) <= 4)));
});

/** Planar distance (in degrees, good enough to rank) from a point to a polygon's edges. */
function distanceToPolygons([x, y], polygons) {
  let best = Infinity;
  for (const ring of polygons.flat()) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
      const dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  }
  return best;
}

test("each lake's centroid lies in one of its Bundesländer", () => {
  for (const g of lakeGeoms) {
    // The centroid of the lake's largest part (the Bodensee's Obersee, the
    // Schweriner See's Außensee).
    const parts = polygonsOf(gewaesser, g).map(([outer]) => ringCentroid(outer));
    const { point } = parts.reduce((a, b) => (b.area > a.area ? b : a));
    const lands = landmarks[g.id].bundeslaender;
    const where = `${g.id}: centroid ${point.map(v => v.toFixed(4))}`;
    const containing = ISO_KEYS.filter(k => inPolygons(point, bundeslandPolygons[k]));
    if (containing.length) {
      assert.ok(containing.some(k => lands.includes(k)), `${where} in ${containing}, not in ${lands}`);
    } else {
      // Open water no Bundesland polygon covers: the Bodensee's Obersee has
      // no agreed border, and GISCO's German polygons stop at the shore. The
      // nearest Bundesland must then be one the lake lists.
      const nearest = ISO_KEYS.reduce((a, b) =>
        distanceToPolygons(point, bundeslandPolygons[b]) < distanceToPolygons(point, bundeslandPolygons[a]) ? b : a);
      assert.ok(lands.includes(nearest), `${where} in no Bundesland, nearest ${nearest}, not in ${lands}`);
    }
  }
});

test('only the Bodensee has its centroid outside every Bundesland polygon', () => {
  const outside = lakeGeoms.filter(g => {
    const parts = polygonsOf(gewaesser, g).map(([outer]) => ringCentroid(outer));
    const { point } = parts.reduce((a, b) => (b.area > a.area ? b : a));
    return !ISO_KEYS.some(k => inPolygons(point, bundeslandPolygons[k]));
  }).map(g => g.id);
  assert.deepStrictEqual(outside, ['lake-bodensee']);
});

test('every river lies inside the Germany bounds buffered by 5 km', () => {
  const all = geometries.flatMap(g => coordinatesOf(topology, g));
  const lons = all.map(c => c[0]), lats = all.map(c => c[1]);
  const [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  // 5 km in degrees at Germany's southern (widest-degree) edge, plus a little
  // for the buffer's round joins and the 4-decimal output.
  const dLat = 5.1 / 111.2, dLon = 5.1 / (111.2 * Math.cos(s * Math.PI / 180));
  for (const g of riverGeoms) {
    const coords = coordinatesOf(gewaesser, g);
    assert.ok(coords.length > 1, `${g.id}: no geometry`);
    const out = coords.filter(([x, y]) => x < w - dLon || x > e + dLon || y < s - dLat || y > n + dLat);
    assert.deepStrictEqual(out, [], `${g.id} leaves the buffered bounds`);
  }
});
