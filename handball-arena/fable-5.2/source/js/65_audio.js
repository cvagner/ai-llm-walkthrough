// Son : tout est synthétisé avec Web Audio, aucun fichier. Le son vit hors de la simulation :
// il lit l'état et la file AQ remplie par evt(), n'écrit rien dans le jeu et n'utilise pas rnd (le match reste déterministe).
const AQ = [];
const SND = { q: AQ, ctx: null, on: true, out: null, noise: null, murmur: null, roar: null, exc: 0, t: 0, pv: new Float32Array(32), pa: new Uint8Array(16), pe: new Float32Array(16), by: 0, bdy: 0, n: {} };
/* voyelles (deux formants) des annonces du demi-centre, quand le navigateur n'a pas de voix française */
const SND_VOY = { a: [780, 1250], o: [460, 850], e: [420, 1950], i: [300, 2250], ou: [330, 800] };
const SND_MOTS = { espagnole: ['Espagnole !', ['e', 'a', 'o']], yago: ['Yago !', ['i', 'a', 'o']], 'croise-ar-al': ['Croisé !', ['ou', 'a', 'e']] };
function sndInit() {
  if (SND.ctx) { if (SND.ctx.state === 'suspended') SND.ctx.resume(); return; }
  if (TEST && !/[?&]son\b/.test(location.search)) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const c = SND.ctx = new AC(), out = SND.out = c.createGain(), comp = c.createDynamicsCompressor();
  out.gain.value = SND.on ? 0.9 : 0; comp.threshold.value = -5; comp.knee.value = 5; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12; /* simple garde-fou : le réglage par défaut écrasait les sons forts (poteau) au niveau du public */
  out.connect(comp); comp.connect(c.destination); SND.comp = comp;
  /* bruit rose en boucle de 4 s, raccord fondu pour ne pas claquer */
  const n = c.sampleRate * 4 | 0, L = 4096, buf = c.createBuffer(2, n, c.sampleRate), tmp = new Float32Array(n + L);
  for (let ch = 0; ch < 2; ch++) {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n + L; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + 0.03 * w; b1 = 0.985 * b1 + 0.05 * w; b2 = 0.95 * b2 + 0.08 * w; tmp[i] = (b0 + b1 + b2) * 0.5; }
    const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = i < L ? tmp[i] * (i / L) + tmp[n + i] * (1 - i / L) : tmp[i];
  }
  SND.noise = buf;
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  /* public : un murmure grave permanent et une clameur plus claire qui monte avec l'action */
  const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 0.5;
  const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1500; f2.Q.value = 0.7;
  SND.murmur = c.createGain(); SND.roar = c.createGain(); SND.murmur.gain.value = 0; SND.roar.gain.value = 0;
  src.connect(f1); f1.connect(SND.murmur); SND.murmur.connect(out); src.connect(f2); f2.connect(SND.roar); SND.roar.connect(out); src.start();
}
function sndPan(node, pan) { const c = SND.ctx; if (!c.createStereoPanner) { node.connect(SND.out); return; } const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); p.connect(SND.out); }
/* éclat de bruit filtré : claquement de mains, ballon dans les mains, filet */
function sndBurst(t, dur, type, freq, q, g, pan) {
  const c = SND.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain(); s.buffer = SND.noise;
  f.type = type; f.frequency.value = freq; f.Q.value = q; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.004); a.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(a); sndPan(a, pan); s.start(t, Math.random() * 3.5, dur + 0.05);
}
/* sifflet à bille : deux sons voisins qui battent, modulés par la bille */
function sndWhistle(t, dur, g) {
  const c = SND.ctx, a = c.createGain(), lfo = c.createOscillator(), ld = c.createGain(); lfo.frequency.value = 34 + Math.random() * 8; ld.gain.value = g * 0.4; lfo.connect(ld); ld.connect(a.gain);
  a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.012); a.gain.setValueAtTime(g, t + dur - 0.03); a.gain.linearRampToValueAtTime(0, t + dur);
  for (const fr of [3050, 3180]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(fr * 0.97, t); o.frequency.linearRampToValueAtTime(fr, t + 0.03); o.connect(a); o.start(t); o.stop(t + dur + 0.02); }
  a.connect(SND.out); lfo.start(t); lfo.stop(t + dur + 0.02);
}
function sndHorn(t) {
  const c = SND.ctx, a = c.createGain(), f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
  a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.16, t + 0.03); a.gain.setValueAtTime(0.16, t + 1.1); a.gain.linearRampToValueAtTime(0, t + 1.25);
  for (const fr of [233, 311, 466]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t); o.stop(t + 1.3); }
  f.connect(a); a.connect(SND.out);
}
/* semelle qui crisse : un ou deux coups brefs, aigus et montants */
function sndSqueak(t, pan) {
  const c = SND.ctx, k = Math.random() < 0.4 ? 2 : 1, f0 = 2100 + Math.random() * 900;
  for (let i = 0; i < k; i++) {
    const s = t + i * 0.085, d = 0.05 + Math.random() * 0.05, o = c.createOscillator(), a = c.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(f0 * (0.82 + 0.1 * i), s); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + 0.1 * i), s + d);
    a.gain.setValueAtTime(0, s); a.gain.linearRampToValueAtTime(0.045, s + 0.008); a.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(a); sndPan(a, pan); o.start(s); o.stop(s + d + 0.02);
  }
}
/* rebond du ballon : coup sourd */
function sndThud(t, g, pan) {
  const c = SND.ctx, o = c.createOscillator(), a = c.createGain(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(a); sndPan(a, pan); o.start(t); o.stop(t + 0.14);
  sndBurst(t, 0.03, 'lowpass', 900, 0.5, g * 0.5, pan);
}
function sndPost(t, pan) {
  /* montant creux en aluminium : choc sec, puis partiels inharmoniques qui sonnent près d'une seconde */
  const c = SND.ctx; sndBurst(t, 0.03, 'highpass', 1800, 0.7, 0.6, pan); sndThud(t, 0.5, pan); /* force 10 : le son le plus fort du jeu */
  for (const [fr, g, d] of [[392, 0.6, 1.0], [1043, 0.42, 0.8], [1921, 0.26, 0.55], [3010, 0.14, 0.3]]) { const o = c.createOscillator(), a = c.createGain(); o.frequency.value = fr * (0.98 + Math.random() * 0.04); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.003); a.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(a); sndPan(a, pan); o.start(t); o.stop(t + d + 0.05); }
}
/* annonce du demi-centre : la voix française du navigateur s'il en a une, sinon un cri en voyelles synthétisées */
function sndCall(k, team, pan) {
  const m = SND_MOTS[k]; if (!m) return; const vol = team === 0 ? 1 : 0.55, sp = window.speechSynthesis;
  const v = sp && sp.getVoices().find(x => /^fr/i.test(x.lang));
  if (v) { const u = new SpeechSynthesisUtterance(m[0]); u.voice = v; u.lang = v.lang; u.rate = 1.3; u.pitch = 0.85; u.volume = vol; sp.cancel(); if (SND.on) sp.speak(u); return; }
  const c = SND.ctx, f0 = 150 + Math.random() * 25; let t = c.currentTime + 0.02;
  m[1].forEach((vo, i) => {
    const d = i === m[1].length - 1 ? 0.24 : 0.13, o = c.createOscillator(), a = c.createGain(), F = SND_VOY[vo]; o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * (1 + 0.12 * i), t); o.frequency.linearRampToValueAtTime(f0 * (i === m[1].length - 1 ? 0.95 : 1.2 + 0.12 * i), t + d);
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.5 * vol, t + 0.025); a.gain.setValueAtTime(0.5 * vol, t + d - 0.04); a.gain.linearRampToValueAtTime(0, t + d);
    for (let j = 0; j < 2; j++) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = F[j]; f.Q.value = 7; o.connect(f); f.connect(a); }
    sndPan(a, pan); o.start(t); o.stop(t + d + 0.02); t += d + 0.02;
  });
}
function sndCount(k) { SND.n[k] = (SND.n[k] || 0) + 1; }
function sndFrame(dt) {
  const A = SND, c = A.ctx; if (!c) { AQ.length = 0; return; }
  const now = c.currentTime, live = !UI.paused && S.phase !== 'menu', pan = clamp(S.ball.x / HALF_L, -1, 1) * 0.6; A.t += dt;
  for (let i = 0; i < AQ.length; i += 2) {
    const code = AQ[i], team = AQ[i + 1]; sndCount(code.startsWith('tir:') ? 'tir' : code);
    if (code === 'sifflet') sndWhistle(now, 0.32, 0.07);
    else if (code === 'but') { sndWhistle(now + 0.25, 0.16, 0.07); sndWhistle(now + 0.5, 0.2, 0.07); sndBurst(now, 0.35, 'bandpass', 2600, 0.6, 0.1, pan); A.exc = team === 0 ? 1 : 0.6; for (let j = 0; j < 46; j++) sndBurst(now + 0.3 + Math.random() * 3.2, 0.02, 'bandpass', 1500 + Math.random() * 1400, 1.2, 0.025 + Math.random() * 0.03, Math.random() * 2 - 1); }
    else if (code === 'mi-temps' || code === 'fin') { sndHorn(now); A.exc = max(A.exc, 0.7); }
    else if (code === 'arret') { sndBurst(now, 0.05, 'lowpass', 1100, 0.6, 0.22, pan); A.exc = max(A.exc, 0.5); }
    else if (code === 'poteau') { sndPost(now, pan); A.exc = max(A.exc, 0.55); }
    else if (code === 'reception' || code === 'ramasse' || code === 'interception') { sndBurst(now, 0.035, 'lowpass', 1400, 0.6, 0.12, pan); /* force 2 */ if (code === 'interception') A.exc = max(A.exc, 0.35); }
    else if (code.startsWith('tir:')) A.exc = max(A.exc, 0.3);
    else if (code === '2min' || code === 'temps-fort') A.exc = max(A.exc, code === '2min' ? 0.45 : 0.18);
    else if (code.startsWith('combinaison:')) sndCall(code.slice(12), team, pan);
  }
  AQ.length = 0;
  if (live && dt > 0) {
    /* crissement : au déclenchement d'une accélération ou d'un freinage à fond, une à trois fois sur quinze */
    for (let i = 0; i < S.P.length && i < 16; i++) {
      const p = S.P[i], k = i * 2; A.pe[i] += (hyp(p.vx - A.pv[k], p.vz - A.pv[k + 1]) / dt - A.pe[i]) * min(1, dt / 0.15); /* accélération lissée sur 0,15 s */
      const hard = p.y < 0.02 && p.acc > 0 && A.pe[i] > p.acc * (A.pa[i] ? 0.6 : 0.97);
      if (hard && !A.pa[i]) { sndCount('appui'); if (Math.random() < (1 + 2 * Math.random()) / 15) { sndSqueak(now, clamp(p.x / HALF_L, -1, 1) * 0.7); sndCount('crissement'); } }
      A.pa[i] = hard ? 1 : 0; A.pv[k] = p.vx; A.pv[k + 1] = p.vz;
    }
    const by = S.ball.y, dy = by - A.by; if (A.bdy < -0.003 && dy > 0.003 && by < 0.5) { sndThud(now, clamp(0.1 + 0.012 * -A.bdy / dt, 0.14, 0.2), pan); sndCount('rebond'); } /* léger, force 3, à peine dosé sur la vitesse d'impact */ A.bdy = dy; A.by = by;
  }
  A.exc *= Math.exp(-dt / 2.2);
  const w = 1 + 0.16 * sin(A.t * 0.71) + 0.1 * sin(A.t * 1.93 + 1), lv = live ? 1 : 0.45;
  A.murmur.gain.setTargetAtTime((0.2 + 0.24 * A.exc) * w * lv, now, 0.25); A.roar.gain.setTargetAtTime((0.035 + 0.45 * A.exc * A.exc + 0.12 * A.exc) * w * lv, now, 0.18);
}
function sndToggle() { SND.on = !SND.on; if (SND.out) SND.out.gain.setTargetAtTime(SND.on ? 0.9 : 0, SND.ctx.currentTime, 0.03); if (!SND.on && window.speechSynthesis) speechSynthesis.cancel(); say(SND.on ? 'Son activé' : 'Son coupé', 1.2); }
addEventListener('keydown', e => { sndInit(); if (e.code === 'KeyM' && !e.repeat) sndToggle(); });
addEventListener('mousedown', sndInit); addEventListener('touchstart', sndInit);
