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

**Status:** ready-for-agent

### Acceptance criteria

- [ ] Round start: target orange (rivers 4 px with white casing; lakes filled; city dot 6 px), ring around lakes and cities, gentle travel capped at 1.8× (long rivers barely move); input focused after 800 ms
- [ ] The prompt asks by type; Landeshauptstädte use "Welche Stadt ist markiert?"; placeholder "Name eingeben …"
- [ ] Accepted: the name, with or without the article, a wrong article, the aliases (Rhine, Lake Constance, Cologne, Frankfurt, Freiburg, Schwäbisches Meer, …); "Berlin" for `city-berlin`
- [ ] Wrong → "Falsch – noch {n} Versuch(e)", field cleared and refocused; empty → ignored; out of Versuche → "Keine Versuche mehr – es war {article name}"
- [ ] Feedback: the prompt shows "{article} {name}", the info panel per type, travel to the target
- [ ] The ring stays 18 screen px through the zoom transition (observed mid-transition)
- [ ] Score history under `geospiel-stats-name-landmark`
- [ ] The other five modes are unchanged
- [ ] `docs/game-flow.md`, `docs/ui-components.md` and `CLAUDE.md` updated
- [ ] `make test` passes
- [ ] **Verified by driving the app** at 1440×900 and 400×800. Report observed values for:
  - the zoom scale reached for Rhein, Dümmer and Mainz
  - the ring's radius mid-transition and at rest
  - accepted and rejected inputs, including "die Rhein" and "der"
  - a full game with the default toggles
