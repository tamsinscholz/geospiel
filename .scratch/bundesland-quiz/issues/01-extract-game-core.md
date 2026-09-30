# 01 — Extract the pure game-core module

**What to build:** The single testing seam the spec calls for, plus the repo's first test
suite — with no change to how the game behaves.

Today the state machine, guess accounting and answer matching are tangled into the D3
and DOM wiring, so none of it can be tested without a browser. Pull that logic out into
one module that imports nothing, touches no DOM, no D3, no `localStorage` and no timers.
Rewire the existing app to call it.

The world quiz must still play **identically** after this ticket — that is the whole
point of doing it first. If it does, the extraction was behaviour-preserving; if the
extraction and the Germany swap happened in one step, you could not tell which broke.

Tests use small synthetic fixtures, not the world data, so they stay valid once the data
is swapped in later tickets.

The German normalizer ships here too, even though the world game is still live. It is
pure, it belongs to this seam, and it only ever *over*-accepts — so it cannot reject a
spelling the old one allowed.

Interface, from the spec:

```
createGame({ items, aliases, mode, totalRounds, maxGuesses, shuffle }) -> game

game.state -> { mode, phase, currentRound, totalRounds,
                score, skipped, guessesLeft, targetId, roundOrder }

game.guessById(id)       // map click
game.guessByText(text)   // typed answer
  -> { correct, guessesLeft, exhausted, phase }

game.next()    -> { phase, finished }
game.skip()    -> { phase, finished }
game.quit()    -> { finished: true }
game.summary() -> { roundsPlayed, correct, skipped, percent }
```

Plus the pure helpers `normalize(text)`, `matchBundesland(text, aliases)` and
`matchCapital(text, item)`.

Reference: `.scratch/bundesland-quiz/spec.md` — "The one testing seam", "Answer
matching", "Build and run".

**Blocked by:** None — can start immediately. Runs in parallel with 02.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The game-core module has no reference to the DOM, D3, `localStorage`, `setTimeout` or any global beyond `Math`
- [ ] `shuffle` is injected, so tests get a deterministic round order without stubbing `Math.random`
- [ ] The existing app calls the module for round sequencing, guess accounting and answer matching rather than holding that logic itself
- [ ] Timers, visual effects, panel visibility and score persistence stay outside the module
- [ ] A `Makefile` exists with `install`, `run`, `test`, `clean` and `clean-all`; `make test` runs the suite and `make run` starts the static server
- [ ] **No npm dependency is added** — tests run on Node's built-in test runner and `node:assert`, so "no build process, no npm required" still holds
- [ ] `make install` is a no-op and the app still opens by loading the page directly, with no build step
- [ ] Tests cover guess accounting: correct answer scores and moves to feedback; wrong answer decrements and stays playing; last wrong guess moves to feedback without scoring; guesses reset each round; empty and whitespace input consume no guess; repeating a wrong guess still costs a guess
- [ ] Tests cover round sequencing: no repeats; length equals the configured count; a count above the number of available items is clamped; advancing past the last round reports finished; skip increments skipped without touching score or entering feedback; quit reports finished and counts the in-progress round as played; the summary percentage is over rounds *played*, not rounds configured
- [ ] Tests cover normalization: umlaut, transliterated and bare forms all canonicalise together (`Württemberg` / `Wuerttemberg` / `Wurttemberg`); `ß` folds to `ss`; hyphens, spaces and case are ignored
- [ ] Tests cover matching: an unknown string is rejected rather than throwing; a confusable pair stays distinct under the normalizer
- [ ] `make test` passes
- [ ] **Verified by driving the app, not by self-report:** the world quiz is played through in all four modes and behaves as it did before — report the observed score, guess counts and feedback text
