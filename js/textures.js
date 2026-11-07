/* Football Go - texturas procedurais (canvas) */
(function () {
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, repeat) {
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = FG.maxAniso || 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var m = function (x) { return Math.max(0, Math.min(255, Math.round(f > 0 ? x + (255 - x) * f : x * (1 + f)))); };
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  FG.shade = shade;
  FG.tex = tex;
  FG.makeCanvas = canvas;

  /* ---------- Gramado ---------- */
  FG.pitchTexture = function (hi) {
    var W = hi ? 2048 : 1024, H = hi ? 1024 : 512;
    var c = canvas(W, H), x = c.getContext('2d');
    var stripes = 20; // faixas de corte
    for (var i = 0; i < stripes; i++) {
      x.fillStyle = i % 2 ? '#2f7d32' : '#3a8c3a';
      x.fillRect(Math.floor(i * W / stripes), 0, Math.ceil(W / stripes) + 1, H);
    }
    // ruído de grama
    var img = x.getImageData(0, 0, W, H), d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var n = (Math.random() - 0.5) * 26;
      d[p] = Math.max(0, d[p] + n * 0.6); d[p + 1] = Math.max(0, d[p + 1] + n); d[p + 2] = Math.max(0, d[p + 2] + n * 0.4);
    }
    x.putImageData(img, 0, 0);
    // manchas de desgaste (área do goleiro e meio)
    function wear(cx, cy, r, a) {
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(120,110,60,' + a + ')'); g.addColorStop(1, 'rgba(120,110,60,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    var mx = W / 115, my = H / 78; // margem de 5 m
    wear(5 * mx + 1.5 * mx, H / 2, 3 * mx, 0.35); wear(W - 6.5 * mx, H / 2, 3 * mx, 0.35);
    wear(W / 2, H / 2, 4 * mx, 0.15);
    for (var k = 0; k < 400; k++) {
      x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '20,60,20' : '90,150,70') + ',0.10)';
      x.beginPath(); x.arc(Math.random() * W, Math.random() * H, rnd(2, 10), 0, 7); x.fill();
    }
    return tex(c);
  };
  FG.grassTexture = function () {
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#2c6e2c'; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 4000; i++) {
      x.strokeStyle = 'rgba(' + (Math.random() < 0.5 ? '25,70,25' : '70,130,55') + ',0.5)';
      var px = Math.random() * 256, py = Math.random() * 256;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + rnd(-2, 2), py - rnd(2, 6)); x.stroke();
    }
    return tex(c, [40, 30]);
  };
  FG.concreteTexture = function (base) {
    var c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = base || '#8a8f96'; x.fillRect(0, 0, 256, 256);
    var img = x.getImageData(0, 0, 256, 256), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var n = (Math.random() - 0.5) * 22; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    x.putImageData(img, 0, 0);
    return tex(c, [8, 8]);
  };

  /* ---------- Rede do gol ---------- */
  FG.netTexture = function () {
    var c = canvas(128, 128), x = c.getContext('2d');
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(245,245,245,0.95)'; x.lineWidth = 3;
    for (var i = 0; i <= 128; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke();
    }
    var t = tex(c, [1, 1]);
    return t;
  };

  /* ---------- Sombra (blob) e brilho ---------- */
  FG.blobTexture = function () {
    var c = canvas(64, 64), x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return tex(c);
  };
  FG.glowTexture = function (color) {
    var c = canvas(128, 128), x = c.getContext('2d');
    var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color || 'rgba(255,255,240,1)'); g.addColorStop(0.2, 'rgba(255,250,220,0.6)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return tex(c);
  };

  /* ---------- Placas de publicidade (LED) ---------- */
  FG.adTexture = function () {
    var c = canvas(2048, 128), x = c.getContext('2d');
    var ads = [
      ['#0b3d1e', '#35d07f', 'FOOTBALL GO'],
      ['#111111', '#ffd23f', 'INSPIRADO EM VRFS'],
      ['#1d4fb8', '#ffffff', 'FAIR PLAY ★ RESPEITO'],
      ['#c8102e', '#ffffff', 'ESCOLA DE FUTEBOL'],
      ['#f7d417', '#0a3d1e', 'PLAY IN VR'],
      ['#6b21a8', '#ffffff', 'WEBXR ★ OCULUS GO'],
      ['#ffffff', '#0b3d1e', 'NÃO PAGUE CARO!'],
      ['#0f172a', '#38bdf8', 'BOLSAS DE RECOMPENSA']
    ];
    var w = 2048 / ads.length;
    for (var i = 0; i < ads.length; i++) {
      var a = ads[i];
      var g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, shade(a[0], 0.15)); g.addColorStop(1, shade(a[0], -0.2));
      x.fillStyle = g; x.fillRect(i * w, 0, w, 128);
      x.fillStyle = a[1]; x.font = 'bold 50px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(a[2], i * w + w / 2, 66, w - 20);
    }
    // grade de LED
    x.fillStyle = 'rgba(0,0,0,0.18)';
    for (var yy = 0; yy < 128; yy += 4) x.fillRect(0, yy, 2048, 1);
    var t = tex(c, [1, 1]);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };

  /* ---------- Torcida (atlas de silhuetas: R=camisa, G=pele, B=cabelo) ---------- */
  FG.crowdTexture = function () {
    var c = canvas(512, 256), x = c.getContext('2d');
    x.clearRect(0, 0, 512, 256);
    for (var i = 0; i < 4; i++) {
      var ox = i * 128, armsUp = (i === 1 || i === 3), scarf = i === 2;
      // tronco (camisa)
      x.fillStyle = '#ff0000';
      x.beginPath();
      x.moveTo(ox + 30, 256); x.lineTo(ox + 34, 140); x.quadraticCurveTo(ox + 64, 118, ox + 94, 140); x.lineTo(ox + 98, 256); x.closePath(); x.fill();
      // braços
      if (armsUp) {
        x.fillStyle = '#ff0000';
        x.beginPath(); x.moveTo(ox + 34, 146); x.lineTo(ox + 14, 70); x.lineTo(ox + 26, 66); x.lineTo(ox + 46, 140); x.fill();
        x.beginPath(); x.moveTo(ox + 94, 146); x.lineTo(ox + 114, 70); x.lineTo(ox + 102, 66); x.lineTo(ox + 82, 140); x.fill();
        x.fillStyle = '#00ff00';
        x.beginPath(); x.arc(ox + 19, 62, 9, 0, 7); x.fill();
        x.beginPath(); x.arc(ox + 109, 62, 9, 0, 7); x.fill();
      } else {
        x.fillStyle = '#ff0000';
        x.fillRect(ox + 22, 146, 14, 70); x.fillRect(ox + 92, 146, 14, 70);
        x.fillStyle = '#00ff00';
        x.beginPath(); x.arc(ox + 29, 220, 8, 0, 7); x.fill();
        x.beginPath(); x.arc(ox + 99, 220, 8, 0, 7); x.fill();
      }
      // pescoço e cabeça
      x.fillStyle = '#00ff00';
      x.fillRect(ox + 56, 112, 16, 22);
      x.beginPath(); x.ellipse(ox + 64, 96, 22, 27, 0, 0, 7); x.fill();
      // cabelo
      x.fillStyle = '#0000ff';
      x.beginPath(); x.ellipse(ox + 64, 82, 23, 16, 0, Math.PI, 0); x.fill();
      x.fillRect(ox + 41, 80, 46, 6);
      if (scarf) { x.fillStyle = '#ffffff'; x.fillRect(ox + 40, 128, 48, 12); x.fillRect(ox + 70, 128, 12, 40); }
    }
    var t = tex(c);
    return t;
  };

  /* ---------- Atlas do jogador (uniforme + pele + rosto) ---------- */
  // Regiões em pixels no canvas 256x256: [x, y, w, h]
  FG.ATLAS = {
    torso: [0, 0, 256, 128],
    sleeve: [0, 128, 64, 32],
    shorts: [64, 128, 64, 32],
    socks: [128, 128, 64, 32],
    boots: [192, 128, 64, 32],
    skin: [0, 160, 64, 32],
    hair: [64, 160, 64, 32],
    hands: [0, 192, 64, 32],
    face: [128, 160, 128, 96],
    misc: [64, 192, 64, 32]
  };
  FG.atlasUV = function (name) {
    var r = FG.ATLAS[name];
    return [r[0] / 256, 1 - (r[1] + r[3]) / 256, (r[0] + r[2]) / 256, 1 - r[1] / 256];
  };
  FG.SKIN_TONES = ['#f1c9a5', '#e0ac85', '#c68863', '#a46a45', '#7d4a2d', '#5a3420'];
  FG.HAIR_COLORS = ['#1a1310', '#2e1d12', '#4a2f1a', '#7a5230', '#b8873e', '#d9c08a', '#0d0d0d'];

  function paintPattern(x, X, Y, W, H, pattern, p, s) {
    x.fillStyle = p; x.fillRect(X, Y, W, H);
    x.fillStyle = s;
    if (pattern === 'stripes') { for (var i = 0; i < W; i += 32) x.fillRect(X + i + 8, Y, 14, H); }
    else if (pattern === 'hoops') { for (var j = 0; j < H; j += 26) x.fillRect(X, Y + j + 6, W, 12); }
    else if (pattern === 'halves') { x.fillRect(X + W / 2, Y, W / 2, H); }
    else if (pattern === 'checks') { for (var a = 0; a < W; a += 16) for (var b = 0; b < H; b += 16) if (((a + b) / 16) % 2) x.fillRect(X + a, Y + b, 16, 16); }
    else if (pattern === 'sash') {
      x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
      for (var o = -1; o <= 1; o++) {
        x.beginPath(); var bx = X + o * W;
        x.moveTo(bx - 40, Y); x.lineTo(bx - 14, Y); x.lineTo(bx + 54, Y + H); x.lineTo(bx + 28, Y + H); x.closePath(); x.fill();
      }
      x.restore();
    }
  }

  // opts: {team, number, name, gk, skin, hair, boot, bootAccent, referee}
  FG.playerTexture = function (o) {
    var c = canvas(256, 256), x = c.getContext('2d');
    var t = o.team;
    var prim = o.gk ? t.gk : t.primary, sec = o.gk ? shade(t.gk, -0.35) : t.secondary;
    var pattern = o.gk ? 'solid' : t.pattern;
    if (o.referee) { prim = '#151515'; sec = '#f2d21b'; pattern = 'solid'; }
    var A = FG.ATLAS;
    // camisa
    paintPattern(x, 0, 0, 256, 128, pattern, prim, sec);
    // sombreado lateral (volume)
    var g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.25, 'rgba(0,0,0,0.22)'); g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    // gola
    x.fillStyle = sec; x.fillRect(0, 0, 256, 7);
    // dobras do tecido
    x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 2;
    for (var f = 0; f < 6; f++) { x.beginPath(); var fx = Math.random() * 256; x.moveTo(fx, 40 + Math.random() * 40); x.quadraticCurveTo(fx + 20, 90, fx + 6, 126); x.stroke(); }
    if (!o.referee) {
      var numColor = o.gk ? '#ffffff' : t.num;
      // número nas costas
      x.font = 'bold 62px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 5; x.strokeStyle = FG.isDark(numColor) ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
      x.strokeText(String(o.number), 128, 76); x.fillStyle = numColor; x.fillText(String(o.number), 128, 76);
      // nome
      x.font = 'bold 15px Arial, sans-serif'; x.fillText((o.name || '').toUpperCase(), 128, 30, 110);
      // escudo e número frontal
      x.fillStyle = sec; x.beginPath(); x.arc(22, 34, 9, 0, 7); x.fill();
      x.strokeStyle = numColor; x.lineWidth = 2; x.stroke();
      x.font = 'bold 18px Arial, sans-serif'; x.fillStyle = numColor; x.fillText(String(o.number), 234, 36);
    } else {
      x.fillStyle = sec; x.fillRect(0, 7, 256, 4);
    }
    // mangas
    paintPattern(x, A.sleeve[0], A.sleeve[1], A.sleeve[2], A.sleeve[3], pattern === 'stripes' || pattern === 'checks' ? 'solid' : pattern === 'halves' ? 'solid' : pattern, prim, sec);
    x.fillStyle = sec; x.fillRect(A.sleeve[0], A.sleeve[1] + 28, 64, 4);
    // calção
    var shortsCol = o.referee ? '#151515' : o.gk ? shade(t.gk, -0.25) : t.shorts;
    x.fillStyle = shortsCol; x.fillRect(A.shorts[0], A.shorts[1], 64, 32);
    x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(A.shorts[0], A.shorts[1] + 26, 64, 6);
    // meião
    var sockCol = o.referee ? '#151515' : o.gk ? shade(t.gk, -0.1) : t.socks;
    x.fillStyle = sockCol; x.fillRect(A.socks[0], A.socks[1], 64, 32);
    x.fillStyle = o.referee ? '#f2d21b' : t.secondary; x.fillRect(A.socks[0], A.socks[1], 64, 3);
    // chuteira
    x.fillStyle = o.boot || '#222'; x.fillRect(A.boots[0], A.boots[1], 64, 32);
    x.fillStyle = o.bootAccent || '#fff'; x.fillRect(A.boots[0] + 10, A.boots[1] + 12, 44, 5);
    // pele
    x.fillStyle = o.skin; x.fillRect(A.skin[0], A.skin[1], 64, 32);
    // cabelo
    x.fillStyle = o.hair; x.fillRect(A.hair[0], A.hair[1], 64, 32);
    for (var h = 0; h < 80; h++) { x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(A.hair[0] + Math.random() * 64, A.hair[1] + Math.random() * 32, 1, 5); }
    // mãos / luvas
    x.fillStyle = o.gk ? '#f4f4f4' : o.skin; x.fillRect(A.hands[0], A.hands[1], 64, 32);
    if (o.gk) { x.fillStyle = t.gk; x.fillRect(A.hands[0], A.hands[1] + 20, 64, 12); }
    // rosto (UV da esfera: frente em u = 0.25)
    var F = A.face;
    x.fillStyle = o.skin; x.fillRect(F[0], F[1], F[2], F[3]);
    var cx = F[0] + F[2] * 0.25, ey = F[1] + F[3] * 0.47;
    // cabelo na testa / nuca
    x.fillStyle = o.hair; x.fillRect(F[0], F[1], F[2], F[3] * 0.2);
    // sobrancelhas
    x.fillStyle = shade(o.hair, -0.2);
    x.fillRect(cx - 14, ey - 7, 9, 2.5); x.fillRect(cx + 5, ey - 7, 9, 2.5);
    // olhos
    x.fillStyle = '#f5f2ea'; x.fillRect(cx - 13, ey - 2, 8, 4); x.fillRect(cx + 5, ey - 2, 8, 4);
    x.fillStyle = '#2a1a10'; x.fillRect(cx - 10, ey - 2, 4, 4); x.fillRect(cx + 7, ey - 2, 4, 4);
    // nariz (sombra) e boca
    x.fillStyle = shade(o.skin, -0.18); x.fillRect(cx - 2, ey + 4, 4, 8);
    x.fillStyle = shade(o.skin, -0.35); x.fillRect(cx - 6, ey + 17, 12, 2.5);
    // bochechas
    x.fillStyle = 'rgba(200,80,60,0.08)'; x.beginPath(); x.arc(cx - 13, ey + 11, 5, 0, 7); x.arc(cx + 13, ey + 11, 5, 0, 7); x.fill();
    // barba ocasional
    if (o.beard) { x.fillStyle = 'rgba(30,20,10,0.35)'; x.fillRect(cx - 16, ey + 14, 32, 14); }
    // misc
    x.fillStyle = '#ffffff'; x.fillRect(A.misc[0], A.misc[1], 64, 32);
    var tx = new THREE.CanvasTexture(c);
    tx.anisotropy = 2;
    return tx;
  };

  /* ---------- Céu ---------- */
  FG.skyMaterial = function (night) {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(night ? 0x02040c : 0x2f7fd8) }, mid: { value: new THREE.Color(night ? 0x0a1830 : 0x9cc8f0) }, bot: { value: new THREE.Color(night ? 0x0b1220 : 0xdfe9ef) }, night: { value: night ? 1 : 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float night; varying vec3 vP;' +
        'float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }' +
        'void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y,0.0,1.0),0.6)) : bot;' +
        ' if(night > 0.5 && y > 0.05){ vec3 q = floor(vP*400.0); float s = step(0.997, h(q)); c += vec3(s)*0.8*y; }' +
        ' gl_FragColor = vec4(c,1.0); }'
    });
  };
})();
