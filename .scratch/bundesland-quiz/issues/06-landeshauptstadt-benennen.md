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

**Status:** ready-for-agent

### Acceptance criteria

- [ ] The Bundesland name is shown as the prompt and the **Landeswappen is hidden**
- [ ] Showing and hiding is driven by the mode attribute in CSS, not by a JS branch per transition
- [ ] All sixteen Landeshauptstädte are accepted when spelled correctly
- [ ] Umlaut and transliterated spellings both score — at least `München` / `Muenchen`, `Düsseldorf` / `Duesseldorf`, `Saarbrücken` / `Saarbruecken`
- [ ] A different Bundesland's Landeshauptstadt is **rejected**
- [ ] An unknown city name is rejected rather than throwing
- [ ] The feedback names the **Landeshauptstadt** when the answer is missed, not the Bundesland
- [ ] The map gently zooms to the highlighted Bundesland on round start, as in 05
- [ ] Wrong-answer messages, singular and plural, and the empty-submit no-op all behave as in 05
- [ ] The input placeholder and every other string in the mode are German
- [ ] Capital matching is covered by tests at the game-core seam
- [ ] `make test` passes
- [ ] **Verified by driving the app, not by self-report:** report the observed outcome for a correct capital, an umlaut-free spelling of one, another Bundesland's capital, and a missed round's feedback text
