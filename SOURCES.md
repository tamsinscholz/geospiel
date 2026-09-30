# Data Sources

Provenance and licensing for every piece of geodata and metadata used by this game.
Each entry records where the data came from, how it is processed, and under what licence
it may be redistributed.

**Status:** sections 1, 2 and 5 cover the like-for-like Bundesland quiz specified in
`.scratch/bundesland-quiz/spec.md`. Sections 3 and 4 (hydrography and cities) are for
the fifth game mode — naming geographic features — and are not needed yet.

**Keying:** all data is keyed by **ISO 3166-2 subdivision code** (`DE-BW`, `DE-BY`, …),
per the spec. Sources that use other schemes are normalised on the way in.

**No build step, no npm.** The app stays openable as a static page — the project's
"no build process, no npm required" property is preserved. The processing recipes below
are one-off data-preparation steps, run by hand only when data needs regenerating (via
`npx` or a system install of the tool, never as a project dependency); their committed
JSON output is what the app fetches at runtime. This is how the world quiz's generated
click-target data was produced and committed, and it keeps the tooling off the critical
path for running or changing the game.

---

## 1. Germany outline

Not fetched separately. Derived by dissolving the 16 Bundesland polygons from §2 and
buffering the result by 5 km.

| | |
|---|---|
| **Method** | `topojson-client`'s `merge()` over the 16 polygons, then `mapshaper -buffer 5km` |
| **Used for** | Clipping the hydrography and city layers (§3, §4) to Germany |
| **Licence** | Inherits Eurostat GISCO terms from §2 |

The 5 km buffer means features that cross the border (the Rhein, the Oder, Bodensee) are
retained slightly beyond the national boundary rather than being cut flush at it.

---

## 2. Bundesländer boundaries

The 16 federal states — the core geometry for every game mode.

| | |
|---|---|
| **Source** | Eurostat GISCO, NUTS-1 regions, 1:10M scale, EPSG:4326, 2021 release |
| **URL** | <https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2021_4326_LEVL_1.geojson> |
| **Filter** | `CNTR_CODE=DE` — yields exactly 16 features |
| **Processing** | Filter to Germany → map NUTS-1 code to ISO 3166-2 key → `mapshaper -explode -simplify 10% keep-shapes -clean -dissolve` → convert to TopoJSON |
| **Licence** | ⚠️ **Eurostat attribution text has not been written yet — known gap.** Add it when vendoring. |

**Key mapping.** GISCO identifies these features by NUTS-1 code, which does not match
the ISO 3166-2 key the game uses. The translation belongs in the single `featureId()`
function the spec calls for, so exactly one place in the code knows how the source spells
its identifiers:

| NUTS-1 | ISO 3166-2 | Bundesland |
|---|---|---|
| `DE1` | `DE-BW` | Baden-Württemberg |
| `DE2` | `DE-BY` | Bayern |
| `DE3` | `DE-BE` | Berlin |
| `DE4` | `DE-BB` | Brandenburg |
| `DE5` | `DE-HB` | Bremen |
| `DE6` | `DE-HH` | Hamburg |
| `DE7` | `DE-HE` | Hessen |
| `DE8` | `DE-MV` | Mecklenburg-Vorpommern |
| `DE9` | `DE-NI` | Niedersachsen |
| `DEA` | `DE-NW` | Nordrhein-Westfalen |
| `DEB` | `DE-RP` | Rheinland-Pfalz |
| `DEC` | `DE-SL` | Saarland |
| `DED` | `DE-SN` | Sachsen |
| `DEE` | `DE-ST` | Sachsen-Anhalt |
| `DEF` | `DE-SH` | Schleswig-Holstein |
| `DEG` | `DE-TH` | Thüringen |

⚠️ This mapping is written from the published NUTS 2021 classification and should be
checked against the actual fetched properties when the data is vendored.

---

## 3. Rivers and lakes (hydrography)

*For the fifth game mode. Not used by the four modes in the current spec.*

| | |
|---|---|
| **Source** | OpenStreetMap, via the Overpass API (<https://overpass-api.de/api/interpreter>) |
| **Query key** | **Wikidata ID, not name.** Name-based queries return wrong features — there is more than one "Oder". |
| **Contents** | Relations/ways for 10 pool rivers, 7 pool lakes, 8 background rivers, 4 background lakes |
| **Processing** | Clip to the buffered Germany boundary from §1 → `mapshaper -simplify 10%` → convert to TopoJSON |
| **Licence** | © OpenStreetMap contributors, **ODbL v1.0** — <https://www.openstreetmap.org/copyright>, <https://opendatacommons.org/licenses/odbl/> |

**ODbL is share-alike.** The vendored TopoJSON is a derivative database and must itself
be distributed under ODbL, with attribution to OpenStreetMap contributors shown in the
app. This is the only copyleft obligation in this file, and it constrains how the
finished game may be licensed — worth settling before the fifth mode is built, not
during it.

**Natural Earth was evaluated and rejected.** `ne_10m_rivers_lake_centerlines` and
`ne_10m_rivers_europe` have missing or truncated German rivers — the Rhein is cut off,
the Donau's German stretch is absent, among others. This finding is worth recording as an
ADR in this repo if the fifth mode proceeds, so the rejection is not silently revisited.

---

## 4. Cities

*For the fifth game mode. Not used by the four modes in the current spec.*

| | |
|---|---|
| **Source** | OpenStreetMap via Overpass — same pipeline as §3, fetched as point nodes keyed by Wikidata ID |
| **Licence** | © OpenStreetMap contributors, ODbL v1.0 — as §3, share-alike |

**Landmark pool cities** (8):

| City | Wikidata |
|---|---|
| Köln | Q365 |
| Frankfurt am Main | Q1794 |
| Dortmund | Q1295 |
| Leipzig | Q2079 |
| Nürnberg | Q2090 |
| Mannheim | Q2119 |
| Rostock | Q2861 |
| Freiburg im Breisgau | Q2833 |

Plus the 16 Landeshauptstädte as a separate pool.

**Names come from a curated metadata list, not from OSM tags** — OSM naming is
unreliable for this purpose.

### Related: population figures

Not geodata, and from a different source with different terms:

| | |
|---|---|
| **Source** | Statistisches Bundesamt (Destatis) — "Städte (Alle Gemeinden mit Stadtrecht) nach Fläche, Bevölkerung und Bevölkerungsdichte" |
| **Gebietsstand** | 31.12.2024 |
| **URL** | <https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/05-staedte.html> |
| **Licence** | "© … Statistisches Bundesamt (Destatis), 2025. Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet." |

Reproduction and distribution, including of extracts, is permitted **with attribution**.
Destatis attribution must therefore appear in the app wherever population figures are
shown.

---

## 5. Landeswappen (coats of arms)

| | |
|---|---|
| **Source** | Wikimedia Commons — one SVG per Bundesland |
| **Processing** | `svgo --multipass` |
| **Vendored** | Manually; no fetch script |
| **Asset naming** | By ISO 3166-2 key, lowercased — `de-by.svg` |
| **Licence** | Public Domain — see the rationale and the Wappengesetz caveat below |

### Licence rationale

All sixteen are **Public Domain**, which Commons applies to official German state
insignia as a government work not eligible for copyright. The templates in use are
`{{PD-Coa}}` / `{{PD-because}}` variants; each file page carries the exact template and
reasoning. That they are *uniformly* Public Domain is a finding from checking all
sixteen, not an assumption made to save time.

### Source URLs

| Bundesland | Key | Commons file | Licence |
|---|---|---|---|
| Baden-Württemberg | `DE-BW` | [Greater_coat_of_arms_of_Baden-Württemberg.svg](https://commons.wikimedia.org/wiki/File:Greater_coat_of_arms_of_Baden-W%C3%BCrttemberg.svg) | Public Domain |
| Bayern | `DE-BY` | [Coat_of_arms_of_Bavaria.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Bavaria.svg) | Public Domain |
| Berlin | `DE-BE` | [DEU_Berlin_COA.svg](https://commons.wikimedia.org/wiki/File:DEU_Berlin_COA.svg) | Public Domain |
| Brandenburg | `DE-BB` | [DEU_Brandenburg_COA.svg](https://commons.wikimedia.org/wiki/File:DEU_Brandenburg_COA.svg) | Public Domain |
| Bremen | `DE-HB` | [Bremen_Wappen(Mittel).svg](https://commons.wikimedia.org/wiki/File:Bremen_Wappen(Mittel).svg) | Public Domain |
| Hamburg | `DE-HH` | [Wappen_der_Hamburgischen_Bürgerschaft.svg](https://commons.wikimedia.org/wiki/File:Wappen_der_Hamburgischen_B%C3%BCrgerschaft.svg) | Public Domain |
| Hessen | `DE-HE` | [Coat_of_arms_of_Hesse.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Hesse.svg) | Public Domain |
| Mecklenburg-Vorpommern | `DE-MV` | [Coat_of_arms_of_Mecklenburg-Western_Pomerania_(great).svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Mecklenburg-Western_Pomerania_(great).svg) | Public Domain |
| Niedersachsen | `DE-NI` | [Wappen_von_Niedersachsen.svg](https://commons.wikimedia.org/wiki/File:Wappen_von_Niedersachsen.svg) | Public Domain |
| Nordrhein-Westfalen | `DE-NW` | [Coat_of_arms_of_North_Rhine-Westphalia.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_North_Rhine-Westphalia.svg) | Public Domain |
| Rheinland-Pfalz | `DE-RP` | [Coat_of_arms_of_Rhineland-Palatinate.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Rhineland-Palatinate.svg) | Public Domain |
| Saarland | `DE-SL` | [Wappen_des_Saarlands.svg](https://commons.wikimedia.org/wiki/File:Wappen_des_Saarlands.svg) | Public Domain |
| Sachsen | `DE-SN` | [Coat_of_arms_of_Saxony.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Saxony.svg) | Public Domain |
| Sachsen-Anhalt | `DE-ST` | [Wappen_Sachsen-Anhalt.svg](https://commons.wikimedia.org/wiki/File:Wappen_Sachsen-Anhalt.svg) | Public Domain |
| Schleswig-Holstein | `DE-SH` | [DEU_Schleswig-Holstein_COA.svg](https://commons.wikimedia.org/wiki/File:DEU_Schleswig-Holstein_COA.svg) | Public Domain |
| Thüringen | `DE-TH` | [Coat_of_arms_of_Thuringia.svg](https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Thuringia.svg) | Public Domain |

Note that several of these are the *greater* or *mid-level* Wappen rather than the small
version (Baden-Württemberg, Mecklenburg-Vorpommern, Bremen), and Hamburg's is the Wappen
der Hamburgischen Bürgerschaft. They are therefore not visually uniform in complexity —
worth checking they all read clearly at the ~56px the spec renders them at.

### Wappengesetz caveat — read before use

**German law restricts the use of official state insignia.** Each Bundesland's
Wappengesetz (state insignia law) governs who may use its Landeswappen and how, chiefly
to prevent unauthorised use that implies official or governmental status.

Vendoring these sixteen files here is for a **private, non-official learning app**: no
commercial use, no claim of official status, and no implication of endorsement by any
Bundesland or its government. This is not legal advice about where that line sits for
other uses — it is a note for a future maintainer about why the files are here and under
what understanding.

---

## Licence summary

| Data | Licence | Attribution required? | Share-alike? |
|---|---|---|---|
| Germany outline (§1) | Inherits §2 | Inherits §2 | No |
| Bundesländer (§2) | Eurostat GISCO | ⚠️ Yes, text not yet written | No |
| Rivers & lakes (§3) | ODbL v1.0 | **Yes** — OpenStreetMap contributors | **Yes** |
| Cities (§4) | ODbL v1.0 | **Yes** — OpenStreetMap contributors | **Yes** |
| Population (§4) | Destatis terms | **Yes** — Statistisches Bundesamt | No |
| Landeswappen (§5) | Public Domain | No (Wappengesetz caveat applies) | No |

---

## Gaps

**Blocking the current spec (§2, §5):**

1. **Eurostat GISCO attribution text has not been written.** Needed before shipping.
2. **The NUTS-1 → ISO 3166-2 mapping in §2 is written from the published classification,
   not from the fetched file.** Verify against the actual feature properties when
   vendoring.

**Blocking only the fifth mode (§3, §4):**

3. **ODbL share-alike has not been reconciled with this repo's `LICENSE`.** Vendoring the
   hydrography and city data obliges the derived database to ship under ODbL with visible
   OSM attribution.
4. **The Natural Earth rejection (§3) should be written up as an ADR** in this repo if the
   fifth mode proceeds, so it is not silently revisited.
