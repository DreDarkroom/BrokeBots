/* BROKEBOTS — physics + collision.
   Pure gameplay maths. No rendering, no personality, no audio.
   Ball-vs-plate uses a swept test against the plate's face plane, so the ball
   can never tunnel through a plate regardless of speed or frame time. */
(function () {
  'use strict';
  const BB = window.BB;
  const C = BB.CFG;

  function makePaddle(side) {
    return {
      side,
      x: side === 'L' ? C.PADDLE_X_L : C.PADDLE_X_R,
      y: (C.H - C.PADDLE_H) / 2,
      w: C.PADDLE_W,
      h: C.PADDLE_H,
      vy: 0,
      dir: 0,            // -1..1 from keys
      target: null,      // absolute top-y target (touch / AI); null = use dir
      maxSpeed: C.HUMAN_SPEED
    };
  }

  function resetPaddle(p) {
    p.y = (C.H - C.PADDLE_H) / 2;
    p.vy = 0; p.dir = 0; p.target = null;
  }

  const minY = C.PADDLE_MARGIN;
  const maxY = C.H - C.PADDLE_MARGIN - C.PADDLE_H;

  function updatePaddle(p, dt) {
    let desired;
    if (p.target !== null) {
      const t = BB.clamp(p.target, minY, maxY);
      const diff = t - p.y;
      // Proportional approach capped at max speed; small diffs settle without jitter
      desired = BB.clamp(diff * 14, -p.maxSpeed, p.maxSpeed);
      if (Math.abs(diff) < 0.5) desired = 0;
      p.vy = desired;
    } else {
      desired = p.dir * p.maxSpeed;
      const dv = desired - p.vy;
      const step = C.HUMAN_ACCEL * dt;
      p.vy += BB.clamp(dv, -step, step);
    }
    p.y += p.vy * dt;
    if (p.y < minY) { p.y = minY; if (p.vy < 0) p.vy = 0; }
    if (p.y > maxY) { p.y = maxY; if (p.vy > 0) p.vy = 0; }
  }

  function makeBall() {
    return { x: C.W / 2, y: C.H / 2, vx: 0, vy: 0, speed: 0, r: C.BALL_R, live: false, hits: 0 };
  }

  function centreBall(b) {
    b.x = C.W / 2; b.y = C.H / 2; b.vx = 0; b.vy = 0; b.speed = 0; b.live = false; b.hits = 0;
  }

  // dirX: +1 serves to the right, -1 to the left
  function serveBall(b, dirX) {
    const ang = BB.rand(-24, 24) * Math.PI / 180;
    b.speed = C.BALL_SPEED_START;
    b.vx = Math.cos(ang) * b.speed * dirX;
    b.vy = Math.sin(ang) * b.speed;
    b.live = true;
    b.hits = 0;
  }

  function bounceOffPlate(b, p, yAt, dirX) {
    const centre = p.y + p.h / 2;
    const rel = BB.clamp((yAt - centre) / (p.h / 2 + b.r), -1, 1);
    const ang = rel * C.MAX_BOUNCE_DEG * Math.PI / 180;
    b.speed = Math.min(b.speed * C.BALL_SPEEDUP, C.BALL_SPEED_MAX);
    b.vx = Math.cos(ang) * b.speed * dirX;
    b.vy = Math.sin(ang) * b.speed;
    b.hits++;
    return rel;
  }

  /* Advance the ball by dt. Pushes events into `ev`:
       {type:'wall', x, y}
       {type:'hit', side, rel, speed, x, y}
       {type:'goal', side}   side = the side that CONCEDED */
  function stepBall(b, L, R, dt, ev) {
    if (!b.live) return;
    const dist = b.speed * dt;
    // Sub-steps keep wall reflections accurate; the plate test itself is swept and exact.
    const steps = BB.clamp(Math.ceil(dist / (b.r * 0.75)), 1, 40);
    const h = dt / steps;
    const top = C.WALL_TOP + b.r;
    const bot = C.WALL_BOTTOM - b.r;
    const faceL = L.x + L.w;   // left plate faces right
    const faceR = R.x;         // right plate faces left
    const grace = b.r * 0.55;  // slight corner forgiveness so edge hits feel fair

    for (let i = 0; i < steps; i++) {
      const px = b.x, py = b.y;
      b.x += b.vx * h;
      b.y += b.vy * h;

      if (b.y < top) { b.y = top + (top - b.y); b.vy = Math.abs(b.vy); ev.push({ type: 'wall', x: b.x, y: C.WALL_TOP }); }
      else if (b.y > bot) { b.y = bot - (b.y - bot); b.vy = -Math.abs(b.vy); ev.push({ type: 'wall', x: b.x, y: C.WALL_BOTTOM }); }

      // Swept test: did the ball's leading edge cross a plate face this sub-step?
      if (b.vx < 0 && px - b.r >= faceL - 0.01 && b.x - b.r < faceL) {
        const t = (px - b.r - faceL) / (px - b.x);
        const yAt = py + (b.y - py) * t;
        if (yAt >= L.y - grace && yAt <= L.y + L.h + grace) {
          b.x = faceL + b.r; b.y = BB.clamp(yAt, top, bot);
          const rel = bounceOffPlate(b, L, yAt, +1);
          ev.push({ type: 'hit', side: 'L', rel, speed: b.speed, x: faceL, y: b.y });
          continue;
        }
      } else if (b.vx > 0 && px + b.r <= faceR + 0.01 && b.x + b.r > faceR) {
        const t = (faceR - (px + b.r)) / (b.x - px);
        const yAt = py + (b.y - py) * t;
        if (yAt >= R.y - grace && yAt <= R.y + R.h + grace) {
          b.x = faceR - b.r; b.y = BB.clamp(yAt, top, bot);
          const rel = bounceOffPlate(b, R, yAt, -1);
          ev.push({ type: 'hit', side: 'R', rel, speed: b.speed, x: faceR, y: b.y });
          continue;
        }
      }

      // Goal: the ball's centre has passed behind a plate's back edge.
      if (b.x < L.x - 4) { b.live = false; ev.push({ type: 'goal', side: 'L', x: b.x, y: b.y }); return; }
      if (b.x > R.x + R.w + 4) { b.live = false; ev.push({ type: 'goal', side: 'R', x: b.x, y: b.y }); return; }
    }
  }

  /* Predict where the ball's centre will be when it reaches plane x = planeX,
     reflecting off the walls. Returns null if the ball is moving away. Used by the AI. */
  function predictY(b, planeX) {
    if (!b.live || b.vx === 0) return null;
    const dx = planeX - b.x;
    if ((dx > 0) !== (b.vx > 0)) return null;
    const t = dx / b.vx;
    let y = b.y + b.vy * t;
    const top = C.WALL_TOP + b.r, bot = C.WALL_BOTTOM - b.r, span = bot - top;
    // Fold y back into the corridor (mirror reflections)
    let m = (y - top) % (2 * span);
    if (m < 0) m += 2 * span;
    y = m <= span ? top + m : top + (2 * span - m);
    return { y, t };
  }

  BB.Physics = { makePaddle, resetPaddle, updatePaddle, makeBall, centreBall, serveBall, stepBall, predictY };
})();
