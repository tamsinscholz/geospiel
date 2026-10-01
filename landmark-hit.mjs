/**
 * landmark-hit — which landmark a map point is on, pure.
 *
 * The project's second testing seam beside `game-core.mjs`. It imports
 * nothing and touches no DOM, no D3 and no globals beyond `Math`: the shell
 * projects every landmark once into viewBox units at load time, converts each
 * click (or hover) to viewBox units by inverting the zoom transform, and hands
 * both to `nearestLandmark`. Everything about pixels and zoom stays with the
 * caller, which passes `radius` and `dotRadius` already scaled to the current
 * zoom.
 *
 * Feature records, all coordinates in viewBox units, a point being `[x, y]`:
 *
 *   { id, kind: 'river', lines }     `lines`: an array of polylines, each an
 *                                    array of points
 *   { id, kind: 'lake', polygons }   `polygons`: an array of polygons, each an
 *                                    array of rings (arrays of points); the
 *                                    first ring is the outer ring, the rest
 *                                    are holes (islands). A ring may or may
 *                                    not repeat its first point at the end
 *   { id, kind: 'city', point }      `point`: the dot's centre
 *
 * A record of any other kind is ignored.
 */

/* === Distance to the drawn shape === */

/** Tie-break order: on equal distance a city beats a lake beats a river. */
const KIND_RANK = { city: 0, lake: 1, river: 2 };

/** Distance from `p` to the segment `a`–`b` (a degenerate segment is a point). */
function segmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Distance from `p` to a polyline; a ring is a polyline that closes. */
function pathDistance(p, path, closed) {
  let best = null;
  const n = path.length;
  if (n === 1) return Math.hypot(p[0] - path[0][0], p[1] - path[0][1]);
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const d = segmentDistance(p, path[i], path[(i + 1) % n]);
    if (best === null || d < best) best = d;
  }
  return best;
}

/**
 * Even-odd point in polygon over all of a polygon's rings at once, so a point
 * inside a hole crosses the outer ring and the hole's ring and comes out
 * outside.
 */
function insidePolygon(p, rings) {
  const [x, y] = p;
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** The smallest of `paths`' distances to `p`, or `null` when there are none. */
function nearestPath(p, paths, closed) {
  let best = null;
  for (const path of paths) {
    if (!path || path.length === 0) continue;
    const d = pathDistance(p, path, closed);
    if (best === null || d < best) best = d;
  }
  return best;
}

/**
 * Distance from `p` to the shape a feature is drawn as, or `null` for a
 * record with no usable geometry or an unknown kind.
 *
 *   river: to the nearest segment of any of its polylines
 *   lake:  0 anywhere inside (holes excluded), otherwise to the nearest edge,
 *          outer ring or hole
 *   city:  `max(0, d − dotRadius)`, so anywhere on the visible dot is 0
 */
function distanceTo(p, feature, dotRadius) {
  switch (feature.kind) {
    case 'river':
      return nearestPath(p, feature.lines || [], false);
    case 'lake': {
      const polygons = feature.polygons || [];
      if (polygons.some(rings => insidePolygon(p, rings))) return 0;
      return nearestPath(p, polygons.flat(), true);
    }
    case 'city': {
      if (!feature.point) return null;
      const d = Math.hypot(p[0] - feature.point[0], p[1] - feature.point[1]) - dotRadius;
      return d > 0 ? d : 0;
    }
    default:
      return null;
  }
}

/* === The resolver === */

/**
 * The id of the landmark whose drawn shape is nearest to `point`, if it lies
 * within `radius`; otherwise `null` (open land, sea, Kulisse, letterbox).
 * On equal distance — most often the many 0s where a dot sits on a river or a
 * river runs through a lake — a city wins over a lake, and a lake over a river.
 *
 * @param {number[]} point          `[x, y]` in viewBox units
 * @param {object[]} features       records as documented at the top
 * @param {object}   options
 * @param {number}   options.radius     the hit radius, in viewBox units
 * @param {number}   [options.dotRadius] a city dot's drawn radius, in viewBox units
 * @returns {string|null}
 */
export function nearestLandmark(point, features, { radius, dotRadius = 0 } = {}) {
  if (!point || !features || !(radius >= 0)) return null;
  let bestId = null;
  let bestDistance = null;
  let bestRank = null;
  for (const feature of features) {
    const rank = KIND_RANK[feature.kind];
    if (rank === undefined) continue;
    const d = distanceTo(point, feature, dotRadius);
    if (d === null || d > radius) continue;
    if (bestDistance === null || d < bestDistance || (d === bestDistance && rank < bestRank)) {
      bestId = feature.id;
      bestDistance = d;
      bestRank = rank;
    }
  }
  return bestId;
}
