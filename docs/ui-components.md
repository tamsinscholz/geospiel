# UI Components

Visual inventory of every major UI element: appearance, positioning, and mobile
adaptations. Values are taken from `style.css`, `index.html` and `main.js`. All labels
are German.

---

## Global Styling

- **Background:** light blue-grey (`#e8f4f8`). This is also the sea, since there is no water geometry.
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
  the zoom-to-target centring, is in viewBox units.
- **Layers** (inside one zoomed `<g id="map-group">`, bottom to top):
  1. `#kulisse-group`: **Kulisse**, one `.kulisse` path per neighbouring country
     (`data/kulisse.topo.json`). Muted fill `#e3e3de`, stroke `#cfcfc8` 0.5px,
     `pointer-events: none` in every mode, so it never highlights, never counts as a
     guess and never blocks a click on a Bundesland near the border.
  2. `#bundesland-group`: one `.bundesland` path per Bundesland, `data-id` = ISO 3166-2
     key (`DE-BY`)
  3. `#hit-group`: `.hit-target` touch halos (see below)
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
- **Pan clamp:** `translateExtent` is the viewBox rectangle itself, so at `k = 1` there is
  nothing to pan and at higher `k` the view stays inside Germany plus the 20-unit
  margin. Programmatic zooms go through `zoom.constrain()` with the same extent.
- **Gentle zoom (`zoomToBundesland`):** 750 ms transition to fit the target at 0.9 of the
  viewBox, capped at `TARGET_ZOOM_MAX = 1.8`. Used only in Landeshauptstadt benennen.
  `resetZoom` animates back to `k = 1` in 300 ms.
- **Touch halo (`.hit-target`):** for each Bundesland with `area_km2` below
  `SMALL_TARGET_MAX_AREA_KM2 = 1000` (Berlin, Bremen, Hamburg), a duplicate path of its
  own geometry with `fill: none; stroke: transparent; stroke-linejoin: round`. It is
  `pointer-events: none` by default. Under `@media (pointer: coarse), (max-width: 600px)`
  it takes `pointer-events: stroke` with a 20px non-scaling stroke, which reaches about
  10 screen px beyond the outline at every zoom. Its handlers resolve `data-id` to the
  real `.bundesland` path, so highlights, the wrong-guess flash and scoring land on the
  visible shape. A mouse on a wide screen never sees it.
- **Touch interaction (Erkunden):** tapping a Bundesland highlights it and opens the info
  panel. Tapping another switches. Tapping the same one, or anything that is not a
  `.bundesland`/`.hit-target` (sea, letterbox, Kulisse), dismisses it.

### Data credits: the (i) button (`#credits`, `#btn-credits`, `#credits-popover`)

See section 4d. The credits live in the bottom panel stack, not on the map.

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
- **Mode cards grid (`.mode-cards`):** 2×2 grid, 16px gap
- **Each mode card (`.mode-card`, `data-mode-choice`):** column flex, left-aligned,
  background `#f4f8fc`, 2px border `#dde6f0`, 12px radius, 20px padding. Hover: `#e6f0fa`
  background, `#4a90d9` border
  - **Icon (`.mode-icon`):** emoji, 1.8rem (🗺️ 🔍 ✏️ 🏛️)
  - **Name (`.mode-name`):** 1rem, bold 700: "Erkunden", "Bundesland finden",
    "Bundesland benennen", "Landeshauptstadt benennen"
  - **Description (`.mode-desc`):** 0.82rem, `#666`
- **Footer (`.overlay-footer`):** 0.75rem, `#999`, centred: GitHub icon + "Quellcode auf
  GitHub" (link to `https://github.com/jan-scholz/geospiel`) · "© 2026 Krautlabs Inc."

**Mobile (≤600px):** one column of mode cards, card padding 24px/20px, title 1.3rem.

### 2b. Einstellungen (`#screen-settings`)

- **Card:** narrow variant (`.overlay-card--narrow`, max-width 420px)
- **Title (`#settings-title`):** the mode's name, e.g. "Bundesland finden"
- **Rows (`.settings-row`):** flex, space-between, 12px vertical padding, 1px `#eee` bottom border
  - **Label (`.settings-label`):** 0.95rem, bold 600, `#333`: "Runden", "Versuche pro
    Runde", "Automatisch weiter"
  - **Stepper (`.stepper`):** 12px gap. Buttons (`.stepper-btn`) 32×32px, 8px radius,
    `#f0f0f0`, hover `#ddd`. Value (`.stepper-val`) 1rem bold, min-width 28px. Runden
    1–16 (default 16), Versuche 1–10 (default 3)
  - **Toggle (`.toggle`):** 44×24px custom checkbox. Track `#ccc`, checked `#3a7bd5`.
    18px white knob slides 20px. 0.2s transitions
- **Actions (`.settings-actions`):** right-aligned, 12px gap, 24px top margin:
  "Zurück" (secondary), "Spiel starten" (primary)

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
  (`body[data-mode="name-capital"] #game-wappen-wrap`) and at ≤600px.
- **Prompt (`#game-prompt`):** the Bundesland's name, 1.1rem, bold 700. In Bundesland
  benennen it is `visibility: hidden` while `data-phase="playing"` and shown in feedback.
  It keeps its space, so the layout does not jump.
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
- **Layout:** flex column, 8px gap, top to bottom: the (i) credits button, the feedback
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

**Mobile (≤600px):** the stack sits at `bottom: 0` with `left/right: 16px` and no
centring transform. The info panel is one centred column (Landeswappen centred, facts in
one column), with radius `16px 16px 0 0`.

### 4c. Text Input Panel (`#input-panel`)

- **Layout:** flex column, 8px gap
- **Visibility:** `display: flex` only when `data-phase="playing"` and `data-mode` is
  `name-bundesland` or `name-capital`
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
      "Bundesland eingeben …" or "Landeshauptstadt eingeben …"
    - **"Antworten" (`#btn-submit`):** primary. Enter in the field also submits

**Mobile (≤600px):** radius `16px 16px 0 0`, flush with the bottom edge.

### 4d. Data credits: the (i) button (`#credits`)

- **Wrapper (`.credits`):** the first item in the stack, `align-self: flex-start`, so it
  is only as big as the button. It sits at the stack's left edge, just above whichever
  bottom panel is open, or at the stack's bottom edge when none is, so it never overlaps
  a panel. It has an 8px bottom margin at ≤600px, where the stack is flush with the
  screen edge. Measured positions (top-left of the button):

  | Viewport | No bottom panel | Input panel | Feedback + info panel |
  |---|---|---|---|
  | 1440×900 | 290, 860 (Erkunden: 764) | 290, 753 | 290, 708 |
  | 1000×800 | 70, 760 | 70, 653 | 70, 608 |
  | 400×800 | 16, 768 | 16, 616 | 16, 476 |
  | 320×640 | 16, 608 | 16, 456 | 16, 316 |

  The menu, Einstellungen and Spiel beendet overlays (`z-index: 100`) cover it, together
  with the map.
- **Button (`#btn-credits.credits-btn`):** a real `<button>`, `aria-label="Quellenangaben"`,
  `aria-expanded`, `aria-controls="credits-popover"`. A 24px circle with a serif italic
  "i", `#6b7684` on translucent white, 1px `#b8c2cc` border and a faint shadow. A
  `::before` with `inset: -5px` gives a 34px hit area.
- **Popover (`#credits-popover.credits-popover`):** absolutely positioned above the
  button (`bottom: calc(100% + 6px)`), `max-width: min(300px, 100vw - 32px)`, white card,
  0.7rem `#555`. It is always `pointer-events: none`, so it never intercepts the map.
  Holds the two credits required by `SOURCES.md` §2 and §7:
  - "Kartengrundlage: © EuroGeographics bezüglich der Verwaltungsgrenzen"
  - "Einwohner und Fläche: Statistisches Bundesamt (Destatis), Gemeindeverzeichnis, Stand 31.12.2024"
- **Visibility (CSS):** shown by `.credits-btn:focus-visible + .credits-popover`,
  `.credits-btn[aria-expanded="true"] + .credits-popover`, and `:hover` only inside
  `@media (hover: hover)`, so a touch tap can't leave a sticky hover open.
- **JS:** a click toggles `aria-expanded`, and a `pointerdown` anywhere outside the
  button sets it to `false`. The button's own `pointerdown` is `preventDefault`ed, which
  suppresses the tap's compatibility mousedown/mouseup. In Erkunden a tap's `mouseleave`
  closes the info panel and the button drops down mid-tap; without this the click would
  land on the map. The button is outside the SVG, so its clicks never reach the map's
  handlers. As with any tap or pointer move off a Bundesland, reaching the button in
  Erkunden closes the hover or tap info panel.

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
