import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { createGame, normalize, matchCapital } from '../game-core.mjs';

/* === The Landeshauptstädte ===
 *
 * Capital matching over the committed `data/bundeslaender.json`, exercised
 * through the game-core seam exactly as Landeshauptstadt benennen uses it:
 * `matchCapital` and `guessByText` over the real metadata, not a fixture.
 */

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));

const metadata = readJson('data/bundeslaender.json');
const keys = Object.keys(metadata);

/** Every spelling a Bundesland accepts as its capital: the field plus its variants. */
const acceptedSpellings = m => [m.capital, ...(m.capital_variants ?? [])];

/** A capital-mode game over the real metadata whose first round is `key`. */
function capitalGameOn(key) {
  return createGame({
    items: metadata,
    mode: 'name-capital',
    totalRounds: 16,
    maxGuesses: 3,
    shuffle: ids => [key, ...ids.filter(id => id !== key)],
  });
}

/* === Own capital === */

test('all sixteen Landeshauptstädte are accepted for their own Bundesland', () => {
  assert.strictEqual(keys.length, 16);
  for (const key of keys) {
    assert.ok(matchCapital(metadata[key].capital, metadata[key]), `${metadata[key].capital} -> ${key}`);
  }
});

test('umlaut, transliterated and bare spellings of a capital all score', () => {
  const cases = {
    'DE-BY': ['München', 'Muenchen', 'Munchen', 'münchen', ' MÜNCHEN '],
    'DE-NW': ['Düsseldorf', 'Duesseldorf', 'Dusseldorf'],
    'DE-SL': ['Saarbrücken', 'Saarbruecken', 'Saarbrucken', 'Saar-brücken'],
  };
  for (const [key, spellings] of Object.entries(cases)) {
    for (const text of spellings) {
      assert.ok(matchCapital(text, metadata[key]), `${JSON.stringify(text)} -> ${key}`);
    }
  }
});

test('the Stadtstaaten score with their own name as the capital', () => {
  for (const [key, city] of [['DE-BE', 'Berlin'], ['DE-HH', 'Hamburg'], ['DE-HB', 'Bremen']]) {
    assert.strictEqual(metadata[key].capital, metadata[key].name, key);
    assert.ok(matchCapital(city, metadata[key]), `${city} -> ${key}`);
  }
});

test('the English exonyms Munich and Hanover score for their Bundesland', () => {
  assert.ok(matchCapital('Munich', metadata['DE-BY']));
  assert.ok(matchCapital('Hanover', metadata['DE-NI']));
});

/* === Everyone else's capital === */

test('every other Bundesland\'s Landeshauptstadt is rejected, for each Bundesland', () => {
  const wrong = [];
  for (const target of keys) {
    for (const other of keys) {
      if (other === target) continue;
      for (const text of acceptedSpellings(metadata[other])) {
        if (matchCapital(text, metadata[target])) wrong.push(`${text} accepted for ${target}`);
      }
    }
  }
  assert.deepStrictEqual(wrong, []);
});

test('no two Bundesländer accept a capital spelling that normalises to the same string', () => {
  const seen = new Map();
  const collisions = [];
  for (const key of keys) {
    for (const text of acceptedSpellings(metadata[key])) {
      const canonical = normalize(text);
      const earlier = seen.get(canonical);
      if (earlier && earlier !== key) collisions.push(`${earlier} / ${key} -> ${canonical}`);
      else seen.set(canonical, key);
    }
  }
  assert.deepStrictEqual(collisions, []);
});

test('an unknown city or a Bundesland name is rejected rather than throwing', () => {
  for (const text of ['Köln', 'Nürnberg', 'Frankfurt', 'Atlantis', 'Bayern', 'Sachsen']) {
    for (const key of keys) {
      assert.strictEqual(matchCapital(text, metadata[key]), false, `${text} for ${key}`);
    }
  }
});

/* === Through the game === */

test('a correct capital typed in Landeshauptstadt benennen scores a point', () => {
  const game = capitalGameOn('DE-ST');
  const result = game.guessByText('Magdeburg');
  assert.strictEqual(result.correct, true);
  assert.strictEqual(game.state.score, 1);
  assert.strictEqual(game.state.phase, 'feedback');
});

test('a transliterated capital typed in Landeshauptstadt benennen scores a point', () => {
  const game = capitalGameOn('DE-SL');
  assert.strictEqual(game.guessByText('Saarbruecken').correct, true);
  assert.strictEqual(game.state.score, 1);
});

test('another Bundesland\'s capital costs a Versuch and the round keeps playing', () => {
  const game = capitalGameOn('DE-BY');
  const result = game.guessByText('Stuttgart');
  assert.strictEqual(result.correct, false);
  assert.strictEqual(result.guessesLeft, 2);
  assert.strictEqual(result.exhausted, false);
  assert.strictEqual(game.state.phase, 'playing');
  assert.strictEqual(game.state.score, 0);
});

test('the Bundesland name typed in Landeshauptstadt benennen is judged as a wrong capital', () => {
  const game = capitalGameOn('DE-ST');
  assert.strictEqual(game.guessByText('Sachsen-Anhalt').correct, false);
  assert.strictEqual(game.state.guessesLeft, 2);
});

test('three wrong capitals exhaust the round without scoring', () => {
  const game = capitalGameOn('DE-ST');
  game.guessByText('Dresden');
  game.guessByText('Erfurt');
  const result = game.guessByText('Atlantis');
  assert.strictEqual(result.exhausted, true);
  assert.strictEqual(game.state.phase, 'feedback');
  assert.strictEqual(game.state.score, 0);
});

test('a Stadtstaat round scores when its own name is typed', () => {
  const game = capitalGameOn('DE-HB');
  assert.strictEqual(game.guessByText('Bremen').correct, true);
});

test('a full game typing every correct capital scores sixteen of sixteen', () => {
  const game = createGame({ items: metadata, mode: 'name-capital', totalRounds: 16 });
  while (game.state.phase !== 'finished') {
    assert.strictEqual(game.guessByText(metadata[game.state.targetId].capital).correct, true);
    game.next();
  }
  assert.deepStrictEqual(game.summary(), { roundsPlayed: 16, correct: 16, skipped: 0, percent: 100 });
});
