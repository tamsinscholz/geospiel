# 0002 — OpenStreetMap data: separate ODbL files, credited on the Einstellungen screen

**Status:** accepted (2026-09-30)

## Context

The Gewässer & Städte modes use river, lake and city geometry from OpenStreetMap
(ADR 0001). OSM data is under the **Open Database License (ODbL) 1.0**:

- **Share-alike** applies to a *Derivative Database*. The TopoJSON/GeoJSON we derive
  from OSM and publish in this repo is one, so it must be offered under ODbL.
- A *Produced Work* (here: the rendered map in the app) need not be ODbL, but must carry
  a notice that it uses OSM data.
- The repo `LICENSE` is CC BY-NC 4.0 with a "Third-party material" section for data that
  is not Krautlabs' own (`SOURCES.md` gap 6).

The OSMF Attribution Guidelines
(<https://osmfoundation.org/wiki/Licence/Attribution_Guidelines>, read 2026-09-30) say:

- For a browsable map, the credit "should typically appear in a corner of the map".
- The credit may collapse after 5 s, on map interaction, or on dismissal, if it stays
  reachable.
- "If attribution is presented to the user upon application startup, it does not need to
  be presented to the user every time the user looks at or interacts with the
  application."

The app's existing credits (GISCO, Destatis) sit only on the Einstellungen screen, by the
maintainer's choice (`SOURCES.md` gap 5): an always-on corner credit and later an ⓘ button
were both tried and found distracting.

## Decision

1. **Separate files.** OSM-derived data lives only in its own files:
   - `data/gewaesser.topo.json` (rivers and lakes)
   - `data/staedte.json` (city points)

   It is never merged into the GISCO topology. Those two files are under ODbL 1.0,
   © OpenStreetMap contributors.
   - The hand-curated `data/landmarks.json` holds names, articles, types, pool flags,
     facts, Wikidata and OSM ids. Facts come from Wikidata (CC0) or Destatis; names and
     articles are curated, not taken from OSM tags. It and `data/landmark-aliases.json`
     are not OSM-derived.
2. **`LICENSE`** gets a third-party entry naming the two OSM files as ODbL 1.0,
   © OpenStreetMap contributors, with the licence URL.
3. **Credit placement.** The OSM credit joins the existing credits on the **Einstellungen
   screen**:
   - short note: "© OpenStreetMap"
   - full wording: "Gewässer und Städte: © OpenStreetMap-Mitwirkende, ODbL", with
     "OpenStreetMap" linking to <https://www.openstreetmap.org/copyright>

   Einstellungen opens before every quiz game, so the credit is shown at the start of
   every game that displays OSM data. That is the maintainer's reading of the
   guideline's "upon application startup" provision.
4. **Erkunden.** The OSM layers stay out of Erkunden until Erkunden gets its own credit
   (planned, not yet specified).

   *Amended 2026-10-06:* Erkunden gets its own Einstellungen screen, which opens before
   every Erkunden session and carries the same credits, the OpenStreetMap line included
   (`.scratch/erkunden-landmarks/issues/01-erkunden-einstellungen-and-layers.md`). That
   is the same reading of "upon application startup" as for the quiz modes, so the
   condition is met. Erkunden may draw the OSM layers, and only those its Einstellungen
   switch on.

## Consequences

- The rest of the repo keeps CC BY-NC. Share-alike reaches only the two OSM files.
  Anyone may take those two files under ODbL alone.
- The credit is not on the map during play. That departs from the guideline's "corner of
  the map" wording, deliberately, as the GISCO credit already does. If OSMF or a user
  objects, the fallback is a corner credit that fades after 5 s (the guideline's own
  collapse rule), shown only while OSM layers are drawn.
- Adding OSM layers to any other screen (Erkunden first) requires a credit on that screen
  in the same change.
- Changing the OSM files' content (re-vendoring) keeps them ODbL. Hand edits to them are
  derivative work and are ODbL as well.
