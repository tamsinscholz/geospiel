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

**Status:** done

### Acceptance criteria

- [x] One per-mode table declares round-start and feedback motion, with the values in ADR 0003; no mode `if` chain remains for map motion in round start or feedback
- [x] Landeshauptstadt benennen and Gewässer & Städte benennen, from the second round of a game on: **no transition at all in feedback** (the transform is identical before and after entering feedback) for every target in a full game, at 1440×900, 1440×700 and 400×800 (touch)
- [x] First round of a game: at most a pan in feedback (`k` unchanged), and only when the target is covered
- [x] In feedback, targets are clear of the panels: Bodensee, Chiemsee, Freiburg, Kiel and Rostock in Gewässer & Städte benennen; Bayern, Baden-Württemberg and Schleswig-Holstein in Landeshauptstadt benennen. Report each one's bounding box against the panels
- [x] Resizing the window mid-game invalidates the remembered height; the next round behaves like a first round and is still clear of the panels
- [x] The marker ring stays 18 screen px; the zoom reached is reported for Rhein, Mainz and Bodensee (before → after)
- [x] Bundesland finden, Gewässer & Städte finden and Bundesland benennen: feedback transforms identical to `main` for the same seeded targets
- [x] `make test` passes; any new pure logic is in `view-fit.mjs` with tests
- [x] **Verified by driving the app**, with observed values reported as above

## Comments

- Implemented (uncommitted, for review) on branch `motion-policy`. `make test` 173 → 180.
  - **Table:** `MAP_MOTION` in `main.js`, `{ roundStart, feedback }` per quiz mode with
    the ADR 0003 values, carried out by `moveMap(moment, id)` after `setPhase` in
    `startRound` and `showFeedback`. The mode `if` chains for map motion are gone.
    `overview` is still `resetZoom()` (300 ms to the identity, which changes nothing
    on the untouched overview), `fit` is `zoomToBounds`, `reveal` is `panToBounds`.
  - **Feedback band:** `motionArea()` is `visibleArea()`, except while playing a `fit`
    mode. Then its bottom is the higher of the input panel and the remembered feedback
    stack. `visibleArea(stackInset)` takes that stack as an inset in screen px above
    the map's bottom edge. The pan clamp (`zoom.constrain()`) uses `motionArea()` too.
    Without that, the clamp for the playing band would stop a southern target short of
    the feedback band, and a drag while playing would snap back.
  - **Remembering the stack:** `rememberFeedbackStack()` runs right after
    `setPhase('feedback')` in every quiz mode. It stores the inset with the map size it
    was measured at, keyed by the kind of info panel (`bundesland`, or `landmarkType`:
    river, lake, city, capital), and keeps the **largest** inset per kind. A different
    map size makes the entry stale, so there is no resize handler. `feedbackInset()`
    returns the target kind's inset at this size. For a kind not seen yet it returns
    the largest of the other kinds at this size, and with none it returns null, which
    falls back to the playing band.
  - **Max, and per kind (deviates from the ADR's "last measurement"):** at 400×800 the
    stack top is 663 px for a river, 613 for the Bodensee and 545–575 for cities and
    other lakes. At 1440×700 it is 575 for a river and 540 for a lake or city. Those
    differences aren't small.
    - With "last", a lake after a river would be planned 35–107 px too low, and
      `reveal` would pan in later rounds.
    - With a single max, the Rhein lost zoom it doesn't need: 1.613 → 1.237 at 400×800.
    - Within one kind the stack still varies: "Keine Versuche mehr – es war …" wraps,
      and a city or lake may or may not show a Wappen. Keeping the max covers that.
  - **`panIntoView` change (`view-fit.mjs`, tested):** bounds that fit the area, but not
    the area shrunk by the 24 px margin, now get the margin that is left, split evenly.
    Before, they counted as oversize and were aligned to one edge, which left the other
    edge under a panel. Without this, first-round Bayern stayed under the facts box at
    1440×700 (557 vs 540) and 400×800 (529 vs 516), because `reveal` can't zoom out.
    Bounds larger than the area still keep the full margin.
  - **New pure helper:** `visibleBand(map, top, bottom, ctm, full)` in `view-fit.mjs`.
    It converts the screen band, intersects it with the viewBox (letterboxed panels
    take nothing away) and falls back to the whole viewBox when the band is empty. It
    was moved out of `visibleArea()` and has 5 tests.
  - **Not handled:** if feedback starts before the 750 ms round-start travel ends (the
    user clicks into the field before its 800 ms autofocus), `reveal` reads the
    mid-travel transform.
- Verified with playwright, seeded `Math.random`, full games. Answers alternate between
  right and three wrong. Transitions were counted by wrapping
  `d3.selection.prototype.transition` on `#map`, and transform changes with a
  MutationObserver on `#map-group`.
  - **Landeshauptstadt benennen**, 16 rounds, seeds 4242 and 7, at 1440×900, 1440×700
    and 400×800 (touch):
    - Every round from round 2 on: the transform is identical, with 0 transitions and
      0 mutations in feedback.
    - Round 1, seed 4242 (Bayern), pan only, k unchanged, covered when feedback opened:
      dy −44.1 (1440×900), −39.2 (1440×700), −247.9 (400×800).
    - Round 1, seed 7 (Niedersachsen): no move at 1440, dy −110.7 at 400×800.
  - **Gewässer & Städte benennen**, all four toggles, 41 rounds, at the same three
    sizes: 41/41 identical, round 1 (Stuttgart) included, 0 transitions in feedback.
  - **Clear in feedback (target and ring, y range vs game panel bottom..stack top):**
    - 1440×900:
      - Bodensee 598–666 vs 68..760
      - Chiemsee 565–601 vs ..740
      - Freiburg 539–575 vs ..740
      - Kiel 231–267
      - Rostock 275–311
      - Bayern r1 91–717 vs 68..740; r6 (seed 7) 107–711
      - Baden-Württemberg 205–654
      - Schleswig-Holstein 99–441
    - 1440×700:
      - Bodensee 429–483 vs 68..560
      - Chiemsee 400–436 vs ..540
      - Freiburg 380–416
      - Kiel 191–227
      - Rostock 225–261
      - Bayern r1 71–537 vs 68..540; r6 95–520
      - Baden-Württemberg 129–479
      - Schleswig-Holstein 92–358
    - 400×800:
      - Bodensee 460–503 vs 66..613
      - Chiemsee 445–481 vs ..545
      - Freiburg 438–474 vs 87..575
      - Kiel 222–258 vs 52..556
      - Rostock 248–284
      - Bayern r1 137–511 vs 52..516; r6 153–490 vs ..506
      - Baden-Württemberg 197–465 vs 66..506
      - Schleswig-Holstein 150–354
    - No round in any run was covered in feedback.
  - **Mid-game resize** 1440×900 → 1440×700 after round 3, in both modes:
    - The next round fitted to the playing band, like a first round. The Mosel landed
      at y −714.1, `main`'s playing value, against −748.4 when the inset was
      remembered.
    - Every round after the resize stayed identical in feedback and clear (Mosel
      257–396 vs ..575).
  - **Zoom, `main` (playing → feedback) → branch (both phases):**

    | Target | 1440×900 | 1440×700 | 400×800 |
    |---|---|---|---|
    | Rhein | 1.298 → 1.280 / 1.215 → **1.280** | 1.203 → 1.180 → **1.180** | 1.593 → 1.613 → **1.583** |
    | Mainz | 1.8 → **1.8** | 1.8 → **1.8** | 1.8 → **1.8** |
    | Bodensee | 1.8 → **1.8** | 1.8 → **1.8** | 1.8 → **1.8** |

    The second 1440×900 Rhein value, 1.215, came from a single max inset across kinds,
    which was replaced. The Bodensee sits 24–75 px higher than on `main` while playing
    and equal to or higher than in feedback.
  - **Marker ring:** 18.0 px in feedback for every lake and city, in every run.
  - **Other modes, branch vs `main`:** per-round start and feedback transforms are
    byte-identical in full games at all three sizes for:
    - Bundesland finden
    - Gewässer & Städte finden, with the default toggles and with all four
    - Bundesland benennen, which never moved
    Feedback pans happened in 5–10 rounds per finden run. The reduced margin never came
    into play there.
  - **Console:** no errors in any run.
  - **Screenshots:**
    `scratchpad/shots-mp03/{s,s7,rs}-<mode>-<size>-r<round>-<id>.png`. The `rs-*` files
    from round 4 on are at 1440×700, despite the name.

**Review (coordinating session, 2026-10-05).** Diff read; `make test` 180/180. Accepted both
deviations: the feedback stack is remembered as the largest seen per facts-box kind, and
ADR 0003 is amended to match; and `panIntoView` now splits the leftover margin for bounds
that fit the area but not the shrunk one. Re-driven as full games, alternating a right
answer with three wrong ones. Rounds whose transform changed between round-start rest and
feedback rest:

| Mode | 1440×900 | 1440×700 | 400×800 touch |
|---|---|---|---|
| Landeshauptstadt benennen (16 rounds) | none | none | r1 only (Nordrhein-Westfalen) |
| Gewässer & Städte benennen (41 rounds) | none | none | r1 only (Starnberger See) |

No target was covered in feedback in any round. No console errors.
