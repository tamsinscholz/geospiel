#!/usr/bin/env bash
# Regenerate the vendored Germany data: Bundesländer + Kulisse geometry and the
# 16 Landeswappen. A one-off, by-hand preparation step (see SOURCES.md) — not a
# build step. Tools run through `npx -y`, so nothing is added to the project.
#
#   tools/vendor-germany-data.sh            # download (cached) + process
#   make clean                              # drops the download cache
#
# Needs: bash, curl, node/npx. Downloads are cached in tools/.cache/.
#
# NOT generated here: data/bundeslaender.json (Bundesland metadata). That file
# is hand-curated from Destatis and other sources listed in SOURCES.md §7.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/tools/.cache"
# Wikimedia's User-Agent policy asks for a descriptive UA with contact info.
UA="geospiel-data-vendoring/1.0 (https://github.com/jan-scholz/geospiel; private non-commercial learning app)"
MAPSHAPER="npx -y mapshaper@0.7.70"
SVGO="npx -y svgo@4.1.0"

# GISCO scale (10M = 1:10 million, 03M = 1:3 million, 01M = 1:1 million) and
# how much of it to keep. 03M is kept whole (100%): 10M was too coarse for the
# Stadtstaaten at game zoom (Berlin ~20 vertices), and simplifying it further
# turned Berlin and Hamburg into triangles. Overridable for experiments:
#   SCALE=01M SIMPLIFY=40% tools/vendor-germany-data.sh
SCALE="${SCALE:-03M}"
SIMPLIFY="${SIMPLIFY:-100%}"

# Where the two geometry files go, and whether to stop after them (skipping the
# Wappen). A variant for side-by-side comparison in tools/data-review.html:
#   SCALE=10M GEO_OUT=tools/.cache/variants/10M GEOMETRY_ONLY=1 tools/vendor-germany-data.sh
GEO_OUT="${GEO_OUT:-$ROOT/data}"
GEO_OUT="$(mkdir -p "$GEO_OUT" && cd "$GEO_OUT" && pwd)"
GEOMETRY_ONLY="${GEOMETRY_ONLY:-}"

GISCO=https://gisco-services.ec.europa.eu/distribution/v2
NUTS_URL=$GISCO/nuts/geojson/NUTS_RG_${SCALE}_2021_4326_LEVL_1.geojson
CNTR_URL=$GISCO/countries/geojson/CNTR_RG_${SCALE}_2020_4326.geojson

# Kulisse clip box (lon/lat). Germany spans ~5.9–15.0°E, 47.3–55.1°N; a 16:9
# screen letterboxes the fitted Germany view horizontally; this box also fills
# a 21:9 ultra-wide view (the conic projection slants the box edges, so it
# must reach well beyond what a rectangle would need).
KULISSE_BBOX="-12,40,34,62"

mkdir -p "$CACHE" "$GEO_OUT" "$ROOT/wappen"

fetch() { # url dest
  if [ ! -s "$2" ]; then
    echo "fetch $1"
    curl -sSfL --retry 5 --retry-delay 30 -A "$UA" -o "$2.part" "$1" || { echo "download failed: $1" >&2; exit 1; }
    mv "$2.part" "$2"
    sleep 2 # be polite to the servers (Commons rate-limits bursts)
  fi
}

# --- Geometry ---------------------------------------------------------------

fetch "$NUTS_URL" "$CACHE/nuts1_$SCALE.geojson"
fetch "$CNTR_URL" "$CACHE/cntr_$SCALE.geojson"

# NUTS-1 -> ISO 3166-2. Verified against the fetched NUTS_ID/NAME_LATN pairs
# (SOURCES.md §2); the script fails if any German feature is left unmapped.
NUTS_TO_ISO='{"DE1":"DE-BW","DE2":"DE-BY","DE3":"DE-BE","DE4":"DE-BB","DE5":"DE-HB","DE6":"DE-HH","DE7":"DE-HE","DE8":"DE-MV","DE9":"DE-NI","DEA":"DE-NW","DEB":"DE-RP","DEC":"DE-SL","DED":"DE-SN","DEE":"DE-ST","DEF":"DE-SH","DEG":"DE-TH"}'

# Both sources are imported into ONE topology (combine-files + snap) so the
# German outer border is a single set of arcs shared by the Bundesländer and
# the Kulisse, simplified once — no slivers or gaps between the two layers.
# Output is unquantized at a fixed precision so both files carry identical
# coordinates for those shared arcs.
$MAPSHAPER -i "$CACHE/nuts1_$SCALE.geojson" "$CACHE/cntr_$SCALE.geojson" combine-files snap \
  -rename-layers nuts,cntr \
  -filter 'CNTR_CODE === "DE"' target=nuts \
  -each "id = ($NUTS_TO_ISO)[NUTS_ID] || 'UNMAPPED'" target=nuts \
  -filter 'id !== "UNMAPPED"' target=nuts \
  -filter-fields id target=nuts \
  -rename-layers bundeslaender target=nuts \
  -filter 'CNTR_ID !== "DE"' target=cntr \
  -clip bbox=$KULISSE_BBOX target=cntr \
  -each 'id = CNTR_ID' target=cntr \
  -filter-fields id target=cntr \
  -rename-layers kulisse target=cntr \
  -explode target=bundeslaender \
  -simplify $SIMPLIFY keep-shapes target=* \
  -clean target=* \
  -dissolve id copy-fields=id target=bundeslaender \
  -o "$GEO_OUT/bundeslaender.topo.json" format=topojson target=bundeslaender id-field=id no-quantization precision=0.0001 \
  -o "$GEO_OUT/kulisse.topo.json" format=topojson target=kulisse id-field=id no-quantization precision=0.0001

node -e '
const t = JSON.parse(require("fs").readFileSync(process.argv[1]));
const ids = t.objects.bundeslaender.geometries.map(g => g.id);
if (ids.length !== 16 || ids.some(id => !/^DE-[A-Z]{2}$/.test(id))) {
  console.error("unexpected Bundesländer ids:", ids); process.exit(1);
}
console.log("bundeslaender:", ids.sort().join(" "));
' "$GEO_OUT/bundeslaender.topo.json"

[ "$GEOMETRY_ONLY" = 1 ] && exit 0

# --- Landeswappen -----------------------------------------------------------
# key|Commons file name (the exact files listed in SOURCES.md §5). BW, BY and HH
# use the small arms: the greater arms with supporters did not read at 56px.

WAPPEN=(
  "de-bw|Lesser_coat_of_arms_of_Baden-Württemberg.svg"
  "de-by|Bayern_Wappen.svg"
  "de-be|DEU_Berlin_COA.svg"
  "de-bb|DEU_Brandenburg_COA.svg"
  "de-hb|Bremen_Wappen(Mittel).svg"
  "de-hh|DEU_Hamburg_COA.svg"
  "de-he|Coat_of_arms_of_Hesse.svg"
  "de-mv|Coat_of_arms_of_Mecklenburg-Western_Pomerania_(great).svg"
  "de-ni|Wappen_von_Niedersachsen.svg"
  "de-nw|Coat_of_arms_of_North_Rhine-Westphalia.svg"
  "de-rp|Coat_of_arms_of_Rhineland-Palatinate.svg"
  "de-sl|Wappen_des_Saarlands.svg"
  "de-sn|Coat_of_arms_of_Saxony.svg"
  "de-st|Wappen_Sachsen-Anhalt.svg"
  "de-sh|DEU_Schleswig-Holstein_COA.svg"
  "de-th|Coat_of_arms_of_Thuringia.svg"
)

mkdir -p "$CACHE/wappen"
for entry in "${WAPPEN[@]}"; do
  key="${entry%%|*}"
  file="${entry#*|}"
  enc="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$file")"
  fetch "https://commons.wikimedia.org/wiki/Special:FilePath/$enc" "$CACHE/wappen/$key.svg"
done

$SVGO --multipass -q -f "$CACHE/wappen" -o "$ROOT/wappen"

# Some Commons files carry only width/height and no viewBox. Give them one so
# they scale predictably in an <img> with object-fit: contain.
node -e '
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const s = fs.readFileSync(f, "utf8");
  const tag = s.match(/<svg\b[^>]*>/)[0];
  if (/\bviewBox=/.test(tag)) continue;
  const w = tag.match(/\bwidth="([\d.]+)"/), h = tag.match(/\bheight="([\d.]+)"/);
  if (!w || !h) { console.error("no viewBox and no size:", f); process.exit(1); }
  fs.writeFileSync(f, s.replace(tag, tag.replace("<svg", `<svg viewBox="0 0 ${w[1]} ${h[1]}"`)));
  console.log("added viewBox:", f);
}
' "$ROOT"/wappen/*.svg
ls -l "$ROOT/wappen"
