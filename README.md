# Deutschland-Quiz

A browser game for learning Germany's sixteen Bundesländer: their shapes and where they
sit, their Landeshauptstädte and their Landeswappen. The whole interface is in German, so
the game doubles as everyday-vocabulary practice for someone learning the language.

The map shows Germany divided into its Bundesländer, fitted to the screen, with the
neighbouring countries drawn as muted, non-interactive scenery (the *Kulisse*). You can
pan and zoom (drag, scroll wheel, pinch), but only within Germany plus a thin margin.

## Quickstart

```sh
make run        # python3 -m http.server 8000
```

Then open [localhost:8000](http://localhost:8000). The page needs an HTTP origin, not
`file://`: it fetches its data from `data/` and loads `main.js` as an ES module.

Run the tests (Node's built-in test runner, no npm install, no build step):

```sh
make test
```

## The four modes

- **Erkunden**: hover (or tap) a Bundesland to see its Landeswappen, Landeshauptstadt,
  Fläche, Einwohner, höchster Punkt and number of Nachbarländer. Its Einstellungen can
  also draw Flüsse, Seen, Städte and Landeshauptstädte; hover or tap one for its facts.
  Nothing is scored.
- **Bundesland finden**: you get a Bundesland's name and Landeswappen and click it on the map.
- **Bundesland benennen**: a Bundesland is highlighted and its Landeswappen shown, and
  you type its name. Umlauts are optional, and abbreviations (`NRW`), official long forms
  (`Freistaat Bayern`) and English names (`Bavaria`) all count.
- **Landeshauptstadt benennen**: a Bundesland is named and highlighted, the map moves
  gently toward it, and you type its Landeshauptstadt.

The quiz modes let you set the number of Runden (1–16, default 16: every Bundesland
once, in random order), the Versuche per Runde (1–10, default 3), and whether to go to the
next round automatically (*Automatisch weiter*). Each game ends on a summary screen with
your rolling average over recent games of that mode.

## Stack

- Vanilla HTML/CSS/JS with no bundler and no npm. `main.js` is an ES module that imports
  the pure rules module `game-core.mjs`.
- **D3.js v7** and **topojson-client v3**, both from a CDN.
- Local data: Bundesland and Kulisse geometry as TopoJSON, Bundesland metadata and the
  name-alias table as JSON (all under `data/`), and the Landeswappen as SVGs (`wappen/`).

## Data and licensing

Where every piece of data comes from, how it was processed, its licence and the credits
the app has to show are all recorded in [`SOURCES.md`](SOURCES.md).

The data is vendored and committed, so running the game needs no data tooling. Two tools
maintain it:

- `tools/vendor-germany-data.sh` regenerates the geometry and the Landeswappen from their
  sources. It is a one-off, by-hand step and not part of any build.
- `tools/data-review.html` shows the vendored data in the browser for checking
  (`make run`, then <http://localhost:8000/tools/data-review.html>).

## Files

```
index.html          page shell: map SVG, panels, overlay screens; D3 + topojson-client from CDN
style.css           layout, map classes, CSS-driven visibility off <body> data attributes
main.js             browser shell: projection, zoom and pan clamp, rendering, events, timers, score history
game-core.mjs       pure game rules: round order, guess accounting, answer matching
test/*.test.mjs     node --test suites: game-core, the real alias table, the real capitals, the vendored data
data/               Bundesland + Kulisse TopoJSON, Bundesland metadata, name-alias table
wappen/             the 16 Landeswappen, named by lowercased ISO 3166-2 key (de-by.svg)
tools/              data vendoring script and data review page
SOURCES.md          data provenance, licences, required credits
Makefile            install / run / test / clean entry points
```

See `docs/game-flow.md` for the screen-by-screen flow and `docs/ui-components.md` for the
visual inventory.
