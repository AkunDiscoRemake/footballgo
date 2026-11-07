/* Football Go - interface em VR: painéis desenhados em canvas, laser do controle, HUD */
(function () {
  var W = 1024, H = 640;

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  FG.rr = rr;
  FG.wrap = function (c, text, x, y, maxW, lh) {
    var words = String(text).split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) { c.fillText(line, x, yy); line = words[i]; yy += lh; }
      else line = test;
    }
    if (line) { c.fillText(line, x, yy); yy += lh; }
    return yy;
  };

  FG.UI = function (scene, camera, headRef) {
    var ui = this;
    ui.canvas = FG.makeCanvas(W, H); ui.ctx = ui.canvas.getContext('2d');
    ui.tex = new THREE.CanvasTexture(ui.canvas); ui.tex.anisotropy = 4;
    ui.tex.minFilter = THREE.LinearFilter; ui.tex.generateMipmaps = false;
    var worldW = 2.0, worldH = worldW * H / W;
    ui.mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldH), new THREE.MeshBasicMaterial({ map: ui.tex, transparent: true, depthTest: false, depthWrite: false }));
    ui.mesh.renderOrder = 100; ui.mesh.visible = false;
    scene.add(ui.mesh);
    ui.buttons = []; ui.hover = -1; ui.screen = null; ui.dirty = true; ui.visible = false;
    ui.camera = camera;
    ui.raycaster = new THREE.Raycaster();
    // laser
    var lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    ui.laser = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x7dffb3, transparent: true, opacity: 0.8, depthTest: false }));
    ui.laser.renderOrder = 101; ui.laser.visible = false; scene.add(ui.laser);
    ui.dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    ui.dot.renderOrder = 102; ui.dot.visible = false; scene.add(ui.dot);
  };
  var proto = FG.UI.prototype;

  proto.open = function (screen, keepPlace) {
    this.screen = screen; this.visible = true; this.mesh.visible = true; this.dirty = true; this.hover = -1;
    this.state = {};
    if (!FG.inXR && !this.visibleBefore) { this.savedPitch = FG.input.pitch; FG.input.pitch = -0.05; }
    this.visibleBefore = true;
    if (!keepPlace) this.place();
  };
  proto.close = function () {
    if (!FG.inXR && this.visibleBefore && this.savedPitch !== undefined) FG.input.pitch = this.savedPitch;
    this.visibleBefore = false;
    this.visible = false; this.mesh.visible = false; this.laser.visible = false; this.dot.visible = false; this.screen = null; };
  proto.refresh = function () { this.dirty = true; };
  // coloca o painel na frente do jogador
  proto.place = function () {
    var cam = this.camera, p = new THREE.Vector3(), d = new THREE.Vector3();
    cam.getWorldPosition(p); cam.getWorldDirection(d); d.y = 0;
    if (d.lengthSq() < 0.001) d.set(0, 0, -1); d.normalize();
    this.mesh.position.set(p.x + d.x * 2.2, p.y - 0.15, p.z + d.z * 2.2);
    this.mesh.lookAt(p.x, p.y - 0.15, p.z);
  };

  proto.draw = function () {
    var c = this.ctx; this.buttons = [];
    c.clearRect(0, 0, W, H);
    // fundo vidro
    rr(c, 4, 4, W - 8, H - 8, 28);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,38,22,0.94)'); g.addColorStop(1, 'rgba(4,16,10,0.94)');
    c.fillStyle = g; c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(80,220,140,0.55)'; c.stroke();
    c.textBaseline = 'middle'; c.textAlign = 'left';
    if (this.screen) this.screen(c, this);
    this.tex.needsUpdate = true; this.dirty = false;
  };
  // helpers de desenho para as telas
  proto.title = function (t, sub) {
    var c = this.ctx;
    c.fillStyle = '#ffffff'; c.font = 'bold 44px Arial'; c.textAlign = 'left'; c.fillText(t, 40, 52);
    if (sub) { c.fillStyle = '#9fd8b4'; c.font = '22px Arial'; c.fillText(sub, 42, 92); }
    // moedas no canto
    c.textAlign = 'right'; c.fillStyle = '#ffd23f'; c.font = 'bold 28px Arial'; c.fillText('● ' + FG.save.coins, W - 40, 52);
    c.textAlign = 'left';
  };
  proto.btn = function (x, y, w, h, label, cb, o) {
    o = o || {};
    var c = this.ctx, i = this.buttons.length, hov = this.hover === i && !o.disabled;
    this.buttons.push({ x: x, y: y, w: w, h: h, cb: cb, disabled: o.disabled });
    rr(c, x, y, w, h, o.r || 14);
    var base = o.color || (o.primary ? '#2fbf71' : 'rgba(255,255,255,0.08)');
    c.fillStyle = o.disabled ? 'rgba(255,255,255,0.04)' : hov ? (o.primary ? '#54e392' : 'rgba(80,220,140,0.35)') : base;
    c.fill();
    if (o.selected) { c.lineWidth = 4; c.strokeStyle = '#ffd23f'; c.stroke(); }
    else { c.lineWidth = 2; c.strokeStyle = hov ? '#7dffb3' : 'rgba(255,255,255,0.12)'; c.stroke(); }
    if (o.draw) o.draw(c, x, y, w, h, hov);
    if (label) {
      c.fillStyle = o.disabled ? 'rgba(255,255,255,0.35)' : (o.primary && !hov ? '#04210f' : (o.textColor || '#ffffff'));
      c.font = (o.bold === false ? '' : 'bold ') + (o.size || 26) + 'px Arial';
      c.textAlign = o.align || 'center';
      var tx = o.align === 'left' ? x + 18 : x + w / 2;
      c.fillText(label, tx, y + h / 2 + 1, w - 20);
      if (o.sub) { c.font = '18px Arial'; c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillText(o.sub, tx, y + h / 2 + 24, w - 20); }
      c.textAlign = 'left';
    }
    return i;
  };
  proto.text = function (t, x, y, o) {
    o = o || {}; var c = this.ctx;
    c.fillStyle = o.color || '#e8f5ec'; c.font = (o.bold ? 'bold ' : '') + (o.size || 24) + 'px Arial'; c.textAlign = o.align || 'left';
    var r = o.wrap ? FG.wrap(c, t, x, y, o.wrap, (o.size || 24) * 1.35) : (c.fillText(t, x, y), y + (o.size || 24) * 1.35);
    c.textAlign = 'left'; return r;
  };
  proto.bar = function (x, y, w, label, val, color) {
    var c = this.ctx;
    c.fillStyle = '#cfe9d8'; c.font = '20px Arial'; c.textAlign = 'left'; c.fillText(label, x, y);
    rr(c, x + 130, y - 9, w - 180, 18, 9); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill();
    rr(c, x + 130, y - 9, Math.max(18, (w - 180) * val / 100), 18, 9); c.fillStyle = color || '#35d07f'; c.fill();
    c.fillStyle = '#ffffff'; c.font = 'bold 20px Arial'; c.textAlign = 'right'; c.fillText(String(val), x + w, y); c.textAlign = 'left';
  };

  // ray: {origin, dir}; click: bool
  proto.update = function (ray, click, showLaser) {
    if (!this.visible) return;
    if (this.dirty) this.draw();
    if (!ray) { this.laser.visible = false; this.dot.visible = false; return; }
    this.raycaster.set(ray.origin, ray.dir);
    var hits = this.raycaster.intersectObject(this.mesh);
    var hv = -1;
    if (hits.length) {
      var uv = hits[0].uv, px = uv.x * W, py = (1 - uv.y) * H;
      for (var i = 0; i < this.buttons.length; i++) {
        var b = this.buttons[i];
        if (!b.disabled && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) { hv = i; break; }
      }
      this.dot.visible = true; this.dot.position.copy(hits[0].point); this.dot.quaternion.copy(this.mesh.quaternion);
      this.dot.translateZ(0.005);
    } else this.dot.visible = false;
    if (showLaser) {
      this.laser.visible = true; this.laser.position.copy(ray.origin);
      var len = hits.length ? hits[0].distance : 4;
      this.laser.scale.set(1, 1, len);
      this.laser.lookAt(ray.origin.x - ray.dir.x, ray.origin.y - ray.dir.y, ray.origin.z - ray.dir.z);
    } else this.laser.visible = false;
    if (hv !== this.hover) { this.hover = hv; this.dirty = true; }
    if (click && hv >= 0) {
      var cb = this.buttons[hv].cb; FG.audio.click(); this.dirty = true;
      if (cb) cb();
    }
    if (this.dirty) this.draw();
  };

  /* ---------- HUD: placar e mensagens presos à cabeça ---------- */
  FG.HUD = function (camera) {
    var h = this;
    h.sc = FG.makeCanvas(512, 96); h.st = new THREE.CanvasTexture(h.sc); h.st.minFilter = THREE.LinearFilter; h.st.generateMipmaps = false;
    h.score = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.12), new THREE.MeshBasicMaterial({ map: h.st, transparent: true, depthTest: false, depthWrite: false }));
    h.score.position.set(0, 0.42, -1.4); h.score.rotation.x = 0.25; h.score.renderOrder = 110; camera.add(h.score); h.score.visible = false;
    h.mc = FG.makeCanvas(1024, 256); h.mt = new THREE.CanvasTexture(h.mc); h.mt.minFilter = THREE.LinearFilter; h.mt.generateMipmaps = false;
    h.msg = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.325), new THREE.MeshBasicMaterial({ map: h.mt, transparent: true, depthTest: false, depthWrite: false, opacity: 1 }));
    h.msg.position.set(0, 0.05, -1.6); h.msg.renderOrder = 111; camera.add(h.msg); h.msg.visible = false;
    h.msgTime = 0; h.last = '';
    // vinheta de conforto
    var vg = FG.makeCanvas(256, 256), vc = vg.getContext('2d');
    var grd = vc.createRadialGradient(128, 128, 60, 128, 128, 128); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,1)');
    vc.fillStyle = grd; vc.fillRect(0, 0, 256, 256);
    h.vig = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(vg), transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    h.vig.position.set(0, 0, -0.3); h.vig.renderOrder = 120; camera.add(h.vig);
  };
  FG.HUD.prototype.setScore = function (s) {
    if (!s) { this.score.visible = false; return; }
    var key = JSON.stringify(s); if (key === this.last) return; this.last = key;
    var c = this.sc.getContext('2d'); c.clearRect(0, 0, 512, 96);
    rr(c, 2, 2, 508, 92, 18); c.fillStyle = 'rgba(5,15,10,0.82)'; c.fill();
    c.fillStyle = s.homeColor || '#fff'; c.fillRect(14, 20, 10, 56);
    c.fillStyle = s.awayColor || '#fff'; c.fillRect(488, 20, 10, 56);
    c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillStyle = '#fff'; c.font = 'bold 34px Arial';
    c.fillText(s.home, 90, 48); c.fillText(s.away, 422, 48);
    c.font = 'bold 46px Arial'; c.fillStyle = '#ffd23f'; c.fillText(s.score, 256, 42);
    c.font = '20px Arial'; c.fillStyle = '#bfe6cc'; c.fillText(s.time || '', 256, 78);
    this.st.needsUpdate = true; this.score.visible = true;
  };
  FG.HUD.prototype.show = function (title, sub, secs, color) {
    var c = this.mc.getContext('2d'); c.clearRect(0, 0, 1024, 256);
    rr(c, 8, 8, 1008, 240, 30); c.fillStyle = 'rgba(5,15,10,0.85)'; c.fill();
    c.lineWidth = 4; c.strokeStyle = color || '#35d07f'; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = color || '#ffffff'; c.font = 'bold 72px Arial'; c.fillText(title, 512, sub ? 88 : 128, 980);
    if (sub) { c.fillStyle = '#e8f5ec'; c.font = '30px Arial'; FG.wrap(c, sub, 512, 168, 960, 38); }
    this.mt.needsUpdate = true; this.msg.visible = true; this.msgTime = secs || 3; this.msg.material.opacity = 1;
  };
  FG.HUD.prototype.update = function (dt, moveSpeed) {
    if (this.msgTime > 0) {
      this.msgTime -= dt;
      if (this.msgTime < 0.5) this.msg.material.opacity = Math.max(0, this.msgTime / 0.5);
      if (this.msgTime <= 0) this.msg.visible = false;
    }
    var target = FG.save.settings.vignette && FG.inXR ? Math.min(0.85, moveSpeed / 6) : 0;
    var m = this.vig.material; m.opacity += (target - m.opacity) * Math.min(1, dt * 6);
    this.vig.visible = m.opacity > 0.02;
  };
  FG.HUD.prototype.hideMsg = function () { this.msgTime = 0; this.msg.visible = false; };
})();
