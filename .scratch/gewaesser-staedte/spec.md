# Spec: Gewässer & Städte — finding and naming rivers, lakes and cities

Status: ready-for-agent

Decided in a `/grilling` session with the maintainer on 2026-09-30. The research behind the
pool and the pipeline (Wikidata/Overpass lookups, a rendering spike) was done the same
day; its findings are folded in below. Related decisions:
[ADR 0001](../../docs/adr/0001-natural-earth-rejected-for-hydrography.md) (Natural Earth
rejected) and [ADR 0002](../../docs/adr/0002-osm-data-odbl-separate-files.md) (ODbL files
and credits).

## Problem Statement

The four live modes teach the sixteen Bundesländer and their capitals. Nothing in the
app teaches the rest of the country's geography: the rivers, the lakes and the big cities
that a German learner hears about every day ("am Main", "an der Elbe", "der Bodensee").
The original spec (`.scratch/bundesland-quiz/spec.md`, "Out of Scope") named this as the
next piece of work and kept `game-core.mjs` generic for it.

## Solution

Two new quiz modes on the same map engine, with the same Einstellungen → Runden →
Feedback → Spiel beendet flow:

- **Gewässer & Städte finden** (`find-landmark`): the prompt names a river, lake or city
  ("Main" / "Fluss"); click it on the map.
- **Gewässer & Städte benennen** (`name-landmark`): a feature is marked on the map in
  orange; type its name.

The map shows **all** landmark features in both modes: 18 rivers, 11 lakes and 24 city
dots. Some are never asked about; they're distractors and context. The Einstellungen
screen gets four toggles that choose which feature types can be asked: **Flüsse, Seen,
Städte, Landeshauptstädte**.

The menu grows from four cards to six.

## User Stories

### Menu and Einstellungen

1. As a learner, I want two new cards on the menu, "Gewässer & Städte finden" and "Gewässer & Städte benennen", so that I can practise rivers, lakes and cities as well as Bundesländer.
2. As a learner, I want to choose on the Einstellungen screen whether rivers, lakes, cities and/or Landeshauptstädte are asked, so that I can practise one kind of feature at a time.
3. As a learner, I want Landeshauptstädte off by default, so that a default game isn't dominated by sixteen capitals I already drill in Landeshauptstadt benennen.
4. As a learner, I want the game to refuse to let me switch off every type, so that I can never start an empty game.
5. As a learner, I want Runden to default to every selected feature once, so that a default game is a complete pass, as in the Bundesland modes.
6. As a learner, I want the OpenStreetMap credit shown with the other credits on the Einstellungen screen, so that the data's source is acknowledged before every game.

### The map in these modes

7. As a learner, I want to see the whole river network, the lakes and the city dots, not just the features being asked about, so that the map gives no answers away by what it omits.
8. As a learner, I want rivers, lakes and cities drawn the same whether or not they can be asked, so that the drawing never hints at the target.
9. As a learner, I want the Bundesländer still drawn, quietly, so that I can place a river or city within the country.
10. As a learner, I want lines and dots to stay the same screen size at every zoom, so that rivers don't get fat and dots don't vanish.
11. As a learner, I want lakes drawn over rivers, so that the Rhein doesn't run as a line across the Bodensee.

### Gewässer & Städte finden

12. As a learner, I want the prompt to give the name and the type ("Main" / "Fluss"), so that "Lech" or "Dümmer" isn't ambiguous.
13. As a learner, I want a click near a thin river or a tiny lake to count, so that I'm tested on geography, not on pixel precision.
14. As a learner, I want a click on the dot of a city that sits on a river to count as the city, so that Köln is clickable despite the Rhein running through it.
15. As a learner, I want a click inside a lake to count as the lake, even where a river runs through it.
16. As a learner, I want a click on open land, sea or the Kulisse to cost nothing, so that a miss near nothing isn't punished.
17. As a learner, I want a wrong click to tell me what I clicked ("Falsch – das war die Isar · noch 2 Versuche"), so that every mistake still teaches me a name.
18. As a mouse user, I want the feature my click would hit to be tinted as I hover, so that I know what I'm about to click.
19. As a learner, I want the map to stay on the overview, so that rounds don't zoom in and out; I can still zoom in myself to separate Ammersee from Starnberger See.

### Gewässer & Städte benennen

20. As a learner, I want the target shown in orange with a ring around small lakes and cities, so that a 2-pixel lake is still unmistakable.
21. As a learner, I want the map to travel gently to each target, as in Landeshauptstadt benennen, so that small features become visible without me zooming.
22. As a learner, I want the prompt to tell me the type ("Welcher See ist markiert?").
23. As a learner, I want "der Rhein", "Rhein" and even "die Rhein" accepted, so that the article doesn't cost me a Versuch.
24. As a learner, I want English names and short forms accepted (Rhine, Lake Constance, Cologne, Frankfurt), as Bavaria is accepted in Bundesland benennen.

### Feedback and stats

25. As a learner, I want the feedback to name the feature with its article ("Keine Versuche mehr – es war der Main"), so that I learn the article with the name.
26. As a learner, I want a few facts about the feature in feedback (a river's length; a lake's area, depth and Bundesland; a city's population and Bundesland).
27. As a learner, I want my score history kept per mode, so that the averages of finding and naming don't mix.

## Implementation Decisions

### Domain vocabulary

Additions to the vocabulary of `.scratch/bundesland-quiz/spec.md`:

| Term | Meaning |
|---|---|
| **Gewässer** | Rivers and lakes together. UI-facing. |
| **Fluss / See / Stadt / Landeshauptstadt** | The four feature types, as shown in prompts and on the toggles. |
| **Landmark** (code only) | Any river, lake or city in these modes. The code word: `find-landmark`, `landmark-hit.mjs`, `data/landmarks.json`. **Not used in the UI**, because a German *Landmarke* is an orientation point (a church tower), not a river. |
| **Pool feature** | A landmark that can be a round's target. |
| **Background feature** | A landmark that is drawn and clickable but never a target: 8 rivers and 4 lakes. |
| **Marker** | The orange ring drawn around a lake or city target. |

### Modes and the menu

- Mode ids: `find-landmark`, `name-landmark` (`data-mode` values and history keys).
- Menu: six cards in the existing 2-column grid (3 rows; 1 column at ≤600px), in the
  order Erkunden, Bundesland finden, Bundesland benennen, Landeshauptstadt benennen,
  Gewässer & Städte finden, Gewässer & Städte benennen.

| Card | Icon | Label | Description |
|---|---|---|---|
| `find-landmark` | 🌊 | Gewässer & Städte finden | "Flüsse, Seen und Städte auf der Karte anklicken" |
| `name-landmark` | 🏞️ | Gewässer & Städte benennen | "Den markierten Fluss, See oder die markierte Stadt benennen" |

### The feature pool

All ids below were verified on 2026-09-30: each Wikidata id was checked against its German
label (Wikidata API), and each OSM id was found by querying Overpass for that Wikidata tag.
Feature ids are readable typed slugs (the reasoning is the same as `DE-BY` over `09`);
the Wikidata and OSM ids are stored as fields.

**Rivers: pool (10)**

| id | Name | Article | Wikidata | OSM |
|---|---|---|---|---|
| `river-rhein` | Rhein | der | Q584 | relation 123924 |
| `river-donau` | Donau | die | Q1653 | relation 89652 |
| `river-elbe` | Elbe | die | Q1644 | relation 123822 |
| `river-main` | Main | der | Q1670 | relation 412876 |
| `river-weser` | Weser | die | Q1650 | relation 123751 |
| `river-ems` | Ems | die | Q1648 | relation 370068 |
| `river-oder` | Oder | die | Q552 | relation 387605 |
| `river-neckar` | Neckar | der | Q1673 | relation 123881 |
| `river-mosel` | Mosel | die | Q1667 | relation 390416 |
| `river-spree` | Spree | die | Q1684 | relation 390274 |

**Rivers: background (8)**

| id | Name | Article | Wikidata | OSM |
|---|---|---|---|---|
| `river-saale` | Saale | die | Q1678 | relation 387502 |
| `river-havel` | Havel | die | Q1682 | relation 390306 |
| `river-isar` | Isar | die | Q106588 | relation 273028 |
| `river-inn` | Inn | der | Q14369 | relation 406437 |
| `river-lech` | Lech | der | Q155841 | relation 406547 |
| `river-werra` | Werra | die | Q6424 | relation 390379 |
| `river-lahn` | Lahn | die | Q103148 | relation 412935 |
| `river-aller` | Aller | die | Q1967803 | relation 123707 |

**Lakes: pool (7)**

| id | Name | Article | Wikidata | OSM |
|---|---|---|---|---|
| `lake-bodensee` | Bodensee | der | Q4127 | relation 1156846 |
| `lake-mueritz` | Müritz | die | Q3369 | relation 13157981 |
| `lake-chiemsee` | Chiemsee | der | Q4138 | relation 32246 |
| `lake-schweriner-see` | Schweriner See | der | Q311217 | relation 1104680 (Außensee) **+ relation 21142 (Innensee)** |
| `lake-starnberger-see` | Starnberger See | der | Q131615 | relation 168892 |
| `lake-ammersee` | Ammersee | der | Q265336 | relation 168893 |
| `lake-steinhuder-meer` | Steinhuder Meer | das | Q165782 | relation 32810 |

**Lakes: background (4)**

| id | Name | Article | Wikidata | OSM |
|---|---|---|---|---|
| `lake-plauer-see` | Plauer See | der | Q704793 | relation 2567608 |
| `lake-kummerower-see` | Kummerower See | der | Q688154 | way 662219702 |
| `lake-grosser-ploener-see` | Großer Plöner See | der | Q527798 | relation 282740 |
| `lake-duemmer` | Dümmer | der | Q688459 | relation 556521 |

**Cities: Städte (8)**, all in the pool:

| id | Name | Bundesland | Wikidata | OSM node |
|---|---|---|---|---|
| `city-koeln` | Köln | DE-NW | Q365 | 20953083 |
| `city-frankfurt` | Frankfurt am Main | DE-HE | Q1794 | 27418664 |
| `city-dortmund` | Dortmund | DE-NW | Q1295 | 25293125 |
| `city-leipzig` | Leipzig | DE-SN | Q2079 | 21687149 |
| `city-nuernberg` | Nürnberg | DE-BY | Q2090 | 1569338041 |
| `city-mannheim` | Mannheim | DE-BW | Q2119 | 240060919 |
| `city-rostock` | Rostock | DE-MV | Q2861 | 1684321651 |
| `city-freiburg` | Freiburg im Breisgau | DE-BW | Q2833 | 240092010 |

**Cities: Landeshauptstädte (16)**, all in the pool, each `capital_of` its Bundesland:

| id | Name | Wikidata | OSM node |
|---|---|---|---|
| `city-stuttgart` | Stuttgart | Q1022 | 1674026139 |
| `city-muenchen` | München | Q1726 | 1700534808 |
| `city-berlin` | Berlin | Q64 | 240109189 |
| `city-potsdam` | Potsdam | Q1711 | 1695218178 |
| `city-bremen` | Bremen | Q24879 | 20982927 |
| `city-hamburg` | Hamburg | Q1055 | 20833623 |
| `city-wiesbaden` | Wiesbaden | Q1721 | 240028377 |
| `city-schwerin` | Schwerin | Q1709 | 21993086 |
| `city-hannover` | Hannover | Q1715 | 1651888734 |
| `city-duesseldorf` | Düsseldorf | Q1718 | 240126753 |
| `city-mainz` | Mainz | Q1720 | 240116263 |
| `city-saarbruecken` | Saarbrücken | Q1724 | 1530957491 |
| `city-dresden` | Dresden | Q1731 | 20833613 |
| `city-magdeburg` | Magdeburg | Q1733 | 33997995 |
| `city-kiel` | Kiel | Q1707 | 24487450 |
| `city-erfurt` | Erfurt | Q1729 | 240038130 |

Pool sizes: Flüsse 10, Seen 7, Städte 8, Landeshauptstädte 16; 25 with the default
toggles, 41 with all four on. Each capital's `name` must equal `capital` in
`data/bundeslaender.json` for its Bundesland, and a data test enforces this.

### Data files

| File | Content | Origin / licence |
|---|---|---|
| `data/gewaesser.topo.json` | TopoJSON, objects `rivers` (18) and `lakes` (11); each geometry `id` = feature id | OSM → **ODbL** |
| `data/staedte.json` | GeoJSON FeatureCollection of 24 points, `id` = feature id, 4 decimals | OSM → **ODbL** |
| `data/landmarks.json` | Hand-curated metadata keyed by feature id (below) | Own work + Wikidata (CC0) + Destatis |
| `data/landmark-aliases.json` | Readable spelling → feature id, **pool features only** | Own work (CC BY-NC) |

`data/landmarks.json` record shapes:

```jsonc
"river-rhein":  { "type": "river", "name": "Rhein", "article": "der", "pool": true,
                  "wikidata": "Q584", "osm": ["relation/123924"],
                  "length_km": 1233 },
"lake-chiemsee": { "type": "lake", "name": "Chiemsee", "article": "der", "pool": true,
                  "wikidata": "Q4138", "osm": ["relation/32246"],
                  "area_km2": 79.9, "max_depth_m": 73, "bundeslaender": ["DE-BY"] },
"city-mainz":   { "type": "city", "name": "Mainz", "article": null, "pool": true,
                  "wikidata": "Q1720", "osm": ["node/240116263"],
                  "population": 0, "bundesland": "DE-RP", "capital_of": "DE-RP" }
```

(The values are illustrative; ticket 01 curates the real ones.)

- `article` is `der`/`die`/`das` for every river and lake, and `null` for every city.
- `capital_of` is present (a Bundesland key) only on the 16 Landeshauptstädte. It is how
  the **Städte** and **Landeshauptstädte** toggles split the cities.
- `length_km` is the **whole** river's length, not the German stretch. `area_km2` is the
  whole lake, including the Austrian and Swiss Bodensee. `bundeslaender` lists only the
  German Länder a lake touches (Bodensee: `DE-BW`, `DE-BY`).
- **Sources:**
  - `length_km`, `area_km2` and `max_depth_m` come from Wikidata (CC0), checked against
    de.wikipedia as `highest_point` was in `SOURCES.md` §7. Wikidata has known unit
    errors (the spike found "rivers" with lengths in metres), so every value is checked.
  - `population` comes from Destatis, "Städte (Alle Gemeinden mit Stadtrecht) nach Fläche,
    Bevölkerung und Bevölkerungsdichte", Gebietsstand 31.12.2024 (`SOURCES.md` §4).
  - Names and articles are curated, **never taken from OSM tags**: OSM's own primary
    names include "Odra", "Danube" and "Lužická Nisa".

### Data pipeline (`tools/vendor-landmark-data.sh`)

A one-off, by-hand script in the style of `tools/vendor-germany-data.sh`: bash, curl,
`npx -y mapshaper@0.7.70`, downloads cached in `tools/.cache/`. No npm dependency, no build
step. The pinned ids live in the script.

1. **Query by Wikidata ID, pinned to OSM ids.** The script queries Overpass for each
   feature's Wikidata tag and **fails** unless the result is exactly the expected OSM
   object(s). Reasons found in research:
   - OSM relation 5441202 "Weiße Saar" carries the Saar's Wikidata id.
   - Two "Aller Schleuse" lock-channel relations (15004441, 15004494) carry the Aller's.
   - The Main and the Inn also have riverbank multipolygons (6274126, 4621343) with the
     same Wikidata id.

   A plain Wikidata query would silently merge these.
2. **Rivers:**
   - Only `type=waterway` relations.
   - Only members with role `main_stream` or no role. `side_stream`, `tributary`,
     `distributary` and `spring` are dropped, to avoid Altrhein arms and the like.
   - Fetched with `out geom(47.0,5.5,55.3,15.3)` to bound the download.
   - Clipped to the Germany outline buffered by 5 km (`SOURCES.md` §1: dissolve
     `data/bundeslaender.topo.json`, `mapshaper -buffer 5km`).
3. **Lakes are not clipped.** The 5 km clip cuts a straight line through the Swiss end
   of the Bodensee. Every other lake lies wholly inside Germany, so lakes are kept whole.
   `SOURCES.md` §1's "used for clipping the hydrography" becomes "used for clipping the
   rivers". The Schweriner See is the union of the Außensee (which carries the Wikidata
   tag) and the Innensee (relation 21142, no Wikidata tag, pinned by OSM id).
4. **Cities:** `place=city` nodes, one per Wikidata id. All 24 resolve to exactly one node.
5. **Simplify by interval, not percentage.** OSM vertex density varies too much between
   rivers for a percentage to mean anything. 200 m keeps full detail at the 6× maximum
   (about 160 m per CSS px). The spike measured the 24 candidate rivers' main streams at
   245 KB (72 KB gzipped) at 200 m; the 18 chosen will be smaller. Output unquantized at
   4 decimals, like the GISCO files.
6. **Overpass robustness.** A busy server answers **HTTP 200 with an HTML error page**,
   so `curl -f` alone misses it. The script checks that the body parses as JSON, retries
   with a back-off (the spike needed up to 3 retries per batch), batches requests (no
   more than 6 relations each), and sends a descriptive User-Agent.

### Licence and credits

As [ADR 0002](../../docs/adr/0002-osm-data-odbl-separate-files.md):

- The two OSM files are ODbL 1.0, © OpenStreetMap contributors, and get a new entry in
  `LICENSE`'s "Third-party material".
- `SOURCES.md` §3/§4 are rewritten for the vendored data, and gaps 3 and 4 are closed.
- The Einstellungen credits gain:
  - short note: "Karten: © EuroGeographics, © OpenStreetMap, Einwohner und Fläche: Destatis …"
  - full wording, an extra line: "Gewässer und Städte: © OpenStreetMap-Mitwirkende, ODbL",
    with "OpenStreetMap" linking to <https://www.openstreetmap.org/copyright>
    (`target="_blank" rel="noopener"`)

  The credits show in every mode's Einstellungen, not only the landmark modes.
- The landmark layers are **not** drawn in Erkunden until Erkunden has its own credit.

### Einstellungen

- **Type toggles:** four rows with the existing toggle control, shown only when the
  settings are for `find-landmark` or `name-landmark`. Visibility is driven by CSS off a
  `<body>` data attribute that `openSettings()` sets (e.g. `data-settings-mode`), not by
  per-element show/hide.

  | Label | Default | Selects |
  |---|---|---|
  | "Flüsse" | on | pool rivers (10) |
  | "Seen" | on | pool lakes (7) |
  | "Städte" | on | cities without `capital_of` (8) |
  | "Landeshauptstädte" | off | cities with `capital_of` (16) |

  The last toggle that is on can't be switched off (the click is ignored).
- **Runden:** 1 to the selected pool size. It defaults to the pool size. When the
  toggles change, the maximum follows; a value that was at the old maximum follows the
  new one, and any other value is clamped.
- **Versuche pro Runde** and **Automatisch weiter**: unchanged.
- **Remembered while the page is open**, as now. The Runden value is kept separately for
  the Bundesland modes (max 16) and the landmark modes, and the toggles are shared by the
  two landmark modes.

### Rendering

- **Layers** in `#map-group`, bottom to top: Kulisse, Bundesländer, the `.hit-target`
  halos (Bundesland modes only), **rivers, lakes, cities, marker**. The landmark groups
  are visible only when `data-mode` is `find-landmark` or `name-landmark` **and**
  `data-phase` is `playing` or `feedback` (CSS). Behind the menu and in the other modes
  they are hidden.
- **Bundesländer in these modes:** a lighter, quieter fill with their borders kept,
  `pointer-events: none` (CSS by `data-mode`), no hover highlight.
- **Base styles:**
  - rivers: 1.5 px line in `#3a78c2`
  - lakes: light water-blue fill with a thin `#3a78c2` edge
  - cities: dots of 3.5 px radius, dark grey with a white rim

  Pool and background features are styled identically. Strokes are
  `vector-effect: non-scaling-stroke`. Dot radii and the marker's radius are kept at a
  constant screen size by dividing by `k` in the zoom handler (an SVG radius doesn't
  scale with `vector-effect`).
- **Target (`.target`) in orange `#f28c00`:**
  - a river becomes a 4 px orange line over a thin white casing
  - a lake gets an orange fill
  - a city dot grows to 6 px orange
- **Marker:** around lake and city targets only, an orange ring (2 px stroke, no fill)
  of **18 screen px** radius, centred on the feature (a city's point; a lake's
  `d3.geoPath().centroid`). Rivers get no marker.
- **When the target shows:** in `name-landmark`, while playing and in feedback; in
  `find-landmark`, in feedback only.
- **Wrong click (`find-landmark`):** the hit feature flashes red (`.wrong-guess` colours)
  for 600 ms.
- **Hover (`find-landmark`, mouse only, i.e. `pointerType === 'mouse'`):** the feature the
  resolver would pick is tinted a faint orange. This shows *which* feature a click would
  hit, not whether it is right.
- **Data loading:** the three landmark files are fetched in the existing
  `Promise.all`. The total stays well under the Kulisse's 542 KB.

### Hit-testing (`landmark-hit.mjs`)

A new **pure module** (imports nothing, no DOM or D3), the second testing seam beside
`game-core.mjs`.

- The shell projects every landmark once into viewBox units at load time:
  - rivers → arrays of polylines
  - lakes → polygons with holes
  - cities → points

  It passes these to the resolver as `{ id, kind, ... }` records.
- On a click (or `pointermove` for hover), the shell converts the pointer to viewBox
  coordinates (inverting the zoom transform), and calls
  `nearestLandmark(point, features, { radius, dotRadius })` with
  `radius = 12 / pxPerUnit / k` (12 screen px at every zoom), `dotRadius` likewise from
  the 3.5 px dot.
- **Distance is measured to the drawn shape:**
  - river: distance to the nearest segment
  - lake: **0 inside** (point in polygon, holes respected), otherwise distance to the
    edge
  - city: `max(0, distance to point − dotRadius)`, so anywhere on the visible dot is 0
- It returns the id with the smallest distance ≤ `radius`, or `null`. **Ties** (most
  importantly the many 0s where a dot sits on a river or a river runs through a lake) go
  **city, then lake, then river**. A tap on the Köln dot is Köln, not the Rhein; a tap
  in the Bodensee is the Bodensee.
- `null` (open land, sea, Kulisse, letterbox) is ignored: no Versuch, no flash.
- d3-zoom already swallows the click that ends a drag-pan, so a pan is never a guess.

### Zoom

- **`find-landmark`: the overview**, exactly like Bundesland finden. At round start it
  resets to 1× only if the user has zoomed in. There is no zoom in feedback. The user may
  zoom freely, and the resolver works at every `k`.
- **`name-landmark`: gentle travel**, exactly like Landeshauptstadt benennen. At round
  start and in feedback it makes a 750 ms transition that fits the feature's projected
  bounds at 0.9 of the viewBox, capped at `TARGET_ZOOM_MAX = 1.8` and clamped by
  `zoom.constrain()`. Long rivers fit at about 1×; lakes and cities (a point has zero
  bounds) hit the cap. The input gets focus after 800 ms.
- `zoomToBundesland(id)` is generalised to `zoomToBounds(bounds)`, and Landeshauptstadt
  benennen calls it with the Bundesland's bounds; its behaviour doesn't change.

### Rounds, guesses and `game-core.mjs`

- The shell builds `items` from `data/landmarks.json`: pool features of the selected
  types that have geometry. Background features and deselected types are not items, but
  they're still drawn and clickable.
- `createGame` is unchanged in shape. Mode `find-landmark` uses `guessById(id)` with the
  resolver's id. Any id other than the target, including background features and
  deselected types, costs a Versuch, the same rule as now ("no dedup").
- Mode `name-landmark` adds a `guessByText` branch:
  `matchLandmark(text, aliases) === targetId`.
- **`matchLandmark(text, aliases)`** (new, exported, pure) strips **one** leading article
  (`der`, `die` or `das`, as a whole word followed by whitespace) from the input, then
  does the same canonical lookup as `matchBundesland`.
  - A wrong article is accepted ("die Rhein" → `river-rhein`).
  - The bare article ("der") matches nothing.
  - No pool name starts with "Der ", "Die " or "Das ", and a test pins that.
- Score history: `geospiel-stats-find-landmark`, `geospiel-stats-name-landmark`. The
  toggles are not part of the key.

### Answer matching and aliases

`data/landmark-aliases.json` uses the same shape and conventions as
`data/bundesland-aliases.json`: readable keys, normalised at match time. It covers
**pool features only**, since background features are never targets. For each pool
feature it holds:

- the German name; for the long city names also the short form ("Frankfurt", "Freiburg").
  There's no Frankfurt (Oder) or Freiburg (Elbe) in the pool, and the spec records that
  check here.
- English or other exonyms where common: Rhine, Danube, Moselle, Lake Constance, Cologne,
  Munich, Nuremberg, Hanover; "Schwäbisches Meer" for the Bodensee.
- common misspellings, as the Bundesland table has

Berlin, Hamburg and Bremen are cities here (`city-berlin`, …), resolved from this table
alone. The Bundesland table is not consulted in these modes, so the two tables can't
conflict.

**The normaliser re-check** (`.scratch/bundesland-quiz/spec.md`, "Further Notes": "`Moers`
canonicalises to `mors` … the shape of a future collision"):

- The alias collision test is extended to `landmark-aliases.json`: no two keys may
  normalise together while pointing at different ids.
- A cross-check over **all 53 feature names** (pool and background) asserts no two
  canonicalise to the same string.
- "Main" and "Mainz" stay distinct (`main` vs `mainz`), and so do "Elbe" and "Ems"; tests
  pin these pairs.

### German UI strings

Every sentence is in the nominative, so the stored `article` is used as is and no
declension is needed.

| Where | Text |
|---|---|
| `find-landmark` prompt | The name in bold ("Main", "Frankfurt am Main") with a small grey type label under it: "Fluss" / "See" / "Stadt" / "Landeshauptstadt" |
| `name-landmark` prompt, playing | "Welcher Fluss ist markiert?" / "Welcher See ist markiert?" / "Welche Stadt ist markiert?". Landeshauptstädte use "Stadt", so the prompt doesn't narrow the answer |
| `name-landmark` prompt, feedback | The name with its article ("der Main") |
| `name-landmark` placeholder | "Name eingeben …" |
| `find-landmark` wrong click, Versuche left | A line in the bottom stack, styled like `#input-feedback`: "Falsch – das war die Isar · noch 2 Versuche" (singular "noch 1 Versuch"; cities without an article: "das war Köln") |
| Out of Versuche (both) | "Keine Versuche mehr – es war der Main" |
| Correct (both) | "Richtig!" |
| `name-landmark` wrong answer | "Falsch – noch 2 Versuche" (unchanged) |

The game panel's Landeswappen is **hidden** in both modes, since it would give the region
away.

### Info panel in feedback

The existing `#country-panel`, its rows switched per feature type by a data attribute
on the panel (e.g. `data-kind="river|lake|city"`) and CSS:

| Type | Name line | Under the name | Facts |
|---|---|---|---|
| Fluss | "der Rhein" | — | **Länge** ("1.233 km") |
| See | "der Chiemsee" | — | **Fläche** ("79,9 km²") · **Größte Tiefe** ("73 m") · **Bundesland** ("Bayern"; "Baden-Württemberg, Bayern" for the Bodensee) |
| Stadt | "Mainz" | "Landeshauptstadt von Rheinland-Pfalz" (Landeshauptstädte only; nothing under "Köln") | **Einwohner** ("1.024.621") · **Bundesland** |

**Wappen slot:** cities show their Bundesland's Landeswappen; lakes show it when
`bundeslaender` has exactly one entry; rivers and the Bodensee show none (the slot
collapses). Numbers are formatted `de-DE`, with lake areas to one decimal.

### Developer tooling

`tools/data-review.html` gets a landmark section:

- all rivers, lakes and city dots over the Bundesländer, each labelled with its curated
  name
- pool and background in distinguishable colours
- a table of every feature's metadata, with "geometry present" ticks
- a toggle to draw the 12 px hit radius at the current zoom

It is for checking the vendored data by eye, as it does now.

## Testing Decisions

- **`test/game-core.test.mjs`:** `matchLandmark` covers the bare name, one leading
  article, the wrong article, the bare article alone, case and whitespace, and the
  normaliser variants. `guessByText` in `name-landmark` covers correct, wrong, empty
  (ignored) and a different landmark's name (wrong). `guessById` in `find-landmark`
  counts a non-item id (a background feature) as wrong. All with synthetic fixtures.
- **`test/landmark-hit.test.mjs`** (new), with synthetic geometry in viewBox units:
  - the nearest of two rivers
  - beyond the radius → `null`
  - inside a lake → the lake, even with a river through it
  - inside a lake's hole (an island) → not the lake, unless within radius of the edge
  - on a city dot that sits on a river → the city
  - an exact three-way tie → city
  - the radius scales with `k` (the caller passes it; the test passes two radii)
- **`test/data.test.mjs`** (extended):
  - every `landmarks.json` id has geometry (`rivers`/`lakes` objects or `staedte.json`)
    and every geometry has a record
  - the counts 10/8 rivers, 7/4 lakes, 8 + 16 cities, and the pool flags
  - articles: `der`/`die`/`das` for waters, `null` for cities
  - every capital's `name` equals `bundeslaender.json[capital_of].capital`, and
    `bundesland === capital_of`
  - every city point lies inside its Bundesland's polygon (a hand-written
    point-in-polygon, no dependency)
  - each lake's centroid lies in one of its `bundeslaender`
  - every river geometry lies inside the buffered Germany bounds
- **`test/landmark-aliases.test.mjs`** (new):
  - every pool feature is reachable by its own name, with and without its article
  - no alias points at a background feature or a missing id
  - the normalised-key collision check, and the cross-check over all 53 names
  - Main/Mainz and Elbe/Ems stay distinct
  - no name starts with an article
- **Driven in the browser, reported with observed values** (CLAUDE.md), at 1440×900 and
  400×800:
  - a click on each of Köln, Mainz and Dresden resolves to the city, not the river
  - a click inside the Bodensee resolves to the Bodensee
  - Ammersee and Starnberger See are separately clickable at 1×
  - a click on open land costs nothing
  - wrong-click text, a full game per mode, the toggles and Runden clamping
  - the marker ring is 18 px at 1× and at the cap
  - the credits show the OSM line

## Out of Scope

- **Landmark layers in Erkunden** and the Erkunden credit. They come together in a later
  change (ADR 0002).
- **Labels on the map.** As in the original spec: they would give away every answer.
- **More features** (Fulda, Ruhr, Tegernsee, Königssee, mountains, islands). The pipeline
  makes them a data-only change: a pinned row in the script plus records in
  `landmarks.json` and aliases.
- **Rivers' Mündung and the Bundesländer a river crosses.** Considered for the info panel
  and dropped by the maintainer; only Länge is shown.
- **A combined Bundesland + landmark mode**, difficulty tiers, timers or streaks.
- **Browser-driven automated tests.** As before, UI behaviour is verified by driving the
  app.

## Further Notes

- **Credit placement departs from the OSMF guideline's "corner of the map" wording,**
  deliberately (ADR 0002). The fallback, if it's ever needed, is a corner credit that
  fades after 5 s, drawn only while landmark layers show.
- **The 12 px radius and the tie order are the knobs to tune after playing.** Where a
  city dot sits *beside* a river rather than on it, a tap between them goes to whichever
  is nearer, which is the intended behaviour.
- **Ammersee and Starnberger See are about 8 px apart at 1× on a phone,** so their 12 px
  radii overlap; the nearer one wins. If that proves frustrating, the fix is zooming,
  which is allowed, not a larger radius.
- **Background features need names but no aliases.** They are named in wrong-click and
  feedback messages only.
- **Per CLAUDE.md, this spec, the tickets and ADRs 0001/0002 are committed to `main`
  before implementation starts.**
