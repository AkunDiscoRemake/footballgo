/* Football Go - partida: times, IA, goleiros, regras (impedimento, faltas, cartões, reinícios), relógio */
(function () {
  var P = FG.PITCH;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function d2(ax, az, bx, bz) { var x = ax - bx, z = az - bz; return Math.sqrt(x * x + z * z); }

  // formações: [função, fx (0 = próprio gol, 1 = gol adversário), fz (-1..1), número]
  var FORM = {
    5: [['GK', 0.02, 0, 1], ['DF', 0.24, -0.45, 4], ['DF', 0.24, 0.45, 3], ['MF', 0.48, 0, 10], ['FW', 0.72, 0, 9]],
    7: [['GK', 0.02, 0, 1], ['DF', 0.22, -0.5, 4], ['DF', 0.22, 0.5, 3], ['MF', 0.45, -0.62, 7], ['MF', 0.4, 0, 8], ['MF', 0.45, 0.62, 11], ['FW', 0.72, 0, 9]],
    11: [['GK', 0.02, 0, 1], ['DF', 0.2, -0.78, 2], ['DF', 0.16, -0.28, 4], ['DF', 0.16, 0.28, 3], ['DF', 0.2, 0.78, 6], ['MF', 0.4, -0.45, 8], ['MF', 0.36, 0, 5], ['MF', 0.4, 0.45, 10], ['FW', 0.7, -0.68, 7], ['FW', 0.76, 0, 9], ['FW', 0.7, 0.68, 11]]
  };

  FG.Match = function (o) {
    var M = this;
    var W = FG.world;
    M.o = o; M.ball = W.ball; M.human = W.human; M.scene = W.scene; M.hud = W.hud;
    M.half = 1; M.clock = 0; M.halfLen = Math.max(30, o.minutes * 60 / 2);
    M.state = 'init'; M.timer = 0; M.time = 0; M.events = [];
    var diff = FG.DIFFICULTY[o.difficulty] || FG.DIFFICULTY[1];
    M.teams = [M.mkTeam(o.home, 0, 1), M.mkTeam(o.away, 1, -1)];
    M.teams[0].skill = clamp(o.home.rating / 100 * 0.9, 0.5, 1.05);
    M.teams[1].skill = clamp(o.away.rating / 100 * diff.ai * 1.08, 0.4, 1.1);
    M.humanTeam = M.teams[0];
    M.stats = { humanGoals: 0, humanAssists: 0, humanShots: 0, humanTouches: 0, poss: [0, 0], shots: [0, 0] };
    // árbitro
    M.ref = FG.Humanoid({ team: o.home, referee: true, number: 0 });
    M.ref.pos = new THREE.Vector3(-10, 0, -10); M.ref.vel = new THREE.Vector3(); M.ref.phase = 0;
    M.scene.add(M.ref.root);
    // linha de impedimento
    M.offLine = new THREE.Mesh(new THREE.PlaneGeometry(0.15, P.W), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55, depthWrite: false }));
    M.offLine.rotation.x = -Math.PI / 2; M.offLine.position.y = 0.02; M.offLine.visible = false; M.scene.add(M.offLine);
    // bola
    M.onBall = function (ev, data) { M.ballEvent(ev, data); };
    M.ball.listeners.push(M.onBall);
    M.ball.owner = null; M.lastPost = 0;
    FG.stadium.setCrowdColors(o.home, o.away);
    M.human.setKit(o.home);
    M.human.mode = 'field'; M.human.canMove = true;
    M.kickoff(M.teams[0], true);
  };
  var proto = FG.Match.prototype;

  proto.mkTeam = function (def, side, dir) {
    var M = this, T = { def: def, side: side, dir: dir, score: 0, players: [], fouls: 0 };
    var form = FORM[this.o.size] || FORM[7];
    var names = FG.LAST_NAMES.slice().sort(function () { return Math.random() - 0.5; });
    form.forEach(function (f, i) {
      var p = { team: T, idx: i, role: f[0], fx: f[1], fz: f[2], number: f[3], name: names[i % names.length], pos: new THREE.Vector3(), vel: new THREE.Vector3(), face: 0, phase: Math.random() * 6, cd: 0, kickT: -1, yellow: 0, sentOff: false, dec: Math.random() * 0.3 };
      var isHuman = side === 0 && f[0] === 'FW' && f[2] === 0;
      if (isHuman) {
        p.human = true; p.name = 'VOCÊ'; p.pos = M.human.pos; p.vel = M.human.vel; p.number = 10;
        M.human.player = p;
      } else {
        var bt = pick(FG.BOOTS);
        p.h = FG.Humanoid({ team: def, number: p.number, name: p.name, gk: f[0] === 'GK', boot: bt.color, bootAccent: bt.accent });
        M.scene.add(p.h.root);
      }
      T.players.push(p);
    });
    T.gk = T.players[0];
    return T;
  };
  proto.dispose = function () {
    var M = this;
    M.teams.forEach(function (T) { T.players.forEach(function (p) { if (p.h) { M.scene.remove(p.h.root); p.h.dispose(); } }); });
    M.scene.remove(M.ref.root); M.ref.dispose();
    M.scene.remove(M.offLine);
    var i = M.ball.listeners.indexOf(M.onBall); if (i >= 0) M.ball.listeners.splice(i, 1);
    M.ball.held = null; M.ball.owner = null;
    FG.stadium.setBlobs([]);
    M.hud.setScore(null);
  };

  /* ---------- utilidades ---------- */
  proto.worldPos = function (T, fx, fz, out) { out.set(T.dir * P.HL * (2 * fx - 1), 0, fz * P.HW * 0.85); return out; };
  proto.opp = function (T) { return this.teams[1 - T.side]; };
  proto.active = function (T) { return T.players.filter(function (p) { return !p.sentOff; }); };
  proto.timeStr = function () {
    var m = this.clock / this.halfLen * 45, base = (this.half - 1) * 45, mm = Math.floor(base + Math.min(m, 45));
    var extra = m > 45 ? '+' : '';
    var ss = Math.floor((m - Math.floor(m)) * 60);
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss + extra;
  };
  proto.scoreInfo = function () {
    var a = this.teams[0], b = this.teams[1];
    return { home: a.def.short, away: b.def.short, score: a.score + ' - ' + b.score, time: (this.half === 1 ? '1º T ' : '2º T ') + this.timeStr(), homeColor: a.def.primary, awayColor: b.def.primary };
  };
  proto.msg = function (t, sub, secs, color) { this.hud.show(t, sub, secs, color); this.lastMsg = t; };
  proto.updateBoard = function () {
    var a = this.teams[0], b = this.teams[1];
    FG.stadium.setScoreboard([a.def.short + '  ' + a.score + ' x ' + b.score + '  ' + b.def.short, this.timeStr(), this.lastMsg || 'FOOTBALL GO']);
  };
  // linha do penúltimo defensor (em coordenadas "d*x" do atacante)
  proto.offsideLineFor = function (T) {
    var O = this.opp(T), d = T.dir, vals = [];
    this.active(O).forEach(function (q) { vals.push(d * q.pos.x); });
    vals.sort(function (a, b) { return b - a; });
    return vals.length > 1 ? vals[1] : 0;
  };
  proto.isOffsidePos = function (q, line) {
    var d = q.team.dir, x = d * q.pos.x, bx = d * this.ball.pos.x;
    return x > 0.5 && x > bx + 0.2 && x > line + 0.3;
  };

  /* ---------- eventos da bola ---------- */
  proto.ballEvent = function (ev, data) {
    var M = this;
    if (ev === 'post') { if (M.time - M.lastPost > 0.5) { FG.audio.post(); FG.audio.ooh(); M.lastPost = M.time; if (M.state === 'play') M.msg('NA TRAVE!', null, 1.5, '#ffd23f'); } }
    else if (ev === 'net') FG.audio.net();
    else if (ev === 'bounce') FG.audio.thud(data);
    else if (ev === 'touch') M.onTouch(data);
  };
  proto.onTouch = function (t) {
    var M = this, p = t.player; if (!p) return;
    if (M.ball.owner && M.ball.owner !== p) M.ball.owner = null;
    if (p.human) { M.stats.humanTouches++; }
    // set piece em andamento -> o primeiro toque recomeça o jogo
    if (M.state === 'setpiece' && M.sp && M.sp.humanTakes && p.human) {
      M.state = 'play'; M.sp.done = true;
      if (M.sp.type !== 'penalty') M.noOffside = M.sp.type !== 'freekick' && M.sp.type !== 'kickoff' ? true : false;
    }
    if (M.state !== 'play') return;
    // impedimento
    var snap = M.offSnap;
    if (snap) {
      if (p.team !== snap.team) M.offSnap = null;
      else if (p !== snap.kicker && snap.list.indexOf(p) >= 0) { M.callOffside(p); return; }
      else if (p !== snap.kicker) M.offSnap = null;
    }
    if (t.kick && !M.noOffside) {
      var line = M.offsideLineFor(p.team), list = [];
      M.active(p.team).forEach(function (q) { if (q !== p && M.isOffsidePos(q, line)) list.push(q); });
      M.offSnap = { team: p.team, kicker: p, list: list };
    } else if (t.kick) M.offSnap = null;
    M.noOffside = false;
    // assistência
    if (M.lastToucher && M.lastToucher !== p && M.lastToucher.team === p.team) M.prevToucher = M.lastToucher; else if (!M.lastToucher || M.lastToucher.team !== p.team) M.prevToucher = null;
    M.lastToucher = p;
    // chute do humano em direção ao gol
    if (p.human && t.kick && M.ball.vel.length() > 12 && M.ball.vel.x * p.team.dir > 6) { M.stats.humanShots++; M.stats.shots[p.team.side]++; }
  };

  /* ---------- reinícios ---------- */
  proto.kickoff = function (T, first) {
    var M = this;
    M.state = 'setpiece'; M.timer = 0;
    M.ball.place(0, 0); M.ball.owner = null; M.offSnap = null;
    M.teams.forEach(function (TT) {
      M.active(TT).forEach(function (p) {
        var fx = Math.min(p.fx, 0.44), fz = p.fz;
        if (TT !== T && fx > 0.36) fx = 0.36;
        M.worldPos(TT, fx, fz, p.pos);
        p.vel.set(0, 0, 0); p.face = TT.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (p.human) M.human.teleport(p.pos.x, p.pos.z, p.face);
      });
    });
    var taker = null;
    if (T === M.humanTeam) {
      taker = M.human.player;
      M.human.teleport(-T.dir * 1.2, 0, T.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    } else {
      taker = M.active(T).filter(function (p) { return p.role === 'FW'; })[0] || M.active(T)[1];
      taker.pos.set(-T.dir * 0.4, 0, 0);
    }
    M.sp = { type: 'kickoff', team: T, pos: new THREE.Vector3(0, 0, 0), taker: taker, humanTakes: taker.human, t: 0, wait: first ? 3 : 2, wall: [], info: {} };
    if (first) { M.msg(M.teams[0].def.name + ' x ' + M.teams[1].def.name, 'Saída de bola: ' + T.def.name + (taker.human ? ' — é com você! Toque na bola para começar.' : ''), 4); }
    else if (taker.human) M.msg('Saída de bola', 'Toque na bola para recomeçar o jogo.', 3);
    if (!taker.human) M.ball.held = function (p) { p.set(0, M.ball.r, 0); };
    FG.audio.whistle();
  };

  proto.setPiece = function (type, T, x, z, info) {
    var M = this;
    M.state = 'setpiece'; M.timer = 0; M.offSnap = null; M.ball.owner = null;
    var pos = new THREE.Vector3(x, 0, z);
    M.ball.place(x, z);
    var humanTakes = false, taker = null;
    if (T === M.humanTeam && (type === 'penalty' || (type === 'freekick' && d2(x, z, T.dir * P.HL, 0) < 36))) humanTakes = true;
    if (humanTakes) {
      taker = M.human.player;
      var gx = T.dir * P.HL, ang = Math.atan2(gx - x, 0 - z);
      M.human.teleport(x - Math.sin(ang) * 1.6, z - Math.cos(ang) * 1.6, ang);
    } else {
      var best = 1e9;
      M.active(T).forEach(function (p) {
        if (p.human || (p.role === 'GK' && type !== 'goalkick')) return;
        if (type === 'goalkick' && p.role !== 'GK') return;
        var dd = d2(p.pos.x, p.pos.z, x, z); if (dd < best) { best = dd; taker = p; }
      });
      if (type === 'penalty') taker = M.active(T).filter(function (p) { return p.role === 'FW' && !p.human; })[0] || taker;
      M.ball.held = function (p) { p.set(x, M.ball.r, z); };
    }
    M.sp = { type: type, team: T, pos: pos, taker: taker, humanTakes: humanTakes, t: 0, wait: type === 'penalty' ? 3 : type === 'throwin' ? 1.6 : 2.4, info: info || {} };
    // barreira
    M.sp.wall = [];
    if (type === 'freekick') {
      var O = M.opp(T), gx2 = O.dir * -P.HL, toG = new THREE.Vector3(-T.dir * -P.HL - x, 0, -z);
      var goalX = T.dir * P.HL; toG.set(goalX - x, 0, -z);
      var dist = toG.length();
      if (dist < 32) {
        toG.normalize();
        var n = M.o.size >= 11 ? 4 : M.o.size >= 7 ? 3 : 2;
        var cands = M.active(O).filter(function (p) { return p.role !== 'GK' && !p.human; }).slice(0, n + 2);
        cands.sort(function (a, b) { return d2(a.pos.x, a.pos.z, x, z) - d2(b.pos.x, b.pos.z, x, z); });
        for (var i = 0; i < Math.min(n, cands.length); i++) {
          var off = (i - (n - 1) / 2) * 0.62;
          cands[i].wallPos = new THREE.Vector3(x + toG.x * 9.15 - toG.z * off, 0, z + toG.z * 9.15 + toG.x * off);
          M.sp.wall.push(cands[i]);
        }
      }
    }
    if (type === 'penalty') {
      M.teams.forEach(function (TT) {
        M.active(TT).forEach(function (p) {
          if (p === taker || p.role === 'GK') return;
          // fora da área e atrás da bola
          var ox = T.dir * (P.HL - P.BOX_D - 2 - Math.random() * 6);
          var pz = (Math.random() - 0.5) * 30;
          if (p.human) M.human.teleport(ox, pz, T.dir > 0 ? Math.PI / 2 : -Math.PI / 2); else p.pos.set(ox, 0, pz);
        });
      });
    }
  };

  proto.callOffside = function (p) {
    var M = this, O = M.opp(p.team);
    FG.audio.whistle();
    M.msg('IMPEDIMENTO!', (p.human ? 'Você estava' : p.name + ' estava') + ' à frente do penúltimo defensor no momento do passe. Tiro livre indireto para ' + O.def.name + '.', 4.5, '#ffd23f');
    M.events.push('offside');
    M.setPiece('freekick', O, clamp(p.pos.x, -P.HL + 1, P.HL - 1), clamp(p.pos.z, -P.HW + 1, P.HW - 1), { indirect: true });
  };

  proto.foul = function (offender, victim) {
    var M = this, T = victim.team, x = M.ball.pos.x, z = M.ball.pos.z;
    offender.team.fouls++;
    FG.audio.whistle();
    var inBox = T.dir * x > P.HL - P.BOX_D && Math.abs(z) < P.BOX_HW;
    var card = Math.random() < 0.28 ? 'yellow' : null;
    if (inBox && Math.random() < 0.25) card = 'yellow';
    if (Math.random() < 0.03) card = 'red';
    var txt = offender.name + ' (' + offender.team.def.short + ') fez falta em ' + (victim.human ? 'você' : victim.name) + '.';
    if (card === 'yellow') {
      offender.yellow++;
      if (offender.yellow >= 2) { card = 'red'; txt += ' Segundo amarelo = VERMELHO!'; }
      else txt += ' Cartão AMARELO (advertência).';
    }
    if (card === 'red') {
      if (txt.indexOf('VERMELHO') < 0) txt += ' Cartão VERMELHO direto: expulso!';
      if (offender.role !== 'GK' && !offender.human) { offender.sentOff = true; if (offender.h) offender.h.root.visible = false; }
    }
    if (inBox) {
      M.msg('PÊNALTI!', txt + ' Falta dentro da área = pênalti.', 5, '#ff5a5a');
      M.setPiece('penalty', T, T.dir * (P.HL - P.SPOT), 0);
    } else {
      M.msg(card === 'red' ? 'CARTÃO VERMELHO' : card === 'yellow' ? 'CARTÃO AMARELO' : 'FALTA!', txt + ' Tiro livre direto.', 4.5, card === 'red' ? '#ff3b3b' : card === 'yellow' ? '#ffd23f' : '#ffffff');
      M.setPiece('freekick', T, clamp(x, -P.HL + 1, P.HL - 1), clamp(z, -P.HW + 1, P.HW - 1));
    }
  };

  /* ---------- loop ---------- */
  proto.update = function (dt, input) {
    var M = this, B = M.ball;
    M.time += dt; M.timer += dt;
    var H = M.human;
    // humano
    var humanFrozen = M.state === 'goal' || M.state === 'halftime' || M.state === 'fulltime';
    H.canMove = !humanFrozen;
    H.update(dt, input, B, { noBall: M.state === 'goal' || M.state === 'fulltime' || (M.state === 'setpiece' && !(M.sp && M.sp.humanTakes)) });

    if (M.state === 'play') {
      M.clock += dt;
      var lt = B.lastTouch && B.lastTouch.team; if (lt) M.stats.poss[lt.side] += dt;
      if (M.clock >= M.halfLen) { M.endHalf(); }
    } else if (M.state === 'setpiece') {
      M.updateSetPiece(dt);
    } else if (M.state === 'goal') {
      if (M.timer > 4.5) M.kickoff(M.goalConceder, false);
    } else if (M.state === 'halftime') {
      if (M.timer > 4) {
        M.half = 2; M.clock = 0;
        M.teams.forEach(function (T) { T.dir = -T.dir; });
        M.kickoff(M.teams[1], false);
        M.msg('2º TEMPO', 'Os times trocaram de lado. Agora você ataca para o outro gol!', 4);
      }
    } else if (M.state === 'fulltime') {
      if (M.timer > 4 && !M.ended) { M.ended = true; if (M.o.onEnd) M.o.onEnd(M.result()); }
    }

    // IA
    var t0 = M.teams[0], t1 = M.teams[1];
    M.ownerCheck(dt);
    [t0, t1].forEach(function (T) { M.updateTeam(T, dt); });
    M.updateRef(dt);
    B.step(dt);
    if (M.state === 'play') M.checkBall();
    M.animate(dt);
    // linha de impedimento (para o seu time)
    if (FG.save.settings.offsideHelp && M.state === 'play') {
      var ln = M.offsideLineFor(M.humanTeam);
      M.offLine.visible = ln > 0; M.offLine.position.x = M.humanTeam.dir * ln;
    } else M.offLine.visible = false;
    M.hud.setScore(M.scoreInfo());
    if (Math.floor(M.time) !== M._lastBoard) { M._lastBoard = Math.floor(M.time); M.updateBoard(); }
  };

  proto.endHalf = function () {
    var M = this; M.ball.owner = null;
    if (M.half === 1) {
      M.state = 'halftime'; M.timer = 0; FG.audio.whistle('long');
      M.msg('INTERVALO', M.teams[0].def.short + ' ' + M.teams[0].score + ' x ' + M.teams[1].score + ' ' + M.teams[1].def.short + ' — no futebol real o intervalo dura 15 minutos.', 4);
      M.ball.held = function (p) { p.set(0, M.ball.r, 0); };
    } else {
      M.state = 'fulltime'; M.timer = 0; FG.audio.whistle('end'); FG.audio.cheer(0.6);
      var a = M.teams[0], b = M.teams[1];
      M.msg('FIM DE JOGO', a.def.name + ' ' + a.score + ' x ' + b.score + ' ' + b.def.name, 4.5);
      M.ball.held = function (p) { p.set(0, M.ball.r, 0); };
    }
  };

  proto.result = function () {
    var a = this.teams[0], b = this.teams[1], tot = this.stats.poss[0] + this.stats.poss[1] || 1;
    return { home: a.def, away: b.def, hs: a.score, as: b.score, stats: this.stats, poss: Math.round(this.stats.poss[0] / tot * 100) };
  };

  proto.checkBall = function () {
    var M = this, B = M.ball, p = B.pos, r = B.r;
    var ax = Math.abs(p.x);
    if (ax > P.HL + r && Math.abs(p.z) < P.GOAL_HW && p.y < P.GOAL_H) {
      // GOL
      var s = Math.sign(p.x), T = M.teams[0].dir === s ? M.teams[0] : M.teams[1];
      M.goal(T); return;
    }
    if (ax > P.HL + r) {
      var s2 = Math.sign(p.x), def = M.teams[0].dir === -s2 ? M.teams[0] : M.teams[1], att = M.opp(def);
      var lt = B.lastTouch && B.lastTouch.team;
      if (lt === def) {
        M.msg('ESCANTEIO', 'A bola saiu pela linha de fundo depois de tocar num defensor do ' + def.def.short + '.', 3);
        M.setPiece('corner', att, s2 * (P.HL - 0.3), Math.sign(p.z || 1) * (P.HW - 0.3));
      } else {
        M.msg('TIRO DE META', 'O último toque foi do ataque: a bola volta para o goleiro do ' + def.def.short + '.', 3);
        M.setPiece('goalkick', def, s2 * (P.HL - 5), Math.sign(p.z || 1) * 4);
      }
      FG.audio.whistle(); return;
    }
    if (Math.abs(p.z) > P.HW + r) {
      var lt2 = B.lastTouch && B.lastTouch.team, T2 = lt2 ? M.opp(lt2) : M.teams[0];
      M.msg('LATERAL', 'Bola fora pela linha lateral. Lateral para ' + T2.def.name + '.', 2.5);
      M.setPiece('throwin', T2, clamp(p.x, -P.HL + 1, P.HL - 1), Math.sign(p.z) * (P.HW + 0.3));
      FG.audio.whistle(); return;
    }
  };

  proto.goal = function (T) {
    var M = this, B = M.ball;
    T.score++;
    M.state = 'goal'; M.timer = 0; M.goalConceder = M.opp(T); B.owner = null;
    var lt = B.lastTouch && B.lastTouch.player, own = lt && lt.team !== T;
    var name = lt ? (lt.human ? 'VOCÊ' : lt.name) : '';
    if (lt && lt.human && !own) M.stats.humanGoals++;
    if (!own && M.prevToucher && M.prevToucher.human && lt && !lt.human) M.stats.humanAssists++;
    M.stats.shots[T.side]++;
    FG.audio.goal(); FG.audio.whistle();
    var homeGoal = T === M.teams[0];
    M.msg(own ? 'GOL CONTRA!' : 'GOOOOL!', (own ? name + ' marcou contra. ' : (lt && lt.human ? 'Que golaço! Você marcou para o ' : name + ' marcou para o ')) + (own ? '' : T.def.name + '. ') + M.teams[0].def.short + ' ' + M.teams[0].score + ' x ' + M.teams[1].score + ' ' + M.teams[1].def.short, 4.5, homeGoal ? '#35d07f' : '#ff7b5a');
    M.scorerTeam = T;
    M.events.push('goal');
    if (FG.vibrate && homeGoal) FG.vibrate(1, 300);
  };

  /* ---------- posse e disputa ---------- */
  proto.ownerCheck = function (dt) {
    var M = this, B = M.ball;
    if (M.state !== 'play') return;
    var o = B.owner;
    if (o && (o.sentOff || d2(o.pos.x, o.pos.z, B.pos.x, B.pos.z) > 1.4 || B.held)) { B.owner = null; o = null; }
    var humanRecent = B.lastTouch && B.lastTouch.player && B.lastTouch.player.human && FG.now - B.lastTouch.time < 0.45;
    var hd = d2(M.human.pos.x, M.human.pos.z, B.pos.x, B.pos.z);
    M.teams.forEach(function (T) {
      M.active(T).forEach(function (p) {
        if (p.human || p.cd > 0 || p === o) return;
        var dd = d2(p.pos.x, p.pos.z, B.pos.x, B.pos.z);
        if (p.role === 'GK') {
          if (p.gkHold || B.held || (o && o.team === T) || dd > 0.95 || B.pos.y > 2.4 || !M.inOwnBox(T, B.pos)) return;
          if (o && Math.random() > T.skill * dt * 3) return;
          M.gkCatch(p); return;
        }
        if (dd > 0.75 || B.pos.y > 1.7) return;
        var rel = Math.sqrt(Math.pow(B.vel.x - p.vel.x, 2) + Math.pow(B.vel.z - p.vel.z, 2));
        if (o) {
          if (o.team === T) return;
          // desarme
          var chance = (0.9 + T.skill) * dt * (1.2 - o.team.skill * 0.5);
          if (Math.random() < chance) {
            if (Math.random() < 0.13) { M.foul(p, o); return; }
            B.owner = Math.random() < 0.55 ? p : null;
            if (!B.owner) { B.vel.set(rnd(-4, 4), 0.5, rnd(-4, 4)); }
            o.cd = 0.6; B.touch(p, T, false); o = B.owner;
          }
          return;
        }
        // humano protegendo a bola
        if (humanRecent && hd < 1.2 && T !== M.humanTeam) {
          if (Math.random() > (0.8 * T.skill) * dt * 2) return;
          if (Math.random() < 0.08 && hd < 0.9) { M.foul(p, M.human.player); return; }
        } else if (humanRecent && T === M.humanTeam) return;
        if (rel > 11 && B.pos.y > 0.3) {
          // bola forte: desvia no corpo
          B.vel.multiplyScalar(-0.25); B.vel.y = Math.abs(B.vel.y) * 0.3 + 0.5; B.touch(p, T, false); p.cd = 0.3; return;
        }
        B.owner = p; o = p; B.touch(p, T, false); p.decT = 0;
      });
    });
  };
  proto.inOwnBox = function (T, pos) { return -T.dir * pos.x > P.HL - P.BOX_D && Math.abs(pos.z) < P.BOX_HW; };

  /* ---------- times e IA ---------- */
  proto.updateTeam = function (T, dt) {
    var M = this, B = M.ball, O = M.opp(T);
    var players = M.active(T);
    var poss = (B.owner && B.owner.team === T) || (!B.owner && B.lastTouch && B.lastTouch.team === T);
    var humanHas = T === M.humanTeam && B.lastTouch && B.lastTouch.player && B.lastTouch.player.human && d2(M.human.pos.x, M.human.pos.z, B.pos.x, B.pos.z) < 3;
    // quem persegue a bola
    var chaser = null, cover = null, best = 1e9, best2 = 1e9;
    if (M.state === 'play' && !(B.owner && B.owner.team === T) && !humanHas) {
      players.forEach(function (p) {
        if (p.role === 'GK' || p.human) return;
        var dd = d2(p.pos.x, p.pos.z, B.pos.x, B.pos.z);
        if (dd < best) { best2 = best; cover = chaser; best = dd; chaser = p; } else if (dd < best2) { best2 = dd; cover = p; }
      });
      if (T === M.humanTeam) {
        var hd = d2(M.human.pos.x, M.human.pos.z, B.pos.x, B.pos.z);
        if (hd < best * 0.85 && hd < 14) { cover = chaser; chaser = null; }
      }
      if (!(B.owner && B.owner.team === O)) cover = null;
    }
    var bnx = (T.dir * B.pos.x / P.HL + 1) / 2;
    players.forEach(function (p) {
      p.cd -= dt; p.dec -= dt;
      if (p.kickT >= 0) { p.kickT += dt * 3; if (p.kickT > 1) p.kickT = -1; }
      if (p.human) return;
      if (p.role === 'GK') { M.updateGK(p, dt); return; }
      var target = M._tg || (M._tg = new THREE.Vector3()), speed = 3.2;
      var maxS = 6.2 + T.skill * 1.6;
      if (M.state === 'setpiece') {
        M.setPieceTarget(p, target); speed = d2(p.pos.x, p.pos.z, target.x, target.z) > 2 ? maxS * 0.8 : 2;
      } else if (M.state !== 'play') {
        if (M.state === 'goal' && T === M.scorerTeam) { target.set(T.dir * P.HL * 0.6 + Math.sin(p.idx) * 8, 0, Math.cos(p.idx * 2) * 15); speed = 4; p.celebrate = true; }
        else { target.copy(p.pos); speed = 0; p.celebrate = false; }
      } else {
        p.celebrate = false;
        if (B.owner === p) { M.carrier(p, dt, target); speed = maxS * 0.8; }
        else if (p === chaser) {
          // intercepta
          var pred = M._pr || (M._pr = new THREE.Vector3());
          for (var t = 0.1; t <= 2.0; t += 0.15) { B.predict(t, pred); if (d2(p.pos.x, p.pos.z, pred.x, pred.z) / maxS <= t) break; }
          target.set(pred.x, 0, pred.z); speed = maxS;
        } else if (p === cover) {
          var gx = -T.dir * P.HL;
          target.set(B.pos.x + (gx - B.pos.x) * 0.25, 0, B.pos.z * 0.75); speed = maxS * 0.85;
        } else {
          // posicionamento tático
          var fx = p.fx + (bnx - 0.5) * 0.55 + (poss ? 0.1 : -0.06);
          if (humanHas && p.role !== 'DF') fx += 0.08;
          fx = clamp(fx, 0.06, p.role === 'DF' ? 0.68 : 0.93);
          var fz = p.fz * 0.85 + (B.pos.z / P.HW) * 0.3;
          M.worldPos(T, fx, fz, target);
          // atacantes evitam impedimento
          if (poss && p.role !== 'DF') {
            var line = M.offsideLineFor(T), bx = T.dir * B.pos.x;
            var lim = Math.max(line, bx) - 0.6;
            if (T.dir * target.x > lim) target.x = T.dir * lim;
          }
          var dd2 = d2(p.pos.x, p.pos.z, target.x, target.z);
          speed = dd2 > 6 ? maxS * 0.85 : dd2 > 1.5 ? 3.5 : 1.2;
        }
      }
      M.steer(p, target, speed, dt);
    });
  };

  proto.steer = function (p, target, speed, dt) {
    var M = this, dx = target.x - p.pos.x, dz = target.z - p.pos.z, d = Math.sqrt(dx * dx + dz * dz);
    var vx = 0, vz = 0;
    if (d > 0.2 && speed > 0) { var s = Math.min(speed, d * 2.5); vx = dx / d * s; vz = dz / d * s; }
    // separação
    M.teams.forEach(function (T) {
      T.players.forEach(function (q) {
        if (q === p || q.sentOff) return;
        var ex = p.pos.x - q.pos.x, ez = p.pos.z - q.pos.z, e = Math.sqrt(ex * ex + ez * ez);
        if (e < 1.1 && e > 0.001) { var f = (1.1 - e) * 4; vx += ex / e * f; vz += ez / e * f; }
      });
    });
    var a = 1 - Math.exp(-dt * 4);
    p.vel.x += (vx - p.vel.x) * a; p.vel.z += (vz - p.vel.z) * a;
    p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
    p.pos.x = clamp(p.pos.x, -P.HL - 3, P.HL + 3); p.pos.z = clamp(p.pos.z, -P.HW - 2.5, P.HW + 2.5);
    var sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    if (sp > 0.5) p.faceT = Math.atan2(p.vel.x, p.vel.z);
    else p.faceT = Math.atan2(M.ball.pos.x - p.pos.x, M.ball.pos.z - p.pos.z);
    var df = p.faceT - p.face; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
    p.face += df * Math.min(1, dt * 8);
  };

  // jogador com a bola
  proto.carrier = function (p, dt, target) {
    var M = this, B = M.ball, T = p.team, O = M.opp(T), d = T.dir;
    var gx = d * P.HL, distG = d2(p.pos.x, p.pos.z, gx, 0);
    var nearest = 1e9, nOpp = null;
    M.active(O).forEach(function (q) { var dd = d2(q.pos.x, q.pos.z, p.pos.x, p.pos.z); if (dd < nearest) { nearest = dd; nOpp = q; } });
    // direção de condução
    var dirx = gx - p.pos.x, dirz = (0 - p.pos.z) * 0.6;
    if (nOpp && nearest < 5) {
      var ax = nOpp.pos.x - p.pos.x, az = nOpp.pos.z - p.pos.z;
      if (ax * d > -1) { dirz += -Math.sign(az || 1) * 6; }
    }
    var dl = Math.sqrt(dirx * dirx + dirz * dirz) || 1; dirx /= dl; dirz /= dl;
    target.set(p.pos.x + dirx * 4, 0, clamp(p.pos.z + dirz * 4, -P.HW + 2, P.HW - 2));
    // mantém a bola à frente
    if (B.pos.y < 0.5) {
      var bx = p.pos.x + Math.sin(p.face) * 0.6 + p.vel.x * 0.12, bz = p.pos.z + Math.cos(p.face) * 0.6 + p.vel.z * 0.12;
      B.vel.x += ((bx - B.pos.x) * 7 + p.vel.x - B.vel.x) * Math.min(1, dt * 8);
      B.vel.z += ((bz - B.pos.z) * 7 + p.vel.z - B.vel.z) * Math.min(1, dt * 8);
    }
    if (p.dec > 0) return;
    p.dec = 0.22 + Math.random() * 0.15;
    var sk = T.skill;
    // chutar?
    var angOk = Math.abs(p.pos.z) < 20 || distG < 14;
    var pShoot = distG < 27 && angOk ? clamp((27 - distG) / 22, 0, 1) * 0.55 + (distG < 13 ? 0.45 : 0) : 0;
    if (Math.random() < pShoot) { M.shoot(p); return; }
    // passar?
    var pressure = nearest < 2.8;
    if (pressure || Math.random() < 0.12 || (p.role === 'DF' && Math.random() < 0.35)) {
      var c = M.choosePass(p);
      if (c && (pressure || c.score > 1.6)) { M.pass(p, c.q); return; }
    }
  };

  proto.choosePass = function (p) {
    var M = this, T = p.team, O = M.opp(T), d = T.dir, best = null, bs = -1e9;
    var line = M.offsideLineFor(T);
    var opps = M.active(O);
    M.active(T).forEach(function (q) {
      if (q === p || q.role === 'GK') return;
      var dist = d2(p.pos.x, p.pos.z, q.pos.x, q.pos.z);
      if (dist < 4 || dist > 42) return;
      if (M.isOffsidePos(q, line)) return;
      var prog = d * (q.pos.x - p.pos.x);
      var lane = 8, recv = 8;
      opps.forEach(function (o) {
        // distância ao segmento p->q
        var vx = q.pos.x - p.pos.x, vz = q.pos.z - p.pos.z, wx = o.pos.x - p.pos.x, wz = o.pos.z - p.pos.z;
        var t = clamp((vx * wx + vz * wz) / (vx * vx + vz * vz), 0, 1);
        var cx = p.pos.x + vx * t - o.pos.x, cz = p.pos.z + vz * t - o.pos.z;
        lane = Math.min(lane, Math.sqrt(cx * cx + cz * cz));
        recv = Math.min(recv, d2(o.pos.x, o.pos.z, q.pos.x, q.pos.z));
      });
      var s = prog * 0.12 + Math.min(lane, 5) * 0.55 + recv * 0.3 - dist * 0.025 + (q.human ? 1.6 : 0) + Math.random() * 0.4;
      if (lane < 1.2) s -= 3;
      if (s > bs) { bs = s; best = q; }
    });
    return best ? { q: best, score: bs } : null;
  };

  proto.aiKick = function (p, speed, loft, ty) {
    var B = this.ball, sk = p.team.skill;
    var err = (Math.random() - 0.5) * 2 * (1.1 - sk) * 0.13;
    var c = Math.cos(err), s = Math.sin(err), vx = B.vel.x, vz = B.vel.z;
    B.vel.x = vx * c - vz * s; B.vel.z = vx * s + vz * c;
    B.vel.multiplyScalar(1 + (Math.random() - 0.5) * 0.08);
    B.owner = null; B.held = null; p.cd = 0.5; p.kickT = 0.2;
    B.touch(p, p.team, true);
    FG.audio.kick(Math.min(1, speed / 28));
  };
  proto.pass = function (p, q) {
    var B = this.ball, dist = d2(B.pos.x, B.pos.z, q.pos.x, q.pos.z);
    var speed = clamp(7 + dist * 0.42, 9, 24), t = dist / speed;
    var tx = q.pos.x + q.vel.x * t * 0.9, tz = q.pos.z + q.vel.z * t * 0.9;
    if (q.human) { var f = this.human.yaw; tx += Math.sin(f) * 0.6; tz += Math.cos(f) * 0.6; }
    var loft = dist > 26 && Math.random() < 0.7;
    B.kickTo(tx, tz, loft ? 17 : speed, loft);
    this.aiKick(p, speed, loft);
    p.lastPass = q;
  };
  proto.shoot = function (p) {
    var M = this, B = M.ball, T = p.team, gx = T.dir * P.HL;
    var side = Math.random() < 0.5 ? -1 : 1, sk = T.skill;
    var tz = side * rnd(0.6, P.GOAL_HW - 0.35), ty = Math.random() < 0.55 ? rnd(0.2, 0.7) : rnd(0.8, 2.1);
    var speed = rnd(19, 25) + sk * 5;
    B.kickTo(gx + T.dir * 0.5, tz, speed, false, ty);
    M.aiKick(p, speed);
    B.spin.set(0, (Math.random() - 0.5) * 12, 0);
    M.stats.shots[T.side]++;
  };

  /* ---------- goleiro ---------- */
  proto.gkCatch = function (g) {
    var M = this, B = M.ball, d = g.team.dir;
    B.owner = null; B.vel.set(0, 0, 0); B.spin.set(0, 0, 0);
    g.gkHold = 1.4; g.dive = 0;
    B.held = function (p) { p.set(g.pos.x + Math.sin(g.face) * 0.35, 1.1, g.pos.z + Math.cos(g.face) * 0.35); };
    B.touch(g, g.team, false);
    M.offSnap = null;
  };
  proto.updateGK = function (g, dt) {
    var M = this, B = M.ball, T = g.team, d = T.dir, goalX = -d * P.HL, sk = T.skill;
    var target = M._gt || (M._gt = new THREE.Vector3());
    if (M.state === 'setpiece' && M.sp && M.sp.type === 'goalkick' && M.sp.team === T) { M.setPieceTarget(g, target); M.steer(g, target, 4, dt); return; }
    if (g.gkHold > 0) {
      g.gkHold -= dt; target.set(goalX + d * 6, 0, g.pos.z * 0.8); M.steer(g, target, 1.5, dt);
      if (g.gkHold <= 0 && M.state === 'play') {
        // distribui
        var c = M.choosePass(g);
        B.held = null;
        if (c && d2(g.pos.x, g.pos.z, c.q.pos.x, c.q.pos.z) < 30) { M.pass(g, c.q); }
        else { var tx = d * rnd(0, 20), tz = rnd(-20, 20); B.kickTo(tx, tz, 22, true); M.aiKick(g, 25, true); }
        M.noOffside = false;
      } else if (M.state !== 'play') g.gkHold = Math.max(g.gkHold, 0.5);
      return;
    }
    // ameaça de chute
    var vx = B.vel.x * -d;
    if (!B.held && vx > 5 && M.state === 'play') {
      var tc = (goalX - B.pos.x) / B.vel.x;
      if (tc > 0 && tc < 1.6) {
        var zc = B.pos.z + B.vel.z * tc, yc = Math.max(0.11, B.pos.y + B.vel.y * tc - 4.9 * tc * tc);
        if (!g.react && Math.abs(zc) < P.GOAL_HW + 1) { g.react = { t: rnd(0.12, 0.28) * (1.3 - sk), zc: zc, yc: yc, tried: false }; }
      }
    } else if (g.react && (vx < 2 || B.held)) g.react = null;
    if (g.react) {
      g.react.t -= dt;
      var R = g.react;
      if (R.t <= 0) {
        // mergulho
        var dz = R.zc - g.pos.z;
        if (Math.abs(dz) > 0.5 && !g.dive) g.dive = Math.sign(dz);
        var mv = clamp(dz, -6 * dt, 6 * dt); g.pos.z += mv; g.vel.z = mv / dt;
      }
      // tentativa de defesa
      if (!R.tried && Math.abs(B.pos.x - g.pos.x) < 0.7) {
        R.tried = true;
        var reach = g.dive ? 1.35 : 0.65, bz = Math.abs(B.pos.z - g.pos.z);
        if (bz < reach && B.pos.y < (g.dive ? 1.9 : 2.35)) {
          var spd = B.vel.length();
          var prob = clamp(sk * 1.1 - (spd - 18) * 0.025 - (bz > 0.9 ? 0.2 : 0) - (B.pos.y > 1.6 ? 0.1 : 0), 0.12, 0.93);
          if (Math.random() < prob) {
            if (spd < 18 && Math.random() < sk) M.gkCatch(g);
            else { B.vel.x = d * (Math.abs(B.vel.x) * 0.3 + 2); B.vel.z += Math.sign(B.pos.z - g.pos.z || 1) * rnd(3, 6); B.vel.y = Math.abs(B.vel.y) * 0.4 + 2; B.touch(g, T, false); B.spin.set(0, 0, 0); }
            FG.audio.ooh(); M.msg('QUE DEFESA!', g.name + ' salvou o ' + T.def.short + '!', 2, '#9fd8ff');
          }
        }
      }
      if (g.dive) { g.diveT = (g.diveT || 0) + dt; if (g.diveT > 1.1) { g.dive = 0; g.diveT = 0; g.react = null; } }
      return;
    }
    g.dive = 0;
    // posicionamento
    var bd = d2(B.pos.x, B.pos.z, goalX, 0);
    var out = clamp(bd < 20 ? 1 + (20 - bd) * 0.08 : 1.6, 0.8, 3.0);
    var ang = Math.atan2(B.pos.z, (B.pos.x - goalX) * d);
    target.set(goalX + d * Math.cos(ang) * out, 0, clamp(Math.sin(ang) * out * 1.2, -P.GOAL_HW + 0.3, P.GOAL_HW - 0.3));
    var speed = 4;
    // sai para pegar bola solta na área
    if (M.state === 'play' && !B.owner && M.inOwnBox(T, B.pos) && B.vel.length() < 9) {
      var closest = true, gd = d2(g.pos.x, g.pos.z, B.pos.x, B.pos.z);
      M.active(M.opp(T)).forEach(function (q) { if (d2(q.pos.x, q.pos.z, B.pos.x, B.pos.z) < gd * 0.8) closest = false; });
      if (closest) { target.set(B.pos.x, 0, B.pos.z); speed = 6; }
    }
    if (M.state === 'setpiece' && M.sp && M.sp.type === 'penalty' && M.sp.team !== T) { target.set(goalX + d * 0.2, 0, 0); speed = 3; }
    M.steer(g, target, speed, dt);
  };

  /* ---------- bolas paradas ---------- */
  proto.setPieceTarget = function (p, target) {
    var M = this, sp = M.sp, T = p.team, B = M.ball;
    if (p === sp.taker && !sp.humanTakes) {
      var gx = T.dir * P.HL, ang = Math.atan2(gx - sp.pos.x, -sp.pos.z);
      if (sp.type === 'throwin') { target.set(sp.pos.x, 0, sp.pos.z + Math.sign(sp.pos.z) * 0.4); return; }
      target.set(sp.pos.x - Math.sin(ang) * 0.9, 0, sp.pos.z - Math.cos(ang) * 0.9); return;
    }
    if (p.wallPos && sp.wall.indexOf(p) >= 0) { target.copy(p.wallPos); return; }
    var bnx = (T.dir * B.pos.x / P.HL + 1) / 2, attacking = sp.team === T;
    var fx = p.fx + (bnx - 0.5) * 0.5 + (attacking ? 0.08 : -0.05);
    if (sp.type === 'corner') fx = attacking ? (p.role === 'DF' ? 0.55 : 0.88) : (p.role === 'GK' ? 0.02 : 0.1);
    if (sp.type === 'kickoff') fx = Math.min(p.fx, attacking ? 0.44 : 0.36);
    fx = clamp(fx, 0.05, 0.92);
    var fz = sp.type === 'corner' ? p.fz * 0.45 : p.fz * 0.85 + (B.pos.z / P.HW) * 0.3;
    M.worldPos(T, fx, fz, target);
    if (sp.type === 'penalty') { target.copy(p.pos); return; }
    // distância regulamentar
    if (!attacking && sp.type !== 'throwin') {
      var dx = target.x - sp.pos.x, dz = target.z - sp.pos.z, dd = Math.sqrt(dx * dx + dz * dz);
      if (dd < 9.5) { var k = 9.5 / (dd || 1); target.x = sp.pos.x + dx * k; target.z = sp.pos.z + dz * k; }
    }
  };

  proto.updateSetPiece = function (dt) {
    var M = this, sp = M.sp, B = M.ball;
    sp.t += dt;
    if (sp.humanTakes) {
      if (sp.t > 25) { sp.humanTakes = false; var tk = M.active(sp.team).filter(function (p) { return !p.human && p.role !== 'GK'; })[0]; sp.taker = tk; B.held = function (p) { p.set(sp.pos.x, B.r, sp.pos.z); }; }
      return;
    }
    var tk = sp.taker;
    if (!tk) { M.state = 'play'; B.held = null; return; }
    var dd = d2(tk.pos.x, tk.pos.z, sp.pos.x, sp.pos.z);
    if (sp.type === 'throwin' && dd < 1.5) { tk.throwIn = Math.min(1, Math.max(0.01, (sp.t - 0.5) / (sp.wait - 0.5))); B.held = function (p) { p.set(tk.pos.x + Math.sin(tk.face) * 0.15, 2.05, tk.pos.z + Math.cos(tk.face) * 0.15); }; }
    if (sp.t < sp.wait || (dd > 1.3 && sp.t < sp.wait + 3)) return;
    // executa
    B.held = null; tk.throwIn = 0;
    M.state = 'play';
    var T = sp.team, d = T.dir, type = sp.type;
    M.noOffside = type === 'throwin' || type === 'corner' || type === 'goalkick';
    if (type === 'penalty') {
      var side = Math.random() < 0.5 ? -1 : 1;
      B.kickTo(d * (P.HL + 0.5), side * rnd(1.2, 3.2), rnd(21, 26), false, rnd(0.2, 1.6)); M.aiKick(tk, 24); M.stats.shots[T.side]++;
    } else if (type === 'corner') {
      var hum = M.human.player.team === T && M.inOwnBox(M.opp(T), M.human.pos);
      var tx = hum ? M.human.pos.x : d * (P.HL - rnd(6, 12)), tz = hum ? M.human.pos.z : rnd(-6, 6);
      B.kickTo(tx, tz, 21, false, 1.6); M.aiKick(tk, 21); B.spin.set(0, -Math.sign(sp.pos.z) * d * 10, 0);
    } else if (type === 'goalkick') {
      var c = M.choosePass(tk);
      if (c && Math.random() < 0.5) M.pass(tk, c.q); else { B.kickTo(d * rnd(-5, 15), rnd(-22, 22), 24, true); M.aiKick(tk, 26, true); }
    } else if (type === 'throwin') {
      var best = null, bd = 1e9;
      M.active(T).forEach(function (q) { if (q === tk || q.role === 'GK') return; var x = d2(q.pos.x, q.pos.z, tk.pos.x, tk.pos.z); if (x < bd && x > 3) { bd = x; best = q; } });
      if (best) { B.pos.y = 2.0; B.kickTo(best.pos.x, best.pos.z, clamp(bd * 0.9, 8, 15), true); M.aiKick(tk, 8, true); }
    } else if (type === 'freekick') {
      var gd = d2(sp.pos.x, sp.pos.z, d * P.HL, 0);
      if (gd < 30 && !sp.info.indirect) { M.shoot(tk); B.vel.y += 2.2; }
      else { var c2 = M.choosePass(tk); if (c2) M.pass(tk, c2.q); else { B.kickTo(d * P.HL * 0.5, 0, 22, true); M.aiKick(tk, 22, true); } }
    } else if (type === 'kickoff') {
      var mates = M.active(T).filter(function (q) { return q !== tk && q.role !== 'GK'; });
      var r = pick(mates); B.kickTo(r.pos.x, r.pos.z, 10, false); M.aiKick(tk, 10);
    }
    sp.wall.forEach(function (p) { p.wallPos = null; });
  };

  /* ---------- árbitro ---------- */
  proto.updateRef = function (dt) {
    var M = this, R = M.ref, B = M.ball;
    var tx = B.pos.x - 8, tz = B.pos.z * 0.6 - 9 * Math.sign(B.pos.z || 1) * -1;
    tz = clamp(B.pos.z + (B.pos.z > 0 ? -10 : 10), -P.HW + 3, P.HW - 3);
    var dx = tx - R.pos.x, dz = tz - R.pos.z, d = Math.sqrt(dx * dx + dz * dz);
    var s = d > 4 ? Math.min(6, d) : 0;
    var a = 1 - Math.exp(-dt * 3);
    R.vel.x += ((d > 0.1 ? dx / d * s : 0) - R.vel.x) * a; R.vel.z += ((d > 0.1 ? dz / d * s : 0) - R.vel.z) * a;
    R.pos.x += R.vel.x * dt; R.pos.z += R.vel.z * dt;
    var face = Math.atan2(B.pos.x - R.pos.x, B.pos.z - R.pos.z);
    R.root.position.copy(R.pos); R.root.rotation.y = face;
    var sp = Math.sqrt(R.vel.x * R.vel.x + R.vel.z * R.vel.z);
    R.phase += sp * dt * 1.9;
    R.pose({ phase: R.phase, speed: sp, time: M.time });
  };

  /* ---------- animação ---------- */
  proto.animate = function (dt) {
    var M = this, blobs = [];
    M.teams.forEach(function (T) {
      T.players.forEach(function (p) {
        if (p.sentOff) return;
        blobs.push({ x: p.pos.x, z: p.pos.z, s: 0.9 });
        if (!p.h) return;
        var sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
        p.phase += sp * dt * 1.9;
        var r = p.h.root; r.position.set(p.pos.x, 0, p.pos.z); r.rotation.set(0, p.face, 0);
        var t = { phase: p.phase, speed: sp, time: M.time + p.idx, kick: p.kickT, celebrate: p.celebrate, throwIn: p.throwIn };
        if (p.role === 'GK') {
          t.gkReady = !p.dive && sp < 2 && !p.gkHold && M.state === 'play' && Math.abs(M.ball.pos.x - p.pos.x) < 35;
          if (p.dive) {
            t.dive = true; var k = Math.min(1, (p.diveT || 0) * 3);
            r.rotation.z = 0; r.rotateZ(p.dive * T.dir * 1.25 * k);
            r.position.y = Math.max(0, 0.35 * Math.sin(Math.min(1, (p.diveT || 0) * 2) * Math.PI));
          }
        }
        p.h.pose(t);
      });
    });
    blobs.push({ x: M.ball.pos.x, z: M.ball.pos.z, s: Math.max(0.12, 0.32 - M.ball.pos.y * 0.04) });
    blobs.push({ x: M.ref.pos.x, z: M.ref.pos.z, s: 0.9 });
    FG.stadium.setBlobs(blobs);
  };
})();
