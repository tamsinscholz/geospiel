# 01 — Travel to targets within the visible map

**What to build:** In Gewässer & Städte benennen and Landeshauptstadt benennen, the gentle
travel to a target lands it in the part of the map the user can actually see, never
behind the floating panels.

Today the map fills the whole screen and the panels float over it. The travel centres
the target in the full viewBox, and the pan clamp stops 20 viewBox units past Germany's
edge. So a southern target such as the Bodensee can't rise above the bottom of the
screen and ends up under the input box while playing, and under the taller facts box in
feedback. Northern targets (Kiel, Rostock) are the mirror case under the top game panel.

The fix:

- Fit and centre the target in the **visible area**: the band between the top game panel
  and the bottom stack. Measure both in screen px and convert them to viewBox units.
- Use the bottom stack **as it will be in that phase**: the input box while playing, the
  feedback bar plus the facts box in feedback. Feedback already travels again, so it
  can fit for the taller stack. Measure after the phase's layout has applied, not
  before.
- Give the pan clamp extra room at the top and bottom, equal to the panels' height, so
  Germany's edges can move clear of the panels. This is also what a user dragging by
  hand gets: they can pan the south up from under the panels.
- Keep the 0.9 fit and the `TARGET_ZOOM_MAX` cap, now applied to the visible band rather
  than the full viewBox.
- The visible-area measurement and the wider clamp should be reusable, because ticket 02
  needs both.

Reference: `.scratch/gewaesser-staedte/spec.md`, "Zoom"; `CLAUDE.md`, "Projection and fit".
`docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` are updated where they
describe the travel and the pan clamp.

**Blocked by:** None — can start immediately.

**Status:** done

### Acceptance criteria

- [x] In Gewässer & Städte benennen, the on-screen bounding box of each of the Bodensee, Chiemsee, Ammersee, Freiburg, Kiel and Rostock overlaps no panel, both while playing and in feedback
- [x] In Landeshauptstadt benennen, Bayern and Baden-Württemberg (and Schleswig-Holstein at the top) are clear of the panels, both while playing and in feedback
- [x] Mid-Germany targets (Mainz, the Main, Hessen) still travel gently; the scale reached is unchanged or changes only by the narrower visible band, and the observed values are reported
- [x] The marker ring stays 18 screen px, during the travel and at rest
- [x] Manual pan and zoom still work at every `k`; the overview at 1× is unchanged until a target travel or a drag uses the new room
- [x] Bundesland finden, Bundesland benennen, Erkunden and Gewässer & Städte finden are unchanged (02 handles finden's feedback)
- [x] `make test` passes
- [x] **Verified by driving the app** at 1440×900 and 400×800 (touch). Report each listed target's bounding box against the panels' rectangles, in both phases

## Comments

- Implemented (uncommitted, for review) on branch `visible-travel`. New pure module
  `view-fit.mjs` (`screenToViewBox`, `intersectExtents`, `fitBounds`) with
  `test/view-fit.test.mjs`: `make test` 152 → 164. In `main.js`, `visibleArea()` returns
  the visible part of the viewBox in viewBox units. That is the screen below
  `#game-panel`'s bottom edge and above the topmost showing child of `.bottom-panels`,
  converted through the SVG's screen CTM (`(px - e) / a`) and intersected with the
  viewBox. In the `idle` phase (menu, Erkunden) it is the whole viewBox. It reads layout,
  so it is exact right after `setPhase`; no `requestAnimationFrame` is needed. A
  measurement taken immediately matched one taken two frames later in all 36 travels
  checked. `showFeedback` now travels after `setPhase('feedback')`. `zoomToBounds` fits
  with `fitBounds(bounds, visibleArea(), { fill: 0.9, minScale: 1, maxScale:
  TARGET_ZOOM_MAX })`.
- **Wider clamp, for 02:** `translateExtent` is still the viewBox. A custom
  `zoom.constrain()` runs d3's default clamp with `visibleArea()` as the viewport, so
  the extra room equals the panels' height in screen px at every `k`, not a fixed
  number of units. Drags, wheel and pinch use it, and `zoomToBounds` calls
  `zoom.constrain()` as before. Ticket 02 can call `visibleArea()` after
  `setPhase('feedback')` and get the same clamp for free.
- **Deviation:** a floor at `k = 1` (`minScale: MIN_ZOOM`) was added, so a travel never
  zooms out below the overview. It changes no observed value: the lowest observed `k`
  is the Rhein's 1.28. Panels lying in a letterbox outside the viewBox take nothing
  away. So on a 400×800 phone the input panel adds only about 23 units of room at the
  bottom, and none at the top.
- Verified with playwright at 1440×900 (mouse) and 400×800 (touch), against `main`:
  - **Clear of the panels:** every listed target is clear of every panel in both
    phases. Before the change, these overlapped:
    - the Bodensee, in both phases at 1440, and in feedback at 400
    - the Chiemsee, in feedback at 1440 and at 400
    - the Ammersee, in feedback at 400
    - Bayern and Baden-Württemberg, in both phases at 1440, and in feedback at 400
    - Schleswig-Holstein, in both phases at 1440 (it was under the game panel)
    - Hessen, in feedback at 400
  - **Scale, before → after:** Mainz, the Main and Hessen stay at 1.8 → 1.8 in both
    phases and at both sizes. Bayern goes from 1.715 to 1.715 while playing, and to
    1.655 in feedback at 1440 and 1.588 in feedback at 400. The Rhein goes from 1.629 to
    1.298 while playing and 1.28 in feedback at 1440, and to 1.593 / 1.583 at 400. The
    other rivers are unchanged.
  - **Marker ring:** 18 px in every frame of every travel and at rest.
  - **Overview at 1×:** the menu and the start of a Bundesland finden round are
    byte-identical PNGs to `main`, with seeded `Math.random`.
  - **Manual drag at 1× in Bundesland benennen:** at 1440, dragging pans the south up
    by 132.8 units (= 115 px, the input panel) and the north down by 110.9 units
    (= 96 px, the game panel). On `main` the map didn't move.
  - **Console:** no errors.

**Review (coordinating session, 2026-10-01).** Diff read; `make test` 164/164. Re-driven
against `main` in Gewässer & Städte benennen (Seen only), forcing feedback with three
wrong answers. Target's vertical extent against the panels:

| Viewport | Target | main playing | main feedback | branch playing | branch feedback |
|---|---|---|---|---|---|
| 1440×900 | Bodensee | covered | covered | clear (643–712, stack 785) | clear (618–686, stack 760) |
| 1440×900 | Chiemsee | clear | covered | clear | clear (573–594, stack 740) |
| 1440×700 | Bodensee | covered | covered | clear (474–528, stack 585) | clear (449–503, stack 560) |
| 1440×700 | Chiemsee | covered | covered | clear | clear |

1440×700 approximates the wide, short desktop window of the original report.
