import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

import { nearestLandmark } from '../landmark-hit.mjs';

/* === Fixtures ===
 *
 * Synthetic geometry in viewBox units, laid out on a 100 × 100 grid so every
 * expected distance can be read off by eye. Ids are opaque strings, as they
 * are for the module.
 */

/** A river running straight across the grid at y = 50. */
const riverA = { id: 'river-a', kind: 'river', lines: [[[0, 50], [100, 50]]] };

/** A second river at y = 60, bent, in two polylines. */
const riverB = {
  id: 'river-b',
  kind: 'river',
  lines: [
    [[0, 60], [40, 60]],
    [[40, 60], [70, 60], [100, 90]],
  ],
};

/** A square lake from (20, 40) to (80, 70) with a square island from (40, 50) to (60, 60). */
const lakeWithIsland = {
  id: 'lake-x',
  kind: 'lake',
  polygons: [
    [
      [[20, 40], [80, 40], [80, 70], [20, 70], [20, 40]],
      [[40, 50], [60, 50], [60, 60], [40, 60], [40, 50]],
    ],
  ],
};

/** A wide island lake: the island is far larger than any hit radius used here. */
const lakeWithBigIsland = {
  id: 'lake-y',
  kind: 'lake',
  polygons: [
    [
      [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]],
      [[10, 10], [90, 10], [90, 90], [10, 90], [10, 10]],
    ],
  ],
};

const options = { radius: 4, dotRadius: 1 };

/* === Rivers === */

test('the nearer of two rivers wins', () => {
  const features = [riverA, riverB];

  assert.strictEqual(nearestLandmark([30, 52], features, options), 'river-a');
  assert.strictEqual(nearestLandmark([30, 57], features, options), 'river-b');
});

test('distance to a river is to its nearest segment, not its nearest vertex', () => {
  // Far from every vertex of river-b, but 1 unit off its diagonal segment.
  const onDiagonal = [85 + 1 / Math.SQRT2, 75 - 1 / Math.SQRT2];

  assert.strictEqual(nearestLandmark(onDiagonal, [riverB], options), 'river-b');
});

test('a point beyond the radius of every feature resolves to null', () => {
  assert.strictEqual(nearestLandmark([30, 56], [riverA], options), null);
  assert.strictEqual(nearestLandmark([30, 20], [riverA, riverB, lakeWithIsland], options), null);
});

test('a point exactly at the radius still counts', () => {
  assert.strictEqual(nearestLandmark([30, 54], [riverA], options), 'river-a');
});

test('a one-point polyline is measured as a point', () => {
  const stub = { id: 'river-stub', kind: 'river', lines: [[[10, 10]]] };

  assert.strictEqual(nearestLandmark([13, 14], [stub], { radius: 5 }), 'river-stub');
  assert.strictEqual(nearestLandmark([13, 14], [stub], { radius: 4.9 }), null);
});

test('an empty feature list resolves to null', () => {
  assert.strictEqual(nearestLandmark([30, 50], [], options), null);
});

/* === Lakes === */

test('a point inside a lake resolves to the lake, even with a river running through it', () => {
  // river-a crosses the lake at y = 50; the point is 2 units off the river.
  assert.strictEqual(nearestLandmark([25, 48], [riverA, lakeWithIsland], options), 'lake-x');
  assert.strictEqual(nearestLandmark([25, 48], [lakeWithIsland, riverA], options), 'lake-x');
});

test('a point on a river where it runs through a lake resolves to the lake', () => {
  assert.strictEqual(nearestLandmark([25, 50], [riverA, lakeWithIsland], options), 'lake-x');
});

test('a point just outside a lake resolves to it within the radius', () => {
  assert.strictEqual(nearestLandmark([18, 45], [lakeWithIsland], options), 'lake-x');
  assert.strictEqual(nearestLandmark([10, 45], [lakeWithIsland], options), null);
});

test('a point deep inside a lake\'s island is not the lake', () => {
  assert.strictEqual(nearestLandmark([50, 50], [lakeWithBigIsland], options), null);
});

test('a point inside a lake\'s island resolves to the lake within the radius of the island\'s shore', () => {
  // The island of lake-x is 10 × 10: its centre is 5 from every shore.
  assert.strictEqual(nearestLandmark([50, 55], [lakeWithIsland], options), null);
  assert.strictEqual(nearestLandmark([42, 55], [lakeWithIsland], options), 'lake-x');
});

test('a closer river on an island beats the lake around it', () => {
  const islandRiver = { id: 'river-i', kind: 'river', lines: [[[45, 55], [55, 55]]] };

  assert.strictEqual(nearestLandmark([50, 54], [lakeWithIsland, islandRiver], options), 'river-i');
});

test('a lake made of several polygons is hit in any of them', () => {
  const twoBasins = {
    id: 'lake-z',
    kind: 'lake',
    polygons: [
      [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      [[[50, 50], [60, 50], [60, 60], [50, 60]]],
    ],
  };

  assert.strictEqual(nearestLandmark([5, 5], [twoBasins], options), 'lake-z');
  assert.strictEqual(nearestLandmark([55, 55], [twoBasins], options), 'lake-z');
  assert.strictEqual(nearestLandmark([30, 30], [twoBasins], options), null);
});

/* === Cities === */

test('a point anywhere on a city dot resolves to the city', () => {
  const city = { id: 'city-c', kind: 'city', point: [30, 30] };

  assert.strictEqual(nearestLandmark([30, 30], [city], options), 'city-c');
  assert.strictEqual(nearestLandmark([30.9, 30], [city], options), 'city-c');
});

test('the radius around a city is measured from the edge of its dot', () => {
  const city = { id: 'city-c', kind: 'city', point: [30, 30] };

  // 4.5 from the centre is 3.5 from the dot's edge: inside a radius of 4.
  assert.strictEqual(nearestLandmark([34.5, 30], [city], options), 'city-c');
  assert.strictEqual(nearestLandmark([35.5, 30], [city], options), null);
});

test('a city dot sitting on a river resolves to the city', () => {
  const city = { id: 'city-c', kind: 'city', point: [30, 50] };

  assert.strictEqual(nearestLandmark([30, 50], [riverA, city], options), 'city-c');
  assert.strictEqual(nearestLandmark([30.5, 50.5], [riverA, city], options), 'city-c');
});

test('a river beats a city dot when the river is the closer shape', () => {
  const city = { id: 'city-c', kind: 'city', point: [30, 53] };

  // 1 from the river, 2 - dotRadius = 1 from the dot: a tie, so the city wins.
  assert.strictEqual(nearestLandmark([30, 51], [riverA, city], options), 'city-c');
  // 0.5 from the river, 2.5 - 1 = 1.5 from the dot: the river is closer.
  assert.strictEqual(nearestLandmark([30, 50.5], [riverA, city], options), 'river-a');
});

/* === Ties === */

test('an exact three-way tie goes to the city, then the lake, then the river', () => {
  const city = { id: 'city-c', kind: 'city', point: [25, 50] };
  const point = [25, 50];

  assert.strictEqual(nearestLandmark(point, [riverA, lakeWithIsland, city], options), 'city-c');
  assert.strictEqual(nearestLandmark(point, [city, lakeWithIsland, riverA], options), 'city-c');
  assert.strictEqual(nearestLandmark(point, [riverA, lakeWithIsland], options), 'lake-x');
});

/* === The radius === */

test('a larger radius reaches a feature that a smaller one does not', () => {
  // The caller scales the radius with the zoom level k; the resolver only sees two radii.
  const point = [30, 58];

  assert.strictEqual(nearestLandmark(point, [riverA], { radius: 4, dotRadius: 1 }), null);
  assert.strictEqual(nearestLandmark(point, [riverA], { radius: 8, dotRadius: 1 }), 'river-a');
});

/* === Purity === */

test('the module imports nothing', () => {
  const source = fs.readFileSync(new URL('../landmark-hit.mjs', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\bimport\s*\(/);
  assert.doesNotMatch(source, /\b(document|window|globalThis|d3|localStorage)\b/);
});
