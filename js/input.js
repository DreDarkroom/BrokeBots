/* BROKEBOTS — input.
   Keyboard: held-key axes for the plates + one-shot actions for the UI.
   Touch/pen/mouse: relative drag steering (works in portrait, where the finger
   is usually below the arena). Two-player touch splits the screen in half. */
(function () {
  'use strict';
  const BB = window.BB;

  const held = new Set();
  const touchDelta = { L: 0, R: 0 };
  const pointers = new Map();     // pointerId -> { side, lastY }
  let actionHandler = () => {};
  let steerSideFor = () => 'L';   // set by game: which side a pointer at clientX controls (or null)
  let steeringEnabled = () => false;

  const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Enter', 'Escape', 'Tab']);

  function keyName(e) {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') return 'Space';
    if (k && k.length === 1) return k.toUpperCase();
    return k;
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = keyName(e);
    if (GAME_KEYS.has(e.key) && e.key !== 'Tab') e.preventDefault();   // no page scroll, no native button activation
    held.add(k);
    if (!e.repeat) actionHandler(k, e);
    else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') actionHandler(k, e, true);
  }, { passive: false });

  window.addEventListener('keyup', (e) => { held.delete(keyName(e)); });
  window.addEventListener('blur', () => held.clear());

  // -1 up, +1 down
  function axis(upKey, downKey) { return (held.has(downKey) ? 1 : 0) - (held.has(upKey) ? 1 : 0); }

  function isUI(target) { return target && target.closest && target.closest('button, .opt, a'); }

  function bindPointer(el, scaleFn) {
    el.addEventListener('pointerdown', (e) => {
      actionHandler('Pointer', e);
      if (isUI(e.target) || !steeringEnabled()) return;
      const side = steerSideFor(e.clientX);
      if (!side) return;
      e.preventDefault();
      pointers.set(e.pointerId, { side, lastY: e.clientY });
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }, { passive: false });

    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      const s = scaleFn() || 1;
      // Relative drag, slightly amplified on small screens so a thumb can cover the arena
      const gain = s < 0.6 ? 1.35 : 1.1;
      touchDelta[p.side] += ((e.clientY - p.lastY) / s) * gain;
      p.lastY = e.clientY;
    }, { passive: false });

    const end = (e) => { pointers.delete(e.pointerId); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);

    // Belt and braces for iOS: stop pull-to-refresh / rubber-banding / double-tap zoom
    el.addEventListener('touchmove', (e) => { if (!isUI(e.target)) e.preventDefault(); }, { passive: false });
    el.addEventListener('gesturestart', (e) => e.preventDefault());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // iOS Safari unlocks Web Audio on touchend/click rather than touchstart
  const unlock = () => { if (BB.Audio) BB.Audio.init(); };
  window.addEventListener('touchend', unlock, { passive: true });
  window.addEventListener('click', unlock);

  BB.Input = {
    bindPointer,
    held: (k) => held.has(k),
    axisL: () => axis('W', 'S'),
    axisR: () => axis('ArrowUp', 'ArrowDown'),
    axisAny: () => BB.clamp(axis('W', 'S') + axis('ArrowUp', 'ArrowDown'), -1, 1),
    takeTouch(side) { const d = touchDelta[side]; touchDelta[side] = 0; return d; },
    activePointers(side) { let n = 0; pointers.forEach((p) => { if (p.side === side) n++; }); return n; },
    clearPointers() { pointers.clear(); touchDelta.L = touchDelta.R = 0; },
    onAction(fn) { actionHandler = fn; },
    setSteering(sideFn, enabledFn) { steerSideFor = sideFn; steeringEnabled = enabledFn; },
    clear() { held.clear(); }
  };
})();
