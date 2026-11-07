/* Football Go - telas do menu em VR */
(function () {
  var S = FG.S = {};
  var Wd = 1024, Hd = 640;
  function app() { return FG.app; }
  function teamList() {
    var l = FG.TEAMS.slice();
    if (FG.save.club) l.unshift(FG.clubToTeam(FG.save.club, 'myclub'));
    return l;
  }
  function teamFor(id) {
    if (id === 'myclub' && FG.save.club) return FG.clubToTeam(FG.save.club, 'myclub');
    return FG.teamById(id);
  }
  FG.teamFor = teamFor;

  // camisa em miniatura
  function shirt(c, x, y, s, t) {
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    c.beginPath();
    c.moveTo(30, 0); c.lineTo(70, 0); c.lineTo(100, 18); c.lineTo(88, 40); c.lineTo(78, 34); c.lineTo(78, 100); c.lineTo(22, 100); c.lineTo(22, 34); c.lineTo(12, 40); c.lineTo(0, 18); c.closePath();
    c.fillStyle = t.primary; c.fill();
    c.save(); c.clip(); c.fillStyle = t.secondary;
    if (t.pattern === 'stripes') for (var i = 8; i < 100; i += 22) c.fillRect(i, 0, 10, 100);
    else if (t.pattern === 'hoops') for (var j = 14; j < 100; j += 24) c.fillRect(0, j, 100, 10);
    else if (t.pattern === 'halves') c.fillRect(50, 0, 50, 100);
    else if (t.pattern === 'sash') { c.beginPath(); c.moveTo(20, 0); c.lineTo(40, 0); c.lineTo(90, 100); c.lineTo(70, 100); c.fill(); }
    else if (t.pattern === 'checks') for (var a = 0; a < 100; a += 16) for (var b = 0; b < 100; b += 16) if (((a + b) / 16) % 2) c.fillRect(a, b, 16, 16);
    c.restore();
    c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
    c.fillStyle = t.secondary; c.beginPath(); c.arc(50, 2, 12, 0, Math.PI); c.fill();
    c.restore();
  }
  FG.drawShirt = shirt;
  function backBtn(ui, to) { ui.btn(40, 560, 180, 54, '◀ Voltar', function () { ui.open(to || S.main(), true); }); }
  function stars(r) { var n = Math.round((r - 60) / 7); var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }

  /* ---------- Menu principal ---------- */
  S.main = function () {
    return function (c, ui) {
      FG.showcase.hide();
      c.fillStyle = '#ffffff'; c.font = 'bold 58px Arial'; c.fillText('Football ', 40, 64);
      var w = c.measureText('Football ').width; c.fillStyle = '#35d07f'; c.fillText('Go', 40 + w, 64);
      c.fillStyle = '#ffd23f'; c.font = 'bold 24px Arial'; c.fillText('Play in VR without paying a lot!', 42, 108);
      c.textAlign = 'right'; c.fillStyle = '#ffd23f'; c.font = 'bold 30px Arial'; c.fillText('● ' + FG.save.coins + ' moedas', 984, 56);
      var st = FG.save.stats; c.font = '19px Arial'; c.fillStyle = '#9fd8b4';
      c.fillText(st.matches + ' jogos · ' + st.wins + 'V ' + st.draws + 'E ' + st.losses + 'D · ' + st.goals + ' gols', 984, 94); c.textAlign = 'left';
      var bx = 40, by = 140, bw = 462, bh = 82, g = 18;
      var items = [
        ['⚽  Partida Rápida', 'Escolha seleções e jogue', function () { ui.open(S.quick()); }, true],
        ['🥅  Pênaltis', 'Disputa: bata e defenda', function () { ui.open(S.quick(true)); }],
        ['📚  Escola de Futebol', 'Aprenda a jogar e as regras', function () { ui.open(S.school()); }],
        ['🏃  Treino Livre', 'Chutes, alvos e goleiro', function () { app().startTraining(); }],
        ['🛡  Clubes & Liga', FG.save.club ? FG.save.club.name : 'Crie seu clube', function () { ui.open(S.clubs()); }],
        ['🎁  Recompensas', FG.dailyReady() ? 'Bolsa grátis disponível!' : 'Bolsas de recompensa', function () { ui.open(S.store()); }],
        ['👟  Vestiário', 'Chuteiras e bolas', function () { ui.open(S.locker('boots')); }],
        ['⚙  Opções', 'Conforto, qualidade, áudio', function () { ui.open(S.options()); }]
      ];
      items.forEach(function (it, i) {
        var col = i % 2, row = Math.floor(i / 2);
        ui.btn(bx + col * (bw + g), by + row * (bh + g), bw, bh, it[0], it[2], { align: 'left', size: 30, sub: it[1], primary: it[3] });
      });
      ui.btn(40, 560, 300, 54, 'Créditos (VRFS)', function () { ui.open(S.credits()); }, { size: 22 });
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.font = '18px Arial'; c.textAlign = 'right';
      c.fillText(FG.inXR ? 'Gatilho: selecionar · Touchpad centro: pausa' : 'Clique para selecionar · Esc: pausa', 984, 590); c.textAlign = 'left';
    };
  };

  /* ---------- Configurar partida / pênaltis ---------- */
  S.quick = function (pens, league) {
    return function (c, ui) {
      var st = FG.save.settings;
      ui.title(pens ? 'Pênaltis' : 'Partida Rápida', pens ? 'Escolha os times da disputa' : 'Monte sua partida');
      var home = teamFor(st.team), away = teamFor(st.opp);
      // cartões dos times
      [[home, 'SEU TIME', 'team'], [away, 'ADVERSÁRIO', 'opp']].forEach(function (a, i) {
        var x = 40 + i * 330, y = 120;
        ui.btn(x, y, 300, 250, '', function () { ui.open(S.teams(a[2], pens)); }, {
          draw: function (c2, X, Y, W, H, hov) {
            c2.fillStyle = '#9fd8b4'; c2.font = 'bold 18px Arial'; c2.textAlign = 'center'; c2.fillText(a[1], X + W / 2, Y + 24);
            shirt(c2, X + W / 2 - 55, Y + 44, 110, a[0]);
            c2.fillStyle = '#fff'; c2.font = 'bold 26px Arial'; c2.fillText(a[0].name, X + W / 2, Y + 180, W - 20);
            c2.fillStyle = '#ffd23f'; c2.font = '22px Arial'; c2.fillText(stars(a[0].rating) + '  ' + a[0].rating, X + W / 2, Y + 212);
            c2.fillStyle = 'rgba(255,255,255,0.5)'; c2.font = '16px Arial'; c2.fillText('clique para trocar', X + W / 2, Y + 236); c2.textAlign = 'left';
          }
        });
      });
      c.fillStyle = '#fff'; c.font = 'bold 40px Arial'; c.textAlign = 'center'; c.fillText('x', 355, 250); c.textAlign = 'left';
      // opções
      var ox = 710, y0 = 130;
      function row(label, vals, cur, set, y) {
        c.fillStyle = '#cfe9d8'; c.font = '20px Arial'; c.fillText(label, ox, y);
        vals.forEach(function (v, i) { ui.btn(ox + i * (270 / vals.length), y + 14, 270 / vals.length - 6, 44, v[1], function () { set(v[0]); FG.persist(); }, { size: 20, selected: cur === v[0] }); });
      }
      row('Dificuldade', FG.DIFFICULTY.map(function (d) { return [d.id, d.name]; }), st.difficulty, function (v) { st.difficulty = v; }, y0);
      if (!pens) {
        row('Jogadores por time', [[5, '5x5'], [7, '7x7'], [11, '11x11']], st.size, function (v) { st.size = v; }, y0 + 90);
        row('Duração (minutos reais)', [[2, '2'], [4, '4'], [6, '6'], [10, '10']], st.minutes, function (v) { st.minutes = v; }, y0 + 180);
        if (st.size === 11) { c.fillStyle = 'rgba(255,210,63,0.8)'; c.font = '16px Arial'; c.fillText('11x11 pode pesar no Oculus Go', ox, y0 + 290); }
      }
      backBtn(ui);
      ui.btn(640, 540, 344, 74, pens ? 'BATER PÊNALTIS ▶' : 'JOGAR ▶', function () {
        if (pens) app().startPenalties(home, away); else app().startMatch(home, away);
      }, { primary: true, size: 32 });
    };
  };
  S.teams = function (key, pens) {
    var page = 0;
    return function (c, ui) {
      var st = FG.save.settings, list = teamList(), per = 12, pages = Math.ceil(list.length / per);
      ui.title(key === 'team' ? 'Escolha seu time' : 'Escolha o adversário', 'Seleções e o seu clube');
      list.slice(page * per, page * per + per).forEach(function (t, i) {
        var col = i % 6, row = Math.floor(i / 6), x = 40 + col * 160, y = 120 + row * 205;
        var other = key === 'team' ? st.opp : st.team;
        ui.btn(x, y, 150, 195, '', function () { st[key] = t.id; FG.persist(); ui.open(S.quick(pens), true); }, {
          selected: st[key] === t.id, disabled: other === t.id,
          draw: function (c2, X, Y, W, H) {
            shirt(c2, X + 30, Y + 16, 90, t);
            c2.textAlign = 'center'; c2.fillStyle = '#fff'; c2.font = 'bold 19px Arial'; c2.fillText(t.name, X + W / 2, Y + 135, W - 10);
            c2.fillStyle = '#ffd23f'; c2.font = '17px Arial'; c2.fillText(stars(t.rating), X + W / 2, Y + 162); c2.textAlign = 'left';
          }
        });
      });
      backBtn(ui, S.quick(pens));
      if (pages > 1) {
        ui.btn(640, 560, 160, 54, '◀', function () { page = (page + pages - 1) % pages; }, {});
        ui.btn(824, 560, 160, 54, '▶', function () { page = (page + 1) % pages; }, {});
        c.fillStyle = '#9fd8b4'; c.font = '20px Arial'; c.fillText((page + 1) + '/' + pages, 560, 588);
      }
    };
  };

  /* ---------- Escola de futebol ---------- */
  S.school = function () {
    return function (c, ui) {
      ui.title('Escola de Futebol', 'Aprenda a jogar e as regras — ganhe moedas em cada aula');
      var done = FG.LESSONS.filter(function (l) { return FG.save.lessons[l.id]; }).length;
      c.fillStyle = '#9fd8b4'; c.font = '20px Arial'; c.textAlign = 'right'; c.fillText('Concluídas: ' + done + '/' + FG.LESSONS.length, 984, 92); c.textAlign = 'left';
      FG.LESSONS.forEach(function (l, i) {
        var col = i % 2, row = Math.floor(i / 2), x = 40 + col * 482, y = 116 + row * 72;
        var ok = !!FG.save.lessons[l.id];
        ui.btn(x, y, 462, 62, (ok ? '✔ ' : '') + l.title, function () {
          if (l.type === 'quiz') ui.open(S.quiz(l)); else if (l.type === 'rules') ui.open(S.rules(l, 0)); else ui.open(S.lessonIntro(l));
        }, { align: 'left', size: 22, color: ok ? 'rgba(53,208,127,0.18)' : undefined, sub: null });
        c.fillStyle = '#ffd23f'; c.font = 'bold 18px Arial'; c.textAlign = 'right'; c.fillText(ok ? '' : '+' + l.reward + ' ●', x + 450, y + 32); c.textAlign = 'left';
      });
      backBtn(ui);
    };
  };
  S.lessonIntro = function (l) {
    return function (c, ui) {
      ui.title(l.title, 'Aula prática');
      var y = 160;
      l.intro.forEach(function (t, i) { y = ui.text((i === l.intro.length - 1 ? '🎯 ' : '• ') + t, 60, y, { size: 26, wrap: 900, bold: i === l.intro.length - 1, color: i === l.intro.length - 1 ? '#ffd23f' : '#e8f5ec' }) + 14; });
      backBtn(ui, S.school());
      ui.btn(680, 540, 304, 74, 'COMEÇAR ▶', function () { app().startLesson(l); }, { primary: true, size: 30 });
    };
  };
  S.lessonDone = function (l, coins) {
    return function (c, ui) {
      ui.title('Aula concluída!', l.title);
      ui.text('🏆', 512, 230, { size: 90, align: 'center' });
      ui.text(coins > 0 ? 'Você ganhou ' + coins + ' moedas!' : 'Aula já concluída antes — continue praticando!', 512, 340, { size: 32, align: 'center', bold: true, color: '#ffd23f' });
      ui.btn(272, 440, 480, 74, 'Voltar para a Escola', function () { ui.open(S.school()); }, { primary: true, size: 28 });
    };
  };
  S.rules = function (l, k) {
    return function (c, ui) {
      var pg = l.pages[k];
      ui.title(pg.t, l.title + '  ·  página ' + (k + 1) + '/' + l.pages.length);
      // diagrama
      FG.rr(c, 40, 120, 400, 400, 18); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fill();
      FG.diagram(c, pg.d, 40, 120, 400, 400);
      var y = 150;
      pg.p.forEach(function (t) { y = ui.text(t, 470, y, { size: 23, wrap: 510 }) + 12; });
      backBtn(ui, k > 0 ? S.rules(l, k - 1) : S.school());
      if (k < l.pages.length - 1) ui.btn(704, 560, 280, 54, 'Próxima ▶', function () { ui.open(S.rules(l, k + 1), true); }, { primary: true });
      else ui.btn(704, 560, 280, 54, 'Concluir ✔', function () { ui.open(S.lessonDone(l, app().completeLesson(l)), true); }, { primary: true });
    };
  };
  S.quiz = function (l) {
    var st = { i: 0, score: 0, chosen: -1 };
    var qs = FG.QUIZ.slice().sort(function () { return Math.random() - 0.5; });
    return function (c, ui) {
      if (st.i >= qs.length) {
        ui.title('Resultado do Quiz', l.title);
        var pass = st.score >= 7;
        ui.text(st.score + ' / ' + qs.length, 512, 230, { size: 96, bold: true, align: 'center', color: pass ? '#35d07f' : '#ffd23f' });
        ui.text(pass ? 'Aprovado! Você conhece as regras do futebol.' : 'Quase! Acerte 7 ou mais para ser aprovado.', 512, 330, { size: 28, align: 'center' });
        if (pass && !st.paid) { st.paid = true; st.coins = app().completeLesson(l) + st.score * 5; FG.addCoins(st.score * 5); FG.save.quizBest = Math.max(FG.save.quizBest, st.score); FG.persist(); }
        if (st.coins) ui.text('+' + st.coins + ' moedas', 512, 390, { size: 30, align: 'center', bold: true, color: '#ffd23f' });
        backBtn(ui, S.school());
        ui.btn(704, 560, 280, 54, 'Refazer', function () { ui.open(S.quiz(l), true); }, {});
        return;
      }
      var q = qs[st.i];
      ui.title('Quiz — pergunta ' + (st.i + 1) + '/' + qs.length, 'Acertos: ' + st.score);
      ui.text(q.q, 60, 160, { size: 30, bold: true, wrap: 900 });
      q.o.forEach(function (o, j) {
        var col = null;
        if (st.chosen >= 0) col = j === q.a ? 'rgba(53,208,127,0.55)' : j === st.chosen ? 'rgba(255,90,90,0.5)' : undefined;
        ui.btn(60 + (j % 2) * 460, 290 + Math.floor(j / 2) * 100, 440, 84, o, function () {
          if (st.chosen >= 0) return;
          st.chosen = j; if (j === q.a) { st.score++; FG.audio.reward(false); }
        }, { size: 24, color: col });
      });
      backBtn(ui, S.school());
      if (st.chosen >= 0) ui.btn(704, 560, 280, 54, 'Próxima ▶', function () { st.i++; st.chosen = -1; }, { primary: true });
    };
  };

  /* ---------- Recompensas ---------- */
  S.store = function () {
    return function (c, ui) {
      FG.showcase.hide();
      ui.title('Recompensas', 'Abra bolsas e ganhe chuteiras, bolas e moedas');
      FG.BAGS.forEach(function (b, i) {
        var x = 40 + i * 318, y = 120;
        FG.rr(c, x, y, 300, 330, 18); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
        c.fillStyle = b.color; c.beginPath(); c.ellipse(x + 150, y + 90, 52, 60, 0, 0, 7); c.fill();
        c.fillRect(x + 135, y + 20, 30, 20); c.fillStyle = '#f2d27a'; c.fillRect(x + 128, y + 34, 44, 6);
        c.fillStyle = '#fff'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillText(b.name, x + 150, y + 184);
        c.font = '17px Arial';
        var yy = y + 214;
        ['common', 'rare', 'epic', 'legendary'].forEach(function (r) {
          if (!b.odds[r]) return; c.fillStyle = FG.RARITY[r].color; c.fillText(FG.RARITY[r].name + ': ' + b.odds[r] + '%', x + 150, yy); yy += 22;
        });
        c.textAlign = 'left';
        ui.btn(x + 20, y + 270, 260, 50, '● ' + b.price, function () { app().openBag(b, false); }, { primary: FG.save.coins >= b.price, disabled: FG.save.coins < b.price, size: 24 });
      });
      var daily = FG.dailyReady();
      ui.btn(40, 470, 944, 64, daily ? '🎁 BOLSA DIÁRIA GRÁTIS — abrir agora!' : 'Bolsa diária: volte amanhã para outra grátis', function () { app().openBag(FG.BAGS[0], true); }, { primary: daily, disabled: !daily, size: 24 });
      backBtn(ui);
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.font = '17px Arial'; c.fillText('Ganhe moedas jogando partidas, fazendo gols, aulas e treinos. Itens repetidos viram moedas.', 250, 590);
    };
  };
  S.opening = function () {
    return function (c, ui) {
      ui.title('Abrindo bolsa...', '');
      ui.text('✨', 512, 300, { size: 120, align: 'center' });
    };
  };
  S.reveal = function (res) {
    return function (c, ui) {
      var it = res.item, R = FG.RARITY[it.rarity];
      ui.title('Você ganhou!', '');
      c.fillStyle = R.color; c.font = 'bold 26px Arial'; c.textAlign = 'left'; c.fillText(R.name.toUpperCase(), 330, 160);
      c.fillStyle = '#fff'; c.font = 'bold 44px Arial'; c.fillText(it.name, 330, 210, 650);
      c.fillStyle = '#9fd8b4'; c.font = '22px Arial'; c.fillText(it.id.indexOf('boot') === 0 ? 'Chuteira' : 'Bola', 330, 250);
      specBars(ui, it, 330, 300);
      var y = 480;
      ui.text('+' + res.coins + ' moedas' + (res.dup ? '  ·  item repetido: +' + res.refund + ' moedas' : ''), 330, y, { size: 24, color: '#ffd23f', bold: true });
      ui.btn(330, 540, 300, 64, 'Equipar', function () { equip(it); ui.open(S.locker(it.id.indexOf('boot') === 0 ? 'boots' : 'balls', it.id)); }, { primary: !res.dup, size: 26 });
      ui.btn(660, 540, 320, 64, 'Voltar às bolsas', function () { ui.open(S.store()); }, { size: 26 });
    };
  };
  function specBars(ui, it, x, y) {
    var isBoot = it.id.indexOf('boot') === 0, w = 640;
    var specs = isBoot ? [['Potência', it.power, '#ff6b4a'], ['Controle', it.control, '#35d07f'], ['Velocidade', it.speed, '#3fa1ff'], ['Efeito', it.curve, '#b55cff']]
      : [['Peso', it.weight, '#c9a227'], ['Quique', it.bounce, '#35d07f'], ['Efeito', it.curve, '#b55cff'], ['Visibilidade', it.visibility, '#3fa1ff']];
    specs.forEach(function (s, i) { ui.bar(x, y + i * 38, w, s[0], s[1], s[2]); });
  }
  function equip(it) {
    if (it.id.indexOf('boot') === 0) FG.save.equipped.boot = it.id; else FG.save.equipped.ball = it.id;
    FG.persist(); app().applyEquipment();
  }

  /* ---------- Vestiário ---------- */
  S.locker = function (tab, selId) {
    var page = 0, sel = selId || FG.save.equipped[tab === 'boots' ? 'boot' : 'ball'];
    return function (c, ui) {
      ui.title('Vestiário', 'Escolha sua chuteira e sua bola — cada uma tem specs diferentes');
      ui.btn(40, 110, 200, 48, 'Chuteiras', function () { ui.open(S.locker('boots'), true); }, { selected: tab === 'boots', size: 22 });
      ui.btn(250, 110, 200, 48, 'Bolas', function () { ui.open(S.locker('balls'), true); }, { selected: tab === 'balls', size: 22 });
      var list = tab === 'boots' ? FG.BOOTS : FG.BALLS, per = 6, pages = Math.ceil(list.length / per);
      list.slice(page * per, page * per + per).forEach(function (it, i) {
        var owned = FG.owns(it.id), eq = FG.save.equipped.boot === it.id || FG.save.equipped.ball === it.id;
        var y = 172 + i * 62;
        ui.btn(40, y, 410, 54, owned ? it.name : '🔒 ' + it.name, function () { sel = it.id; FG.showcase.showItem(it, ui.mesh); }, {
          align: 'left', size: 21, selected: sel === it.id, textColor: owned ? '#fff' : 'rgba(255,255,255,0.4)',
          draw: function (c2, X, Y, W, H) { c2.fillStyle = FG.RARITY[it.rarity].color; c2.fillRect(X + W - 22, Y + 12, 8, H - 24); if (eq) { c2.fillStyle = '#ffd23f'; c2.font = 'bold 16px Arial'; c2.textAlign = 'right'; c2.fillText('EM USO', X + W - 32, Y + H / 2); c2.textAlign = 'left'; } }
        });
      });
      if (pages > 1) {
        ui.btn(40, 552, 120, 48, '◀', function () { page = (page + pages - 1) % pages; });
        ui.btn(330, 552, 120, 48, '▶', function () { page = (page + 1) % pages; });
        c.fillStyle = '#9fd8b4'; c.font = '20px Arial'; c.textAlign = 'center'; c.fillText((page + 1) + '/' + pages, 245, 578); c.textAlign = 'left';
      }
      var it = FG.itemById(sel);
      if (it) {
        if (!FG.showcase.group.visible) FG.showcase.showItem(it, ui.mesh);
        var R = FG.RARITY[it.rarity];
        c.fillStyle = R.color; c.font = 'bold 20px Arial'; c.fillText(R.name.toUpperCase(), 480, 190);
        c.fillStyle = '#fff'; c.font = 'bold 34px Arial'; c.fillText(it.name, 480, 230, 500);
        specBars(ui, it, 480, 290);
        var owned = FG.owns(it.id), eq = FG.save.equipped.boot === it.id || FG.save.equipped.ball === it.id;
        ui.text(owned ? (eq ? 'Equipado ✔' : 'Disponível') : 'Bloqueado — encontre nas bolsas de recompensa', 480, 470, { size: 20, color: owned ? '#9fd8b4' : '#ffb3b3' });
        ui.btn(700, 540, 284, 64, eq ? 'Em uso' : 'Equipar', function () { equip(it); }, { primary: owned && !eq, disabled: !owned || eq, size: 26 });
      }
      ui.btn(480, 552, 190, 48, '◀ Voltar', function () { FG.showcase.hide(); ui.open(S.main(), true); }, { size: 22 });
    };
  };

  /* ---------- Clubes ---------- */
  S.clubs = function () {
    return function (c, ui) {
      var club = FG.save.club;
      if (!club) {
        ui.title('Clubes & Liga', 'Crie seu próprio clube e dispute uma liga');
        ui.text('Monte seu clube com nome, cores e uniforme. Depois jogue a Liga de Clubes contra outros 5 times — incluindo clubes de amigos que você importar pelo código.', 60, 180, { size: 26, wrap: 900 });
        ui.text('Compartilhe o código do seu clube com amigos: eles importam na página inicial do jogo (no navegador) e seu clube aparece na liga deles!', 60, 330, { size: 22, wrap: 900, color: '#9fd8b4' });
        backBtn(ui);
        ui.btn(640, 540, 344, 74, 'CRIAR CLUBE ▶', function () { ui.open(S.clubEdit()); }, { primary: true, size: 30 });
        return;
      }
      if (!FG.save.league) FG.newLeague();
      var L = FG.save.league, T = FG.clubToTeam(club, 'myclub');
      ui.title(club.name, 'Temporada ' + L.season + ' · Rodada ' + Math.min(L.round + 1, L.fixtures.length) + '/' + L.fixtures.length + ' · Força ' + (club.rating || 75));
      shirt(c, 60, 130, 120, T);
      // tabela
      var rows = FG.leagueSorted();
      var x = 230, y = 130;
      c.fillStyle = '#9fd8b4'; c.font = 'bold 18px Arial';
      c.fillText('#  Clube', x, y); c.textAlign = 'right'; ['J', 'V', 'E', 'D', 'SG', 'P'].forEach(function (h, i) { c.fillText(h, x + 480 + i * 45, y); }); c.textAlign = 'left';
      rows.forEach(function (r, i) {
        var cl = L.clubs[r.i], yy = y + 32 + i * 34, me = r.i === 0;
        if (me) { c.fillStyle = 'rgba(53,208,127,0.18)'; c.fillRect(x - 8, yy - 17, 740, 32); }
        c.fillStyle = cl.primary; c.fillRect(x + 26, yy - 10, 14, 20);
        c.fillStyle = me ? '#ffd23f' : '#fff'; c.font = (me ? 'bold ' : '') + '19px Arial';
        c.fillText((i + 1) + '  ', x, yy); c.fillText(cl.name + (cl.friend ? ' (amigo)' : ''), x + 48, yy, 380);
        c.textAlign = 'right'; [r.p, r.w, r.d, r.l, r.gf - r.ga, r.pts].forEach(function (v, k) { c.fillText(String(v), x + 480 + k * 45, yy); }); c.textAlign = 'left';
      });
      var next = FG.leagueNextOpponent();
      if (next) {
        var opp = L.clubs[next.idx];
        ui.btn(560, 450, 424, 84, 'JOGAR: vs ' + opp.name, function () { app().startMatch(T, FG.clubToTeam(opp, 'opp'), { league: true }); }, { primary: true, size: 22, sub: 'Rodada ' + (L.round + 1) });
      } else {
        var pos = rows.map(function (r) { return r.i; }).indexOf(0) + 1;
        if (!L.paid) {
          L.paid = true; var prize = [0, 600, 300, 150, 60, 30, 30][pos] || 30; FG.addCoins(prize); L.prize = prize;
          if (pos === 1) club.rating = Math.min(92, (club.rating || 75) + 3); else club.rating = Math.min(90, (club.rating || 75) + 1);
          FG.persist();
        }
        ui.text(pos === 1 ? '🏆 CAMPEÃO DA TEMPORADA!' : 'Temporada encerrada: ' + pos + 'º lugar', 230, 380, { size: 26, bold: true, color: '#ffd23f' });
        ui.text('Prêmio: +' + (L.prize || 0) + ' moedas', 230, 415, { size: 20 });
        ui.btn(560, 450, 424, 84, 'NOVA TEMPORADA ▶', function () { FG.newLeague(); }, { primary: true, size: 26 });
      }
      ui.btn(40, 450, 240, 64, 'Editar clube', function () { ui.open(S.clubEdit()); }, { size: 22 });
      ui.btn(296, 450, 248, 64, 'Código do clube', function () { ui.open(S.clubCode()); }, { size: 22 });
      backBtn(ui);
    };
  };
  S.clubEdit = function () {
    var cur = FG.save.club ? JSON.parse(JSON.stringify(FG.save.club)) : FG.randomClub();
    var parts = cur.name.split(' ');
    var pi = 0, ci = 0;
    FG.CLUB_PREFIX.forEach(function (p, i) { if (cur.name.indexOf(p) === 0) pi = i; });
    FG.CLUB_CITY.forEach(function (p, i) { if (cur.name.indexOf(p) >= 0) ci = i; });
    function nm() { cur.name = FG.CLUB_PREFIX[pi] + ' ' + FG.CLUB_CITY[ci]; }
    nm();
    return function (c, ui) {
      ui.title('Editar clube', 'Nome, cores e uniforme');
      var T = FG.clubToTeam(cur);
      shirt(c, 70, 150, 200, T);
      c.fillStyle = '#fff'; c.font = 'bold 26px Arial'; c.textAlign = 'center'; c.fillText(cur.name, 170, 400, 300); c.textAlign = 'left';
      var x = 360;
      function cycler(label, val, y, dec, inc) {
        c.fillStyle = '#cfe9d8'; c.font = '20px Arial'; c.fillText(label, x, y);
        ui.btn(x, y + 14, 60, 46, '◀', dec); ui.btn(x + 560, y + 14, 60, 46, '▶', inc);
        c.fillStyle = '#fff'; c.font = 'bold 24px Arial'; c.textAlign = 'center'; c.fillText(val, x + 310, y + 38); c.textAlign = 'left';
      }
      cycler('Nome', FG.CLUB_PREFIX[pi], 130, function () { pi = (pi + FG.CLUB_PREFIX.length - 1) % FG.CLUB_PREFIX.length; nm(); }, function () { pi = (pi + 1) % FG.CLUB_PREFIX.length; nm(); });
      cycler('Cidade', FG.CLUB_CITY[ci], 210, function () { ci = (ci + FG.CLUB_CITY.length - 1) % FG.CLUB_CITY.length; nm(); }, function () { ci = (ci + 1) % FG.CLUB_CITY.length; nm(); });
      var pk = FG.CLUB_PATTERNS.indexOf(cur.pattern);
      cycler('Uniforme', FG.PATTERN_NAMES[cur.pattern], 290, function () { cur.pattern = FG.CLUB_PATTERNS[(pk + FG.CLUB_PATTERNS.length - 1) % FG.CLUB_PATTERNS.length]; }, function () { cur.pattern = FG.CLUB_PATTERNS[(pk + 1) % FG.CLUB_PATTERNS.length]; });
      [['Cor principal', 'primary', 380], ['Cor secundária', 'secondary', 460]].forEach(function (a) {
        c.fillStyle = '#cfe9d8'; c.font = '20px Arial'; c.fillText(a[0], x, a[2]);
        FG.CLUB_COLORS.forEach(function (col, i) {
          ui.btn(x + i * 52, a[2] + 12, 46, 46, '', function () { cur[a[1]] = col; }, { color: col, selected: cur[a[1]] === col, r: 10 });
        });
      });
      backBtn(ui, S.clubs());
      ui.btn(700, 560, 284, 54, 'Salvar ✔', function () {
        var isNew = !FG.save.club;
        cur.rating = cur.rating || 75; FG.save.club = cur;
        if (isNew || !FG.save.league) FG.newLeague(); else FG.save.league.clubs[0] = cur;
        FG.persist(); app().refreshOverlay(); ui.open(S.clubs());
      }, { primary: true, size: 26 });
    };
  };
  S.clubCode = function () {
    return function (c, ui) {
      ui.title('Código do clube', 'Compartilhe com amigos');
      var code = FG.clubCode(FG.save.club);
      FG.rr(c, 40, 130, 944, 170, 14); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill();
      c.fillStyle = '#ffd23f'; c.font = '22px monospace';
      var y = 162; for (var i = 0; i < code.length; i += 64) { c.fillText(code.slice(i, i + 64), 60, y); y += 30; }
      ui.text('Seu amigo cola esse código em "Importar clube de um amigo" na página inicial do Football Go (no navegador do celular ou PC). O seu clube entra na liga dele na próxima temporada!', 60, 340, { size: 22, wrap: 900 });
      ui.text('Clubes de amigos importados: ' + (FG.save.friendClubs || []).length, 60, 470, { size: 22, color: '#9fd8b4' });
      if (!FG.inXR) ui.btn(704, 560, 280, 54, 'Copiar código', function () { try { navigator.clipboard.writeText(code); } catch (e) { } }, { primary: true });
      backBtn(ui, S.clubs());
    };
  };

  /* ---------- Opções ---------- */
  S.options = function () {
    return function (c, ui) {
      var st = FG.save.settings;
      ui.title('Opções', 'Conforto, controles e gráficos');
      var x = 40, y = 130;
      function row(label, vals, cur, set, yy, note) {
        c.fillStyle = '#cfe9d8'; c.font = '21px Arial'; c.fillText(label, x, yy + 26);
        vals.forEach(function (v, i) { ui.btn(x + 300 + i * 150, yy, 140, 50, v[1], function () { set(v[0]); FG.persist(); }, { size: 20, selected: cur === v[0] }); });
        if (note) { c.fillStyle = 'rgba(255,255,255,0.4)'; c.font = '15px Arial'; c.fillText(note, x, yy + 48); }
      }
      row('Volume', [[0, 'Mudo'], [0.4, 'Baixo'], [0.8, 'Médio'], [1, 'Alto']], st.volume, function (v) { st.volume = v; FG.audio.setVolume(v); }, y);
      row('Vinheta de conforto', [[true, 'Ligada'], [false, 'Desligada']], st.vignette, function (v) { st.vignette = v; }, y + 64, 'reduz enjoo ao andar');
      row('Giro (touchpad)', [[30, '30°'], [45, '45°'], [90, '90°']], st.snap, function (v) { st.snap = v; }, y + 128);
      row('Linha de impedimento', [[true, 'Mostrar'], [false, 'Esconder']], st.offsideHelp, function (v) { st.offsideHelp = v; }, y + 192, 'ajuda didática');
      row('Pé que chuta', [[false, 'Direito'], [true, 'Esquerdo']], st.leftFoot, function (v) { st.leftFoot = v; }, y + 256);
      row('Gráficos', [['auto', 'Auto'], ['low', 'Leve (Go)'], ['high', 'Alta (PC)']], st.quality, function (v) { st.quality = v; ui.state.reload = true; }, y + 320, 'recarrega a página');
      row('Horário', [[true, 'Noite'], [false, 'Dia']], st.night, function (v) { st.night = v; ui.state.reload = true; }, y + 384, 'recarrega a página');
      backBtn(ui);
      if (ui.state.reload) ui.btn(704, 560, 280, 54, 'Aplicar e recarregar', function () { location.reload(); }, { primary: true, size: 20 });
    };
  };

  /* ---------- Créditos ---------- */
  S.credits = function () {
    return function (c, ui) {
      ui.title('Créditos', 'Football Go: Play in VR without paying a lot!');
      var y = 160;
      y = ui.text('Inspirado no VRFS — VR Football Simulator.', 60, y, { size: 30, bold: true, color: '#ffd23f' }) + 6;
      y = ui.text('Todos os créditos pela ideia de controlar o pé com o controle em VR, e pela visão de um futebol realista em realidade virtual, vão para o VRFS e seus criadores. Se você tem um headset 6DoF, conheça e apoie o VRFS!', 60, y, { size: 23, wrap: 900 }) + 14;
      y = ui.text('Football Go é um projeto de fã, independente, gratuito e sem afiliação com o VRFS, FIFA ou qualquer seleção/clube. Nomes de jogadores são fictícios.', 60, y, { size: 21, wrap: 900, color: '#9fd8b4' }) + 14;
      y = ui.text('Tecnologia: WebXR + three.js (MIT) + webxr-polyfill (Apache-2.0). Modelos, texturas e sons gerados por código — sem downloads pesados, feito para rodar até no Oculus Go.', 60, y, { size: 21, wrap: 900 }) + 10;
      backBtn(ui);
    };
  };

  /* ---------- Pausa e resultados ---------- */
  S.pause = function () {
    return function (c, ui) {
      var m = FG.app.mode, kind = FG.app.modeKind;
      ui.title('Pausa', kind === 'match' ? m.teams[0].def.short + ' ' + m.teams[0].score + ' x ' + m.teams[1].score + ' ' + m.teams[1].def.short + '  ·  ' + m.timeStr() : '');
      var y = 150;
      ui.btn(262, y, 500, 74, '▶ Continuar', function () { app().resume(); }, { primary: true, size: 30 }); y += 90;
      if (kind === 'training') {
        ui.btn(262, y, 245, 64, 'Nova bola', function () { m.newBall(); app().resume(); }, { size: 24 });
        ui.btn(517, y, 245, 64, 'Goleiro: ' + (m.keeper.enabled ? 'ON' : 'OFF'), function () { m.keeper.enabled = !m.keeper.enabled; m.keeper.reset(); }, { size: 24 }); y += 80;
      }
      if (kind === 'lesson') { ui.btn(262, y, 500, 64, 'Rever instruções', function () { ui.open(S.lessonHelp(m.l), true); }, { size: 24 }); y += 80; }
      ui.btn(262, y, 500, 64, 'Reiniciar', function () { app().restart(); }, { size: 24 }); y += 80;
      ui.btn(262, y, 500, 64, kind === 'match' ? 'Abandonar partida' : 'Sair para o menu', function () { app().quit(); }, { size: 24 });
    };
  };
  S.lessonHelp = function (l) {
    return function (c, ui) {
      ui.title(l.title, 'Instruções');
      var y = 160; l.intro.forEach(function (t) { y = ui.text('• ' + t, 60, y, { size: 24, wrap: 900 }) + 10; });
      ui.btn(704, 560, 280, 54, 'Continuar ▶', function () { app().resume(); }, { primary: true });
    };
  };
  S.results = function (r, coins) {
    return function (c, ui) {
      var pens = r.penalties, win = r.hs > r.as, draw = r.hs === r.as;
      ui.title(pens ? 'Fim da disputa de pênaltis' : 'Fim de jogo', win ? 'VITÓRIA!' : draw ? 'Empate' : 'Derrota — continue treinando!');
      shirt(c, 120, 130, 120, r.home); shirt(c, 784, 130, 120, r.away);
      c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = 'bold 26px Arial';
      c.fillText(r.home.name, 180, 290, 260); c.fillText(r.away.name, 844, 290, 260);
      c.font = 'bold 110px Arial'; c.fillStyle = win ? '#35d07f' : draw ? '#ffd23f' : '#ff7b5a'; c.fillText(r.hs + ' x ' + r.as, 512, 210);
      c.textAlign = 'left';
      if (!pens && r.stats) {
        var s = r.stats, y = 330;
        [['Posse de bola', r.poss + '% x ' + (100 - r.poss) + '%'], ['Finalizações', s.shots[0] + ' x ' + s.shots[1]], ['Seus gols', s.humanGoals], ['Suas assistências', s.humanAssists], ['Seus toques na bola', s.humanTouches]].forEach(function (a, i) {
          c.fillStyle = '#9fd8b4'; c.font = '21px Arial'; c.fillText(a[0], 300, y + i * 32); c.fillStyle = '#fff'; c.font = 'bold 21px Arial'; c.textAlign = 'right'; c.fillText(String(a[1]), 724, y + i * 32); c.textAlign = 'left';
        });
      }
      ui.text('+' + coins + ' moedas', 512, 510, { size: 32, bold: true, align: 'center', color: '#ffd23f' });
      ui.btn(40, 552, 300, 62, 'Menu principal', function () { app().quit(); }, { size: 24 });
      ui.btn(684, 552, 300, 62, r.league ? 'Ver liga ▶' : 'Jogar de novo ▶', function () { if (r.league) { app().toMenu(S.clubs()); } else app().restart(); }, { primary: true, size: 24 });
    };
  };

  /* ---------- Diagramas das regras ---------- */
  FG.diagram = function (c, kind, X, Y, W, H) {
    c.save(); c.translate(X, Y);
    function pitch(x, y, w, h) {
      c.fillStyle = '#2f7d32'; c.fillRect(x, y, w, h);
      for (var i = 0; i < 10; i++) if (i % 2) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + i * w / 10, y, w / 10, h); }
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
      c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
      c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.135, 0, 7); c.stroke();
      var bw = w * 16.5 / 105, bh = h * 40.3 / 68, sw = w * 5.5 / 105, sh = h * 18.3 / 68;
      c.strokeRect(x, y + (h - bh) / 2, bw, bh); c.strokeRect(x + w - bw, y + (h - bh) / 2, bw, bh);
      c.strokeRect(x, y + (h - sh) / 2, sw, sh); c.strokeRect(x + w - sw, y + (h - sh) / 2, sw, sh);
      c.fillStyle = '#fff'; c.fillRect(x - 5, y + h / 2 - h * 3.66 / 68, 5, h * 7.32 / 68); c.fillRect(x + w, y + h / 2 - h * 3.66 / 68, 5, h * 7.32 / 68);
    }
    function dot(x, y, col, label) { c.fillStyle = col; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke(); if (label) { c.fillStyle = '#fff'; c.font = 'bold 14px Arial'; c.textAlign = 'center'; c.fillText(label, x, y - 16); c.textAlign = 'left'; } }
    function ball(x, y) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill(); }
    function arrow(x1, y1, x2, y2, col) { c.strokeStyle = col || '#ffd23f'; c.fillStyle = col || '#ffd23f'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); var a = Math.atan2(y2 - y1, x2 - x1); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - 14 * Math.cos(a - 0.4), y2 - 14 * Math.sin(a - 0.4)); c.lineTo(x2 - 14 * Math.cos(a + 0.4), y2 - 14 * Math.sin(a + 0.4)); c.fill(); }
    function label(t, x, y, col) { c.fillStyle = col || '#fff'; c.font = 'bold 18px Arial'; c.textAlign = 'center'; c.fillText(t, x, y); c.textAlign = 'left'; }
    var px = 20, py = 90, pw = 360, ph = 233;
    switch (kind) {
      case 'field': pitch(px, py, pw, ph); label('105 m', 200, py - 14); c.save(); c.translate(px + pw + 14, py + ph / 2); c.rotate(Math.PI / 2); label('68 m', 0, 0); c.restore(); label('círculo central 9,15 m', 200, py + ph + 34, '#ffd23f'); break;
      case 'box':
        c.fillStyle = '#2f7d32'; c.fillRect(20, 40, 360, 320); c.strokeStyle = '#fff'; c.lineWidth = 3;
        c.strokeRect(20, 60, 200, 280); c.strokeRect(20, 140, 70, 120); c.fillStyle = '#fff'; c.fillRect(10, 170, 10, 60);
        c.beginPath(); c.arc(140, 200, 4, 0, 7); c.fill(); c.beginPath(); c.arc(140, 200, 120, -0.85, 0.85); c.stroke();
        label('grande área 16,5 m', 120, 52, '#ffd23f'); label('pequena 5,5 m', 60, 128); label('pênalti 11 m', 150, 228); label('gol 7,32 m', 60, 300); break;
      case 'ball':
        var g = c.createRadialGradient(170, 160, 10, 200, 190, 120); g.addColorStop(0, '#fff'); g.addColorStop(1, '#bbb');
        c.fillStyle = g; c.beginPath(); c.arc(200, 190, 110, 0, 7); c.fill();
        c.fillStyle = '#111'; [[200, 190], [130, 130], [270, 130], [140, 260], [260, 260]].forEach(function (p) { c.beginPath(); for (var i = 0; i < 5; i++) { var a = i * 2 * Math.PI / 5 - Math.PI / 2; c.lineTo(p[0] + 30 * Math.cos(a), p[1] + 30 * Math.sin(a)); } c.fill(); });
        label('Tamanho 5 · 410–450 g · 68–70 cm', 200, 345, '#ffd23f'); break;
      case 'clock':
        c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(200, 190, 120, 0, 7); c.stroke();
        c.fillStyle = 'rgba(53,208,127,0.6)'; c.beginPath(); c.moveTo(200, 190); c.arc(200, 190, 114, -Math.PI / 2, Math.PI / 2); c.fill();
        c.fillStyle = 'rgba(63,161,255,0.6)'; c.beginPath(); c.moveTo(200, 190); c.arc(200, 190, 114, Math.PI / 2, Math.PI * 1.5); c.fill();
        label('1º tempo 45\'', 280, 195); label('2º tempo 45\'', 120, 195); label('+ acréscimos', 200, 350, '#ffd23f'); break;
      case 'goal':
        c.fillStyle = '#2f7d32'; c.fillRect(20, 60, 360, 300); c.fillStyle = '#fff'; c.fillRect(196, 60, 8, 300);
        ball(150, 130); c.fillStyle = '#fff'; c.beginPath(); c.arc(200, 210, 22, 0, 7); c.fill(); c.beginPath(); c.arc(250, 290, 22, 0, 7); c.fill();
        c.beginPath(); c.arc(200, 130, 22, 0, 7); c.fill();
        label('NÃO é gol', 110, 220, '#ff7b5a'); label('linha', 200, 52); label('É GOL ✔', 320, 296, '#35d07f'); label('NÃO é gol', 110, 140, '#ff7b5a'); break;
      case 'throw': pitch(px, py, pw, ph); dot(200, py - 8, '#ffd23f', 'arremesso'); arrow(200, py - 8, 230, py + 60); dot(230, py + 70, '#3fa1ff'); label('mãos por cima da cabeça', 200, py + ph + 34, '#ffd23f'); break;
      case 'corner': pitch(px, py, pw, ph); ball(px + pw - 4, py + 4); arrow(px + pw - 6, py + 6, px + pw - 40, py + ph / 2); label('escanteio', px + pw - 40, py - 12, '#ffd23f'); ball(px + 20, py + ph / 2 - 20); label('tiro de meta', px + 60, py + ph + 34, '#ffd23f'); break;
      case 'kickoff': pitch(px, py, pw, ph); ball(200, py + ph / 2); dot(185, py + ph / 2, '#ffd23f'); dot(130, py + 50, '#ffd23f'); dot(130, py + ph - 50, '#ffd23f'); dot(250, py + 60, '#3fa1ff'); dot(250, py + ph - 60, '#3fa1ff'); dot(290, py + ph / 2, '#3fa1ff'); label('cada time no seu campo', 200, py + ph + 34, '#ffd23f'); break;
      case 'foul': dot(160, 200, '#3fa1ff', 'atacante'); dot(210, 205, '#ff5a5a', 'defensor'); arrow(240, 240, 214, 212, '#ff5a5a'); label('TIRO LIVRE DIRETO', 200, 320, '#ffd23f'); c.strokeStyle = '#fff'; c.setLineDash([4, 4]); c.beginPath(); c.arc(160, 200, 70, 0, 7); c.stroke(); c.setLineDash([]); label('barreira a 9,15 m', 200, 350); break;
      case 'penalty':
        c.fillStyle = '#2f7d32'; c.fillRect(20, 40, 360, 320); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(20, 60, 200, 280); c.fillStyle = '#fff'; c.fillRect(10, 170, 10, 60);
        ball(140, 200); dot(26, 200, '#ff5a5a', 'goleiro'); dot(165, 200, '#3fa1ff', 'batedor'); dot(280, 150, '#3fa1ff'); dot(270, 260, '#ff5a5a'); label('11 m', 80, 190, '#ffd23f'); break;
      case 'cards':
        c.fillStyle = '#ffd23f'; c.save(); c.translate(120, 200); c.rotate(-0.15); c.fillRect(-55, -80, 110, 160); c.restore();
        c.fillStyle = '#ff3b3b'; c.save(); c.translate(280, 200); c.rotate(0.15); c.fillRect(-55, -80, 110, 160); c.restore();
        label('advertência', 120, 320); label('expulsão', 280, 320); label('2 amarelos = vermelho', 200, 360, '#ffd23f'); break;
      case 'offside': case 'offside2':
        pitch(px, py, pw, ph); var lx = px + pw * 0.78;
        c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(lx, py); c.lineTo(lx, py + ph); c.stroke(); c.setLineDash([]);
        dot(px + pw - 6, py + ph / 2, '#ff5a5a', 'GOL'); dot(lx, py + 70, '#ff5a5a', 'penúltimo'); dot(px + pw * 0.7, py + ph - 60, '#ff5a5a');
        dot(px + pw * 0.55, py + ph / 2, '#3fa1ff', 'passe'); ball(px + pw * 0.55 + 14, py + ph / 2);
        if (kind === 'offside') { dot(px + pw * 0.86, py + 150, '#3fa1ff', 'IMPEDIDO'); arrow(px + pw * 0.56, py + ph / 2, px + pw * 0.85, py + 150); }
        else { dot(px + pw * 0.74, py + 150, '#3fa1ff', 'LEGAL'); arrow(px + pw * 0.56, py + ph / 2, px + pw * 0.73, py + 150, '#35d07f'); }
        label('linha do penúltimo defensor', 200, py + ph + 34, '#ffd23f'); break;
      case 'positions':
        pitch(px, py, pw, ph);
        [[0.04, 0.5, 'GOL'], [0.2, 0.15, 'LAT'], [0.17, 0.38, 'ZAG'], [0.17, 0.62, 'ZAG'], [0.2, 0.85, 'LAT'], [0.4, 0.3, 'MEI'], [0.36, 0.5, 'VOL'], [0.4, 0.7, 'MEI'], [0.62, 0.18, 'PON'], [0.68, 0.5, 'CA'], [0.62, 0.82, 'PON']].forEach(function (p) { dot(px + pw * p[0], py + ph * p[1], '#3fa1ff', p[2]); });
        label('formação 4-3-3', 200, py + ph + 34, '#ffd23f'); break;
      default:
        label('⚽', 200, 200); c.font = '120px Arial'; c.textAlign = 'center'; c.fillText('⚽', 200, 220); c.textAlign = 'left';
        label('Fair Play!', 200, 330, '#ffd23f');
    }
    c.restore();
  };
})();
