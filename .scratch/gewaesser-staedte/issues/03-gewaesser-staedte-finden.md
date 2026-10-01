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

**Status:** done

### Acceptance criteria

- [ ] The menu shows six cards in the spec's order, with labels, icons and descriptions per the spec; one column at ≤600px
- [x] The Einstellungen screen for a landmark mode shows the four toggles (Landeshauptstädte off by default); they are absent for the Bundesland modes; the last toggle that is on can't be switched off
- [x] Runden defaults to the selected pool size (25 by default), follows the maximum when the toggles change, and is remembered separately from the Bundesland modes' Runden
- [x] Landmark layers are visible only in the landmark modes while playing or in feedback; never in Erkunden, the Bundesland modes or behind the menu
- [x] Pool and background features look identical; lakes are drawn above rivers; dot sizes and strokes stay constant on screen at 1× and 6×
- [x] The prompt shows the name and the type label; the game panel's Wappen is hidden
- [x] Correct click → "Richtig!" and feedback; wrong click → red flash, Versuch lost, "Falsch – das war {article name} · noch {n} Versuch(e)"; out of Versuche → "Keine Versuche mehr – es war {article name}"
- [x] A click on open land, sea or the Kulisse costs nothing; a pan-drag is never a guess
- [x] Hover (mouse) tints the feature the resolver would pick; no tint on touch
- [x] Feedback: target orange; ring around lakes and cities; info panel per type with the facts and Wappen rule from the spec; no zoom in feedback; round start returns to the overview only if zoomed in
- [x] Landeshauptstadt benennen still zooms exactly as before, via `zoomToBounds`
- [x] Score history under `geospiel-stats-find-landmark`
- [x] The four existing modes are unchanged
- [x] `docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` updated
- [x] `make test` passes
- [x] **Verified by driving the app, not by self-report**, at 1440×900 and 400×800 (touch). Report observed values for:
  - clicks on the Köln, Mainz and Dresden dots (city, not river)
  - a click inside the Bodensee (lake, not Rhein)
  - Ammersee and Starnberger See each hit at 1×
  - a click on open land (no Versuch)
  - a wrong-click message
  - a full game with only Seen enabled
  - the toggles and Runden clamping
  - the marker ring's radius in screen px

## Comments

- Implemented (uncommitted, for review) on branch `find-landmark`. The `name-landmark`
  card is in the markup but `hidden` (`.mode-card[hidden]`) until ticket 04, so five
  cards show; its label, the shared Einstellungen, the layers, `highlightLandmark()` and
  the marker already cover both modes. New pure helpers in `game-core.mjs`
  (`landmarkType`, `landmarkPool`, `followRounds`) with tests: `make test` 146 → 152.
  Visibility: `[data-mode$="-landmark"]` + `data-phase` for the layers, Wappen and quiet
  Bundesländer; `data-settings-mode` for the toggles; `#country-panel[data-kind]`/
  `[data-wappen]` for the info rows. The landmark layers take no pointer events; the
  SVG's click/`pointermove` resolve through `nearestLandmark` with `d3.pointer` on
  `#map-group`. Dot and marker radii are set by the zoom handler (`sizeLandmarks()`),
  px ÷ the SVG CTM's px-per-unit ÷ `k`; a window resize mid-round is picked up at the
  next zoom event or round start (no resize handler). Deviation: the wrong-click line is
  `pointer-events: none`. At 1440×900 it sits over the Bodensee, and otherwise it would
  swallow clicks there.
- Driven in headless Chrome at 1440×900 (mouse) and 400×800 (touch), 0 console errors:
  the Köln/Mainz/Dresden dots → the city; inside the Bodensee → "der Bodensee"; Ammersee
  and Starnberger See each resolved at 1× (17.2 px / 10.3 px apart); open land and sea
  cost no Versuch; "Falsch – das war Köln · noch 3 Versuche"; Seen only → Runden 7, a
  full game 7/7, 100 %, stored under `geospiel-stats-find-landmark`; toggles 25 →
  (+Landeshauptstädte) 41 → Runden 20 → (−Flüsse) 20 → (−Städte) 20 →
  (−Landeshauptstädte) 7 → Seen-off ignored → (+Flüsse) 17; marker ring 18.00 px at 1×
  and 6×; dots 3.50 px at 1× and 6×; target dot 6.00 px. The Landeshauptstadt benennen
  transforms at round start and in feedback match `main` for all 16 targets (seeded
  shuffle) at both sizes.

**Review (coordinating session, 2026-10-01).** Diff read; `make test` 152/152. Re-driven
in headless Chrome, 1440×900 mouse and 400×800 touch: Köln/Mainz/Dresden dot taps →
"Falsch – das war Köln/Mainz/Dresden · …" (city, not river); Bodensee interior →
"der Bodensee"; Ammersee and Starnberger See each resolved at 1×; open land (hover tint
count 0) → Versuche 3→3, no line; toggles 25 → +LHS 41 → −Städte 33 → −LHS 17 → −Flüsse 7
→ −Seen ignored (7) → +Flüsse 17 → +Städte 25; dots 3.50 px, ring 18.00 px at 1× and 6×;
feedback stays at `scale(1)`, next round resets from 6× to the overview; lake panel shows
only Fläche/Größte Tiefe/Bundesland + Wappen. No console errors.

The "six cards" criterion is left open: the `name-landmark` card is in the markup but
`hidden` until its gameplay exists. Ticket 04 un-hides it.
