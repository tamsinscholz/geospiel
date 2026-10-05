# 0003 — Map motion: one policy per mode, travel once per round

**Status:** accepted (2026-10-05)

## Context

The map is full-screen and the quiz panels float over it: the game panel at the top, and
at the bottom the input box while playing, then the feedback bar plus the taller facts
box in feedback. `visibleArea()` measures the band between them.

By 2026-10-03 the map moved to a target in two ways, chosen by `if` chains in
`startRound` and `showFeedback`:

- `zoomToBounds`, the gentle travel, which always zooms and pans to fit the target.
  Landeshauptstadt benennen and Gewässer & Städte benennen used it at round start and
  again in feedback.
- `panToBounds`, the feedback pan (ticket `target-clear-of-panels/02`), which pans only,
  keeps `k`, and moves only if the target is covered. The two finden modes used it in
  feedback.

In the two benennen modes this meant two travels every round. The first fitted the target
above the input box. The second re-fitted it above the taller feedback stack, so the map
moved again even when nothing had been covered. The maintainer found it too much motion.
The maintainer also asked for the feedback pan to be a per-mode option.

## Decision

1. **One policy table.** Each quiz mode declares what the map does at round start and in
   feedback, and one function carries it out. The policies are:

   | Policy | Movement |
   |---|---|
   | `overview` | Back to the overview, but only if the map moved (as today) |
   | `fit` | The gentle travel: zoom and pan to fit the target into the band above the **feedback** stack |
   | `reveal` | Pan only, keep `k`, and only if the target is covered |
   | `none` | No movement |

2. **Travel once per round.** In the travelling modes, round start fits the target into
   the band it will have in feedback, so the feedback stack doesn't cover it later.
   Feedback is `reveal`, a safety net that usually doesn't move. The feedback stack
   isn't laid out while playing, so its height is remembered from feedback at the
   current window size. It is kept **per kind of facts box** (Bundesland, river, lake,
   city, Landeshauptstadt), as the **largest** seen. A kind not seen yet uses the
   largest of the others. Before the first measurement at a size, `fit` falls back to
   the playing band, and `reveal` catches any difference.

   *Amended 2026-10-05, during implementation:* the draft said "the last measurement".
   The kinds differ by up to about 100 px on a phone (a river's stack top at 663 px,
   a city's at 545–575), so "last" made a lake after a river pan in feedback. One
   maximum across all kinds over-shrank the band and dropped the Rhein's zoom on a phone
   from 1.61 to 1.24.

3. **The table on 2026-10-05:**

   | Mode | Round start | Feedback |
   |---|---|---|
   | Bundesland finden | `overview` | `reveal` |
   | Bundesland benennen | `overview` | `none` → `reveal` (2026-10-05, see below) |
   | Landeshauptstadt benennen | `fit` | `reveal` |
   | Gewässer & Städte finden | `overview` | `reveal` |
   | Gewässer & Städte benennen | `fit` | `reveal` |

   Erkunden doesn't move the map. Bundesland benennen started as `none`, which was
   unchanged behaviour, so Bayern could still sit under the facts box there.

   *Amended 2026-10-05:* the maintainer switched Bundesland benennen's feedback to
   `reveal`, like the finden modes. Every quiz mode now pans a covered target clear in
   feedback, and `none` is currently unused.

## Rejected alternatives

- **Constant bottom-stack height** (CSS). The input card would be as tall as the feedback
  stack, so the band never changes. Rejected because it leaves a large, mostly empty
  card while playing and changes the look of every quiz mode.
- **Keep today's first travel and only reveal in feedback.** This removes the re-centre,
  but southern and coastal targets would still pan in feedback every round.

## Consequences

- In the travelling modes, targets sit slightly higher on screen while playing than is
  strictly needed above the input box.
- The first round of a game, or the first round after a window resize, may still pan a
  little in feedback.
- A new mode, or a change of mind about an existing one, is a change to the table, not
  another `if` branch.
