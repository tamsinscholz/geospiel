# 04 — Keep the target and panels visible above the on-screen keyboard

**What to build:** In the three benennen modes on a phone, opening the on-screen
keyboard no longer hides the target or the panels. The input box sits on top of the
keyboard, the game panel stays at the top, and the target stays in the strip between
them. From the second round on this needs no correction at all.

The maintainer reported this on Android (Chrome), where the keyboard opens by itself 800 ms
after round start: the zoomed-in target is pushed up and out of view. Closing the
keyboard restores the view, and tapping the field to reopen it breaks it again. The game
must work on Android and iOS. The approach and its reasoning are
[ADR 0004](../../../docs/adr/0004-on-screen-keyboard-via-visual-viewport.md); the motion
policies are [ADR 0003](../../../docs/adr/0003-map-motion-policy-per-mode.md).

- **Visible screen:** read it from `window.visualViewport` (its height, offset and
  resize/scroll events). Don't use `interactive-widget=resizes-content`.
- **Panels:** pin the game panel and the bottom stack to the visual viewport through CSS
  custom properties that one listener keeps up to date. Layout stays in CSS.
- **`visibleArea()`:** also clip the band to the visual viewport. When the visible screen
  changes during playing or feedback, run `reveal` (pan only, keep `k`, only if covered).
- **Plan ahead:** remember the keyboard's inset (the hidden part at the bottom, in screen
  px), keyed on the map size, as the feedback stack is. While playing a `fit` mode, the
  travel fits into the tightest band of the round: below the game panel, and above
  both the input box resting on the remembered keyboard and the remembered feedback
  stack. With no keyboard remembered (a desktop, the first keyboard at a size), today's
  behaviour applies.
- **Unchanged:**
  - desktops, and phones while no keyboard is open
  - the finden modes
  - Erkunden
  - the 800 ms autofocus

Reference: ADRs 0003 and 0004; tickets 01–03 in this directory and their Comments.

**Blocked by:** 03 (done).

**Status:** ready-for-agent

### Acceptance criteria

- [ ] With a keyboard occupying the bottom ~45% of a 400×800 or 360×640 screen, in all three benennen modes: the input box rests directly on the keyboard, the game panel is fully visible, and the target's bounding box lies in the band between them; report the values
- [ ] Round 1 at a size: at most one `reveal` pan (`k` unchanged) when the keyboard first opens. From round 2 on: no transform change when the keyboard opens, when it closes, or in feedback
- [ ] Closing and reopening the keyboard mid-round (tap the field): the target stays visible and the map doesn't move once the keyboard is remembered
- [ ] Desktop (1440×900, 1440×700) and phones without a keyboard: transforms identical to `main` for the same seeded games
- [ ] The finden modes and Erkunden unchanged
- [ ] `make test` passes; new pure logic (e.g. combining bands or insets) in `view-fit.mjs` with tests
- [ ] **Verified by driving the app**, simulating the keyboard by overriding `visualViewport`'s `height`/`offsetTop` and dispatching its `resize`/`scroll` events, in both styles: Android, keyboard with no scroll, and iOS, keyboard plus a scrolled `offsetTop`. Report observed values
- [ ] **Checked on a real Android phone by the maintainer**, the step this ticket can't do itself; the Comments say how to open the dev server from the phone
