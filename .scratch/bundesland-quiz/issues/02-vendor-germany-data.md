# 02 — Vendor the Germany data

**What to build:** Every piece of data the Germany game needs, committed as static files,
plus the closing of the two provenance gaps that block the spec.

This is the one ticket in this breakdown that ships no user-visible behaviour. It is
split out deliberately: it needs external fetches, sixteen image downloads and around
ninety-six researched facts, and it is the only piece that cannot be verified by playing
the game. Everything downstream depends on its output existing and being correctly
keyed.

Four outputs:

1. **Bundesländer geometry** — the 16 federal states as TopoJSON, keyed by ISO 3166-2
   (`DE-BW` … `DE-TH`). Source and processing recipe are in `SOURCES.md` §2. GISCO
   supplies NUTS-1 codes, so the NUTS→ISO mapping has to be applied on the way in.
2. **Kulisse geometry** — the neighbouring countries' land, for the muted non-interactive
   surround. Enough to fill the letterboxed margins either side of Germany at the fitted
   extent.
3. **The 16 Landeswappen** — from the Commons files listed in `SOURCES.md` §5, through
   `svgo --multipass`, named by the ISO key lowercased.
4. **Bundesland metadata** — for all 16: name, Landeshauptstadt, Fläche, Einwohner,
   höchster Punkt (name and elevation), and Nachbarländer count.

Per `SOURCES.md`, generation is a **one-off preparation step**, not a build step. Run the
tooling by hand, commit the output, and do not add a project dependency — the app must
still open as a static page with no npm.

Reference: `SOURCES.md`, and `.scratch/bundesland-quiz/spec.md` — "Bundesland identity".

**Blocked by:** None — can start immediately. Runs in parallel with 01.

**Status:** done — landed with commit "Vendor the Germany data for the Bundesland quiz"

### Acceptance criteria

- [x] The Bundesländer geometry contains **exactly 16** features, each keyed by its ISO 3166-2 code
- [x] The NUTS-1 → ISO 3166-2 mapping is verified against the **actually fetched** feature properties, not the published classification, and the warning on that table in `SOURCES.md` is removed
- [x] Eurostat GISCO attribution text is written into `SOURCES.md`, closing the gap flagged there
- [x] Kulisse geometry exists, covers the surround at the fitted Germany extent, and does not duplicate German territory
- [x] All 16 Landeswappen are vendored, run through `svgo`, and named by the ISO key lowercased
- [x] Each Wappen is checked to **read clearly at roughly 56px** — several are the greater or mid-level arms and are not uniform in complexity; report which ones needed a simpler variant, if any
- [x] Metadata exists for all 16 with every field populated: name, Landeshauptstadt, Fläche, Einwohner, höchster Punkt (name and metres), Nachbarländer count
- [x] Nachbarländer counts are sanity-checked against the Stadtstaaten, which are the easy ones to get wrong: Berlin has 1, Bremen has 1, Hamburg has 2
- [x] A structural check confirms the three sets agree: every geometry key has metadata and a Wappen, every metadata key has geometry, and there are no orphans in either direction
- [x] Population and area figures carry their source and reference date, so they can be refreshed later without re-deriving where they came from
- [x] **No npm dependency is added to the project** and no build step is introduced; the generation recipe is documented well enough to re-run by hand
- [x] `make test` still passes
