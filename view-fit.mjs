/**
 * view-fit — where the map's travels land, pure.
 *
 * The arithmetic behind the gentle zoom and the visible area, kept apart
 * from the shell so it can be tested. It imports nothing and touches no DOM
 * and no D3: the shell measures the panels in screen px, reads the SVG's
 * screen CTM, and hands both here as plain numbers.
 *
 * Every rectangle is a d3-style extent, `[[x0, y0], [x1, y1]]`, with
 * `x0 <= x1` and `y0 <= y1`. A transform is `{ k, x, y }`, d3's zoom
 * transform: a point `p` of the map is drawn at `p * k + [x, y]`.
 */

/** A screen-px extent in viewBox units, through the SVG's screen CTM
 *  (`{ a, d, e, f }`: the meet fit only scales and translates, so `b` and
 *  `c` are zero). `e` and `f` carry the letterbox offset as well as the
 *  SVG's position on the page, so a px coordinate `p` is at `(p - e) / a`. */
export function screenToViewBox([[x0, y0], [x1, y1]], { a, d, e, f }) {
  return [[(x0 - e) / a, (y0 - f) / d], [(x1 - e) / a, (y1 - f) / d]];
}

/** The overlap of two extents, or null when they don't overlap (touching
 *  edges leave a zero-size extent, not null). */
export function intersectExtents([[ax0, ay0], [ax1, ay1]], [[bx0, by0], [bx1, by1]]) {
  const x0 = Math.max(ax0, bx0);
  const y0 = Math.max(ay0, by0);
  const x1 = Math.min(ax1, bx1);
  const y1 = Math.min(ay1, by1);
  return x0 <= x1 && y0 <= y1 ? [[x0, y0], [x1, y1]] : null;
}

/** The transform that fits `bounds` (map units) into `area` (viewBox
 *  units): centred in it and scaled so the larger relative side fills
 *  `fill` of it, then clamped to `[minScale, maxScale]`. Zero-size bounds (a
 *  city's point) simply get `maxScale`. `area` must not be zero-size. */
export function fitBounds(bounds, area, { fill = 0.9, minScale = 0, maxScale = Infinity } = {}) {
  const [[x0, y0], [x1, y1]] = bounds;
  const [[ax0, ay0], [ax1, ay1]] = area;
  const ratio = Math.max((x1 - x0) / (ax1 - ax0), (y1 - y0) / (ay1 - ay0));
  const k = Math.min(maxScale, Math.max(minScale, ratio > 0 ? fill / ratio : Infinity));
  return {
    k,
    x: (ax0 + ax1) / 2 - k * (x0 + x1) / 2,
    y: (ay0 + ay1) / 2 - k * (y0 + y1) / 2,
  };
}
