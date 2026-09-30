# Spec: Bundesland-Quiz — adapt the world quiz to Germany

Status: ready-for-agent

## Problem Statement

The app today teaches world geography: every country on the planet, in English, on a
Natural Earth world projection. Someone learning about Germany — its sixteen
Bundesländer, their shapes, where they sit relative to each other, their
Landeshauptstädte and their Landeswappen — cannot use it. Germany is a single grey
polygon among two hundred others, and zooming in on it gives you no subdivisions at
all.

Separately, the person using this is learning German at the same time as learning the
geography. An English-language UI means every session is spent in the wrong language:
the interface words ("Score", "Guesses", "Skip", "Next", "Game Over") are exactly the
kind of everyday vocabulary that repetition would teach for free, and they're being
wasted on English.

## Solution

The same game, on the same map engine, with the same feel — but the world is replaced
by Germany and the countries are replaced by the sixteen Bundesländer.

The map opens fitted to Germany and stays there. Panning and zooming feel identical to
before (drag, scroll wheel, pinch), but the reachable area is clamped to Germany plus a
thin margin — there is nowhere to pan *to*. A muted, non-interactive layer of
neighbouring countries fills the space around the German outline so the country reads
as part of a continent rather than floating in a void; those shapes are never
highlighted, never clickable, and never an answer.

Every piece of user-visible text is German. The four modes become **Erkunden**,
**Bundesland finden**, **Bundesland benennen** and **Landeshauptstadt benennen**. The
flag becomes the Landeswappen. The capital becomes the Landeshauptstadt. The
neighbour count becomes the number of adjacent Bundesländer.

Because there are only sixteen answers rather than two hundred, a session is short and
complete: the default game is all sixteen Bundesländer in random order, each exactly
once.

## User Stories

### Getting started

1. As a learner, I want the app to open on a menu of five options in German, so that I can pick what to practise without reading any English.
2. As a learner, I want each mode card to carry a short German description, so that I can tell the naming modes apart before committing to one.
3. As a learner, I want the page title and tab to name the game in German, so that the browser tab is part of the immersion.
4. As a learner, I want the map behind the menu to already show Germany divided into its Bundesländer, so that I can see what the game is about before I start.
5. As a screen-reader user, I want the page to declare German as its language, so that my screen reader pronounces the interface correctly.

### The map itself

6. As a learner, I want the map to open with the whole of Germany filling the screen, so that I never have to hunt for the country.
7. As a learner, I want each Bundesland drawn as its own shape with a visible border, so that I can learn the internal divisions, not just the outline.
8. As a learner, I want to drag and scroll-wheel to pan and zoom exactly as before, so that the interaction I already know still works.
9. As a learner, I want panning to stop at Germany's edges, so that I can't get lost in empty ocean and have to work out how to get back.
10. As a learner, I want the zoom-out limit to be the full-Germany view, so that "zoom all the way out" always means "see the whole country".
11. As a learner, I want a hint of the surrounding countries around Germany's border, so that I can see which neighbours each border Bundesland faces.
12. As a learner, I want those neighbouring countries to be visibly muted and unclickable, so that it's obvious they are scenery rather than answers.
13. As a learner, I want border lines to stay the same visual thickness however far I zoom in, so that small Bundesländer don't disappear under their own outlines.
14. As a learner on a phone, I want the map to fill my screen in portrait without cropping Germany, so that I can play one-handed on the train.
15. As a learner, I want resizing my browser window to keep Germany fitted and centred, so that the map doesn't end up half off-screen.

### Erkunden

16. As a learner, I want to hover a Bundesland and see it highlight, so that I can confirm which shape I'm pointing at.
17. As a learner, I want hovering to open an info panel with that Bundesland's facts, so that I can browse the whole country at my own pace without being scored.
18. As a learner, I want the info panel to show the Landeswappen, so that I start associating each coat of arms with its Bundesland before I'm quizzed on it.
19. As a learner, I want the info panel to show the Landeshauptstadt, so that I can learn the capitals by browsing.
20. As a learner, I want the info panel to show Fläche, Einwohner, höchster Punkt and number of Nachbarländer, so that I get the same depth of fact I got for countries.
21. As a learner, I want large numbers written in German convention, so that "83.200.000" reads the way I'll see it written in German sources.
22. As a learner, I want moving the mouse off a Bundesland to close the panel, so that the map is unobstructed while I'm just looking around.
23. As a touch user, I want tapping a Bundesland to highlight it and open its panel, so that Erkunden works without a mouse.
24. As a touch user, I want tapping a different Bundesland to switch to it, so that I can compare two without closing the panel first.
25. As a touch user, I want tapping the same Bundesland again, or tapping the surrounding scenery, to dismiss the panel, so that I can get it out of the way.
26. As a learner, I want a "Beenden" button in the corner during Erkunden, so that I can get back to the menu at any time.
27. As a learner, I want quitting Erkunden to reset the zoom, so that the next mode starts from the full-Germany view.

### Settings (Einstellungen)

28. As a learner, I want to choose how many Runden to play, so that I can do a quick five or a full sixteen.
29. As a learner, I want the Runden setting to cap at sixteen, so that I'm never promised more rounds than there are Bundesländer.
30. As a learner, I want the Runden default to be sixteen, so that the obvious thing to do is one complete pass over the whole country.
31. As a learner, I want to choose how many Versuche I get per Runde, so that I can make it forgiving while I'm new and strict once I'm confident.
32. As a learner, I want an "automatisch weiter" toggle, so that I can drill without clicking "Weiter" between every round.
33. As a learner, I want the settings screen to be titled with the mode I picked, so that I know which game I'm about to start.
34. As a learner, I want a "Zurück" button on the settings screen, so that I can change my mind about the mode.
35. As a learner, I want my settings to persist while the app is open, so that starting a second game doesn't mean re-entering them.

### Bundesland finden

36. As a learner, I want to be shown a Bundesland's name and Landeswappen and asked to click it on the map, so that I learn where each one is.
37. As a learner, I want the map to start un-highlighted and un-zoomed in this mode, so that the answer isn't given away.
38. As a learner, I want a correct click to score a point and move to the feedback, so that I get immediate confirmation.
39. As a learner, I want a wrong click to flash that Bundesland red briefly, so that I can see exactly which one I mistook it for.
40. As a learner, I want a wrong click to cost me one Versuch and leave the round running, so that I get to try again.
41. As a learner, I want running out of Versuche to end the round and reveal the answer, so that I learn the right answer even when I fail.
42. As a learner, I want clicking one of the muted neighbouring countries to do nothing at all, so that a stray click near the border doesn't cost me a Versuch.
43. As a learner, I want the three Stadtstaaten (Berlin, Hamburg, Bremen) to be reliably clickable at the default zoom, so that small answers aren't unfairly hard to hit.

### Bundesland benennen

44. As a learner, I want a Bundesland highlighted on the map with its Landeswappen shown, and a text box to type its name, so that I practise recall rather than recognition.
45. As a learner, I want the Bundesland's name hidden from the panel in this mode, so that the answer isn't sitting on screen.
46. As a learner, I want the map to nudge gently toward the highlighted Bundesland without losing sight of the rest of Germany, so that I can still use its position in the country as a cue.
47. As a learner, I want the text box focused automatically once the map has settled, so that I can start typing without clicking first.
48. As a learner, I want to submit with Enter as well as the button, so that I can drill quickly from the keyboard.
49. As a learner, I want my answer accepted whether I type "Baden-Württemberg", "Baden Wuerttemberg" or "badenwurttemberg", so that not having an umlaut key doesn't count against me.
50. As a learner, I want common abbreviations like "NRW" and "MV" accepted, so that the game matches how Germans actually refer to these.
51. As a learner, I want official long forms like "Freistaat Bayern" accepted, so that knowing the formal name isn't punished.
52. As a learner, I want the English name accepted as a fallback, so that recognising "Bavaria" still scores while I'm learning "Bayern".
53. As a learner, I want the German name always shown back to me in the feedback, so that the English fallback teaches me the German.
54. As a learner, I want "Sachsen" and "Sachsen-Anhalt" kept strictly distinct, so that the game doesn't accept the wrong one of a confusable pair.
55. As a learner, I want a wrong answer to tell me how many Versuche remain, in correct German singular or plural, so that the count reads naturally.
56. As a learner, I want the text box cleared and re-focused after a wrong answer, so that I can immediately try again.
57. As a learner, I want submitting an empty box to do nothing, so that a stray Enter doesn't burn a Versuch.

### Landeshauptstadt benennen

58. As a learner, I want the Bundesland's name shown and highlighted on the map, and a text box for its Landeshauptstadt, so that I learn the name-to-capital pairing.
59. As a learner, I want the Landeswappen hidden in this mode, so that the panel matches the question being asked.
60. As a learner, I want "Muenchen" and "München" both accepted, so that umlaut typing is never the obstacle.
61. As a learner, I want a different Bundesland's Landeshauptstadt rejected, so that guessing a capital I happen to remember doesn't score.

### Feedback between rounds

62. As a learner, I want a clear green "Richtig!" on a correct answer, so that success is unmistakable.
63. As a learner, I want a red message naming the correct answer when I run out of Versuche, so that every failure teaches me something.
64. As a learner, I want the full info panel for that Bundesland during feedback, so that I get the facts at the moment I'm most likely to remember them.
65. As a learner, I want the Bundesland highlighted and gently zoomed during feedback in every mode, so that I always see where the answer was — including in Bundesland finden.
66. As a learner, I want a "Weiter" button that takes keyboard focus, so that I can advance with the keyboard.
67. As a learner with automatisch weiter on, I want the round to advance by itself after a moment and the "Weiter" button to be absent, so that nothing interrupts a drill.
68. As a learner, I want a progress bar that fills as rounds complete, so that I can see how far through the game I am.

### Skipping, quitting, and the end of a game

69. As a learner, I want an "Überspringen" button, so that I can move past a Bundesland I'm not ready for.
70. As a learner, I want skipping to be counted separately from wrong answers, so that my score reflects what I actually attempted.
71. As a learner, I want skipping to go straight to the next round with no feedback, so that skipping is fast.
72. As a learner, I want a "Beenden" button during a game, so that I can stop early and still see how I did.
73. As a learner, I want the end screen to show Runden played, Richtig, Übersprungen and a percentage, so that I can judge the session.
74. As a learner, I want the end screen to show my rolling average across recent games for this mode, so that I can see whether I'm improving.
75. As a learner, I want to hover the average and see the individual recent scores, so that I can tell a bad day from a plateau.
76. As a learner, I want my history kept per mode, so that my Landeshauptstadt scores don't dilute my Bundesland-finden scores.
77. As a learner, I want my history to survive closing the browser, so that the average means something over time.
78. As a learner, I want my old world-quiz history not to leak into the new game's averages, so that the numbers are about Germany.
79. As a learner, I want the map zoom reset behind the end screen, so that returning to the menu shows the full-Germany view.
80. As a learner, I want "Zurück zum Menü" to take me back to the mode selection, so that I can go again.

### Mobile

81. As a learner on a phone, I want the game panel to sit flush against the top of the screen, so that no space is wasted.
82. As a learner on a phone, I want the bottom panels flush against the bottom, so that the map gets as much room as possible.
83. As a learner on a phone, I want the info panel to stack into one column, so that the facts stay readable at narrow widths.
84. As a learner on a phone, I want the mode cards in a single column, so that I can read and tap them comfortably.

## Implementation Decisions

### Scope of replacement

The Germany game **replaces** the world quiz in place rather than living alongside it.
The world geometry fetch, the world metadata, the world alias table, the generated
small-country click-target overlay and the Python script that generates it are all
removed. There is no mode picker offering "World" vs "Germany" — if both are ever
wanted, that's a later feature with its own spec.

### Domain vocabulary

The repo has no `CONTEXT.md` glossary yet. This spec establishes the terms the code and
UI use, and they should be carried into one if `/domain-modeling` is run later:

| Term | Meaning |
|---|---|
| **Bundesland** (pl. *Bundesländer*) | One of the sixteen federal states. The unit of play. Replaces "country" everywhere. |
| **Landeshauptstadt** | A Bundesland's capital city. Replaces "capital". |
| **Landeswappen** | A Bundesland's coat of arms. Replaces "flag". |
| **Nachbarländer** | The count of Bundesländer sharing a land border with a given one. Replaces "neighbours". |
| **Kulisse** (scenery) | The muted, non-interactive layer of neighbouring countries drawn around Germany. Never an answer. |
| **Runde** | One prompt-and-answer cycle. Replaces "round". |
| **Versuch** (pl. *Versuche*) | One guess attempt within a Runde. Replaces "guess". |

Code identifiers, data attribute values and JSON keys stay in English/ASCII
(`bundesland`, `capital`, `wappen`) — only user-visible strings are German. Mixing
German identifiers into a codebase whose every other symbol is English costs more in
readability than it buys.

### Bundesland identity

Bundesländer are keyed by the two-digit German administrative land key (the AGS/
Regionalschlüssel prefix), zero-padded as a string. This replaces the three-digit
zero-padded ISO numeric country ID, and it is the canonical German key, stable and
naturally sortable:

| Key | Bundesland | ISO 3166-2 |
|---|---|---|
| `01` | Schleswig-Holstein | DE-SH |
| `02` | Hamburg | DE-HH |
| `03` | Niedersachsen | DE-NI |
| `04` | Bremen | DE-HB |
| `05` | Nordrhein-Westfalen | DE-NW |
| `06` | Hessen | DE-HE |
| `07` | Rheinland-Pfalz | DE-RP |
| `08` | Baden-Württemberg | DE-BW |
| `09` | Bayern | DE-BY |
| `10` | Saarland | DE-SL |
| `11` | Berlin | DE-BE |
| `12` | Brandenburg | DE-BB |
| `13` | Mecklenburg-Vorpommern | DE-MV |
| `14` | Sachsen | DE-SN |
| `15` | Sachsen-Anhalt | DE-ST |
| `16` | Thüringen | DE-TH |

Whatever property the chosen geometry source carries, it is normalised to this key by a
single `featureId(feature)` function at render time — the same pattern as the existing
`String(d.id).padStart(3, '0')`. Exactly one place in the code knows how the geometry
source spells its identifiers.

The ISO 3166-2 code is kept as a field on each Bundesland purely as the Landeswappen
asset key, mirroring how `iso_a2` fed the flag URL. A single `wappenUrl(key)` function
is the only code that knows where Landeswappen images come from, so swapping the source
later touches one line.

### Map projection, extent, and the pan clamp

- **Projection:** a conic conformal projection with standard parallels inside Germany's
  latitude span and centred on roughly Germany's central meridian, rather than the
  world-scale Natural Earth projection. Mercator across 47°N–55°N visibly stretches the
  north relative to the south; a conic conformal fitted to the country does not.
- **Fitting:** the projection is fitted to the German outline with a small padding
  margin, replacing the hard-coded `scale(width / 6.3)`.
- **Resize-proofing (this is a change in approach, not a port):** the SVG gets a fixed
  `viewBox` sized to the padded projected bounding box of Germany, with
  `preserveAspectRatio="xMidYMid meet"`, and is sized by CSS to fill the viewport. All
  projection, zoom and pan arithmetic happens in viewBox units, not window pixels.
  Consequences: resizing the window re-fits Germany with no JS resize handler (which
  the CSS-over-JS guideline in `CLAUDE.md` asks for), the pan clamp is expressed in a
  coordinate space that doesn't move, and the centring maths in the zoom-to-target
  helper reads the viewBox dimensions rather than `window.innerWidth/innerHeight`.
  On a wide screen this letterboxes horizontally — that empty space is what the Kulisse
  layer fills.
- **Scale range:** `[1, 6]`, where `k = 1` *is* the full-Germany view. The old
  `[1, 24]` range existed because the world map had to reach Luxembourg; six is ample
  for the smallest Bundesland.
- **Pan clamp:** D3 zoom's `translateExtent` is set to the projected bounds of the
  German outline plus a small margin. At `k = 1` this leaves essentially no freedom to
  pan, and at higher `k` the reachable area is Germany plus that margin. This — not a
  hand-written drag handler — is what delivers "nothing far beyond the borders can be
  panned to."

### The Kulisse layer

Neighbouring countries' land is drawn in its own group *beneath* the Bundesländer, in a
muted fill with no labels. It is `pointer-events: none` in CSS at all times, in every
mode, which gives three things at once: it never highlights on hover, it never registers
as a wrong guess in Bundesland finden, and it never intercepts a click meant for a
Bundesland near the border.

One knock-on: the existing "click empty space to dismiss the Erkunden panel" check tests
`event.target.tagName !== 'path'`, which breaks as soon as there are other `<path>`
elements on the map. The dismiss condition becomes "the click target is not a
Bundesland path", tested by class rather than tag name.

The sea stays as the page background colour, as today — no separate water geometry.

### The small-target overlay is removed

The world game needed an overlay of enlarged circular click targets because Vatican City
and Monaco were sub-pixel. At the fitted Germany extent, the smallest Bundesland
(Bremen, whose main Bremen polygon is roughly 20 km across) renders on the order of
twenty-plus CSS pixels wide even on a narrow phone, and Bremerhaven does not need to be
separately clickable because it belongs to the same Bremen shape. The overlay group, its
CSS, its generated data file, the generator script and the duplicate click handler all
go away. **This is the one removal that must be verified by driving the app, not
reasoned about:** confirm all three Stadtstaaten and Saarland are comfortably clickable
at `k = 1` at both desktop and ~400px-wide viewport sizes before the overlay is dropped
for good.

### Gentle zoom to target

The existing zoom-to-target helper is kept, with the maximum scale lowered from `8` to
`1.8`. That is the whole change:

- Large Bundesländer (Bayern, Niedersachsen, NRW) already fill much of the view, so the
  computed fit scale is near `1` and the map barely moves.
- Small ones (Bremen, Berlin, Hamburg, Saarland) get the `1.8` cap, which still leaves
  roughly the full east-west span and over half the north-south span of Germany in
  frame — so the target's position within the country, which is the main learning cue
  for a shape that is not recognisable in isolation, stays readable.
- The `translateExtent` clamp applies to programmatic transforms too, so the gentle zoom
  can never push the view outside Germany.

The cap is a single named constant so it can be tuned after playing the game. The
animation stays at 750ms and the input auto-focus stays at 800ms.

Applies on round start in Bundesland benennen and Landeshauptstadt benennen, and on
entering feedback in all three quiz modes. Bundesland finden does not zoom or highlight
during play.

### Rounds and guesses

- **Runden:** range `1`–`16`, default `16`. The existing round-order logic (shuffle all
  valid keys, slice to the round count) already gives no repeats and needs no change,
  but it must clamp the requested count to the number of Bundesländer actually present
  in both the geometry and the metadata rather than trusting the setting.
- **Versuche pro Runde:** range `1`–`10`, default `3`, unchanged.
- **Automatisch weiter:** default off, 1.8s delay, unchanged.

### Answer matching

One canonical normaliser, applied to both the user's input and the reference answers,
in this order:

1. trim and lowercase
2. `ß` → `ss`
3. strip combining diacritics (NFD decompose, drop the marks) — so `ü` → `u`
4. collapse `ae` → `a`, `oe` → `o`, `ue` → `u`
5. strip everything that is not a letter or digit (hyphens, spaces, periods,
   apostrophes)

Steps 3 and 4 together are what make umlaut typing a non-issue: `Württemberg`,
`Wuerttemberg` and `Wurttemberg` all canonicalise to `wurttemberg`. Verified
non-colliding across all sixteen Bundesland names and all sixteen Landeshauptstädte —
none of them contains a literal `ae`/`oe`/`ue` digraph, so step 4 cannot corrupt a
correct answer. It can *over*-accept a spelling nobody would type, which for a learning
game is strictly better than rejecting a correct one.

Step 5 is why `Sachsen-Anhalt`, `Sachsen Anhalt` and `SachsenAnhalt` all match, while
`Sachsen` stays a distinct canonical string from `sachsenanhalt` — the confusable pair
is preserved.

- **Bundesland names** are matched through an alias table of canonical-form key →
  Bundesland key, the same shape as the existing alias file. It must cover: the sixteen
  plain names, official long forms (`Freistaat Bayern`, `Freistaat Sachsen`,
  `Freistaat Thüringen`, `Freie und Hansestadt Hamburg`, `Freie Hansestadt Bremen`),
  everyday abbreviations (`NRW`, `BaWü`, `MV`, `Meck-Pomm`, `SH`, `RLP`), and the
  English names (`Bavaria`, `Saxony`, `Lower Saxony`, `Thuringia`, `Hesse`,
  `North Rhine-Westphalia`, `Rhineland-Palatinate`, `Mecklenburg-Western Pomerania`,
  `Saxony-Anhalt`). English names are accepted because the goal is learning, and
  knowing the answer in the wrong language should not score zero — but the feedback
  always displays the German name, so the English route teaches the German one.
- **Landeshauptstädte** are matched by canonical-form equality against the Bundesland's
  capital field, plus an optional per-Bundesland list of additionally accepted variants
  for anything the normaliser can't reach. This avoids standing up a second alias file
  for sixteen values.
- Empty or whitespace-only input remains a no-op that consumes no Versuch.

### The one testing seam

A single pure module holds the game's rules. It imports nothing, touches no DOM, no D3,
no `localStorage` and no timers, and is the only thing under test:

```
createGame({ items, aliases, mode, totalRounds, maxGuesses, shuffle }) -> game

game.state -> { mode, phase, currentRound, totalRounds,
                score, skipped, guessesLeft, targetId, roundOrder }

game.guessById(id)       // Bundesland finden: a map click
game.guessByText(text)   // naming modes: a typed answer
  -> { correct, guessesLeft, exhausted, phase }

game.next()    -> { phase, finished }
game.skip()    -> { phase, finished }
game.quit()    -> { finished: true }
game.summary() -> { roundsPlayed, correct, skipped, percent }
```

Plus the pure matching helpers: `normalize(text)`, `matchBundesland(text, aliases)`,
`matchCapital(text, item)`.

`shuffle` is injected so tests get a deterministic round order without stubbing
`Math.random`.

What stays *outside* the seam, in the existing D3/DOM wiring, and is verified by driving
the app rather than by unit tests: the projection and fit, the zoom and pan clamp, the
gentle-zoom transform, highlight/target/wrong-guess classes, the wrong-guess flash
timer, the auto-advance timer, panel visibility (which is CSS-driven off the body data
attributes and needs no JS), and the score history in `localStorage`.

This is the highest seam available without introducing a browser-driving test
dependency: the guess accounting, round sequencing and answer matching — the parts with
real branching and off-by-one risk — all sit behind it, and everything in front of it is
either declarative CSS or a thin call-through.

### State machine and CSS-driven visibility

The existing architecture is kept intact: a single game-state object, with phase and
mode mirrored onto `<body>` data attributes, and CSS attribute selectors deciding what's
visible. Only the mode value changes:

- `data-phase`: `idle` | `playing` | `feedback` — unchanged
- `data-mode`: `explore` | `find` | `name-bundesland` | `name-capital`
  (`name-country` → `name-bundesland`; the other three unchanged)
- `data-screen`: `select` | `settings` | `stats` | absent — unchanged

Mode-specific hiding stays in CSS, not JS: the Landeswappen is hidden in
`name-capital`, the name prompt is hidden in `name-bundesland`.

### Landeswappen presentation

A Landeswappen is not a flag. Flags are landscape and were rendered 64×42 with
`object-fit: cover`. Coats of arms are portrait or square, often on a transparent
background, and cropping one is simply wrong. The image box becomes roughly square
(~56×56) with `object-fit: contain` and no background fill, in both the game panel and
the info panel. The mobile rule that hides the flag column in the game panel carries
over to the Landeswappen column unchanged.

### Score history storage

Per-mode history keys are prefixed so they cannot collide with the world quiz's
existing `stats-<mode>` keys. This matters concretely: both games are served from
`localhost:8000` during development, which is the same browser origin, so `stats-find`
written by the world quiz would silently be read as Bundesland history and corrupt the
average. Keys become `geospiel-stats-<mode>`; the last-ten-games window and the average
calculation are otherwise unchanged.

### German UI strings

All user-visible text. Where German needs a singular/plural distinction the code must
handle it — this is a German-learning app, so "noch 1 Versuche" is a bug, not a
cosmetic nit.

| Where | German |
|---|---|
| Page title / menu heading | Deutschland-Quiz |
| `<html lang>` | `de` |
| Mode: Explore | Erkunden — *Karte erkunden und Fakten entdecken* |
| Mode: Find | Bundesland finden — *Das richtige Bundesland auf der Karte anklicken* |
| Mode: Name the state | Bundesland benennen — *Den Namen des markierten Bundeslandes eingeben* |
| Mode: Name the capital | Landeshauptstadt benennen — *Die Landeshauptstadt des Bundeslandes eingeben* |
| Settings: Rounds | Runden |
| Settings: Guesses per round | Versuche pro Runde |
| Settings: Auto-advance | Automatisch weiter |
| Settings: Back | Zurück |
| Settings: Start | Spiel starten |
| HUD: Score | Punkte |
| HUD: Guesses | Versuche |
| Button: Skip | Überspringen |
| Button: Quit | Beenden |
| Button: Next | Weiter → |
| Feedback: correct | Richtig! |
| Feedback: out of guesses | Keine Versuche mehr – es war {Antwort} |
| Inline: wrong, n left | Falsch – noch {n} Versuche  /  Falsch – noch 1 Versuch |
| Input placeholder (state) | Bundesland eingeben … |
| Input placeholder (capital) | Landeshauptstadt eingeben … |
| Button: Submit | Antworten |
| Info panel: Capital label | Landeshauptstadt |
| Info panel: Area | Fläche |
| Info panel: Population | Einwohner |
| Info panel: Highest point | Höchster Punkt |
| Info panel: Neighbours | Nachbarländer |
| Stats: title | Spiel beendet |
| Stats: rounds played | Gespielte Runden |
| Stats: correct | Richtig |
| Stats: skipped | Übersprungen |
| Stats: score | Punktzahl |
| Stats: average | Durchschnitt der letzten {n} Runden |
| Stats: tooltip | Punktzahl in %: … |
| Stats: back to menu | Zurück zum Menü |
| Footer | Quellcode auf GitHub · © 2026 Krautlabs Inc. |

Numbers are formatted with `de-DE` locale conventions (`83.200.000`, `70.542 km²`).

### Build and run

The repo has no `Makefile`, which `CLAUDE.md` asks for. Since this spec introduces the
first test suite, it also introduces the Makefile: `install` is a no-op (there are still
no npm dependencies), `run` starts the static server, `test` runs the suite, `clean`
removes nothing of consequence yet. Tests use Node's built-in test runner so the
"no build process, no npm required" property of the project survives — `make test`
becomes the entry point, per the convention.

## Testing Decisions

**What a good test looks like here.** Tests call the game-core module's public methods
and assert on the state and result objects it returns. They never reach into internals,
never assert on the order in which the module updated its own fields, and never touch
the DOM, D3, `localStorage` or timers — if a test needs any of those, the behaviour
belongs on the other side of the seam and is verified by driving the app instead.
Determinism comes from injecting `shuffle`, not from stubbing globals.

**Modules tested.** The game-core module only, including its pure matching helpers.

**Prior art.** None — there are no tests in this repo. This suite sets the pattern:
Node's built-in test runner, one test file mirroring the module, flat `test()` calls with
sentence-shaped names, no assertion library beyond `node:assert`.

**Behaviours to cover:**

*Guess accounting*
- A correct answer increments the score and moves the phase to feedback.
- A wrong answer decrements the remaining Versuche and leaves the phase at playing.
- The last available wrong guess moves the phase to feedback and leaves the score alone.
- Remaining Versuche reset to the configured maximum at the start of each round.
- Empty and whitespace-only input consumes no Versuch and changes no state.
- A wrong `guessById` for a Bundesland already guessed wrong this round still costs a
  Versuch (no dedup — matches current behaviour).

*Round sequencing*
- The round order contains no repeats and has exactly `totalRounds` entries.
- A requested round count above the number of available Bundesländer is clamped to it.
- Advancing past the last round reports finished.
- Skipping increments the skipped count, leaves the score untouched, and does not enter
  the feedback phase.
- Quitting mid-round reports finished, and the summary counts the round in progress as
  played.
- The summary percentage is correct over played rounds, not over configured rounds.

*Answer matching*
- `Baden-Württemberg`, `Baden Wuerttemberg`, `baden wurttemberg` and `BadenWürttemberg`
  all match Baden-Württemberg.
- `Thüringen` and `thueringen` match; `München` and `Muenchen` match.
- `ß` folds to `ss`.
- Abbreviations `NRW` and `MV` match; long form `Freistaat Bayern` matches.
- English `Bavaria` matches Bayern, and the Bundesland name returned for display is the
  German one.
- `Sachsen` does not match Sachsen-Anhalt, and `Sachsen-Anhalt` does not match Sachsen.
- A Landeshauptstadt belonging to a different Bundesland is rejected.
- An unknown string is rejected rather than throwing.

**Verified by driving the app, not by tests** (per `CLAUDE.md`: drive it yourself and
report observed values — don't take a summary on trust):
- Germany fills the viewport at load, at desktop and ~400px widths, with the Kulisse
  filling the letterboxed margins.
- Panning at `k = 1` cannot move the view; panning at maximum zoom cannot leave Germany
  plus its margin.
- All three Stadtstaaten and Saarland are comfortably clickable at `k = 1` at both
  widths — the gate on removing the small-target overlay.
- The gentle zoom on a small Bundesland leaves the rest of Germany visible.
- Clicking the Kulisse costs no Versuch in Bundesland finden and highlights nothing in
  Erkunden.
- Resizing the window keeps Germany fitted and centred.
- Every string on every screen is German, with correct singular/plural in the
  remaining-Versuche message.

## Out of Scope

- **The fifth mode** — naming rivers, lakes and other cities. Explicitly the next piece
  of work; nothing in this spec should make it harder, which is why the game-core module
  takes a generic `items` collection rather than something named after Bundesländer.
- **Sourcing the data** — Bundesland geometry, the Kulisse geometry, Landeswappen images
  and the facts themselves (Fläche, Einwohner, höchster Punkt, Nachbarländer). Deferred
  deliberately; this spec fixes the key scheme and the shape of the lookups so the data
  ticket has a contract to fill.
- **Sub-Bundesland divisions** — Regierungsbezirke, Landkreise, Stadtbezirke.
- **Other German-speaking regions** — Austria, Switzerland, Südtirol.
- **An i18n framework or a language toggle.** German is hard-coded. Extracting a string
  table for English would undercut the point of the app.
- **Keeping the world quiz playable alongside this.** It is replaced.
- **Map labels.** No Bundesland names or city names rendered on the map — they would
  give away every answer.
- **New game mechanics** — difficulty tiers, timers, streaks, per-Bundesland weakness
  tracking, leaderboards, sharing.
- **Browser-driven automated tests.** The chosen seam is the pure logic module; UI
  verification stays manual-but-observed.

## Further Notes

- **The English-fallback decision is worth revisiting after playing.** Accepting
  `Bavaria` is generous, and if it turns out to be a crutch that stops the German name
  from sticking, dropping the English aliases is a one-line data change.
- **`ae`/`oe`/`ue` collapsing was checked against the current answer set, not proved in
  general.** When the fifth mode adds rivers, lakes and cities, re-check that no two
  answers collide under the normaliser — `Moers` canonicalises to `mors`, which is
  harmless in isolation but is the shape of a future collision.
- **The Nachbarländer count is unusually interesting for the Stadtstaaten** — Berlin has
  one neighbour, Bremen one, Hamburg two. Worth keeping in the info panel rather than
  dropping as trivia; it's a genuine fact about German geography that the world version's
  neighbour count never surfaced so cleanly.
- **Sixteen answers changes the feel of Bundesland finden.** With ten Versuche allowed
  and sixteen targets, the mode becomes close to free. The setting range is kept as-is
  because it's the existing behaviour and cheap, but a lower default (or a cap tied to
  the number of items) is worth considering once it's been played.
- **The viewBox change is the only structural departure from a straight port.** Everything
  else — the state machine, the CSS-driven visibility, the data attributes, the panel
  layout, the history storage — is the existing design with its nouns swapped. If the
  viewBox approach fights the zoom behaviour in practice, falling back to the current
  window-pixel fit plus a JS resize handler is a contained retreat.
- **Per `CLAUDE.md`, this spec should be committed to `main` before implementation
  starts**, so the implementing agent is working from a committed spec rather than an
  uncommitted file sitting next to the code it describes.
