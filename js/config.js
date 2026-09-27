/* BROKEBOTS — shared namespace and tuning constants.
   Everything in the game lives in one logical coordinate system (W x H).
   Canvas and the DOM/SVG bot layer both use it, so scaling never breaks alignment. */
(function () {
  'use strict';

  const BB = (window.BB = window.BB || {});

  BB.CFG = {
    W: 1200,
    H: 675,

    // Playfield walls (ball bounces off these)
    WALL_TOP: 8,
    WALL_BOTTOM: 667,

    // Paddles ("deflector plates" pushed by each bot)
    PADDLE_W: 16,
    PADDLE_H: 112,
    PADDLE_MARGIN: 14,        // travel limit from top/bottom edge of stage
    PADDLE_X_L: 160,          // left plate, left edge
    PADDLE_X_R: 1200 - 160 - 16,
    HUMAN_SPEED: 780,         // logical px / s
    HUMAN_ACCEL: 9000,        // px / s^2 (short ramp so keys feel mechanical, not floaty)
    TOUCH_SPEED: 1150,

    // Ball
    BALL_R: 9,
    BALL_SPEED_START: 520,
    BALL_SPEED_MAX: 1320,
    BALL_SPEEDUP: 1.045,      // per paddle hit
    MAX_BOUNCE_DEG: 52,
    SERVE_DELAY: 0.9,         // s ball sits in the chamber before launch
    POINT_DELAY: 1.15,        // s after a point before the next serve

    // Bot art box (DOM/SVG). The plate is drawn on canvas; art sits behind it.
    BOT_SCALE: 1.3,           // SVG viewBox is 112 x 140 art units
    BOT_ART_W: 112 * 1.3,
    BOT_ART_H: 140 * 1.3,

    DT_MAX: 0.05              // clamp long frames (tab switches etc.)
  };

  // AI difficulty profiles. The AI decides WHERE the plate goes; nothing here is cosmetic.
  BB.DIFFICULTY = {
    easy:   { label: 'EASY',   speed: 400, reaction: 0.30, error: 88, blunder: 0.22, aimSpread: 0.10, centreLaziness: 0.55 },
    normal: { label: 'NORMAL', speed: 570, reaction: 0.19, error: 52, blunder: 0.11, aimSpread: 0.25, centreLaziness: 0.8  },
    hard:   { label: 'HARD',   speed: 720, reaction: 0.11, error: 26, blunder: 0.05, aimSpread: 0.40, centreLaziness: 1.0  }
  };

  BB.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  BB.lerp = (a, b, t) => a + (b - a) * t;
  BB.rand = (a, b) => a + Math.random() * (b - a);
  BB.chance = (p) => Math.random() < p;
  BB.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  // Approximate normal distribution, mean 0, sd ~1
  BB.gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;

  BB.store = {
    get(k, d) { try { const v = localStorage.getItem('brokebots.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('brokebots.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
})();
