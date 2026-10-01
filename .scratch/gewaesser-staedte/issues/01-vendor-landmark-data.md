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

**Status:** done

### Acceptance criteria

- [x] `tools/vendor-landmark-data.sh` regenerates both OSM files from scratch (cache cleared) and fails loudly on a pinning mismatch. **Report** the result of temporarily un-pinning the Saar or Aller check, or explain how the failure path was exercised
- [x] `data/gewaesser.topo.json` has exactly 18 `rivers` and 11 `lakes` geometries, ids per the spec; `data/staedte.json` has exactly 24 points
- [x] Rivers are clipped to Germany + 5 km and contain no side arms; the Bodensee is whole; the Schweriner See includes the Innensee
- [x] File sizes reported; the two OSM files together are well under the Kulisse's 542 KB
- [x] `data/landmarks.json` has a record for every feature, with the spec's fields; every number has been checked against de.wikipedia or Destatis, and the ticket's Comments list any value where the sources disagreed and which one was kept
- [x] Each capital's `name` equals `bundeslaender.json`'s `capital` for its Bundesland
- [x] `data/landmark-aliases.json` covers every pool feature (German name, short forms, the exonyms listed in the spec) and nothing else
- [x] Data tests: id agreement between geometry and metadata, counts, articles, capitals, city-in-Bundesland, lake-centroid-in-Bundesland, rivers within the buffered bounds
- [x] Alias tests: reachability, no background/missing targets, the normalised-key collision check, the 53-name cross-check, Main/Mainz and Elbe/Ems distinct, no name starting with an article
- [x] `tools/data-review.html` shows the landmarks labelled, pool vs background distinguishable, with the metadata table and the hit-radius toggle. **Verified by opening it in a browser**: report what was checked
- [x] `SOURCES.md`, `LICENSE`, the Einstellungen credits (short and full, with link) and `CLAUDE.md` updated; credits **verified in the browser**
- [x] The four existing modes are unchanged (no landmark layers drawn anywhere yet)
- [x] `make test` passes

## Comments

**Implementation notes (implementing agent, 2026-10-01).** Uncommitted, for review.

**Pipeline run.** `tools/vendor-landmark-data.sh` was run with `tools/.cache/landmarks/`
removed; it finished in 5 min 38 s. Overpass answered HTTP 429 once and 504 six times;
each was retried with the back-off. It pinned all 53 features, dropping the known traps
explicitly:

```
pinned river-main: kept relation/412876; dropped traps relation/6274126
pinned river-inn: kept relation/406437; dropped traps relation/4621343
pinned river-aller: kept relation/123707; dropped traps relation/15004441, relation/15004494
pinned lake-schweriner-see: kept relation/1104680, relation/21142; dropped traps relation/282711
pinned 53 features: 18 rivers, 11 lakes, 24 cities
```

How pinning works: each row in the script lists the objects that carry the Wikidata tag
and are kept, the objects pinned by OSM id only (Innensee 21142), and the known traps. The
query returns every relation with the tag (for lakes, relations and ways), and the result
must be exactly kept ∪ traps. River *ways* carry the river's tag by the hundred, so they
are not part of the query. A `type=waterway` filter alone would not catch the Aller
Schleuse relations, which are `type=waterway` themselves. Research also turned up a new
trap: the Schweriner See has a `type=site` relation, 282711, with the same Q-id.

**Deviation: the city pin query is restricted to `place=city`.** The first run failed on
a real-world mismatch: `city-stuttgart (Q1022): Overpass returned [node/12288961790,
node/1674026139] … unexpected: node/12288961790`. That node is a parking-ticket machine
tagged `wikidata=Q1022`. The spec's rule is "`place=city` nodes, one per Wikidata id", so
the city query now filters on `place=city`, and the pin still requires exactly one node.

**Pinning failure path, exercised on purpose** (warm cache, script restored afterwards,
outputs byte-identical):
- Aller with its traps un-pinned: exit 1, nothing written:
  ```
  PINNING FAILED — Overpass no longer returns exactly the pinned OSM objects:
    river-aller (Q1967803): Overpass returned [relation/123707, relation/15004441, relation/15004494], pinned [relation/123707]; unexpected: relation/15004441 "Aller Schleuse" type=waterway, relation/15004494 "Aller Schleuse" type=waterway
  Check the objects on openstreetmap.org, then update the pinned row in tools/vendor-landmark-data.sh.
  ```
- Main pinned to a wrong id (412877): `river-main (Q1670): Overpass returned
  [relation/412876, relation/6274126], pinned [relation/412877, relation/6274126];
  unexpected: relation/412876 "Main" type=waterway; missing: relation/412877`.

**File sizes.** `data/gewaesser.topo.json` is 216,953 B raw and 64,062 B gzipped.
`data/staedte.json` is 2,823 B raw and 545 B gzipped. Together they are about 220 KB, or
65 KB gzipped, against the Kulisse's 541,893 B (182,633 B gzipped).

**Geometry checks.**
- The lake areas computed from the vendored polygons agree with the curated areas within
  a few percent. The Bodensee measures 532.9 km² (published 536), so it is whole: it
  runs from 8.86 to 9.75°E, i.e. Stein am Rhein to Bregenz. The Schweriner See measures
  62.1 km² in 2 parts (published 61.54), so the Innensee is included.
- Main-stream length inside Germany + 5 km, after simplifying: Rhein 920 km, Elbe 749,
  Donau 561, Weser 441. ADR 0001's unsimplified figures were 925, 755, 578 and 449.

**Source disagreements** (Wikidata vs de.wikipedia; the de.wikipedia value is kept and
rounded to whole km, one decimal for km² and whole metres):

| Feature | Wikidata | de.wikipedia | Kept |
|---|---|---|---|
| Donau | 2850 km | 2857 | 2857 |
| Elbe | 1094.26 (pref) + 367.6 (qualified CZ) | 1094 | 1094 |
| Oder | 854 (pref) + 742 (qualified part PL) | 854 | 854 |
| Main | 524 | 527 (with the Weißer Main) | 527 |
| Havel | 325 | 334 | 334 |
| Isar | 291.50 | 292.26 | 292 |
| Lech | 248 | 256 | 256 |
| Werra | 292 | 299.6 | 300 |
| Lahn | 242 | 245.6 | 246 |
| Aller | 263 | 260 | 260 |
| Bodensee depth | 251.14 + 90 (qualified mean) | 251.14 | 251 |
| Schweriner See depth | 52.4 + 12.8 (qualified mean) | 52.4 | 52 |
| Chiemsee depth | 72 | 73.4 | 73 |
| Starnberger See depth | 127 | 127.8 | 128 |
| Großer Plöner See depth | **13.54, unqualified (really the mean depth: a Wikidata error)** | 56.2 | 56 |
| Dümmer area / depth | 13.50 / 1.50 | 12.4 / 1.4 | 12.4 / 1 |

Every other value agrees once rounded. None of the 18 rivers has a length in metres.
Rounding depths to whole metres turns the Dümmer's 1.4 m into 1 m and the Steinhuder
Meer's 2.9 m into 3 m; that is a judgement call (the precedent is `highest_point` in
§7). `bundeslaender` comes from each lake's de.wikipedia `REGION-ISO` (Bodensee:
`CH-SG/DE-BW/DE-BY/AT-8/…` → `DE-BW`, `DE-BY`). The full table is in `SOURCES.md` §3.

**Population source.** All 24 values come from the specified table: Destatis
`05-staedte.xlsx` (Deckblatt: "Gebietsstand: 31.12.2024, Erscheinungsmonat: September
2025"), downloaded 2026-10-01 from the 05-staedte page, column "Bevölkerung … insgesamt".
Each city matched exactly one row. `bundesland` comes from the row's Regionalschlüssel
prefix and agrees with the spec. No value comes from anywhere else.

**Test deviation.** The Bodensee's centroid (9.3769°E, 47.6130°N) lies in the open
Obersee, which no GISCO Bundesland polygon covers because the lake has no agreed border.
The centroid test therefore accepts a centroid in *no* Bundesland when the nearest
Bundesland is one the lake lists (BW here). A separate test pins the Bodensee as the only
such lake. A centroid inside a *wrong* Bundesland still fails.

**Aliases.** 103 keys over the 41 pool features. Until `matchLandmark` exists they are
tested through `matchBundesland` with bare names; the article-stripping assertions are
left for ticket 02/03, as the ticket says.

**Review (coordinating session, 2026-10-01).** Verified independently before merge:
`make test` 108/108; 18 rivers / 11 lakes / 24 points with the spec's ids; 53 records,
41 pool, capitals equal `bundeslaender.json`; 103 aliases, all on pool ids. All 24
populations matched against `05-staedte.xlsx` (one row each, Regionalschlüssel agrees).
Headless Chrome: data-review draws 18+11+24 features with 53 labels, pool/background
coloured apart, 53-row table, hit-radius halos; rivers single-stream and clipped at the
border, Bodensee whole. Einstellungen credits short/full text and the OSM link
(`target=_blank`, `rel=noopener`) as specified at 400×800; all four existing modes draw
only Kulisse/Bundesland/hit groups and load only the four original data files.
