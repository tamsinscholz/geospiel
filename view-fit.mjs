/**
 * view-fit — where the map's travels land, pure.
 *
 * The arithmetic behind the gentle zoom, the feedback pan and the visible
 * area, kept apart from the shell so it can be tested. It imports nothing and
 * touches no DOM and no D3: the shell measures the panels in screen px, reads
 * the SVG's screen CTM, and hands both here as plain numbers.
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

/** The part of the viewBox `full` (viewBox units) showing in the screen
 *  band from `top` to `bottom` (px) across the map's `left`..`right` (px),
 *  converted through the SVG's screen `ctm`. The band is intersected with
 *  the viewBox, so a panel lying in a letterbox takes nothing away. A band
 *  left empty, on screen or within the viewBox (panels covering the whole
 *  height of a tiny window), falls back to `full`, so there is always an
 *  area to fit into. */
export function visibleBand({ left, right }, top, bottom, ctm, full) {
  const area = bottom > top &&
    intersectExtents(screenToViewBox([[left, top], [right, bottom]], ctm), full);
  return area && area[1][1] > area[0][1] ? area : full;
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

/** The transform that brings `bounds` (map units) into `area` (viewBox
 *  units) by the smallest translation, keeping `transform.k`: the pan, no
 *  zoom. `margin` (viewBox units) shrinks the area on every side first, but
 *  bounds that fit the area and not the shrunk one get only the margin left
 *  over, split evenly, so they still end up clear. Each axis is handled on
 *  its own:
 *  - bounds already inside the area: no move on that axis;
 *  - bounds that fit: move just far enough that the far edge comes inside;
 *  - bounds larger than the area: as much of them as possible shows once
 *    they cover the whole area, so move just far enough for that, which
 *    aligns the edge that was inside with the area's edge (an area already
 *    covered doesn't move).
 *  Returns `transform` itself, unchanged, when no axis moves, so a caller
 *  can tell "already clear" by identity. */
export function panIntoView(bounds, area, transform, margin = 0) {
  const { k } = transform;
  const [[x0, y0], [x1, y1]] = bounds;
  const [[ax0, ay0], [ax1, ay1]] = area;
  const dx = shiftInto(x0 * k + transform.x, x1 * k + transform.x, ax0, ax1, margin);
  const dy = shiftInto(y0 * k + transform.y, y1 * k + transform.y, ay0, ay1, margin);
  return dx === 0 && dy === 0 ? transform : { k, x: transform.x + dx, y: transform.y + dy };
}

/** The smallest shift of the interval [b0, b1] that brings it inside
 *  [a0, a1] shrunk by `margin` at both ends, or, when it is longer, that
 *  makes it cover that. An interval that fits [a0, a1] keeps only as much
 *  margin as leaves room for it. */
function shiftInto(b0, b1, a0, a1, margin) {
  const room = (a1 - a0) - (b1 - b0);
  const m = room >= 0 ? Math.min(margin, room / 2) : margin;
  a0 += m;
  a1 -= m;
  if (b1 - b0 <= a1 - a0) {
    if (b0 < a0) return a0 - b0;
    if (b1 > a1) return a1 - b1;
    return 0;
  }
  if (b0 > a0) return a0 - b0;
  if (b1 < a1) return a1 - b1;
  return 0;
}

/** What the visual viewport (`{ offsetTop, height }`, CSS px, as
 *  `window.visualViewport` reports it) hides of a layout viewport
 *  `layoutHeight` px tall: `top` px scrolled out above it and `bottom` px
 *  below it, where an on-screen keyboard overlays the page. Less than a px
 *  counts as nothing (a fractional zoom ratio makes the two heights differ
 *  by a fraction of a px, which is no keyboard), and neither is ever
 *  negative. Without a visual viewport (an old browser) nothing is hidden. */
export function viewportInsets(viewport, layoutHeight) {
  if (!viewport) return { top: 0, bottom: 0 };
  const { offsetTop, height } = viewport;
  const px = v => v >= 1 ? v : 0;
  return { top: px(offsetTop), bottom: px(layoutHeight - offsetTop - height) };
}

/** A screen band `[top, bottom]` (px) between panels pinned to the visual
 *  viewport, when the viewport hides `insets` (`{ top, bottom }`, px; see
 *  viewportInsets): `rest` is the band with nothing hidden, and the panels
 *  move in by the hidden amounts. */
export function pinnedBand([top, bottom], insets) {
  return [top + insets.top, bottom - insets.bottom];
}

/** The tightest of several screen bands `[top, bottom]`: the top furthest
 *  down and the bottom furthest up, the part every band leaves. Null bands (nothing
 *  planned) are skipped; with none left it is null. The result may be
 *  empty (`bottom <= top`), which visibleBand() falls back from. */
export function tightestBand(...bands) {
  const known = bands.filter(Boolean);
  if (!known.length) return null;
  return [Math.max(...known.map(b => b[0])), Math.min(...known.map(b => b[1]))];
}
