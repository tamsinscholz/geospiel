import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { normalize, matchLandmark } from '../game-core.mjs';

/* === The landmark alias table ===
 *
 * The hand-authored `data/landmark-aliases.json` against the curated
 * `data/landmarks.json`. It covers pool features only: background features
 * are never targets, so they need names but no aliases.
 *
 * Every lookup goes through `matchLandmark`, as the `name-landmark` mode does,
 * so one leading article ("der Rhein", even a wrong "die Rhein") is accepted.
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
    assert.strictEqual(matchLandmark(text, aliases), id, `${JSON.stringify(text)} -> ${id}`);
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
    assert.strictEqual(matchLandmark(landmarks[id].name, aliases), id, landmarks[id].name);
  }
});

test('every pool feature with an article is reachable by its name with that article', () => {
  const withArticle = poolIds.filter(id => landmarks[id].article);
  assert.ok(withArticle.length > 0);
  for (const id of withArticle) {
    const text = `${landmarks[id].article} ${landmarks[id].name}`;
    assert.strictEqual(matchLandmark(text, aliases), id, text);
  }
});

test('a wrong article is accepted and the bare article matches nothing', () => {
  assert.strictEqual(matchLandmark('der Rhein', aliases), 'river-rhein');
  assert.strictEqual(matchLandmark('die Rhein', aliases), 'river-rhein');
  assert.strictEqual(matchLandmark('der', aliases), null);
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
  assert.strictEqual(matchLandmark('Main', aliases), 'river-main');
  assert.strictEqual(matchLandmark('Mainz', aliases), 'city-mainz');
});

test('Elbe and Ems stay distinct', () => {
  assert.notStrictEqual(normalize('Elbe'), normalize('Ems'));
  assert.strictEqual(matchLandmark('Elbe', aliases), 'river-elbe');
  assert.strictEqual(matchLandmark('Ems', aliases), 'river-ems');
});

test('Schwerin and the Schweriner See stay distinct', () => {
  assert.strictEqual(matchLandmark('Schwerin', aliases), 'city-schwerin');
  assert.strictEqual(matchLandmark('Schweriner See', aliases), 'lake-schweriner-see');
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
    assert.strictEqual(matchLandmark(r.name, aliases), null, r.name);
  }
  assert.strictEqual(matchLandmark('Frankfurt (Oder)', aliases), null);
  assert.strictEqual(matchLandmark('der', aliases), null);
});
