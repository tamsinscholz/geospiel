import test from 'node:test';
import assert from 'node:assert';

import {
  createGame,
  normalize,
  matchBundesland,
  matchCapital,
} from '../game-core.mjs';

/* === Fixtures ===
 *
 * Small and synthetic on purpose: the real data is swapped out in a later
 * ticket, and these tests must stay valid when it is. Ids are opaque strings,
 * as they are for the module.
 */

const items = {
  A1: { name: 'Baden-Württemberg', capital: 'Stuttgart' },
  A2: { name: 'Sachsen', capital: 'Dresden' },
  A3: { name: 'Sachsen-Anhalt', capital: 'Magdeburg' },
  A4: { name: 'Bayern', capital: 'München' },
  A5: { name: 'Nordrhein-Westfalen', capital: 'Düsseldorf' },
  A6: { name: 'Mecklenburg-Vorpommern', capital: 'Schwerin', capital_variants: ['Schwerin an der Elbe'] },
};

const aliases = {
  'Baden-Württemberg': 'A1',
  'BaWü': 'A1',
  'Sachsen': 'A2',
  'Freistaat Sachsen': 'A2',
  'Sachsen-Anhalt': 'A3',
  'Saxony-Anhalt': 'A3',
  'Bayern': 'A4',
  'Freistaat Bayern': 'A4',
  'Bavaria': 'A4',
  'Nordrhein-Westfalen': 'A5',
  'NRW': 'A5',
  'Mecklenburg-Vorpommern': 'A6',
  'MV': 'A6',
};

/** An injected shuffle that shuffles nothing, so the round order is A1, A2, … */
const inOrder = arr => arr;

/** An injected shuffle that reverses, to prove the order really comes from it. */
const reversed = arr => arr.slice().reverse();

function newGame(overrides = {}) {
  return createGame({
    items,
    aliases,
    mode: 'find',
    totalRounds: 3,
    maxGuesses: 3,
    shuffle: inOrder,
    ...overrides,
  });
}

/* === Guess accounting === */

test('a correct map click scores a point and moves to feedback', () => {
  const game = newGame();
  const result = game.guessById('A1');

  assert.strictEqual(result.correct, true);
  assert.strictEqual(result.phase, 'feedback');
  assert.strictEqual(result.exhausted, false);
  assert.strictEqual(game.state.score, 1);
  assert.strictEqual(game.state.phase, 'feedback');
});

test('a wrong map click costs one guess and the round keeps playing', () => {
  const game = newGame();
  const result = game.guessById('A5');

  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.guessesLeft, 2);
  assert.strictEqual(result.exhausted, false);
  assert.strictEqual(result.phase, 'playing');
  assert.strictEqual(game.state.score, 0);
  assert.strictEqual(game.state.guessesLeft, 2);
});

test('the last available wrong guess moves to feedback and leaves the score alone', () => {
  const game = newGame({ maxGuesses: 2 });

  assert.strictEqual(game.guessById('A5').phase, 'playing');
  const last = game.guessById('A6');

  assert.strictEqual(last.correct, false);
  assert.strictEqual(last.guessesLeft, 0);
  assert.strictEqual(last.exhausted, true);
  assert.strictEqual(last.phase, 'feedback');
  assert.strictEqual(game.state.score, 0);
});

test('remaining guesses reset to the maximum at the start of each round', () => {
  const game = newGame({ maxGuesses: 3 });
  game.guessById('A5');
  game.guessById('A6');
  assert.strictEqual(game.state.guessesLeft, 1);

  game.next();

  assert.strictEqual(game.state.guessesLeft, 3);
  assert.strictEqual(game.state.currentRound, 1);
  assert.strictEqual(game.state.targetId, 'A2');
});

test('guessing the same wrong item twice costs two guesses', () => {
  const game = newGame({ maxGuesses: 3 });
  game.guessById('A5');
  const second = game.guessById('A5');

  assert.strictEqual(second.guessesLeft, 1);
  assert.strictEqual(second.phase, 'playing');
});

test('empty input consumes no guess and changes no state', () => {
  const game = newGame({ mode: 'name-bundesland' });
  const before = game.state;
  const result = game.guessByText('');

  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.guessesLeft, 3);
  assert.strictEqual(result.phase, 'playing');
  assert.deepStrictEqual(game.state, before);
});

test('whitespace-only input consumes no guess and changes no state', () => {
  const game = newGame({ mode: 'name-bundesland' });
  const before = game.state;

  assert.strictEqual(game.guessByText('   \t  ').guessesLeft, 3);
  assert.deepStrictEqual(game.state, before);
});

test('a correct typed name scores a point and moves to feedback', () => {
  const game = newGame({ mode: 'name-bundesland' });
  const result = game.guessByText('baden wurttemberg');

  assert.strictEqual(result.correct, true);
  assert.strictEqual(result.phase, 'feedback');
  assert.strictEqual(game.state.score, 1);
});

test('a wrong typed name costs one guess', () => {
  const game = newGame({ mode: 'name-bundesland' });
  const result = game.guessByText('Bayern');

  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.guessesLeft, 2);
  assert.strictEqual(game.state.score, 0);
});

test('a correct typed capital scores a point in capital mode', () => {
  const game = newGame({ mode: 'name-capital' });
  const result = game.guessByText('Stuttgart');

  assert.strictEqual(result.correct, true);
  assert.strictEqual(game.state.score, 1);
});

test('a further guess once the round is over is ignored', () => {
  const game = newGame();
  game.guessById('A1');
  const after = game.guessById('A2');

  assert.strictEqual(after.correct, false);
  assert.strictEqual(after.ignored, true);
  assert.strictEqual(after.phase, 'feedback');
  assert.strictEqual(game.state.score, 1);
  assert.strictEqual(game.state.guessesLeft, 3);
});

/* === Round sequencing === */

test('the round order has exactly the configured number of rounds and no repeats', () => {
  const game = createGame({ items, aliases, mode: 'find', totalRounds: 4, shuffle: inOrder });
  const order = game.state.roundOrder;

  assert.strictEqual(order.length, 4);
  assert.strictEqual(new Set(order).size, 4);
  order.forEach(id => assert.ok(id in items, `${id} is a known item`));
});

test('a round count above the number of available items is clamped', () => {
  const game = createGame({ items, aliases, mode: 'find', totalRounds: 40, shuffle: inOrder });

  assert.strictEqual(game.state.totalRounds, 6);
  assert.strictEqual(game.state.roundOrder.length, 6);
});

test('the injected shuffle decides the round order', () => {
  const game = createGame({ items, aliases, mode: 'find', totalRounds: 2, shuffle: reversed });

  assert.deepStrictEqual(game.state.roundOrder, ['A6', 'A5']);
  assert.strictEqual(game.state.targetId, 'A6');
});

test('advancing past the last round reports finished', () => {
  const game = newGame({ totalRounds: 2 });

  assert.deepStrictEqual(game.next(), { phase: 'playing', finished: false });
  assert.deepStrictEqual(game.next(), { phase: 'finished', finished: true });
  assert.strictEqual(game.state.phase, 'finished');
});

test('skipping counts a skip, leaves the score untouched and does not enter feedback', () => {
  const game = newGame();
  const result = game.skip();

  assert.strictEqual(result.finished, false);
  assert.strictEqual(result.phase, 'playing');
  assert.strictEqual(game.state.skipped, 1);
  assert.strictEqual(game.state.score, 0);
  assert.strictEqual(game.state.currentRound, 1);
  assert.strictEqual(game.state.targetId, 'A2');
});

test('skipping the last round finishes the game', () => {
  const game = newGame({ totalRounds: 1 });

  assert.deepStrictEqual(game.skip(), { phase: 'finished', finished: true });
  assert.strictEqual(game.state.skipped, 1);
});

test('quitting reports finished and counts the round in progress as played', () => {
  const game = newGame({ totalRounds: 10 });
  game.guessById('A1');
  game.next();
  game.guessById('A2');
  game.next(); // now in round 3 of 10, unanswered

  assert.strictEqual(game.quit().finished, true);
  assert.deepStrictEqual(game.summary(), { roundsPlayed: 3, correct: 2, skipped: 0, percent: 67 });
});

test('the summary percentage is over rounds played, not rounds configured', () => {
  const game = newGame({ totalRounds: 10 });
  game.guessById('A1'); // correct, round 1 of 10
  game.quit();

  const summary = game.summary();
  assert.strictEqual(summary.roundsPlayed, 1);
  assert.strictEqual(summary.percent, 100);
});

test('a game played to the end reports every configured round as played', () => {
  const game = newGame({ totalRounds: 3, maxGuesses: 1 });
  game.guessById('A1');  // correct
  game.next();
  game.guessById('A6');  // wrong, out of guesses
  game.next();
  game.skip();           // skips the third round and finishes

  assert.deepStrictEqual(game.summary(), { roundsPlayed: 3, correct: 1, skipped: 1, percent: 33 });
  assert.strictEqual(game.state.phase, 'finished');
});

test('the state a game hands out cannot be used to change it', () => {
  const game = newGame();
  const state = game.state;
  state.score = 99;
  state.roundOrder.push('A9');

  assert.strictEqual(game.state.score, 0);
  assert.strictEqual(game.state.roundOrder.length, 3);
});

/* === Normalization === */

test('umlaut, transliterated and bare spellings canonicalise together', () => {
  assert.strictEqual(normalize('Württemberg'), 'wurttemberg');
  assert.strictEqual(normalize('Wuerttemberg'), 'wurttemberg');
  assert.strictEqual(normalize('Wurttemberg'), 'wurttemberg');
  assert.strictEqual(normalize('München'), 'munchen');
  assert.strictEqual(normalize('Muenchen'), 'munchen');
  assert.strictEqual(normalize('Thüringen'), 'thuringen');
  assert.strictEqual(normalize('thueringen'), 'thuringen');
});

test('sharp s folds to a double s', () => {
  assert.strictEqual(normalize('Weißenburg'), 'weissenburg');
  assert.strictEqual(normalize('WEIß'), 'weiss');
});

test('hyphens, spaces, punctuation and case are ignored', () => {
  assert.strictEqual(normalize('Sachsen-Anhalt'), 'sachsenanhalt');
  assert.strictEqual(normalize('Sachsen Anhalt'), 'sachsenanhalt');
  assert.strictEqual(normalize('  SACHSEN-ANHALT  '), 'sachsenanhalt');
  assert.strictEqual(normalize("Sankt Peter'sburg."), 'sanktpetersburg');
});

test('a confusable pair stays distinct under the normalizer', () => {
  assert.notStrictEqual(normalize('Sachsen'), normalize('Sachsen-Anhalt'));
});

test('digits survive normalization', () => {
  assert.strictEqual(normalize('Rheinland-Pfalz 2'), 'rheinlandpfalz2');
});

test('normalizing a non-string yields the empty string rather than throwing', () => {
  assert.strictEqual(normalize(undefined), '');
  assert.strictEqual(normalize(null), '');
  assert.strictEqual(normalize(42), '');
});

/* === Matching === */

test('a name matches through the alias table however it is spelled', () => {
  assert.strictEqual(matchBundesland('Baden-Württemberg', aliases), 'A1');
  assert.strictEqual(matchBundesland('Baden Wuerttemberg', aliases), 'A1');
  assert.strictEqual(matchBundesland('badenwurttemberg', aliases), 'A1');
  assert.strictEqual(matchBundesland('bawü', aliases), 'A1');
});

test('abbreviations and official long forms match', () => {
  assert.strictEqual(matchBundesland('NRW', aliases), 'A5');
  assert.strictEqual(matchBundesland('nrw', aliases), 'A5');
  assert.strictEqual(matchBundesland('MV', aliases), 'A6');
  assert.strictEqual(matchBundesland('Freistaat Bayern', aliases), 'A4');
});

test('an English name matches, and the name carried for display is the German one', () => {
  const id = matchBundesland('Bavaria', aliases);

  assert.strictEqual(id, 'A4');
  assert.strictEqual(items[id].name, 'Bayern');
});

test('a confusable pair is not matched to each other', () => {
  assert.strictEqual(matchBundesland('Sachsen', aliases), 'A2');
  assert.strictEqual(matchBundesland('Sachsen-Anhalt', aliases), 'A3');
});

test('an unknown string is rejected rather than throwing', () => {
  assert.strictEqual(matchBundesland('Atlantis', aliases), null);
  assert.strictEqual(matchBundesland('', aliases), null);
  assert.strictEqual(matchBundesland(undefined, aliases), null);
  assert.strictEqual(matchBundesland('Bayern', undefined), null);
});

test('a capital matches with or without its umlaut', () => {
  assert.strictEqual(matchCapital('München', items.A4), true);
  assert.strictEqual(matchCapital('Muenchen', items.A4), true);
  assert.strictEqual(matchCapital('munchen', items.A4), true);
  assert.strictEqual(matchCapital('Duesseldorf', items.A5), true);
});

test('another item\'s capital is rejected', () => {
  assert.strictEqual(matchCapital('Dresden', items.A4), false);
  assert.strictEqual(matchCapital('Magdeburg', items.A2), false);
});

test('an extra accepted capital variant matches', () => {
  assert.strictEqual(matchCapital('Schwerin an der Elbe', items.A6), true);
  assert.strictEqual(matchCapital('Schwerin', items.A6), true);
});

test('an unknown or empty capital is rejected rather than throwing', () => {
  assert.strictEqual(matchCapital('Atlantis', items.A1), false);
  assert.strictEqual(matchCapital('', items.A1), false);
  assert.strictEqual(matchCapital(undefined, items.A1), false);
  assert.strictEqual(matchCapital('Stuttgart', undefined), false);
});

test('a typed name in capital mode is judged against the capital, not the name', () => {
  const game = newGame({ mode: 'name-capital' });
  const result = game.guessByText('Baden-Württemberg');

  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.guessesLeft, 2);
});
