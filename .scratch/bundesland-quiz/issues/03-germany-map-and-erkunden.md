# 03 — Germany map, pan clamp, and Erkunden in German

**What to build:** The first playable Germany slice. Open the app, pick **Erkunden**,
and browse the sixteen Bundesländer on a map that cannot leave Germany, with every label
in German.

This replaces the world map engine. The projection is fitted to Germany rather than
scaled to the viewport width, and the reachable area is clamped so there is nowhere to
pan to — that is what delivers "nothing far beyond the borders is shown or can be panned
to."

The map goes onto a **fixed viewBox** sized to Germany's padded projected bounds, with
`preserveAspectRatio`, and all projection, zoom and pan arithmetic moves into that
coordinate space. This is the one structural departure from a straight port, and it buys
two things: resizing re-fits Germany with no JS resize handler, and the pan clamp lives
in a coordinate space that does not move. On a wide screen this letterboxes horizontally
— the Kulisse layer is what fills that space.

The Kulisse sits *beneath* the Bundesländer, muted, unlabelled, and
`pointer-events: none` in every mode. That one CSS rule does three jobs: it never
highlights on hover, it never counts as a wrong guess later, and it never intercepts a
click meant for a Bundesland near the border.

One knock-on to watch: the existing "click empty space to dismiss the panel" check tests
whether the click target is a `path`, which breaks the moment the Kulisse adds more
paths. It has to test for a Bundesland by class instead.

The small-target click overlay stops being rendered here — there is no German equivalent
data, and the whole map is now at Bundesland-legible scale. Its removal is *confirmed*
in 04, where clicking is actually scored.

Reference: `.scratch/bundesland-quiz/spec.md` — "Map projection, extent, and the pan
clamp", "The Kulisse layer", "Landeswappen presentation", "German UI strings".

**Blocked by:** 01, 02.

*The 02 edge is a genuine dependency — there is nothing to render without the data. The
01 edge is about a shared file rather than a logical need: Erkunden has no scoring so it
never calls the game-core, but both tickets rewrite the same wiring and running them
concurrently means a painful merge.*

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The map opens with the whole of Germany fitted and centred, at desktop width and at roughly 400px width
- [ ] Each Bundesland renders as its own shape with a visible border; border lines stay a constant visual thickness at every zoom level
- [ ] The map uses a fixed viewBox with `preserveAspectRatio`, and **no JS resize handler exists** — resizing the window re-fits and re-centres Germany
- [ ] Zooming out all the way gives the full-Germany view; the scale range is `[1, 6]`
- [ ] At `k = 1` panning cannot move the view at all
- [ ] At maximum zoom, panning cannot leave Germany plus its small margin in any direction
- [ ] The Kulisse renders beneath the Bundesländer, visibly muted, with no labels
- [ ] The Kulisse is unclickable and never highlights, in every mode
- [ ] Hovering a Bundesland highlights it and opens the info panel; moving off closes it
- [ ] Tapping a Bundesland highlights it and opens the panel; tapping a different one switches; tapping the same one again, or tapping the Kulisse or empty space, dismisses it
- [ ] The info panel shows the Landeswappen, the Bundesland name, the Landeshauptstadt, and Fläche / Einwohner / höchster Punkt / Nachbarländer, all labelled in German
- [ ] The Landeswappen is rendered `contain` in a roughly square box with no background fill — **not** cropped to the old landscape flag box
- [ ] Large numbers use German convention (`83.200.000`, `70.542 km²`)
- [ ] The Erkunden quit button returns to the menu and resets the zoom to the full-Germany view
- [ ] The mode selection screen and every Erkunden string are in German, and the page declares `lang="de"`
- [ ] The small-target overlay is no longer rendered and its CSS is gone
- [ ] `make test` passes
- [ ] **Verified by driving the app, not by self-report:** report observed values for the fitted extent at both widths, the pan clamp at `k = 1` and at maximum zoom, a resize, and a Kulisse click
