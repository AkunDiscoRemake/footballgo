/* Football Go - bola: modelo e física (gravidade, arrasto, efeito Magnus, quique, traves e rede) */
(function () {
  var P = FG.PITCH;
  var ICO = null;
  function icoVerts() {
    if (ICO) return ICO;
    var t = (1 + Math.sqrt(5)) / 2;
    var v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    ICO = v.map(function (a) { return new THREE.Vector3(a[0], a[1], a[2]).normalize(); });
    return ICO;
  }

  FG.ballGeometry = function (item, r) {
    var geo = new THREE.IcosahedronGeometry(r || 0.11, 6);
    var pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    var base = new THREE.Color(item.base), patch = new THREE.Color(item.patch), seam = new THREE.Color(item.base).multiplyScalar(0.55);
    var V = icoVerts(), p = new THREE.Vector3(), c = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      var a1 = 9, a2 = 9;
      for (var k = 0; k < V.length; k++) { var a = Math.acos(Math.max(-1, Math.min(1, p.dot(V[k])))); if (a < a1) { a2 = a1; a1 = a; } else if (a < a2) a2 = a; }
      c.copy(base);
      if (item.style === 'classic') { if (a1 < 0.36) c.copy(patch); }
      else if (item.style === 'triad') { if (a1 > 0.2 && a1 < 0.4) c.copy(patch); else if (a1 < 0.08) c.copy(patch); }
      else { var lon = Math.atan2(p.z, p.x), lat = Math.asin(p.y); if (Math.sin(lon * 3 + lat * 4) > 0.55 || Math.abs(Math.sin(lat * 6 - lon)) < 0.08) c.copy(patch); }
      if (Math.abs(a2 - a1) < 0.025) c.lerp(seam, 0.6); // costuras
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return geo;
  };
  FG.ballMaterial = function () {
    return FG.quality === 'high' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0 }) : new THREE.MeshLambertMaterial({ vertexColors: true });
  };

  FG.Ball = function (scene) {
    var B = this;
    B.r = 0.11;
    B.pos = new THREE.Vector3(0, B.r, 0);
    B.vel = new THREE.Vector3();
    B.spin = new THREE.Vector3();
    B.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), FG.ballMaterial());
    B.mesh.castShadow = FG.quality === 'high';
    scene.add(B.mesh);
    B.held = null; // {pos: fn}
    B.lastTouch = null; // {player, team, time, kick}
    B.fx = { drag: 1, kick: 1, bounce: 0.6, curve: 1 };
    B.listeners = [];
    B.inGoal = false;
    B.walls = true;
  };
  var proto = FG.Ball.prototype;
  proto.setItem = function (item, fx) {
    this.mesh.geometry.dispose();
    this.mesh.geometry = FG.ballGeometry(item, this.r);
    if (fx) this.fx = fx;
  };
  proto.emit = function (ev, data) { for (var i = 0; i < this.listeners.length; i++) this.listeners[i](ev, data); };
  proto.place = function (x, z, y) {
    this.pos.set(x, y === undefined ? this.r : y, z); this.vel.set(0, 0, 0); this.spin.set(0, 0, 0); this.held = null; this.inGoal = false;
    this.mesh.position.copy(this.pos);
  };
  proto.speed = function () { return this.vel.length(); };
  proto.touch = function (player, team, kick) {
    this.lastTouch = { player: player, team: team, time: FG.now, kick: !!kick };
    this.emit('touch', this.lastTouch);
  };

  var tmp = new THREE.Vector3(), mag = new THREE.Vector3(), axis = new THREE.Vector3(), q = new THREE.Quaternion(), prev = new THREE.Vector3();
  var G = 9.81, KD = 0.0135, KM = 0.0045;

  function insideGoal(p) {
    var ax = Math.abs(p.x);
    return ax > P.HL && ax < P.HL + 2.0 && Math.abs(p.z) < P.GOAL_HW + 0.06 && p.y < P.GOAL_H;
  }

  proto.step = function (dt) {
    var B = this;
    if (B.held) { B.held(B.pos); B.vel.set(0, 0, 0); B.mesh.position.copy(B.pos); return; }
    var n = Math.max(1, Math.ceil(dt / 0.006)), h = dt / n;
    for (var s = 0; s < n; s++) B.substep(h);
    B.mesh.position.copy(B.pos);
    // rotação visual
    var onGround = B.pos.y <= B.r + 0.01;
    if (onGround) {
      axis.set(B.vel.z, 0, -B.vel.x); var sp = axis.length();
      if (sp > 0.001) { axis.multiplyScalar(1 / sp); q.setFromAxisAngle(axis, sp / B.r * dt); B.mesh.quaternion.premultiply(q); }
    } else {
      var w = B.spin.length();
      if (w > 0.01) { axis.copy(B.spin).multiplyScalar(1 / w); q.setFromAxisAngle(axis, w * dt); B.mesh.quaternion.premultiply(q); }
    }
  };

  proto.substep = function (h) {
    var B = this, v = B.vel, p = B.pos, r = B.r;
    prev.copy(p);
    var sp = v.length();
    var airborne = p.y > r + 0.005 || v.y > 0.1;
    if (airborne) {
      v.y -= G * h;
      // arrasto quadrático
      v.addScaledVector(v, -KD * B.fx.drag * sp * h);
      // efeito Magnus (curva)
      mag.crossVectors(B.spin, v).multiplyScalar(KM * B.fx.curve * h);
      v.add(mag);
      B.spin.multiplyScalar(Math.exp(-0.25 * h));
    } else {
      // rolando na grama
      var hs = Math.sqrt(v.x * v.x + v.z * v.z);
      if (hs > 0) {
        var dec = (0.55 + 0.32 * hs) * h;
        var f = Math.max(0, hs - dec) / hs; v.x *= f; v.z *= f;
        // efeito lateral leve no chão
        v.x += -B.spin.y * v.z * 0.0006 * B.fx.curve; v.z += B.spin.y * v.x * 0.0006 * B.fx.curve;
      }
      B.spin.multiplyScalar(Math.exp(-3 * h));
    }
    p.addScaledVector(v, h);
    // chão
    if (p.y < r) {
      p.y = r;
      if (v.y < -0.6) {
        var imp = -v.y;
        v.y = imp * B.fx.bounce;
        var fr = 0.8; v.x *= fr; v.z *= fr;
        // efeito do giro no quique
        v.x += B.spin.z * r * 0.25; v.z -= B.spin.x * r * 0.25;
        B.spin.multiplyScalar(0.6);
        if (imp > 2) B.emit('bounce', imp);
      } else v.y = 0;
    }
    // traves (cilindros verticais) e travessão
    var PR = 0.06, HW = P.GOAL_HW + PR, H = P.GOAL_H + PR;
    for (var s = -1; s <= 1; s += 2) {
      var gx = s * P.HL;
      if (Math.abs(p.x - gx) > 1) continue;
      for (var zz = -1; zz <= 1; zz += 2) {
        var dx = p.x - gx, dz = p.z - zz * HW;
        if (p.y < H + r) {
          var d = Math.sqrt(dx * dx + dz * dz);
          if (d < r + PR && d > 0.0001) { this.collide(dx / d, 0, dz / d, r + PR - d, 0.65); B.emit('post', sp); }
        }
      }
      if (Math.abs(p.z) < HW) {
        var dx2 = p.x - gx, dy2 = p.y - H, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d2 < r + PR && d2 > 0.0001) { this.collide(dx2 / d2, dy2 / d2, 0, r + PR - d2, 0.65); B.emit('post', sp); }
      }
    }
    // rede
    var inNow = insideGoal(p), inPrev = insideGoal(prev);
    if (inNow && !inPrev && Math.abs(prev.x) > P.HL) {
      // entrou pela lateral/fundo/topo da rede -> bloqueia
      p.copy(prev); v.multiplyScalar(-0.15); B.emit('netOut', sp);
    } else if (inPrev && !inNow && Math.abs(p.x) > P.HL) {
      // tentando sair pela rede -> segura
      p.copy(prev); if (sp > 3) B.emit('net', sp);
      v.multiplyScalar(0.12);
    }
    // placas de publicidade (paredes)
    if (B.walls) {
      if (Math.abs(p.z) > P.HW + 3.9 - r && p.y < 1.0) { p.z = Math.sign(p.z) * (P.HW + 3.9 - r); v.z *= -0.4; }
      if (Math.abs(p.x) > P.HL + 4.4 - r && p.y < 1.0) { p.x = Math.sign(p.x) * (P.HL + 4.4 - r); v.x *= -0.4; }
      if (Math.abs(p.z) > P.HW + 8 || Math.abs(p.x) > P.HL + 9) { if (v.y > 0) v.y = 0; v.x *= -0.3; v.z *= -0.3; p.x = Math.max(-P.HL - 8.9, Math.min(P.HL + 8.9, p.x)); p.z = Math.max(-P.HW - 7.9, Math.min(P.HW + 7.9, p.z)); }
    }
  };
  proto.collide = function (nx, ny, nz, pen, e) {
    var v = this.vel, vn = v.x * nx + v.y * ny + v.z * nz;
    this.pos.x += nx * pen; this.pos.y += ny * pen; this.pos.z += nz * pen;
    if (vn < 0) { v.x -= (1 + e) * vn * nx; v.y -= (1 + e) * vn * ny; v.z -= (1 + e) * vn * nz; this.spin.multiplyScalar(0.5); }
  };

  // chute "calculado" (IA): alvo, velocidade horizontal, altura de pico opcional
  proto.kickTo = function (tx, tz, speed, loft, ty) {
    var B = this;
    var dx = tx - B.pos.x, dz = tz - B.pos.z, d = Math.sqrt(dx * dx + dz * dz) || 0.001;
    var t = d / speed;
    // compensação aproximada do arrasto/atrito
    var vy;
    if (ty !== undefined) vy = (ty - B.pos.y) / t + 0.5 * G * t;
    else vy = loft ? 0.5 * G * t : 0;
    var comp = loft || ty !== undefined ? 1 + 0.012 * d : 1 + 0.02 * d;
    B.vel.set(dx / d * speed * comp, vy, dz / d * speed * comp);
    B.held = null;
  };
  // prevê a posição em t segundos (aproximação usada pela IA)
  proto.predict = function (t, out) {
    var B = this; out = out || new THREE.Vector3();
    var hs = Math.sqrt(B.vel.x * B.vel.x + B.vel.z * B.vel.z);
    var k = hs > 0 ? Math.min(t, hs / 1.5) : 0;
    var travel = hs > 0 ? (hs * k - 0.5 * 1.5 * k * k) / hs : 0;
    out.set(B.pos.x + B.vel.x * travel, Math.max(B.r, B.pos.y + B.vel.y * t - 4.9 * t * t), B.pos.z + B.vel.z * travel);
    return out;
  };
})();
