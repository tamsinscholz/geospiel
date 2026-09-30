# 07 — Retire the world artifacts and update the docs

**What to build:** Delete what the world quiz left behind, and make every document in the
repo describe the game that now exists.

By this point the Germany game is complete and the world data files are dead weight —
still committed, still described in the README as though they were live. A reader
arriving at the repo would be told about country flags from a CDN, a world-atlas
TopoJSON fetch and a Python script for small country click targets, none of which the
app touches any more.

The documentation is the substance of this ticket, not the deletions. Four files describe
the app in detail and all four are now wrong in ways that would actively mislead: the
file inventory, the mode list, the data flow, the projection, the panel layout, the
key patterns. They are the spec an implementing agent and any future reader treats as
authoritative, so leaving them stale is worse than having no docs.

Reference: `.scratch/bundesland-quiz/spec.md`, `SOURCES.md`.

**Blocked by:** 04, 05, 06.

**Status:** done — landed with commit "Retire the world quiz artifacts and document the Germany game"

### Acceptance criteria

- [x] `countries.json`, `aliases.json`, `small_targets.json` and `create_small_target_map.py` are deleted
- [x] No reference to any deleted file, to the world-atlas CDN fetch, or to flagcdn.com remains anywhere in the code or docs
- [x] `README.md` describes the German game: what it is, the quickstart, the four modes, and a pointer to `SOURCES.md` for data provenance and licensing rather than restating it
- [x] `README.md` no longer claims a small-country click-target overlay or a regeneration script
- [x] `docs/game-flow.md` is rewritten for the four German modes, with the German strings the app actually shows, the 1–16 Runden range, the gentle zoom, and the corrected state-machine summary
- [x] `docs/ui-components.md` is updated for the Landeswappen box, the Kulisse layer, the viewBox and pan clamp, the scale range, and the German labels
- [x] The repo `CLAUDE.md` is updated: file inventory, the four modes, the data flow, ISO 3166-2 keying, the projection and pan clamp, and `make` as the preferred entry point
- [x] Attribution required by `SOURCES.md` is actually present in the app — Eurostat for the geometry, and Destatis wherever population figures are shown
- [x] The `LICENSE` file is consistent with what is now shipped, or the discrepancy is recorded if it needs a decision
- [x] `make test` passes and the app still plays through all four modes
- [x] **Verified by driving the app, not by self-report:** confirm nothing broke from the deletions — report a full round played in each of the four modes
