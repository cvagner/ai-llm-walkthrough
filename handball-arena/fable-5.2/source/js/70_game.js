// Déroulement : caméras, affichage, menus, entraînement.
const $ = id => document.getElementById(id);
const HUDc = { s0: -1, s1: -1, clk: -1, per: -1, msgN: -1, msgOn: false, comboN: -1, comboT: 0, steps: -1, t3: -1, pw: -1, shot: -1, pas: null, susp: '', mode: '' };
function updateHud(dt) {
  const h = HUDc;
  if (S.score[0] !== h.s0) { h.s0 = S.score[0]; $('s0').textContent = h.s0; } if (S.score[1] !== h.s1) { h.s1 = S.score[1]; $('s1').textContent = h.s1; }
  const sec = Math.floor(S.clock); if (sec !== h.clk) { h.clk = sec; $('clk').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }
  if (S.half !== h.per) { h.per = S.half; $('per').textContent = S.train ? 'ENTRAÎNEMENT' : S.half ? '2e MI-TEMPS' : '1re MI-TEMPS'; }
  if (S.msgN !== h.msgN) { h.msgN = S.msgN; $('msg').textContent = S.msg; }
  const on = S.msgT > 0; if (on !== h.msgOn) { h.msgOn = on; $('msg').className = on ? 'on' : ''; }
  if (S.comboN !== h.comboN) { h.comboN = S.comboN; h.comboT = 4; $('combo').textContent = S.comboMsg; $('combo').className = 'on'; }
  if (h.comboT > 0) { h.comboT -= dt; if (h.comboT <= 0) $('combo').className = ''; }
  const p = holder(), mine = p && p.team === 0 && !S.auto, st = mine ? min(3, p.steps) : 0;
  if (st !== h.steps) { h.steps = st; const pp = $('pips').children; for (let i = 0; i < 3; i++) pp[i].className = i < st ? 'on' : ''; }
  const t3 = mine && !p.drib ? Math.round(sat(p.holdT / 3) * 20) : 0; if (t3 !== h.t3) { h.t3 = t3; $('t3').firstChild.style.width = t3 * 5 + '%'; }
  const pw = S.charging ? Math.round(S.charge * 20) : 0; if (pw !== h.pw) { h.pw = pw; $('pw').firstChild.style.width = pw * 5 + '%'; }
  if (S.inp.shotSel !== h.shot) { h.shot = S.inp.shotSel; $('shot').textContent = h.shot ? SHOTS[h.shot - 1].n : 'auto'; }
  if (S.pas.warn !== h.pas) { h.pas = S.pas.warn; $('passif').style.display = h.pas ? 'block' : 'none'; }
  let su = ''; for (let i = 0; i < 14; i++) { const q = S.P[i]; if (q.susp > 0) su += (su ? '   ' : '') + (q.team ? 'ATLAS' : 'HÉRONS') + ' n° ' + q.num + ' : ' + Math.ceil(q.susp) + ' s'; }
  if (su !== h.susp) { h.susp = su; $('susp').textContent = su; $('susp').style.display = su ? 'block' : 'none'; }
  const md = S.train ? 'Entraînement — T : ralenti' : S.auto ? 'Exhibition' : S.poss === 0 ? 'Attaque' : 'Défense ' + DEF_NAMES[S.defSys[0]];
  if (md !== h.mode) { h.mode = md; $('mode').textContent = md; }
}
// Caméras : 0 retransmission latérale, 1 rapprochée derrière le porteur, 2 tactique du dessus.
const _ct = { x: 0, y: 12.5, z: 25, tx: 0, ty: 1.2, tz: -0.5, fov: 0.52 };
let camFixed = false;
function updateCam(dt, snap) {
  if (camFixed || UI.replay) return; const b = S.ball, c = R.cam, t = _ct; let fx = clamp(b.x * 0.95, -15.2, 15.2);
  if (S.phase === 'dead' && S.rs.type === 'eng') fx *= 1 - smooth((S.rs.t - 0.9) / 1.8); // après un but, revenir vers l'engagement avec les joueurs
  if (UI.cam === 0) { t.x = fx * 0.8; t.y = 10.6; t.z = 23.0; t.tx = fx; t.ty = 1.1; t.tz = -0.2; t.fov = 0.5; } /* cadrage de retransmission resserré */
  else if (UI.cam === 2) { t.x = fx; t.y = 14.4; t.z = 3.2; t.tx = fx; t.ty = 0; t.tz = 0.3; t.fov = 1.3; }
  else {
    const p = S.ctl >= 0 ? S.P[S.ctl] : (holder() || S.P[3]), dir = S.dir[S.poss < 0 ? 0 : S.poss], gx = dir * HALF_L; let dx = gx - p.x, dz = -p.z * 0.5; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
    t.x = p.x - dx * 7.5; t.y = 3.6; t.z = p.z - dz * 7.5; t.tx = p.x + dx * 6; t.ty = 1.3; t.tz = p.z + dz * 6; t.fov = 0.75;
  }
  const k = snap ? 1 : 1 - Math.exp(-dt * 3.2); c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k; c.tx += (t.tx - c.tx) * k; c.ty += (t.ty - c.ty) * k; c.tz += (t.tz - c.tz) * k; c.fov += (t.fov - c.fov) * k;
}
function setCam(x, y, z, tx, ty, tz, fov) { const c = R.cam; c.x = x; c.y = y; c.z = z; c.tx = tx; c.ty = ty; c.tz = tz; c.fov = fov; camFixed = true; }

// ---------- menus
let menuState = { len: 300 };
function controlsTable() {
  return `<div class="cols"><table><tr><th>Attaque</th><th>Clavier</th><th>Manette</th></tr>
<tr><td>Se déplacer</td><td><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches</td><td>stick gauche</td></tr>
<tr><td>Passer (vers la direction tenue)</td><td><kbd>Espace</kbd> ou <kbd>K</kbd>, clic droit</td><td>A</td></tr>
<tr><td>Armer puis tirer (maintenir, relâcher)</td><td><kbd>J</kbd> ou clic gauche</td><td>X</td></tr>
<tr><td>Viser pendant l'armé</td><td>haut/bas : hauteur · droite : second poteau</td><td>stick droit</td></tr>
<tr><td>Dribbler (maintenir)</td><td><kbd>Maj</kbd></td><td>RT</td></tr>
<tr><td>Feinte de corps</td><td><kbd>H</kbd> + direction</td><td>B</td></tr>
<tr><td>Kung-fu (passe en l'air à l'ailier ou au pivot)</td><td><kbd>G</kbd></td><td>—</td></tr>
<tr><td>Choisir le geste de tir</td><td><kbd>1</kbd>…<kbd>9</kbd>, <kbd>0</kbd> : auto</td><td>LB / RB</td></tr>
<tr><td>Annoncer une combinaison</td><td><kbd>E</kbd> espagnole · <kbd>Y</kbd> yago · <kbd>R</kbd> croisé</td><td>croix ↑ → ←</td></tr></table>
<table><tr><th>Défense</th><th>Clavier</th><th>Manette</th></tr>
<tr><td>Se déplacer</td><td><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd></td><td>stick gauche</td></tr>
<tr><td>Changer de défenseur</td><td><kbd>F</kbd></td><td>Y</td></tr>
<tr><td>Monter au contact (maintenir)</td><td><kbd>J</kbd></td><td>X</td></tr>
<tr><td>Contrer (sauter bras levés)</td><td><kbd>Espace</kbd></td><td>A</td></tr>
<tr><td>Changer de système (0-6, 1-5, 3-2-1)</td><td><kbd>V</kbd></td><td>croix ↓</td></tr>
<tr><th>Général</th><th></th><th></th></tr>
<tr><td>Caméra (latérale, rapprochée, tactique)</td><td><kbd>C</kbd></td><td>Select</td></tr>
<tr><td>Pause</td><td><kbd>Échap</kbd> ou <kbd>P</kbd></td><td>Start</td></tr>
<tr><td>Temps mort d'équipe (en possession)</td><td><kbd>B</kbd></td><td></td></tr>
<tr><td>Passer le ralenti d'un but</td><td><kbd>Espace</kbd></td><td>A</td></tr>
<tr><td>Ralenti (entraînement)</td><td><kbd>T</kbd></td><td></td></tr>
<tr><td>Couper ou remettre le son</td><td><kbd>M</kbd></td><td></td></tr></table></div>
<p>Règles appliquées : trois pas, trois secondes, reprise de dribble, zone, jeu passif, jet franc, jet de 7 m, exclusions de 2 minutes. Les tirs : ${SHOTS.slice(0, 9).map((s, i) => `<kbd>${i + 1}</kbd> ${s.n.toLowerCase()}`).join(' · ')}.</p>`;
}
function showMenu(kind) {
  const P = $('panel'); let h = '';
  if (kind === 'pause') h = `<h1>Pause</h1><div class="row"><button class="go" data-a="resume">Reprendre</button><button data-a="home">Menu principal</button></div><h2>Commandes</h2>${controlsTable()}`;
  else if (kind === 'end') h = `<h1>Fin du match</h1><p style="font-size:26px;opacity:1">HÉRONS ${S.score[0]} – ${S.score[1]} ATLAS</p><div class="row"><button class="go" data-a="play">Rejouer</button><button data-a="home">Menu principal</button></div>`;
  else {
    h = `<h1>Handball Arena</h1>
<h2>Match — Hérons (vous) contre Atlas</h2><div class="row">${[[120, '2 × 2 min'], [300, '2 × 5 min'], [600, '2 × 10 min'], [1800, '2 × 30 min']].map(([v, l]) => `<button data-a="len" data-v="${v}" class="${menuState.len === v ? 'sel' : ''}">${l}</button>`).join('')}
<button class="go" data-a="play">Jouer</button><button data-a="demo">Match d’exhibition</button></div>
<h2>Défense adverse</h2><div class="row">${DEF_NAMES.map((n, i) => `<button data-a="def" data-v="${i}" class="${S.defSys[1] === i ? 'sel' : ''}">${n}</button>`).join('')}</div>
<h2>Entraînement — combinaisons</h2><div class="row">${COMBOS.map((c, i) => c.variants.map((v, j) => `<button data-a="tc" data-v="${i},${j}">${c.n.split(' (')[0]} : ${v.n}</button>`).join('')).join('')}</div>
<h2>Entraînement — tirs</h2><div class="row">${SHOTS.map((s, i) => `<button data-a="ts" data-v="${i}">${s.n}</button>`).join('')}</div>
<h2>Commandes</h2>${controlsTable()}`;
  }
  P.innerHTML = h; $('menu').className = ''; UI.paused = true;
}
function hideMenu() { $('menu').className = 'off'; UI.paused = false; canvas.focus(); }
function togglePause() { if (S.phase === 'menu') return; if (UI.paused) hideMenu(); else showMenu('pause'); }
$('panel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'len') { menuState.len = +v; showMenu('home'); }
  else if (a === 'def') { S.defSys[1] = +v; showMenu('home'); }
  else if (a === 'play') { S.auto = false; initMatch(Date.now() & 0xffffff, menuState.len); UI.cam = 0; hideMenu(); updateCam(0, true); }
  else if (a === 'demo') { S.auto = true; initMatch(20261118, menuState.len); UI.cam = 0; hideMenu(); updateCam(0, true); }
  else if (a === 'tc') { const [i, j] = v.split(',').map(Number); startTrain('combo', i, j); UI.cam = 2; hideMenu(); updateCam(0, true); }
  else if (a === 'ts') { startTrain('tir', +v, 0); UI.cam = 1; hideMenu(); updateCam(0, true); }
  else if (a === 'resume') hideMenu();
  else if (a === 'home') { S.phase = 'menu'; S.train = null; showMenu('home'); }
});
