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
