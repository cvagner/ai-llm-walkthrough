// Entrées : clavier (touches repérées par position physique, donc ZQSD en AZERTY et WASD en QWERTY), souris et manette.
const keys = new Set(); const UI = { cam: 0, paused: false, slow: false, pad: false, replay: null, replays: true, qT: 0, qN: 0, lastPad: new Array(17).fill(false) };
let _mAim = false;
function inputEdge(code) {
  const i = S.inp; if (UI.replay) { if (code === 'Space' || code === 'Escape' || code === 'KeyK') replayEnd(); return; }
  if (code === 'Space' || code === 'KeyK') { i.pass = true; i.block = true; }
  else if (code === 'KeyH') i.feint = true;
  else if (code === 'KeyG') i.kf = true;
  else if (code === 'KeyF') i.sw = true;
  else if (code === 'KeyE') i.combo = 0; else if (code === 'KeyY') i.combo = 1; else if (code === 'KeyR') i.combo = 2;
  else if (code === 'KeyC') UI.cam = (UI.cam + 1) % 3;
  else if (code === 'KeyV') { S.defSys[0] = (S.defSys[0] + 1) % 3; say('Défense ' + DEF_NAMES[S.defSys[0]], 1.4); }
  else if (code === 'KeyT') UI.slow = !UI.slow;
  else if (code === 'KeyB') i.tmo = true;
  else if (code === 'Escape' || code === 'KeyP') togglePause();
  else if (code === 'Digit0' || code === 'Backquote') i.shotSel = 0;
  else if (code.startsWith('Digit')) { const n = +code.slice(5); if (n >= 1 && n <= 9) i.shotSel = n; }
}
addEventListener('keydown', e => { if (e.repeat) return; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); keys.add(e.code); inputEdge(e.code); });
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('mousedown', e => { if (e.button === 0) { keys.add('Mouse0'); _mAim = true; } else if (e.button === 2) inputEdge('Space'); });
addEventListener('mouseup', e => { if (e.button === 0) { keys.delete('Mouse0'); _mAim = false; } });
addEventListener('mousemove', e => { if (_mAim && S.charging) { S.inp.aimH = clamp(S.inp.aimH + e.movementX * 0.006, -1, 1); S.inp.aimV = sat(S.inp.aimV - e.movementY * 0.006); } });
canvas.addEventListener('contextmenu', e => e.preventDefault());
function pollInput(dt) {
  const i = S.inp; let ix = 0, iy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  let shoot = keys.has('KeyJ') || keys.has('Mouse0'), drib = keys.has('ShiftLeft') || keys.has('ShiftRight'), ax = 0, ay = 0;
  const pads = navigator.getGamepads ? navigator.getGamepads() : null, gp = pads && (pads[0] || pads[1]);
  if (gp && gp.connected) {
    const dz = v => abs(v) < 0.18 ? 0 : v, b = k => !!(gp.buttons[k] && gp.buttons[k].pressed), L = UI.lastPad;
    const gx = dz(gp.axes[0] || 0), gy = dz(gp.axes[1] || 0); if (gx || gy) { ix = gx; iy = -gy; UI.pad = true; }
    ax = dz(gp.axes[2] || 0); ay = -dz(gp.axes[3] || 0);
    if (b(2)) shoot = true; if (b(7) || b(6)) drib = true;
    const edge = (k, code) => { const v = b(k); if (v && !L[k]) inputEdge(code); L[k] = v; };
    edge(0, 'Space'); edge(1, 'KeyH'); edge(3, 'KeyF'); edge(12, 'KeyE'); edge(15, 'KeyY'); edge(14, 'KeyR'); edge(8, 'KeyC'); edge(9, 'Escape'); edge(13, 'KeyV');
    const lb = b(4), rb = b(5); if (lb && !L[4]) i.shotSel = (i.shotSel + 9) % 10; if (rb && !L[5]) i.shotSel = (i.shotSel + 1) % 10; L[4] = lb; L[5] = rb;
  }
  if (S.charging) { // pendant l'armé, les directions visent : haut/bas = hauteur, droite = second poteau, gauche = premier poteau
    i.aimH = clamp(i.aimH + (ix + ax) * dt * 1.8, -1, 1); i.aimV = sat(i.aimV + (iy + ay) * dt * 1.5); i.mx = 0; i.mz = 0;
  } else {
    const c = R.cam; let fx = c.tx - c.x, fz = c.tz - c.z; const l = hyp(fx, fz) || 1; fx /= l; fz /= l;
    i.mx = -fz * ix + fx * iy; i.mz = fx * ix + fz * iy; if (!shoot) { i.aimH = 0; i.aimV = 0.5; }
  }
  i.shoot = shoot; i.drib = drib; i.tackle = shoot;
}
