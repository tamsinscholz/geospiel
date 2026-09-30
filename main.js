import { createGame } from './game-core.mjs';

(() => {
  /* === DOM References === */
  const $ = id => document.getElementById(id);
  const body = document.body;

  const gameWappen     = $('game-wappen');
  const gamePrompt     = $('game-prompt');
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
  const inputFeedback  = $('input-feedback');
  const guessInput     = $('guess-input');
  const settingsTitle  = $('settings-title');
  const valRounds      = $('val-rounds');
  const valGuesses     = $('val-guesses');
  const chkAuto        = $('chk-auto');

  /* === Constants === */
  const MODE_LABELS = {
    'find': 'Bundesland finden',
    'name-bundesland': 'Bundesland benennen',
    'name-capital': 'Landeshauptstadt benennen',
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
  let geoFeatures = [];
  let kulisseFeatures = [];

  /* === D3 Globals === */
  let projection, pathGenerator, zoom, g;

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

  function formatNumber(n) {
    return numberFormat.format(n);
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
  }

  /** The visible Bundesland path for an id. Hits on a `.hit-target` halo are
   *  resolved through this, so map classes always land on the real shape. */
  function bundeslandPath(id) {
    return document.querySelector(`.bundesland[data-id="${id}"]`);
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
  }

  /** The viewBox as a d3 extent, `[[x0, y0], [x1, y1]]`. */
  function viewBoxExtent() {
    return [[viewBox.x, viewBox.y], [viewBox.x + viewBox.width, viewBox.y + viewBox.height]];
  }

  function zoomToBundesland(id, duration = 750) {
    const feature = geoFeatures.find(f => featureId(f) === id);
    if (!feature) return;
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(feature);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;
    const scale = Math.min(TARGET_ZOOM_MAX, 0.9 / Math.max(dx / viewBox.width, dy / viewBox.height));
    const tx = viewBox.x + viewBox.width / 2 - scale * x;
    const ty = viewBox.y + viewBox.height / 2 - scale * y;

    // zoom.transform does not apply the pan clamp by itself, so constrain the
    // target the same way a drag would be constrained.
    const target = zoom.constrain()(
      d3.zoomIdentity.translate(tx, ty).scale(scale), viewBoxExtent(), zoom.translateExtent());
    d3.select('#map').transition().duration(duration)
      .call(zoom.transform, target);
  }

  function resetZoom(duration = 300) {
    d3.select('#map').transition().duration(duration)
      .call(zoom.transform, d3.zoomIdentity);
  }

  /* === Data Loading === */
  async function loadData() {
    const [topology, kulisseTopology, bundeslaender, aliases] = await Promise.all([
      d3.json('data/bundeslaender.topo.json'),
      d3.json('data/kulisse.topo.json'),
      d3.json('data/bundeslaender.json'),
      d3.json('data/bundesland-aliases.json'),
    ]);

    bundeslaenderData = bundeslaender;
    aliasesData = aliases;
    geoFeatures = topojson.feature(topology, topology.objects.bundeslaender).features;
    kulisseFeatures = topojson.feature(kulisseTopology, kulisseTopology.objects.kulisse).features;
    const germany = topojson.merge(topology, topology.objects.bundeslaender.geometries);

    initMap(germany);
  }

  /* === D3 Map Setup === */
  function initMap(germany) {
    const svg = d3.select('#map');
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

    // The zoom extent defaults to the viewBox; making the translate extent the
    // same rectangle leaves no pan at k = 1 and clamps to Germany plus the
    // padding margin at every higher k.
    zoom = d3.zoom()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .translateExtent(viewBoxExtent())
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Click anywhere that is not a Bundesland (sea, letterbox, or the Kulisse,
    // which lets clicks through) to dismiss the explore panel
    svg.on('click', (event) => {
      if (!event.target.closest('.bundesland, .hit-target') && gameState.mode === 'explore') {
        d3.selectAll('.bundesland').classed('highlighted', false);
        countryPanel.classList.remove('visible');
        lastTappedId = null;
      }
    });

    wireEvents();
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
    const pathEl = bundeslandPath(id);
    d3.select(pathEl).classed('wrong-guess', true);
    setTimeout(() => d3.select(pathEl).classed('wrong-guess', false), 600);

    if (result.exhausted) {
      showFeedback(false);
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
  function openSettings(mode) {
    gameState.mode = mode;
    settingsTitle.textContent = MODE_LABELS[mode];
    valRounds.textContent = gameState.totalRounds;
    valGuesses.textContent = gameState.maxGuesses;
    chkAuto.checked = gameState.autoAdvance;
    setScreen('settings');
  }

  /* === Game Flow === */
  function startGame() {
    gameState.totalRounds = parseInt(valRounds.textContent);
    gameState.maxGuesses = parseInt(valGuesses.textContent);
    gameState.autoAdvance = chkAuto.checked;
    // CSS hides Weiter off this attribute; it holds for the whole game
    body.dataset.autoAdvance = gameState.autoAdvance ? 'on' : 'off';

    // Only Bundesländer that have geometry on the map can be a round's target.
    // Which ids have geometry is knowledge that belongs to this side of the
    // seam, so the filtering happens here and the game-core gets the result.
    const items = {};
    for (const id of Object.keys(bundeslaenderData)) {
      if (geoFeatures.some(f => featureId(f) === id)) items[id] = bundeslaenderData[id];
    }

    game = createGame({
      items,
      aliases: aliasesData,
      mode: gameState.mode,
      totalRounds: gameState.totalRounds,
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
    const c = bundeslaenderData[id];

    gameWappen.src = wappenUrl(id);
    // Generic alt text: in Bundesland benennen the name is the answer, and a
    // Wappen that fails to load would otherwise print it in the panel
    gameWappen.alt = 'Landeswappen';
    gamePrompt.textContent = c.name;
    hudScore.textContent = state.score;
    hudGuesses.textContent = state.guessesLeft;
    renderProgress(state.currentRound, state.totalRounds);

    guessInput.value = '';
    inputFeedback.textContent = '';
    feedbackBar.classList.remove('feedback-bar--correct', 'feedback-bar--wrong');

    setPhase('playing');

    // Bundesland finden starts un-highlighted and un-zoomed, or the map would
    // give the answer away; undo the previous round's feedback zoom
    if (gameState.mode === 'find') resetZoom();

    if (gameState.mode === 'name-bundesland' || gameState.mode === 'name-capital') {
      highlightTarget(id);
      zoomToBundesland(id);
      guessInput.placeholder = gameState.mode === 'name-bundesland'
        ? 'Bundesland eingeben \u2026'
        : 'Name the capital\u2026';
      // Focus once the 750ms gentle zoom has settled
      setTimeout(() => guessInput.focus(), 800);
    }
  }

  function showFeedback(correct) {
    const state = game.state;
    const id = state.targetId;
    const c = bundeslaenderData[id];

    let answer;
    if (gameState.mode === 'name-capital') {
      answer = c.capital;
    } else {
      answer = c.name;
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

    fillBundeslandInfo(id);
    highlightTarget(id);
    zoomToBundesland(id);
    hudScore.textContent = state.score;
    // The round is complete once it reaches feedback
    renderProgress(state.currentRound + 1, state.totalRounds);

    setPhase('feedback');

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
    clearAdvanceTimer();
    if (game.skip().finished) {
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
        const max = setting === 'rounds' ? ROUNDS_MAX : GUESSES_MAX;
        let val = parseInt(valEl.textContent) + dir;
        val = Math.max(min, Math.min(max, val));
        valEl.textContent = val;
      });
    });

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
  }

  /* === Init === */
  setPhase('idle');
  setScreen('select');
  loadData().catch(err => console.error('Failed to load data:', err));
})();
