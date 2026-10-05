# 0004 — The on-screen keyboard: treat it as a panel, through `visualViewport`

**Status:** accepted (2026-10-05)

## Context

The three benennen modes focus the text input 800 ms after round start. On Android
(Chrome) that opens the on-screen keyboard, and the maintainer saw this. On iOS a field
focused from a timer usually opens no keyboard, but tapping the field does.

Current mobile browsers handle the keyboard in one of two ways:

- **Overlay** (`resizes-visual`): the default in iOS Safari, and in Chrome on Android
  since version 108. The page keeps its size. The keyboard overlays it, and the browser
  scrolls the *visual viewport* so the focused field stays visible.
- **Resize** (`resizes-content`): opt-in on Chrome for Android through the viewport
  meta's `interactive-widget`. The page shrinks above the keyboard. iOS ignores this.

Under overlay, our full-page map and panels keep their size. The target that the
round-start travel placed above the input box (ADR 0003) ends up behind the keyboard or
scrolled out at the top, and the game panel can slide out of view. The maintainer
reported exactly this on Android: closing the keyboard restores the view, and reopening
it by tapping the field breaks it again. The game has to work on Android and iOS.

## Decision

1. **Use overlay on both platforms, and read the visible screen from
   `window.visualViewport`.** We don't opt into `interactive-widget=resizes-content`. It
   would shrink the page, so the SVG's meet fit would re-scale Germany every time the
   keyboard opened. It would also behave differently from iOS, which doesn't support it.
2. **Pin the panels to the visual viewport.** The game panel and the bottom stack
   follow the visible screen through CSS custom properties that one `visualViewport`
   listener keeps up to date, for example its top offset and the inset hidden at the
   bottom. The input box then sits directly on top of the keyboard, and the game panel
   stays visible.
3. **The keyboard is another panel to `visibleArea()`.** The visible area is clipped to
   the visual viewport as well as to the panels. When it changes during a round
   (keyboard opens or closes, or the browser scrolls), a covered target is brought clear
   with ADR 0003's `reveal`: pan only, keep `k`.
4. **Plan ahead, as for the feedback stack.** The keyboard's height is remembered,
   keyed on the map size. While playing a `fit` mode, the round-start travel fits into
   the **tightest** band the round will have: below the game panel, and above both the
   input box on the remembered keyboard and the remembered feedback stack. From the
   second round on, neither the keyboard nor feedback moves the map. The first time the
   keyboard opens at a given size, `reveal` corrects once.

## Consequences

- On a phone with the keyboard open, the band for the target is small (roughly the top
  half of the screen), so large targets such as Bayern or the Rhein fit at a lower `k`.
- Closing the keyboard leaves the map where it is, since the target is still visible.
- Headless browsers have no on-screen keyboard. Automated checks simulate the visual
  viewport; the real behaviour is checked on an Android phone, and on iOS when one is
  available.
