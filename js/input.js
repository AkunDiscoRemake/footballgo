/* Football Go - entrada: controle 3DoF (Oculus Go), Quest, teclado e mouse */
(function () {
  FG.Input = function (renderer, camera, head, scene) {
    var I = this;
    I.renderer = renderer; I.camera = camera; I.head = head;
    I.ray = { origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) };
    I.move = new THREE.Vector2(); I.sprint = false;
    I.trigger = false; I.triggerDown = false; I.click = false; I.pause = false; I.snap = 0; I.kickAssist = false;
    I.yaw = 0; I.pitch = -0.6; // câmera no modo navegador
    I.keys = {}; I.mouse = new THREE.Vector2(0, -0.35); I.mouseClick = false; I.hasXRController = false;
    I.controllers = []; I.active = null;
    // controles XR
    for (var i = 0; i < 2; i++) {
      (function (idx) {
        var c = renderer.xr.getController(idx);
        c.userData.idx = idx;
        c.addEventListener('connected', function (e) { c.userData.source = e.data; c.userData.connected = true; c.visible = true; });
        c.addEventListener('disconnected', function () { c.userData.connected = false; c.userData.source = null; c.visible = false; });
        c.addEventListener('selectstart', function () { c.userData.select = true; I.active = c; });
        c.addEventListener('selectend', function () { c.userData.select = false; });
        c.add(FG.controllerModel());
        head.add(c);
        I.controllers.push(c);
      })(i);
    }
    // teclado
    window.addEventListener('keydown', function (e) {
      I.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') I._pause = true;
      if (e.code === 'Space') { I._kick = true; e.preventDefault(); }
      if (e.code === 'Enter') I._click = true;
    });
    window.addEventListener('keyup', function (e) { I.keys[e.code] = false; });
    // mouse
    var el = renderer.domElement, drag = false, lx = 0, ly = 0;
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('pointerdown', function (e) {
      FG.audio.init();
      if (e.button === 2) { drag = true; lx = e.clientX; ly = e.clientY; }
      else { I._click = true; I.mouseDown = true; }
      setMouse(e);
    });
    window.addEventListener('pointerup', function (e) { if (e.button === 2) drag = false; else I.mouseDown = false; });
    el.addEventListener('pointermove', function (e) {
      if (drag) { I.yaw -= (e.clientX - lx) * 0.004; I.pitch = Math.max(-1.3, Math.min(1.2, I.pitch - (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; }
      setMouse(e);
    });
    function setMouse(e) { var r = el.getBoundingClientRect(); I.mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
    I.raycaster = new THREE.Raycaster();
    I.prevPad = false; I.prevTrig = false;
  };

  FG.controllerModel = function () {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.13, 16), new THREE.MeshLambertMaterial({ color: 0x2a2a2e }));
    body.rotation.x = Math.PI / 2; body.position.z = 0.04; g.add(body);
    var pad = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), new THREE.MeshBasicMaterial({ color: 0x55585e }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.0215, 0.0); g.add(pad);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: 0x35d07f }));
    tip.position.z = -0.025; g.add(tip);
    g.userData.isModel = true;
    return g;
  };

  var proto = FG.Input.prototype;
  proto.getGamepad = function () {
    for (var i = 0; i < this.controllers.length; i++) {
      var c = this.controllers[i];
      if (c.userData.connected && c.userData.source && c.userData.source.gamepad) {
        if (!this.active || !this.active.userData.connected) this.active = c;
      }
    }
    if (this.active && this.active.userData.source) return this.active.userData.source.gamepad || null;
    return null;
  };
  proto.update = function (dt, inXR) {
    var I = this;
    I.triggerDown = false; I.click = false; I.pause = false; I.snap = 0; I.kickAssist = false;
    I.move.set(0, 0); I.sprint = false;
    if (inXR) {
      var c = null;
      for (var i = 0; i < I.controllers.length; i++) if (I.controllers[i].userData.connected) { c = c || I.controllers[i]; }
      if (I.active && I.active.userData.connected) c = I.active;
      I.hasXRController = !!c;
      if (c) {
        c.updateMatrixWorld(true);
        I.ray.origin.setFromMatrixPosition(c.matrixWorld);
        I.ray.dir.set(0, 0, -1).transformDirection(c.matrixWorld);
      } else {
        // sem controle: usa o olhar
        I.camera.getWorldPosition(I.ray.origin); I.camera.getWorldDirection(I.ray.dir);
      }
      var gp = I.getGamepad();
      var trig = !!(c && c.userData.select), padPress = false, ax = 0, ay = 0, touched = false;
      if (gp) {
        var b = gp.buttons, a = gp.axes;
        // mapeamento: xr-standard = [0 gatilho, 1 grip, 2 touchpad, 3 analógico]
        // Oculus Go antigo (WebVR / sem mapeamento): [0 touchpad, 1 gatilho]
        var legacyGo = gp.mapping !== 'xr-standard' && b.length <= 2 && /go/i.test(gp.id || '');
        var trigB = legacyGo ? b[1] : b[0];
        var padB = legacyGo ? b[0] : (b[2] || (b.length === 2 ? b[1] : null));
        trig = trig || !!(trigB && trigB.pressed);
        padPress = !!(padB && padB.pressed) || !!(b[3] && b[3].pressed && a.length > 2);
        var tx = a[0] || 0, ty = a[1] || 0, sx = a[2] || 0, sy = a[3] || 0;
        if (Math.abs(sx) + Math.abs(sy) > Math.abs(tx) + Math.abs(ty)) { ax = sx; ay = sy; } else { ax = tx; ay = ty; }
        touched = !!(padB && (padB.touched || padB.pressed)) || Math.abs(ax) > 0.04 || Math.abs(ay) > 0.04;
        I.debug = { id: gp.id, mapping: gp.mapping, buttons: b.map(function (x) { return (x.pressed ? 'P' : x.touched ? 't' : '-'); }).join(''), axes: Array.prototype.map.call(a, function (v) { return v.toFixed(2); }).join(' ') };
      }
      I.triggerDown = trig && !I.prevTrig; I.prevTrig = trig; I.trigger = trig;
      var pd = padPress && !I.prevPad; I.prevPad = padPress;
      I.click = I.triggerDown || pd;
      I.padClick = pd;
      I.padT = (I.padT || 0) + dt;
      if (pd) {
        // pausa = clique DUPLO no touchpad (não atrapalha andar)
        if (I.lastPadClick !== undefined && I.padT - I.lastPadClick < 0.4) { I.pause = true; I.lastPadClick = undefined; }
        else I.lastPadClick = I.padT;
        // giro opcional: clique nas bordas esquerda/direita
        if (FG.save.settings.padTurn && Math.abs(ax) > 0.65 && Math.abs(ay) < 0.5) I.snap = ax > 0 ? -1 : 1;
      }
      // andar: tocar em QUALQUER lugar do touchpad. Centro = para frente; bordas = direção.
      var mx = 0, my = 0;
      if (touched) {
        var mag = Math.sqrt(ax * ax + ay * ay);
        if (mag < 0.3) { mx = 0; my = 1; }
        else { mx = ax / mag; my = -ay / mag; if (my > 0.4) { mx *= 0.6; } }
        var l = Math.sqrt(mx * mx + my * my) || 1; mx /= l; my /= l;
      }
      // suaviza (o touchpad do Go é ruidoso)
      I.smx = (I.smx || 0) + (mx - (I.smx || 0)) * Math.min(1, dt * 35);
      I.smy = (I.smy || 0) + (my - (I.smy || 0)) * Math.min(1, dt * 35);
      if (Math.abs(I.smx) + Math.abs(I.smy) > 0.05) I.move.set(I.smx, I.smy);
      I.sprint = trig;
    } else {
      // navegador
      var K = I.keys;
      if (K.KeyW) I.move.y += 1; if (K.KeyS) I.move.y -= 1; if (K.KeyA) I.move.x -= 1; if (K.KeyD) I.move.x += 1;
      if (I.move.lengthSq() > 1) I.move.normalize();
      I.sprint = !!(K.ShiftLeft || K.ShiftRight);
      if (K.ArrowLeft || K.KeyQ) I.yaw += dt * 2.0; if (K.ArrowRight || K.KeyE) I.yaw -= dt * 2.0;
      if (K.ArrowUp) I.pitch = Math.min(1.2, I.pitch + dt * 1.4); if (K.ArrowDown) I.pitch = Math.max(-1.3, I.pitch - dt * 1.4);
      I.camera.updateMatrixWorld(true);
      I.raycaster.setFromCamera(I.mouse, I.camera);
      I.ray.origin.copy(I.raycaster.ray.origin); I.ray.dir.copy(I.raycaster.ray.direction);
      I.click = !!I._click; I.triggerDown = I.click; I.trigger = !!I.mouseDown;
      I.pause = !!I._pause; I.kickAssist = !!I._kick;
    }
    I._click = false; I._pause = false; I._kick = false;
    // modelos do controle só aparecem em menus
    for (var j = 0; j < I.controllers.length; j++) I.controllers[j].visible = I.controllers[j].userData.connected && I.showModels;
  };
})();
