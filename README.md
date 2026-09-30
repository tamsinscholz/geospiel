# Interactive Map Game

## Goal
This is a game that helps people learn country names, locations, flags, and capitals.

It centres around an interactive map displaying the outlines of every country in the world. The user can zoom in and out and pan around the map. Hovering over a country highlights it and its outline.

## Quickstart

Start a server.

```sh
make run        # python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000)

Run the tests (Node's built-in test runner — no npm install, no build step):

```sh
make test
```

## Stack
- **D3.js v7** (via CDN) — data-driven SVG rendering and zoom behavior
- **topojson-client** (via CDN) — decode TopoJSON (smaller format, shared borders)
- **world-atlas** TopoJSON data (jsDelivr CDN) — public domain Natural Earth data
- Vanilla HTML/CSS/JS — no build tool, no npm required

## Data Source
TopoJSON from the `topojson/world-atlas` package (Natural Earth, public domain):
```
https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
```
~200KB (50m resolution). Encodes shared borders once, reducing file size vs GeoJSON.

## Small Country Click Targets

Countries under 500 km² (e.g. Vatican City, San Marino, Monaco) have SVG paths too small to click reliably in "Find the Country" mode. Rather than adding distance-based hit detection — which interferes with wrong-guess logic on neighbouring countries — we generate an overlay of enlarged circular click targets.

`small_targets.json` is a GeoJSON FeatureCollection of ~50 km-radius circles, one per small country centroid. It is rendered in a separate `<g id="small-targets">` layer on top of the map. CSS enables `pointer-events` on these circles only during "Find the Country" gameplay; they are inert in all other modes.

Regenerate with:
```bash
python3 create_small_target_map.py --radius 50 --max_area 500
```

`--max_area` controls which countries are included (area in km²) and `--radius` sets the circle size in km. Archipelago nations (Palau, Marshall Islands, Maldives) get one disc per island group via manual coordinate overrides in the script.

## File Structure
```
index.html                  — page shell, D3 + TopoJSON CDN imports, SVG container
style.css                   — fullscreen layout, country fill/stroke, .highlighted class
main.js                     — projection setup, SVG render, zoom behavior, hover events
game-core.mjs               — pure game rules: round order, guess accounting, answer matching
test/game-core.test.mjs     — tests for game-core.mjs (node --test)
Makefile                    — install / run / test / clean entry points
countries.json              — country metadata keyed by ISO numeric ID
aliases.json                — fuzzy country-name matching
small_targets.json          — enlarged click targets for small countries (generated)
create_small_target_map.py  — script to regenerate small_targets.json
```

`main.js` is loaded as an ES module (`<script type="module">`) so it can import
`game-core.mjs`; both are plain source files served as-is, with no bundler.
