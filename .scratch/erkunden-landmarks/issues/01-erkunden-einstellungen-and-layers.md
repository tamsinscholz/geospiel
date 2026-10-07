# 01 — Erkunden Einstellungen, with switchable Gewässer & Städte layers

**What to build:** Erkunden gets an Einstellungen screen like the quiz modes. On it, four
switches (**Flüsse, Seen, Städte, Landeshauptstädte**) choose which landmark layers are
drawn on the Erkunden map. Hovering a drawn landmark with the mouse, or tapping it, shows
its facts in the info panel, as the Bundesländer do today.

This is the "Landmark layers in Erkunden … and the Erkunden credit" that the Gewässer &
Städte spec left out of scope. Licensing is in
[ADR 0002](../../../docs/adr/0002-osm-data-odbl-separate-files.md), decision 4 and its
2026-10-06 amendment: Erkunden's Einstellungen carries the OpenStreetMap credit, so the
layers may be drawn.

Decided with the maintainer on 2026-10-06:

- **Flow:** the Erkunden menu card opens Einstellungen first, as the quiz cards do.
  - The screen shows the title "Erkunden", the four switches and the credits (collapsed,
    as everywhere).
  - Runden, Versuche pro Runde and Automatisch weiter are hidden. That is CSS, driven by
    the existing `data-settings-mode` attribute on `<body>`.
  - The start button reads "Erkunden starten"; Zurück returns to the menu.
- **What the switches mean in Erkunden:** they choose what is drawn, not what is asked.
  - Flüsse: all 18 rivers, pool and background.
  - Seen: all 11 lakes.
  - Städte: the 8 cities without `capital_of`.
  - Landeshauptstädte: the 16 with it.
- **Defaults:** all four switches are **off**, so Erkunden looks exactly as it does today
  until one is switched on.
- **All off is allowed** in Erkunden. The quiz modes keep "the last switch that is on
  can't be switched off".
- **Separate state:** Erkunden's switches are its own, remembered while the page is open.
  They neither read nor change the landmark quiz modes' shared switches.
- **The Bundesländer** keep Erkunden's normal look, hover and tap. They don't take the
  quieter, inert style of the landmark quiz modes.
- **Hover and tap:** the landmark resolver (`nearestLandmark`, 12 px radius, ties city,
  then lake, then river) runs over the **drawn** landmarks only.
  - A hit wins over the Bundesland underneath: the landmark gets the faint orange hover
    tint, and the info panel shows its facts exactly as in quiz feedback (rows by type,
    Wappen rule, `de-DE` numbers).
  - No hit: the Bundesland behaves as today.
  - Mouse hover follows the pointer, as the Bundesland hover does. A tap selects, and a
    tap on open sea or the Kulisse dismisses, as today.
- **Layer visibility stays in CSS:** the landmark groups and the type within them show
  in Erkunden according to body data attributes, e.g. one attribute per switched-on type.
  No per-element show/hide from JS.
- **No map motion:** Erkunden doesn't zoom or pan by itself (ADR 0003). The constant
  screen size of dots and strokes works at every zoom, as in the quiz modes.

Reference: `.scratch/gewaesser-staedte/spec.md`, "Einstellungen", "Rendering",
"Hit-testing" and "Info panel in feedback"; ADRs 0002 and 0003. `docs/game-flow.md`,
`docs/ui-components.md` and `CLAUDE.md` are updated.

**Blocked by:** None — can start immediately.

**Status:** done

### Acceptance criteria

- [x] The Erkunden card opens Einstellungen titled "Erkunden", showing the four switches (all off) and the credits, with Runden, Versuche and Automatisch weiter hidden. "Erkunden starten" starts Erkunden, and Zurück returns to the menu
- [x] With all switches off, Erkunden is unchanged from `main`: same drawing (screenshot-identical), same Bundesland hover and tap, no landmark elements shown
- [x] Each switch on draws exactly its features: 18 rivers / 11 lakes / 8 cities / 16 capitals. Switching off again hides them. All four off is allowed
- [x] Erkunden's switches are independent of the landmark quiz modes' switches in both directions, and each set is remembered while the page is open
- [x] Mouse hover over a drawn landmark tints it and shows its info panel (river: Länge; lake: Fläche, Größte Tiefe, Bundesland, Wappen rule; city: Einwohner, Bundesland, "Landeshauptstadt von …" for capitals). Hover off it falls back to the Bundesland. Tap on touch selects the landmark, and a tap on sea dismisses
- [x] Hidden layers are never hit: with Städte off, the Köln spot resolves to the Rhein if Flüsse is on, otherwise to Nordrhein-Westfalen
- [x] Dots and the hover tint stay a constant screen size at 1× and 6×
- [x] The five quiz modes are unchanged (their Einstellungen, their switches' "last one stays on" rule, their play)
- [x] `make test` passes; any new pure logic (e.g. which features a set of switches draws) is in a pure module with tests
- [x] **Verified by driving the app** at 1440×900 (mouse) and 400×800 (touch): report observed values for each criterion, with screenshots

## Comments

- Implemented (uncommitted, for review) on branch `erkunden-layers`. The Erkunden card
  now calls `openSettings('explore')`: title "Erkunden" (`MODE_LABELS`), start button
  text "Erkunden starten" (set in `openSettings`), and the Runden, Versuche and
  Automatisch weiter rows carry `.settings-row--quiz`, hidden by
  `body[data-settings-mode="explore"]`. The four `.chk-type` inputs are reused:
  `openSettings` loads `gameState.exploreTypes` (all off) or `gameState.landmarkTypes`
  into them, and `startExplore()`/`startGame()` save back to their own set. The toggle
  click handler returns early in Erkunden, so the last-one-on rule and the Runden
  follow-up apply to the landmark modes only.
- Drawing: every landmark element has `data-type` (landmarkType(): `river`, `lake`,
  `city`, `capital`). `startExplore()` writes the switched-on types to
  `body[data-explore-layers]` (space-separated), and CSS shows `.landmark-layer` in
  `body[data-mode="explore"]:not([data-screen])`, and within it only
  `.landmark[data-type]` listed via `~=`. Nothing shows behind the menu or the
  Einstellungen overlay.
- New pure helper `drawnLandmarkIds(landmarks, types)` in `game-core.mjs`, with 3 tests:
  every feature whose type is switched on, pool and background. `startExplore()` filters
  `landmarkRecords` with it into `exploreRecords`, which is all the Erkunden resolver
  sees (`landmarkAt(event, records)`).
- Hover and tap: in Erkunden a mouse `pointermove` on the map resolves
  `exploreRecords` first. A hit tints the landmark (`.hovered`), clears the Bundesland
  highlight and fills the panel with `fillLandmarkInfo`. While a landmark is hovered,
  the Bundesland `mouseenter`/`mouseleave` handlers stand back. Moving off the
  landmark falls back to the `.bundesland`/`.hit-target` under the pointer, or hides
  the panel. A mouse leaving the map takes a hovered landmark's panel with it. A touch
  `pointerleave`, which fires on every lift, is ignored, so a tapped landmark stays
  selected. Clicks and taps: `onBundeslandClick` stands back when a drawn landmark is
  within reach, and the map's click handler selects it (`handleExploreLandmarkClick`,
  same first-tap-selects / same-again-dismisses as Bundesländer via `lastTappedId`).
  Sea, Kulisse and letterbox still dismiss (`dismissExplore`, which also clears the
  tint). With all switches off `exploreRecords` is empty and none of this runs.
- Verified in headless Chrome against `main` (1440×900 mouse, 400×800 touch, 0 console
  errors):
  - Einstellungen: Erkunden shows Flüsse, Seen, Städte and Landeshauptstädte, all off,
    with the credits collapsed and "Erkunden starten". Zurück returns to the menu.
    Gewässer & Städte finden shows the four toggles (r, l, c on) plus Runden, Versuche
    and Automatisch weiter. Bundesland finden shows only the three.
  - All off: same screenshot md5 as `main`'s Erkunden at both sizes, and the same
    screenshot when hovering or tapping the Köln spot (NRW in both).
  - Drawn per switch: 18 rivers, 11 lakes, 8 cities and 16 capitals; all on 18/11/8/16.
    Switching off again shows 0, and 0 on the menu.
  - Independence: Erkunden {Flüsse, Städte} left the quiz set at r/l/c on. A quiz
    started with {Seen, Landeshauptstädte} left Erkunden at {Flüsse, Städte}. Both are
    remembered.
  - Hover (mouse):
    - Köln dot with Städte on: Köln, "Einwohner 1.024.621", "Bundesland
      Nordrhein-Westfalen", NW Wappen, dot tinted. With Städte off and Flüsse on: der
      Rhein, "Länge 1.233 km", no Wappen. With all off, or only Seen and
      Landeshauptstädte: Nordrhein-Westfalen.
    - 40 px off Köln: Rheinland-Pfalz.
    - München: "Landeshauptstadt von Bayern".
    - Chiemsee: 79,9 km², 73 m, Bayern, BY Wappen.
    - Bodensee: "Baden-Württemberg, Bayern", no Wappen.
  - Touch: tapping Köln (Städte + Flüsse) selects Köln with the tint, and a sea tap
    dismisses. Tapping Köln twice dismisses. A tap in Bremen with Flüsse on gives die
    Weser (it is drawn and in reach). Tapping the Main gives "Länge 527 km".
  - Dot size: Köln's dot measures 7.00 px at 1× and at 6×. At 6× it is still hit 10 px
    beyond its edge, but not at 14 px.
  - Quiz modes: one round of each of the five was correct at both sizes, matching
    `main`. The last-toggle rule still holds in Gewässer & Städte benennen (clicking all
    four leaves Städte on).
- Note (also in `main`): at 1440×900 the Bodensee sits under the bottom info panel. A
  hover that crosses southern Baden-Württemberg on the way there opens a panel that then
  covers the lake. That is the same overlap a Bundesland hover there already has in
  `main`. Reaching the lake directly shows its panel.

**Review (coordinating session, 2026-10-06).** Diff read; `make test` 194/194. Extra check
the agent didn't run, at 1440×900: a Gewässer & Städte benennen game left in feedback
(Mannheim targeted, marker ring drawn), then Beenden → menu → Erkunden with all four
switches on. No `.target`, no marker, no enlarged dot carried over; 18 rivers and 24 city
dots drawn. Hovering Köln showed "Köln · Einwohner 1.024.621 · Nordrhein-Westfalen" with
the tint. No console errors.
