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

**Status:** done

### Acceptance criteria

- [x] In Gewässer & Städte finden feedback, the Bodensee, Chiemsee and Freiburg are clear of the facts box at 1440×900 and 400×800, reached by a pan only (`k` unchanged)
- [x] A target already clear in feedback (Mainz, the Elbe) causes no movement at all
- [x] In Bundesland finden feedback, Baden-Württemberg and Bayern are panned clear as far as their size allows; mid-Germany Bundesländer don't move
- [x] If the user zoomed in before feedback, their `k` is kept and only the translation changes
- [x] The next round starts on the overview, translation reset, after a feedback pan
- [x] The marker ring stays 18 screen px through the pan
- [x] Bundesland benennen, Landeshauptstadt benennen, Gewässer & Städte benennen and Erkunden are unchanged
- [x] `make test` passes
- [x] **Verified by driving the app** at 1440×900 and 400×800 (touch): report the transform before and after feedback for each listed target, and its bounding box against the panels

## Comments

- Implemented (uncommitted, for review) on branch `finden-feedback-pan`. New pure
  `panIntoView(bounds, area, transform, margin)` in `view-fit.mjs`, with 9 tests in
  `test/view-fit.test.mjs`: `make test` 164 → 173. It works per axis. Bounds already
  inside the area don't move, and the same transform object comes back when neither
  axis moves. Bounds that fit move just far enough to come inside. Bounds larger than
  the area move just far enough to cover it, so the edge that was in view meets the
  area's edge, which shows as much of them as possible. `k` is never touched. In
  `main.js`, `panToBounds(bounds)` runs in `showFeedback` after `setPhase('feedback')`
  for `find` and `find-landmark`. It uses `visibleArea()` and a margin of
  `FEEDBACK_PAN_MARGIN_PX = 24` (past the 18 px marker ring), constrains through
  `zoom.constrain()`, and starts a 750 ms transition only if the result differs from the
  current transform. The round-start `resetZoom()` already goes to the identity every
  round in these modes, so a feedback pan (k = 1, translated) is undone with no change;
  only the comments and docs needed to say so.
- Verified with playwright (seeded `Math.random`, correct click), branch against `main`.
  Values are the `#map-group` transform after feedback; before was `translate(0,0)
  scale(1)` in every row. The target's y-range is compared with the top of the feedback
  bar.
  - **1440×900:**
    - Bodensee: y −142.3, 698–736 vs 760 (on main 821–859, covered)
    - Chiemsee: y −118.8, 704–716 vs 740 (ring 692–728)
    - Freiburg: y −95.4, ring 698–734 vs 740
    - Baden-Württemberg: y −157.3, 466–716 vs 740
    - Bayern: y −184.9, 357–723 vs 740
    - Mainz, Elbe, Hessen: no transition started, transform unchanged
  - **1440×700:**
    - Bodensee: y −196.4, 506–536 vs 560
    - Chiemsee: y −179.5
    - Freiburg: y −156.2
    - Baden-Württemberg: y −218.0, 322–516 vs 540
    - Bayern: y −237.7, 242–526 vs 540
    - Mainz, Elbe, Hessen: no movement
  - **400×800 (touch):**
    - Bodensee: y −86.8, 576–599 vs 623
    - Chiemsee: y −172.1
    - Freiburg: y −109.9
    - Baden-Württemberg: y −286.2, 343–492 vs 516
    - Bayern: y −295.0, 288–506 vs 516. It fits the band at 1× here, so it isn't the
      oversize case.
    - Mainz, Elbe: no movement
    - **Hessen moves −46.9.** On `main` it overlaps the feedback bar by 0.2 px
      (367.7–516.2 vs 516), so it counts as covered on a phone.
  - **User zoomed in** (wheel to k = 2.297 at 1440):
    - Bodensee: y −648.7 → −1404.4 at 1440×900, x and k unchanged, 648–736 vs 760.
    - Bayern (the oversize case): x −648.7 → −732.2, y −648.7 → −1208.8, k unchanged.
      Its top lands at 120 = game panel 96 + 24, and it necessarily still runs under the
      bottom panels.
  - **Next round** after every pan: `translate(0,0) scale(1)`.
  - **Marker ring:** 18–18 px in every frame.
  - **Other modes:** Bundesland benennen, Landeshauptstadt benennen and Gewässer &
    Städte benennen (5 feedback rounds each, at all three sizes) and Erkunden taps print
    byte-identical transform logs to `main`.
  - **Console:** no errors.

**Review (coordinating session, 2026-10-01).** One fix before merge: the pan was triggered
against the area shrunk by the 24 px margin, so a target that was visible but within 24 px
of a panel still moved, contrary to "only when the target is covered". `panToBounds` now
tests the unshrunk visible area first, and uses the margin only for where a covered target
lands. `make test` 173/173.

Re-driven after the fix (feedback reached by correct clicks/taps):
- 1440×700 Gewässer & Städte finden (Seen + Städte): Bodensee −196.4, Chiemsee −179.5,
  Starnberger See −182.3, Ammersee −167.8, Freiburg −156.1, all clear; the other ten
  targets (Frankfurt, Köln, Rostock, Müritz, …) didn't move.
- 1440×700 Bundesland finden: Bayern −237.7, Baden-Württemberg −218.0, and
  Mecklenburg-Vorpommern +112.7 (under the game panel), all clear; Hessen and Saarland
  (bottom 523 vs stack 540) no longer move.
- 400×800 touch, Bundesland finden: Hessen −46.9, Saarland −78.9 and Rheinland-Pfalz −101.0
  move, because on a phone they are covered by the facts box; the others don't move.
- Every next round started at `translate(0,0) scale(1)`. No console errors.

The criterion "mid-Germany Bundesländer don't move" holds on desktop. On a phone, Hessen
really is covered, and it moves by the rule the maintainer chose.
