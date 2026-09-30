# 05 — Bundesland benennen, with the alias table

**What to build:** The first typed mode. A Bundesland is highlighted on the map with its
Landeswappen shown and its name hidden; type the name.

This is recall rather than recognition, so the cue matters: the map nudges gently toward
the target but keeps the rest of Germany in frame, because a lone Bundesland outline is
not identifiable the way a country outline is — its position within the country is what
the learner is actually using.

The substance of this ticket is the **alias table**. It is hand-authored, and it is what
decides whether the mode feels fair. It must cover the sixteen plain names, the official
long forms (`Freistaat Bayern`, `Freie und Hansestadt Hamburg`), the everyday
abbreviations Germans actually use (`NRW`, `BaWü`, `MV`, `Meck-Pomm`, `SH`, `RLP`), the
English names, and common misspellings.

English names are accepted on purpose: knowing the answer in the wrong language should
not score zero while someone is still learning. But the feedback always shows the German
name, so the English route teaches the German one.

The normalizer built in 01 is what makes umlaut typing a non-issue — this ticket supplies
the German data it operates on and confirms the behaviour end to end.

Reference: `.scratch/bundesland-quiz/spec.md` — "Answer matching", "Gentle zoom to
target", "German UI strings".

**Blocked by:** 04.

**Status:** done — landed with commit "Add Bundesland benennen with a hand-written alias table"

### Acceptance criteria

- [x] The target's Landeswappen is shown and its **name is hidden** from the panel
- [x] The map gently zooms to the target on round start, capped at 1.8×, with the rest of Germany still substantially in frame
- [x] The text input takes focus by itself once the map has settled, with no click needed
- [x] Enter and the Antworten button both submit
- [x] All sixteen plain names are accepted
- [x] Umlaut, transliterated and bare spellings are all accepted — `Baden-Württemberg`, `Baden Wuerttemberg`, `baden wurttemberg` and `BadenWürttemberg` all score
- [x] Hyphens, spaces and casing are ignored
- [x] Official long forms are accepted, at least `Freistaat Bayern`, `Freistaat Sachsen`, `Freistaat Thüringen`, `Freie und Hansestadt Hamburg`, `Freie Hansestadt Bremen`
- [x] Everyday abbreviations are accepted, at least `NRW`, `BaWü`, `MV`, `Meck-Pomm`, `SH`, `RLP`
- [x] The English names are accepted, at least `Bavaria`, `Saxony`, `Lower Saxony`, `Thuringia`, `Hesse`, `North Rhine-Westphalia`, `Rhineland-Palatinate`, `Mecklenburg-Western Pomerania`, `Saxony-Anhalt`
- [x] When an English name is accepted, the feedback still shows the **German** name
- [x] `Sachsen` does not match Sachsen-Anhalt and `Sachsen-Anhalt` does not match Sachsen
- [x] A wrong answer reports the remaining Versuche with **correct German singular and plural** — `noch 1 Versuch`, `noch 3 Versuche` — and clears and re-focuses the input
- [x] Running out of Versuche ends the round and names the correct answer
- [x] Submitting an empty or whitespace-only box does nothing and costs no Versuch
- [x] Every string in the mode is German, including the input placeholder
- [x] The alias table is covered by tests at the game-core seam, not only by playing
- [x] `make test` passes
- [x] **Verified by driving the app, not by self-report:** report the observed outcome for an umlaut spelling, a transliterated spelling, an abbreviation, an English name, a confusable near-miss, and a wrong answer at two different remaining-Versuche counts
