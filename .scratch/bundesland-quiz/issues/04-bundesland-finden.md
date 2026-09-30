# 04 — Bundesland finden, with the German quiz scaffolding

**What to build:** The first scored mode, end to end — and with it every layer the other
two quiz modes will reuse.

Given a Bundesland's name and Landeswappen, click it on the map. The map starts
un-highlighted and un-zoomed, because either would give the answer away. A correct click
scores and moves to feedback; a wrong click flashes that Bundesland red and costs a
Versuch; running out reveals the answer.

Being the first quiz slice, this ticket pays for the shared scaffolding: the
Einstellungen screen, the HUD, the progress bar, the feedback bar, the Spiel-beendet
screen with its rolling average, and the score history. Later modes get those for free.

Two spec details that land here rather than later:

**Runden caps at 16, default 16.** There are only sixteen answers, so the old 1–50 range
no longer means anything. The default plays a complete pass over the country.

**The gentle zoom.** Feedback zooms to the answer so the user sees where it was, capped
at 1.8× rather than the old 8×. At that cap the full east–west span and over half the
north–south span of Germany stay in frame, so the target's position in the country stays
readable. It is a single tunable constant.

**Score history keys must be prefixed.** Both games are served from the same dev origin,
so an unprefixed key would silently read world-quiz history as Bundesland history and
corrupt the average.

**This ticket gates the small-target removal.** 03 stopped rendering the overlay; here is
where clicking is actually scored, so here is where the removal has to be confirmed
rather than reasoned about.

Reference: `.scratch/bundesland-quiz/spec.md` — "Rounds and guesses", "Gentle zoom to
target", "Score history storage", "German UI strings".

**Blocked by:** 03.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The Einstellungen screen is titled with the chosen mode and offers Runden, Versuche pro Runde and automatisch weiter, all labelled in German, with a Zurück button that returns to the mode selection
- [ ] Runden ranges 1–16 and defaults to **16**; Versuche ranges 1–10 and defaults to 3
- [ ] Settings persist while the app is open, so starting a second game does not mean re-entering them
- [ ] A game's round order has no repeats and exactly as many rounds as configured
- [ ] During play the prompt shows the target's name and Landeswappen, and the map is neither highlighted nor zoomed
- [ ] A correct click scores a point and moves to feedback
- [ ] A wrong click flashes that Bundesland red briefly, costs one Versuch, and leaves the round running
- [ ] Running out of Versuche ends the round and the feedback names the correct answer
- [ ] **Clicking the Kulisse costs no Versuch and does nothing at all**
- [ ] Feedback gently zooms to the answer, capped at 1.8×, with the rest of Germany still substantially in frame; the Bundesland is highlighted and its full info panel shown
- [ ] The Weiter button takes keyboard focus; with automatisch weiter on it is absent and the round advances by itself
- [ ] The progress bar fills as rounds complete
- [ ] Überspringen advances with no feedback and is counted separately from wrong answers
- [ ] Beenden goes straight to the Spiel-beendet screen, which counts the in-progress round as played
- [ ] The Spiel-beendet screen shows Gespielte Runden, Richtig, Übersprungen and a percentage over rounds *played*, all in German
- [ ] The rolling average across recent games for this mode is shown, with the individual recent scores on hover
- [ ] History is kept **per mode** and survives closing the browser
- [ ] History keys are prefixed so old world-quiz history is not read — confirm an existing unprefixed key does not affect the average
- [ ] Zurück zum Menü returns to the mode selection with the zoom reset
- [ ] `make test` passes
- [ ] **Verified by driving the app, not by self-report — this gates the small-target removal:** all three Stadtstaaten (Berlin, Hamburg, Bremen) and Saarland are comfortably clickable at `k = 1` at both desktop and roughly 400px width. Report the observed hit sizes or click outcomes
- [ ] **Verified by driving the app:** report observed score, Versuche and feedback text through a full game, including a wrong guess, a skip and an early quit
