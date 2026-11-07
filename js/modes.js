/* Football Go - modos: pênaltis, treino livre, aulas práticas, vitrine 3D (bolsas/vestiário) */
(function () {
  var P = FG.PITCH;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function d2(ax, az, bx, bz) { var x = ax - bx, z = az - bz; return Math.sqrt(x * x + z * z); }

  /* ---------- goleiro IA reutilizável (pênaltis / treino) ---------- */
  FG.KeeperAI = function (team, skill, goalSide) {
    var K = this;
    K.team = team; K.skill = skill; K.side = goalSide; // gol em x = side*HL
    K.h = FG.Humanoid({ team: team, gk: true, number: 1, name: 'Goleiro' });
    FG.world.scene.add(K.h.root);
    K.pos = new THREE.Vector3(goalSide * (P.HL - 0.3), 0, 0); K.vel = new THREE.Vector3();
    K.dive = 0; K.diveT = 0; K.react = null; K.time = 0; K.enabled = true;
  };
  FG.KeeperAI.prototype.reset = function () { this.pos.set(this.side * (P.HL - 0.3), 0, 0); this.dive = 0; this.diveT = 0; this.react = null; this.tried = false; this.h.root.visible = this.enabled; };
  FG.KeeperAI.prototype.dispose = function () { FG.world.scene.remove(this.h.root); this.h.dispose(); };
  // retorna 'save' | 'catch' | null
  FG.KeeperAI.prototype.update = function (dt, ball, onSave) {
    var K = this, B = ball, s = K.side, gx = s * P.HL;
    K.time += dt;
    if (!K.enabled) { K.h.root.visible = false; return; }
    K.h.root.visible = true;
    var toward = B.vel.x * s > 4 && !B.held;
    if (toward && !K.react && !K.tried) {
      var tc = (gx - B.pos.x) / B.vel.x;
      if (tc > 0 && tc < 1.5) {
        var zc = B.pos.z + B.vel.z * tc;
        var guess = Math.random() < 0.33;
        K.react = { t: guess ? 0.02 : rnd(0.12, 0.3) * (1.35 - K.skill), zc: guess ? (Math.random() < 0.5 ? -1 : 1) * rnd(1.2, 2.6) : zc + rnd(-0.3, 0.3) };
      }
    }
    if (K.react) {
      K.react.t -= dt;
      if (K.react.t <= 0) {
        var dz = K.react.zc - K.pos.z;
        if (Math.abs(dz) > 0.45 && !K.dive) K.dive = Math.sign(dz);
        K.pos.z += clamp(dz, -6.5 * dt, 6.5 * dt);
      }
      if (K.dive) K.diveT += dt;
      if (!K.tried && Math.abs(B.pos.x - K.pos.x) < 0.6) {
        K.tried = true;
        var reach = K.dive ? 1.35 : 0.7, bz = Math.abs(B.pos.z - K.pos.z);
        if (bz < reach && B.pos.y < (K.dive ? 1.9 : 2.3)) {
          var spd = B.vel.length();
          var prob = clamp(K.skill * 1.05 - (spd - 17) * 0.03 - (bz > 1 ? 0.15 : 0), 0.1, 0.92);
          if (Math.random() < prob) {
            B.vel.x = -s * (Math.abs(B.vel.x) * 0.25 + 2); B.vel.z += Math.sign(B.pos.z - K.pos.z || 1) * rnd(3, 6); B.vel.y = Math.abs(B.vel.y) * 0.3 + 2.5; B.spin.set(0, 0, 0);
            FG.audio.kick(0.5); FG.audio.ooh();
            if (onSave) onSave();
          }
        }
      }
      if (K.diveT > 1.4) { K.dive = 0; K.diveT = 0; K.react = null; }
    } else if (!K.tried) {
      // posiciona-se entre bola e gol
      var tz = clamp(B.pos.z * 0.15, -1, 1);
      K.pos.z += clamp(tz - K.pos.z, -2 * dt, 2 * dt);
    }
    var r = K.h.root; r.position.set(K.pos.x, 0, K.pos.z); r.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    var t = { time: K.time, speed: 0, phase: 0, gkReady: !K.dive };
    if (K.dive) {
      t.dive = true; var k = Math.min(1, K.diveT * 3);
      r.rotateZ(K.dive * -s * 1.25 * k);
      r.position.y = Math.max(0, 0.35 * Math.sin(Math.min(1, K.diveT * 2) * Math.PI));
    }
    K.h.pose(t);
  };

  /* ---------- batedor IA ---------- */
  FG.ShooterAI = function (team) {
    var S = this;
    S.h = FG.Humanoid({ team: team, number: 9, name: 'Batedor' });
    FG.world.scene.add(S.h.root); S.pos = new THREE.Vector3(); S.phase = 0; S.kickT = -1; S.time = 0;
  };
  FG.ShooterAI.prototype.dispose = function () { FG.world.scene.remove(this.h.root); this.h.dispose(); };
  FG.ShooterAI.prototype.pose = function (dt, speed, face) {
    var S = this; S.time += dt; S.phase += speed * dt * 1.9;
    if (S.kickT >= 0) { S.kickT += dt * 3; if (S.kickT > 1) S.kickT = -1; }
    S.h.root.position.set(S.pos.x, 0, S.pos.z); S.h.root.rotation.set(0, face, 0);
    S.h.pose({ phase: S.phase, speed: speed, time: S.time, kick: S.kickT });
  };

  /* ---------- Disputa de pênaltis ---------- */
  FG.PenaltyMode = function (o) {
    var M = this, W = FG.world;
    M.o = o; M.ball = W.ball; M.human = W.human; M.hud = W.hud;
    M.round = 0; M.turn = 0; // 0 = você bate, 1 = você defende
    M.res = [[], []]; M.state = 'setup'; M.timer = 0;
    var diff = FG.DIFFICULTY[o.difficulty] || FG.DIFFICULTY[1];
    M.keeper = new FG.KeeperAI(o.away, clamp(o.away.rating / 100 * diff.ai, 0.3, 1.05), 1);
    M.shooter = new FG.ShooterAI(o.away);
    M.human.setKit(o.home); M.human.player = { human: true, team: { def: o.home, side: 0 }, name: 'VOCÊ' };
    FG.stadium.setCrowdColors(o.home, o.away);
    M.oppSkill = clamp(o.away.rating / 100 * diff.ai, 0.3, 1.05);
    M.setup();
    M.hud.show('DISPUTA DE PÊNALTIS', 'Cada time bate 5. Você bate e depois defende. Boa sorte!', 4);
  };
  var PP = FG.PenaltyMode.prototype;
  PP.dispose = function () { this.keeper.dispose(); this.shooter.dispose(); this.human.setKeeper(false); this.hud.setScore(null); FG.stadium.setBlobs([]); };
  PP.score = function (i) { return this.res[i].filter(function (x) { return x; }).length; };
  PP.setup = function () {
    var M = this, B = M.ball;
    M.state = 'ready'; M.timer = 0; M.resolved = false;
    B.place(P.HL - P.SPOT, 0); B.walls = true;
    if (M.turn === 0) {
      M.human.setKeeper(false); M.human.mode = 'field';
      M.human.teleport(P.HL - P.SPOT - 2.2, 0, Math.PI / 2);
      M.keeper.h.root.visible = true; M.keeper.enabled = true; M.keeper.reset();
      M.shooter.h.root.visible = false;
      M.hud.show('SUA VEZ DE BATER', 'Rodada ' + (M.round + 1) + '. Escolha o canto e chute!', 2.5);
    } else {
      M.keeper.enabled = false; M.keeper.h.root.visible = false;
      M.human.teleport(P.HL - 0.4, 0, -Math.PI / 2);
      M.human.setKeeper(true, P.HL, -1);
      M.shooter.h.root.visible = true; M.shooter.pos.set(P.HL - P.SPOT - 3.5, 0, rnd(-1.5, 1.5));
      M.hud.show('VOCÊ É O GOLEIRO', 'Aponte o controle para posicionar as luvas. Defenda!', 2.5);
    }
    FG.audio.whistle();
  };
  PP.result = function (goal) {
    var M = this; if (M.resolved) return; M.resolved = true;
    M.res[M.turn].push(goal);
    var mine = M.turn === 0;
    if (goal) { FG.audio.goal(); M.hud.show(mine ? 'GOOOL!' : 'GOL DELES', mine ? 'Bola na rede!' : 'Não deu desta vez.', 2.2, mine ? '#35d07f' : '#ff7b5a'); if (mine) FG.save.stats.pensScored++; }
    else { FG.audio.ooh(); M.hud.show(mine ? 'PERDEU!' : 'DEFENDEU!', mine ? 'O goleiro pegou ou a bola foi para fora.' : 'Que defesa incrível!', 2.2, mine ? '#ff7b5a' : '#9fd8ff'); if (!mine) FG.save.stats.saves++; }
    M.state = 'result'; M.timer = 0;
  };
  PP.decided = function () {
    var a = this.score(0), b = this.score(1), na = this.res[0].length, nb = this.res[1].length;
    if (na <= 5 && nb <= 5) {
      if (a > b + (5 - nb)) return true;
      if (b > a + (5 - na)) return true;
      return na === 5 && nb === 5 && a !== b;
    }
    return na === nb && a !== b;
  };
  PP.update = function (dt, input) {
    var M = this, B = M.ball, H = M.human;
    M.timer += dt;
    var ctx = { bounds: { x: P.HL + 3, z: P.HW }, onSave: function () { FG.audio.ooh(); } };
    if (M.turn === 0 && M.state === 'ready') ctx.zone = function (p) { p.x = Math.min(p.x, P.HL - P.SPOT + 0.6); };
    H.update(dt, input, B, ctx);
    if (M.turn === 0) {
      M.keeper.update(dt, B);
      if (M.state === 'ready' && B.speed() > 3) { M.state = 'flight'; M.timer = 0; }
    } else {
      // batedor
      var S = M.shooter;
      if (M.state === 'ready') {
        var tx = P.HL - P.SPOT - 0.5, dx = tx - S.pos.x, dz = -S.pos.z, d = Math.sqrt(dx * dx + dz * dz);
        var run = M.timer > 1.6 ? 5 : 0;
        if (d > 0.3 && run) { S.pos.x += dx / d * run * dt; S.pos.z += dz / d * run * dt; S.pose(dt, run, Math.atan2(dx, dz)); }
        else S.pose(dt, 0, Math.PI / 2);
        if (d <= 0.35 && run) {
          var side = Math.random() < 0.5 ? -1 : 1;
          var tz = side * rnd(0.6, P.GOAL_HW - 0.3) * (Math.random() < 0.15 ? 0.2 : 1), ty = rnd(0.2, 1.9);
          var spd = rnd(15, 19) + M.oppSkill * 5;
          if (Math.random() < 0.08) tz = side * (P.GOAL_HW + 0.5); // pra fora
          B.kickTo(P.HL + 0.5, tz, spd, false, ty); S.kickT = 0.25; FG.audio.kick(0.8);
          B.touch({ team: { def: M.o.away } }, null, true);
          M.state = 'flight'; M.timer = 0;
        }
      } else S.pose(dt, 0, Math.PI / 2);
    }
    B.step(dt);
    if (M.state === 'flight') {
      if (B.pos.x > P.HL + B.r && Math.abs(B.pos.z) < P.GOAL_HW && B.pos.y < P.GOAL_H) M.result(true);
      else if (B.pos.x > P.HL + 1 || Math.abs(B.pos.z) > P.HW || M.timer > 4 || (M.timer > 0.6 && B.speed() < 1.5) || B.held || (B.vel.x < -1 && M.timer > 0.4)) M.result(false);
    } else if (M.state === 'result' && M.timer > 2.6) {
      if (M.turn === 1) M.round++;
      M.turn = 1 - M.turn;
      if (M.turn === 0 && M.decided()) { M.finish(); return; }
      if (M.turn === 1 && M.res[0].length > M.res[1].length && M.decided()) { M.finish(); return; }
      M.setup();
    }
    // placar
    function dots(r) { var s = ''; for (var i = 0; i < Math.max(5, r.length); i++) s += i < r.length ? (r[i] ? '●' : '✕') : '○'; return s; }
    M.hud.setScore({ home: M.o.home.short, away: M.o.away.short, score: M.score(0) + ' - ' + M.score(1), time: dots(M.res[0]) + '  |  ' + dots(M.res[1]), homeColor: M.o.home.primary, awayColor: M.o.away.primary });
    FG.stadium.setBlobs([{ x: B.pos.x, z: B.pos.z, s: 0.3 }, { x: M.keeper.pos.x, z: M.keeper.pos.z, s: M.keeper.enabled ? 0.9 : 0 }, { x: M.shooter.pos.x, z: M.shooter.pos.z, s: M.turn === 1 ? 0.9 : 0 }]);
  };
  PP.finish = function () {
    var M = this; if (M.done) return; M.done = true;
    var a = M.score(0), b = M.score(1);
    FG.audio.whistle('end');
    if (M.o.onEnd) M.o.onEnd({ home: M.o.home, away: M.o.away, hs: a, as: b, penalties: true });
  };

  /* ---------- Treino livre ---------- */
  FG.TrainingMode = function () {
    var M = this, W = FG.world;
    M.ball = W.ball; M.human = W.human; M.hud = W.hud; M.points = 0; M.timer = 0;
    var team = FG.teamById(FG.save.settings.team);
    M.human.setKit(team); M.human.player = { human: true, team: { def: team, side: 0 }, name: 'VOCÊ' };
    M.keeper = new FG.KeeperAI(FG.teamById(FG.save.settings.opp), 0.7, 1);
    M.keeper.enabled = false; M.keeper.h.root.visible = false;
    // alvos nos cantos
    M.targets = [];
    var tm = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 });
    [[-1, 0.5], [1, 0.5], [-1, 1.9], [1, 1.9]].forEach(function (c) {
      var t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), tm.clone());
      t.position.set(P.HL - 0.05, c[1], c[0] * (P.GOAL_HW - 0.6)); t.rotation.y = Math.PI / 2;
      W.scene.add(t); M.targets.push(t);
    });
    M.human.teleport(P.HL - 22, 0, Math.PI / 2);
    M.newBall();
    M.hud.show('TREINO LIVRE', 'Acerte os alvos amarelos no gol. Pausa: menu com goleiro e nova bola.', 4);
  };
  var TP = FG.TrainingMode.prototype;
  TP.dispose = function () { var M = this; M.keeper.dispose(); M.targets.forEach(function (t) { FG.world.scene.remove(t); }); M.hud.setScore(null); FG.stadium.setBlobs([]); };
  TP.newBall = function () {
    var M = this, H = M.human, yaw = H.yaw;
    var x = H.pos.x + Math.sin(yaw) * 1.0, z = H.pos.z + Math.cos(yaw) * 1.0;
    M.ball.place(clamp(x, -P.HL + 1, P.HL - 1), clamp(z, -P.HW + 1, P.HW - 1)); M.keeper.reset(); M.cross = false; M.timer = 0;
  };
  TP.update = function (dt, input) {
    var M = this, B = M.ball;
    M.timer += dt;
    M.human.update(dt, input, B, {});
    M.keeper.update(dt, B);
    var px = B.pos.x;
    B.step(dt);
    // alvos
    if (!M.cross && px <= P.HL - 0.05 && B.pos.x > P.HL - 0.05) {
      M.cross = true;
      M.targets.forEach(function (t) {
        if (t.material.opacity > 0.5 && Math.sqrt(Math.pow(B.pos.y - t.position.y, 2) + Math.pow(B.pos.z - t.position.z, 2)) < 0.5) {
          M.points += 10; t.material.opacity = 0.2; FG.audio.reward(false); M.hud.show('NO ALVO! +10', 'Pontos: ' + M.points + (M.points % 40 === 0 ? ' — alvos recarregados!' : ''), 2, '#ffd23f');
          if (M.points <= 200) FG.addCoins(5);
        }
      });
      if (M.targets.every(function (t) { return t.material.opacity < 0.5; })) M.targets.forEach(function (t) { t.material.opacity = 0.85; });
      if (Math.abs(B.pos.z) < P.GOAL_HW && B.pos.y < P.GOAL_H) { FG.audio.goal(); }
    }
    if (B.pos.x < P.HL - 1) M.cross = false;
    var out = Math.abs(B.pos.x) > P.HL + 0.3 || Math.abs(B.pos.z) > P.HW + 0.3;
    if (out) { M.outT = (M.outT || 0) + dt; if (M.outT > 2) { M.outT = 0; M.newBall(); } } else M.outT = 0;
    M.hud.setScore({ home: 'TREINO', away: 'PTS', score: String(M.points), time: 'Bolas: Espaço/pausa · Goleiro: ' + (M.keeper.enabled ? 'ON' : 'OFF') });
    FG.stadium.setBlobs([{ x: B.pos.x, z: B.pos.z, s: Math.max(0.12, 0.32 - B.pos.y * 0.04) }, { x: M.keeper.pos.x, z: M.keeper.pos.z, s: M.keeper.enabled ? 0.9 : 0 }]);
  };

  /* ---------- Aulas práticas ---------- */
  FG.LessonMode = function (lesson, onDone) {
    var M = this, W = FG.world;
    M.l = lesson; M.onDone = onDone; M.ball = W.ball; M.human = W.human; M.hud = W.hud; M.scene = W.scene;
    M.count = 0; M.goal = { move: 3, touch: 6, pass: 3, shoot: 3, keeper: 3 }[lesson.task]; M.timer = 0; M.objs = [];
    var team = FG.teamById(FG.save.settings.team);
    M.human.setKit(team); M.human.player = { human: true, team: { def: team, side: 0 }, name: 'VOCÊ' };
    M.human.setKeeper(false); M.human.touches = 0;
    var t = lesson.task;
    if (t === 'move') {
      M.human.teleport(0, 0, Math.PI / 2); M.ball.place(0, -30);
      M.cones = [[8, 0], [8, 8], [0, 8]].map(function (c) { return M.cone(c[0], c[1], 0xff7a1a); });
      M.coneIdx = 0; M.highlight();
    } else if (t === 'touch') {
      M.human.teleport(0, 0, Math.PI / 2); M.ball.place(0.9, 0);
    } else if (t === 'pass') {
      M.human.teleport(0, 0, Math.PI / 2); M.ball.place(0.8, 0);
      M.cone(10, -0.9, 0xffd23f); M.cone(10, 0.9, 0xffd23f);
    } else if (t === 'shoot') {
      M.human.teleport(P.HL - 21, 0, Math.PI / 2); M.ball.place(P.HL - 20, 0);
    } else if (t === 'keeper') {
      M.human.teleport(P.HL - 0.4, 0, -Math.PI / 2); M.human.setKeeper(true, P.HL, -1);
      M.shooter = new FG.ShooterAI(FG.teamById(FG.save.settings.opp)); M.prepShot();
    }
    M.hud.show(lesson.title, lesson.intro[lesson.intro.length - 1], 5);
  };
  var LP = FG.LessonMode.prototype;
  LP.cone = function (x, z, color) {
    var g = new THREE.Group();
    var c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 16), new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.25 }));
    c.position.y = 0.3; g.add(c);
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 32), new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.visible = false; g.add(ring); g.userData.ring = ring;
    g.position.set(x, 0, z); this.scene.add(g); this.objs.push(g); return g;
  };
  LP.highlight = function () { var M = this; M.cones.forEach(function (c, i) { c.userData.ring.visible = i === M.coneIdx; c.visible = i >= M.coneIdx; }); };
  LP.dispose = function () { var M = this; M.objs.forEach(function (o) { M.scene.remove(o); }); if (M.shooter) M.shooter.dispose(); M.human.setKeeper(false); M.hud.setScore(null); FG.stadium.setBlobs([]); };
  LP.prepShot = function () { var M = this; M.ball.place(P.HL - P.SPOT, rnd(-2, 2)); M.shooter.pos.set(P.HL - P.SPOT - 3, 0, M.ball.pos.z + rnd(-1, 1)); M.shotT = 0; M.shot = false; M.resolved = false; };
  LP.progress = function () {
    var M = this; M.count++; FG.audio.reward(false);
    if (M.count >= M.goal) { M.finished = true; M.doneT = 0; M.hud.show('MISSÃO CUMPRIDA!', 'Parabéns! Você completou: ' + M.l.title, 3, '#35d07f'); FG.audio.cheer(0.6); }
    else M.hud.show(M.count + ' / ' + M.goal, 'Muito bem, continue!', 1.8, '#35d07f');
  };
  LP.update = function (dt, input) {
    var M = this, B = M.ball, H = M.human, t = M.l.task;
    M.timer += dt;
    var prevTouches = H.touches, px = B.pos.x;
    H.update(dt, input, B, { onSave: function () { if (!M.resolved && t === 'keeper') { M.resolved = true; M.progress(); } } });
    B.step(dt);
    if (M.finished) { M.doneT += dt; if (M.doneT > 3 && !M.called) { M.called = true; M.onDone(); } }
    else if (t === 'move') {
      var c = M.cones[M.coneIdx];
      if (d2(H.pos.x, H.pos.z, c.position.x, c.position.z) < 1.2) { M.coneIdx++; M.progress(); if (M.coneIdx < 3) M.highlight(); else M.cones.forEach(function (cc) { cc.visible = false; }); }
    } else if (t === 'touch') {
      if (H.touches > prevTouches && M.timer - (M.lastT || 0) > 0.3) { M.lastT = M.timer; M.progress(); }
      if (d2(H.pos.x, H.pos.z, B.pos.x, B.pos.z) > 12) B.place(H.pos.x + Math.sin(H.yaw), H.pos.z + Math.cos(H.yaw));
    } else if (t === 'pass') {
      if (px < 10 && B.pos.x >= 10 && Math.abs(B.pos.z) < 0.8) { M.progress(); M.resetT = 1.5; }
      if (M.resetT !== undefined) { M.resetT -= dt; if (M.resetT <= 0) { M.resetT = undefined; H.teleport(0, 0, Math.PI / 2); B.place(0.8, 0); } }
      else if (B.pos.x > 14 || d2(H.pos.x, H.pos.z, B.pos.x, B.pos.z) > 16) { H.teleport(0, 0, Math.PI / 2); B.place(0.8, 0); }
    } else if (t === 'shoot') {
      if (!M.scored && B.pos.x > P.HL + B.r && Math.abs(B.pos.z) < P.GOAL_HW && B.pos.y < P.GOAL_H) { M.scored = true; FG.audio.goal(); M.progress(); M.resetT = 2; }
      var out = B.pos.x > P.HL + 0.5 || Math.abs(B.pos.z) > P.HW;
      if (M.resetT === undefined && out) M.resetT = 1.5;
      if (M.resetT !== undefined) { M.resetT -= dt; if (M.resetT <= 0) { M.resetT = undefined; M.scored = false; B.place(P.HL - rnd(18, 22), rnd(-8, 8)); H.teleport(B.pos.x - 1.2, B.pos.z, Math.atan2(P.HL - B.pos.x, -B.pos.z)); } }
    } else if (t === 'keeper') {
      var S = M.shooter; M.shotT += dt;
      if (!M.shot) {
        var tx = B.pos.x - 0.5, dx = tx - S.pos.x, dz = B.pos.z - S.pos.z, d = Math.sqrt(dx * dx + dz * dz);
        if (M.shotT > 1.8 && d > 0.3) { S.pos.x += dx / d * 4.5 * dt; S.pos.z += dz / d * 4.5 * dt; S.pose(dt, 4.5, Math.atan2(dx, dz)); }
        else S.pose(dt, 0, Math.PI / 2);
        if (M.shotT > 1.8 && d <= 0.35) {
          var side = Math.random() < 0.5 ? -1 : 1;
          B.kickTo(P.HL + 0.5, side * rnd(0.5, 2.8), rnd(13, 16.5), false, rnd(0.2, 1.7)); S.kickT = 0.25; FG.audio.kick(0.6);
          M.shot = true; M.shotT = 0;
        }
      } else {
        S.pose(dt, 0, Math.PI / 2);
        if (!M.resolved && B.pos.x > P.HL + B.r && Math.abs(B.pos.z) < P.GOAL_HW) { M.resolved = true; M.hud.show('GOL...', 'Tente de novo! Aponte para onde a bola vai.', 1.6, '#ff7b5a'); }
        if (M.shotT > 3) { B.held = null; M.prepShot(); }
      }
    }
    M.hud.setScore({ home: 'AULA', away: '', score: M.count + ' / ' + M.goal, time: M.l.title });
    FG.stadium.setBlobs([{ x: B.pos.x, z: B.pos.z, s: Math.max(0.12, 0.32 - B.pos.y * 0.04) }]);
  };

  /* ---------- Vitrine 3D (bolsas de recompensa e vestiário) ---------- */
  FG.Showcase = function (scene) {
    var S = this;
    S.group = new THREE.Group(); S.group.visible = false; scene.add(S.group);
    S.holder = new THREE.Group(); S.group.add(S.holder);
    S.light = new THREE.PointLight(0xffffff, 1.2, 6); S.light.position.set(0, 1, 1); S.group.add(S.light);
    S.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: FG.glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    S.glow.scale.set(1.5, 1.5, 1); S.group.add(S.glow);
    S.t = 0; S.mode = null;
  };
  var SP = FG.Showcase.prototype;
  SP.placeNear = function (panel) {
    // ao lado esquerdo do painel
    this.group.position.copy(panel.position); this.group.quaternion.copy(panel.quaternion);
    this.group.translateX(-1.45); this.group.translateZ(0.25); this.group.translateY(-0.1);
  };
  SP.clear = function () { while (this.holder.children.length) this.holder.remove(this.holder.children[0]); };
  SP.hide = function () { this.group.visible = false; this.clear(); this.mode = null; };
  SP.showItem = function (item, panel) {
    this.clear(); this.mode = 'item'; this.t = 0;
    var m;
    if (item.id.indexOf('boot') === 0) { m = FG.bootMesh(item, 3.2); m.position.y = -0.15; m.rotation.x = 0.2; }
    else { m = new THREE.Mesh(FG.ballGeometry(item, 0.22), FG.ballMaterial()); }
    this.holder.add(m);
    this.glow.material.color.set(FG.RARITY[item.rarity].color); this.glow.material.opacity = 0.55;
    if (panel) this.placeNear(panel);
    this.group.visible = true;
  };
  SP.showBag = function (bag, panel, onReveal) {
    this.clear(); this.mode = 'bag'; this.t = 0; this.onReveal = onReveal;
    var g = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ color: bag.color, emissive: bag.color, emissiveIntensity: 0.15 });
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), mat); body.scale.set(1, 1.15, 0.85); g.add(body);
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.12, 14), mat); neck.position.y = 0.3; g.add(neck);
    var top = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat); top.position.y = 0.4; top.scale.set(1.4, 0.7, 1.2); g.add(top);
    var rope = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), new THREE.MeshLambertMaterial({ color: 0xf2d27a })); rope.rotation.x = Math.PI / 2; rope.position.y = 0.33; g.add(rope);
    var star = new THREE.Mesh(new THREE.CircleGeometry(0.08, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); star.position.set(0, 0.02, 0.215); g.add(star);
    this.bag = g; this.holder.add(g);
    this.glow.material.color.set(bag.color); this.glow.material.opacity = 0.3;
    if (panel) this.placeNear(panel);
    this.group.visible = true;
  };
  SP.update = function (dt) {
    if (!this.group.visible) return;
    this.t += dt;
    if (this.mode === 'bag') {
      var k = Math.min(1, this.t / 1.6);
      this.holder.rotation.set(Math.sin(this.t * 40) * 0.12 * k, this.t * 0.6, Math.sin(this.t * 33) * 0.12 * k);
      this.glow.scale.setScalar(1 + k * 1.5); this.glow.material.opacity = 0.3 + k * 0.6;
      if (this.t > 1.8 && this.onReveal) { var cb = this.onReveal; this.onReveal = null; cb(); }
    } else {
      this.holder.rotation.set(0, this.t * 0.9, 0);
      this.holder.position.y = Math.sin(this.t * 2) * 0.03;
      this.glow.scale.setScalar(1.6 + Math.sin(this.t * 3) * 0.1);
    }
  };
})();
