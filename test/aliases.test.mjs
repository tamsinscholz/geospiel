import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { createGame, normalize, matchBundesland } from '../game-core.mjs';

/* === The Bundesland alias table ===
 *
 * The hand-authored `data/bundesland-aliases.json`, exercised through the
 * game-core seam exactly as Bundesland benennen uses it: `matchBundesland`
 * and `guessByText` over the committed file, not over a fixture.
 */

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));

const aliases = readJson('data/bundesland-aliases.json');
const metadata = readJson('data/bundeslaender.json');

const ISO_KEYS = [
  'DE-BB', 'DE-BE', 'DE-BW', 'DE-BY', 'DE-HB', 'DE-HE', 'DE-HH', 'DE-MV',
  'DE-NI', 'DE-NW', 'DE-RP', 'DE-SH', 'DE-SL', 'DE-SN', 'DE-ST', 'DE-TH',
];

/** Assert that every spelling in `spellings` matches Bundesland `key`. */
function assertAllMatch(key, spellings) {
  for (const text of spellings) {
    assert.strictEqual(matchBundesland(text, aliases), key, `${JSON.stringify(text)} -> ${key}`);
  }
}

/* === Shape === */

test('every alias points at one of the sixteen Bundesländer', () => {
  const stray = Object.entries(aliases).filter(([, key]) => !ISO_KEYS.includes(key));
  assert.deepStrictEqual(stray, []);
});

test('every alias key normalises to something non-empty', () => {
  assert.deepStrictEqual(Object.keys(aliases).filter(k => normalize(k) === ''), []);
});

test('no two aliases normalise to the same string while pointing at different Bundesländer', () => {
  const seen = new Map();
  const collisions = [];
  for (const [alias, key] of Object.entries(aliases)) {
    const canonical = normalize(alias);
    const earlier = seen.get(canonical);
    if (earlier && earlier.key !== key) collisions.push(`${earlier.alias} / ${alias} -> ${canonical}`);
    else seen.set(canonical, { alias, key });
  }
  assert.deepStrictEqual(collisions, []);
});

test('every Bundesland has at least one alias', () => {
  const covered = new Set(Object.values(aliases));
  assert.deepStrictEqual(ISO_KEYS.filter(k => !covered.has(k)), []);
});

/* === Plain names and spellings === */

test('all sixteen plain German names match their own Bundesland', () => {
  for (const [key, b] of Object.entries(metadata)) {
    assert.strictEqual(matchBundesland(b.name, aliases), key, b.name);
  }
});

test('umlaut, transliterated and bare spellings of Baden-Württemberg all match', () => {
  assertAllMatch('DE-BW', [
    'Baden-Württemberg', 'Baden Wuerttemberg', 'baden wurttemberg', 'BadenWürttemberg',
  ]);
});

test('umlaut, transliterated and bare spellings of Thüringen all match', () => {
  assertAllMatch('DE-TH', ['Thüringen', 'Thueringen', 'thuringen', 'THÜRINGEN']);
});

test('hyphens, spaces and casing are ignored', () => {
  assertAllMatch('DE-NW', ['Nordrhein-Westfalen', 'nordrhein westfalen', 'NORDRHEINWESTFALEN']);
  assertAllMatch('DE-ST', ['Sachsen-Anhalt', 'sachsen anhalt', 'SachsenAnhalt', '  sachsen-ANHALT ']);
  assertAllMatch('DE-MV', ['mecklenburg vorpommern', 'Mecklenburg - Vorpommern']);
});

/* === Long forms, abbreviations, English names === */

test('official long forms match', () => {
  assertAllMatch('DE-BY', ['Freistaat Bayern']);
  assertAllMatch('DE-SN', ['Freistaat Sachsen']);
  assertAllMatch('DE-TH', ['Freistaat Thüringen', 'Freistaat Thueringen']);
  assertAllMatch('DE-HH', ['Freie und Hansestadt Hamburg']);
  assertAllMatch('DE-HB', ['Freie Hansestadt Bremen']);
  assertAllMatch('DE-BE', ['Land Berlin']);
  assertAllMatch('DE-NW', ['Land Nordrhein-Westfalen']);
});

test('everyday abbreviations match', () => {
  assertAllMatch('DE-NW', ['NRW', 'nrw']);
  assertAllMatch('DE-BW', ['BaWü', 'Bawue', 'bawu', 'Ba-Wü']);
  assertAllMatch('DE-MV', ['MV', 'Meck-Pomm', 'MeckPomm', 'meck pomm']);
  assertAllMatch('DE-SH', ['SH']);
  assertAllMatch('DE-RP', ['RLP']);
});

test('the English names match', () => {
  assertAllMatch('DE-BY', ['Bavaria']);
  assertAllMatch('DE-SN', ['Saxony']);
  assertAllMatch('DE-NI', ['Lower Saxony']);
  assertAllMatch('DE-TH', ['Thuringia']);
  assertAllMatch('DE-HE', ['Hesse']);
  assertAllMatch('DE-NW', ['North Rhine-Westphalia']);
  assertAllMatch('DE-RP', ['Rhineland-Palatinate']);
  assertAllMatch('DE-MV', ['Mecklenburg-Western Pomerania']);
  assertAllMatch('DE-ST', ['Saxony-Anhalt']);
});

test('an English name matches and the name carried for display is the German one', () => {
  assert.strictEqual(metadata[matchBundesland('Bavaria', aliases)].name, 'Bayern');
  assert.strictEqual(metadata[matchBundesland('Lower Saxony', aliases)].name, 'Niedersachsen');
});

test('common misspellings match', () => {
  assertAllMatch('DE-BW', ['Baden-Würtemberg']);
  assertAllMatch('DE-NW', ['Nordrhein-Westphalen']);
  assertAllMatch('DE-SH', ['Schleswig-Holstien']);
  assertAllMatch('DE-NI', ['Niedersachen']);
});

/* === The confusable pair === */

test('Sachsen and Sachsen-Anhalt never match each other', () => {
  assert.strictEqual(matchBundesland('Sachsen', aliases), 'DE-SN');
  assert.strictEqual(matchBundesland('Sachsen-Anhalt', aliases), 'DE-ST');
  assert.strictEqual(matchBundesland('Saxony', aliases), 'DE-SN');
  assert.strictEqual(matchBundesland('Saxony-Anhalt', aliases), 'DE-ST');
});

test('Sachsen typed for a Sachsen-Anhalt round costs a Versuch, and the reverse too', () => {
  const pair = { 'DE-ST': metadata['DE-ST'], 'DE-SN': metadata['DE-SN'] };
  const game = createGame({
    items: pair, aliases, mode: 'name-bundesland', totalRounds: 2, maxGuesses: 3, shuffle: a => a,
  });

  assert.strictEqual(game.state.targetId, 'DE-ST');
  assert.strictEqual(game.guessByText('Sachsen').correct, false);
  assert.strictEqual(game.guessByText('Sachsen-Anhalt').correct, true);

  game.next();
  assert.strictEqual(game.state.targetId, 'DE-SN');
  assert.strictEqual(game.guessByText('Sachsen-Anhalt').correct, false);
  assert.strictEqual(game.guessByText('Sachsen').correct, true);
});

test('an unknown string or a partial region name is rejected', () => {
  assert.strictEqual(matchBundesland('Atlantis', aliases), null);
  assert.strictEqual(matchBundesland('Anhalt', aliases), null);
  assert.strictEqual(matchBundesland('Rheinland', aliases), null);
  assert.strictEqual(matchBundesland('Pfalz', aliases), null);
});
