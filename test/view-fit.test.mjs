import test from 'node:test';
import assert from 'node:assert';

import { screenToViewBox, intersectExtents, fitBounds } from '../view-fit.mjs';

/* === screenToViewBox === */

test('screenToViewBox: no offset, plain scale', () => {
  assert.deepStrictEqual(
    screenToViewBox([[0, 0], [200, 100]], { a: 2, d: 2, e: 0, f: 0 }),
    [[0, 0], [100, 50]]);
});

test('screenToViewBox: a horizontal letterbox shifts x by e', () => {
  // A 1440 px wide screen showing a viewBox at 1.5 px per unit, centred with
  // 300 px of letterbox on the left: screen x 300 is viewBox x 0
  assert.deepStrictEqual(
    screenToViewBox([[300, 0], [1140, 900]], { a: 1.5, d: 1.5, e: 300, f: 0 }),
    [[0, 0], [560, 600]]);
});

test('screenToViewBox: a vertical letterbox and a viewBox origin off zero', () => {
  // viewBox y starts at -20: with 150 px of top letterbox at 0.5 px per unit,
  // f = 150 - (-20 * 0.5) = 160
  const [[, y0], [, y1]] = screenToViewBox([[0, 150], [400, 650]], { a: 0.5, d: 0.5, e: 0, f: 160 });
  assert.strictEqual(y0, -20);
  assert.strictEqual(y1, 980);
});

/* === intersectExtents === */

test('intersectExtents: the overlap of two extents', () => {
  assert.deepStrictEqual(
    intersectExtents([[0, 0], [100, 100]], [[-50, 20], [60, 200]]),
    [[0, 20], [60, 100]]);
});

test('intersectExtents: one inside the other is the inner one', () => {
  assert.deepStrictEqual(
    intersectExtents([[0, 0], [100, 100]], [[10, 10], [20, 20]]),
    [[10, 10], [20, 20]]);
});

test('intersectExtents: disjoint extents give null', () => {
  assert.strictEqual(intersectExtents([[0, 0], [10, 10]], [[0, 11], [10, 20]]), null);
  assert.strictEqual(intersectExtents([[0, 0], [10, 10]], [[11, 0], [20, 10]]), null);
});

/* === fitBounds === */

test('fitBounds: centres the bounds in the area', () => {
  const { k, x, y } = fitBounds([[40, 40], [60, 60]], [[0, 0], [100, 100]], { maxScale: 2 });
  assert.strictEqual(k, 2);
  // The bounds' centre (50, 50) lands on the area's centre (50, 50)
  assert.strictEqual(50 * k + x, 50);
  assert.strictEqual(50 * k + y, 50);
});

test('fitBounds: the larger relative side fills `fill` of the area', () => {
  // 50 wide in a 100-wide area, 10 tall in a 100-tall area: width decides
  const { k } = fitBounds([[0, 0], [50, 10]], [[0, 0], [100, 100]], { fill: 0.9 });
  assert.strictEqual(k, 0.9 * 100 / 50);
});

test('fitBounds: a band narrower than the viewBox fits by its own height', () => {
  // The same 20-tall bounds in a band 40 tall: 0.9 * 40 / 20
  const { k, y } = fitBounds([[0, 100], [20, 120]], [[0, 30], [100, 70]], { fill: 0.9 });
  assert.strictEqual(k, 1.8);
  // Centred in the band, not in a 0–100 viewBox
  assert.strictEqual(110 * k + y, 50);
});

test('fitBounds: centres in an area that does not start at zero', () => {
  const { k, x, y } = fitBounds([[10, 10], [10, 10]], [[-20, 30], [80, 50]], { maxScale: 1.5 });
  assert.strictEqual(k, 1.5);
  assert.strictEqual(10 * k + x, 30);
  assert.strictEqual(10 * k + y, 40);
});

test('fitBounds: zero-size bounds hit maxScale', () => {
  assert.strictEqual(fitBounds([[5, 5], [5, 5]], [[0, 0], [100, 100]], { maxScale: 1.8 }).k, 1.8);
});

test('fitBounds: minScale and maxScale clamp the scale', () => {
  const area = [[0, 0], [100, 100]];
  assert.strictEqual(fitBounds([[0, 0], [400, 400]], area, { minScale: 1 }).k, 1);
  assert.strictEqual(fitBounds([[0, 0], [1, 1]], area, { maxScale: 1.8 }).k, 1.8);
});
