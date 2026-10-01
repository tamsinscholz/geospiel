# 0001 — Natural Earth rejected for rivers and lakes

**Status:** accepted (2026-09-30)

## Context

The Gewässer & Städte modes (`.scratch/gewaesser-staedte/spec.md`) need river and lake
geometry for Germany in which each feature has one correct name and the right extent:
a round that highlights "the Weser" must highlight the Weser, not the Weser plus a
tributary.

Natural Earth is the obvious first candidate: public domain (no attribution, no
share-alike), small, already generalised, and the world quiz this game replaced was
built on it. OpenStreetMap is the alternative, under ODbL (see ADR 0002).

`SOURCES.md` §3 first recorded Natural Earth as rejected because "the Rhein is cut off,
the Donau's German stretch is absent". When this ADR was written that claim was
re-checked, and it does **not** reproduce against the current release. The evidence
below replaces it.

## Evidence

Natural Earth **5.0.0**, `ne_10m_rivers_lake_centerlines` and `ne_10m_rivers_europe`
(downloaded from `naciscdn.org` on 2026-09-30), clipped to the Germany outline buffered by
5 km (`SOURCES.md` §1). It was compared with the OSM `type=waterway` relations for the same
rivers, clipped the same way (main stream only):

| River | OSM, km in DE+5 km | NE centerlines | NE europe | Problem |
|---|---|---|---|---|
| Rhein | 925 | 868 | — | Present (four segments) |
| Donau | 578 | 543 | — | Present |
| Elbe | 755 | 614 | — | Stops at Hamburg (53.55°N): no Unterelbe to Cuxhaven (OSM 53.99°N) |
| Weser | 449 | 601 | — | **Mislabelled**: runs south to 50.41°N, i.e. includes the Werra (the Weser starts at Hann. Münden, 51.42°N) |
| Aller | 257 | — | 388 | **Mislabelled**: runs south to 51.38°N, i.e. includes the Leine |
| Spree | 379 | — | 434 | **Mislabelled and fragmented**: reaches 12.04°E (Havel stretches), split into seven pieces |
| Neckar | 363 | — | 269 | Only in the Europe file, 74% of the length |
| Havel, Lahn, Lech, Werra, Leine, Altmühl | 349, 246, 189, 300, 275, 233 | — | — | **Absent** under their own names |

The pool rivers are also split across two files with different attribute schemas and
`scalerank` generalisations.

## Decision

Rivers and lakes come from **OpenStreetMap via the Overpass API**, queried by Wikidata ID and
pinned to OSM relation ids (spec, "Data pipeline"). Natural Earth is not used for
hydrography.

## Consequences

- The geometry is ODbL share-alike, which brings the obligations handled in ADR 0002.
- A one-off vendoring script and a larger download (Overpass, ~8 MB raw) replace a single
  public-domain shapefile. The output is still committed TopoJSON and needs no build step.
- **Revisit only if** a later Natural Earth release names the Weser, Aller and Spree with
  their true extents and carries the Havel, Werra, Lahn and Lech. Re-run the comparison
  above. A shorter Donau or Rhein alone would not be a reason to switch back.
