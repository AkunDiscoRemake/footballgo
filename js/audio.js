/* Football Go - áudio sintetizado (WebAudio): torcida, apito, chute, rede, gol */
(function () {
  var A = FG.audio = { ctx: null, master: null, crowdGain: null, excite: 0 };
  var noiseBuf = null;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = A.ctx = new AC();
    A.master = ctx.createGain(); A.master.gain.value = FG.save.settings.volume; A.master.connect(ctx.destination);
    // ruído rosa
    var len = ctx.sampleRate * 3; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    // torcida ambiente: ruído filtrado com modulação
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    A.crowdGain = ctx.createGain(); A.crowdGain.gain.value = 0.0;
    src.connect(bp); bp.connect(lp); lp.connect(A.crowdGain); A.crowdGain.connect(A.master);
    src.start();
    // "vozes" da torcida: osciladores com vibrato lento
    A.chant = ctx.createGain(); A.chant.gain.value = 0; A.chant.connect(A.master);
    var freqs = [196, 247, 294, 330];
    for (var k = 0; k < freqs.length; k++) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freqs[k];
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.2 + k * 0.07;
      var lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
      var g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(f); f.connect(g); g.connect(A.chant); o.start(); lfo.start();
    }
  };
  A.setVolume = function (v) { if (A.master) A.master.gain.value = v; };

  // nível da torcida (0..1) + empolgação
  var t = 0;
  A.update = function (dt, active) {
    if (!A.ctx) return;
    t += dt;
    A.excite = Math.max(0, A.excite - dt * 0.12);
    var base = active ? 0.35 : 0.18;
    var target = base + A.excite * 0.9 + Math.sin(t * 0.4) * 0.04;
    A.crowdGain.gain.value += (target - A.crowdGain.gain.value) * Math.min(1, dt * 3);
    var chantT = active ? (0.25 + 0.25 * Math.max(0, Math.sin(t * 0.13))) * (1 - A.excite * 0.5) : 0.05;
    A.chant.gain.value += (chantT * 0.5 - A.chant.gain.value) * Math.min(1, dt * 1.5);
  };
  A.cheer = function (amount) { A.excite = Math.min(1, A.excite + amount); };

  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  A.whistle = function (kind) {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime;
    var pattern = kind === 'end' ? [[0, 0.35], [0.45, 0.35], [0.9, 1.0]] : kind === 'long' ? [[0, 0.9]] : [[0, 0.28]];
    pattern.forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
      var trem = ctx.createOscillator(); trem.frequency.value = 38; var tg = ctx.createGain(); tg.gain.value = 180;
      trem.connect(tg); tg.connect(o.frequency);
      var g = ctx.createGain(); var t0 = now + p[0];
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.setValueAtTime(0.25, t0 + p[1] - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[1]);
      o.connect(g); g.connect(A.master); o.start(t0); trem.start(t0); o.stop(t0 + p[1] + 0.05); trem.stop(t0 + p[1] + 0.05);
    });
  };
  A.kick = function (power) {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime, p = Math.min(1, power);
    var o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160 + p * 60, now); o.frequency.exponentialRampToValueAtTime(50, now + 0.12);
    var g = ctx.createGain(); env(g, now, 0.003, 0.14, 0.3 + p * 0.6);
    o.connect(g); g.connect(A.master); o.start(now); o.stop(now + 0.2);
    var n = ctx.createBufferSource(); n.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2;
    var ng = ctx.createGain(); env(ng, now, 0.001, 0.05, 0.2 + p * 0.4);
    n.connect(f); f.connect(ng); ng.connect(A.master); n.start(now, Math.random() * 2); n.stop(now + 0.1);
  };
  A.thud = function (v) { A.kick(Math.min(0.3, v * 0.05)); };
  A.net = function () {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime;
    var n = ctx.createBufferSource(); n.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    var g = ctx.createGain(); env(g, now, 0.01, 0.4, 0.5);
    n.connect(f); f.connect(g); g.connect(A.master); n.start(now, Math.random()); n.stop(now + 0.5);
  };
  A.post = function () {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime;
    [523, 1046, 1568].forEach(function (fr, i) {
      var o = ctx.createOscillator(); o.frequency.value = fr * 1.02;
      var g = ctx.createGain(); env(g, now, 0.002, 0.8 - i * 0.2, 0.15 / (i + 1));
      o.connect(g); g.connect(A.master); o.start(now); o.stop(now + 1);
    });
  };
  A.click = function () {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 880;
    var g = ctx.createGain(); env(g, now, 0.002, 0.06, 0.15);
    o.connect(g); g.connect(A.master); o.start(now); o.stop(now + 0.1);
  };
  A.reward = function (rare) {
    if (!A.ctx) return;
    var ctx = A.ctx, now = ctx.currentTime;
    var notes = rare ? [523, 659, 784, 1046, 1318] : [523, 659, 784];
    notes.forEach(function (fr, i) {
      var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
      var g = ctx.createGain(); env(g, now + i * 0.11, 0.01, 0.5, 0.2);
      o.connect(g); g.connect(A.master); o.start(now + i * 0.11); o.stop(now + i * 0.11 + 0.6);
    });
  };
  A.goal = function () { A.cheer(1); A.net(); };
  A.ooh = function () { A.cheer(0.45); };
})();
