# 03 — One map-motion policy per mode; travel once per round

**What to build:** In Landeshauptstadt benennen and Gewässer & Städte benennen the map
travels to the target **once**, at round start. It no longer moves again when the
feedback bar and facts box appear. The motion of every quiz mode is declared in one
per-mode table, which is also the configuration option for the feedback pan.

Today these two modes run the full gentle travel twice. The first fits the target above
the input box. The second re-fits it above the taller feedback stack, so the map moves
again in feedback even when nothing was covered. The decision and its reasoning are
[ADR 0003](../../../docs/adr/0003-map-motion-policy-per-mode.md).

- **Policy table:** a per-mode table of `{ roundStart, feedback }` with the policies
  `overview`, `fit`, `reveal` and `none`, carried out by a single function. The table
  replaces the mode `if` chains in round start and feedback. Its values are those in
  ADR 0003, "The table on 2026-10-05".
- **`fit` aims at the feedback band.** It fits into the visible area as it will be in
  feedback: above the feedback bar plus the facts box, below the game panel.
  - The feedback stack isn't laid out while playing, so remember its height in screen px
    each time feedback is measured, and invalidate it when the window size changes.
  - Before the first measurement, fall back to the playing band (today's behaviour).
  - Keep the 0.9 fit, the 1× floor and the `TARGET_ZOOM_MAX` cap.
- **`reveal` in feedback for the travelling modes:** the existing feedback pan (pan only,
  keep `k`, only when covered, 24 px landing margin). It is usually a no-op, and it
  catches the first round and the small height differences between a river's, a lake's
  and a city's facts box.
- **Unchanged:**
  - the finden modes' behaviour (`overview`, then `reveal`)
  - Bundesland benennen (`overview`, then `none`)
  - Erkunden
  - the pan clamp and `visibleArea()`

Reference: ADR 0003; tickets 01 and 02 in this directory and their Comments.
`CLAUDE.md` and `docs/game-flow.md` describe the policy table in place of the per-mode
prose.

**Blocked by:** 01, 02 (both done).

**Status:** ready-for-agent

### Acceptance criteria

- [ ] One per-mode table declares round-start and feedback motion, with the values in ADR 0003; no mode `if` chain remains for map motion in round start or feedback
- [ ] Landeshauptstadt benennen and Gewässer & Städte benennen, from the second round of a game on: **no transition at all in feedback** (the transform is identical before and after entering feedback) for every target in a full game, at 1440×900, 1440×700 and 400×800 (touch)
- [ ] First round of a game: at most a pan in feedback (`k` unchanged), and only when the target is covered
- [ ] In feedback, targets are clear of the panels: Bodensee, Chiemsee, Freiburg, Kiel and Rostock in Gewässer & Städte benennen; Bayern, Baden-Württemberg and Schleswig-Holstein in Landeshauptstadt benennen. Report each one's bounding box against the panels
- [ ] Resizing the window mid-game invalidates the remembered height; the next round behaves like a first round and is still clear of the panels
- [ ] The marker ring stays 18 screen px; the zoom reached is reported for Rhein, Mainz and Bodensee (before → after)
- [ ] Bundesland finden, Gewässer & Städte finden and Bundesland benennen: feedback transforms identical to `main` for the same seeded targets
- [ ] `make test` passes; any new pure logic is in `view-fit.mjs` with tests
- [ ] **Verified by driving the app**, with observed values reported as above
