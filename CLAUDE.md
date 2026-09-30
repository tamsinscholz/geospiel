# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build process or npm required. Serve the directory with any static file server:

```bash
make run    # python3 -m http.server 8000
# then open http://localhost:8000
```

`make test` runs the test suite on Node's built-in test runner (`node --test`);
`make install` is a no-op because there are no dependencies.

Note: the page needs an HTTP origin, not `file://` — it fetches the data under
`data/` and loads `main.js` as an ES module, both of which the
browser blocks on a `file://` origin.

## Architecture

Single-page vanilla JS application — no bundler, no npm.

| File | Purpose |
|---|---|
| `index.html` | Markup for SVG map, overlay screens (select, settings, stats), game panel, info panels, text input |
| `main.js` | The browser shell — D3 map setup, zoom, DOM rendering, timers, event wiring, data loading, `localStorage`. Loaded as an ES module |
| `game-core.mjs` | The game's rules, pure: round order, guess accounting, answer matching. Imports nothing, touches no DOM/D3/`localStorage`/timers. The only module under test |
| `test/game-core.test.mjs` | Tests for `game-core.mjs` — `node --test`, `node:assert`, synthetic fixtures |
| `style.css` | Layout, overlays, panels, buttons, responsive breakpoints |
| `data/bundeslaender.topo.json` | Bundesland geometry (TopoJSON object `bundeslaender`, `id` = ISO 3166-2 key such as `DE-BY`) |
| `data/kulisse.topo.json` | Neighbouring countries' land (object `kulisse`), drawn as muted scenery beneath the Bundesländer |
| `data/bundeslaender.json` | Bundesland metadata keyed by ISO 3166-2 key (name, capital, population, area_km2, highest_point, neighbour_count) |
| `wappen/de-xx.svg` | Landeswappen, named by the lowercased ISO 3166-2 key |
| `countries.json`, `aliases.json` | World-quiz data, no longer loaded by the app (removed in ticket 07) |

Data sources and their required credits are documented in `SOURCES.md`; the credits
are shown in the corner of the map (`#map-credits`).

**Dependencies (all via CDN):**
- D3.js v7 — SVG rendering, projections, zoom behavior
- topojson-client v3 — decodes shared-border topology format
- Google Fonts — Inter typeface

**Data flow:**
1. `main.js` fetches the two local TopoJSON files + `data/bundeslaender.json` (parallel `Promise.all`)
2. Converts topology → GeoJSON features via `topojson.feature()` (and `topojson.merge()` for the German outline)
3. A D3 conic conformal projection (parallels 48.5°/53.5°, central meridian 10.5°E) is fitted to the German outline
4. The Kulisse and the Bundesländer are rendered as `<path>` elements in two groups inside one zoomed `<g>`, Kulisse beneath
5. D3 zoom behavior handles pan/zoom (1x–6x scale range), with `translateExtent` clamping panning to Germany plus its margin
6. Landeswappen are local SVGs, located by `wappenUrl(key)`

**Projection and fit:** the SVG has a fixed `viewBox` = Germany's padded projected bounds, with `preserveAspectRatio="xMidYMid meet"`, and is sized to the viewport by CSS — so resizing re-fits and re-centres Germany with no JS resize handler. All projection, zoom and pan arithmetic is in viewBox units. Strokes use `vector-effect: non-scaling-stroke`.

## Game Modes

The app has four modes — one free-roam and three quiz modes:

1. **Explore** — hover to see country info panel; no scoring
2. **Find the Country** — given a name + flag, click the correct country on the map
3. **Name the Country** — country highlighted on map + flag shown, type its name
4. **Name the Capital** — country name shown + highlighted on map, type its capital

Quiz modes share a settings screen (rounds 1–50, guesses 1–10, auto-advance toggle) and an end-of-game stats screen.

## Implementation Guidelines

- **Prefer CSS over JS for layout:** Use media queries, `:hover`, flex/grid, and `display: none` toggling via class names for responsive behavior. Avoid JS resize handlers or manual style manipulation when CSS can achieve the same result.
- **Drive UI visibility from `data-phase` and `data-mode` on `<body>`:** JS sets `document.body.dataset.phase` (`idle`, `playing`, `feedback`) and `document.body.dataset.mode` (`explore`, `find`, `name-country`, `name-capital`). CSS attribute selectors control which panels, buttons, and elements are visible for each combination — no manual `.classList.add('hidden')` calls per transition. Mode-specific differences (e.g. flag hidden in Name Capital, prompt hidden in Name Country) are CSS rules, not JS branches.

## Key Patterns

- **Screen management:** Overlay screens (`screen-select`, `screen-settings`, `screen-stats`) shown/hidden via `data-phase` and `data-screen` attributes on `<body>`. Only one overlay is visible at a time.
- **Game state:** `game-core.mjs` owns round order, score, skipped count, remaining guesses and the current target; `main.js` keeps only the shell's own state (mode, phase, screen, the chosen settings, the auto-advance timer) and renders what the core reports. Phase and mode are mirrored to `<body>` data attributes so CSS drives visibility.
- **The testing seam:** all round sequencing, guess accounting and answer matching go through `createGame(...)` in `game-core.mjs`; everything environmental (timers, CSS classes, zoom, panels, score history) stays in `main.js` and is verified by driving the app.
- **Bundesland identification:** Bundesländer are keyed by ISO 3166-2 code (e.g. `"DE-BY"` = Bayern). `featureId(d)` is the one place that maps a geometry feature to that key (the vendored TopoJSON already carries it as `d.id`).
- **Answer validation:** one canonical `normalize()` in `game-core.mjs` is applied to both the typed answer and the reference answer (trim/lowercase, `ß`→`ss`, drop diacritics, collapse `ae`/`oe`/`ue`, strip non-alphanumerics). Names are matched through an alias table (for now built in `main.js` from the plain German names; the full table arrives with ticket 05), capitals against the item's `capital` (plus optional `capital_variants`).
- **CSS classes on `<path>`:** `.bundesland` / `.kulisse` (the Kulisse is `pointer-events: none` in every mode), `.highlighted` (explore hover), `.target` (quiz highlight), `.wrong-guess` (brief red flash on wrong click).
- **Responsive:** Mobile breakpoint at 600px — stacks panels vertically, hides the Landeswappen in the game panel, adjusts border radii.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
