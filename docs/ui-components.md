# UI Components

Visual inventory of every major UI element: appearance, positioning, and mobile
adaptations. Values are taken from `style.css`, `index.html` and `main.js`. All labels
are German.

---

## Global Styling

- **Background:** light blue-grey (`#e8f4f8`). This is also the sea: the only water geometry is the rivers and lakes of the landmark modes.
- **Font:** Inter (Google Fonts), fallback `system-ui, sans-serif`
- **Language:** `<html lang="de">`. Page title "Deutschland-Quiz".
- **Overflow:** hidden on `html` and `body`, so the page never scrolls
- **Shared panel style (`.panel`):** white semi-transparent (`rgba(255,255,255,0.95)`),
  8px backdrop blur, 16px border radius, drop shadow (`0 4px 24px rgba(0,0,0,0.18)`),
  16px/20px padding
- **Numbers:** formatted with `Intl.NumberFormat('de-DE')` (`13.248.928`, `70.542 km²`)

---

## 1. SVG Map (`#map`)

- **Size:** `position: fixed; inset: 0`, 100% × 100% of the viewport.
- **Projection:** D3 conic conformal, standard parallels 48.5°N / 53.5°N, rotated to
  10.5°E, fitted (`fitSize`) to the German outline (`topojson.merge` of the 16
  Bundesländer).
- **viewBox:** fixed to Germany's projected bounds plus `MAP_PADDING = 20` units on each
  side, with `preserveAspectRatio="xMidYMid meet"`. CSS sizes the SVG and the browser
  fits and centres Germany, so no JS resize handler is needed. Wide or tall screens
  letterbox, and the Kulisse fills the letterbox. All zoom and pan arithmetic, including
  the zoom-to-target centring and the visible area, is in viewBox units.
- **Layers** (inside one zoomed `<g id="map-group">`, bottom to top):
  1. `#kulisse-group`: **Kulisse**, one `.kulisse` path per neighbouring country
     (`data/kulisse.topo.json`). Muted fill `#e3e3de`, stroke `#cfcfc8` 0.5px,
     `pointer-events: none` in every mode, so it never highlights, never counts as a
     guess and never blocks a click on a Bundesland near the border.
  2. `#bundesland-group`: one `.bundesland` path per Bundesland, `data-id` = ISO 3166-2
     key (`DE-BY`)
  3. `#hit-group`: `.hit-target` touch halos (see below)
  4. `#river-group`, 5. `#lake-group`, 6. `#city-group`, 7. `#marker-group`: the
     landmark layers (`.landmark-layer`, see below)
- **Bundesland paths (`.bundesland`):**
  - Default: grey fill (`#ccc`), stroke `#666` 0.75px, pointer cursor
  - Erkunden hover/tap (`.highlighted`): orange fill (`#f90`), red stroke (`#c00`, 1.5px)
  - Quiz target (`.target`): blue fill (`#4a90d9`), dark blue stroke (`#1a5fa0`, 2px)
  - Wrong click (`.wrong-guess`): red fill (`#e05555`), dark red stroke (`#a02020`,
    1.5px), removed after 600 ms
- **Strokes:** every map path has `vector-effect: non-scaling-stroke`, so borders stay the
  same screen thickness at every zoom level.
- **Zoom:** D3 zoom (drag, wheel, pinch), scale range **[1, 6]**, where `k = 1` is the
  full-Germany view. Applied as a `transform` on `#map-group`.
- **Visible area (`visibleArea()`):** the part of the viewBox the user can see, in viewBox
  units: below the game panel's bottom edge and above the topmost showing child of the
  bottom stack, as laid out at the time of the call (so it is called after `setPhase`),
  converted from screen px through the SVG's screen CTM (`screenToViewBox` in
  `view-fit.mjs`, which takes the letterbox offset `e`/`f` into account), then
  intersected with the viewBox. Panels in a letterbox take nothing away. In the `idle`
  phase (menu, Erkunden) it is the whole viewBox.
- **Pan clamp:** `translateExtent` is the viewBox rectangle itself, and a custom
  `zoom.constrain()` runs d3's default clamp with the visible area as the viewport
  instead of the whole viewBox. So the viewBox only has to cover the visible area:
  Germany's top and bottom edges can move out from under the panels, by the panels'
  height in screen px at every `k`, also at `k = 1`. With no panels showing (the menu,
  Erkunden) this is the old clamp exactly: nothing to pan at `k = 1`, Germany plus the
  20-unit margin at higher `k`. The overview at rest (`k = 1`, no translation) satisfies
  both, so it looks the same. Drags, wheel and pinch use it, and programmatic zooms call
  `zoom.constrain()` themselves.
- **Gentle zoom (`zoomToBounds(bounds)`):** 750 ms transition to fit projected bounds at
  0.9 of the visible area, centred in it, capped at `TARGET_ZOOM_MAX = 1.8` (a point's
  zero bounds hit the cap) and floored at `k = 1` (`fitBounds` in `view-fit.mjs`), then
  clamped. It runs after `setPhase`, so it fits above the input panel while playing and
  above the feedback bar and info panel in feedback. Used in Landeshauptstadt benennen, with the Bundesland's bounds, and in Gewässer
  & Städte benennen, with the feature's (`landmarkBounds(id)`: a river's or lake's
  `pathGenerator.bounds`, a city's point as zero bounds), at round start and in feedback.
  `resetZoom` animates back to `k = 1` in 300 ms.
- **Touch halo (`.hit-target`):** for each Bundesland with `area_km2` below
  `SMALL_TARGET_MAX_AREA_KM2 = 1000` (Berlin, Bremen, Hamburg), a duplicate path of its
  own geometry with `fill: none; stroke: transparent; stroke-linejoin: round`. It is
  `pointer-events: none` by default. Under `@media (pointer: coarse), (max-width: 600px)`
  it takes `pointer-events: stroke` with a 20px non-scaling stroke, which reaches about
  10 screen px beyond the outline at every zoom. Its handlers resolve `data-id` to the
  real `.bundesland` path, so highlights, the wrong-guess flash and scoring land on the
  visible shape. A mouse on a wide screen never sees it.
- **Landmark layers (`.landmark-layer`):** `display: none` unless `data-mode` ends in
  `-landmark` and `data-phase` is `playing` or `feedback`; `pointer-events: none` always,
  since clicks and hover are resolved by distance in `main.js` (`nearestLandmark`, 12
  screen px). Pool and background features share every style.
  - **River (`<g class="landmark river" data-id>`):** a `.river-line` path, 1.5px
    `#3a78c2`, round joins and caps, over a `.river-casing` path (white, 7px) that only
    shows for the target
  - **Lake (`path.landmark.lake`):** fill `#a9cdee`, edge `#3a78c2` 0.75px
  - **City (`circle.landmark.city`):** `#444` dot of 3.5 screen px radius with a 1px white rim
  - **Hover (`.hovered`, Gewässer & Städte finden, mouse only):** faint orange: river
    line `#f6b45c` 2.5px, lake fill `#fbd7a6`, dot `#f6b45c`
  - **Wrong click (`.wrong-guess`):** the Bundesland flash colours, `#e05555` (river line
    3px; lake and dot edged `#a02020`), removed after 600 ms
  - **Target (`.target`, orange `#f28c00`):** river line 4px over its white casing,
    raised above the other rivers; lake filled (edge `#b86a00`); city dot 6 screen px.
    Shown in feedback in Gewässer & Städte finden, and from round start in Gewässer &
    Städte benennen
  - **Marker (`circle.marker`, `#marker-group`):** around a lake (its `d3.geoPath`
    centroid) or city target only: an orange ring, 2px stroke, no fill, 18 screen px
    radius
  - **Constant screen size:** strokes are non-scaling; the dot and marker radii are set
    in viewBox units by the zoom handler (`sizeLandmarks()`: screen px ÷ px per viewBox
    unit ÷ `k`). The handler runs on every frame of a zoom transition too, so the
    ring stays 18 px while the gentle zoom moves the map
- **Bundesländer in the landmark modes** (playing or feedback): quieter fill `#e6e6e2`,
  stroke `#9a9a94`, `pointer-events: none`, no hover; the touch halos are inert.
- **Touch interaction (Erkunden):** tapping a Bundesland highlights it and opens the info
  panel. Tapping another switches. Tapping the same one, or anything that is not a
  `.bundesland`/`.hit-target` (sea, letterbox, Kulisse), dismisses it.

---

## 2. Overlay Screens

Shared container (`.overlay-screen`): full-viewport fixed overlay, dark translucent
background (`rgba(20,40,60,0.72)`) with 4px backdrop blur, `z-index: 100`, flex-centred
content. Hidden by default and shown by the `data-screen` attribute on `<body>`
(`body[data-screen="select"] #screen-select { display: flex }`, likewise for `settings`
and `stats`).

### 2a. Menu (`#screen-select`)

- **Card (`.overlay-card`):** white (`rgba(255,255,255,0.97)`), 20px radius, 36px/40px
  padding, max-width 760px, heavy drop shadow
- **Title:** "Deutschland-Quiz", 1.6rem, bold 700, centred, 24px bottom margin
- **Mode cards grid (`.mode-cards`):** 2-column grid, 16px gap; six cards in three rows
- **Each mode card (`.mode-card`, `data-mode-choice`):** column flex, left-aligned,
  background `#f4f8fc`, 2px border `#dde6f0`, 12px radius, 20px padding. Hover: `#e6f0fa`
  background, `#4a90d9` border
  - **Icon (`.mode-icon`):** emoji, 1.8rem (🗺️ 🔍 ✏️ 🏛️ 🌊 🏞️)
  - **Name (`.mode-name`):** 1rem, bold 700: "Erkunden", "Bundesland finden",
    "Bundesland benennen", "Landeshauptstadt benennen", "Gewässer & Städte finden",
    "Gewässer & Städte benennen"
  - **Description (`.mode-desc`):** 0.82rem, `#666`
- **Footer (`.overlay-footer`):** 0.75rem, `#999`, centred: GitHub icon + "Quellcode auf
  GitHub" (link to `https://github.com/jan-scholz/geospiel`) · "© 2026 Krautlabs Inc."

**Mobile (≤600px):** one column of mode cards, card padding 24px/20px, title 1.3rem.

### 2b. Einstellungen (`#screen-settings`)

- **Card:** narrow variant (`.overlay-card--narrow`, max-width 420px)
- **Title (`#settings-title`):** the mode's name, e.g. "Bundesland finden"
- **Rows (`.settings-row`):** flex, space-between, 12px vertical padding, 1px `#eee` bottom border
  - **Type toggle rows (`.settings-row--type`):** "Flüsse", "Seen", "Städte",
    "Landeshauptstädte", above Runden; `display: none` unless
    `body[data-settings-mode$="-landmark"]`. Each is a `.toggle` around
    `input.chk-type[data-type]` (`river`, `lake`, `city`, `capital`)
  - **Label (`.settings-label`):** 0.95rem, bold 600, `#333`: "Runden", "Versuche pro
    Runde", "Automatisch weiter"
  - **Stepper (`.stepper`):** 12px gap. Buttons (`.stepper-btn`) 32×32px, 8px radius,
    `#f0f0f0`, hover `#ddd`. Value (`.stepper-val`) 1rem bold, min-width 28px. Runden
    1–16 (default 16), or in the landmark modes 1–the selected pool size (default 25);
    Versuche 1–10 (default 3)
  - **Toggle (`.toggle`):** 44×24px custom checkbox. Track `#ccc`, checked `#3a7bd5`.
    18px white knob slides 20px. 0.2s transitions
- **Actions (`.settings-actions`):** right-aligned, 12px gap, 24px top margin:
  "Zurück" (secondary), "Spiel starten" (primary)
- **Credits (`#settings-credits.settings-credits`):** below the actions, 16px top margin,
  0.68rem, `#aaa`, line-height 1.4. Holds the credits required by `SOURCES.md` §2, §3/§4
  and §7 ("Kartengrundlage: © EuroGeographics bezüglich der Verwaltungsgrenzen" /
  "Gewässer und Städte: © OpenStreetMap-Mitwirkende, ODbL", the link opening
  `https://www.openstreetmap.org/copyright` in a new tab / "Einwohner
  und Fläche: Statistisches Bundesamt (Destatis), Gemeindeverzeichnis, Stand 31.12.2024"),
  collapsed to the short note "Karten: © EuroGeographics, © OpenStreetMap, Einwohner und Fläche: Destatis …"; a click, tap or Enter shows the full wording (`aria-expanded`), and it collapses again each time the Einstellungen screen opens. It is a `<p role="button" tabindex="0">`; the short and full texts
  are two spans (`.credits-short`, `.credits-full`) toggled by CSS.

### 2c. Spiel beendet (`#screen-stats`)

- **Card:** narrow variant
- **Title:** "Spiel beendet"
- **Rows (`.stat-row`):** flex, space-between, 10px padding, 1px bottom border. Label
  `#555`, value bold 600: "Gespielte Runden", "Richtig", "Übersprungen"
- **Score row (`.stat-row--score`):** "Punktzahl", 1.2rem, bold 700, no border, 16px top padding
- **Average row (`.stat-row--avg`, `#stat-avg-row`):** "Durchschnitt der letzten {n}
  Runden" (or "… der letzten Runde"). Hidden when this mode has no stored history.
  Hovering the value shows a dark monospace tooltip (`.stat-avg-tooltip`, `#222` on
  `#eee`, 0.75rem) "Punktzahl in %: …"
- **"Zurück zum Menü":** primary, full width

---

## 3. Game Panel (`#game-panel`)

- **Position:** fixed, top 16px, horizontally centred, `width: calc(100% - 32px)`,
  max-width 860px, `z-index: 10`
- **Layout:** grid `auto 1fr auto`: Landeswappen | prompt | HUD. 16px gap, 12px/20px padding
- **Visibility:** `display: grid` when `data-phase` is `playing` or `feedback`, otherwise hidden
- **Landeswappen box (`#game-wappen-wrap.panel-wappen`):** `<img>` 56×56px,
  `object-fit: contain`, no background or border, so a portrait coat of arms is never
  cropped. Generic alt text "Landeswappen", because the name is the answer in Bundesland
  benennen. Hidden in Landeshauptstadt benennen
  (`body[data-mode="name-capital"] #game-wappen-wrap`), in the landmark modes
  (`body[data-mode$="-landmark"]`) and at ≤600px.
- **Prompt (`#game-prompt`):** the Bundesland's name, 1.1rem, bold 700. In Bundesland
  benennen it is `visibility: hidden` while `data-phase="playing"` and shown in feedback.
  It keeps its space, so the layout does not jump. In Gewässer & Städte finden it is the
  feature's name. In Gewässer & Städte benennen it is the question by type while playing
  ("Welcher Fluss ist markiert?", "Welcher See ist markiert?", "Welche Stadt ist
  markiert?") and the feature with its article in feedback ("der Rhein", "Mainz").
- **Type label (`#game-prompt-type`):** under the prompt, 0.8rem, `#888`: "Fluss", "See",
  "Stadt" or "Landeshauptstadt". Shown only in `find-landmark`.
- **HUD (`.game-hud`):** flex, 12px gap, nowrap. "Punkte: n", "Versuche: n" (`.hud-item`,
  0.9rem, `#444`, value in `<strong>`), "Überspringen" (secondary small, hidden during
  feedback: `body[data-phase="feedback"] #btn-skip`), "Beenden" (danger small)
- **Progress bar (`.game-progress`):** 3px, absolutely positioned on the panel's bottom
  edge inside its radius. Blue fill (`#4a90d9`), width animated over 0.3s. Width =
  completed rounds ÷ total, where a round counts as completed once it reaches feedback.

**Mobile (≤600px):** full width, `top: 0`, no transform, radius `0 0 16px 16px`, grid
`1fr auto` with the Landeswappen column hidden. The HUD wraps with an 8px gap,
right-aligned.

---

## 4. Bottom Panel Stack (`.bottom-panels`)

- **Position:** fixed, bottom 16px, horizontally centred, `width: calc(100% - 32px)`,
  max-width 860px, `z-index: 10`
- **Layout:** flex column, 8px gap, top to bottom: the feedback
  bar, then whichever content panel is showing. The container is `pointer-events: none`
  and its children are `auto`, so the gaps don't block the map.

### 4a. Feedback Bar (`#feedback-bar`)

- **Style:** `.panel` with a 12px radius. Flex row, space-between, 10px/20px padding, 12px gap
- **Text (`#feedback-text`):** 0.95rem, bold 600, `flex: 1; min-width: 0`
  - correct (`.feedback-bar--correct`): green `#1a7a3a`, "Richtig!"
  - wrong (`.feedback-bar--wrong`): red `#c03030`, "Keine Versuche mehr – es war {Antwort}"
- **"Weiter →" (`#btn-next`):** primary small. Hidden by
  `body[data-auto-advance="on"] #btn-next`
- **Visibility:** `display: flex` when `data-phase="feedback"`

### 4a′. Wrong-click line (`#click-feedback.click-feedback`)

- **Style:** `.panel` with a 12px radius, 10px/20px padding, text as `#input-feedback`
  (0.88rem, red `#c03030`, bold 600): "Falsch – das war {Artikel Name} · noch {n}
  Versuche"
- **Visibility:** `display: block` only when `data-mode="find-landmark"`,
  `data-phase="playing"` and it has text (`:not(:empty)`); emptied at each round start
- **Pointer events:** none, so a click on the map under it (it can sit over the
  Bodensee) still reaches the map

**Mobile (≤600px):** radius `16px 16px 0 0`, flush with the bottom edge.

### 4b. Info Panel (`#country-panel`)

- **Layout:** grid `auto 1fr 2fr`: Landeswappen | identity | facts. 12px/16px gap
- **Visibility:** in quiz modes, shown by CSS when `data-phase="feedback"`. In Erkunden,
  JS toggles the class `visible` on hover or tap
  (`body[data-mode="explore"] #country-panel.visible`).
- **Contents:**
  - **Landeswappen (`#info-wappen`):** 56×56px, `object-fit: contain`, same rule as the
    game panel. Alt text "Landeswappen {Name}"
  - **Identity:** name (`.panel-name`, 1.1rem, bold 700) and "Landeshauptstadt: {city}"
    (`.panel-capital`, 0.9rem, `#555`)
  - **Facts (`.panel-facts`):** 2-column sub-grid, 4px/16px gap. Each `.fact` is a flex
    row, 0.85rem. The label (`.fact-label`, grey, nowrap) gets its colon from `::after`,
    and the value (`.fact-value`) is bold, right-aligned and nowrap. Fields:
    "Fläche" (`{n} km²`), "Einwohner", "Höchster Punkt" (`{Name} ({n} m)`),
    "Nachbarländer" (count of adjacent Bundesländer)
- **Per kind (`data-kind`):** `bundesland` (above), or in the landmark modes
  `river`, `lake`, `city`. Each `.fact` lists the kinds it belongs to in `data-kinds`,
  and CSS hides the rest: river "Länge"; lake "Fläche" (one decimal), "Größte Tiefe",
  "Bundesland"; city "Einwohner", "Bundesland". The name line carries the article ("der
  Rhein"). "Landeshauptstadt: {city}" is Bundesland-only; a Landeshauptstadt shows
  "Landeshauptstadt von {Bundesland}" (`#info-capital-of`, hidden when empty) instead.
- **Wappen slot (`data-wappen`):** `shown`, or `none` for rivers and lakes in more than one
  Bundesland (the Bodensee): the slot is hidden and the grid becomes `1fr 2fr`.

**Mobile (≤600px):** the stack sits at `bottom: 0` with `left/right: 16px` and no
centring transform. The info panel is one centred column (Landeswappen centred, facts in
one column), with radius `16px 16px 0 0`.

### 4c. Text Input Panel (`#input-panel`)

- **Layout:** flex column, 8px gap
- **Visibility:** `display: flex` only when `data-phase="playing"` and `data-mode` is
  `name-bundesland`, `name-capital` or `name-landmark`
- **Contents:**
  - **Inline feedback (`#input-feedback`):** 0.88rem, min-height 1.2em, red `#c03030`,
    bold 600: "Falsch – noch {n} Versuche" / "Falsch – noch 1 Versuch"
  - **Input row (`.input-row`):** flex with `flex-wrap: wrap`, `justify-content:
    flex-end`, 10px gap. The field (`.guess-input`) is `flex: 1 1 17rem; min-width: 0`.
    That basis fits the longest placeholder, "Landeshauptstadt eingeben …", so on a
    narrow screen "Antworten" wraps onto its own line, right-aligned, instead of cutting
    off the placeholder or pushing the row out of the panel.
    - **Field:** 10px/14px padding, 8px radius, 1.5px `#ccc` border, white, 1rem. Focus
      border `#4a90d9`. Autocomplete, autocorrect and spellcheck off. Placeholder
      "Bundesland eingeben …", "Landeshauptstadt eingeben …" or "Name eingeben …"
    - **"Antworten" (`#btn-submit`):** primary. Enter in the field also submits

**Mobile (≤600px):** radius `16px 16px 0 0`, flush with the bottom edge.

---

## 5. Erkunden Beenden Button (`#btn-menu`)

- **Position:** fixed, top 16px, right 16px, `z-index: 10`
- **Style:** danger small, shadow `0 2px 8px rgba(0,0,0,0.15)`
- **Label:** "Beenden"
- **Visibility:** `body[data-mode="explore"][data-phase="idle"] #btn-menu`. It stays
  behind the menu overlay after returning to the menu.

---

## 6. Buttons (`.btn`)

| Variant | Background | Text | Hover |
|---|---|---|---|
| `.btn-primary` | Blue (`#4a90d9`) | White | Darker blue (`#2f72b8`) |
| `.btn-secondary` | Light grey-blue (`#e0e8f0`) | Dark (`#333`) | `#c8d8e8` |
| `.btn-danger` | Red (`#e05555`) | White | Darker red (`#c03030`) |

- **Base:** no border, 8px radius, 9px/18px padding, bold 600, 0.9rem, pointer cursor,
  0.15s background transition
- **Small (`.btn-sm`):** 0.82rem, 6px/12px padding
