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
| `index.html` | Markup for the SVG map (Kulisse, Bundesland and hit-target groups, then the landmark groups: rivers, lakes, cities, marker), overlay screens (the Einstellungen card also carries the data credits) (select, settings, stats), game panel, wrong-click line, info panel, text input. Loads D3 and topojson-client from CDN |
| `main.js` | The browser shell — D3 map setup, zoom, DOM rendering, timers, event wiring, data loading, `localStorage`. Loaded as an ES module |
| `game-core.mjs` | The game's rules, pure: round order, guess accounting, answer matching, and the landmark pool (`landmarkType`, `landmarkPool`) and Runden clamp (`followRounds`). Imports nothing, touches no DOM/D3/`localStorage`/timers. One of the three modules under test, with `landmark-hit.mjs` and `view-fit.mjs` |
| `landmark-hit.mjs` | Pure hit resolver for the landmark modes: `nearestLandmark(point, features, { radius, dotRadius })` returns the id whose drawn shape (river segment, lake interior/edge with holes, city dot) is nearest within `radius`, ties city > lake > river, else `null`. Feature records (viewBox units) are documented in the module. Imports nothing, touches no DOM/D3/`localStorage` (only `Math`). The second module under test |
| `view-fit.mjs` | Pure view arithmetic for the gentle zoom and the visible area: `screenToViewBox(extent, ctm)` (screen px to viewBox units through the screen CTM, letterbox offset included), `intersectExtents(a, b)`, `visibleBand(map, top, bottom, ctm, full)` (the viewBox part of a screen band, intersected with the viewBox so letterboxed panels take nothing away, falling back to the whole viewBox when empty), `fitBounds(bounds, area, { fill, minScale, maxScale })` (the `{ k, x, y }` that centres bounds in an area), and `panIntoView(bounds, area, transform, margin)` (the smallest translation, same `k`, that brings bounds into an area, the margin shrunk to what is left for bounds that fit the area but not inside the margin; the same transform object back when nothing moves). Imports nothing, touches no DOM/D3. The third module under test |
| `test/game-core.test.mjs` | Tests for `game-core.mjs` — `node --test`, `node:assert`, synthetic fixtures (including the landmark pool and the Runden clamp) |
| `test/landmark-hit.test.mjs` | Tests for `landmark-hit.mjs` with synthetic viewBox geometry: nearest river, radius cut-off, lake interior vs islands, city dots on rivers, the city > lake > river tie-break, two radii |
| `test/view-fit.test.mjs` | Tests for `view-fit.mjs`: px-to-viewBox conversion with horizontal and vertical letterbox offsets, extent overlap, the visible band (letterbox, empty-band fallback), fitting and centring in a band, the scale clamps, the smallest pan into an area (margin, reduced margin, `k` kept, bounds larger than the area) |
| `test/aliases.test.mjs` | The real alias table through `matchBundesland`/`guessByText`, plus a normalised-key collision check |
| `test/capitals.test.mjs` | The real Landeshauptstädte (and `capital_variants`) through `matchCapital`/`guessByText`, including a 16×16 other-capital rejection check |
| `test/data.test.mjs` | Structural checks over the vendored data: geometry, metadata and Landeswappen agree on the same 16 keys, the Kulisse holds no German territory, `neighbour_count` matches the topology's adjacency; for the landmarks, geometry and `landmarks.json` agree on the same 53 ids, counts/pool flags/articles, capitals named as in `bundeslaender.json`, cities inside and lake centroids in their Bundesland, rivers inside Germany + 5 km |
| `test/landmark-aliases.test.mjs` | The real landmark alias table: every pool feature reachable through `matchLandmark` by its name, with and without its article (a wrong article accepted, the bare article matching nothing), no alias for a background or missing id, the normalised-key collision check, no two of the 53 names canonicalising together, Main/Mainz and Elbe/Ems distinct, no name starting with an article |
| `style.css` | Layout, overlays, panels, buttons, responsive breakpoints |
| `data/bundeslaender.topo.json` | Bundesland geometry (TopoJSON object `bundeslaender`, `id` = ISO 3166-2 key such as `DE-BY`) |
| `data/kulisse.topo.json` | Neighbouring countries' land (object `kulisse`), drawn as muted scenery beneath the Bundesländer |
| `data/bundeslaender.json` | Bundesland metadata keyed by ISO 3166-2 key (name, capital, optional capital_variants, population, area_km2, highest_point, neighbour_count) |
| `data/bundesland-aliases.json` | Hand-authored alias table: readable spelling → ISO 3166-2 key (plain names, official long forms, abbreviations, English names, misspellings). Keys are normalised at match time, so write them readably |
| `data/gewaesser.topo.json` | Gewässer & Städte geometry from OpenStreetMap (**ODbL**): TopoJSON objects `rivers` (18, clipped to Germany + 5 km, main stream only) and `lakes` (11, whole), `id` = feature id such as `river-rhein`. Drawn only in the landmark modes |
| `data/staedte.json` | The 24 city points from OpenStreetMap (**ODbL**): GeoJSON FeatureCollection, `id` = feature id such as `city-koeln`, 4 decimals |
| `data/landmarks.json` | Hand-curated landmark metadata keyed by feature id: type, curated name and article (never OSM tags), pool flag, Wikidata/OSM ids, `length_km` / `area_km2` + `max_depth_m` + `bundeslaender` / `population` + `bundesland` (+ `capital_of` on the 16 Landeshauptstädte) |
| `data/landmark-aliases.json` | Hand-authored alias table for the 41 **pool** landmarks only: readable spelling → feature id (German names, short forms, common exonyms, misspellings). Gewässer & Städte benennen matches against it alone, never the Bundesland table |
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
1. `main.js` fetches the two local TopoJSON files + `data/bundeslaender.json` + `data/bundesland-aliases.json`, and the four landmark files (`data/gewaesser.topo.json`, `data/staedte.json`, `data/landmarks.json`, `data/landmark-aliases.json`), in one parallel `Promise.all`
2. Converts topology → GeoJSON features via `topojson.feature()` (and `topojson.merge()` for the German outline)
3. A D3 conic conformal projection (parallels 48.5°/53.5°, central meridian 10.5°E) is fitted to the German outline
4. The Kulisse, the Bundesländer and the touch halos (`.hit-target`, for Bundesländer under `SMALL_TARGET_MAX_AREA_KM2` — derived from the metadata, no generated data file) are rendered as `<path>` elements in three groups inside one zoomed `<g>`, bottom to top; above them the landmark groups `#river-group`, `#lake-group`, `#city-group` and `#marker-group` (`.landmark-layer`, shown by CSS only in the landmark modes while playing or in feedback, never interactive). Every landmark is also projected once into viewBox units as `landmark-hit.mjs`'s records (`landmarkRecords`)
5. D3 zoom behavior handles pan/zoom (1x–6x scale range, `k = 1` = full Germany), with `translateExtent` = the viewBox and a custom `zoom.constrain()` that only requires it to cover `motionArea()` (`visibleArea()`, the viewBox minus whatever the game panel and the bottom stack cover; while playing a `fit` mode, the band feedback will leave): Germany plus its margin, with extra room at the top and bottom equal to the panels' height, so its edges can move out from under them. With no panels (menu, Erkunden) that is the plain viewBox clamp. Programmatic zooms call `zoom.constrain()` too
6. Landeswappen are local SVGs, located by `wappenUrl(key)`

**Projection and fit:** the SVG has a fixed `viewBox` = Germany's padded projected bounds, with `preserveAspectRatio="xMidYMid meet"`, and is sized to the viewport by CSS — so resizing re-fits and re-centres Germany with no JS resize handler. All projection, zoom and pan arithmetic is in viewBox units. Strokes use `vector-effect: non-scaling-stroke`. Screen px become viewBox units through the SVG's screen CTM, `(px - e) / a` (`screenToViewBox` in `view-fit.mjs`; `e`/`f` carry the letterbox offset). Radii don't scale with it, so the zoom handler's `sizeLandmarks()` sets the city dots (3.5 px, 6 px as target) and the marker ring (18 px) in viewBox units, `px / pxPerUnit / k` (`unitsPerPx()`, with `pxPerUnit` read from the SVG's screen CTM). It runs on every zoom event, including the reset at each round start, so a window resize mid-round is picked up by the next zoom or round.

## Game Modes

The app has six modes — one free-roam and five quiz modes:

1. **Erkunden** (`explore`) — hover or tap a Bundesland to see its info panel; no scoring
2. **Bundesland finden** (`find`) — given a name + Landeswappen, click the Bundesland on the map
3. **Bundesland benennen** (`name-bundesland`) — Bundesland highlighted + Landeswappen shown, type its name
4. **Landeshauptstadt benennen** (`name-capital`) — Bundesland named + highlighted, type its Landeshauptstadt
5. **Gewässer & Städte finden** (`find-landmark`) — given a river, lake or city name + its type ("Main" / "Fluss"), click it on the map (all 18 rivers, 11 lakes and 24 city dots are drawn; the Bundesländer are quiet context). A click resolves to the nearest drawn feature within 12 screen px via `nearestLandmark`; nothing within reach costs nothing
6. **Gewässer & Städte benennen** (`name-landmark`) — a feature marked in orange (18 px ring around lakes and cities), asked by type ("Welcher Fluss / See ist markiert?", "Welche Stadt ist markiert?"), type its name; `matchLandmark` against the landmark aliases, the article optional and allowed to be wrong. Map clicks do nothing

Quiz modes share a settings screen (Runden 1–16 default 16, Versuche 1–10 default 3, Automatisch weiter toggle) and an end-of-game stats screen. The landmark modes' Einstellungen add four type toggles (Flüsse, Seen, Städte on; Landeshauptstädte off; the last one on can't be switched off) and their own Runden, 1 to the selected pool size, defaulting to it (25). Map motion is one per-mode table, `MAP_MOTION` in `main.js` (`{ roundStart, feedback }`, [ADR 0003](docs/adr/0003-map-motion-policy-per-mode.md)), carried out by `moveMap(moment, id)` after `setPhase`; no mode `if` chain decides it. The policies: `overview` (`resetZoom()`; moves only if the map moved), `fit` (the gentle travel, `zoomToBounds(bounds)` with `bundeslandBounds(id)` or `landmarkBounds(id)`, fitted at 0.9 of `motionArea()`, capped at `TARGET_ZOOM_MAX = 1.8`, never below 1×), `reveal` (`panToBounds(bounds)`: pan only, keep `k`, only when the target is covered, by `panIntoView`'s smallest translation that brings its bounds plus `FEEDBACK_PAN_MARGIN_PX = 24` into `visibleArea()`, 750 ms through `zoom.constrain()`; a target already clear starts no transition, one larger than the area is panned to cover it) and `none`. The three benennen modes (Bundesland, Landeshauptstadt, Gewässer & Städte) are `fit` then `reveal`: they travel once per round, at round start, into the band feedback will leave, so feedback usually doesn't move the map. The feedback stack isn't laid out while playing, so `rememberFeedbackStack()` measures it in every feedback (inset above the map's bottom edge, screen px, per info-panel kind, keeping the largest, keyed on the map size so a resize invalidates it) and `feedbackInset()` hands it to `motionArea()`; with nothing remembered at this size, `fit` uses the playing band. Bundesland finden and Gewässer & Städte finden are `overview` then `reveal`; `none` is currently unused. `docs/game-flow.md` has the full flow and strings; `docs/ui-components.md` the visual inventory.

## Implementation Guidelines

- **Prefer CSS over JS for layout:** Use media queries, `:hover`, flex/grid, and `display: none` toggling via class names for responsive behavior. Avoid JS resize handlers or manual style manipulation when CSS can achieve the same result.
- **Drive UI visibility from `data-phase` and `data-mode` on `<body>`:** JS sets `document.body.dataset.phase` (`idle`, `playing`, `feedback`) and `document.body.dataset.mode` (`explore`, `find`, `name-bundesland`, `name-capital`, `find-landmark`, `name-landmark`; both landmark modes are matched as `[data-mode$="-landmark"]`); `openSettings()` sets `data-settings-mode`, which shows the type toggles. CSS attribute selectors control which panels, buttons, and elements are visible for each combination — no manual `.classList.add('hidden')` calls per transition. Mode-specific differences (e.g. Landeswappen hidden in Landeshauptstadt benennen and the landmark modes, prompt hidden while playing Bundesland benennen, landmark layers only in the landmark modes, the info panel's rows by `data-kind`) are CSS rules, not JS branches.

## Key Patterns

- **Screen management:** Overlay screens (`screen-select`, `screen-settings`, `screen-stats`) shown/hidden via `data-phase` and `data-screen` attributes on `<body>`. Only one overlay is visible at a time.
- **Game state:** `game-core.mjs` owns round order, score, skipped count, remaining guesses and the current target; `main.js` keeps only the shell's own state (mode, phase, screen, the chosen settings, the auto-advance timer) and renders what the core reports. The landmark modes' Runden and type toggles are kept apart from the Bundesland modes' Runden (`landmarkRounds`, `landmarkTypes`); `startGame()` builds their `items` with `landmarkPool()`. Phase and mode are mirrored to `<body>` data attributes so CSS drives visibility.
- **The testing seams:** all round sequencing, guess accounting and answer matching go through `createGame(...)` in `game-core.mjs`, and resolving a map point to a landmark goes through `nearestLandmark(...)` in `landmark-hit.mjs`, and fitting or panning a target into the visible area goes through `fitBounds(...)` and `panIntoView(...)` in `view-fit.mjs`; everything environmental (timers, CSS classes, zoom, panels, score history) stays in `main.js` and is verified by driving the app.
- **Bundesland identification:** Bundesländer are keyed by ISO 3166-2 code (e.g. `"DE-BY"` = Bayern). `featureId(d)` is the one place that maps a geometry feature to that key (the vendored TopoJSON already carries it as `d.id`).
- **Answer validation:** one canonical `normalize()` in `game-core.mjs` is applied to both the typed answer and the reference answer (trim/lowercase, `ß`→`ss`, drop diacritics, collapse `ae`/`oe`/`ue`, strip non-alphanumerics). Names are matched through the alias table `data/bundesland-aliases.json` (a collision test keeps any two keys from normalising together while pointing at different Bundesländer), capitals against the item's `capital` (plus optional `capital_variants`), and landmarks (Gewässer & Städte benennen) through `matchLandmark()` and `data/landmark-aliases.json`, after one leading `der`/`die`/`das` is dropped; `startGame()` hands `createGame` that table in the landmark modes and the Bundesland table otherwise.
- **CSS classes on `<path>`:** `.bundesland` / `.kulisse` (the Kulisse is `pointer-events: none` in every mode), `.highlighted` (explore hover), `.target` (quiz highlight), `.wrong-guess` (brief red flash on wrong click). `.hit-target` is the invisible touch halo for small Bundesländer (area below `SMALL_TARGET_MAX_AREA_KM2`): a duplicate path in `#hit-group` whose stroke takes taps only under `(pointer: coarse), (max-width: 600px)`; handlers resolve its `data-id` to the real `.bundesland` path; it is inert in the landmark modes.
- **Landmark elements:** `.landmark` with `data-id` = feature id: a river is a `<g class="landmark river">` of a `.river-casing` (shown only for the target) and a `.river-line`; a lake a `<path class="landmark lake">`; a city a `<circle class="landmark city">`. Classes `.target` (orange: in feedback in `find-landmark`, from round start in `name-landmark`), `.hovered` (faint orange, mouse only: `pointerType === 'mouse'`), `.wrong-guess` (600 ms). The `.marker` ring sits in `#marker-group` for lake and city targets. None take pointer events: the SVG's click and `pointermove` handlers convert the pointer with `d3.pointer(event, #map-group)` and ask `nearestLandmark` with `radius = 12 px · unitsPerPx()` and the dot's 3.5 px.
- **On-screen keyboard:** treated as one more panel (ADR 0004). One `visualViewport` listener in `main.js` writes `--vv-top` / `--vv-bottom` on `<html>`; the game panel and `.bottom-panels` add them in CSS, `#map` doesn't (no `interactive-widget=resizes-content`). `visibleArea()` clips to the visual viewport, a settled change runs `reveal`, and the keyboard's insets are remembered per map size so a `fit` travel plans for them.
- **Score history:** per-mode, last 10 games, in `localStorage` under `geospiel-stats-<mode>` (the prefix keeps the old world quiz's `stats-<mode>` keys out), e.g. `geospiel-stats-find-landmark`, `geospiel-stats-name-landmark`; the type toggles are not part of the key.
- **Responsive:** Mobile breakpoint at 600px — stacks panels vertically, hides the Landeswappen in the game panel, adjusts border radii.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
