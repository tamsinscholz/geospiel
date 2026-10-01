# 01 — Vendor the Gewässer & Städte data

**What to build:** All the data the two new modes need, plus the paperwork that comes with
it, without changing the app. After this ticket the files exist, are tested and can be
checked by eye in `tools/data-review.html`, and the licence and credits are in place.

- **`tools/vendor-landmark-data.sh`**: a one-off, by-hand script in the style of
  `tools/vendor-germany-data.sh` (bash, curl, `npx -y mapshaper@0.7.70`, cache in
  `tools/.cache/`, descriptive User-Agent). It writes `data/gewaesser.topo.json` (objects
  `rivers`, `lakes`) and `data/staedte.json` (GeoJSON points). The pinned Wikidata and OSM
  ids are those in the spec's pool tables. The rules from research are not optional:
  - **pinning**: fail unless each Wikidata query returns exactly the expected OSM
    object(s). Weiße Saar, Aller Schleuse and the Main/Inn riverbank multipolygons are
    the known traps.
  - rivers: `type=waterway` relations only, `main_stream`/untagged members only, clipped
    to the Germany outline buffered by 5 km
  - lakes kept **whole** (no clip), and the Schweriner See = Außensee + Innensee
    (relation 21142)
  - simplify by `interval=200` (metres), not a percentage
  - Overpass answers HTTP 200 with an HTML error when busy, so check the body is JSON,
    retry with back-off, and keep batches small
- **`data/landmarks.json`**: hand-curated per the spec's record shapes. Names and articles
  are curated (never OSM tags). `length_km`, `area_km2` and `max_depth_m` come from
  Wikidata and are checked against de.wikipedia; Wikidata has unit errors, so check each
  value. `population` comes from the Destatis "Städte" table, Gebietsstand 31.12.2024.
- **`data/landmark-aliases.json`**: pool features only, per the spec's "Answer matching
  and aliases".
- **Tests**: extend `test/data.test.mjs` and add `test/landmark-aliases.test.mjs` as the
  spec's "Testing Decisions" list them, except the `matchLandmark` article-stripping
  assertions, which need ticket 02. Until then, the aliases test checks reachability
  through `matchBundesland` with the bare names. Ticket 02 or 03 adds the
  article-stripping assertions.
- **`tools/data-review.html`**: the landmark section from the spec's "Developer tooling".
- **Paperwork** (ADR 0002):
  - rewrite `SOURCES.md` §3/§4 for the vendored data (sources, pinning, processing,
    sizes, licence)
  - amend §1 ("clipping the rivers")
  - add the Wikidata (CC0) and Destatis city sources and the licence summary rows
  - close gaps 3 and 4, pointing at the ADRs
  - add the ODbL entry to `LICENSE`'s "Third-party material"
  - add the OSM credit to `#settings-credits`, short and full wording per the spec,
    with the link
  - update `CLAUDE.md`'s file table for the new files

Reference: `.scratch/gewaesser-staedte/spec.md`: "The feature pool", "Data files", "Data
pipeline", "Licence and credits", "Answer matching and aliases", "Developer tooling",
"Testing Decisions". `docs/adr/0001-*`, `docs/adr/0002-*`.

**Blocked by:** none. It can run in parallel with 02.

**Status:** ready-for-agent

### Acceptance criteria

- [ ] `tools/vendor-landmark-data.sh` regenerates both OSM files from scratch (cache cleared) and fails loudly on a pinning mismatch. **Report** the result of temporarily un-pinning the Saar or Aller check, or explain how the failure path was exercised
- [ ] `data/gewaesser.topo.json` has exactly 18 `rivers` and 11 `lakes` geometries, ids per the spec; `data/staedte.json` has exactly 24 points
- [ ] Rivers are clipped to Germany + 5 km and contain no side arms; the Bodensee is whole; the Schweriner See includes the Innensee
- [ ] File sizes reported; the two OSM files together are well under the Kulisse's 542 KB
- [ ] `data/landmarks.json` has a record for every feature, with the spec's fields; every number has been checked against de.wikipedia or Destatis, and the ticket's Comments list any value where the sources disagreed and which one was kept
- [ ] Each capital's `name` equals `bundeslaender.json`'s `capital` for its Bundesland
- [ ] `data/landmark-aliases.json` covers every pool feature (German name, short forms, the exonyms listed in the spec) and nothing else
- [ ] Data tests: id agreement between geometry and metadata, counts, articles, capitals, city-in-Bundesland, lake-centroid-in-Bundesland, rivers within the buffered bounds
- [ ] Alias tests: reachability, no background/missing targets, the normalised-key collision check, the 53-name cross-check, Main/Mainz and Elbe/Ems distinct, no name starting with an article
- [ ] `tools/data-review.html` shows the landmarks labelled, pool vs background distinguishable, with the metadata table and the hit-radius toggle. **Verified by opening it in a browser**: report what was checked
- [ ] `SOURCES.md`, `LICENSE`, the Einstellungen credits (short and full, with link) and `CLAUDE.md` updated; credits **verified in the browser**
- [ ] The four existing modes are unchanged (no landmark layers drawn anywhere yet)
- [ ] `make test` passes
