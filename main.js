import { createGame, landmarkPool, landmarkType, followRounds } from './game-core.mjs';
import { nearestLandmark } from './landmark-hit.mjs';
import { screenToViewBox, intersectExtents, fitBounds, panIntoView } from './view-fit.mjs';

(() => {
  /* === DOM References === */
  const $ = id => document.getElementById(id);
  const body = document.body;

  const gamePanel      = $('game-panel');
  const bottomPanels   = document.querySelector('.bottom-panels');
  const gameWappen     = $('game-wappen');
  const gamePrompt     = $('game-prompt');
  const gamePromptType = $('game-prompt-type');
  const hudScore       = $('hud-score');
  const hudGuesses     = $('hud-guesses');
  const progressFill   = $('progress-fill');
  const feedbackBar    = $('feedback-bar');
  const feedbackText   = $('feedback-text');
  const btnNext        = $('btn-next');
  const countryPanel   = $('country-panel');
  const infoWappen     = $('info-wappen');
  const infoName       = $('info-name');
  const infoCapital    = $('info-capital');
  const infoArea       = $('info-area');
  const infoPop        = $('info-pop');
  const infoPeak       = $('info-peak');
  const infoNeighbours = $('info-neighbours');
  const infoCapitalOf  = $('info-capital-of');
  const infoLength     = $('info-length');
  const infoDepth      = $('info-depth');
  const infoBundesland = $('info-bundesland');
  const inputFeedback  = $('input-feedback');
  const clickFeedback  = $('click-feedback');
  const guessInput     = $('guess-input');
  const settingsTitle  = $('settings-title');
  const valRounds      = $('val-rounds');
  const valGuesses     = $('val-guesses');
  const chkAuto        = $('chk-auto');
  const settingsCredits = $('settings-credits');
  const typeToggles    = [...document.querySelectorAll('.chk-type')];

  /* === Constants === */
  const MODE_LABELS = {
    'find': 'Bundesland finden',
    'name-bundesland': 'Bundesland benennen',
    'name-capital': 'Landeshauptstadt benennen',
    'find-landmark': 'Gewässer & Städte finden',
    'name-landmark': 'Gewässer & Städte benennen',
  };

  /** The two landmark modes (rivers, lakes, cities). CSS matches them as
   *  `[data-mode$="-landmark"]`. */
  function isLandmarkMode(mode) {
    return mode === 'find-landmark' || mode === 'name-landmark';
  }

  /** The type label under a landmark's name, by `landmarkType()`. */
  const TYPE_LABELS = {
    river: 'Fluss',
    lake: 'See',
    city: 'Stadt',
    capital: 'Landeshauptstadt',
  };

  /** Gewässer & Städte benennen's question, by `type` in landmarks.json.
   *  Landeshauptstädte are asked as cities, so the prompt doesn't narrow the
   *  answer to sixteen. */
  const NAME_LANDMARK_PROMPTS = {
    river: 'Welcher Fluss ist markiert?',
    lake: 'Welcher See ist markiert?',
    city: 'Welche Stadt ist markiert?',
  };

  /** Zoom range; `k = 1` is the full-Germany view. */
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 6;

  /** The gentle zoom's scale cap. Small Bundesländer hit it; at 1.8 the full
   *  east-west span and over half the north-south span of Germany stay in
   *  frame, so the target's position in the country stays readable. The one
   *  knob to tune after playing. */
  const TARGET_ZOOM_MAX = 1.8;

  /** Bundesländer smaller than this get an invisible touch halo (`.hit-target`)
   *  — in practice the three Stadtstaaten. CSS decides when the halo is live. */
  const SMALL_TARGET_MAX_AREA_KM2 = 1000;

  /** Padding around Germany's projected bounds, in viewBox units. */
  const MAP_PADDING = 20;

  /** Landmark sizes in screen px, constant at every zoom: a city dot, a target
   *  dot, the marker ring's radius, and the hit radius around every drawn
   *  feature (landmark-hit.mjs). `unitsPerPx()` turns them into viewBox units. */
  const CITY_DOT_PX = 3.5;
  const CITY_TARGET_PX = 6;
  const MARKER_PX = 18;
  const HIT_RADIUS_PX = 12;

  /** The finden modes' feedback pan keeps the target this far inside the
   *  visible area, in screen px: past the marker ring's 18 px radius, so a
   *  city's or lake's ring clears the panels too. */
  const FEEDBACK_PAN_MARGIN_PX = 24;

  /** How long a wrongly clicked Bundesland or landmark flashes red. */
  const WRONG_FLASH_MS = 600;

  /** Settings ranges. Runden caps at the sixteen Bundesländer. */
  const ROUNDS_MAX = 16;
  const GUESSES_MAX = 10;

  /** Per-mode score history lives under `geospiel-stats-<mode>`. The prefix
   *  keeps the world quiz's unprefixed `stats-<mode>` keys, served from the
   *  same dev origin, out of the average. */
  const HISTORY_KEY_PREFIX = 'geospiel-stats-';
  const HISTORY_LENGTH = 10;

  /* === Game State ===
   *
   * Only the shell's own state lives here: which mode and screen are showing,
   * the settings the user picked, and the auto-advance timer handle. Round
   * order, score, skipped count, remaining guesses and the current target all
   * belong to the game-core instance in `game` — this file never computes
   * them, it only renders them.
   */
  const gameState = {
    mode: null,
    phase: 'idle',
    screen: 'select',
    totalRounds: ROUNDS_MAX,
    // The landmark modes' Runden, kept apart from the Bundesland modes'; null
    // until a landmark game starts, meaning "the selected pool size"
    landmarkRounds: null,
    // The Einstellungen type toggles, shared by both landmark modes
    landmarkTypes: { river: true, lake: true, city: true, capital: false },
    maxGuesses: 3,
    autoAdvance: false,
    advanceTimer: null,
  };

  /** The current game-core instance; null outside a quiz. */
  let game = null;

  /* === State Transitions === */
  function setPhase(phase) {
    gameState.phase = phase;
    body.dataset.phase = phase;
  }

  function setMode(mode) {
    gameState.mode = mode;
    body.dataset.mode = mode;
  }

  function setScreen(screen) {
    gameState.screen = screen;
    if (screen) {
      body.dataset.screen = screen;
    } else {
      delete body.dataset.screen;
    }
  }

  /* === Data === */
  let bundeslaenderData = {};
  let aliasesData = {};
  /** The landmark modes' own alias table (pool features only); the Bundesland
   *  table is not consulted there, so the two can't conflict. */
  let landmarkAliasesData = {};
  let geoFeatures = [];
  let kulisseFeatures = [];
  let landmarksData = {};
  let riverFeatures = [];
  let lakeFeatures = [];
  let cityFeatures = [];
  /** Every landmark projected once into viewBox units, as the resolver's
   *  records (`{ id, kind, lines | polygons | point }`, see landmark-hit.mjs). */
  let landmarkRecords = [];

  /* === D3 Globals === */
  let projection, pathGenerator, zoom, g, svgNode;

  /** The padded projected bounds of Germany: the SVG's fixed viewBox, and the
   *  pan clamp. All map, zoom and pan arithmetic happens in these units. */
  let viewBox = { x: 0, y: 0, width: 0, height: 0 };

  /* === Utility Functions === */

  /** The one place that knows how the geometry source spells its ids. The
   *  vendored TopoJSON is already keyed by ISO 3166-2 (`DE-BY`). */
  function featureId(d) { return d.id; }

  /** The one place that knows where Landeswappen come from. */
  function wappenUrl(key) {
    return `wappen/${key.toLowerCase()}.svg`;
  }

  const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  const decimalFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function formatNumber(n) {
    return numberFormat.format(n);
  }

  /** A landmark with its article, nominative as stored: "der Main", "Köln". */
  function landmarkTitle(id) {
    const r = landmarksData[id];
    return r.article ? `${r.article} ${r.name}` : r.name;
  }

  /** "1 Versuch" / "3 Versuche" — German number agreement, never "1 Versuche". */
  function versucheText(n) {
    return n === 1 ? '1 Versuch' : `${n} Versuche`;
  }

  function clearAdvanceTimer() {
    if (gameState.advanceTimer) {
      clearTimeout(gameState.advanceTimer);
      gameState.advanceTimer = null;
    }
  }

  /** Fill the progress bar for `completed` of the game's rounds. */
  function renderProgress(completed, total) {
    progressFill.style.width = (completed / total * 100) + '%';
  }

  function clearMapClasses() {
    d3.selectAll('.bundesland')
      .classed('highlighted', false)
      .classed('target', false)
      .classed('wrong-guess', false);
    d3.selectAll('.landmark')
      .classed('target', false)
      .classed('hovered', false)
      .classed('wrong-guess', false);
    hoveredLandmarkId = null;
    setMarker(null);
  }

  /** The visible Bundesland path for an id. Hits on a `.hit-target` halo are
   *  resolved through this, so map classes always land on the real shape. */
  function bundeslandPath(id) {
    return document.querySelector(`.bundesland[data-id="${id}"]`);
  }

  /** The drawn element of a landmark: a river's `<g>`, a lake's path, a city's dot. */
  function landmarkElement(id) {
    return document.querySelector(`.landmark[data-id="${id}"]`);
  }

  /** Flash a wrongly clicked map element in the `.wrong-guess` colours. */
  function flashWrong(el) {
    d3.select(el).classed('wrong-guess', true);
    setTimeout(() => d3.select(el).classed('wrong-guess', false), WRONG_FLASH_MS);
  }

  /** Mark a landmark target in orange, raised above its neighbours, with the
   *  marker ring around a lake or city (rivers get none). */
  function highlightLandmark(id) {
    d3.selectAll('.landmark').classed('target', d => featureId(d) === id);
    d3.select(landmarkElement(id)).raise();
    setMarker(landmarkCentre(id));
    sizeLandmarks();
  }

  /** Where the marker ring goes: a city's dot or a lake's centroid; null for a river. */
  function landmarkCentre(id) {
    const kind = landmarksData[id] && landmarksData[id].type;
    if (kind === 'city') return landmarkRecords.find(r => r.id === id).point;
    if (kind === 'lake') return pathGenerator.centroid(lakeFeatures.find(f => featureId(f) === id));
    return null;
  }

  /** Draw the marker ring at `centre` (viewBox units), or remove it (null). */
  function setMarker(centre) {
    d3.select('#marker-group').selectAll('circle')
      .data(centre ? [centre] : [])
      .join('circle')
      .attr('class', 'marker')
      .attr('cx', c => c[0])
      .attr('cy', c => c[1]);
  }

  /** Screen px per viewBox unit at k = 1: the fit of the viewBox to the SVG. */
  function pxPerUnit() {
    const ctm = svgNode.getScreenCTM();
    return ctm ? ctm.a : 1;
  }

  /** ViewBox units per screen px at zoom `k`. */
  function unitsPerPx(k = d3.zoomTransform(svgNode).k) {
    return 1 / (pxPerUnit() * k);
  }

  /** Keep the city dots and the marker ring a constant screen size: an SVG
   *  radius scales with the zoom (vector-effect only covers strokes), so the
   *  zoom handler sets each radius in viewBox units for the current `k`. */
  function sizeLandmarks(k) {
    const u = unitsPerPx(k);
    d3.selectAll('.city').attr('r', function () {
      return (this.classList.contains('target') ? CITY_TARGET_PX : CITY_DOT_PX) * u;
    });
    d3.selectAll('.marker').attr('r', MARKER_PX * u);
  }

  function highlightTarget(id) {
    d3.selectAll('.bundesland').classed('target', false);
    d3.select(`.bundesland[data-id="${id}"]`).classed('target', true);
  }

  function fillBundeslandInfo(id) {
    const c = bundeslaenderData[id];
    if (!c) return;
    infoWappen.src = wappenUrl(id);
    infoWappen.alt = 'Landeswappen ' + c.name;
    infoName.textContent = c.name;
    infoCapital.textContent = c.capital;
    infoArea.textContent = formatNumber(c.area_km2) + ' km\u00B2';
    infoPop.textContent = formatNumber(c.population);
    infoPeak.textContent = c.highest_point.name + ' (' + formatNumber(c.highest_point.elevation_m) + ' m)';
    infoNeighbours.textContent = c.neighbour_count;
    countryPanel.dataset.kind = 'bundesland';
    countryPanel.dataset.wappen = 'shown';
  }

  /** The info panel for a river, lake or city; CSS picks the rows off
   *  `data-kind`. Cities show their Bundesland's Landeswappen, lakes only when
   *  they lie in exactly one Bundesland; rivers and the Bodensee show none. */
  function fillLandmarkInfo(id) {
    const r = landmarksData[id];
    if (!r) return;
    const landName = key => bundeslaenderData[key] ? bundeslaenderData[key].name : key;

    countryPanel.dataset.kind = r.type;
    infoName.textContent = landmarkTitle(id);
    infoCapitalOf.textContent = r.capital_of ? `Landeshauptstadt von ${landName(r.capital_of)}` : '';

    let wappenKey = null;
    if (r.type === 'river') {
      infoLength.textContent = formatNumber(r.length_km) + ' km';
    } else if (r.type === 'lake') {
      infoArea.textContent = decimalFormat.format(r.area_km2) + ' km\u00B2';
      infoDepth.textContent = formatNumber(r.max_depth_m) + ' m';
      infoBundesland.textContent = r.bundeslaender.map(landName).join(', ');
      if (r.bundeslaender.length === 1) wappenKey = r.bundeslaender[0];
    } else if (r.type === 'city') {
      infoPop.textContent = formatNumber(r.population);
      infoBundesland.textContent = landName(r.bundesland);
      wappenKey = r.bundesland;
    }

    if (wappenKey) {
      infoWappen.src = wappenUrl(wappenKey);
      infoWappen.alt = 'Landeswappen ' + landName(wappenKey);
      countryPanel.dataset.wappen = 'shown';
    } else {
      infoWappen.removeAttribute('src');
      infoWappen.alt = '';
      countryPanel.dataset.wappen = 'none';
    }
  }

  /** The viewBox as a d3 extent, `[[x0, y0], [x1, y1]]`. */
  function viewBoxExtent() {
    return [[viewBox.x, viewBox.y], [viewBox.x + viewBox.width, viewBox.y + viewBox.height]];
  }

  /** A Bundesland's projected bounds, or null when it has no geometry. */
  function bundeslandBounds(id) {
    const feature = geoFeatures.find(f => featureId(f) === id);
    return feature ? pathGenerator.bounds(feature) : null;
  }

  /** A landmark's projected bounds: a river's or lake's extent, or a city's
   *  point as zero-size bounds (which zoomToBounds caps at TARGET_ZOOM_MAX). */
  function landmarkBounds(id) {
    const kind = landmarksData[id] && landmarksData[id].type;
    if (kind === 'city') {
      const p = landmarkRecords.find(r => r.id === id).point;
      return [p, p];
    }
    const features = kind === 'river' ? riverFeatures : lakeFeatures;
    const feature = features.find(f => featureId(f) === id);
    return feature ? pathGenerator.bounds(feature) : null;
  }

  /** The part of the viewBox the user can see, as an extent in viewBox
   *  units: below the top game panel and above the bottom panel stack, as
   *  they are laid out right now. Reading the layout makes it exact for the
   *  phase just set, so call it after setPhase. Outside a quiz round (the
   *  menu, Erkunden) it is the whole viewBox: Erkunden's info panel comes and
   *  goes with the pointer and doesn't count. Panels in a letterbox, off the
   *  viewBox, take nothing away. */
  function visibleArea() {
    const full = viewBoxExtent();
    const ctm = svgNode.getScreenCTM();
    if (!ctm || gameState.phase === 'idle') return full;
    const map = svgNode.getBoundingClientRect();
    let top = map.top;
    let bottom = map.bottom;
    if (gamePanel.getClientRects().length) top = Math.max(top, gamePanel.getBoundingClientRect().bottom);
    for (const panel of bottomPanels.children) {
      if (panel.getClientRects().length) bottom = Math.min(bottom, panel.getBoundingClientRect().top);
    }
    // Panels covering the whole height (a tiny window) leave nothing to fit
    // into; fall back to the whole viewBox rather than an empty area
    const area = bottom > top &&
      intersectExtents(screenToViewBox([[map.left, top], [map.right, bottom]], ctm), full);
    return area && area[1][1] > area[0][1] ? area : full;
  }

  /** The gentle zoom: fit projected `bounds` (`[[x0, y0], [x1, y1]]`, viewBox
   *  units) at 0.9 of the visible area, centred in it, capped at
   *  TARGET_ZOOM_MAX. A point's zero bounds simply hit the cap. Never below
   *  the overview: in a very short window a large target fits only partly.
   *  The visible area depends on the phase's panels, so call it after
   *  setPhase. */
  function zoomToBounds(bounds, duration = 750) {
    if (!bounds) return;
    const { k, x, y } = fitBounds(bounds, visibleArea(),
      { fill: 0.9, minScale: MIN_ZOOM, maxScale: TARGET_ZOOM_MAX });

    // zoom.transform does not apply the pan clamp by itself, so constrain the
    // target the same way a drag would be constrained.
    const target = zoom.constrain()(
      d3.zoomIdentity.translate(x, y).scale(k), viewBoxExtent(), zoom.translateExtent());
    d3.select('#map').transition().duration(duration)
      .call(zoom.transform, target);
  }

  /** The finden modes' feedback pan: only if `bounds` are covered, i.e. not
   *  inside the visible area under the current transform, pan by the
   *  smallest translation that brings them FEEDBACK_PAN_MARGIN_PX inside it,
   *  keeping `k`, within the pan clamp. A target too big for the area is
   *  panned to cover it (the edge that was in view meets the area's edge). A
   *  target already clear, however close to a panel, starts no transition at
   *  all. Call after setPhase('feedback'). */
  function panToBounds(bounds, duration = 750) {
    if (!bounds) return;
    const current = d3.zoomTransform(svgNode);
    const area = visibleArea();
    if (panIntoView(bounds, area, current) === current) return;
    const panned = panIntoView(bounds, area, current, FEEDBACK_PAN_MARGIN_PX / pxPerUnit());
    if (panned === current) return;
    const { k, x, y } = panned;
    const target = zoom.constrain()(
      d3.zoomIdentity.translate(x, y).scale(k), viewBoxExtent(), zoom.translateExtent());
    if (target.x === current.x && target.y === current.y) return;
    d3.select('#map').transition().duration(duration)
      .call(zoom.transform, target);
  }

  function resetZoom(duration = 300) {
    d3.select('#map').transition().duration(duration)
      .call(zoom.transform, d3.zoomIdentity);
  }

  /* === Data Loading === */
  async function loadData() {
    const [topology, kulisseTopology, bundeslaender, aliases, gewaesserTopology, staedte, landmarks, landmarkAliases] = await Promise.all([
      d3.json('data/bundeslaender.topo.json'),
      d3.json('data/kulisse.topo.json'),
      d3.json('data/bundeslaender.json'),
      d3.json('data/bundesland-aliases.json'),
      d3.json('data/gewaesser.topo.json'),
      d3.json('data/staedte.json'),
      d3.json('data/landmarks.json'),
      d3.json('data/landmark-aliases.json'),
    ]);

    bundeslaenderData = bundeslaender;
    aliasesData = aliases;
    geoFeatures = topojson.feature(topology, topology.objects.bundeslaender).features;
    kulisseFeatures = topojson.feature(kulisseTopology, kulisseTopology.objects.kulisse).features;
    const germany = topojson.merge(topology, topology.objects.bundeslaender.geometries);
    landmarksData = landmarks;
    landmarkAliasesData = landmarkAliases;
    riverFeatures = topojson.feature(gewaesserTopology, gewaesserTopology.objects.rivers).features;
    lakeFeatures = topojson.feature(gewaesserTopology, gewaesserTopology.objects.lakes).features;
    cityFeatures = staedte.features;

    initMap(germany);
  }

  /* === D3 Map Setup === */
  function initMap(germany) {
    const svg = d3.select('#map');
    svgNode = svg.node();
    g = d3.select('#map-group');

    // Conic conformal with standard parallels inside Germany, centred on its
    // central meridian, fitted to the outline. The fit size is arbitrary: the
    // viewBox below is what maps these units onto the screen.
    projection = d3.geoConicConformal()
      .parallels([48.5, 53.5])
      .rotate([-10.5, 0])
      .fitSize([1000, 1000], germany);

    pathGenerator = d3.geoPath().projection(projection);

    // A fixed viewBox around Germany's padded bounds; the SVG is sized by CSS
    // and preserveAspectRatio re-fits and centres Germany on every resize, so
    // there is no JS resize handler. Wide screens letterbox into the Kulisse.
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(germany);
    viewBox = {
      x: x0 - MAP_PADDING,
      y: y0 - MAP_PADDING,
      width: x1 - x0 + 2 * MAP_PADDING,
      height: y1 - y0 + 2 * MAP_PADDING,
    };
    svg.attr('viewBox', [viewBox.x, viewBox.y, viewBox.width, viewBox.height].join(' '));

    // The Kulisse: neighbouring countries beneath the Bundesländer. Scenery
    // only; CSS makes it pointer-events: none in every mode.
    d3.select('#kulisse-group').selectAll('path')
      .data(kulisseFeatures)
      .join('path')
      .attr('class', 'kulisse')
      .attr('d', pathGenerator);

    d3.select('#bundesland-group').selectAll('path')
      .data(geoFeatures)
      .join('path')
      .attr('class', 'bundesland')
      .attr('d', pathGenerator)
      .attr('data-id', d => featureId(d))
      .on('click', onBundeslandClick)
      .on('mouseenter', onBundeslandEnter)
      .on('mouseleave', onBundeslandLeave);

    // Touch halos for the small Bundesländer: an invisible duplicate path on
    // top whose stroke only takes pointer events on touch/narrow screens (CSS).
    // It shares the real path's handlers, which resolve the id, not the element.
    d3.select('#hit-group').selectAll('path')
      .data(geoFeatures.filter(f => {
        const b = bundeslaenderData[featureId(f)];
        return b && b.area_km2 < SMALL_TARGET_MAX_AREA_KM2;
      }))
      .join('path')
      .attr('class', 'hit-target')
      .attr('d', pathGenerator)
      .attr('data-id', d => featureId(d))
      .on('click', onBundeslandClick)
      .on('mouseenter', onBundeslandEnter)
      .on('mouseleave', onBundeslandLeave);

    renderLandmarks();

    // The zoom extent defaults to the viewBox, and the translate extent is the
    // same rectangle: Germany plus the padding margin. d3's own clamp keeps
    // the translate extent covering the whole viewBox. Ours only asks it to
    // cover the visible area (visibleArea()), so Germany's top and bottom
    // edges can move out from under the panels: extra room equal to the
    // panels' height, in screen px, at every k. With no panels showing that
    // is d3's clamp exactly, and at rest the overview (k = 1, no translation)
    // satisfies both. It applies to drags, wheel and pinch, and to the
    // programmatic travels, which call zoom.constrain() themselves.
    zoom = d3.zoom();
    const clampToArea = zoom.constrain();
    zoom
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent(viewBoxExtent())
      .constrain((transform, extent, translateExtent) =>
        clampToArea(transform, visibleArea(), translateExtent))
      // d3's smooth zoom breaks down when the two views are centred almost,
      // but not exactly, on the same point (e.g. resetting after a wheel zoom
      // at the map's centre): its duration comes out non-finite and every
      // frame is NaN. Fall back to plain interpolation for just that case.
      .interpolate((a, b) => {
        const i = d3.interpolateZoom(a, b);
        return Number.isFinite(i.duration) ? i : d3.interpolate(a, b);
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        sizeLandmarks(event.transform.k);
      });

    svg.call(zoom);
    sizeLandmarks(1);

    svg.on('click', (event) => {
      // Gewässer & Städte finden: the landmark layers take no pointer events,
      // so every click on the map lands here and is resolved by distance
      if (gameState.mode === 'find-landmark' && gameState.phase === 'playing') {
        handleLandmarkClick(landmarkAt(event));
        return;
      }
      // Click anywhere that is not a Bundesland (sea, letterbox, or the Kulisse,
      // which lets clicks through) to dismiss the explore panel
      if (!event.target.closest('.bundesland, .hit-target') && gameState.mode === 'explore') {
        d3.selectAll('.bundesland').classed('highlighted', false);
        countryPanel.classList.remove('visible');
        lastTappedId = null;
      }
    });

    // Hover tint, mouse only: a touch has no hover, and a tap's pointermove
    // would leave a stale tint behind
    svg.on('pointermove.landmark', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (gameState.mode !== 'find-landmark' || gameState.phase !== 'playing') return;
      setHoveredLandmark(landmarkAt(event));
    });
    svg.on('pointerleave.landmark', () => setHoveredLandmark(null));

    wireEvents();
  }

  /** Draw every river, lake and city once (CSS decides when they show), and
   *  project them into the resolver's records. Rivers are a `<g>` of a white
   *  casing (shown only for the target) and the line itself. */
  function renderLandmarks() {
    d3.select('#river-group').selectAll('g')
      .data(riverFeatures)
      .join('g')
      .attr('class', 'landmark river')
      .attr('data-id', d => featureId(d))
      .call(river => {
        river.append('path').attr('class', 'river-casing').attr('d', pathGenerator);
        river.append('path').attr('class', 'river-line').attr('d', pathGenerator);
      });

    d3.select('#lake-group').selectAll('path')
      .data(lakeFeatures)
      .join('path')
      .attr('class', 'landmark lake')
      .attr('data-id', d => featureId(d))
      .attr('d', pathGenerator);

    d3.select('#city-group').selectAll('circle')
      .data(cityFeatures)
      .join('circle')
      .attr('class', 'landmark city')
      .attr('data-id', d => featureId(d))
      .attr('cx', d => projection(d.geometry.coordinates)[0])
      .attr('cy', d => projection(d.geometry.coordinates)[1]);

    const project = coords => coords.map(p => projection(p));
    const lines = geom => geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
    const polygons = geom => geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    landmarkRecords = [
      ...riverFeatures.map(f => ({
        id: featureId(f), kind: 'river', lines: lines(f.geometry).map(project),
      })),
      ...lakeFeatures.map(f => ({
        id: featureId(f), kind: 'lake', polygons: polygons(f.geometry).map(rings => rings.map(project)),
      })),
      ...cityFeatures.map(f => ({
        id: featureId(f), kind: 'city', point: projection(f.geometry.coordinates),
      })),
    ];
  }

  /** The landmark a pointer event is on, or null: the event in viewBox units
   *  (d3.pointer on #map-group inverts the zoom), radii from screen px. */
  function landmarkAt(event) {
    const u = unitsPerPx();
    return nearestLandmark(d3.pointer(event, g.node()), landmarkRecords, {
      radius: HIT_RADIUS_PX * u,
      dotRadius: CITY_DOT_PX * u,
    });
  }

  let hoveredLandmarkId = null;

  function setHoveredLandmark(id) {
    if (id === hoveredLandmarkId) return;
    hoveredLandmarkId = id;
    d3.selectAll('.landmark').classed('hovered', d => featureId(d) === id);
  }

  /* === Explore Mode === */
  let lastTappedId = null;

  function onBundeslandEnter(event, d) {
    if (gameState.mode !== 'explore') return;
    const id = featureId(d);
    if (!bundeslaenderData[id]) return;
    d3.select(bundeslandPath(id)).classed('highlighted', true);
    fillBundeslandInfo(id);
    countryPanel.classList.add('visible');
  }

  function onBundeslandLeave(event, d) {
    if (gameState.mode !== 'explore') return;
    d3.select(bundeslandPath(featureId(d))).classed('highlighted', false);
    countryPanel.classList.remove('visible');
  }

  function handleExploreClick(id) {
    if (lastTappedId === id) {
      d3.selectAll('.bundesland').classed('highlighted', false);
      countryPanel.classList.remove('visible');
      lastTappedId = null;
    } else {
      d3.selectAll('.bundesland').classed('highlighted', false);
      d3.select(bundeslandPath(id)).classed('highlighted', true);
      fillBundeslandInfo(id);
      countryPanel.classList.add('visible');
      lastTappedId = id;
    }
  }

  function startExplore() {
    setMode('explore');
    setPhase('idle');
    setScreen(null);
    lastTappedId = null;
  }

  /* === Bundesland Click Handler === */
  function onBundeslandClick(event, d) {
    const id = featureId(d);

    if (gameState.mode === 'explore') {
      if (!bundeslaenderData[id]) return;
      handleExploreClick(id);
    } else if (gameState.mode === 'find' && gameState.phase === 'playing') {
      handleFindClick(id);
    }
  }

  /* === Bundesland finden === */
  function handleFindClick(id) {
    const result = game.guessById(id);
    if (result.ignored) return;

    if (result.correct) {
      showFeedback(true);
      return;
    }

    hudGuesses.textContent = result.guessesLeft;
    flashWrong(bundeslandPath(id));

    if (result.exhausted) {
      showFeedback(false);
    }
  }

  /* === Gewässer & Städte finden === */
  function handleLandmarkClick(id) {
    // Nothing within reach (open land, sea, Kulisse, letterbox): no Versuch
    if (id === null) return;
    const result = game.guessById(id);
    if (result.ignored) return;

    if (result.correct) {
      showFeedback(true);
      return;
    }

    hudGuesses.textContent = result.guessesLeft;
    flashWrong(landmarkElement(id));

    if (result.exhausted) {
      showFeedback(false);
    } else {
      // Every wrong click names what was hit, background features included
      clickFeedback.textContent =
        `Falsch \u2013 das war ${landmarkTitle(id)} \u00B7 noch ${versucheText(result.guessesLeft)}`;
    }
  }

  /* === Text Input Submission === */
  function handleSubmit() {
    const result = game.guessByText(guessInput.value);
    if (result.ignored) return;

    if (result.correct) {
      showFeedback(true);
      return;
    }

    hudGuesses.textContent = result.guessesLeft;
    if (result.exhausted) {
      showFeedback(false);
    } else {
      inputFeedback.textContent = `Falsch \u2013 noch ${versucheText(result.guessesLeft)}`;
      guessInput.value = '';
      guessInput.focus();
    }
  }

  /* === Settings === */

  /** Runden's current maximum: 16 for the Bundesland modes, the selected
   *  pool size for the landmark modes. Kept in step by the type toggles. */
  let roundsMax = ROUNDS_MAX;

  /** The type toggles' current state, `{ river, lake, city, capital }`. */
  function selectedTypes() {
    const types = {};
    for (const chk of typeToggles) types[chk.dataset.type] = chk.checked;
    return types;
  }

  /** Landmarks with geometry: only they can be a round's target. */
  function hasLandmarkGeometry(id) {
    return landmarkRecords.some(r => r.id === id);
  }

  function landmarkItems(types) {
    return landmarkPool(landmarksData, types, hasLandmarkGeometry);
  }

  function openSettings(mode) {
    gameState.mode = mode;
    // CSS shows the type toggles off this, for the landmark modes only
    body.dataset.settingsMode = mode;
    settingsTitle.textContent = MODE_LABELS[mode];
    if (isLandmarkMode(mode)) {
      for (const chk of typeToggles) chk.checked = gameState.landmarkTypes[chk.dataset.type];
      roundsMax = Math.max(1, Object.keys(landmarkItems(selectedTypes())).length);
      valRounds.textContent = gameState.landmarkRounds === null
        ? roundsMax
        : Math.min(gameState.landmarkRounds, roundsMax);
    } else {
      roundsMax = ROUNDS_MAX;
      valRounds.textContent = gameState.totalRounds;
    }
    valGuesses.textContent = gameState.maxGuesses;
    chkAuto.checked = gameState.autoAdvance;
    // The credits start collapsed every time the screen opens
    settingsCredits.setAttribute('aria-expanded', 'false');
    setScreen('settings');
  }

  /* === Game Flow === */
  function startGame() {
    const rounds = parseInt(valRounds.textContent);
    gameState.maxGuesses = parseInt(valGuesses.textContent);
    gameState.autoAdvance = chkAuto.checked;
    // CSS hides Weiter off this attribute; it holds for the whole game
    body.dataset.autoAdvance = gameState.autoAdvance ? 'on' : 'off';

    // Only Bundesländer that have geometry on the map can be a round's target.
    // Which ids have geometry is knowledge that belongs to this side of the
    // seam, so the filtering happens here and the game-core gets the result.
    // The landmark modes take the pool features of the selected types, with
    // their own remembered Runden.
    let items = {};
    if (isLandmarkMode(gameState.mode)) {
      gameState.landmarkRounds = rounds;
      gameState.landmarkTypes = selectedTypes();
      items = landmarkItems(gameState.landmarkTypes);
    } else {
      gameState.totalRounds = rounds;
      for (const id of Object.keys(bundeslaenderData)) {
        if (geoFeatures.some(f => featureId(f) === id)) items[id] = bundeslaenderData[id];
      }
    }

    game = createGame({
      items,
      aliases: isLandmarkMode(gameState.mode) ? landmarkAliasesData : aliasesData,
      mode: gameState.mode,
      totalRounds: rounds,
      maxGuesses: gameState.maxGuesses,
    });

    setMode(gameState.mode);
    setScreen(null);
    startRound();
  }

  /** Render whatever round the game-core is now on. */
  function startRound() {
    clearMapClasses();
    clearAdvanceTimer();

    const state = game.state;
    const id = state.targetId;

    if (gameState.mode === 'name-landmark') {
      // The question by type; the name is the answer. CSS hides the Wappen
      gamePrompt.textContent = NAME_LANDMARK_PROMPTS[landmarksData[id].type];
      gamePromptType.textContent = '';
    } else if (isLandmarkMode(gameState.mode)) {
      // The name and its type ("Main" / "Fluss"); CSS hides the Wappen
      const r = landmarksData[id];
      gamePrompt.textContent = r.name;
      gamePromptType.textContent = TYPE_LABELS[landmarkType(r)];
    } else {
      gameWappen.src = wappenUrl(id);
      // Generic alt text: in Bundesland benennen the name is the answer, and a
      // Wappen that fails to load would otherwise print it in the panel
      gameWappen.alt = 'Landeswappen';
      gamePrompt.textContent = bundeslaenderData[id].name;
      gamePromptType.textContent = '';
    }
    hudScore.textContent = state.score;
    hudGuesses.textContent = state.guessesLeft;
    renderProgress(state.currentRound, state.totalRounds);

    guessInput.value = '';
    inputFeedback.textContent = '';
    clickFeedback.textContent = '';
    feedbackBar.classList.remove('feedback-bar--correct', 'feedback-bar--wrong');

    setPhase('playing');

    // Only Landeshauptstadt benennen and Gewässer & Städte benennen travel to
    // the target, location to location. The other quiz modes stay on the
    // overview: zooming in for feedback and back out for the next round, every
    // round, is tiring. They return to the overview only if the user has
    // zoomed in themselves or the finden modes' feedback pan moved the map
    // (on the untouched overview the reset changes nothing), which in
    // Bundesland finden also keeps the start un-zoomed, so the map gives
    // nothing away. Gewässer & Städte finden is one of these. The travel
    // comes after setPhase, so it fits the target above the input panel.
    if (gameState.mode === 'name-capital') zoomToBounds(bundeslandBounds(id));
    else if (gameState.mode === 'name-landmark') zoomToBounds(landmarkBounds(id));
    else resetZoom();

    if (gameState.mode === 'name-landmark') {
      // The target shows while playing here (orange, marker for lakes and
      // cities); in Gewässer & Städte finden only in feedback
      highlightLandmark(id);
      guessInput.placeholder = 'Name eingeben \u2026';
      setTimeout(() => guessInput.focus(), 800);
    } else if (gameState.mode === 'name-bundesland' || gameState.mode === 'name-capital') {
      highlightTarget(id);
      guessInput.placeholder = gameState.mode === 'name-bundesland'
        ? 'Bundesland eingeben \u2026'
        : 'Landeshauptstadt eingeben \u2026';
      // Focus once the map has settled (the 750ms gentle zoom, when there is one)
      setTimeout(() => guessInput.focus(), 800);
    }
  }

  function showFeedback(correct) {
    const state = game.state;
    const id = state.targetId;
    const landmark = isLandmarkMode(gameState.mode);

    let answer;
    if (landmark) {
      answer = landmarkTitle(id);
    } else if (gameState.mode === 'name-capital') {
      answer = bundeslaenderData[id].capital;
    } else {
      answer = bundeslaenderData[id].name;
    }

    if (correct) {
      feedbackText.textContent = 'Richtig!';
      feedbackBar.classList.add('feedback-bar--correct');
      feedbackBar.classList.remove('feedback-bar--wrong');
    } else {
      feedbackText.textContent = `Keine Versuche mehr \u2013 es war ${answer}`;
      feedbackBar.classList.add('feedback-bar--wrong');
      feedbackBar.classList.remove('feedback-bar--correct');
    }

    if (landmark) {
      // Orange target and marker; Gewässer & Städte finden only pans (below).
      // Gewässer & Städte benennen reveals the answer in the prompt
      if (gameState.mode === 'name-landmark') gamePrompt.textContent = answer;
      setHoveredLandmark(null);
      fillLandmarkInfo(id);
      highlightLandmark(id);
    } else {
      fillBundeslandInfo(id);
      highlightTarget(id);
    }
    hudScore.textContent = state.score;
    // The round is complete once it reaches feedback
    renderProgress(state.currentRound + 1, state.totalRounds);

    setPhase('feedback');

    // Re-centre on the target only where the round is already zoomed to it,
    // fitting it above the feedback bar and the info panel, now laid out.
    // The finden modes stay where they are, unless the target is covered by
    // the panels: then a small pan, no zoom, brings it clear
    if (gameState.mode === 'name-capital') zoomToBounds(bundeslandBounds(id));
    else if (gameState.mode === 'name-landmark') zoomToBounds(landmarkBounds(id));
    else if (gameState.mode === 'find') panToBounds(bundeslandBounds(id));
    else if (gameState.mode === 'find-landmark') panToBounds(landmarkBounds(id));

    if (gameState.autoAdvance) {
      gameState.advanceTimer = setTimeout(advanceRound, 1800);
    } else {
      setTimeout(() => btnNext.focus(), 100);
    }
  }

  function advanceRound() {
    clearAdvanceTimer();
    if (game.next().finished) {
      showStats();
    } else {
      startRound();
    }
  }

  function skipRound() {
    const result = game.skip();
    // Outside a round in play (feedback) a skip is a no-op in the core
    if (result.ignored) return;
    clearAdvanceTimer();
    if (result.finished) {
      showStats();
    } else {
      startRound();
    }
  }

  function quitGame() {
    clearAdvanceTimer();
    if (gameState.mode === 'explore') {
      returnToMenu();
      return;
    }
    game.quit();
    showStats();
  }

  function getHistory(mode) {
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + mode));
      return Array.isArray(hist) ? hist.filter(h => h && h.rounds > 0) : [];
    } catch { return []; }
  }

  function saveHistory(mode, entry) {
    const hist = getHistory(mode);
    while (hist.length >= HISTORY_LENGTH) hist.shift();
    hist.push(entry);
    try { localStorage.setItem(HISTORY_KEY_PREFIX + mode, JSON.stringify(hist)); }
    catch { /* storage full or blocked: the game still ends normally */ }
  }

  function showStats() {
    clearAdvanceTimer();
    clearMapClasses();

    const { roundsPlayed, correct, skipped, percent } = game.summary();

    $('stat-rounds').textContent = roundsPlayed;
    $('stat-correct').textContent = correct;
    $('stat-skipped').textContent = skipped;
    $('stat-score').textContent = percent + '%';

    const hist = getHistory(gameState.mode);
    const avgRow = $('stat-avg-row');
    const avgEl = $('stat-avg');
    if (hist.length > 0) {
      const totalCorrect = hist.reduce((s, h) => s + h.correct, 0);
      const totalRounds  = hist.reduce((s, h) => s + h.rounds, 0);
      const avg = Math.round((totalCorrect / totalRounds) * 100);
      const tip = 'Punktzahl in %: ' + hist.slice(-8).map(h => Math.round((h.correct / h.rounds) * 100)).join(', ');
      $('stat-avg-pct').textContent = avg + '%';
      avgEl.className = 'stat-value stat-avg-wrap';
      $('stat-avg-tooltip').textContent = tip;
      $('stat-avg-label').textContent = totalRounds === 1
        ? 'Durchschnitt der letzten Runde'
        : `Durchschnitt der letzten ${totalRounds} Runden`;
      avgRow.style.display = '';
    } else {
      avgRow.style.display = 'none';
    }
    saveHistory(gameState.mode, { rounds: roundsPlayed, correct, skipped });

    setPhase('idle');
    setScreen('stats');
    resetZoom();
  }

  function returnToMenu() {
    clearAdvanceTimer();
    clearMapClasses();
    countryPanel.classList.remove('visible');
    lastTappedId = null;
    setPhase('idle');
    setScreen('select');
    resetZoom();
  }

  /* === Event Wiring === */
  function wireEvents() {
    // Mode selection
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.modeChoice;
        if (mode === 'explore') {
          startExplore();
        } else {
          openSettings(mode);
        }
      });
    });

    // Stepper buttons
    document.querySelectorAll('.stepper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setting = btn.dataset.setting;
        const dir = parseInt(btn.dataset.dir);
        const valEl = setting === 'rounds' ? valRounds : valGuesses;
        const min = 1;
        const max = setting === 'rounds' ? roundsMax : GUESSES_MAX;
        let val = parseInt(valEl.textContent) + dir;
        val = Math.max(min, Math.min(max, val));
        valEl.textContent = val;
      });
    });

    // Type toggles: the last one on can't be switched off (the click is
    // ignored); otherwise Runden's maximum follows the pool size
    for (const chk of typeToggles) {
      chk.addEventListener('click', (e) => {
        if (!typeToggles.some(c => c.checked)) {
          e.preventDefault();
          return;
        }
        const newMax = Object.keys(landmarkItems(selectedTypes())).length;
        valRounds.textContent = followRounds(parseInt(valRounds.textContent), roundsMax, newMax);
        roundsMax = newMax;
      });
    }

    // Settings buttons
    $('btn-back-settings').addEventListener('click', () => setScreen('select'));
    $('btn-start').addEventListener('click', startGame);

    // Game buttons
    $('btn-skip').addEventListener('click', skipRound);
    $('btn-quit').addEventListener('click', quitGame);
    $('btn-next').addEventListener('click', advanceRound);
    $('btn-menu').addEventListener('click', returnToMenu);

    // Text input
    $('btn-submit').addEventListener('click', handleSubmit);
    guessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });

    // Stats screen
    $('btn-back-menu').addEventListener('click', returnToMenu);

    // Settings credits: CSS shows the short note or the full wording off
    // aria-expanded; click or Enter expands, openSettings() collapses
    const expandCredits = () => settingsCredits.setAttribute('aria-expanded', 'true');
    settingsCredits.addEventListener('click', expandCredits);
    settingsCredits.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandCredits(); }
    });
  }

  /* === Init === */
  setPhase('idle');
  setScreen('select');
  loadData().catch(err => console.error('Failed to load data:', err));
})();
