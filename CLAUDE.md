# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build process or npm required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Architecture

Single-page vanilla JS application — 3 source files, no bundler, no npm.

| File | Purpose |
|---|---|
| `index.html` | Markup for SVG map, overlay screens (select, settings, stats), game panel, info panels, text input |
| `main.js` | All logic — D3 map setup, zoom, game state machine, event wiring, data loading |
| `style.css` | Layout, overlays, panels, buttons, responsive breakpoints |
| `countries.json` | Country metadata keyed by 3-digit ISO numeric ID (name, capital, population, area, highest point, neighbour count, iso_a2) |
| `aliases.json` | Normalized string → ISO ID mapping for fuzzy country-name matching (common misspellings, demonyms, alternate names) |

**Dependencies (all via CDN):**
- D3.js v7 — SVG rendering, projections, zoom behavior
- topojson-client v3 — decodes shared-border topology format
- world-atlas `countries-50m.json` — country geometry data (fetched at runtime)
- Google Fonts — Inter typeface

**Data flow:**
1. `main.js` fetches TopoJSON from world-atlas CDN + local `countries.json` + `aliases.json` (parallel `Promise.all`)
2. Converts topology → GeoJSON features via `topojson.feature()`
3. D3 Natural Earth projection maps geo coordinates to SVG pixel space
4. Countries rendered as `<path>` elements inside a `<g>` group
5. D3 zoom behavior handles pan/zoom (1x–12x scale range)
6. Country flags loaded on demand from flagcdn.com using `iso_a2` codes

**Projection scaling:** SVG dimensions are set from `window.innerWidth/Height`; projection scale is `width / 6.3`.

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
- **Game state:** Single `gameState` object tracks mode, phase (`idle`/`playing`/`feedback`), round order, score, guesses remaining. Phase and mode are mirrored to `<body>` data attributes so CSS drives visibility.
- **Country identification:** Countries matched by 3-digit zero-padded ISO numeric ID (e.g. `"004"` = Afghanistan). TopoJSON features use numeric `d.id` which is padded via `String(d.id).padStart(3, '0')`.
- **Answer validation:** Country names validated through `aliases.json` lookup (normalized). Capitals validated by exact normalized match against `countries.json`.
- **CSS classes on `<path>`:** `.highlighted` (explore hover), `.target` (quiz highlight), `.wrong-guess` (brief red flash on wrong click).
- **Responsive:** Mobile breakpoint at 600px — stacks panels vertically, hides flag in game panel, adjusts border radii.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
