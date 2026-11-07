/* Football Go - perfil salvo (localStorage), recompensas, clubes */
(function () {
  var KEY = 'footballgo_save_v1';
  function defaults() {
    return {
      coins: 300,
      owned: ['boot_basic', 'ball_classic'],
      equipped: { boot: 'boot_basic', ball: 'ball_classic' },
      stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, pensScored: 0, saves: 0 },
      lessons: {},
      quizBest: 0,
      lastDaily: 0,
      club: null,
      league: null,
      friendClubs: [],
      settings: { quality: 'auto', volume: 0.8, vignette: true, snap: 45, offsideHelp: true, night: true, difficulty: 1, size: 7, minutes: 3, team: 'bra', opp: 'arg', leftFoot: false }
    };
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        for (var k in s) if (s.hasOwnProperty(k)) d[k] = s[k];
        var dd = defaults();
        for (var k2 in dd.settings) if (d.settings[k2] === undefined) d.settings[k2] = dd.settings[k2];
        for (var k3 in dd.stats) if (d.stats[k3] === undefined) d.stats[k3] = dd.stats[k3];
      }
    } catch (e) { console.warn('save load', e); }
    return d;
  }
  FG.save = load();
  FG.persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(FG.save)); } catch (e) { /* armazenamento indisponível */ }
  };
  FG.addCoins = function (n) { FG.save.coins = Math.max(0, FG.save.coins + Math.round(n)); FG.persist(); };
  FG.owns = function (id) { return FG.save.owned.indexOf(id) >= 0; };

  FG.dailyReady = function () { return Date.now() - (FG.save.lastDaily || 0) > 20 * 3600 * 1000; };

  // Sorteio de bolsa de recompensas
  FG.rollBag = function (bag) {
    var r = Math.random() * 100, acc = 0, rarity = 'common';
    var order = ['common', 'rare', 'epic', 'legendary'];
    for (var i = 0; i < order.length; i++) { acc += bag.odds[order[i]]; if (r < acc) { rarity = order[i]; break; } }
    var pool = FG.BOOTS.concat(FG.BALLS).filter(function (it) { return it.rarity === rarity; });
    var item = pool[Math.floor(Math.random() * pool.length)];
    var coins = Math.round(bag.coins[0] + Math.random() * (bag.coins[1] - bag.coins[0]));
    var dup = FG.owns(item.id);
    var refund = 0;
    if (dup) { refund = { common: 40, rare: 120, epic: 300, legendary: 700 }[rarity]; }
    else FG.save.owned.push(item.id);
    FG.save.coins += coins + refund;
    FG.persist();
    return { item: item, coins: coins, dup: dup, refund: refund };
  };

  // Efeitos dos specs (0-100 -> multiplicadores)
  FG.bootFx = function () {
    var b = FG.itemById(FG.save.equipped.boot) || FG.BOOTS[0];
    return { power: 0.85 + b.power / 100 * 0.45, control: 0.35 + b.control / 100 * 0.6, speed: 0.92 + b.speed / 100 * 0.2, curve: 0.5 + b.curve / 100 * 1.1, item: b };
  };
  FG.ballFx = function () {
    var b = FG.itemById(FG.save.equipped.ball) || FG.BALLS[0];
    return { drag: 0.8 + b.weight / 100 * 0.4, kick: 1.15 - b.weight / 100 * 0.25, bounce: 0.45 + b.bounce / 100 * 0.3, curve: 0.5 + b.curve / 100 * 1.0, item: b };
  };

  /* ---------- Clubes ---------- */
  FG.randomClub = function (seedName) {
    var r = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    var p = r(FG.CLUB_COLORS), s = r(FG.CLUB_COLORS);
    while (s === p) s = r(FG.CLUB_COLORS);
    return { name: seedName || (r(FG.CLUB_PREFIX) + ' ' + r(FG.CLUB_CITY)), primary: p, secondary: s, pattern: r(FG.CLUB_PATTERNS), rating: 70 + Math.floor(Math.random() * 16) };
  };
  FG.clubToTeam = function (c, id) {
    var short = c.name.replace(/(Esporte Clube|Clube Atlético|Associação|Unidos de) ?/g, '').split(' ').map(function (w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 3);
    if (short.length < 3) short = (c.name.replace(/[^A-Za-zÀ-ú]/g, '').toUpperCase() + 'XXX').slice(0, 3);
    var dark = FG.isDark(c.primary);
    return { id: id || 'club', name: c.name, short: short, primary: c.primary, secondary: c.secondary, shorts: c.secondary, socks: c.primary, pattern: c.pattern, num: dark ? '#ffffff' : '#111111', rating: c.rating || 78, gk: '#2b2b2b', club: true };
  };
  FG.isDark = function (hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
  };
  FG.clubCode = function (c) {
    if (!c) return '';
    var o = { n: c.name, p: c.primary, s: c.secondary, t: c.pattern, r: c.rating || 78 };
    try { return 'FGC1:' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); } catch (e) { return ''; }
  };
  FG.parseClubCode = function (code) {
    try {
      code = (code || '').trim();
      if (code.indexOf('FGC1:') !== 0) return null;
      var o = JSON.parse(decodeURIComponent(escape(atob(code.slice(5)))));
      if (!o.n || !/^#[0-9a-fA-F]{6}$/.test(o.p) || !/^#[0-9a-fA-F]{6}$/.test(o.s)) return null;
      return { name: String(o.n).slice(0, 28), primary: o.p, secondary: o.s, pattern: FG.CLUB_PATTERNS.indexOf(o.t) >= 0 ? o.t : 'solid', rating: Math.max(60, Math.min(90, +o.r || 78)), friend: true };
    } catch (e) { return null; }
  };

  // Liga: clube do jogador + 5 adversários (amigos importados têm prioridade)
  FG.newLeague = function () {
    var clubs = [FG.save.club];
    var friends = (FG.save.friendClubs || []).slice(0, 5);
    for (var i = 0; i < friends.length; i++) clubs.push(friends[i]);
    while (clubs.length < 6) clubs.push(FG.randomClub());
    var n = clubs.length, fixtures = [];
    // turno único: algoritmo do círculo
    var ids = clubs.map(function (_, i) { return i; });
    for (var r = 0; r < n - 1; r++) {
      var round = [];
      for (var k = 0; k < n / 2; k++) round.push([ids[k], ids[n - 1 - k]]);
      fixtures.push(round);
      ids.splice(1, 0, ids.pop());
    }
    var table = clubs.map(function (c, i) { return { i: i, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
    FG.save.league = { clubs: clubs, fixtures: fixtures, round: 0, table: table, season: (FG.save.league ? FG.save.league.season + 1 : 1) };
    FG.persist();
  };
  FG.leagueNextOpponent = function () {
    var L = FG.save.league; if (!L || L.round >= L.fixtures.length) return null;
    var round = L.fixtures[L.round];
    for (var i = 0; i < round.length; i++) {
      if (round[i][0] === 0) return { idx: round[i][1], home: true };
      if (round[i][1] === 0) return { idx: round[i][0], home: false };
    }
    return null;
  };
  FG.leagueRecord = function (a, b, ga, gb) {
    var T = FG.save.league.table, A = T[a], B = T[b];
    A.p++; B.p++; A.gf += ga; A.ga += gb; B.gf += gb; B.ga += ga;
    if (ga > gb) { A.w++; B.l++; A.pts += 3; } else if (gb > ga) { B.w++; A.l++; B.pts += 3; } else { A.d++; B.d++; A.pts++; B.pts++; }
  };
  FG.leagueFinishRound = function (myGoals, oppGoals) {
    var L = FG.save.league, round = L.fixtures[L.round];
    for (var i = 0; i < round.length; i++) {
      var a = round[i][0], b = round[i][1];
      if (a === 0) FG.leagueRecord(a, b, myGoals, oppGoals);
      else if (b === 0) FG.leagueRecord(b, a, myGoals, oppGoals);
      else {
        var ra = L.clubs[a].rating || 78, rb = L.clubs[b].rating || 78;
        var ga = Math.max(0, Math.round(Math.random() * 3 + (ra - rb) / 10 - 0.3));
        var gb = Math.max(0, Math.round(Math.random() * 3 + (rb - ra) / 10 - 0.3));
        FG.leagueRecord(a, b, ga, gb);
      }
    }
    L.round++;
    FG.persist();
  };
  FG.leagueSorted = function () {
    var T = FG.save.league.table.slice();
    T.sort(function (x, y) { return (y.pts - x.pts) || ((y.gf - y.ga) - (x.gf - x.ga)) || (y.gf - x.gf); });
    return T;
  };
})();
