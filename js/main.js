/* Football Go - inicialização, WebXR, loop principal e fluxo do jogo */
(function () {
  var P = FG.PITCH;
  var st = FG.save.settings;
  var mobileVR = /OculusBrowser|Quest|Pacific|Oculus|Android|Mobile|Wolvic|Pico/i.test(navigator.userAgent);
  FG.quality = st.quality === 'auto' ? (mobileVR ? 'low' : 'high') : st.quality;
  FG.inXR = false; FG.now = 0;

  // renderizador
  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, FG.quality === 'high' ? 2 : 1.25));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = FG.quality === 'high';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  if (renderer.xr.setFramebufferScaleFactor) renderer.xr.setFramebufferScaleFactor(FG.quality === 'high' ? 1.0 : 0.75);
  document.body.appendChild(renderer.domElement);
  FG.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 1000);
  camera.rotation.order = 'YXZ';
  var rig = new THREE.Group(); scene.add(rig);
  var head = new THREE.Group(); head.position.y = 1.65; rig.add(head);
  head.add(camera);

  FG.buildStadium(scene, FG.quality);
  var ball = new FG.Ball(scene);
  var human = new FG.Human(scene, rig, camera);
  var hud = new FG.HUD(camera);
  var ui = new FG.UI(scene, camera);
  var input = FG.input = new FG.Input(renderer, camera, head, scene);
  FG.showcase = new FG.Showcase(scene);
  FG.world = { scene: scene, ball: ball, human: human, hud: hud, ui: ui, rig: rig, camera: camera, renderer: renderer };

  FG.vibrate = function (v, ms) {
    try { var gp = input.getGamepad(); if (gp && gp.hapticActuators && gp.hapticActuators[0]) gp.hapticActuators[0].pulse(v, ms); } catch (e) { }
  };

  /* ---------- fluxo do app ---------- */
  var app = FG.app = { mode: null, modeKind: null, lastStart: null };
  app.applyEquipment = function () {
    var bi = FG.itemById(FG.save.equipped.ball) || FG.BALLS[0];
    ball.setItem(bi, FG.ballFx());
    human.setKit(human.team || FG.teamFor(st.team));
  };
  app.disposeMode = function () {
    if (app.mode) { app.mode.dispose(); app.mode = null; app.modeKind = null; }
    hud.hideMsg(); hud.setScore(null);
    human.setKeeper(false); human.mode = 'field';
  };
  app.toMenu = function (screen) {
    app.disposeMode();
    human.teleport(-6, 4, Math.PI * 0.7);
    human.player = null;
    ball.place(-5.2, 3.4); ball.walls = true;
    FG.stadium.setScoreboard(['FOOTBALL GO', 'Play in VR', 'Inspirado em VRFS']);
    rig.updateMatrixWorld(true);
    ui.open(screen || FG.S.main());
  };
  app.quit = function () { app.toMenu(FG.S.main()); };
  app.resume = function () { ui.close(); FG.showcase.hide(); };
  app.restart = function () { if (app.lastStart) app.lastStart(); else app.quit(); };
  app.begin = function (kind, mk) {
    app.disposeMode(); ui.close(); FG.showcase.hide();
    app.modeKind = kind; app.mode = mk();
    app.lastStart = function () { app.begin(kind, mk); };
    FG.audio.init();
  };
  app.startMatch = function (home, away, extra) {
    extra = extra || {};
    app.begin('match', function () {
      return new FG.Match({ home: home, away: away, size: st.size, minutes: st.minutes, difficulty: st.difficulty, onEnd: function (r) { app.matchEnd(r, extra); } });
    });
  };
  app.matchEnd = function (r, extra) {
    var S = FG.save.stats, win = r.hs > r.as, draw = r.hs === r.as;
    S.matches++; if (win) S.wins++; else if (draw) S.draws++; else S.losses++;
    S.goals += r.stats.humanGoals;
    var coins = (win ? 150 : draw ? 70 : 40) + r.stats.humanGoals * 40 + r.stats.humanAssists * 25 + (win ? st.difficulty * 40 : 0);
    if (extra.league) { r.league = true; FG.leagueFinishRound(r.hs, r.as); coins += win ? 80 : 0; }
    FG.addCoins(coins);
    ui.open(FG.S.results(r, coins));
  };
  app.startPenalties = function (home, away) {
    app.begin('penalties', function () {
      return new FG.PenaltyMode({ home: home, away: away, difficulty: st.difficulty, onEnd: function (r) {
        var coins = r.hs > r.as ? 120 : 40; FG.addCoins(coins); ui.open(FG.S.results(r, coins));
      } });
    });
  };
  app.startTraining = function () { app.begin('training', function () { return new FG.TrainingMode(); }); };
  app.startLesson = function (l) {
    app.begin('lesson', function () {
      return new FG.LessonMode(l, function () { var c = app.completeLesson(l); app.toMenu(FG.S.lessonDone(l, c)); });
    });
  };
  app.completeLesson = function (l) {
    if (FG.save.lessons[l.id]) return 0;
    FG.save.lessons[l.id] = Date.now(); FG.addCoins(l.reward); FG.audio.reward(true);
    return l.reward;
  };
  app.openBag = function (bag, daily) {
    if (daily) { if (!FG.dailyReady()) return; FG.save.lastDaily = Date.now(); }
    else { if (FG.save.coins < bag.price) return; FG.save.coins -= bag.price; }
    FG.persist();
    var res = FG.rollBag(bag);
    ui.open(FG.S.opening(), true);
    FG.showcase.showBag(bag, ui.mesh, function () {
      FG.showcase.showItem(res.item, ui.mesh);
      FG.audio.reward(res.item.rarity === 'epic' || res.item.rarity === 'legendary');
      ui.open(FG.S.reveal(res), true);
    });
  };
  app.refreshOverlay = function () {
    var el = document.getElementById('myCode'); if (el) el.textContent = FG.save.club ? FG.clubCode(FG.save.club) : '(crie um clube no jogo)';
  };

  /* ---------- tela inicial (HTML) ---------- */
  var overlay = document.getElementById('overlay'), btnVR = document.getElementById('btnVR'), btnFlat = document.getElementById('btnFlat'), note = document.getElementById('vrNote');
  function startFlat() { overlay.classList.add('hidden'); FG.audio.init(); onResize(); }
  btnFlat.addEventListener('click', startFlat);
  var xrSession = null;
  function enterVR() {
    FG.audio.init();
    navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }).then(function (s) {
      xrSession = s;
      s.addEventListener('end', function () { xrSession = null; FG.inXR = false; overlay.classList.remove('hidden'); btnVR.textContent = 'Entrar em VR'; });
      renderer.xr.setSession(s);
      // foveação fixa: renderiza as bordas com menos detalhe (ganho grande de FPS no Go)
      try { var bl = s.renderState.baseLayer; if (bl && 'fixedFoveation' in bl) bl.fixedFoveation = FG.quality === 'high' ? 0.5 : 1; } catch (e) { }
      FG.inXR = true; overlay.classList.add('hidden');
      setTimeout(function () { if (ui.visible) ui.place(); }, 400);
    }).catch(function (e) { note.textContent = 'Não foi possível iniciar a VR: ' + e.message; });
  }
  btnVR.addEventListener('click', function () { if (xrSession) xrSession.end(); else enterVR(); });
  if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-vr').then(function (ok) {
      btnVR.disabled = !ok; btnVR.textContent = ok ? '🥽 Entrar em VR' : 'VR não disponível neste navegador';
      if (!ok) note.textContent = 'Abra este site no navegador do seu headset (Oculus Browser / Meta Quest Browser) para jogar em VR.';
    }).catch(function () { btnVR.textContent = 'VR não disponível'; });
  } else { btnVR.textContent = 'VR não disponível neste navegador'; note.textContent = 'Abra este site no navegador do seu headset para jogar em VR.'; }
  // importar clube
  document.getElementById('btnImport').addEventListener('click', function () {
    var c = FG.parseClubCode(document.getElementById('importCode').value), m = document.getElementById('importMsg');
    if (!c) { m.textContent = 'Código inválido.'; return; }
    FG.save.friendClubs = (FG.save.friendClubs || []).filter(function (f) { return f.name !== c.name; });
    FG.save.friendClubs.unshift(c); FG.save.friendClubs = FG.save.friendClubs.slice(0, 5); FG.persist();
    m.textContent = '"' + c.name + '" importado! Ele entra na sua liga na próxima temporada.';
  });
  document.getElementById('btnCopy').addEventListener('click', function () { try { navigator.clipboard.writeText(FG.clubCode(FG.save.club)); } catch (e) { } });
  app.refreshOverlay();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  /* ---------- loop ---------- */
  app.applyEquipment();
  human.setKit(FG.teamFor(st.team));
  app.toMenu();
  document.getElementById('loading').classList.add('hidden');

  var clock = new THREE.Clock(), time = 0, fpsN = 0, fpsT = 0; FG.fps = 0;
  renderer.setAnimationLoop(function () {
    var dt = Math.min(0.1, clock.getDelta());
    fpsN++; fpsT += dt; if (fpsT >= 1) { FG.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
    time += dt; FG.now = time;
    if (!FG.inXR) { camera.rotation.set(input.pitch, input.yaw, 0); }
    input.showModels = ui.visible;
    input.update(dt, FG.inXR);
    // pausa
    if (input.pause) {
      if (app.mode && !ui.visible) { ui.open(FG.S.pause()); }
      else if (app.mode && ui.visible && !app.mode.done && !app.mode.ended) app.resume();
    }
    if (ui.visible) {
      ui.update(input.ray, input.click, FG.inXR);
      human.canMove = false;
      human.update(dt, input, ball, { noBall: true });
      if (!app.mode) ball.step(dt);
    } else if (app.mode) {
      human.canMove = true;
      app.mode.update(dt, input);
    } else {
      // sem modo e sem menu: volta ao menu
      ui.open(FG.S.main());
    }
    FG.stadium.update(dt, time);
    FG.audio.update(dt, !!app.mode && !ui.visible);
    hud.update(dt, human.speed || 0);
    FG.showcase.update(dt);
    renderer.render(scene, camera);
  });
})();
