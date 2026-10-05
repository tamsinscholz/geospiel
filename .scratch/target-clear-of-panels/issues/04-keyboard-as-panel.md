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

**Status:** ready-for-human

### Acceptance criteria

- [x] With a keyboard occupying the bottom ~45% of a 400×800 or 360×640 screen, in all three benennen modes: the input box rests directly on the keyboard, the game panel is fully visible, and the target's bounding box lies in the band between them; report the values
- [x] Round 1 at a size: at most one `reveal` pan (`k` unchanged) when the keyboard first opens. From round 2 on: no transform change when the keyboard opens, when it closes, or in feedback
- [x] Closing and reopening the keyboard mid-round (tap the field): the target stays visible and the map doesn't move once the keyboard is remembered
- [x] Desktop (1440×900, 1440×700) and phones without a keyboard: transforms identical to `main` for the same seeded games
- [x] The finden modes and Erkunden unchanged
- [x] `make test` passes; new pure logic (e.g. combining bands or insets) in `view-fit.mjs` with tests
- [x] **Verified by driving the app**, simulating the keyboard by overriding `visualViewport`'s `height`/`offsetTop` and dispatching its `resize`/`scroll` events, in both styles: Android, keyboard with no scroll, and iOS, keyboard plus a scrolled `offsetTop`. Report observed values
- [ ] **Checked on a real Android phone by the maintainer**, the step this ticket can't do itself; the Comments say how to open the dev server from the phone

## Comments

- Implemented (uncommitted, for review) on branch `keyboard-panel`. `make test` 180 → 191.
  - **Pinning (CSS):** `:root { --vv-top: 0px; --vv-bottom: 0px; }`. `#game-panel` has
    `top: calc(16px + var(--vv-top))` (≤600px: `var(--vv-top)`). `.bottom-panels` has
    `bottom: calc(16px + var(--vv-bottom))` (≤600px: `var(--vv-bottom)`). `#map` is
    untouched, so the map is never rescaled.
  - **The one listener:** `followViewport()` in `main.js` runs once at load and on
    `visualViewport` `resize`/`scroll`. It writes `--vv-top` = `offsetTop` and
    `--vv-bottom` = `innerHeight - offsetTop - height` (`viewportInsets` in
    `view-fit.mjs`: never negative, under 1 px counts as 0) and keeps them in
    `shownInsets`. No `visualViewport`, or a pinch-zoomed page (`scale` off 1), counts
    as nothing hidden.
  - **Keyboard memory:** a keyboard is open when the hidden total (top + bottom) is more
    than 15% of `innerHeight` (`KEYBOARD_MIN_FRACTION`). Its insets are remembered with
    `mapSizeKey()`, keeping the largest per side (`rememberKeyboard()`,
    `keyboardInsets()`). I remember the top as well as the bottom, so the iOS style (a
    scrolled `offsetTop`) can be planned for.
  - **`visibleArea(stackInset, keyboard)`:** it measures each panel at rest (laid-out
    rect minus the current `--vv-*`) and takes the tightest band (`tightestBand`) of:
    - the panels pinned to the current viewport (`pinnedBand`), which is the clip to
      `[offsetTop, offsetTop + height]`;
    - the remembered feedback stack, at rest;
    - the panels pinned to the remembered keyboard.

    Then `visibleBand` converts it as before, so the letterbox and intersection
    behaviour are unchanged. `rememberFeedbackStack()` also measures at rest.
  - **`motionArea()`:** while playing a `fit` mode it is
    `visibleArea(feedbackInset(), keyboardInsets())`. So the round-start travel and the
    pan clamp both use the tightest band. With nothing remembered it is today's band.
  - **Reacting to changes:** during a round, each viewport event restarts a 150 ms timer
    (`settleViewport()`). When it fires, `onViewportSettled()` runs `panToBounds` (pan
    only, only if covered), after any travel still in progress. It runs while playing a
    `fit` mode and in feedback. A finden round in play is left alone, because its
    target is hidden.
  - **Feedback with the keyboard open:** feedback hides the input, so the keyboard is
    closing. `showFeedback()` therefore defers its `reveal` to the same settle timer, at
    most 500 ms. Measured at once, it would see the keyboard's band and pan for nothing.
- **Two additions not in the ticket:**
  - **Oversize targets in `zoomToBounds`:** with a keyboard remembered, the band can be
    smaller than the target even at 1× (Niedersachsen at 400×800, most Bundesländer at
    360×640). `fitBounds` then centres the target, and it overflows both edges. The top
    overflow is in the feedback band too, so `reveal` panned in feedback. Now the fit is
    followed by `panIntoView` into the feedback band (no margin), which puts the
    overflow at the bottom, under the input box. Without a remembered keyboard this step
    is skipped.
  - **`EDGE_NOISE` (1e-6 viewBox units) in `panToBounds`:** a pan shorter than this, before
    or after the clamp, counts as none. Targets landed exactly on a band edge read as
    covered by about 1e-13 and panned 24 px when the keyboard closed. Separately, a
    clamp that undid a pan started a transition of about 1e-13.
- **Verified with playwright, simulated keyboard.** The setup:
  - `VisualViewport.prototype` `height` and `offsetTop` are overridden.
  - The keyboard opens 100 ms after `#guess-input` focuses (the 800 ms autofocus) and
    closes 250 ms after the phase leaves `playing`.
  - Android style: `height` = 0.55 × `innerHeight`, `offsetTop` 0, `resize` dispatched.
  - iOS style: the same, plus `offsetTop` 120, `resize` and `scroll` dispatched.
  - Full games, seed 4242, touch, alternating a right answer with three wrong ones.
  - Mid-round, the keyboard is closed and reopened in rounds 1, 2, 5, 9 and 13.
  - Results: `scratchpad/pw/kb-<style>-<mode>-<size>.txt`.
  - **Panels:** in every round of every run:
    - the input panel's bottom equals the keyboard top: 440 (400×800 Android), 560
      (400×800 iOS), 352 (360×640 Android), 472 (360×640 iOS);
    - the game panel's top equals the visual viewport's top (0 or 120).
  - **Motion, all 12 runs** (3 modes × 2 sizes × 2 styles, 16/16/25 rounds):
    - From round 2 on: no transform change and no transition when the keyboard opens,
      when it closes mid-round, when it reopens, or in feedback.
    - Round 1:
      - at most one `reveal` when the keyboard opened, `k` unchanged. Bayern dy −211.8
        (400×800 Android) and −64.2 (iOS); −69.4 at 360×640 Android; none at 360×640
        iOS. The Mosel dy −339.2, −106.5, −310.3 and −51.7.
      - In the Bundesland modes, also the first-round feedback pan that ticket 03
        allows (Bayern −36.1 / −183.7 at 400×800).
  - **Target vs band** (game panel bottom .. input top, with the keyboard open):
    - 400×800: band 88..296 (Android) and 208..416 (iOS). In Landeshauptstadt benennen
      every round from 2 on is clear except Niedersachsen on Android (131.9–304.2, k 1,
      8 px under the input box). In Gewässer & Städte benennen only the Elbe and the
      Rhein, at k 1, overflow; the Bodensee, cities and lakes are clear.
    - 360×640: the band is only 120 px (88..208, or 208..328 for iOS). Six of the 16
      Bundesländer are taller than that at 1× (BW, NW, BB, HE, ST, NI), so they overflow
      it by 4–35 px, mostly under the input box. Also the Elbe, Rhein and Weser.
    - The clear cases include Hamburg 179–249, the Saarland 183–246 and Berlin 195–234
      at 400×800.
  - **Feedback:** every round is clear of the feedback stack except round 1 Bayern at
    360×640 (k 1.715 from the unplanned round 1, bigger than the band).
  - **No keyboard, against `main`:** per-round start and feedback transforms are
    byte-identical in full games. Checked at 1440×900, 1440×700 and 400×800 touch for:
    - Bundesland finden
    - Gewässer & Städte finden, default and all toggles
    - Bundesland benennen
    - Landeshauptstadt benennen
    - Gewässer & Städte benennen, default and all toggles

    That is 19/19 identical. Erkunden screenshots (hover or tap on Hessen) are
    byte-identical at 1440×900 and 400×800.
  - **No `visualViewport` at all** (removed in an init script): a round plays, and
    `--vv-top` is 0px.
  - **Console:** no errors in any run.
  - **Screenshots:** `scratchpad/shots-kb04/<style>-<mode>-<size>-r<n>-<id>-{kb-open,feedback}.png`.
    The keyboard is a grey box and the iOS scrolled-out top a pink one.
- **Open for the maintainer:**
  - The 1× floor means a keyboard on a small phone can't fit large Bundesländer and
    long rivers into the band. Allowing `fit` below 1× under a keyboard would need the
    `scaleExtent` and the clamp revisited.
  - The pan clamp in feedback is still the feedback band. A target landed for the
    keyboard band can therefore snap on the first drag in feedback, as could happen
    before with the max-per-kind feedback inset.
- **Checking on a real Android phone:**
  1. On the Mac, in the repo, run `make run`. `python3 -m http.server 8000` listens on
     all interfaces. If macOS asks whether Python may accept incoming connections,
     allow it.
  2. Find the Mac's LAN IP with `ipconfig getifaddr en0`, or `en1` if the Mac is on
     another interface.
  3. On the phone, on the same Wi-Fi, open `http://<that IP>:8000` in Chrome.
  4. Things to check, in all three benennen modes, portrait:
     - When the keyboard opens (by itself after 800 ms, or by tapping the field), the
       input box sits directly on top of it and the game panel stays at the top.
     - The target is between them. In round 1 the map may pan once; from round 2 on it
       shouldn't move at all when the keyboard opens, when it closes (back button), or
       in feedback.
     - Close and reopen the keyboard mid-round: nothing moves.
     - Feedback after the keyboard closes: the feedback bar and facts box sit at the
       bottom again, not floating.
     - Does Chrome scroll the page (`offsetTop` > 0, the game panel moving down)?
       Is anything left scrolled after the keyboard closes?
     - Rotating the phone mid-game behaves like a first round.
     - For logging on the phone: `chrome://inspect` on the Mac with USB debugging, and
       `visualViewport.offsetTop` / `.height` / `innerHeight` in the console.

**Review (coordinating session, 2026-10-05).** Diff read; `make test` 191/191. I re-ran the
agent's keyboard simulation with a different seed (99):
- Gewässer & Städte benennen 400×800, Android style
- Landeshauptstadt benennen 400×800, iOS style
- Bundesland benennen 360×640, Android style

In every round of those three games:
- the input panel's bottom equalled the keyboard's top
- the game panel's top equalled the visual viewport's top
- only round 1 moved, once, when the keyboard first opened
- nothing moved on keyboard close or reopen, or in feedback

The open limitation: targets taller than the keyboard band at 1× still overflow it, mostly
under the input box. That was 6 of 16 rounds of Bundesland benennen at 360×640, and the
Elbe and the Rhein at 400×800. Allowing zoom below 1× while a keyboard is open is a
separate decision.

Merged to `main` and pushed so the maintainer can test on GitHub Pages
(https://tamsinscholz.github.io/geospiel/). Status is `ready-for-human` until the
real-phone check is done.
