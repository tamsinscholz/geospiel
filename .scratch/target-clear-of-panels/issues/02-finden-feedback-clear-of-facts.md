# 02 — Keep finden feedback targets clear of the facts box

**What to build:** In Gewässer & Städte finden and Bundesland finden, a target that
would sit under the facts box (or the top game panel) in feedback stays visible, with a
small pan at 1× and no zoom.

These modes stay on the overview by design, and in feedback the map doesn't move. On
the overview, though, the Bodensee and the southern edge of Bayern and Baden-Württemberg
sit in roughly the bottom tenth of the screen, which is where the facts box goes.

**Decision (maintainer, 2026-10-01):** option (a), a small pan at 1×, only when the
target is covered. This amends the Gewässer & Städte spec's "There is no zoom in
feedback" for `find-landmark`, and the matching overview rule for Bundesland finden. The
scale stays exactly as it is (1×, or whatever the user zoomed to); only a translation is
added. The rejected alternative, (b), was a shorter facts box in these modes.

The behaviour:

- In feedback, compare the target's projected bounds against the visible area (ticket
  01's measurement, for the feedback-phase bottom stack). If the target is clear, the
  map doesn't move.
- If the target is covered, pan by the smallest translation that brings its bounds,
  plus a small margin, into the visible area. Keep the current `k`. Animate gently
  (about 750 ms, like the other travels) within ticket 01's wider pan clamp.
- At the next round start, the existing rule returns to the overview: these modes reset
  to 1× only if the user zoomed in, and now also when this pan moved the map.
- A Bundesland bigger than the visible area (Bayern on a phone) is panned so as much of
  it as possible shows, with no zoom-out below 1×.

Reference: ticket 01; `.scratch/gewaesser-staedte/spec.md`, "Zoom".
`docs/game-flow.md` and `CLAUDE.md`'s description of the overview rule are updated.

**Blocked by:** 01 — it reuses the visible-area measurement and the wider pan clamp.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] In Gewässer & Städte finden feedback, the Bodensee, Chiemsee and Freiburg are clear of the facts box at 1440×900 and 400×800, reached by a pan only (`k` unchanged)
- [ ] A target already clear in feedback (Mainz, the Elbe) causes no movement at all
- [ ] In Bundesland finden feedback, Baden-Württemberg and Bayern are panned clear as far as their size allows; mid-Germany Bundesländer don't move
- [ ] If the user zoomed in before feedback, their `k` is kept and only the translation changes
- [ ] The next round starts on the overview, translation reset, after a feedback pan
- [ ] The marker ring stays 18 screen px through the pan
- [ ] Bundesland benennen, Landeshauptstadt benennen, Gewässer & Städte benennen and Erkunden are unchanged
- [ ] `make test` passes
- [ ] **Verified by driving the app** at 1440×900 and 400×800 (touch): report the transform before and after feedback for each listed target, and its bounding box against the panels
