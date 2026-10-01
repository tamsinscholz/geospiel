# 04 — Gewässer & Städte benennen

**What to build:** The naming mode, on top of 03's scaffolding.

A feature is marked in orange, with the 18 px ring for lakes and cities, and the map
travels gently to it, as in Landeshauptstadt benennen (750 ms, capped at 1.8×, via
`zoomToBounds`). The prompt asks "Welcher Fluss / See ist markiert?" or "Welche Stadt ist
markiert?". The user types the name, matched by `matchLandmark` against
`data/landmark-aliases.json`; the article is optional and may be wrong. Feedback shows
the name with its article in the prompt and the per-type info panel, and travels to the
target again.

The ring has to stay 18 screen px **during** the zoom transition, not just after it,
since it is visible while the map moves.

Reference: `.scratch/gewaesser-staedte/spec.md`: "Zoom", "Rendering" (target and marker),
"Answer matching and aliases", "German UI strings". `docs/game-flow.md`,
`docs/ui-components.md` and `CLAUDE.md` are updated.

**Blocked by:** 03.

**Status:** done

### Acceptance criteria

- [x] Round start: target orange (rivers 4 px with white casing; lakes filled; city dot 6 px), ring around lakes and cities, gentle travel capped at 1.8× (long rivers barely move); input focused after 800 ms
- [x] The prompt asks by type; Landeshauptstädte use "Welche Stadt ist markiert?"; placeholder "Name eingeben …"
- [x] Accepted: the name, with or without the article, a wrong article, the aliases (Rhine, Lake Constance, Cologne, Frankfurt, Freiburg, Schwäbisches Meer, …); "Berlin" for `city-berlin`
- [x] Wrong → "Falsch – noch {n} Versuch(e)", field cleared and refocused; empty → ignored; out of Versuche → "Keine Versuche mehr – es war {article name}"
- [x] Feedback: the prompt shows "{article} {name}", the info panel per type, travel to the target
- [x] The ring stays 18 screen px through the zoom transition (observed mid-transition)
- [x] Score history under `geospiel-stats-name-landmark`
- [x] The other five modes are unchanged
- [x] `docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` updated
- [x] `make test` passes
- [x] **Verified by driving the app** at 1440×900 and 400×800. Report observed values for:
  - the zoom scale reached for Rhein, Dümmer and Mainz
  - the ring's radius mid-transition and at rest
  - accepted and rejected inputs, including "die Rhein" and "der"
  - a full game with the default toggles

## Comments

**From ticket 03's review (2026-10-01).** The `name-landmark` menu card already exists in
`index.html` with the `hidden` attribute; remove it here, and tick ticket 03's open
"six cards" criterion when this lands. The shared Einstellungen, layers, marker,
`highlightLandmark()` and `zoomToBounds()` already handle both landmark modes.
`data/landmark-aliases.json` is not yet loaded by `main.js`.

- Implemented (uncommitted, for review) on branch `name-landmark`. The card is un-hidden
  (the now-unused `.mode-card[hidden]` rule is dropped). `main.js` loads
  `data/landmark-aliases.json` in the `Promise.all` and hands it to `createGame` in both
  landmark modes (the Bundesland table otherwise). New `landmarkBounds(id)` (path bounds
  for rivers/lakes, `[p, p]` for a city) feeds `zoomToBounds` at round start and in
  feedback; `highlightLandmark` runs at round start; prompt by `type`
  (`NAME_LANDMARK_PROMPTS`), the article title in feedback; placeholder "Name eingeben …";
  the input panel's CSS rule gains `name-landmark`. Typed input reuses `handleSubmit`.
  The zoom handler already calls `sizeLandmarks(k)` on every transition tick; no change
  was needed. No new pure logic, so no new tests (`make test` 152/152).
- Driven in headless Chrome, 1440×900 mouse and 400×800 touch, 0 console errors. Scales
  reached: Rhein 1.63, Mainz 1.8, Steinhuder Meer 1.8; Dümmer 1.8 through a test-only
  hook calling `zoomToBounds(landmarkBounds('lake-duemmer'))` (it is never a target).
  The ring measured 18.00 px in all 60 frames of the transitions into Mainz and the
  Steinhuder Meer (k 1.44→1.33→1.80), with the target dot at 6.00 px. Accepted: Rhein, der
  Rhein, die Rhein, Rhine, Lake Constance, Schwäbisches Meer, Cologne, Frankfurt,
  Freiburg, Berlin (`city-berlin`). "der" and "Main" each cost a Versuch ("Falsch – noch
  n Versuch(e)", field cleared and focused); empty or whitespace input was ignored; out
  of Versuche → "Keine Versuche mehr – es war das Steinhuder Meer". A full default game
  ran 25 rounds (22 right, 1 skipped, 88 %) and was stored under
  `geospiel-stats-name-landmark`. Landeshauptstadt benennen transforms are identical to
  `main` for all 16 seeded targets at both sizes.
- Spec note: "long rivers fit at about 1×" does not hold with the 0.9-of-viewBox fit.
  The longest rivers reach Elbe 1.51, Donau 1.56 and Rhein 1.63, and the other pool
  rivers hit the 1.8 cap. The whole river still stays in frame. The formula was left
  as specified, and the docs record the observed values.

**Review (coordinating session, 2026-10-01).** Diff read; `make test` 152/152. Re-driven in
headless Chrome. 1440×900: a full default game, 25 rounds, every water answered with the
*wrong* article ("die Neckar", "der Donau", …) → 25 × "Richtig!", feedback prompt with the
right article ("der Neckar"), stats 25/25/0/100 % under `geospiel-stats-name-landmark`;
"der" → "Falsch – noch 2 Versuche", field cleared, focus kept; empty ignored. Zoom reached:
cities and lakes 1.8, Rhein 1.629, Donau 1.558, Elbe 1.509. 400×800 touch, all 41 types on:
ring 18 px in every 50 ms sample of the 1.0 → 1.8 transition to Köln; Cologne, Rhine, Lake
Constance, Moselle, Berlin, Hanover, Danube, Frankfurt, Freiburg, Munich all accepted.
Six menu cards, one 320 px column. No console errors.

Long rivers reach ~1.5–1.6×, not "about 1×" as the spec guessed: that is the specified
0.9-of-viewBox fit (the clipped Rhein spans ~60 % of Germany's height); the whole river
stays in frame, so the formula is kept.
