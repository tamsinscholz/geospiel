# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build process or npm required. The `make` targets are the preferred entry points:

```bash
make run    # python3 -m http.server 8000, then open http://localhost:8000
make test   # node --test test/ (Node's built-in runner, node:assert)
make clean  # drops tools/.cache (the vendoring scripts' download cache)
```

`make install` is a no-op because there are no dependencies.

Note: the page needs an HTTP origin, not `file://` — it fetches the data under
`data/` and loads `main.js` as an ES module, both of which the
browser blocks on a `file://` origin.

## Architecture

Single-page vanilla JS application — no bundler, no npm.

| File | Purpose |
|---|---|
| `index.html` | Markup for the SVG map (Kulisse, Bundesland and hit-target groups), overlay screens (the Einstellungen card also carries the data credits) (select, settings, stats), game panel, info panel, text input. Loads D3 and topojson-client from CDN |
| `main.js` | The browser shell — D3 map setup, zoom, DOM rendering, timers, event wiring, data loading, `localStorage`. Loaded as an ES module |
| `game-core.mjs` | The game's rules, pure: round order, guess accounting, answer matching. Imports nothing, touches no DOM/D3/`localStorage`/timers. The only module under test |
| `test/game-core.test.mjs` | Tests for `game-core.mjs` — `node --test`, `node:assert`, synthetic fixtures |
| `test/aliases.test.mjs` | The real alias table through `matchBundesland`/`guessByText`, plus a normalised-key collision check |
| `test/capitals.test.mjs` | The real Landeshauptstädte (and `capital_variants`) through `matchCapital`/`guessByText`, including a 16×16 other-capital rejection check |
| `test/data.test.mjs` | Structural checks over the vendored data: geometry, metadata and Landeswappen agree on the same 16 keys, the Kulisse holds no German territory, `neighbour_count` matches the topology's adjacency; for the landmarks, geometry and `landmarks.json` agree on the same 53 ids, counts/pool flags/articles, capitals named as in `bundeslaender.json`, cities inside and lake centroids in their Bundesland, rivers inside Germany + 5 km |
| `test/landmark-aliases.test.mjs` | The real landmark alias table: every pool feature reachable by its name (through `matchBundesland` until `matchLandmark` exists), no alias for a background or missing id, the normalised-key collision check, no two of the 53 names canonicalising together, Main/Mainz and Elbe/Ems distinct, no name starting with an article |
| `style.css` | Layout, overlays, panels, buttons, responsive breakpoints |
| `data/bundeslaender.topo.json` | Bundesland geometry (TopoJSON object `bundeslaender`, `id` = ISO 3166-2 key such as `DE-BY`) |
| `data/kulisse.topo.json` | Neighbouring countries' land (object `kulisse`), drawn as muted scenery beneath the Bundesländer |
| `data/bundeslaender.json` | Bundesland metadata keyed by ISO 3166-2 key (name, capital, optional capital_variants, population, area_km2, highest_point, neighbour_count) |
| `data/bundesland-aliases.json` | Hand-authored alias table: readable spelling → ISO 3166-2 key (plain names, official long forms, abbreviations, English names, misspellings). Keys are normalised at match time, so write them readably |
| `data/gewaesser.topo.json` | Gewässer & Städte geometry from OpenStreetMap (**ODbL**): TopoJSON objects `rivers` (18, clipped to Germany + 5 km, main stream only) and `lakes` (11, whole), `id` = feature id such as `river-rhein`. Not drawn by any mode yet |
| `data/staedte.json` | The 24 city points from OpenStreetMap (**ODbL**): GeoJSON FeatureCollection, `id` = feature id such as `city-koeln`, 4 decimals |
| `data/landmarks.json` | Hand-curated landmark metadata keyed by feature id: type, curated name and article (never OSM tags), pool flag, Wikidata/OSM ids, `length_km` / `area_km2` + `max_depth_m` + `bundeslaender` / `population` + `bundesland` (+ `capital_of` on the 16 Landeshauptstädte) |
| `data/landmark-aliases.json` | Hand-authored alias table for the 41 **pool** landmarks only: readable spelling → feature id (German names, short forms, common exonyms, misspellings) |
| `wappen/de-xx.svg` | Landeswappen, named by the lowercased ISO 3166-2 key |
| `tools/vendor-germany-data.sh` | One-off, by-hand regeneration of the geometry and the Landeswappen from GISCO and Wikimedia Commons (mapshaper/svgo via `npx`, downloads cached in `tools/.cache/`). Not a build step; `data/bundeslaender.json` and the alias table are hand-curated |
| `tools/vendor-landmark-data.sh` | One-off, by-hand regeneration of `data/gewaesser.topo.json` and `data/staedte.json` from Overpass, by Wikidata id **pinned** to OSM ids (fails on any mismatch), mapshaper via `npx`, downloads cached in `tools/.cache/landmarks/`. `landmarks.json` and the landmark aliases are hand-curated |
| `tools/data-review.html` | Dev page for checking the vendored data in the browser (`/tools/data-review.html`), including a labelled landmark map (pool vs background colours, 12 px hit-radius toggle) and the landmark metadata table |
| `SOURCES.md` | Provenance, licence and required credits for every piece of data |
| `Makefile` | `install` / `run` / `test` / `clean` / `clean-all` |

Data sources and their required credits are documented in `SOURCES.md`; the credits
are shown in small muted text below the Einstellungen buttons (`#settings-credits`),
collapsed to the short note "Karten: © EuroGeographics, © OpenStreetMap, Einwohner und Fläche: Destatis …"; a click, tap or Enter shows the full wording (`aria-expanded`, the OpenStreetMap line linking to its copyright page), and it collapses again each time the Einstellungen screen opens. `LICENSE` excludes the third-party files in `data/` and `wappen/`; the two OSM files are ODbL ([ADR 0002](docs/adr/0002-osm-data-odbl-separate-files.md)).

**Dependencies (all via CDN):**
- D3.js v7 — SVG rendering, projections, zoom behavior
- topojson-client v3 — decodes shared-border topology format
- Google Fonts — Inter typeface

**Data flow:**
1. `main.js` fetches the two local TopoJSON files + `data/bundeslaender.json` + `data/bundesland-aliases.json` (parallel `Promise.all`)
2. Converts topology → GeoJSON features via `topojson.feature()` (and `topojson.merge()` for the German outline)
3. A D3 conic conformal projection (parallels 48.5°/53.5°, central meridian 10.5°E) is fitted to the German outline
4. The Kulisse, the Bundesländer and the touch halos (`.hit-target`, for Bundesländer under `SMALL_TARGET_MAX_AREA_KM2` — derived from the metadata, no generated data file) are rendered as `<path>` elements in three groups inside one zoomed `<g>`, bottom to top
5. D3 zoom behavior handles pan/zoom (1x–6x scale range, `k = 1` = full Germany), with `translateExtent` = the viewBox clamping panning to Germany plus its margin (also applied to programmatic zooms via `zoom.constrain()`)
6. Landeswappen are local SVGs, located by `wappenUrl(key)`

**Projection and fit:** the SVG has a fixed `viewBox` = Germany's padded projected bounds, with `preserveAspectRatio="xMidYMid meet"`, and is sized to the viewport by CSS — so resizing re-fits and re-centres Germany with no JS resize handler. All projection, zoom and pan arithmetic is in viewBox units. Strokes use `vector-effect: non-scaling-stroke`.

## Game Modes

The app has four modes — one free-roam and three quiz modes:

1. **Erkunden** (`explore`) — hover or tap a Bundesland to see its info panel; no scoring
2. **Bundesland finden** (`find`) — given a name + Landeswappen, click the Bundesland on the map
3. **Bundesland benennen** (`name-bundesland`) — Bundesland highlighted + Landeswappen shown, type its name
4. **Landeshauptstadt benennen** (`name-capital`) — Bundesland named + highlighted, type its Landeshauptstadt

Quiz modes share a settings screen (Runden 1–16 default 16, Versuche 1–10 default 3, Automatisch weiter toggle) and an end-of-game stats screen. Only Landeshauptstadt benennen gently zooms to the target (round start and feedback, capped at `TARGET_ZOOM_MAX = 1.8`); Bundesland finden and Bundesland benennen stay on the overview and only reset to it at round start if the user zoomed in. `docs/game-flow.md` has the full flow and strings; `docs/ui-components.md` the visual inventory.

## Implementation Guidelines

- **Prefer CSS over JS for layout:** Use media queries, `:hover`, flex/grid, and `display: none` toggling via class names for responsive behavior. Avoid JS resize handlers or manual style manipulation when CSS can achieve the same result.
- **Drive UI visibility from `data-phase` and `data-mode` on `<body>`:** JS sets `document.body.dataset.phase` (`idle`, `playing`, `feedback`) and `document.body.dataset.mode` (`explore`, `find`, `name-bundesland`, `name-capital`). CSS attribute selectors control which panels, buttons, and elements are visible for each combination — no manual `.classList.add('hidden')` calls per transition. Mode-specific differences (e.g. Landeswappen hidden in Landeshauptstadt benennen, prompt hidden while playing Bundesland benennen) are CSS rules, not JS branches.

## Key Patterns

- **Screen management:** Overlay screens (`screen-select`, `screen-settings`, `screen-stats`) shown/hidden via `data-phase` and `data-screen` attributes on `<body>`. Only one overlay is visible at a time.
- **Game state:** `game-core.mjs` owns round order, score, skipped count, remaining guesses and the current target; `main.js` keeps only the shell's own state (mode, phase, screen, the chosen settings, the auto-advance timer) and renders what the core reports. Phase and mode are mirrored to `<body>` data attributes so CSS drives visibility.
- **The testing seam:** all round sequencing, guess accounting and answer matching go through `createGame(...)` in `game-core.mjs`; everything environmental (timers, CSS classes, zoom, panels, score history) stays in `main.js` and is verified by driving the app.
- **Bundesland identification:** Bundesländer are keyed by ISO 3166-2 code (e.g. `"DE-BY"` = Bayern). `featureId(d)` is the one place that maps a geometry feature to that key (the vendored TopoJSON already carries it as `d.id`).
- **Answer validation:** one canonical `normalize()` in `game-core.mjs` is applied to both the typed answer and the reference answer (trim/lowercase, `ß`→`ss`, drop diacritics, collapse `ae`/`oe`/`ue`, strip non-alphanumerics). Names are matched through the alias table `data/bundesland-aliases.json` (a collision test keeps any two keys from normalising together while pointing at different Bundesländer), capitals against the item's `capital` (plus optional `capital_variants`).
- **CSS classes on `<path>`:** `.bundesland` / `.kulisse` (the Kulisse is `pointer-events: none` in every mode), `.highlighted` (explore hover), `.target` (quiz highlight), `.wrong-guess` (brief red flash on wrong click). `.hit-target` is the invisible touch halo for small Bundesländer (area below `SMALL_TARGET_MAX_AREA_KM2`): a duplicate path in `#hit-group` whose stroke takes taps only under `(pointer: coarse), (max-width: 600px)`; handlers resolve its `data-id` to the real `.bundesland` path.
- **Score history:** per-mode, last 10 games, in `localStorage` under `geospiel-stats-<mode>` (the prefix keeps the old world quiz's `stats-<mode>` keys out).
- **Responsive:** Mobile breakpoint at 600px — stacks panels vertically, hides the Landeswappen in the game panel, adjusts border radii.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
