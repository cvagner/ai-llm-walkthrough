// Boucle principale et interface de test (window.__hb) utilisée par les scripts de travail/.
const TEST = /[?&]test\b/.test(location.search);
let _last = 0, _acc = 0, _endShown = false;
const perf = { n: 0, sum: 0, max: 0, log: null };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = min(0.1, (now - _last) / 1000 || 0); _last = now;
  if (perf.log) { perf.log.push(dt * 1000); }
  /* qualité adaptative : si les images sont trop lentes, on baisse l'anticrénelage puis la résolution */
  UI.qT += dt; UI.qN++; if (UI.qN >= 120) { const avg = UI.qT / UI.qN; if (avg > 0.0195) { if (R.msaa > 2) R.msaa = 2; else if (R.scale > 0.72) R.scale = max(0.7, R.scale - 0.1); } UI.qT = 0; UI.qN = 0; }
  sndFrame(dt);
  if (UI.replay && !UI.paused) { if (replayFrame(dt)) replayEnd(); updateHud(dt); renderFrame(); return; }
  if (!UI.paused && S.phase !== 'menu') {
    pollInput(dt);
    const slow = UI.slow ? 0.3 : (S.phase === 'dead' && S.rs.type === 'eng' && S.rs.t < 1.6 && S.ball.state === B_NET ? 0.45 : 1);
    _acc += dt * slow; let n = 0; while (_acc >= DT && n < 5) { simStep(); _acc -= DT; n++; } if (n === 5) _acc = 0;
    if (UI.replays && !S.train && REC.goal > 54 && S.phase === 'dead' && S.rs.type === 'eng' && replayStart()) { $('combo').textContent = 'Ralenti — Espace pour passer'; $('combo').className = 'on'; }
    if (S.phase === 'end' && !_endShown) { _endShown = true; showMenu('end'); } if (S.phase !== 'end') _endShown = false;
  }
  updateCam(dt, false); updateHud(dt); renderFrame();
}
function boot() {
  initRender(); initPlayers(); srand(7); placeTeams(); S.poss = 0;
  for (let i = 0; i < 16; i++) poseP(S.P[i], DT, S.ball, false);
  S.ball.x = 0; S.ball.y = BALL_R; S.ball.z = 0;
  updateCam(0, true);
  window.__hb = {
    S, R, UI, COMBOS, SHOTS, perf, SND, sndFrame, dbg() { return { body, bodyN }; },
    init(seed, len, auto) { S.auto = auto !== false; initMatch(seed, len); hideMenu(); UI.paused = true; },
    step(n) { for (let i = 0; i < (n || 1); i++) simStep(); },
    train(kind, a, b) { startTrain(kind, a, b || 0); hideMenu(); UI.paused = true; },
    placed(user) { startTrain('combo', 0, 0); S.msgT = 0; S.cheer = 0; S.train = null; S.tm[0].combo = null; S.tm[0].step = -1; S.auto = !user; S.tm[0].passes = 0; },
    cam(mode) { camFixed = false; UI.cam = mode; updateCam(0, true); }, setCam,
    render() { updateCam(1 / 60, false); updateHud(1 / 60); renderFrame(); gl.finish(); },
    give(id) { S.poss = -1; give(S.P[id]); S.tm[S.P[id].team].st = PLACED; }, say, startShot, startPass, freeThrow, startRestart, sanction, zoneDist, uOf, pollInput, keys, requestTimeout, REC, replayStart, replayFrame, replayEnd, project(x, y, z) { const m = mVP, w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * canvas.clientWidth, (1 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5 + 0.5)) * canvas.clientHeight]; }, hud(on) { $('hud').style.display = on ? '' : 'none'; },
  };
  if (TEST) { hideMenu(); UI.paused = true; renderFrame(); document.title = 'pret'; }
  else { showMenu('home'); requestAnimationFrame(frame); }
}
try { boot(); } catch (e) { const el = $('err'); el.style.display = 'flex'; el.textContent = 'Erreur : ' + e.message; console.error(e); }
