/* BROKEBOTS — game state, loop, UI flow and layout.
   Phases: boot → menu ⇄ controls → serve → play → point → (serve | over)
   While the menus are up, the two bots run an unscored, silent demo rally. */
(function () {
  'use strict';
  const BB = window.BB;
  const C = BB.CFG;
  const P = BB.Physics;
  const $ = (id) => document.getElementById(id);

  const NAMES = { L: 'OSSIE', R: 'LUMA-9' };
  const PLATE_MIN = C.PADDLE_MARGIN, PLATE_MAX = C.H - C.PADDLE_MARGIN - C.PADDLE_H;

  const settings = Object.assign({ mode: '1p', pilot: 'L', diff: 'normal', target: 7 }, BB.store.get('settings', {}));
  if (!BB.DIFFICULTY[settings.diff]) settings.diff = 'normal';
  if ([5, 7, 11].indexOf(+settings.target) < 0) settings.target = 7;

  const G = {
    phase: 'boot',
    demo: true,
    score: { L: 0, R: 0 },
    L: P.makePaddle('L'),
    R: P.makePaddle('R'),
    ball: P.makeBall(),
    ais: {},               // side -> ai controller
    humans: {},            // side -> true
    serveDir: 1,
    timer: 0,
    rally: 0,
    matchOver: false,
    pausedFrom: null,
    t: 0,
    glow: { L: 0, R: 0 },
    scale: 1
  };

  const el = {
    viewport: $('viewport'), cabinet: $('cabinet'), stage: $('stage'), canvas: $('arena'),
    scoreL: $('scoreL'), scoreR: $('scoreR'), roleL: $('roleL'), roleR: $('roleR'),
    banner: $('banner'), diagL: $('diagL'), diagR: $('diagR'), diagMid: $('diagMid'),
    lampL: $('lampL'), lampR: $('lampR'), btnMute: $('btnMute'), btnPause: $('btnPause'),
    overTitle: $('overTitle'), overScore: $('overScore'), overNote: $('overNote'), menuRows: $('menuRows')
  };
  const screens = {
    boot: $('scrBoot'), menu: $('scrMenu'), controls: $('scrControls'), paused: $('scrPause'), over: $('scrOver')
  };

  BB.Render.init(el.canvas);
  const fx = { spark: BB.Render.spark, bolt: BB.Render.bolt };
  const bots = { L: new BB.BotView('L', $('botL'), fx), R: new BB.BotView('R', $('botR'), fx) };

  // Read-only snapshots handed to the personality layer each frame
  const view = { L: {}, R: {} };

  /* ------------------------------ layout ------------------------------ */
  function layout() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const cw = el.cabinet.offsetWidth, ch = el.cabinet.offsetHeight;   // untransformed size
    const portrait = vh > vw * 1.05;
    document.body.classList.toggle('portrait', portrait);
    const reserve = portrait ? 56 : 0;
    const s = Math.min(vw / cw, (vh - reserve) / ch);
    const x = (vw - cw * s) / 2;
    const y = portrait ? Math.max(6, (vh - reserve - ch * s) * 0.25) : (vh - ch * s) / 2;
    el.cabinet.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    // The arena is 1200 logical units wide inside the cabinet
    G.scale = s * (el.stage.offsetWidth / C.W);
    BB.Render.resize(G.scale);
  }
  let resizeRaf = 0;
  function queueLayout() { if (!resizeRaf) resizeRaf = requestAnimationFrame(() => { resizeRaf = 0; layout(); }); }
  window.addEventListener('resize', queueLayout);
  window.addEventListener('orientationchange', queueLayout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', queueLayout);

  /* ------------------------------ screens ----------------------------- */
  function show(name) {
    Object.keys(screens).forEach((k) => screens[k].setAttribute('data-active', k === name ? '1' : '0'));
    stackFocus = 0;
    paintStackFocus();
  }

  let bannerTimer = 0;
  function banner(text, dur) {
    el.banner.textContent = text;
    el.banner.classList.remove('show'); void el.banner.offsetWidth; el.banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.banner.classList.remove('show'), (dur || 1) * 1000);
  }

  function paintScore() {
    el.scoreL.textContent = G.score.L;
    el.scoreR.textContent = G.score.R;
  }

  function paintRoles() {
    if (settings.mode === '2p') { el.roleL.textContent = 'PLAYER 1 · W/S'; el.roleR.textContent = 'PLAYER 2 · ↑/↓'; return; }
    const d = BB.DIFFICULTY[settings.diff].label;
    el.roleL.textContent = settings.pilot === 'L' ? 'PLAYER' : 'CPU · ' + d;
    el.roleR.textContent = settings.pilot === 'R' ? 'PLAYER' : 'CPU · ' + d;
  }

  function paintMute() {
    const m = BB.Audio.isMuted();
    el.btnMute.textContent = m ? 'MUTED' : 'SND';
    el.btnMute.classList.toggle('off', m);
    el.btnMute.setAttribute('aria-pressed', m ? 'true' : 'false');
  }

  /* ------------------------------ menu -------------------------------- */
  const ROWS = ['mode', 'pilot', 'diff', 'target', 'actions'];
  let menuRow = 4, actionCol = 1;

  function rowEnabled(r) { return !((r === 'pilot' || r === 'diff') && settings.mode === '2p'); }

  function paintMenu() {
    ROWS.forEach((r, i) => {
      const row = el.menuRows.querySelector('[data-row="' + r + '"]');
      row.classList.toggle('focus', i === menuRow);
      row.classList.toggle('disabled', !rowEnabled(r));
      if (r === 'actions') {
        $('btnControls').classList.toggle('focus', i === menuRow && actionCol === 0);
        $('btnStart').classList.toggle('focus', i === menuRow && actionCol === 1);
        return;
      }
      const key = r === 'target' ? 'target' : r;
      row.querySelectorAll('.opt').forEach((o) => o.classList.toggle('sel', String(settings[key]) === o.dataset.val));
    });
    paintRoles();
  }

  function setSetting(r, val) {
    if (r === 'target') val = +val;
    settings[r] = val;
    BB.store.set('settings', settings);
    paintMenu();
  }

  function cycleRow(dir) {
    const r = ROWS[menuRow];
    if (r === 'actions') { actionCol = BB.clamp(actionCol + dir, 0, 1); paintMenu(); BB.Audio.play('menuMove'); return; }
    if (!rowEnabled(r)) return;
    const opts = Array.prototype.map.call(el.menuRows.querySelectorAll('[data-row="' + r + '"] .opt'), (o) => o.dataset.val);
    let i = opts.indexOf(String(settings[r]));
    i = (i + dir + opts.length) % opts.length;
    setSetting(r, opts[i]);
    BB.Audio.play('menuMove');
  }

  function moveRow(dir) {
    let i = menuRow;
    do { i = (i + dir + ROWS.length) % ROWS.length; } while (!rowEnabled(ROWS[i]));
    menuRow = i;
    paintMenu();
    BB.Audio.play('menuMove');
  }

  el.menuRows.addEventListener('click', (e) => {
    const o = e.target.closest('.opt');
    if (!o) return;
    const r = o.closest('.row').dataset.row;
    if (!rowEnabled(r)) return;
    menuRow = ROWS.indexOf(r);
    setSetting(r, o.dataset.val);
    BB.Audio.play('menuMove');
  });

  // Simple focus list for the small panels (pause / game over)
  let stackFocus = 0;
  function stackButtons() {
    const s = screens[G.phase];
    return s ? Array.prototype.slice.call(s.querySelectorAll('.stack .btn')) : [];
  }
  function paintStackFocus() { stackButtons().forEach((b, i) => b.classList.toggle('focus', i === stackFocus)); }

  /* ------------------------------ flow -------------------------------- */
  function powerOn() {
    if (G.phase !== 'boot') return;
    BB.Audio.init();
    BB.Audio.play('powerOn');
    goMenu();
  }

  function goMenu() {
    G.phase = 'menu';
    G.pausedFrom = null;
    startDemo();
    show('menu');
    menuRow = 4; actionCol = 1;
    paintMenu();
    BB.Audio.humOn(false);
  }

  function startDemo() {
    G.demo = true;
    G.ais = { L: BB.AI.makeAI(G.L, 'normal'), R: BB.AI.makeAI(G.R, 'normal') };
    G.humans = {};
    G.score.L = G.score.R = 0;
    paintScore();
    bots.L.reset(); bots.R.reset();
    newServe(BB.chance(0.5) ? 1 : -1, 1.2);
  }

  function startMatch() {
    BB.Audio.init();
    G.demo = false;
    G.matchOver = false;
    G.score.L = G.score.R = 0;
    G.ais = {}; G.humans = {};
    if (settings.mode === '2p') { G.humans.L = G.humans.R = true; }
    else {
      const ai = settings.pilot === 'L' ? 'R' : 'L';
      G.humans[settings.pilot] = true;
      G.ais[ai] = BB.AI.makeAI(G[ai], settings.diff);
    }
    P.resetPaddle(G.L); P.resetPaddle(G.R);
    G.L.maxSpeed = G.R.maxSpeed = C.HUMAN_SPEED;
    bots.L.reset(); bots.R.reset();
    BB.Input.clearPointers();
    paintScore(); paintRoles();
    show(null);
    G.phase = 'serve';
    newServe(BB.chance(0.5) ? 1 : -1, C.SERVE_DELAY + 0.5);
    BB.Audio.play('menuSelect');
    BB.Audio.humOn(true);
    banner('EXPERIMENT ENGAGED', 1.2);
  }

  function newServe(dir, delay) {
    P.centreBall(G.ball);
    BB.Render.clearTrail();
    G.serveDir = dir;
    G.timer = delay;
    G.rally = 0;
    if (G.demo) G.demoPhase = 'serve';
  }

  function pause() {
    if (!(G.phase === 'serve' || G.phase === 'play' || G.phase === 'point')) return;
    G.pausedFrom = G.phase;
    G.phase = 'paused';
    BB.Input.clearPointers();
    show('paused');
    BB.Audio.play('pause');
    BB.Audio.humOn(false);
  }

  function resume() {
    if (G.phase !== 'paused') return;
    G.phase = G.pausedFrom || 'serve';
    G.pausedFrom = null;
    show(null);
    BB.Audio.play('resume');
    BB.Audio.humOn(true);
  }

  function gameOver() {
    const w = G.score.L > G.score.R ? 'L' : 'R', l = w === 'L' ? 'R' : 'L';
    G.phase = 'over';
    bots[w].event('win');
    bots[l].event('lose');
    BB.Audio.play(w === 'L' ? 'winL' : 'winR');
    BB.Audio.play('lose');
    BB.Audio.humOn(false);
    const humanWon = settings.mode === '1p' && G.humans[w];
    const humanLost = settings.mode === '1p' && G.humans[l];
    el.overTitle.textContent = humanWon ? 'YOU WIN' : humanLost ? NAMES[w] + ' WINS' : NAMES[w] + ' WINS';
    el.overScore.textContent = G.score.L + ' — ' + G.score.R;
    const bolts = bots.L.parts.bolts.filter((b) => b.style.display !== 'none').length;
    const flavour = w === 'L'
      ? 'ANALOGUE PERSISTENCE CONFIRMED. BOLTS REMAINING: ' + bolts + '/6.'
      : 'DIGITAL SUPERIORITY CLAIMED. ERRORS LOGGED: ' + bots.R.damage + '.';
    const who = settings.mode === '2p' ? (w === 'L' ? 'PLAYER 1' : 'PLAYER 2') + ' · ' : humanWon ? 'PILOTING ' + NAMES[w] + ' · ' : 'CPU · ' + BB.DIFFICULTY[settings.diff].label + ' · ';
    el.overNote.textContent = who + flavour;
    show('over');
  }

  function restart() { startMatch(); }

  /* ------------------------------ simulation -------------------------- */
  const events = [];

  function driveHuman(side, p) {
    const axis = settings.mode === '2p' ? (side === 'L' ? BB.Input.axisL() : BB.Input.axisR()) : BB.Input.axisAny();
    const d = BB.Input.takeTouch(side);
    if (axis !== 0) { p.target = null; p.dir = axis; p.maxSpeed = C.HUMAN_SPEED; }
    else if (d !== 0) {
      p.dir = 0;
      p.target = BB.clamp((p.target === null ? p.y : p.target) + d, PLATE_MIN, PLATE_MAX);
      p.maxSpeed = C.TOUCH_SPEED;
    } else p.dir = 0;
  }

  function simulate(dt) {
    const b = G.ball;
    ['L', 'R'].forEach((s) => {
      if (G.humans[s]) driveHuman(s, G[s]);
      else if (G.ais[s]) BB.AI.updateAI(G.ais[s], b, dt);
      P.updatePaddle(G[s], dt);
    });

    const phase = G.demo ? G.demoPhase : G.phase;
    if (phase === 'serve') {
      G.timer -= dt;
      if (G.timer <= 0) {
        P.serveBall(b, G.serveDir);
        if (G.demo) G.demoPhase = 'play'; else { G.phase = 'play'; BB.Audio.play('serve'); }
        bots.L.event('serve'); bots.R.event('serve');
      }
    } else if (phase === 'play') {
      events.length = 0;
      P.stepBall(b, G.L, G.R, dt, events);
      BB.Render.pushTrail(b);
      for (let i = 0; i < events.length; i++) handleEvent(events[i]);
    } else if (phase === 'point') {
      G.timer -= dt;
      if (G.timer <= 0) {
        if (G.demo) { G.demoPhase = 'serve'; newServe(G.serveDir, 1.0); }
        else if (G.matchOver) gameOver();
        else { G.phase = 'serve'; newServe(G.serveDir, C.SERVE_DELAY); }
      }
    }
  }

  function sfx(name, arg) { if (!G.demo) BB.Audio.play(name, arg); }

  function handleEvent(e) {
    if (e.type === 'wall') {
      sfx('wall', G.ball.speed);
      BB.Render.spark(e.x, e.y, 3, 0, '#c49a4c');
    } else if (e.type === 'hit') {
      const other = e.side === 'L' ? 'R' : 'L';
      G.rally++;
      G.glow[e.side] = 1;
      sfx(e.side === 'L' ? 'hitL' : 'hitR', e.speed);
      BB.Render.spark(e.x, e.y, e.speed > 900 ? 10 : 6, e.side === 'L' ? 1 : -1, e.side === 'L' ? '#ffcf7a' : '#fff6ea');
      bots[e.side].event('hit', e);
      if (e.speed > 850) bots[other].event('incoming', e);
    } else if (e.type === 'goal') {
      const c = e.side, s = c === 'L' ? 'R' : 'L';
      BB.Render.spark(BB.clamp(e.x, 20, C.W - 20), e.y, 18, c === 'L' ? 1 : -1, '#ff6a3d');
      bots[c].event('goalAgainst');
      bots[s].event('goalFor');
      G.serveDir = c === 'L' ? -1 : 1;          // serve towards the side that conceded
      el.stage.classList.remove('jolt'); void el.stage.offsetWidth; el.stage.classList.add('jolt');
      if (G.demo) { G.demoPhase = 'point'; G.timer = 1.0; return; }
      G.score[s]++;
      paintScore();
      const scoreEl = s === 'L' ? el.scoreL : el.scoreR;
      scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
      sfx(c === 'L' ? 'goalL' : 'goalR');
      G.phase = 'point';
      G.timer = C.POINT_DELAY;
      if (G.score[s] >= settings.target) { G.matchOver = true; G.timer = 1.3; banner(NAMES[s] + ' TAKES THE MATCH', 1.3); }
      else if (G.score.L === settings.target - 1 || G.score.R === settings.target - 1) banner('POINT ' + NAMES[s] + ' · MATCH POINT', 1.1);
      else banner('POINT ' + NAMES[s], 1.0);
    }
  }

  function fillView(side) {
    const v = view[side], p = G[side], b = G.ball, ai = G.ais[side];
    v.py = p.y; v.pvy = p.vy;
    v.bx = b.x; v.by = b.y; v.bspeed = b.speed; v.blive = b.live;
    v.towards = b.live && (side === 'L' ? b.vx < 0 : b.vx > 0);
    v.intent = ai && ai.approaching ? ai.intent : null;
    return v;
  }

  /* ------------------------------ loop -------------------------------- */
  let last = 0, diagT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, C.DT_MAX);
    last = now;
    G.t += dt;

    const running = G.phase !== 'paused' && G.phase !== 'over';
    if (running) simulate(dt);

    if (G.phase !== 'paused') {
      bots.L.update(fillView('L'), dt);
      bots.R.update(fillView('R'), dt);
    }
    G.glow.L = Math.max(0, G.glow.L - dt * 5);
    G.glow.R = Math.max(0, G.glow.R - dt * 5);

    const phase = G.demo ? G.demoPhase : G.phase;
    const serving = phase === 'serve' && G.phase !== 'paused';
    BB.Render.draw({
      L: G.L, R: G.R, ball: G.ball,
      glowL: G.glow.L, glowR: G.glow.R,
      showBall: G.phase !== 'over' && (G.ball.live || serving),
      blink: serving && ((G.t * 6) | 0) % 2 === 0,
      serveDir: serving && !G.demo ? G.serveDir : 0,
      t: G.t
    }, G.phase === 'paused' ? 0 : dt);

    diagT -= dt;
    if (diagT <= 0) {
      diagT = 0.2;
      el.diagL.textContent = bots.L.diag();
      el.diagR.textContent = bots.R.diag();
      const sp = G.ball.live ? Math.round(G.ball.speed) : 0;
      el.diagMid.textContent = (G.demo ? 'DEMO RUN' : 'FIRST TO ' + settings.target) + ' · BALL ' + String(sp).padStart(4, '0') + ' u/s · RALLY ' + String(G.rally).padStart(2, '0');
      el.lampL.classList.toggle('warn', bots.L.stressed());
      el.lampR.classList.toggle('warn', bots.R.stressed());
    }
  }

  /* ------------------------------ input wiring ------------------------ */
  BB.Input.onAction((k, e, repeat) => {
    BB.Audio.init();                               // unlock / resume audio on any gesture
    if (k === 'M') { BB.Audio.toggleMute(); paintMute(); return; }
    if (k === 'Pointer') { if (G.phase === 'boot' && !(e.target && e.target.closest('button'))) powerOn(); return; }

    switch (G.phase) {
      case 'boot':
        powerOn();
        break;
      case 'menu':
        if (k === 'ArrowUp' || k === 'W') moveRow(-1);
        else if (k === 'ArrowDown' || k === 'S') moveRow(1);
        else if (k === 'ArrowLeft' || k === 'A') cycleRow(-1);
        else if (k === 'ArrowRight' || k === 'D') cycleRow(1);
        else if (k === 'Enter' || k === 'Space') {
          if (ROWS[menuRow] === 'actions' && actionCol === 0) openControls();
          else startMatch();
        } else if (k === 'C') openControls();
        break;
      case 'controls':
        if (k === 'Escape' || k === 'Enter' || k === 'Space' || k === 'Backspace') closeControls();
        break;
      case 'serve': case 'play': case 'point':
        if (repeat) return;
        if (k === 'Space' || k === 'Escape' || k === 'P') pause();
        else if (k === 'R') restart();
        break;
      case 'paused':
      case 'over': {
        if (repeat && !(k === 'ArrowUp' || k === 'ArrowDown')) return;
        const btns = stackButtons();
        if (k === 'ArrowUp' || k === 'W') { stackFocus = (stackFocus - 1 + btns.length) % btns.length; paintStackFocus(); BB.Audio.play('menuMove'); }
        else if (k === 'ArrowDown' || k === 'S') { stackFocus = (stackFocus + 1) % btns.length; paintStackFocus(); BB.Audio.play('menuMove'); }
        else if (k === 'Enter') { const b = btns[stackFocus]; if (b) b.click(); }
        else if (k === 'Space' && G.phase === 'paused') resume();
        else if (k === 'Escape') { BB.Audio.play('menuSelect'); goMenu(); }
        else if (k === 'R') restart();
        break;
      }
    }
  });

  function openControls() { G.phase = 'controls'; show('controls'); BB.Audio.play('menuSelect'); }
  function closeControls() { G.phase = 'menu'; show('menu'); paintMenu(); BB.Audio.play('menuMove'); }

  const click = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); BB.Audio.init(); fn(); e.currentTarget.blur(); });
  click('btnPower', powerOn);
  click('btnStart', startMatch);
  click('btnControls', openControls);
  click('btnControlsBack', closeControls);
  click('btnResume', resume);
  click('btnRestart', restart);
  click('btnPauseMenu', () => { BB.Audio.play('menuSelect'); goMenu(); });
  click('btnRematch', restart);
  click('btnOverMenu', () => { BB.Audio.play('menuSelect'); goMenu(); });
  click('btnMute', () => { BB.Audio.toggleMute(); paintMute(); });
  click('btnPause', () => { if (G.phase === 'paused') resume(); else pause(); });

  BB.Input.bindPointer(el.viewport, () => G.scale);
  BB.Input.setSteering(
    (clientX) => settings.mode === '2p' ? (clientX < window.innerWidth / 2 ? 'L' : 'R') : settings.pilot,
    () => G.phase === 'serve' || G.phase === 'play' || G.phase === 'point'
  );

  // Hidden tab during a match = pause. The loop itself stops via rAF.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pause(); BB.Audio.suspend(); BB.Input.clear(); }
    else { BB.Audio.wake(); last = 0; }
  });
  window.addEventListener('blur', () => { if (G.phase === 'play') pause(); });

  /* ------------------------------ boot -------------------------------- */
  layout();
  paintMute();
  paintMenu();
  startDemo();
  G.phase = 'boot';
  show('boot');
  requestAnimationFrame(frame);

  // Exposed for automated QA only; the game never reads this.
  BB._debug = { G, bots, settings, startMatch, pause, resume, goMenu, layout };
})();
