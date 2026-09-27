/* BROKEBOTS — canvas rendering (arena, plates, ball, particles).
   The static chamber is pre-rendered to an offscreen canvas on resize, so each
   frame is one drawImage plus a handful of shapes. No pixel manipulation. */
(function () {
  'use strict';
  const BB = window.BB;
  const C = BB.CFG;

  let cv, ctx, bg, bgCtx, pxScale = 1;
  const trail = [];
  const TRAIL_N = 10;
  const parts = [];
  const MAX_PARTS = 90;

  const RAIL_L = C.PADDLE_X_L - C.BOT_ART_W + 22.5 * C.BOT_SCALE;
  const RAIL_R = C.PADDLE_X_R + C.PADDLE_W + 90.5 * C.BOT_SCALE;

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: false });
    bg = document.createElement('canvas');
    bgCtx = bg.getContext('2d');
  }

  // scale = CSS px per logical unit
  function resize(scale) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pxScale = Math.min(scale * dpr, 2.4);           // cap backing-store size for weak GPUs
    const w = Math.round(C.W * pxScale), h = Math.round(C.H * pxScale);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    bg.width = w; bg.height = h;
    drawBackground();
  }

  function drawBackground() {
    const g = bgCtx;
    g.setTransform(pxScale, 0, 0, pxScale, 0, 0);
    const rg = g.createRadialGradient(C.W / 2, C.H / 2, 60, C.W / 2, C.H / 2, C.W * 0.62);
    rg.addColorStop(0, '#191110'); rg.addColorStop(1, '#070505');
    g.fillStyle = rg; g.fillRect(0, 0, C.W, C.H);

    // Goal bays behind each plate
    g.fillStyle = 'rgba(105,0,0,0.13)';
    g.fillRect(0, 0, C.PADDLE_X_L, C.H);
    g.fillRect(C.PADDLE_X_R + C.PADDLE_W, 0, C.W - C.PADDLE_X_R - C.PADDLE_W, C.H);

    // Measurement grid
    g.strokeStyle = 'rgba(120,70,50,0.10)'; g.lineWidth = 1;
    g.beginPath();
    for (let x = C.PADDLE_X_L + 40; x < C.PADDLE_X_R - 20; x += 40) { g.moveTo(x + 0.5, C.WALL_TOP); g.lineTo(x + 0.5, C.WALL_BOTTOM); }
    for (let y = 47; y < C.H; y += 40) { g.moveTo(C.PADDLE_X_L + 20, y + 0.5); g.lineTo(C.PADDLE_X_R - 4, y + 0.5); }
    g.stroke();

    // Centre line + ring
    g.strokeStyle = 'rgba(200,150,90,0.22)'; g.lineWidth = 3;
    g.setLineDash([14, 14]);
    g.beginPath(); g.moveTo(C.W / 2, C.WALL_TOP + 10); g.lineTo(C.W / 2, C.WALL_BOTTOM - 10); g.stroke();
    g.setLineDash([]);
    g.lineWidth = 2; g.strokeStyle = 'rgba(200,150,90,0.14)';
    g.beginPath(); g.arc(C.W / 2, C.H / 2, 64, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(C.W / 2, C.H / 2, 4, 0, Math.PI * 2); g.fillStyle = 'rgba(200,150,90,0.3)'; g.fill();

    // Plate travel limit marks
    g.strokeStyle = 'rgba(105,0,0,0.55)'; g.lineWidth = 2;
    g.beginPath();
    [C.PADDLE_X_L + C.PADDLE_W + 0.5, C.PADDLE_X_R - 0.5].forEach((x) => { g.moveTo(x, C.WALL_TOP); g.lineTo(x, C.WALL_BOTTOM); });
    g.setLineDash([2, 10]); g.stroke(); g.setLineDash([]);

    // Rails the bots ride on
    [RAIL_L, RAIL_R].forEach((x) => {
      g.fillStyle = '#1a1412'; g.fillRect(x - 5, 0, 10, C.H);
      g.fillStyle = '#3a2c20'; g.fillRect(x - 1.5, 0, 3, C.H);
      g.fillStyle = '#2a201a';
      for (let y = 6; y < C.H; y += 18) g.fillRect(x - 8, y, 16, 3);
    });

    // Walls: bronze bars with hazard ticks
    [[0, C.WALL_TOP], [C.WALL_BOTTOM, C.H - C.WALL_BOTTOM]].forEach(([y, h]) => {
      const lg = g.createLinearGradient(0, y, 0, y + h);
      lg.addColorStop(0, '#9c7536'); lg.addColorStop(1, '#4a3418');
      g.fillStyle = lg; g.fillRect(0, y, C.W, h);
      g.fillStyle = 'rgba(20,10,5,0.55)';
      for (let x = 0; x < C.W; x += 24) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 8, y); g.lineTo(x + 14, y); g.lineTo(x + 6, y + h); g.fill(); }
    });

    // Stencilled labels
    g.font = '700 13px "Courier New", monospace';
    g.fillStyle = 'rgba(200,150,90,0.26)';
    g.textAlign = 'center';
    g.fillText('BAY 01 // DEFLECTION TRIAL // DO NOT FEED THE SUBJECTS', C.W / 2, C.WALL_BOTTOM - 16);
    g.fillText('SUBJECT A', C.W * 0.3, C.WALL_TOP + 26);
    g.fillText('SUBJECT B', C.W * 0.7, C.WALL_TOP + 26);
    g.textAlign = 'left';
  }

  function pushTrail(b) {
    trail.push(b.x, b.y);
    if (trail.length > TRAIL_N * 2) trail.splice(0, 2);
  }
  function clearTrail() { trail.length = 0; }

  function spark(x, y, n, dirX, colour) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX_PARTS) parts.shift();
      const a = (dirX ? (dirX > 0 ? 0 : Math.PI) : Math.random() * Math.PI * 2) + BB.rand(-1.1, 1.1);
      const sp = BB.rand(120, 420);
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: BB.rand(0.2, 0.5), c: colour || '#ffcf7a', s: BB.rand(1.5, 3), g: 500, bolt: false });
    }
  }
  function bolt(x, y) {
    if (parts.length >= MAX_PARTS) parts.shift();
    parts.push({ x, y, vx: BB.rand(80, 200), vy: BB.rand(-320, -180), life: 0, max: 1.4, c: '#d8b36a', s: 3.2, g: 900, bolt: true, rot: 0 });
    spark(x, y, 6, 0, '#ffb347');
  }

  function stepParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.bolt && p.y > C.WALL_BOTTOM - 4) { p.y = C.WALL_BOTTOM - 4; p.vy *= -0.4; p.vx *= 0.6; }
      if (p.bolt) p.rot = (p.rot || 0) + dt * 14;
    }
  }

  function drawPlate(p, old, glow) {
    const x = p.x, y = p.y, w = p.w, h = p.h;
    if (old) {
      const lg = ctx.createLinearGradient(x, 0, x + w, 0);
      lg.addColorStop(0, '#5a3c18'); lg.addColorStop(0.5, '#c49a4c'); lg.addColorStop(1, '#8a6230');
      ctx.fillStyle = lg; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(30,15,5,0.6)';
      for (let yy = y + 6; yy < y + h - 4; yy += 14) ctx.fillRect(x + 3, yy, w - 6, 3);
      ctx.fillStyle = '#e8c27a'; ctx.fillRect(x + w - 2, y, 2, h);          // collision face
    } else {
      ctx.fillStyle = '#e4ded3'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#26262a'; ctx.fillRect(x + 5, y + 4, w - 5, h - 8);
      ctx.fillStyle = '#690000'; ctx.fillRect(x + 8, y + h / 2 - 16, 4, 32);
      ctx.fillStyle = '#fff6ea'; ctx.fillRect(x, y, 2, h);                   // collision face
    }
    ctx.strokeStyle = old ? '#23170a' : '#55514a'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    if (glow > 0) {
      ctx.globalAlpha = glow;
      ctx.fillStyle = old ? '#ffcf7a' : '#ffffff';
      ctx.fillRect(old ? x + w - 4 : x, y, 4, h);
      ctx.globalAlpha = 1;
    }
  }

  function drawBall(b, blinkHidden) {
    for (let i = 0; i < trail.length; i += 2) {
      const k = (i / 2 + 1) / (trail.length / 2 + 1);
      ctx.globalAlpha = k * 0.28;
      ctx.fillStyle = '#e8b04a';
      ctx.beginPath(); ctx.arc(trail[i], trail[i + 1], b.r * (0.4 + k * 0.5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (blinkHidden) return;
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff4dc';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#690000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, 0, Math.PI * 2); ctx.stroke();
  }

  function drawParticles() {
    for (const p of parts) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = p.bolt ? Math.min(1, a * 3) : a;
      ctx.fillStyle = p.c;
      if (p.bolt) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.s, -p.s, p.s * 2, p.s * 2);
        ctx.fillStyle = '#3a270f'; ctx.fillRect(-1, -p.s, 2, p.s * 2);
        ctx.restore();
      } else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawServeArrow(dirX, t) {
    const x = C.W / 2 + dirX * (34 + Math.sin(t * 8) * 4), y = C.H / 2;
    ctx.fillStyle = 'rgba(232,176,74,0.7)';
    ctx.beginPath(); ctx.moveTo(x + dirX * 12, y); ctx.lineTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill();
  }

  /* s = { L, R, ball, glowL, glowR, serveDir, showBall, blink, t } */
  function draw(s, dt) {
    stepParticles(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(pxScale, 0, 0, pxScale, 0, 0);
    drawPlate(s.L, true, s.glowL);
    drawPlate(s.R, false, s.glowR);
    if (s.showBall) {
      drawBall(s.ball, s.blink);
      if (s.serveDir) drawServeArrow(s.serveDir, s.t);
    }
    drawParticles();
  }

  BB.Render = { init, resize, draw, pushTrail, clearTrail, spark, bolt };
})();
