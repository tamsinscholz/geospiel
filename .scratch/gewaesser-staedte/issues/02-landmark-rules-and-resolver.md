# 02 — Landmark rules: `matchLandmark` and the hit resolver

**What to build:** The pure logic both new modes rest on, test-first and with synthetic
fixtures only, so it can be built in parallel with the data (01).

- **`game-core.mjs`:**
  - a new exported `matchLandmark(text, aliases)`: strip **one** leading `der`/`die`/`das`
    (a whole word followed by whitespace), then the same canonical lookup as
    `matchBundesland`. A wrong article is accepted, and the bare article matches nothing.
  - a `name-landmark` branch in `guessByText` that resolves `matchLandmark(...) === targetId`
  - update the header comment's mention of "rivers or cities for a later mode"
  - `find-landmark` needs no new code (`guessById` already counts any non-target id as
    wrong), but gets a test that pins it, including an id that isn't in `items` at all
    (a background feature)
- **`landmark-hit.mjs`** (new, pure: imports nothing, no DOM or D3, like
  `game-core.mjs`): `nearestLandmark(point, features, { radius, dotRadius })`, per the
  spec's "Hit-testing":
  - distance to the drawn shape: river → nearest segment; lake → 0 inside (holes
    respected), else to the edge; city → `max(0, d − dotRadius)`
  - the smallest distance ≤ `radius` wins; ties go city, then lake, then river; anything
    beyond `radius` → `null`
  - document the feature record shapes it expects (`{ id, kind: 'river', lines }`,
    `{ id, kind: 'lake', polygons }`, `{ id, kind: 'city', point }`, all in viewBox
    units), so ticket 03 can build them from projected geometry
- **Tests:** extend `test/game-core.test.mjs` and add `test/landmark-hit.test.mjs` with the
  cases in the spec's "Testing Decisions". Match the existing style: `node:test`,
  `node:assert`, synthetic fixtures, descriptive test names.

Reference: `.scratch/gewaesser-staedte/spec.md`: "Hit-testing", "Rounds, guesses and
`game-core.mjs`", "Answer matching and aliases", "Testing Decisions".

**Blocked by:** none. It can run in parallel with 01.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] `matchLandmark` accepts the bare name, the right article and a wrong article; rejects the bare article alone and empty input; leaves names untouched where the article is merely a prefix of a word ("Dieburg" isn't stripped)
- [ ] `guessByText` in `name-landmark`: correct → score, wrong → Versuch, empty → ignored, another landmark's name → wrong
- [ ] `guessById` in `find-landmark` counts a background id (absent from `items`) as wrong
- [ ] The existing modes' behaviour and tests are unchanged
- [ ] `nearestLandmark`: nearest of two rivers; beyond radius → `null`; inside a lake → lake even with a river through it; inside a lake's hole → not the lake unless within radius of an edge; on a dot that sits on a river → city; a three-way tie → city; a larger radius reaches a feature that a smaller one doesn't
- [ ] `landmark-hit.mjs` imports nothing, touches no globals, and its record shapes are documented in the module
- [ ] `make test` passes
