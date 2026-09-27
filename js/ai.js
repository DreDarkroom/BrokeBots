/* BROKEBOTS — gameplay AI.
   Decides where a plate should go. Imperfect on purpose: it only "looks" at the
   ball every `reaction` seconds, predicts with an error that shrinks as the ball
   gets closer, is speed-limited, and occasionally commits to a bad read.
   Nothing cosmetic lives here; the personality layer only READS `intent`. */
(function () {
  'use strict';
  const BB = window.BB;
  const C = BB.CFG;

  function makeAI(paddle, diffKey) {
    return {
      p: paddle,
      prof: BB.DIFFICULTY[diffKey] || BB.DIFFICULTY.normal,
      thinkT: 0,
      targetCentre: C.H / 2,
      approaching: false,
      errBase: 0,
      blunderOff: 0,
      aimOff: 0,
      intent: C.H / 2,     // where the AI believes the ball will arrive (read by personality)
      blundering: false
    };
  }

  function think(ai, ball) {
    const p = ai.p, prof = ai.prof;
    const faceX = p.side === 'L' ? p.x + p.w + ball.r : p.x - ball.r;
    const pred = BB.Physics.predictY(ball, faceX);

    if (pred) {
      if (!ai.approaching) {
        // New incoming ball: roll this approach's personality-free imperfections
        ai.approaching = true;
        const speedFactor = Math.pow(Math.max(1, ball.speed / C.BALL_SPEED_START), 0.6);
        ai.errBase = BB.gauss() * prof.error * speedFactor;
        ai.blundering = BB.chance(prof.blunder);
        ai.blunderOff = ai.blundering ? (BB.chance(0.5) ? 1 : -1) * BB.rand(p.h * 0.75, p.h * 1.3) : 0;
        ai.aimOff = BB.rand(-1, 1) * prof.aimSpread * p.h * 0.5;
      }
      const certainty = 0.45 + 0.55 * BB.clamp(pred.t / 0.8, 0, 1);
      ai.intent = pred.y + ai.errBase * certainty + ai.blunderOff;
      ai.targetCentre = ai.intent - ai.aimOff;
    } else {
      ai.approaching = false;
      ai.blundering = false;
      // Ball going away (or not in play): drift back towards the middle, lazily
      const centre = p.y + p.h / 2;
      const home = C.H / 2 + BB.gauss() * 18;
      ai.targetCentre = BB.lerp(centre, home, prof.centreLaziness);
      ai.intent = ball.live ? ball.y : C.H / 2;
    }
  }

  function updateAI(ai, ball, dt) {
    ai.thinkT -= dt;
    if (ai.thinkT <= 0) {
      ai.thinkT = ai.prof.reaction * BB.rand(0.8, 1.25);
      think(ai, ball);
    }
    const p = ai.p;
    p.maxSpeed = ai.prof.speed;
    // Dead zone: don't chase tiny corrections
    const want = ai.targetCentre - p.h / 2;
    if (p.target === null || Math.abs(want - p.target) > 3) p.target = want;
  }

  BB.AI = { makeAI, updateAI };
})();
