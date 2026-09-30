# 06 — Landeshauptstadt benennen

**What to build:** The fourth mode. The Bundesland's name is shown and it is highlighted
on the map; type its Landeshauptstadt.

The smallest of the four. It reuses the input panel, the gentle zoom, the feedback wiring
and the normalizer that 05 already put in place — what is genuinely new is the
validation target and which parts of the panel are visible.

Capitals are matched by canonical-form equality against the Bundesland's capital field,
with an optional per-Bundesland list of additionally accepted variants for anything the
normalizer cannot reach. Sixteen values do not justify a second alias table.

The Landeswappen is hidden in this mode and the Bundesland name is shown — the mirror of
05. Both are CSS rules driven by the mode attribute, not JS branches.

Reference: `.scratch/bundesland-quiz/spec.md` — "Answer matching", "State machine and
CSS-driven visibility", "German UI strings".

**Blocked by:** 05.

**Status:** done — landed with commit "Finish Landeshauptstadt benennen"

### Acceptance criteria

- [x] The Bundesland name is shown as the prompt and the **Landeswappen is hidden**
- [x] Showing and hiding is driven by the mode attribute in CSS, not by a JS branch per transition
- [x] All sixteen Landeshauptstädte are accepted when spelled correctly
- [x] Umlaut and transliterated spellings both score — at least `München` / `Muenchen`, `Düsseldorf` / `Duesseldorf`, `Saarbrücken` / `Saarbruecken`
- [x] A different Bundesland's Landeshauptstadt is **rejected**
- [x] An unknown city name is rejected rather than throwing
- [x] The feedback names the **Landeshauptstadt** when the answer is missed, not the Bundesland
- [x] The map gently zooms to the highlighted Bundesland on round start, as in 05
- [x] Wrong-answer messages, singular and plural, and the empty-submit no-op all behave as in 05
- [x] The input placeholder and every other string in the mode are German
- [x] Capital matching is covered by tests at the game-core seam
- [x] `make test` passes
- [x] **Verified by driving the app, not by self-report:** report the observed outcome for a correct capital, an umlaut-free spelling of one, another Bundesland's capital, and a missed round's feedback text
