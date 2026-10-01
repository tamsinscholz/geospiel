#!/usr/bin/env bash
# Regenerate the vendored Gewässer & Städte geometry: 18 rivers and 11 lakes
# (data/gewaesser.topo.json) and 24 city points (data/staedte.json), from
# OpenStreetMap via the Overpass API. A one-off, by-hand preparation step (see
# SOURCES.md §3/§4) — not a build step. Tools run through `npx -y`, so nothing
# is added to the project.
#
#   tools/vendor-landmark-data.sh           # download (cached) + process
#   make clean                              # drops the download cache
#
# Needs: bash, curl, node/npx. Downloads are cached in tools/.cache/landmarks/.
# Needs data/bundeslaender.topo.json (tools/vendor-germany-data.sh) for the clip.
#
# Both outputs are OSM-derived and therefore ODbL 1.0, © OpenStreetMap
# contributors (docs/adr/0002-osm-data-odbl-separate-files.md). Never merge
# them into the GISCO files.
#
# NOT generated here: data/landmarks.json (names, articles, facts) and
# data/landmark-aliases.json. Both are hand-curated; names and articles are
# never taken from OSM tags (OSM's own primary names include "Odra" and
# "Danube").

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/tools/.cache/landmarks"
# Overpass's usage policy asks for a descriptive UA with contact info.
UA="geospiel-data-vendoring/1.0 (https://github.com/jan-scholz/geospiel; private non-commercial learning app)"
MAPSHAPER="npx -y mapshaper@0.7.70"
OVERPASS="${OVERPASS:-https://overpass-api.de/api/interpreter}"

# Rivers are downloaded only inside this box (south,west,north,east): Germany
# plus a margin, so the Rhein's Swiss and Dutch stretches and the Donau below
# Passau are never fetched. The real clip is the buffered outline below.
RIVER_BBOX="47.0,5.5,55.3,15.3"
# Germany outline buffer for clipping the rivers (SOURCES.md §1). Lakes are
# not clipped: the clip would cut a straight line through the Bodensee.
BUFFER="5km"
# Simplify by distance, not by percentage: OSM vertex density varies too much
# between rivers for a percentage to mean anything. 200 m keeps full detail at
# the game's 6× maximum (about 160 m per CSS px).
INTERVAL="200m"
# Overpass batches: at most this many features per request (a busy server
# times out on bigger ones).
BATCH=6

OUT_TOPO="$ROOT/data/gewaesser.topo.json"
OUT_CITIES="$ROOT/data/staedte.json"

# --- The pinned features ----------------------------------------------------
# id|Wikidata|OSM objects that carry the Wikidata tag and are kept|OSM objects
# pinned by id only (no Wikidata tag)|known traps: objects that carry the same
# Wikidata tag and are deliberately dropped
#
# The pinning rule: the set of objects Overpass returns for a Wikidata id must
# be EXACTLY kept ∪ traps, or the script fails. A plain Wikidata query would
# silently merge the traps (and anything new someone tags tomorrow). For rivers
# and lakes the query covers relations (and, for lakes, ways); river *ways*
# carry the river's Wikidata tag by the hundred and are only ever reached
# through the pinned relation. For cities it covers place=city nodes (the
# spec's rule): unfiltered, it also returns stray objects such as a Stuttgart
# parking-ticket machine (node 12288961790) tagged with the city's id.
#
# Ids verified 2026-09-30 (spec "The feature pool"); traps found in research
# and re-checked 2026-10-01:
#   - Aller: two "Aller Schleuse" lock-channel relations, type=waterway
#   - Main, Inn: riverbank multipolygons (natural=water) with the river's id
#   - Schweriner See: a type=site relation with the lake's id; the Innensee
#     (relation 21142) carries no Wikidata tag and is pinned by OSM id
#   - (OSM relation 5441202 "Weiße Saar" carries the Saar's id; the Saar is not
#     in the pool, but a pinned Saar row would have to list it as a trap)

RIVERS=(
  "river-rhein|Q584|relation/123924||"
  "river-donau|Q1653|relation/89652||"
  "river-elbe|Q1644|relation/123822||"
  "river-main|Q1670|relation/412876||relation/6274126"
  "river-weser|Q1650|relation/123751||"
  "river-ems|Q1648|relation/370068||"
  "river-oder|Q552|relation/387605||"
  "river-neckar|Q1673|relation/123881||"
  "river-mosel|Q1667|relation/390416||"
  "river-spree|Q1684|relation/390274||"
  "river-saale|Q1678|relation/387502||"
  "river-havel|Q1682|relation/390306||"
  "river-isar|Q106588|relation/273028||"
  "river-inn|Q14369|relation/406437||relation/4621343"
  "river-lech|Q155841|relation/406547||"
  "river-werra|Q6424|relation/390379||"
  "river-lahn|Q103148|relation/412935||"
  "river-aller|Q1967803|relation/123707||relation/15004441,relation/15004494"
)

LAKES=(
  "lake-bodensee|Q4127|relation/1156846||"
  "lake-mueritz|Q3369|relation/13157981||"
  "lake-chiemsee|Q4138|relation/32246||"
  "lake-schweriner-see|Q311217|relation/1104680|relation/21142|relation/282711"
  "lake-starnberger-see|Q131615|relation/168892||"
  "lake-ammersee|Q265336|relation/168893||"
  "lake-steinhuder-meer|Q165782|relation/32810||"
  "lake-plauer-see|Q704793|relation/2567608||"
  "lake-kummerower-see|Q688154|way/662219702||"
  "lake-grosser-ploener-see|Q527798|relation/282740||"
  "lake-duemmer|Q688459|relation/556521||"
)

CITIES=(
  "city-koeln|Q365|node/20953083||"
  "city-frankfurt|Q1794|node/27418664||"
  "city-dortmund|Q1295|node/25293125||"
  "city-leipzig|Q2079|node/21687149||"
  "city-nuernberg|Q2090|node/1569338041||"
  "city-mannheim|Q2119|node/240060919||"
  "city-rostock|Q2861|node/1684321651||"
  "city-freiburg|Q2833|node/240092010||"
  "city-stuttgart|Q1022|node/1674026139||"
  "city-muenchen|Q1726|node/1700534808||"
  "city-berlin|Q64|node/240109189||"
  "city-potsdam|Q1711|node/1695218178||"
  "city-bremen|Q24879|node/20982927||"
  "city-hamburg|Q1055|node/20833623||"
  "city-wiesbaden|Q1721|node/240028377||"
  "city-schwerin|Q1709|node/21993086||"
  "city-hannover|Q1715|node/1651888734||"
  "city-duesseldorf|Q1718|node/240126753||"
  "city-mainz|Q1720|node/240116263||"
  "city-saarbruecken|Q1724|node/1530957491||"
  "city-dresden|Q1731|node/20833613||"
  "city-magdeburg|Q1733|node/33997995||"
  "city-kiel|Q1707|node/24487450||"
  "city-erfurt|Q1729|node/240038130||"
)

mkdir -p "$CACHE"
[ -s "$ROOT/data/bundeslaender.topo.json" ] || { echo "missing data/bundeslaender.topo.json (run tools/vendor-germany-data.sh)" >&2; exit 1; }

# overpass <query> <dest>: POST a query, cached under <dest> (whose name
# carries a checksum of the query, so an edited query is fetched afresh and
# never answered from a stale file). A busy Overpass answers
# HTTP 200 with an HTML error page (and a timed-out query can answer 200 with
# JSON whose "remark" reports a runtime error), so `curl -f` alone misses both:
# the body must parse as JSON with no error remark, or the request is retried
# with a growing back-off.
overpass() {
  local query="$1" dest="$2" attempt wait
  [ -s "$dest" ] && return 0
  echo "overpass $(basename "$dest")"
  for attempt in 1 2 3 4 5 6; do
    if curl -sSfL -A "$UA" --data-urlencode "data=$query" -o "$dest.part" "$OVERPASS" &&
       node -e '
         const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
         if (!Array.isArray(j.elements)) throw new Error("no elements");
         if (j.remark && /error/i.test(j.remark)) throw new Error(j.remark);
       ' "$dest.part" 2>/dev/null; then
      mv "$dest.part" "$dest"
      sleep 2 # be polite to the server
      return 0
    fi
    wait=$((attempt * 30))
    echo "  attempt $attempt failed ($(head -c 200 "$dest.part" 2>/dev/null | tr '\n' ' ' | sed 's/<[^>]*>//g' | cut -c1-120)); retrying in ${wait}s" >&2
    sleep "$wait"
  done
  rm -f "$dest.part"
  echo "overpass failed after 6 attempts: $(basename "$dest")" >&2
  exit 1
}

# osm_filter <type/id,...>: "relation/1,way/2" -> "rel(id:1);way(id:2);"
osm_filter() {
  local obj out=""
  IFS=, read -ra objs <<< "$1"
  for obj in "${objs[@]}"; do
    [ -n "$obj" ] || continue
    case "${obj%%/*}" in
      relation) out+="rel(id:${obj#*/});" ;;
      way) out+="way(id:${obj#*/});" ;;
      node) out+="node(id:${obj#*/});" ;;
    esac
  done
  printf '%s' "$out"
}

# fetch_kind <kind> <rows...>: for every batch of $BATCH rows, one pinning query
# (every object carrying each Wikidata tag, tags only) and one geometry query
# (the pinned objects only). Cities need just one query: a node's body is its
# geometry. The files of this run are collected in PIN_FILES and GEOM_FILES.
PIN_FILES=() GEOM_FILES=()
cached() { # kind role query -> cache path
  printf '%s/%s-%s-%s.json' "$CACHE" "$2" "$1" "$(printf '%s' "$3" | cksum | cut -d' ' -f1)"
}
query() { # role kind query
  local dest; dest="$(cached "$2" "$1" "$3")"
  overpass "$3" "$dest"
  if [ "$1" = pin ]; then PIN_FILES+=("$dest"); else GEOM_FILES+=("$dest"); fi
}
fetch_kind() {
  local kind="$1"; shift
  local rows=("$@") i row pin geo id wd keep extra traps
  for ((i = 0; i < ${#rows[@]}; i += BATCH)); do
    pin="" geo=""
    for row in "${rows[@]:i:BATCH}"; do
      IFS='|' read -r id wd keep extra traps <<< "$row"
      case "$kind" in
        rivers) pin+="rel[\"wikidata\"=\"$wd\"];" ;;
        lakes)  pin+="rel[\"wikidata\"=\"$wd\"];way[\"wikidata\"=\"$wd\"];" ;;
        cities) pin+="node[\"wikidata\"=\"$wd\"][\"place\"=\"city\"];" ;;
      esac
      geo+="$(osm_filter "$keep,$extra")"
    done
    case "$kind" in
      rivers)
        query pin "$kind" "[out:json][timeout:180];($pin);out tags;"
        query geom "$kind" "[out:json][timeout:300];($geo);out geom($RIVER_BBOX);" ;;
      lakes)
        query pin "$kind" "[out:json][timeout:180];($pin);out tags;"
        query geom "$kind" "[out:json][timeout:300];($geo);out geom;" ;;
      cities)
        query pin "$kind" "[out:json][timeout:180];($pin);out;" ;;
    esac
  done
}

# --- Download -----------------------------------------------------------------

fetch_kind rivers "${RIVERS[@]}"
fetch_kind lakes "${LAKES[@]}"
fetch_kind cities "${CITIES[@]}"

# --- Pin, then convert to GeoJSON -------------------------------------------
# One node pass: check every Wikidata query returned exactly kept ∪ traps
# (failing loudly otherwise, with every mismatch listed), check each kept
# object is of the kind the spec allows (rivers: type=waterway relations;
# lakes: natural=water; cities: place=city nodes), then build
#   - rivers: one MultiLineString per river from the relation's way members
#     with role main_stream or no role (side_stream, tributary, distributary
#     and spring are dropped: no Altrhein arms); Overpass's bbox-truncated
#     geometry has nulls for nodes outside RIVER_BBOX, so lines split there
#   - lakes: one MultiPolygon per lake, rings stitched from the outer/inner
#     way members, each inner ring placed in the outer ring that contains it
#   - cities: points at 4 decimals, straight to data/staedte.json

ROWS_JSON="$(node -e '
const [rivers, lakes, cities] = process.argv.slice(1).map(s => s.split("\n").filter(Boolean));
const parse = kind => row => {
  const [id, wikidata, keep, extra, traps] = row.split("|");
  const list = s => (s || "").split(",").filter(Boolean);
  return { kind, id, wikidata, keep: list(keep), extra: list(extra), traps: list(traps) };
};
console.log(JSON.stringify([...rivers.map(parse("rivers")), ...lakes.map(parse("lakes")), ...cities.map(parse("cities"))]));
' "$(printf '%s\n' "${RIVERS[@]}")" "$(printf '%s\n' "${LAKES[@]}")" "$(printf '%s\n' "${CITIES[@]}")")"

ROWS_JSON="$ROWS_JSON" PIN_FILES="$(printf '%s\n' "${PIN_FILES[@]}")" GEOM_FILES="$(printf '%s\n' "${GEOM_FILES[@]}")" \
  node - "$CACHE" "$OUT_CITIES" <<'JS'
const fs = require('fs');
const path = require('path');
const [cache, outCities] = process.argv.slice(2);
const rows = JSON.parse(process.env.ROWS_JSON);
const files = list => list.split('\n').filter(Boolean).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const key = e => `${e.type}/${e.id}`;

const pinned = new Map();     // "type/id" -> element (tags, and coords for nodes)
for (const f of files(process.env.PIN_FILES)) for (const e of f.elements) pinned.set(key(e), e);
const geometry = new Map();   // "type/id" -> element with geometry
for (const f of files(process.env.GEOM_FILES)) for (const e of f.elements) geometry.set(key(e), e);

/* === Pinning === */
const errors = [];
const kindOk = {
  rivers: e => e.type === 'relation' && e.tags?.type === 'waterway',
  lakes: e => (e.type === 'relation' || e.type === 'way') && e.tags?.natural === 'water',
  cities: e => e.type === 'node' && e.tags?.place === 'city',
};
for (const r of rows) {
  const found = [...pinned.values()].filter(e => e.tags?.wikidata === r.wikidata).map(key).sort();
  const expected = [...r.keep, ...r.traps].sort();
  const unexpected = found.filter(k => !expected.includes(k));
  const missing = expected.filter(k => !found.includes(k));
  if (unexpected.length || missing.length) {
    errors.push(`${r.id} (${r.wikidata}): Overpass returned [${found.join(', ')}], pinned [${expected.join(', ')}]` +
      (unexpected.length ? `; unexpected: ${unexpected.map(k => `${k} "${pinned.get(k).tags?.name ?? ''}" type=${pinned.get(k).tags?.type ?? '-'}`).join(', ')}` : '') +
      (missing.length ? `; missing: ${missing.join(', ')}` : ''));
    continue;
  }
  for (const k of r.keep) {
    if (!kindOk[r.kind](pinned.get(k))) errors.push(`${r.id}: ${k} is not an allowed ${r.kind} object (tags ${JSON.stringify(pinned.get(k).tags)})`);
  }
  for (const k of r.extra) {
    const e = geometry.get(k);
    if (!e) errors.push(`${r.id}: ${k} (pinned by OSM id) was not returned`);
    else if (!kindOk[r.kind](e)) errors.push(`${r.id}: ${k} is not an allowed ${r.kind} object`);
  }
  if (r.kind !== 'cities') for (const k of [...r.keep, ...r.extra]) {
    if (!geometry.has(k)) errors.push(`${r.id}: no geometry returned for ${k}`);
  }
  if (r.traps.length) console.log(`pinned ${r.id}: kept ${[...r.keep, ...r.extra].join(', ')}; dropped traps ${r.traps.join(', ')}`);
}
if (errors.length) {
  console.error('PINNING FAILED — Overpass no longer returns exactly the pinned OSM objects:');
  for (const e of errors) console.error('  ' + e);
  console.error('Check the objects on openstreetmap.org, then update the pinned row in tools/vendor-landmark-data.sh.');
  process.exit(1);
}

/* === Rivers === */
const RIVER_ROLES = new Set(['main_stream', '']);
const coord = p => [p.lon, p.lat];
function riverLines(rel) {
  const lines = [];
  for (const m of rel.members) {
    if (m.type !== 'way' || !RIVER_ROLES.has(m.role) || !m.geometry) continue;
    let line = [];
    for (const p of m.geometry) {
      if (p && p.lat != null) { line.push(coord(p)); continue; }
      if (line.length > 1) lines.push(line);
      line = [];
    }
    if (line.length > 1) lines.push(line);
  }
  return lines;
}

/* === Lakes === */
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
// Join way segments into closed rings by shared end points.
function stitch(segments, what) {
  const open = segments.map(s => s.slice());
  const rings = [];
  while (open.length) {
    let ring = open.shift();
    while (!same(ring[0], ring[ring.length - 1])) {
      const end = ring[ring.length - 1];
      const i = open.findIndex(s => same(s[0], end) || same(s[s.length - 1], end));
      if (i < 0) throw new Error(`${what}: ring does not close at ${end}`);
      const s = open.splice(i, 1)[0];
      ring = ring.concat((same(s[0], end) ? s : s.reverse()).slice(1));
    }
    rings.push(ring);
  }
  return rings;
}
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function lakePolygons(e, what) {
  if (e.type === 'way') return [[e.geometry.map(coord)]];
  const byRole = role => e.members.filter(m => m.type === 'way' && m.role === role).map(m => m.geometry.map(coord));
  const outers = stitch(byRole('outer'), `${what} outer`);
  const inners = stitch(byRole('inner'), `${what} inner`);
  const polygons = outers.map(o => [o]);
  for (const inner of inners) {
    const host = polygons.find(p => inRing(inner[0], p[0]));
    if (!host) throw new Error(`${what}: inner ring outside every outer ring`);
    host.push(inner);
  }
  return polygons;
}

const feature = (id, geometry) => ({ type: 'Feature', properties: { id }, geometry });
const rivers = [], lakes = [], cities = [];
for (const r of rows) {
  const objects = [...r.keep, ...r.extra];
  if (r.kind === 'rivers') {
    const lines = objects.flatMap(k => riverLines(geometry.get(k)));
    if (!lines.length) { console.error(`${r.id}: no main-stream geometry`); process.exit(1); }
    rivers.push(feature(r.id, { type: 'MultiLineString', coordinates: lines }));
  } else if (r.kind === 'lakes') {
    const polygons = objects.flatMap(k => lakePolygons(geometry.get(k), `${r.id} ${k}`));
    lakes.push(feature(r.id, { type: 'MultiPolygon', coordinates: polygons }));
  } else {
    const n = pinned.get(r.keep[0]);
    const round = v => Math.round(v * 1e4) / 1e4;
    cities.push({ type: 'Feature', id: r.id, properties: {}, geometry: { type: 'Point', coordinates: [round(n.lon), round(n.lat)] } });
  }
}
const fc = features => JSON.stringify({ type: 'FeatureCollection', features });
fs.writeFileSync(path.join(cache, 'rivers.geojson'), fc(rivers));
fs.writeFileSync(path.join(cache, 'lakes.geojson'), fc(lakes));
fs.writeFileSync(outCities, '{"type":"FeatureCollection","features":[\n' +
  cities.map(c => JSON.stringify(c)).join(',\n') + '\n]}\n');
console.log(`pinned ${rows.length} features: ${rivers.length} rivers, ${lakes.length} lakes, ${cities.length} cities`);
JS

# --- Clip, simplify, write TopoJSON ------------------------------------------
# The Germany outline (SOURCES.md §1): the 16 Bundesländer dissolved, buffered.
$MAPSHAPER -i "$ROOT/data/bundeslaender.topo.json" \
  -dissolve \
  -buffer "$BUFFER" \
  -o "$CACHE/germany-buffer.geojson" force

# Rivers are clipped to the outline; lakes are kept whole. Both are simplified
# by distance and written unquantized at 4 decimals, like the GISCO files.
# Lakes are dissolved by id so the Schweriner Außensee and Innensee become one
# shape where they touch.
$MAPSHAPER -i "$CACHE/rivers.geojson" "$CACHE/lakes.geojson" combine-files \
  -rename-layers rivers,lakes \
  -clip "$CACHE/germany-buffer.geojson" target=rivers \
  -dissolve id target=lakes \
  -simplify interval="$INTERVAL" keep-shapes target=rivers,lakes \
  -clean target=lakes \
  -o "$OUT_TOPO" format=topojson target=rivers,lakes id-field=id no-quantization precision=0.0001

node -e '
const t = JSON.parse(require("fs").readFileSync(process.argv[1]));
const ids = o => (t.objects[o]?.geometries || []).map(g => g.id);
const rivers = ids("rivers"), lakes = ids("lakes");
if (rivers.length !== 18 || lakes.length !== 11 || [...rivers, ...lakes].some(id => !/^(river|lake)-[a-z-]+$/.test(id))) {
  console.error("unexpected geometries:", { rivers, lakes }); process.exit(1);
}
console.log("rivers:", rivers.join(" "));
console.log("lakes:", lakes.join(" "));
' "$OUT_TOPO"
ls -l "$OUT_TOPO" "$OUT_CITIES"
