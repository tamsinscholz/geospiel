import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { normalize, matchBundesland } from '../game-core.mjs';

/* === The landmark alias table ===
 *
 * The hand-authored `data/landmark-aliases.json` against the curated
 * `data/landmarks.json`. It covers pool features only: background features
 * are never targets, so they need names but no aliases.
 *
 * Until `matchLandmark` exists (ticket 02 of .scratch/gewaesser-staedte), the
 * lookup goes through `matchBundesland`, which is the same canonical alias
 * lookup with a domain name; the article-stripping cases ("der Rhein",
 * "die Rhein") arrive with `matchLandmark`.
 */

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));

const aliases = readJson('data/landmark-aliases.json');
const landmarks = readJson('data/landmarks.json');

const records = Object.entries(landmarks);
const poolIds = records.filter(([, r]) => r.pool).map(([id]) => id);
const ARTICLE = /^(der|die|das)\s/i;

/** Assert that every spelling in `spellings` matches landmark `id`. */
function assertAllMatch(id, spellings) {
  for (const text of spellings) {
    assert.strictEqual(matchBundesland(text, aliases), id, `${JSON.stringify(text)} -> ${id}`);
  }
}

/* === Shape === */

test('every alias points at a pool feature', () => {
  const missing = Object.entries(aliases).filter(([, id]) => !(id in landmarks));
  const background = Object.entries(aliases).filter(([, id]) => landmarks[id] && !landmarks[id].pool);
  assert.deepStrictEqual(missing, [], 'aliases for ids with no record');
  assert.deepStrictEqual(background, [], 'aliases for background features');
});

test('every pool feature has at least one alias', () => {
  const covered = new Set(Object.values(aliases));
  assert.deepStrictEqual(poolIds.filter(id => !covered.has(id)), []);
  assert.strictEqual(poolIds.length, 41);
});

test('every alias key normalises to something non-empty', () => {
  assert.deepStrictEqual(Object.keys(aliases).filter(k => normalize(k) === ''), []);
});

test('no two aliases normalise to the same string while pointing at different features', () => {
  const seen = new Map();
  const collisions = [];
  for (const [alias, id] of Object.entries(aliases)) {
    const canonical = normalize(alias);
    const earlier = seen.get(canonical);
    if (earlier && earlier.id !== id) collisions.push(`${earlier.alias} / ${alias} -> ${canonical}`);
    else seen.set(canonical, { alias, id });
  }
  assert.deepStrictEqual(collisions, []);
});

/* === Names === */

test('every pool feature is reachable by its own curated name', () => {
  for (const id of poolIds) {
    assert.strictEqual(matchBundesland(landmarks[id].name, aliases), id, landmarks[id].name);
  }
});

test('no two of the 53 feature names canonicalise to the same string', () => {
  const byCanonical = new Map();
  for (const [id, r] of records) {
    const canonical = normalize(r.name);
    assert.ok(!byCanonical.has(canonical), `${byCanonical.get(canonical)} / ${id} -> ${canonical}`);
    byCanonical.set(canonical, id);
  }
  assert.strictEqual(byCanonical.size, 53);
});

test('no feature name or alias starts with an article', () => {
  assert.deepStrictEqual(records.filter(([, r]) => ARTICLE.test(r.name)).map(([id]) => id), []);
  assert.deepStrictEqual(Object.keys(aliases).filter(k => ARTICLE.test(k)), []);
});

test('Main and Mainz stay distinct', () => {
  assert.notStrictEqual(normalize('Main'), normalize('Mainz'));
  assert.strictEqual(matchBundesland('Main', aliases), 'river-main');
  assert.strictEqual(matchBundesland('Mainz', aliases), 'city-mainz');
});

test('Elbe and Ems stay distinct', () => {
  assert.notStrictEqual(normalize('Elbe'), normalize('Ems'));
  assert.strictEqual(matchBundesland('Elbe', aliases), 'river-elbe');
  assert.strictEqual(matchBundesland('Ems', aliases), 'river-ems');
});

test('Schwerin and the Schweriner See stay distinct', () => {
  assert.strictEqual(matchBundesland('Schwerin', aliases), 'city-schwerin');
  assert.strictEqual(matchBundesland('Schweriner See', aliases), 'lake-schweriner-see');
});

/* === Short forms and exonyms (spec, "Answer matching and aliases") === */

test('the long city names match by their short form', () => {
  assertAllMatch('city-frankfurt', ['Frankfurt am Main', 'Frankfurt', 'frankfurt/main']);
  assertAllMatch('city-freiburg', ['Freiburg im Breisgau', 'Freiburg', 'Freiburg i. Br.']);
});

test('the common exonyms match', () => {
  assertAllMatch('river-rhein', ['Rhine']);
  assertAllMatch('river-donau', ['Danube']);
  assertAllMatch('river-mosel', ['Moselle']);
  assertAllMatch('lake-bodensee', ['Lake Constance', 'Schwäbisches Meer', 'Schwaebisches Meer']);
  assertAllMatch('city-koeln', ['Cologne']);
  assertAllMatch('city-muenchen', ['Munich']);
  assertAllMatch('city-nuernberg', ['Nuremberg']);
  assertAllMatch('city-hannover', ['Hanover']);
});

test('umlaut and transliterated spellings match', () => {
  assertAllMatch('city-koeln', ['Köln', 'Koeln', 'koln']);
  assertAllMatch('city-duesseldorf', ['Düsseldorf', 'Duesseldorf', 'Dusseldorf']);
  assertAllMatch('lake-mueritz', ['Müritz', 'Mueritz', 'muritz']);
  assertAllMatch('city-saarbruecken', ['Saarbrücken', 'Saarbruecken']);
});

test('the Stadtstaaten are cities here', () => {
  assertAllMatch('city-berlin', ['Berlin']);
  assertAllMatch('city-hamburg', ['Hamburg', 'Hansestadt Hamburg']);
  assertAllMatch('city-bremen', ['Bremen']);
});

test('background features, Frankfurt (Oder) and the bare article match nothing', () => {
  for (const [, r] of records.filter(([, r]) => !r.pool)) {
    assert.strictEqual(matchBundesland(r.name, aliases), null, r.name);
  }
  assert.strictEqual(matchBundesland('Frankfurt (Oder)', aliases), null);
  assert.strictEqual(matchBundesland('der', aliases), null);
});
