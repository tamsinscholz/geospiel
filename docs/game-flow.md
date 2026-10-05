# Game Flow

What the user does and what the app shows at each stage. All user-visible text is German;
strings are quoted exactly as the app shows them (`index.html`, `main.js`).

---

## 0. The map (every stage)

- Germany divided into its sixteen Bundesländer, fitted to the viewport and centred at any
  window size. Resizing re-fits it with no JS resize handler (fixed SVG `viewBox`).
- Around it, the **Kulisse**: the neighbouring countries in a muted fill. It is scenery
  only and never highlights, never counts as a click, and is never an answer.
- Pan and zoom by drag, scroll wheel or pinch, in every mode. The scale range is 1×–6×,
  where 1× is the full-Germany view. Panning is clamped to Germany plus a thin margin,
  widened at the top and bottom by the panels showing there (the game panel and the
  bottom stack, during a quiz round): Germany's edges can be pulled out from under them,
  even at 1×. With no panels (the menu, Erkunden) the map cannot move at 1×. At rest the
  overview is the same either way.
- **Touch halo:** on touch or narrow screens (`(pointer: coarse), (max-width: 600px)`),
  the three Bundesländer under 1,000 km² (Berlin, Bremen, Hamburg) also catch taps up to
  about 10 screen px outside their outline. A tap there counts as a tap on that
  Stadtstaat in every mode. With a mouse on a wide screen the halo is inactive.
- **Gewässer & Städte** (landmark modes only, while playing or in feedback): 18 rivers,
  11 lakes (drawn above the rivers) and 24 city dots, every one of them whether or not it
  can be asked, all drawn alike. The Bundesländer turn a lighter grey there and stop
  reacting to the pointer. Lines and dots stay the same size on screen at every zoom.
  The layers are never drawn in Erkunden, in the Bundesland modes or behind the menu.

---

## 1. Menu (`data-screen="select"`)

**What the user sees:**
- Full-screen overlay titled "Deutschland-Quiz" (also the page title), with the map
  behind it.
- Mode cards in a 2-column grid (one column at ≤600px):

| Card | Icon | Label | Description | `data-mode` |
|---|---|---|---|---|
| Explore | 🗺️ | Erkunden | "Karte erkunden und Fakten entdecken" | `explore` |
| Find | 🔍 | Bundesland finden | "Das richtige Bundesland auf der Karte anklicken" | `find` |
| Name | ✏️ | Bundesland benennen | "Den Namen des markierten Bundeslandes eingeben" | `name-bundesland` |
| Capital | 🏛️ | Landeshauptstadt benennen | "Die Landeshauptstadt des Bundeslandes eingeben" | `name-capital` |
| Find landmark | 🌊 | Gewässer & Städte finden | "Flüsse, Seen und Städte auf der Karte anklicken" | `find-landmark` |
| Name landmark | 🏞️ | Gewässer & Städte benennen | "Den markierten Fluss, See oder die markierte Stadt benennen" | `name-landmark` |

  Six cards in three rows.

- Footer: "Quellcode auf GitHub" (links to `https://github.com/jan-scholz/geospiel`) ·
  "© 2026 Krautlabs Inc."

**User actions:**
- **Erkunden**: the overlay closes and Erkunden starts.
- Any quiz mode: opens the Einstellungen screen for it.

---

## 2. Erkunden (`data-mode="explore"`, `data-phase="idle"`, no screen)

**What the user sees:**
- The interactive map, and a "Beenden" button fixed top-right.

**User actions:**
- **Hover a Bundesland (mouse):** it turns orange (`.highlighted`) and the info panel
  appears at the bottom with:
  - the Landeswappen
  - the name, and "Landeshauptstadt" with the capital
  - facts: "Fläche" (km², e.g. "21.116 km²"), "Einwohner" (e.g. "6.280.793"),
    "Höchster Punkt" (e.g. "Wasserkuppe (950 m)"), "Nachbarländer" (the number of
    other Bundesländer it borders)
  - Numbers use `de-DE` formatting.
- **Mouse leaves the Bundesland:** the highlight and the panel go away.
- **Tap a Bundesland (touch):** same highlight and panel. Tapping a different Bundesland
  switches to it. Tapping the same one again, or anything that is not a Bundesland (sea,
  letterbox, Kulisse), dismisses it.
- **Beenden:** back to the menu. The zoom resets (300 ms).

---

## 3. Einstellungen (`data-screen="settings"`, quiz modes only)

**What the user sees:**
- An overlay card titled with the mode's name ("Bundesland finden",
  "Bundesland benennen", "Landeshauptstadt benennen", "Gewässer & Städte finden" or
  "Gewässer & Städte benennen").

| Setting | Control | Range | Default |
|---|---|---|---|
| "Flüsse" | toggle (landmark modes only) | on/off | on (10 pool rivers) |
| "Seen" | toggle (landmark modes only) | on/off | on (7 pool lakes) |
| "Städte" | toggle (landmark modes only) | on/off | on (8 cities that are not Landeshauptstädte) |
| "Landeshauptstädte" | toggle (landmark modes only) | on/off | off (16) |
| "Runden" | stepper (−/+) | 1–16; landmark modes: 1–selected pool size | 16; landmark modes: the pool size (25) |
| "Versuche pro Runde" | stepper (−/+) | 1–10 | 3 |
| "Automatisch weiter" | toggle | on/off | off |

- Buttons "Zurück" and "Spiel starten".
- Below them, in small muted text, the data credits "Kartengrundlage: © EuroGeographics
  bezüglich der Verwaltungsgrenzen", "Gewässer und Städte: © OpenStreetMap-Mitwirkende,
  ODbL" ("OpenStreetMap" links to its copyright page) and "Einwohner und Fläche:
  Statistisches Bundesamt (Destatis), Gemeindeverzeichnis, Stand 31.12.2024", collapsed to the short note "Karten: © EuroGeographics, © OpenStreetMap, Einwohner und Fläche: Destatis …"; a click, tap or Enter shows the full wording (`aria-expanded`), and it collapses again each time the Einstellungen screen opens.
  They appear only here, not on the map.

The values are remembered while the page is open: they are saved when a game starts and
shown again the next time this screen opens, for any mode. Runden is kept separately for
the Bundesland modes and the landmark modes; the type toggles are shared by the landmark
modes. The four toggles show only for a landmark mode (CSS off `data-settings-mode`).

- **Type toggles:** the last toggle that is on can't be switched off (the click is
  ignored). Each change moves Runden's maximum to the new pool size (Flüsse 10, Seen 7,
  Städte 8, Landeshauptstädte 16): a Runden value that was at the old maximum follows the
  new one, any other is clamped (e.g. 25 → Landeshauptstädte on → 41; 20 stays 20 until
  only Seen are left, then 7; Flüsse back on → 17).

**User actions:**
- **Zurück:** back to the menu.
- **Spiel starten:** the overlay closes and round 1 begins. The rounds are that many
  Bundesländer in random order, none repeated. The count is clamped to the Bundesländer
  that have both geometry and metadata, which is all 16. In a landmark mode the rounds
  are pool features of the selected types (with geometry), likewise random and unrepeated.

---

## 4. Playing: shared parts (`data-phase="playing"`)

**Game panel (top):**
- The Landeswappen (not in Landeshauptstadt benennen or the landmark modes, and never at
  ≤600px)
- The prompt: the Bundesland's name (hidden in Bundesland benennen); in Gewässer &
  Städte finden the feature's name with its type in small grey text under it ("Fluss",
  "See", "Stadt" or "Landeshauptstadt"); in Gewässer & Städte benennen the question by
  type: "Welcher Fluss ist markiert?", "Welcher See ist markiert?" or "Welche Stadt ist
  markiert?" (Landeshauptstädte too, so the prompt doesn't narrow the answer)
- "Punkte: n" and "Versuche: n" (the Versuche left in this round)
- Buttons "Überspringen" (only while the round is being played) and "Beenden"
- A thin progress bar along the bottom edge. At the start of a round it stands at
  rounds completed ÷ total; it moves up one step when the round reaches feedback.

**Map motion** ([ADR 0003](adr/0003-map-motion-policy-per-mode.md)): one table,
`MAP_MOTION` in `main.js`, says what the map does in each quiz mode at round start and
in feedback, and `moveMap()` carries it out. Erkunden doesn't move the map.

| Mode | Round start | Feedback |
|---|---|---|
| Bundesland finden | `overview` | `reveal` |
| Bundesland benennen | `overview` | `reveal` |
| Landeshauptstadt benennen | `fit` | `reveal` |
| Gewässer & Städte finden | `overview` | `reveal` |
| Gewässer & Städte benennen | `fit` | `reveal` |

- **`overview`:** the map stays on the full-Germany overview. If the map has moved (the
  user zoomed in or panned, or a `reveal` in feedback moved it), it returns to the
  overview (300 ms); on the untouched overview nothing moves.
- **`fit`**, the gentle travel, once per round: zoom to the target (750 ms) into the
  **visible area as it will be in feedback**: the part of the map below the game panel
  and above the feedback bar plus the info panel, so neither the input panel now nor
  the feedback stack later covers the target. The feedback stack isn't laid out while
  playing, so its height is remembered from earlier feedback at the same window size,
  for the same kind of info panel (Bundesland, river, lake, city, Landeshauptstadt; the
  largest seen, since a long answer can wrap the feedback line). A kind not seen yet
  uses the largest of the others. Before the first feedback at this window size (the
  first round of a game, or the first after a resize) it fits above the input panel
  instead, and `reveal` catches the difference. The scale fits the Bundesland, or the
  feature's projected bounds, at 0.9 of that area but is capped at 1.8× (and never
  goes below 1×), so a small target still shows most of Germany around it. Lakes and
  cities (a point has no extent) always hit the cap; the longest rivers stop short of it
  (at 1440×900: Rhein 1.28×). The target is centred in the area as far as the widened
  pan clamp allows: a target at Germany's edge (the Bodensee, Kiel) sits nearer that
  edge of the area, but clear of the panels.
- **`reveal`:** if the target is covered by the panels (the game panel, or the feedback
  bar and the info panel), the map pans, by the smallest translation that brings the
  target's bounds, plus 24 screen px (less if that is all the room there is), into the
  visible area (750 ms). The scale stays exactly as it is. A target already clear
  doesn't move the map at all. See section 10.
- **`none`:** the map stays where it is.

**User actions available in every quiz mode:**
- **Überspringen** (playing only): counts the round as skipped and goes straight to the
  next round (no feedback), or to the Spiel beendet screen after the last one. In
  feedback the round is already answered: the button is hidden, and `game.skip()` is a
  no-op there anyway (it returns `{ phase: 'feedback', finished: false, ignored: true }`).
- **Beenden:** ends the game right away and opens Spiel beendet. The round in progress
  counts as played.

---

## 5. Bundesland finden (`data-mode="find"`)

**Round start:** the game panel shows the target's Landeswappen and name. Nothing on the
map is highlighted, and there is no input panel.

**User actions:**
- **Click the right Bundesland:** +1 Punkt, then feedback ("Richtig!").
- **Click a wrong Bundesland:** −1 Versuch, and the clicked Bundesland flashes red for
  600 ms (`.wrong-guess`). The round continues. Clicking the same wrong one again costs
  another Versuch.
- **Last Versuch used up:** feedback ("Keine Versuche mehr – es war {Name}").
- **Click the Kulisse or the sea:** nothing happens and no Versuch is used.

---

## 6. Bundesland benennen (`data-mode="name-bundesland"`)

**Round start:**
- The game panel shows the Landeswappen. The name is hidden (`visibility: hidden`) until
  feedback.
- The target is highlighted in blue on the map (`.target`), on the overview.
- The input panel appears: a text field with the placeholder "Bundesland eingeben …" and
  the "Antworten" button. The field gets focus after 800 ms.

**User actions (Enter or "Antworten"):**
- Input and answers are compared after `normalize()`: case, spaces, hyphens and
  punctuation are ignored, `ß`→`ss`, umlauts can be typed as `ü`, `ue` or `u`. The
  typed name is looked up in `data/bundesland-aliases.json`, which has the plain names,
  official long forms ("Freistaat Bayern"), abbreviations ("NRW", "MV", "BaWü") and
  English names ("Bavaria"). "Sachsen" and "Sachsen-Anhalt" stay distinct.
- **Correct:** +1 Punkt, then feedback, which always shows the German name.
- **Wrong, Versuche left:** red inline message "Falsch – noch 2 Versuche" (singular:
  "Falsch – noch 1 Versuch"). The field is cleared and focused again.
- **Wrong, none left:** feedback ("Keine Versuche mehr – es war {Name}").
- **Empty or whitespace-only input:** ignored, no Versuch used.

---

## 7. Landeshauptstadt benennen (`data-mode="name-capital"`)

**Round start:**
- The game panel shows the Bundesland's name as the prompt. The Landeswappen is hidden.
- The target is highlighted in blue and the map zooms gently to it (section 4).
- The input panel appears with the placeholder "Landeshauptstadt eingeben …" and
  "Antworten". The field gets focus after 800 ms, once the zoom has finished.

**User actions:** as in Bundesland benennen, except that the answer is compared (after
`normalize()`) with that Bundesland's `capital` and its optional `capital_variants`
(e.g. "Munich", "Hanover"). Another Bundesland's capital is wrong. The failure message is
"Keine Versuche mehr – es war {Landeshauptstadt}".

---

## 8. Gewässer & Städte finden (`data-mode="find-landmark"`)

**Round start:** the game panel shows the target's name and type ("Main" / "Fluss"),
no Landeswappen. Nothing on the map is marked, and there is no input panel.

**How a click is read:** the click is taken to be on the drawn feature nearest to it
within 12 screen px, at every zoom (`landmark-hit.mjs`). Inside a lake counts as the lake
even where a river runs through it; anywhere on a city dot counts as the city even where
it sits on a river (Köln, Mainz, Dresden). Ties go city, then lake, then river.

**User actions:**
- **Click the right feature:** +1 Punkt, then feedback ("Richtig!").
- **Click another feature** (another pool feature, a deselected type or a background
  feature such as the Isar): −1 Versuch, the clicked feature flashes red for 600 ms, and
  a red line appears at the bottom: "Falsch – das war die Isar · noch 2 Versuche"
  (singular "noch 1 Versuch"; cities without an article: "das war Köln"). The line lets
  clicks through to the map and is cleared at the next round.
- **Last Versuch used up:** feedback ("Keine Versuche mehr – es war der Main").
- **Click on nothing within reach** (open land, sea, Kulisse, letterbox): nothing happens
  and no Versuch is used. A drag to pan is never a guess.
- **Hover (mouse only):** the feature a click would hit is tinted a faint orange. It
  shows which feature, not whether it is right. Touch has no tint.

---

## 9. Gewässer & Städte benennen (`data-mode="name-landmark"`)

**Round start:**
- The game panel asks by type: "Welcher Fluss ist markiert?", "Welcher See ist
  markiert?" or "Welche Stadt ist markiert?". No Landeswappen, no type line.
- The target is marked in orange on the map from the start: a river 4 px over a white
  casing, a lake filled, a city dot 6 px; a lake or city also gets the orange ring of 18
  screen px, which keeps its size while the map moves. The map travels gently to it
  (section 4).
- The input panel appears with the placeholder "Name eingeben …" and "Antworten". The
  field gets focus after 800 ms, once the zoom has finished.
- Map clicks and hover do nothing in this mode.

**User actions (Enter or "Antworten"):**
- The typed name is looked up (`matchLandmark`) in `data/landmark-aliases.json`, after
  one leading "der", "die" or "das" is dropped: "Rhein", "der Rhein" and even "die Rhein"
  are right. The table has the German names, short forms ("Frankfurt", "Freiburg"),
  exonyms ("Rhine", "Lake Constance", "Cologne", "Munich") and "Schwäbisches Meer"; Berlin,
  Hamburg and Bremen are the cities here. The Bundesland table is not consulted. The bare
  article ("der") matches nothing and costs a Versuch.
- **Correct:** +1 Punkt, then feedback.
- **Wrong, Versuche left:** "Falsch – noch 2 Versuche" (singular "noch 1 Versuch"); the
  field is cleared and focused again.
- **Wrong, none left:** feedback ("Keine Versuche mehr – es war das Steinhuder Meer").
- **Empty or whitespace-only input:** ignored, no Versuch used.

---

## 10. Feedback (`data-phase="feedback"`, all quiz modes)

**What the user sees:**
- The input panel is gone. In Bundesland benennen the name appears in the game panel; in
  Gewässer & Städte benennen the prompt becomes the feature with its article ("der
  Main", "Köln").
- **Feedback bar** above the info panel:
  - correct: green "Richtig!"
  - out of Versuche: red "Keine Versuche mehr – es war {Antwort}". The answer is the
    Landeshauptstadt in Landeshauptstadt benennen, the feature with its article in the
    landmark modes ("der Main", "Köln"), and the Bundesland's name otherwise.
- **Info panel** with the full facts (as in Erkunden). In the landmark modes it shows
  the feature instead, by type:

| Type | Name line | Under the name | Facts | Landeswappen |
|---|---|---|---|---|
| Fluss | "der Rhein" | — | "Länge" ("1.233 km") | none (the slot collapses) |
| See | "der Chiemsee" | — | "Fläche" ("79,9 km²", one decimal), "Größte Tiefe" ("73 m"), "Bundesland" ("Bayern"; "Baden-Württemberg, Bayern" for the Bodensee) | its Bundesland's, if it has exactly one (not the Bodensee) |
| Stadt | "Mainz" | "Landeshauptstadt von Rheinland-Pfalz" (Landeshauptstädte only) | "Einwohner" ("1.024.621"), "Bundesland" | its Bundesland's |

- The target is highlighted (`.target`) in every mode, including Bundesland finden. In
  the landmark modes it is orange (in Gewässer & Städte finden it turns orange only now) (a river 4 px over a white casing, a lake
  filled, a city dot 6 px), and a lake or city gets an orange ring of 18 screen px.
- **Map motion** (the table in section 4): no mode zooms in feedback. Bundesland
  benennen (`none`) stays where it is, which is the overview unless the user has zoomed
  in. Landeshauptstadt benennen and Gewässer & Städte benennen already travelled at
  round start, into the band feedback leaves, so from the second round of a game on
  the map doesn't move at all; in the first round (or the first after a window resize)
  it may pan a little.
- **`reveal`** (every quiz mode): if the target is covered by
  the panels (the game panel, or the feedback bar and the info panel), the map pans, by
  the smallest translation that brings the target's bounds, plus 24 screen px, into the
  visible area (750 ms); a target that fits the area but not with 24 px to spare gets
  what margin is left, split evenly. The scale stays exactly as it is: 1× in the finden
  modes, or whatever the user zoomed or the round-start travel reached. A target already clear doesn't move the map at all (Mainz, the
  Elbe, Hessen on a desktop). A target bigger than the visible area (Bayern when zoomed
  in) is panned just far enough to cover the whole area, so as much of it as possible
  shows: the edge that was in view meets the area's edge. On the overview at 1440×900
  the Bodensee moves up about 140 viewBox units, Bayern about 185. The pan clamp,
  which leaves room the height of the panels past Germany's edges, limits how far it
  can go.

**Automatisch weiter off:** a "Weiter →" button in the feedback bar, focused after
100 ms (Enter or Space advances).

**Automatisch weiter on:** there is no "Weiter →" button (hidden by CSS off
`data-auto-advance="on"`), and the next round starts after 1.8 s.

After the last round, the next step is Spiel beendet instead of a new round.

---

## 11. Spiel beendet (`data-screen="stats"`)

**What the user sees:**
- Overlay titled "Spiel beendet":

| Row | Value |
|---|---|
| "Gespielte Runden" | rounds played (a round in progress when "Beenden" was pressed counts) |
| "Richtig" | rounds answered correctly |
| "Übersprungen" | rounds skipped |
| "Punktzahl" | Richtig ÷ Gespielte Runden, as % |
| "Durchschnitt der letzten {n} Runden" | the correct ÷ rounds over the stored earlier games of this mode (singular: "Durchschnitt der letzten Runde"). Hovering it shows "Punktzahl in %: …" with the scores of up to the last 8 stored games. The row is hidden when there is no earlier game |

- "Zurück zum Menü" (full width).
- Behind the overlay the map classes clear and the zoom resets (300 ms).

**Score history:** after the screen is filled, the game just finished is saved to
`localStorage` under `geospiel-stats-<mode>` (`geospiel-stats-find`,
`geospiel-stats-name-bundesland`, `geospiel-stats-name-capital`,
`geospiel-stats-find-landmark`, `geospiel-stats-name-landmark`; the type toggles are not part of the key) as
`{ rounds, correct, skipped }`, keeping the last 10 games. The average therefore covers
the earlier games, not the one just played. The `geospiel-` prefix keeps the world quiz's
old `stats-<mode>` keys, which could exist on the same development origin, out of the
average.

**User actions:**
- **Zurück zum Menü:** back to the menu.

---

## State machine

```
Menu ──Erkunden──→ Erkunden ──Beenden──→ Menu
 │
 └─quiz mode─→ Einstellungen ──Zurück──→ Menu
                    │
               Spiel starten
                    ↓
 ┌──────────→ Playing ──right answer / last Versuch used──→ Feedback
 │              │                                            │
 │         Überspringen                     Weiter → / Automatisch
 │              │                           weiter (after 1.8 s)
 │              ↓                                            │
 └─ yes ── more rounds? ←────────────────────────────────────┘
                │ no
                ↓
          Spiel beendet ←── Beenden (from Playing or Feedback)
                │
  Zurück zum Menü ──→ Menu
```

The game panel stays visible during feedback, so Beenden works from Feedback as well as
from Playing. Überspringen is hidden in feedback and only exists in Playing.

**Data attributes on `<body>` (CSS decides visibility from these):**

| Attribute | Values | Set by |
|---|---|---|
| `data-phase` | `idle` (menu, Einstellungen, Erkunden, Spiel beendet) · `playing` · `feedback` | `setPhase()` |
| `data-mode` | `explore` · `find` · `name-bundesland` · `name-capital` · `find-landmark` · `name-landmark` | `setMode()`, when Erkunden or a game starts. Opening Einstellungen does not change it, and it keeps its last value on the menu. CSS matches the landmark modes as `[data-mode$="-landmark"]` |
| `data-settings-mode` | the mode whose Einstellungen were last opened | `openSettings()`; shows the type toggles for a landmark mode |
| `data-screen` | `select` · `settings` · `stats` · absent (no overlay: Erkunden and a game in progress) | `setScreen()` |
| `data-auto-advance` | `on` · `off` | `startGame()`, for the whole game |

`game-core.mjs` has its own phases (`playing`, `feedback`, `finished`). `main.js`
mirrors the first two to `data-phase`, and on `finished` it shows Spiel beendet with
`data-phase="idle"`.

JS only sets these attributes and fills in text. CSS attribute selectors decide which
panels, overlays and buttons are visible, and there are no per-element show/hide calls.
Two exceptions are toggled directly: the Erkunden info panel (class `visible`, on
hover/tap) and the average row on Spiel beendet (`style.display`). The info panel's rows
follow its own `data-kind` (`bundesland`, `river`, `lake`, `city`) and `data-wappen`
(`shown`, `none`), and the wrong-click line shows while it has text (`:empty`).
