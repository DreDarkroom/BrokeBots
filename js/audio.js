/* BROKEBOTS — tiny procedural sound system (Web Audio).
   Two primitives (tone + filtered noise) build every sound. No samples, no assets.
   OSSIE (old) = analogue, low, chunky, slightly out of tune.
   LUMA-9 (new) = digital, bright, precise, glitchy.
   The AudioContext is only created after a user gesture (autoplay policy). */
(function () {
  'use strict';
  const BB = window.BB;

  let ctx = null, master = null, noiseBuf = null, hum = null;
  let muted = BB.store.get('muted', false);
  const MASTER = 0.55;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    } catch (e) { ctx = null; return false; }
  }

  const ready = () => ctx && master && ctx.state !== 'closed';

  // --- primitives ---------------------------------------------------------
  function tone(o) {
    if (!ready()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.1;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
    if (o.detune) osc.detune.value = o.detune;
    const a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.1, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(o) {
    if (!ready()) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.05;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(o.freq2, t0 + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.1, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
  }

  const wobble = () => BB.rand(-35, 35); // OSSIE is never quite in tune

  // --- sound library ------------------------------------------------------
  const S = {
    menuMove() { tone({ f: 620, dur: 0.035, type: 'square', gain: 0.035, lp: 2400 }); },
    menuSelect() {
      tone({ f: 440, f2: 880, dur: 0.07, type: 'triangle', gain: 0.09 });
      tone({ f: 1320, dur: 0.06, type: 'square', gain: 0.03, delay: 0.06, lp: 3000 });
    },
    powerOn() {
      noise({ dur: 0.08, filter: 'lowpass', freq: 600, gain: 0.3 });                 // relay clunk
      tone({ f: 45, f2: 180, dur: 0.7, type: 'sawtooth', gain: 0.07, lp: 500, attack: 0.08 });
      tone({ f: 392, dur: 0.12, type: 'triangle', gain: 0.08, delay: 0.55, detune: wobble() });
      tone({ f: 1568, dur: 0.05, type: 'square', gain: 0.03, delay: 0.75, lp: 4000 });
      tone({ f: 2093, dur: 0.05, type: 'square', gain: 0.03, delay: 0.82, lp: 4000 });
    },
    shutdown() { tone({ f: 300, f2: 40, dur: 0.5, type: 'sawtooth', gain: 0.06, lp: 700 }); },
    serve() { tone({ f: 988, dur: 0.06, type: 'sine', gain: 0.06 }); },
    pause() { tone({ f: 523, f2: 262, dur: 0.14, type: 'triangle', gain: 0.08 }); },
    resume() { tone({ f: 262, f2: 523, dur: 0.12, type: 'triangle', gain: 0.08 }); },

    wall(speed) {
      const k = BB.clamp(speed / 1000, 0.5, 1.3);
      tone({ f: 210 * k, f2: 170 * k, dur: 0.05, type: 'triangle', gain: 0.07 });
      noise({ dur: 0.025, freq: 1800, q: 2, gain: 0.04 });
    },

    // OSSIE: chunky mechanical clank with a springy tail
    hitL(speed) {
      const k = BB.clamp(speed / 900, 0.6, 1.4);
      tone({ f: 150 * k, f2: 70, dur: 0.1, type: 'square', gain: 0.14, lp: 900, detune: wobble() });
      noise({ dur: 0.06, filter: 'lowpass', freq: 1400, gain: 0.16 });
      tone({ f: 330, f2: 290, dur: 0.14, type: 'triangle', gain: 0.025, delay: 0.02, detune: wobble() });
    },
    // LUMA-9: crisp digital tick
    hitR(speed) {
      const k = BB.clamp(speed / 900, 0.7, 1.4);
      tone({ f: 1320 * k, f2: 1760 * k, dur: 0.035, type: 'square', gain: 0.045, lp: 6000 });
      tone({ f: 880 * k, dur: 0.07, type: 'sine', gain: 0.09 });
      noise({ dur: 0.02, filter: 'highpass', freq: 5000, gain: 0.03 });
    },

    // Conceding a point
    goalL() { // OSSIE takes a hit: grinding gears, sagging motor
      noise({ dur: 0.5, freq: 420, freq2: 120, q: 3, gain: 0.16 });
      tone({ f: 110, f2: 38, dur: 0.55, type: 'sawtooth', gain: 0.07, lp: 600, detune: wobble() });
      noise({ dur: 0.07, filter: 'lowpass', freq: 900, gain: 0.25, delay: 0.02 });
    },
    goalR() { // LUMA-9 faults: bit-crunch cascade then power sag
      for (let i = 0; i < 6; i++) tone({ f: BB.rand(300, 2400), dur: 0.028, type: 'square', gain: 0.035, delay: i * 0.035, lp: 7000 });
      tone({ f: 1100, f2: 180, dur: 0.32, type: 'sine', gain: 0.07, delay: 0.2 });
    },

    // Cosmetic malfunction chatter (quiet, infrequent)
    quirkL() {
      tone({ f: 160, f2: 240, dur: 0.12, type: 'sawtooth', gain: 0.025, lp: 800, detune: wobble() });
      tone({ f: 240, f2: 140, dur: 0.14, type: 'sawtooth', gain: 0.02, lp: 800, delay: 0.12 });
      for (let i = 0; i < 3; i++) noise({ dur: 0.02, filter: 'lowpass', freq: 1200, gain: 0.06, delay: 0.05 + i * 0.07 });
    },
    quirkR() {
      tone({ f: 1760, dur: 0.035, type: 'square', gain: 0.03, lp: 6000 });
      tone({ f: 1245, dur: 0.035, type: 'square', gain: 0.03, delay: 0.05, lp: 6000 });
      noise({ dur: 0.04, filter: 'highpass', freq: 3500, gain: 0.025, delay: 0.1 });
    },
    boltPop() { tone({ f: 1900, f2: 900, dur: 0.08, type: 'triangle', gain: 0.05 }); noise({ dur: 0.03, freq: 3000, gain: 0.05 }); },

    winL() { [262, 330, 392, 523].forEach((f, i) => tone({ f, dur: 0.22, type: 'triangle', gain: 0.08, delay: i * 0.14, detune: wobble() })); },
    winR() { [523, 659, 784, 1047, 1568].forEach((f, i) => tone({ f, dur: 0.09, type: 'square', gain: 0.035, delay: i * 0.07, lp: 5000 })); },
    lose() { tone({ f: 330, f2: 110, dur: 0.6, type: 'sawtooth', gain: 0.05, lp: 700, delay: 0.3 }); }
  };

  function play(name, arg) {
    if (!ready() || muted) return;
    try { S[name] && S[name](arg); } catch (e) { /* never let audio break the game */ }
  }

  // Low UK-mains-style electrical hum while the chamber is running
  function humOn(on) {
    if (!ready()) return;
    try {
      if (on && !hum) {
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        const f = ctx.createBiquadFilter(), g = ctx.createGain();
        o1.type = 'sawtooth'; o1.frequency.value = 50;
        o2.type = 'sine'; o2.frequency.value = 100;
        f.type = 'lowpass'; f.frequency.value = 180;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.8);
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
        o1.start(); o2.start();
        hum = { o1, o2, g };
      } else if (!on && hum) {
        const h = hum; hum = null;
        h.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
        h.o1.stop(ctx.currentTime + 0.6); h.o2.stop(ctx.currentTime + 0.6);
      }
    } catch (e) { /* ignore */ }
  }

  function setMuted(m) {
    muted = !!m;
    BB.store.set('muted', muted);
    if (ready()) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.03);
  }

  BB.Audio = {
    init, play, humOn, setMuted,
    toggleMute() { setMuted(!muted); return muted; },
    isMuted: () => muted,
    suspend() { if (ready() && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    wake() { if (ready() && ctx.state === 'suspended') ctx.resume().catch(() => {}); }
  };
})();
