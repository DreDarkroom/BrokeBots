/* BROKEBOTS — the bots.
   Original SVG machines living in the DOM, positioned in the shared logical
   coordinate system, animated with transforms.

   PERSONALITY IS COSMETIC ONLY. A BotView never receives the physics objects:
   the game hands it a read-only snapshot (`view`) each frame and discrete
   events (hit, goal, win...). Nothing here can move a plate or the ball. */
(function () {
  'use strict';
  const BB = window.BB;
  const C = BB.CFG;
  const f2 = (n) => Math.round(n * 100) / 100;

  /* ---------------------------------------------------------------------
     SVG ARTWORK
     Art box is 112 x 140. The deflector plate itself is drawn on the canvas
     (it is the gameplay truth); these machines push it along their rail.
     --------------------------------------------------------------------- */

  // OSSIE / DL-1951 — analogue, bronze, oscilloscope eye, faces right.
  const SVG_OLD = `
<svg viewBox="0 0 112 140" width="100%" height="100%" overflow="visible" aria-hidden="true">
  <defs>
    <linearGradient id="oBrass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b98c45"/><stop offset=".55" stop-color="#8a6230"/><stop offset="1" stop-color="#5a3c18"/>
    </linearGradient>
    <radialGradient id="oGlass" cx=".45" cy=".4" r=".7">
      <stop offset="0" stop-color="#3a2508"/><stop offset="1" stop-color="#0d0803"/>
    </radialGradient>
    <clipPath id="oClip"><circle cx="60" cy="62" r="15.5"/></clipPath>
  </defs>
  <g class="p-chassis">
    <!-- rail carriage -->
    <rect x="15" y="16" width="15" height="108" rx="3" fill="#3a2a18" stroke="#150d06" stroke-width="2"/>
    <line x1="22.5" y1="30" x2="22.5" y2="110" stroke="#1b120a" stroke-width="3" stroke-dasharray="2 5"/>
    <g class="p-wheelT">
      <circle cx="22.5" cy="20" r="8.5" fill="#241a10" stroke="#9c7536" stroke-width="2.2"/>
      <path d="M22.5 13v14M15.5 20h14M17.5 15l10 10M27.5 15l-10 10" stroke="#9c7536" stroke-width="1.3"/>
      <circle cx="22.5" cy="20" r="2" fill="#d6ad62"/>
    </g>
    <g class="p-wheelB">
      <circle cx="22.5" cy="120" r="8.5" fill="#241a10" stroke="#9c7536" stroke-width="2.2"/>
      <path d="M22.5 113v14M15.5 120h14M17.5 115l10 10M27.5 115l-10 10" stroke="#9c7536" stroke-width="1.3"/>
      <circle cx="22.5" cy="120" r="2" fill="#d6ad62"/>
    </g>
    <!-- push rods to the plate, with tired springs -->
    <rect x="84" y="37" width="28" height="6" fill="#7d7a70" stroke="#2a2620" stroke-width="1"/>
    <rect x="84" y="97" width="28" height="6" fill="#7d7a70" stroke="#2a2620" stroke-width="1"/>
    <path class="p-springA" d="M88 40 l2 -6 l3 12 l3 -12 l3 12 l3 -12 l3 12 l2 -6" fill="none" stroke="#c9a15a" stroke-width="1.4"/>
    <path class="p-springB" d="M88 100 l2 -6 l3 12 l3 -12 l3 12 l3 -12 l3 12 l2 -6" fill="none" stroke="#c9a15a" stroke-width="1.4"/>
    <rect x="106" y="33" width="6" height="14" fill="#4a3920" stroke="#150d06"/>
    <rect x="106" y="93" width="6" height="14" fill="#4a3920" stroke="#150d06"/>
    <!-- exhaust stack -->
    <path d="M37 36 v-13 h8 v13" fill="#4d3a1f" stroke="#150d06" stroke-width="1.5"/>
    <rect x="35.5" y="20" width="11" height="4" fill="#6b5028" stroke="#150d06"/>
    <!-- main housing -->
    <path d="M29 34 h53 l8 8 v58 l-8 8 h-53 z" fill="url(#oBrass)" stroke="#23170a" stroke-width="2.2"/>
    <ellipse cx="41" cy="88" rx="9" ry="5" fill="#4f6d5a" opacity=".45"/>
    <ellipse cx="80" cy="46" rx="5" ry="3" fill="#4f6d5a" opacity=".4"/>
    <path d="M29 80 h61 M36 34 v74" stroke="#3e2a12" stroke-width="1" opacity=".7"/>
    <!-- vents -->
    <path d="M32 44 h8 M32 49 h8 M32 54 h8 M32 59 h8 M32 64 h8 M32 69 h8" stroke="#2a1c0c" stroke-width="2"/>
    <!-- bolts (they come loose when OSSIE concedes) -->
    <g class="p-bolts" fill="#d8b36a" stroke="#3a270f" stroke-width="1">
      <circle class="p-bolt" cx="33" cy="38" r="2.3"/><circle class="p-bolt" cx="79" cy="38" r="2.3"/>
      <circle class="p-bolt" cx="86" cy="60" r="2.3"/><circle class="p-bolt" cx="86" cy="84" r="2.3"/>
      <circle class="p-bolt" cx="79" cy="104" r="2.3"/><circle class="p-bolt" cx="33" cy="104" r="2.3"/>
    </g>
    <!-- oscilloscope eye -->
    <g class="p-head">
      <circle cx="60" cy="62" r="21" fill="#23180b" stroke="#c49a4c" stroke-width="4"/>
      <circle cx="60" cy="62" r="21" fill="none" stroke="#6b4c1f" stroke-width="1" stroke-dasharray="1.5 4.2"/>
      <circle cx="60" cy="62" r="16" fill="url(#oGlass)"/>
      <g clip-path="url(#oClip)">
        <path d="M44 62h32M60 46v32" stroke="#5a3a10" stroke-width=".6"/>
        <path class="p-wave" d="M44 62 L76 62" fill="none" stroke="#e8b04a" stroke-width="1.5" opacity=".85"/>
        <circle class="p-eye" cx="60" cy="62" r="3.6" fill="#ffd98a"/>
        <circle class="p-eyeGlow" cx="60" cy="62" r="7" fill="#e8b04a" opacity=".18"/>
      </g>
      <circle class="p-flash" cx="60" cy="62" r="16" fill="#fff3d0" opacity="0"/>
      <path d="M49 54 a13 13 0 0 1 9 -6" stroke="#fff" stroke-width="1.6" fill="none" opacity=".25"/>
    </g>
    <!-- analogue gauge -->
    <g>
      <path d="M38 100 a10 10 0 0 1 20 0 z" fill="#e8dcc0" stroke="#23170a" stroke-width="1.5"/>
      <path d="M40 97 l2 1 M43 92.5 l1.5 1.5 M48 90.5 v2 M53 92.5 l-1.5 1.5 M56 97 l-2 1" stroke="#23170a" stroke-width=".9"/>
      <path d="M54 94 a7 7 0 0 1 2 4" stroke="#690000" stroke-width="2" fill="none"/>
      <line class="p-needle" x1="48" y1="100" x2="48" y2="92" stroke="#690000" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="48" cy="100" r="1.6" fill="#23170a"/>
    </g>
    <rect x="64" y="93" width="20" height="10" fill="#1a1109" stroke="#6b4c1f"/>
    <text x="74" y="100.6" font-size="6.2" text-anchor="middle" fill="#c49a4c" font-family="monospace" font-weight="700">DL-1</text>
    <!-- exposed wiring -->
    <path d="M84 50 C 97 50, 90 66, 99 70 S 104 88, 95 97" stroke="#8a1a12" stroke-width="2" fill="none"/>
    <path d="M84 56 C 93 60, 92 74, 101 78" stroke="#d8cfb8" stroke-width="1.3" fill="none" opacity=".8"/>
    <path d="M31 107 C 36 124, 58 119, 68 108" stroke="#8a1a12" stroke-width="1.6" fill="none"/>
    <!-- antenna -->
    <g class="p-ant">
      <path d="M71 34 C 71 24, 80 20, 77 8" stroke="#b8ae98" stroke-width="2" fill="none"/>
      <circle class="p-bulb" cx="77" cy="7" r="3.8" fill="#690000" stroke="#e8b04a" stroke-width="1.2"/>
    </g>
    <!-- smoke (shown when stressed) -->
    <g class="p-smoke">
      <circle cx="41" cy="16" r="4" fill="#8a8378"/><circle cx="44" cy="10" r="5" fill="#8a8378"/><circle cx="40" cy="3" r="6" fill="#8a8378"/>
    </g>
  </g>
</svg>`;

  // LUMA-9 / DL-2031 — clean plating, display face, mag-rail, faces left.
  const SVG_NEW = `
<svg viewBox="0 0 112 140" width="100%" height="100%" overflow="visible" aria-hidden="true">
  <defs>
    <linearGradient id="lPlate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ece7de"/><stop offset="1" stop-color="#b7b1a6"/>
    </linearGradient>
    <clipPath id="lClip"><rect x="28" y="37" width="44" height="34" rx="2"/></clipPath>
  </defs>
  <g class="p-chassis">
    <!-- mag-rail clamp -->
    <rect x="84" y="14" width="13" height="112" rx="2" fill="#17171a" stroke="#3b3b41" stroke-width="1.5"/>
    <rect class="p-pad" x="81" y="18" width="19" height="6" rx="1" fill="#690000"/>
    <rect class="p-pad" x="81" y="116" width="19" height="6" rx="1" fill="#690000"/>
    <path d="M90.5 30 v80" stroke="#2c2c31" stroke-width="2"/>
    <!-- actuators to the plate -->
    <path d="M23 45 L10 42 L0 42 L0 46 L10 46 Z" fill="#cbc5ba" stroke="#55514a" stroke-width="1"/>
    <path d="M23 95 L10 94 L0 94 L0 98 L10 98 Z" fill="#cbc5ba" stroke="#55514a" stroke-width="1"/>
    <circle cx="11" cy="44" r="3.4" fill="#18181b" stroke="#d9d4cb" stroke-width="1.2"/>
    <circle cx="11" cy="96" r="3.4" fill="#18181b" stroke="#d9d4cb" stroke-width="1.2"/>
    <circle class="p-joint" cx="11" cy="44" r="1.3" fill="#e03a3a"/>
    <circle class="p-joint" cx="11" cy="96" r="1.3" fill="#e03a3a"/>
    <!-- chassis -->
    <polygon points="31,24 79,24 88,33 88,107 79,116 31,116 22,107 22,33" fill="url(#lPlate)" stroke="#6d685f" stroke-width="1.5"/>
    <polygon points="78,24 79,24 88,33 88,107 79,116 78,116" fill="#232326"/>
    <path d="M22 80 h56 M50 24 v12" stroke="#98928a" stroke-width=".8"/>
    <rect x="24" y="104" width="54" height="3.5" fill="#690000"/>
    <text x="50" y="98" font-size="5.6" text-anchor="middle" fill="#5d5850" font-family="monospace" font-weight="700" letter-spacing=".6">LUMA-9</text>
    <path d="M28 86 h14 M28 89.5 h14 M28 93 h14" stroke="#8f897f" stroke-width="1.4"/>
    <!-- status LEDs -->
    <g class="p-leds">
      <rect class="p-led" x="80.5" y="42" width="5" height="4"/><rect class="p-led" x="80.5" y="52" width="5" height="4"/>
      <rect class="p-led" x="80.5" y="62" width="5" height="4"/><rect class="p-led" x="80.5" y="72" width="5" height="4"/>
      <rect class="p-led" x="80.5" y="82" width="5" height="4"/>
    </g>
    <!-- lidar bar -->
    <rect x="34" y="15" width="40" height="7" rx="1.5" fill="#1b1b1e" stroke="#4a4a50"/>
    <rect class="p-lidar" x="52" y="17" width="4" height="3" fill="#e03a3a"/>
    <!-- display face -->
    <rect x="27" y="36" width="46" height="36" rx="3" fill="#0c0a0a" stroke="#3a3530" stroke-width="1.5"/>
    <g class="p-face" clip-path="url(#lClip)">
      <rect class="p-screenBg" x="28" y="37" width="44" height="34" fill="#140d0c"/>
      <rect class="p-eyeL" x="36" y="46" width="8" height="10" fill="#f0e8d8"/>
      <rect class="p-eyeR" x="56" y="46" width="8" height="10" fill="#f0e8d8"/>
      <path class="p-mouth" d="M44 62 h12" stroke="#f0e8d8" stroke-width="1.6" fill="none"/>
      <text class="p-text" x="50" y="69.5" font-size="5" text-anchor="middle" fill="#e05a4a" font-family="monospace" letter-spacing=".3">BOOT</text>
      <rect class="p-scan" x="28" y="37" width="44" height="2" fill="#fff" opacity=".07"/>
      <g class="p-crack" stroke="#d8cfc0" stroke-width=".7" fill="none" opacity=".75">
        <path class="p-crack1" d="M69 38 L63 47 L66 51 L59 58"/>
        <path class="p-crack2" d="M63 47 L70 55 M59 58 L52 60"/>
        <path class="p-crack3" d="M30 70 L37 63 L35 58 L41 53"/>
      </g>
    </g>
  </g>
</svg>`;

  /* ---------------------------------------------------------------------
     BotView — shared plumbing
     --------------------------------------------------------------------- */
  function spring(x) { return { x: x || 0, v: 0 }; }
  function stepSpring(s, target, k, c, dt) { s.v += ((target - s.x) * k - s.v * c) * dt; s.x += s.v * dt; }

  function BotView(side, el, fx) {
    this.side = side;
    this.el = el;
    this.fx = fx;              // cosmetic particle hooks {spark, bolt}
    this.old = side === 'L';
    el.classList.add(this.old ? 'bot-old' : 'bot-new');
    el.innerHTML = '<div class="bot-anim">' + (this.old ? SVG_OLD : SVG_NEW) + '</div>';
    this.anim = el.firstChild;
    const q = (s) => el.querySelector(s);
    const qa = (s) => Array.prototype.slice.call(el.querySelectorAll(s));
    this.parts = {
      chassis: q('.p-chassis'),
      wheelT: q('.p-wheelT'), wheelB: q('.p-wheelB'),
      wave: q('.p-wave'), eye: q('.p-eye'), eyeGlow: q('.p-eyeGlow'), flash: q('.p-flash'),
      needle: q('.p-needle'), ant: q('.p-ant'), bulb: q('.p-bulb'), smoke: q('.p-smoke'),
      bolts: qa('.p-bolt'), springA: q('.p-springA'), springB: q('.p-springB'),
      face: q('.p-face'), eyeL: q('.p-eyeL'), eyeR: q('.p-eyeR'), mouth: q('.p-mouth'),
      text: q('.p-text'), scan: q('.p-scan'), screenBg: q('.p-screenBg'),
      leds: qa('.p-led'), lidar: q('.p-lidar'), pads: qa('.p-pad'), joints: qa('.p-joint'),
      cracks: [q('.p-crack1'), q('.p-crack2'), q('.p-crack3')]
    };
    this.lastPos = '';
    this.reset();
  }

  BotView.prototype.reset = function () {
    this.sy = spring(); this.sx = spring();
    this.shake = 0;
    this.t = BB.rand(0, 10);
    this.quirk = null;
    this.quirkT = BB.rand(3, 6);
    this.damage = 0;
    this.mood = 'idle';        // idle | happy | hurt | win | lose
    this.moodT = 0;
    this.look = { x: 0, y: 0 };
    this.lookWander = { x: 0, y: 0, t: 0 };
    this.needle = -60; this.needleKick = 0;
    this.waveT = 0;
    this.blinkT = BB.rand(1.5, 4);
    this.textT = 0; this.textMsg = '';
    this.prevVy = 0;
    this.overT = 0;
    this.anim.classList.remove('win', 'lose', 'hurt');
    const p = this.parts;
    if (this.old) {
      p.bolts.forEach((b) => (b.style.display = ''));
      p.smoke.setAttribute('class', 'p-smoke');
      p.eye.setAttribute('opacity', '1');
    } else {
      p.cracks.forEach((c) => (c.style.display = 'none'));
      p.leds.forEach((l) => l.classList.remove('dead'));
      this.say('READY', 1.5);
    }
  };

  // Place the art in logical coordinates relative to its plate (plate y comes from physics)
  BotView.prototype.place = function (plateY) {
    const x = this.old ? C.PADDLE_X_L - C.BOT_ART_W : C.PADDLE_X_R + C.PADDLE_W;
    const y = plateY + C.PADDLE_H / 2 - C.BOT_ART_H / 2;
    const s = 'translate(' + f2(x) + 'px,' + f2(y) + 'px)';
    if (s !== this.lastPos) { this.el.style.transform = s; this.lastPos = s; }
  };

  BotView.prototype.say = function (msg, hold) {
    if (this.old || !this.parts.text) return;
    if (this.textMsg !== msg) { this.parts.text.textContent = msg; this.textMsg = msg; }
    this.textT = hold || 1;
  };

  // Restart the CSS smoke animation (remove class, force reflow, re-add)
  BotView.prototype.restartPuff = function (loop) {
    const s = this.parts.smoke;
    s.setAttribute('class', 'p-smoke');
    void this.el.offsetWidth;
    s.setAttribute('class', 'p-smoke puff' + (loop ? ' loop' : ''));
  };

  BotView.prototype.startQuirk = function (name, dur) {
    this.quirk = { name, t: 0, dur };
  };

  /* Events from the game (all cosmetic reactions) */
  BotView.prototype.event = function (type, d) {
    const p = this.parts;
    switch (type) {
      case 'hit':
        this.sx.v += this.old ? -95 : 70;          // recoil away from the ball
        this.shake = Math.max(this.shake, this.old ? 1.4 : 0.6);
        this.needleKick = 1;
        if (this.old) p.flash.setAttribute('opacity', '.55');
        else { this.say(BB.pick(['RETURN OK', 'DEFLECT ✓', 'Δ ' + (d.rel || 0).toFixed(2), 'CONTACT']), 0.8); this.flashT = 0.12; }
        this.mood = 'idle';
        break;
      case 'wall':
        break;
      case 'incoming':
        // fast ball heading this way: anticipation
        if (!this.old && BB.chance(0.35)) this.say(BB.pick(['!!', 'THREAT', 'CALC...', 'V=' + Math.round(d.speed)]), 0.6);
        if (this.old && BB.chance(0.25)) this.needleKick = 0.6;
        break;
      case 'goalAgainst':
        this.damage++;
        this.mood = 'hurt'; this.moodT = 1.3;
        this.shake = 3.2;
        this.sx.v += this.old ? -160 : 140;
        this.anim.classList.remove('hurt'); void this.anim.offsetWidth; this.anim.classList.add('hurt');
        if (this.old) {
          const loose = p.bolts.filter((b) => b.style.display !== 'none');
          if (loose.length) {
            const b = BB.pick(loose); b.style.display = 'none';
            if (this.fx) this.fx.bolt(this.worldX(+b.getAttribute('cx')), this.worldY(+b.getAttribute('cy')), 1);
            BB.Audio.play('boltPop');
          }
          this.restartPuff();
        } else {
          const n = Math.min(this.damage, 3);
          for (let i = 0; i < n; i++) p.cracks[i].style.display = '';
          const live = p.leds.filter((l) => !l.classList.contains('dead'));
          if (live.length > 1) BB.pick(live).classList.add('dead');
          this.startQuirk('glitch', 0.9);
          this.say(BB.pick(['FAULT 0x3F', 'ERR: MISSED', 'NaN', 'SEGFAULT', '404: BALL']), 1.4);
        }
        break;
      case 'goalFor':
        this.mood = 'happy'; this.moodT = 1.2;
        if (!this.old) this.say(BB.pick(['+1 PT', 'AS PREDICTED', 'SCORE++', 'EXCELLENT']), 1.2);
        else this.needleKick = 1;
        break;
      case 'serve':
        if (!this.old) this.say('TRACKING', 1);
        break;
      case 'win':
        this.mood = 'win'; this.moodT = 999;
        this.anim.classList.add('win');
        if (!this.old) this.say('WINNER.EXE', 999);
        break;
      case 'lose':
        this.mood = 'lose'; this.moodT = 999;
        this.anim.classList.add('lose');
        if (this.old) this.restartPuff(true);
        else this.say('SHUTDOWN', 999);
        break;
    }
  };

  // Art-space -> logical world coordinates (for particles)
  BotView.prototype.worldX = function (ax) { return (this.old ? C.PADDLE_X_L - C.BOT_ART_W : C.PADDLE_X_R + C.PADDLE_W) + ax * C.BOT_SCALE; };
  BotView.prototype.worldY = function (ay) { return this.plateY + C.PADDLE_H / 2 - C.BOT_ART_H / 2 + ay * C.BOT_SCALE; };

  /* view = {py, pvy, bx, by, bspeed, blive, towards, intent, phase, dt} (read-only snapshot) */
  BotView.prototype.update = function (view, dt) {
    this.t += dt;
    this.plateY = view.py;
    this.place(view.py);
    if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0 && this.mood !== 'win' && this.mood !== 'lose') this.mood = 'idle'; }

    // Quirk scheduler — more broken the more it has conceded
    if (this.quirk) {
      this.quirk.t += dt;
      if (this.quirk.t >= this.quirk.dur) this.quirk = null;
    } else if (this.mood !== 'lose') {
      this.quirkT -= dt;
      if (this.quirkT <= 0) {
        const brokenness = 1 + this.damage * 0.25;
        this.quirkT = BB.rand(4, 9) / brokenness;
        this.pickQuirk(view);
      }
    }
    this.shake = Math.max(0, this.shake - dt * (this.old ? 3.2 : 5));
    if (this.old) this.updateOld(view, dt); else this.updateNew(view, dt);
  };

  BotView.prototype.pickQuirk = function (view) {
    if (this.old) {
      const q = view.towards ? 'stutter' : BB.pick(['stutter', 'doze', 'steam', 'spin']);
      if (q === 'stutter') { this.startQuirk('stutter', 0.5); BB.Audio.play('quirkL'); }
      else if (q === 'doze') this.startQuirk('doze', 1.4);
      else if (q === 'steam') { this.startQuirk('steam', 1.2); this.restartPuff(); }
      else this.startQuirk('spin', 0.9);
    } else {
      const q = BB.pick(['glitch', 'glitch', 'recal', 'blinkstorm']);
      if (q === 'glitch') { this.startQuirk('glitch', 0.4); BB.Audio.play('quirkR'); this.say(BB.pick(['ERR 0x1F', 'E_WOBBLE', '¿¿¿', 'STACK !!', 'UNDEFINED']), 0.6); }
      else if (q === 'recal') { this.startQuirk('recal', 1.0); this.say('RECALIBRATING', 1.0); }
      else this.startQuirk('blinkstorm', 0.6);
    }
  };

  /* --------------------------- OSSIE (old) ----------------------------- */
  BotView.prototype.updateOld = function (v, dt) {
    const p = this.parts, q = this.quirk;
    // Loose, under-damped suspension: the body lags and wobbles behind the plate
    stepSpring(this.sy, BB.clamp(-v.pvy * 0.014, -11, 11), 85, 6, dt);
    stepSpring(this.sx, 0, 150, 8.5, dt);

    let sh = this.shake;
    if (q && q.name === 'stutter') sh = Math.max(sh, 2.2);
    const hum = Math.sin(this.t * 61) * 0.25;
    const jx = (Math.random() - 0.5) * 2 * sh, jy = (Math.random() - 0.5) * 2 * sh;
    let rot = BB.clamp(this.sy.v * 0.035, -7, 7) + (Math.random() - 0.5) * sh;
    if (this.mood === 'hurt') rot += Math.sin(this.t * 30) * 2.5 * this.moodT;
    p.chassis.setAttribute('transform', 'translate(' + f2(this.sx.x + jx) + ' ' + f2(this.sy.x + jy + hum) + ') rotate(' + f2(rot) + ' 56 70)');

    // Wheels roll with the plate's travel
    const wa = f2(v.py * 2.4);
    p.wheelT.setAttribute('transform', 'rotate(' + wa + ' 22.5 20)');
    p.wheelB.setAttribute('transform', 'rotate(' + wa + ' 22.5 120)');

    // Springs compress on recoil
    const comp = BB.clamp(1 + this.sx.x * 0.03, 0.75, 1.2);
    const sp = 'translate(' + f2(88 * (1 - comp)) + ' 0) scale(' + f2(comp) + ' 1)';
    p.springA.setAttribute('transform', sp); p.springB.setAttribute('transform', sp);

    // Eye: slow analogue tracking of the ball, with hesitation
    let tx, ty;
    const headWX = this.worldX(60), headWY = this.worldY(62);
    if (this.mood === 'lose') { tx = 0; ty = 6; }
    else if (q && q.name === 'spin') { const a = q.t * 14; tx = Math.cos(a) * 9; ty = Math.sin(a) * 9; }
    else if (v.blive) {
      const dx = v.bx - headWX, dy = v.by - headWY, m = Math.hypot(dx, dy) || 1;
      tx = (dx / m) * 9; ty = (dy / m) * 9;
    } else { this.wander(dt, 8); tx = this.lookWander.x; ty = this.lookWander.y; }
    const hesitate = q && q.name === 'doze';
    if (!hesitate) {
      const k = Math.min(1, dt * 5);
      this.look.x += (tx - this.look.x) * k; this.look.y += (ty - this.look.y) * k;
    }
    const ex = f2(60 + this.look.x), ey = f2(62 + this.look.y);
    p.eye.setAttribute('cx', ex); p.eye.setAttribute('cy', ey);
    p.eyeGlow.setAttribute('cx', ex); p.eyeGlow.setAttribute('cy', ey);
    p.eye.setAttribute('opacity', this.mood === 'lose' ? '.2' : hesitate ? '.35' : '1');

    // Flash decay (after hit)
    const fo = +p.flash.getAttribute('opacity');
    if (fo > 0.01) p.flash.setAttribute('opacity', f2(fo * Math.pow(0.001, dt * 1.6)));
    else if (fo) p.flash.setAttribute('opacity', '0');

    // Oscilloscope trace (~15 Hz redraw)
    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.waveT = 1 / 15;
      let d = 'M44 62';
      const excite = v.blive ? BB.clamp(v.bspeed / C.BALL_SPEED_MAX, 0.15, 1) : 0.2;
      for (let x = 45; x <= 76; x += 1.5) {
        let y;
        if (hesitate || this.mood === 'lose') y = 62 + (Math.random() - 0.5) * 0.8;
        else if (this.mood === 'hurt') y = 62 + (Math.random() - 0.5) * 18;
        else if (this.mood === 'happy' || this.mood === 'win') y = 62 + Math.sin(x * 0.35 + this.t * 10) * 9;
        else y = 62 + Math.sin(x * (0.3 + excite * 0.5) + this.t * 8) * (2 + excite * 6) + (Math.random() - 0.5) * 1.2;
        d += ' L' + x + ' ' + f2(y);
      }
      p.wave.setAttribute('d', d);
    }

    // Gauge needle: reads ball speed, overshoots, never quite settles
    let target = -60 + 120 * (v.blive ? BB.clamp((v.bspeed - C.BALL_SPEED_START * 0.8) / (C.BALL_SPEED_MAX - C.BALL_SPEED_START * 0.8), 0, 1) : 0.05);
    if (this.needleKick > 0) { target = 68; this.needleKick -= dt * 3; }
    if (q && q.name === 'stutter') target += (Math.random() - 0.5) * 60;
    if (this.mood === 'lose') target = -75;
    this.needle += (target - this.needle) * Math.min(1, dt * 7) + (Math.random() - 0.5) * 2.5;
    p.needle.setAttribute('transform', 'rotate(' + f2(this.needle) + ' 48 100)');

    // Antenna sways with suspension
    const aa = BB.clamp(-this.sy.v * 0.25 + Math.sin(this.t * 2.1) * 3 + (this.mood === 'win' ? Math.sin(this.t * 14) * 16 : 0), -30, 30);
    p.ant.setAttribute('transform', 'rotate(' + f2(aa) + ' 71 34)');
    const blinkRate = this.mood === 'hurt' || (q && q.name === 'stutter') ? 12 : this.mood === 'win' ? 8 : 1.4;
    p.bulb.setAttribute('fill', Math.sin(this.t * blinkRate * Math.PI) > 0 && this.mood !== 'lose' ? '#ff6a3d' : '#690000');

  };

  /* --------------------------- LUMA-9 (new) ---------------------------- */
  BotView.prototype.updateNew = function (v, dt) {
    const p = this.parts, q = this.quirk;
    // Stiff, precise suspension, quantised to whole units (it thinks in pixels)
    stepSpring(this.sy, BB.clamp(-v.pvy * 0.006, -5, 5), 380, 26, dt);
    stepSpring(this.sx, 0, 420, 20, dt);

    // Over-correction: after stopping hard, it performs several unnecessary micro-adjustments
    if (Math.abs(this.prevVy) > 350 && Math.abs(v.pvy) < 40) this.overT = 0.36;
    this.prevVy = v.pvy;
    let ox = this.sx.x, oy = this.sy.x;
    if (this.overT > 0) { this.overT -= dt; oy += ((this.overT * 25) | 0) % 2 ? 2 : -2; }
    let sh = this.shake;
    if (q && q.name === 'glitch') sh = Math.max(sh, 2.5);
    if (sh > 0.2 && BB.chance(0.5)) { ox += Math.round((Math.random() - 0.5) * 2 * sh); oy += Math.round((Math.random() - 0.5) * sh); }
    p.chassis.setAttribute('transform', 'translate(' + Math.round(ox) + ' ' + Math.round(oy) + ')');

    // Screen glitch slicing
    const glitching = (q && q.name === 'glitch') || this.mood === 'hurt';
    p.face.setAttribute('transform', glitching && BB.chance(0.6) ? 'translate(' + ((Math.random() * 6 - 3) | 0) + ' 0)' : '');

    // Eyes: look at where it THINKS the ball will arrive (AI intent) when available
    let tx, ty;
    const faceWX = this.worldX(50), faceWY = this.worldY(54);
    if (this.mood === 'lose') { tx = 0; ty = 0; }
    else if (q && q.name === 'recal') { tx = Math.round(Math.sin(q.t * 18) * 5); ty = Math.round(Math.cos(q.t * 9) * 3); }
    else if (v.blive) {
      const aimY = v.intent != null ? v.intent : v.by;
      tx = BB.clamp((v.bx - faceWX) / 90, -5, 5); ty = BB.clamp((aimY - faceWY) / 55, -4, 4);
    } else { this.wander(dt, 5); tx = this.lookWander.x; ty = this.lookWander.y * 0.7; }
    this.look.x += (tx - this.look.x) * Math.min(1, dt * 22);
    this.look.y += (ty - this.look.y) * Math.min(1, dt * 22);
    const lx = Math.round(this.look.x), ly = Math.round(this.look.y);

    // Blink
    this.blinkT -= dt;
    let eh = 10, ew = 8;
    if (this.blinkT < 0.1) eh = 2;
    if (this.blinkT <= 0) this.blinkT = q && q.name === 'blinkstorm' ? 0.12 : BB.rand(2, 5);
    if (q && q.name === 'blinkstorm' && ((q.t * 16) | 0) % 2) eh = 2;
    if (v.towards && v.bspeed > 900 && this.mood === 'idle') { eh = 12; ew = 7; }
    let eyL = eh, eyR = eh;
    if (this.mood === 'happy' || this.mood === 'win') { eyL = eyR = 4; }
    if (this.mood === 'lose') { eyL = eyR = 1.5; }
    if (glitching && BB.chance(0.4)) { eyL = 3; eyR = 12; }
    this.setEye(p.eyeL, 40 + lx, 51 + ly, ew, eyL);
    this.setEye(p.eyeR, 60 + lx, 51 + ly, ew, eyR);

    // Mouth
    let mouth = 'M44 62 h12';
    if (this.mood === 'happy' || this.mood === 'win') mouth = 'M43 60 q7 6 14 0';
    else if (this.mood === 'hurt' || glitching) mouth = 'M43 62 l3 -2 l3 2 l3 -2 l3 2 l2 -1';
    else if (this.mood === 'lose') mouth = 'M44 63 q6 -4 12 0';
    if (mouth !== this.lastMouth) { p.mouth.setAttribute('d', mouth); this.lastMouth = mouth; }

    // Status text
    if (this.textT > 0) { this.textT -= dt; if (this.textT <= 0 && this.mood !== 'win' && this.mood !== 'lose') this.say(v.blive ? 'TRACKING' : 'IDLE', 0.01); }
    if (glitching && BB.chance(0.25)) p.text.textContent = BB.pick(['#@!%', 'ERR', '0x00', '▓▒░', 'NULL']); else if (p.text.textContent !== this.textMsg) p.text.textContent = this.textMsg;

    // Scanline, lidar, screen flash
    p.scan.setAttribute('y', 37 + ((this.t * 40) % 34) | 0);
    p.lidar.setAttribute('x', f2(36 + (Math.sin(this.t * (v.blive ? 5 : 2)) + 1) * 17));
    if (this.flashT > 0) { this.flashT -= dt; p.screenBg.setAttribute('fill', this.flashT > 0 ? '#3a1210' : '#140d0c'); }

    // LED chase (dead LEDs stay dark)
    const n = p.leds.length;
    const head = ((this.t * (glitching ? 30 : 6)) | 0) % n;
    for (let i = 0; i < n; i++) {
      const l = p.leds[i];
      const on = !l.classList.contains('dead') && (glitching ? BB.chance(0.5) : this.mood === 'lose' ? false : i === head || this.mood === 'win');
      if (l._on !== on) { l._on = on; l.setAttribute('class', 'p-led' + (on ? ' on' : '') + (l.classList.contains('dead') ? ' dead' : '')); }
    }
  };

  BotView.prototype.setEye = function (el, cx, cy, w, h) {
    const key = cx + ',' + cy + ',' + w + ',' + h;
    if (el._k === key) return;
    el._k = key;
    el.setAttribute('x', cx - w / 2); el.setAttribute('y', cy - h / 2);
    el.setAttribute('width', w); el.setAttribute('height', h);
  };

  // Idle gaze wandering (menus / between points)
  BotView.prototype.wander = function (dt, r) {
    const w = this.lookWander;
    w.t -= dt;
    if (w.t <= 0) { w.t = BB.rand(0.5, 1.8); w.tx = BB.rand(-r, r); w.ty = BB.rand(-r, r); }
    w.x += ((w.tx || 0) - w.x) * Math.min(1, dt * 6);
    w.y += ((w.ty || 0) - w.y) * Math.min(1, dt * 6);
  };

  // Short diagnostic readout for the footer HUD (cosmetic flavour)
  BotView.prototype.diag = function () {
    if (this.old) {
      const bolts = this.parts.bolts.filter((b) => b.style.display !== 'none').length;
      const temp = Math.round(61 + this.damage * 4 + Math.abs(this.sy.v) * 0.05 + Math.sin(this.t) * 1.5);
      const st = this.mood === 'lose' ? 'SEIZED' : this.quirk ? this.quirk.name.toUpperCase() : this.mood === 'hurt' ? 'DENTED' : 'OK-ISH';
      return 'OSSIE · SERVO ' + temp + '°C · BOLTS ' + bolts + '/6 · ' + st;
    }
    const cpu = Math.round(BB.clamp(18 + Math.abs(this.look.x) * 6 + this.damage * 7 + (this.quirk ? 40 : 0) + Math.random() * 6, 0, 99));
    const st = this.mood === 'lose' ? 'OFFLINE' : this.quirk ? this.quirk.name.toUpperCase() : this.mood === 'hurt' ? 'FAULT' : 'OK';
    return 'LUMA-9 · CPU ' + cpu + '% · ERR ' + this.damage + ' · ' + st;
  };

  BotView.prototype.stressed = function () { return this.mood === 'hurt' || !!this.quirk || this.mood === 'lose'; };

  BB.BotView = BotView;
})();
