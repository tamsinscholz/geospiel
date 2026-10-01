# 03 — Gewässer & Städte finden, with the landmark scaffolding

**What to build:** The first landmark mode, end to end, and with it every layer the
naming mode will reuse, as ticket 04 of the Bundesland quiz did for its modes.

Given a name and type ("Main" / "Fluss"), click the feature on the map. The map shows
every river, lake and city dot; the Bundesländer are quiet context. A click resolves to
the nearest drawn feature within 12 screen px. The right one scores. A wrong one flashes
red, costs a Versuch and says what was hit. A click near nothing costs nothing. The map
stays on the overview.

Being the first landmark slice, this ticket pays for:

- the **six-card menu**
- the **type toggles and landmark Runden** on Einstellungen
- **loading and rendering** the three landmark files (layers, base styles, constant-size
  dots, CSS-driven visibility only in the landmark modes while playing or in feedback)
- **projecting** the features into the resolver's record shapes and wiring
  `nearestLandmark` to click and mouse hover
- the **wrong-click line**
- the **orange target and marker** in feedback
- the **per-type info panel** with the Wappen rule
- the generalised **`zoomToBounds`**, which Landeshauptstadt benennen switches to with
  no change in its behaviour
- the history key and the docs

Reference: `.scratch/gewaesser-staedte/spec.md`, all of "Implementation Decisions" except
what is specific to `name-landmark`; "German UI strings"; "Info panel in feedback".
`docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` are updated for the new
mode, in their existing style.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The menu shows six cards in the spec's order, with labels, icons and descriptions per the spec; one column at ≤600px
- [ ] The Einstellungen screen for a landmark mode shows the four toggles (Landeshauptstädte off by default); they are absent for the Bundesland modes; the last toggle that is on can't be switched off
- [ ] Runden defaults to the selected pool size (25 by default), follows the maximum when the toggles change, and is remembered separately from the Bundesland modes' Runden
- [ ] Landmark layers are visible only in the landmark modes while playing or in feedback; never in Erkunden, the Bundesland modes or behind the menu
- [ ] Pool and background features look identical; lakes are drawn above rivers; dot sizes and strokes stay constant on screen at 1× and 6×
- [ ] The prompt shows the name and the type label; the game panel's Wappen is hidden
- [ ] Correct click → "Richtig!" and feedback; wrong click → red flash, Versuch lost, "Falsch – das war {article name} · noch {n} Versuch(e)"; out of Versuche → "Keine Versuche mehr – es war {article name}"
- [ ] A click on open land, sea or the Kulisse costs nothing; a pan-drag is never a guess
- [ ] Hover (mouse) tints the feature the resolver would pick; no tint on touch
- [ ] Feedback: target orange; ring around lakes and cities; info panel per type with the facts and Wappen rule from the spec; no zoom in feedback; round start returns to the overview only if zoomed in
- [ ] Landeshauptstadt benennen still zooms exactly as before, via `zoomToBounds`
- [ ] Score history under `geospiel-stats-find-landmark`
- [ ] The four existing modes are unchanged
- [ ] `docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` updated
- [ ] `make test` passes
- [ ] **Verified by driving the app, not by self-report**, at 1440×900 and 400×800 (touch). Report observed values for:
  - clicks on the Köln, Mainz and Dresden dots (city, not river)
  - a click inside the Bodensee (lake, not Rhein)
  - Ammersee and Starnberger See each hit at 1×
  - a click on open land (no Versuch)
  - a wrong-click message
  - a full game with only Seen enabled
  - the toggles and Runden clamping
  - the marker ring's radius in screen px
