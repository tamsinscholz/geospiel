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
  where 1× is the full-Germany view. Panning is clamped to Germany plus a thin margin, so
  at 1× the map cannot move at all.
- **Touch halo:** on touch or narrow screens (`(pointer: coarse), (max-width: 600px)`),
  the three Bundesländer under 1,000 km² (Berlin, Bremen, Hamburg) also catch taps up to
  about 10 screen px outside their outline. A tap there counts as a tap on that
  Stadtstaat in every mode. With a mouse on a wide screen the halo is inactive.

---

## 1. Menu (`data-screen="select"`)

**What the user sees:**
- Full-screen overlay titled "Deutschland-Quiz" (also the page title), with the map
  behind it.
- Four mode cards in a 2×2 grid (one column at ≤600px):

| Card | Icon | Label | Description | `data-mode` |
|---|---|---|---|---|
| Explore | 🗺️ | Erkunden | "Karte erkunden und Fakten entdecken" | `explore` |
| Find | 🔍 | Bundesland finden | "Das richtige Bundesland auf der Karte anklicken" | `find` |
| Name | ✏️ | Bundesland benennen | "Den Namen des markierten Bundeslandes eingeben" | `name-bundesland` |
| Capital | 🏛️ | Landeshauptstadt benennen | "Die Landeshauptstadt des Bundeslandes eingeben" | `name-capital` |

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
  "Bundesland benennen" or "Landeshauptstadt benennen").

| Setting | Control | Range | Default |
|---|---|---|---|
| "Runden" | stepper (−/+) | 1–16 | 16 |
| "Versuche pro Runde" | stepper (−/+) | 1–10 | 3 |
| "Automatisch weiter" | toggle | on/off | off |

- Buttons "Zurück" and "Spiel starten".
- Below them, in small muted text, the data credits "Kartengrundlage: © EuroGeographics
  bezüglich der Verwaltungsgrenzen" and "Einwohner und Fläche: Statistisches Bundesamt
  (Destatis), Gemeindeverzeichnis, Stand 31.12.2024", collapsed to the short note "Karten: © EuroGeographics, Einwohner und Fläche: Destatis …"; a click, tap or Enter shows the full wording (`aria-expanded`), and it collapses again each time the Einstellungen screen opens.
  They appear only here, not on the map.

The values are remembered while the page is open: they are saved when a game starts and
shown again the next time this screen opens, for any mode.

**User actions:**
- **Zurück:** back to the menu.
- **Spiel starten:** the overlay closes and round 1 begins. The rounds are that many
  Bundesländer in random order, none repeated. The count is clamped to the Bundesländer
  that have both geometry and metadata, which is all 16.

---

## 4. Playing: shared parts (`data-phase="playing"`)

**Game panel (top):**
- The Landeswappen (not in Landeshauptstadt benennen, and never at ≤600px)
- The prompt: the Bundesland's name (hidden in Bundesland benennen)
- "Punkte: n" and "Versuche: n" (the Versuche left in this round)
- Buttons "Überspringen" (only while the round is being played) and "Beenden"
- A thin progress bar along the bottom edge. At the start of a round it stands at
  rounds completed ÷ total; it moves up one step when the round reaches feedback.

**Zoom at round start:**
- **Bundesland finden, Bundesland benennen:** the map stays on the full-Germany
  overview. If the user has zoomed in, it returns to the overview (300 ms); at 1× nothing
  moves.
- **Landeshauptstadt benennen:** gentle zoom to the target (750 ms). The scale fits the
  Bundesland but is capped at 1.8×, so a small Bundesland still shows most of Germany
  around it. The pan clamp applies to this too.

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

## 8. Feedback (`data-phase="feedback"`, all quiz modes)

**What the user sees:**
- The input panel is gone. In Bundesland benennen the name appears in the game panel.
- **Feedback bar** above the info panel:
  - correct: green "Richtig!"
  - out of Versuche: red "Keine Versuche mehr – es war {Antwort}". The answer is the
    Landeshauptstadt in Landeshauptstadt benennen and the Bundesland's name otherwise.
- **Info panel** with the full facts (as in Erkunden).
- The target is highlighted (`.target`) in every mode, including Bundesland finden.
- **Zoom:** only Landeshauptstadt benennen re-centres on the target (750 ms, capped at
  1.8×). Bundesland finden and Bundesland benennen stay where they are, which is the
  overview unless the user has zoomed in.

**Automatisch weiter off:** a "Weiter →" button in the feedback bar, focused after
100 ms (Enter or Space advances).

**Automatisch weiter on:** there is no "Weiter →" button (hidden by CSS off
`data-auto-advance="on"`), and the next round starts after 1.8 s.

After the last round, the next step is Spiel beendet instead of a new round.

---

## 9. Spiel beendet (`data-screen="stats"`)

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
`geospiel-stats-name-bundesland`, `geospiel-stats-name-capital`) as
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
| `data-mode` | `explore` · `find` · `name-bundesland` · `name-capital` | `setMode()`, when Erkunden or a game starts. Opening Einstellungen does not change it, and it keeps its last value on the menu |
| `data-screen` | `select` · `settings` · `stats` · absent (no overlay: Erkunden and a game in progress) | `setScreen()` |
| `data-auto-advance` | `on` · `off` | `startGame()`, for the whole game |

`game-core.mjs` has its own phases (`playing`, `feedback`, `finished`). `main.js`
mirrors the first two to `data-phase`, and on `finished` it shows Spiel beendet with
`data-phase="idle"`.

JS only sets these attributes and fills in text. CSS attribute selectors decide which
panels, overlays and buttons are visible, and there are no per-element show/hide calls.
Two exceptions are toggled directly: the Erkunden info panel (class `visible`, on
hover/tap) and the average row on Spiel beendet (`style.display`).
