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

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The Erkunden card opens Einstellungen titled "Erkunden", showing the four switches (all off) and the credits, with Runden, Versuche and Automatisch weiter hidden. "Erkunden starten" starts Erkunden, and Zurück returns to the menu
- [ ] With all switches off, Erkunden is unchanged from `main`: same drawing (screenshot-identical), same Bundesland hover and tap, no landmark elements shown
- [ ] Each switch on draws exactly its features: 18 rivers / 11 lakes / 8 cities / 16 capitals. Switching off again hides them. All four off is allowed
- [ ] Erkunden's switches are independent of the landmark quiz modes' switches in both directions, and each set is remembered while the page is open
- [ ] Mouse hover over a drawn landmark tints it and shows its info panel (river: Länge; lake: Fläche, Größte Tiefe, Bundesland, Wappen rule; city: Einwohner, Bundesland, "Landeshauptstadt von …" for capitals). Hover off it falls back to the Bundesland. Tap on touch selects the landmark, and a tap on sea dismisses
- [ ] Hidden layers are never hit: with Städte off, the Köln spot resolves to the Rhein if Flüsse is on, otherwise to Nordrhein-Westfalen
- [ ] Dots and the hover tint stay a constant screen size at 1× and 6×
- [ ] The five quiz modes are unchanged (their Einstellungen, their switches' "last one stays on" rule, their play)
- [ ] `make test` passes; any new pure logic (e.g. which features a set of switches draws) is in a pure module with tests
- [ ] **Verified by driving the app** at 1440×900 (mouse) and 400×800 (touch): report observed values for each criterion, with screenshots
