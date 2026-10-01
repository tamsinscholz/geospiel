/**
 * game-core — the pure rules of the quiz.
 *
 * This module is one of the project's two testing seams (the other is
 * `landmark-hit.mjs`, which resolves a map point to a landmark). It imports
 * nothing and touches no DOM, no D3, no `localStorage` and no timers; the only
 * global it uses is `Math` (for the default shuffle). Everything environmental — map
 * rendering, zoom, CSS classes, panel visibility, the wrong-guess flash and
 * auto-advance timers, score persistence — lives in `main.js` on the other
 * side of this boundary.
 *
 * `items` is deliberately generic: a plain object keyed by item id, each value
 * carrying at least a `name` and (for capital mode) a `capital`. It is not
 * named after Bundeslaender so that other item sets go through the same rules:
 * the landmark modes (`find-landmark`, `name-landmark`) play rivers, lakes and
 * cities with it, keyed by feature id.
 */

/* === Phases === */

export const PLAYING = 'playing';
export const FEEDBACK = 'feedback';
export const FINISHED = 'finished';

/* === Pure matching helpers === */

/**
 * The one canonical normaliser, applied to both the user's input and to every
 * reference answer. In order:
 *
 *   1. trim and lowercase
 *   2. `ß` -> `ss`
 *   3. strip combining diacritics (NFD decompose, drop the marks): `ü` -> `u`
 *   4. collapse `ae` -> `a`, `oe` -> `o`, `ue` -> `u`
 *   5. strip everything that is not a letter or a digit
 *
 * Steps 3 and 4 together canonicalise `Württemberg`, `Wuerttemberg` and
 * `Wurttemberg` to the same string. Step 5 makes `Sachsen-Anhalt`,
 * `Sachsen Anhalt` and `SachsenAnhalt` equal while keeping `Sachsen` distinct.
 *
 * It can only ever over-accept a spelling, never reject one it used to accept.
 */
export function normalize(text) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Look a typed answer up in an alias table (any string -> item id), matching
 * on canonical form so the table's own keys need not be pre-normalised.
 * Returns the item id, or `null` when nothing matches.
 *
 * Named after the domain the spec names (see the interface in
 * `.scratch/bundesland-quiz/spec.md`); the implementation is domain-agnostic
 * and works for any alias table of the same shape.
 */
export function matchBundesland(text, aliases) {
  return lookupAlias(normalize(text), aliases);
}

/** One leading German article, as a whole word followed by whitespace. */
const LEADING_ARTICLE = /^(der|die|das)\s+/i;

/**
 * Look a typed landmark name up in an alias table, the same canonical lookup
 * as `matchBundesland`, after stripping **one** leading `der`/`die`/`das`.
 * The article is not checked, so a wrong one ("die Rhein") is accepted; the
 * bare article alone matches nothing, and an article that is only the start
 * of a word ("Dieburg") is left alone. Returns the item id, or `null`.
 */
export function matchLandmark(text, aliases) {
  if (typeof text !== 'string') return null;
  return lookupAlias(normalize(text.trim().replace(LEADING_ARTICLE, '')), aliases);
}

/** The shared alias lookup: `wanted` is already in canonical form. */
function lookupAlias(wanted, aliases) {
  if (!wanted || !aliases) return null;
  for (const key of Object.keys(aliases)) {
    if (normalize(key) === wanted) return aliases[key];
  }
  return null;
}

/**
 * True when `text` is the capital of `item`, compared in canonical form.
 * An item may additionally carry `capital_variants`, a list of extra accepted
 * spellings for anything the normaliser cannot reach on its own.
 */
export function matchCapital(text, item) {
  const wanted = normalize(text);
  if (!wanted || !item) return false;
  if (normalize(item.capital) === wanted) return true;
  const variants = item.capital_variants;
  if (Array.isArray(variants)) {
    return variants.some(v => normalize(v) === wanted);
  }
  return false;
}

/* === Round order === */

/** Fisher-Yates, in place; the default when no `shuffle` is injected. */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* === The game === */

/**
 * @param {object}   options
 * @param {object}   options.items        item id -> item record
 * @param {object}   [options.aliases]    alias string -> item id
 * @param {string}   options.mode         'find' | 'name-bundesland' | 'name-capital'
 *                                        | 'find-landmark' | 'name-landmark'
 * @param {number}   [options.totalRounds] clamped to the number of items
 * @param {number}   [options.maxGuesses]
 * @param {function} [options.shuffle]    injected for deterministic tests
 */
export function createGame({
  items = {},
  aliases = {},
  mode = 'find',
  totalRounds = 10,
  maxGuesses = 3,
  shuffle = shuffleInPlace,
} = {}) {
  const ids = Object.keys(items);
  const requested = Number.isFinite(totalRounds) ? Math.floor(totalRounds) : 0;
  const rounds = Math.max(0, Math.min(requested, ids.length));
  const guessAllowance = Math.max(1, Math.floor(maxGuesses) || 1);

  // An injected shuffle may either return a new array or mutate in place and
  // return nothing, so fall back to the array it was handed — never to `ids`,
  // which would silently discard an in-place shuffle's work.
  const pool = ids.slice();
  const roundOrder = (shuffle(pool) || pool).slice(0, rounds);

  const s = {
    mode,
    phase: rounds > 0 ? PLAYING : FINISHED,
    currentRound: 0,
    totalRounds: rounds,
    score: 0,
    skipped: 0,
    guessesLeft: rounds > 0 ? guessAllowance : 0,
    targetId: rounds > 0 ? roundOrder[0] : null,
  };

  function snapshot() {
    return {
      mode: s.mode,
      phase: s.phase,
      currentRound: s.currentRound,
      totalRounds: s.totalRounds,
      score: s.score,
      skipped: s.skipped,
      guessesLeft: s.guessesLeft,
      targetId: s.targetId,
      roundOrder: roundOrder.slice(),
    };
  }

  /** A guess that changed nothing: wrong phase, or empty input. */
  function ignored() {
    return {
      correct: false,
      guessesLeft: s.guessesLeft,
      exhausted: false,
      phase: s.phase,
      ignored: true,
    };
  }

  function resolve(correct) {
    if (correct) {
      s.score++;
      s.phase = FEEDBACK;
      return { correct: true, guessesLeft: s.guessesLeft, exhausted: false, phase: s.phase, ignored: false };
    }
    s.guessesLeft--;
    const exhausted = s.guessesLeft <= 0;
    if (exhausted) s.phase = FEEDBACK;
    return { correct: false, guessesLeft: s.guessesLeft, exhausted, phase: s.phase, ignored: false };
  }

  function beginRound() {
    s.targetId = roundOrder[s.currentRound];
    s.guessesLeft = guessAllowance;
    s.phase = PLAYING;
    return { phase: s.phase, finished: false };
  }

  function advance() {
    s.currentRound++;
    if (s.currentRound >= s.totalRounds) {
      s.phase = FINISHED;
      s.targetId = null;
      return { phase: s.phase, finished: true };
    }
    return beginRound();
  }

  return {
    get state() {
      return snapshot();
    },

    /**
     * A map click. Any id other than the target costs a guess — no dedup —
     * including an id that is not in `items` at all (a landmark background
     * feature, or a deselected type).
     */
    guessById(id) {
      if (s.phase !== PLAYING) return ignored();
      return resolve(id === s.targetId);
    },

    /** A typed answer. Empty or whitespace-only input consumes no guess. */
    guessByText(text) {
      if (s.phase !== PLAYING) return ignored();
      if (typeof text !== 'string' || text.trim() === '') return ignored();
      if (s.mode === 'name-capital') {
        return resolve(matchCapital(text, items[s.targetId]));
      }
      if (s.mode === 'name-bundesland') {
        return resolve(matchBundesland(text, aliases) === s.targetId);
      }
      if (s.mode === 'name-landmark') {
        return resolve(matchLandmark(text, aliases) === s.targetId);
      }
      return ignored();
    },

    /** Advance to the next round, or finish. */
    next() {
      if (s.phase === FINISHED) return { phase: s.phase, finished: true };
      return advance();
    },

    /**
     * Count the round as skipped and advance; never enters feedback. Only a
     * round still being played can be skipped: in feedback the round is
     * already answered, so a skip there changes nothing.
     */
    skip() {
      if (s.phase === FINISHED) return { phase: s.phase, finished: true };
      if (s.phase !== PLAYING) return { phase: s.phase, finished: false, ignored: true };
      s.skipped++;
      return advance();
    },

    /** Stop early. The round in progress still counts as played. */
    quit() {
      s.phase = FINISHED;
      return { phase: s.phase, finished: true };
    },

    /**
     * Rounds played counts a round in progress as played, so quitting halfway
     * through round 3 of 10 reports 3 played. The percentage is over rounds
     * played, not over rounds configured.
     */
    summary() {
      const roundsPlayed = s.currentRound >= s.totalRounds ? s.totalRounds : s.currentRound + 1;
      const percent = roundsPlayed > 0 ? Math.round((s.score / roundsPlayed) * 100) : 0;
      return { roundsPlayed, correct: s.score, skipped: s.skipped, percent };
    },
  };
}
