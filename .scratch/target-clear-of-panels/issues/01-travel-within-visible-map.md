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

**Status:** ready-for-agent

### Acceptance criteria

- [ ] In Gewässer & Städte benennen, the on-screen bounding box of each of the Bodensee, Chiemsee, Ammersee, Freiburg, Kiel and Rostock overlaps no panel, both while playing and in feedback
- [ ] In Landeshauptstadt benennen, Bayern and Baden-Württemberg (and Schleswig-Holstein at the top) are clear of the panels, both while playing and in feedback
- [ ] Mid-Germany targets (Mainz, the Main, Hessen) still travel gently; the scale reached is unchanged or changes only by the narrower visible band, and the observed values are reported
- [ ] The marker ring stays 18 screen px, during the travel and at rest
- [ ] Manual pan and zoom still work at every `k`; the overview at 1× is unchanged until a target travel or a drag uses the new room
- [ ] Bundesland finden, Bundesland benennen, Erkunden and Gewässer & Städte finden are unchanged (02 handles finden's feedback)
- [ ] `make test` passes
- [ ] **Verified by driving the app** at 1440×900 and 400×800 (touch). Report each listed target's bounding box against the panels' rectangles, in both phases
