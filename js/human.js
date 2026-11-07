/* Football Go - o jogador humano: movimento, pé controlado pelo controle 3DoF, chute, domínio, cabeceio, luvas de goleiro */
(function () {
  var P = FG.PITCH;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  FG.Human = function (scene, rig, camera) {
    var H = this;
    H.rig = rig; H.camera = camera;
    H.pos = rig.position; // posição do corpo = rig
    H.vel = new THREE.Vector3(); H.yaw = 0;
    H.foot = new THREE.Vector3(0, 0.07, 0.5); H.footPrev = H.foot.clone(); H.footVel = new THREE.Vector3(); H.footTarget = new THREE.Vector3();
    H.stamina = 1; H.cool = 0; H.mode = 'field'; H.canMove = true; H.player = null;
    H.legs = FG.FPLegs(scene);
    H.headPos = new THREE.Vector3(); H.headPrev = new THREE.Vector3(); H.headVel = new THREE.Vector3();
    H.touches = 0; H.lastKickSpeed = 0;
    // luvas
    var gm = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }), gm2 = new THREE.MeshLambertMaterial({ color: 0x35d07f });
    H.gloves = new THREE.Group();
    [-1, 1].forEach(function (s) {
      var g = new THREE.Group();
      var palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.04), gm); g.add(palm);
      for (var i = 0; i < 4; i++) { var f = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.07, 0.03), gm); f.position.set(-0.04 + i * 0.027, 0.095, 0); g.add(f); }
      var th = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.03), gm); th.position.set(s * 0.065, 0.02, 0); th.rotation.z = s * 0.6; g.add(th);
      var cuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.05, 0.05), gm2); cuff.position.y = -0.08; g.add(cuff);
      g.position.x = s * 0.09; H.gloves.add(g);
    });
    H.gloves.visible = false; scene.add(H.gloves);
    H.glove = new THREE.Vector3(); H.gloveTarget = new THREE.Vector3(); H.gloveVel = new THREE.Vector3(); H.glovePrev = new THREE.Vector3();
    H.keeperX = P.HL; H.keeperFacing = -1;
  };
  var proto = FG.Human.prototype;

  proto.setKit = function (team) {
    this.team = team;
    this.legs.setKit(team, FG.bootFx().item, FG.save.skin || '#c68863');
  };
  proto.teleport = function (x, z, yaw) {
    this.pos.set(x, 0, z); this.vel.set(0, 0, 0);
    if (yaw !== undefined) this.faceYaw(yaw);
    this.foot.set(x, 0.07, z); this.footPrev.copy(this.foot); this.footVel.set(0, 0, 0);
  };
  // gira o rig para a câmera olhar na direção yaw
  proto.faceYaw = function (yaw) {
    if (!FG.inXR) { FG.input.yaw = 0; FG.input.pitch = this.mode === 'keeper' ? -0.1 : -0.6; this.rig.rotation.y = yaw - Math.PI; return; }
    var camYaw = this.cameraYaw();
    this.rig.rotation.y += angDiff(yaw, camYaw);
  };
  proto.cameraYaw = function () {
    var d = new THREE.Vector3(); this.camera.getWorldDirection(d);
    return Math.atan2(d.x, d.z);
  };

  var dir = new THREE.Vector3(), tmp = new THREE.Vector3(), n = new THREE.Vector3(), rel = new THREE.Vector3(), tang = new THREE.Vector3(), camDir = new THREE.Vector3();

  proto.update = function (dt, input, ball, ctx) {
    var H = this;
    ctx = ctx || {};
    var bfx = FG.bootFx();
    H.camera.getWorldDirection(camDir);
    var yaw = H.yaw = Math.atan2(camDir.x, camDir.z);
    // cabeça
    H.headPrev.copy(H.headPos); H.camera.getWorldPosition(H.headPos);
    if (dt > 0) H.headVel.subVectors(H.headPos, H.headPrev).divideScalar(dt);
    if (input.snap) H.rig.rotation.y += input.snap * (FG.save.settings.snap * Math.PI / 180);

    if (H.mode === 'keeper') return H.updateKeeper(dt, input, ball, ctx);
    H.gloves.visible = false;

    // movimento
    var sp = 0;
    var target = tmp.set(0, 0, 0);
    if (H.canMove && (input.move.x || input.move.y)) {
      var fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw); // direita = (-cos, sin)
      var sprint = input.sprint && H.stamina > 0.05;
      var maxS = (sprint ? 7.6 : 5.0) * bfx.speed;
      target.set((fx * input.move.y + rx * input.move.x) * maxS, 0, (fz * input.move.y + rz * input.move.x) * maxS);
      if (sprint) H.stamina = Math.max(0, H.stamina - dt * 0.09);
    }
    if (!(input.sprint && (input.move.x || input.move.y))) H.stamina = Math.min(1, H.stamina + dt * 0.06);
    var acc = 1 - Math.exp(-dt * 5);
    H.vel.x += (target.x - H.vel.x) * acc; H.vel.z += (target.z - H.vel.z) * acc;
    H.pos.x += H.vel.x * dt; H.pos.z += H.vel.z * dt;
    var lim = ctx.bounds || { x: P.HL + 4, z: P.HW + 3.5 };
    H.pos.x = clamp(H.pos.x, -lim.x, lim.x); H.pos.z = clamp(H.pos.z, -lim.z, lim.z);
    if (ctx.zone) ctx.zone(H.pos);
    sp = Math.sqrt(H.vel.x * H.vel.x + H.vel.z * H.vel.z);
    H.speed = sp;

    // pé
    var pitch, fyaw;
    if (FG.inXR) {
      dir.copy(input.ray.dir);
      pitch = Math.asin(clamp(dir.y, -1, 1));
      fyaw = Math.abs(dir.y) > 0.98 ? yaw : Math.atan2(dir.x, dir.z);
    } else {
      pitch = -1.3 + (input.mouse.y + 1) / 1.35 * 0.95; // mouse em baixo = pé perto
      fyaw = yaw - input.mouse.x * 1.2;
    }
    var da = clamp(angDiff(fyaw, yaw), -1.75, 1.75);
    var r, lift = 0;
    if (pitch < -0.3) r = 0.12 + clamp((pitch + 1.3) / 1.0, 0, 1) * 0.83;
    else { r = 0.95; lift = clamp((pitch + 0.3) / 0.9, 0, 1) * 0.75; }
    if (Math.abs(da) > 1.2) r *= 0.8;
    var a = yaw + da;
    H.footTarget.set(H.pos.x + Math.sin(a) * r, 0.07 + lift, H.pos.z + Math.cos(a) * r);
    H.footPrev.copy(H.foot);
    // velocidade máxima do pé (com a velocidade do corpo)
    H.foot.x += H.vel.x * dt; H.foot.z += H.vel.z * dt;
    tmp.subVectors(H.footTarget, H.foot); var dl = tmp.length(), maxStep = 24 * dt;
    if (dl > maxStep) tmp.multiplyScalar(maxStep / dl);
    H.foot.add(tmp);
    if (dt > 0) { rel.subVectors(H.foot, H.footPrev).divideScalar(dt); H.footVel.lerp(rel, 0.65); }
    H.legs.update(H.pos.x, H.pos.z, yaw, H.foot, a, FG.save.settings.leftFoot);
    H.cool -= dt;
    if (ball && !ctx.noBall) H.ballInteract(dt, ball, bfx, input);
  };

  proto.ballInteract = function (dt, ball, bfx, input) {
    var H = this, b = ball.pos;
    if (ball.held) return;
    var me = H.player;
    // pé x bola
    n.subVectors(b, H.foot); var d = n.length();
    if (d < 0.205 && H.cool <= 0) {
      if (d < 1e-4) n.set(0, 0, 1); else n.multiplyScalar(1 / d);
      rel.subVectors(H.footVel, ball.vel);
      var vn = rel.dot(n);
      var fs = H.footVel.length();
      if (vn > 0.2 || d < 0.16) {
        var bfxB = FG.ballFx();
        if (fs > 3.2 && vn > 2) {
          // chute
          var fn = Math.max(0, H.footVel.dot(n));
          var gain = 1.75 * bfx.power * bfxB.kick;
          var spd = Math.min(36, fn * gain + 2);
          // direção: mistura normal de contato com a direção do pé (ajuda a mirar)
          tmp.copy(H.footVel).normalize();
          dir.copy(n).multiplyScalar(0.6).addScaledVector(tmp, 0.4).normalize();
          ball.vel.copy(dir).multiplyScalar(spd);
          if (H.footVel.y > 0.5) ball.vel.y += H.footVel.y * 0.45;
          if (b.y < 0.2 && ball.vel.y < 0) ball.vel.y = 0;
          // efeito
          tang.copy(H.footVel).addScaledVector(n, -H.footVel.dot(n));
          ball.spin.crossVectors(n, tang).multiplyScalar(2.2 * bfx.curve);
          ball.touch(me, me && me.team, true);
          FG.audio.kick(spd / 30);
          H.cool = 0.2; H.lastKickSpeed = spd; H.touches++;
          if (FG.vibrate) FG.vibrate(0.8, 60);
        } else {
          // domínio / condução
          var ctrl = bfx.control;
          tmp.copy(H.footVel).multiplyScalar(1.05).addScaledVector(n, 0.9 + fs * 0.25);
          tmp.y = Math.max(0, tmp.y * 0.3);
          ball.vel.lerp(tmp, ctrl);
          if (b.y < 0.25) ball.vel.y = Math.min(ball.vel.y, 0.5);
          ball.spin.multiplyScalar(1 - ctrl);
          ball.touch(me, me && me.team, false);
          H.cool = 0.06; H.touches++;
          if (FG.vibrate) FG.vibrate(0.3, 20);
        }
        b.copy(H.foot).addScaledVector(n, 0.21); if (b.y < ball.r) b.y = ball.r;
      }
    }
    // corpo x bola (condução correndo)
    var bx = b.x - H.pos.x, bz = b.z - H.pos.z, hd = Math.sqrt(bx * bx + bz * bz);
    if (hd < 0.3 && b.y < 1.2 && hd > 1e-4) {
      var nx = bx / hd, nz = bz / hd;
      var rv = (H.vel.x - ball.vel.x) * nx + (H.vel.z - ball.vel.z) * nz;
      if (rv > 0) { ball.vel.x += nx * rv * 1.15; ball.vel.z += nz * rv * 1.15; ball.touch(me, me && me.team, false); }
      b.x = H.pos.x + nx * 0.3; b.z = H.pos.z + nz * 0.3;
    }
    // cabeça x bola (cabeceio de verdade!)
    n.subVectors(b, H.headPos); var dh = n.length();
    if (dh < 0.24 && H.cool <= 0) {
      n.multiplyScalar(1 / dh);
      var vin = ball.vel.dot(n);
      H.camera.getWorldDirection(camDir);
      var hv = Math.max(0, H.headVel.dot(camDir));
      ball.vel.addScaledVector(n, -vin * 1.5);
      ball.vel.multiplyScalar(0.45).addScaledVector(camDir, 5 + hv * 2.5);
      ball.spin.set(0, 0, 0);
      b.copy(H.headPos).addScaledVector(n, 0.25);
      ball.touch(me, me && me.team, true);
      FG.audio.kick(0.4); H.cool = 0.25; H.headers = (H.headers || 0) + 1;
      if (FG.vibrate) FG.vibrate(0.5, 40);
    }
    // chute assistido (Espaço no navegador)
    if (input.kickAssist) {
      var dd = Math.sqrt(Math.pow(b.x - H.pos.x, 2) + Math.pow(b.z - H.pos.z, 2));
      if (dd < 1.6 && b.y < 0.8) {
        H.camera.getWorldDirection(camDir);
        var pw = 22 * bfx.power;
        ball.vel.set(camDir.x, 0, camDir.z).normalize().multiplyScalar(pw);
        ball.vel.y = Math.max(1.5, camDir.y * pw + 4);
        ball.touch(me, me && me.team, true); FG.audio.kick(0.8); H.touches++;
      }
    }
  };

  /* ---------- Modo goleiro ---------- */
  proto.setKeeper = function (on, goalX, facing) {
    this.mode = on ? 'keeper' : 'field';
    if (on) { this.keeperX = goalX; this.keeperFacing = facing; this.glove.set(goalX + facing * 0.5, 1.0, this.pos.z); this.glovePrev.copy(this.glove); }
    this.gloves.visible = on;
    this.saves = 0;
    if (!FG.inXR) FG.input.pitch = on ? -0.1 : -0.6;
  };
  proto.updateKeeper = function (dt, input, ball, ctx) {
    var H = this, F = H.keeperFacing;
    H.gloves.visible = true;
    // anda na linha
    var mv = input.move.x;
    // direita da câmera: right = (-cos yaw, sin yaw) -> componente z = sin(yaw)
    var rz = Math.sin(H.yaw);
    H.vel.z += ((mv * rz * 4.5) - H.vel.z) * Math.min(1, dt * 8);
    H.pos.z = clamp(H.pos.z + H.vel.z * dt, -P.GOAL_HW + 0.3, P.GOAL_HW - 0.3);
    H.pos.x = H.keeperX + F * 0.4; H.vel.x = 0;
    H.speed = Math.abs(H.vel.z);
    // alvo das luvas: interseção do raio com o plano vertical na frente do gol
    var planeX = H.keeperX + F * 0.95;
    if (FG.inXR) {
      var o = input.ray.origin, d = input.ray.dir;
      var t = Math.abs(d.x) > 0.05 ? (planeX - o.x) / d.x : -1;
      if (t > 0) H.gloveTarget.set(planeX, o.y + d.y * t, o.z + d.z * t);
      else H.gloveTarget.set(planeX, 1.0 + d.y * 2, H.pos.z - d.z / Math.max(0.1, Math.abs(d.x)) * 2);
    } else {
      // navegador: mouse -> posição no gol
      H.gloveTarget.set(planeX, 1.2 + input.mouse.y * 1.4, H.pos.z + input.mouse.x * 3.2 * rz);
    }
    H.gloveTarget.y = clamp(H.gloveTarget.y, 0.1, 2.5);
    H.gloveTarget.z = clamp(H.gloveTarget.z, H.pos.z - 2.9, H.pos.z + 2.9);
    H.glovePrev.copy(H.glove);
    tmp.subVectors(H.gloveTarget, H.glove); var dl = tmp.length(), mx = 11 * dt;
    if (dl > mx) tmp.multiplyScalar(mx / dl);
    H.glove.add(tmp);
    if (dt > 0) H.gloveVel.subVectors(H.glove, H.glovePrev).divideScalar(dt);
    H.gloves.position.copy(H.glove);
    H.gloves.rotation.set(0, F > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
    // pernas paradas
    H.foot.set(H.pos.x + F * 0.3, 0.07, H.pos.z + 0.15);
    H.legs.update(H.pos.x, H.pos.z, F > 0 ? Math.PI / 2 : -Math.PI / 2, H.foot, H.yaw, false);
    // defesa
    if (ball && !ball.held) {
      n.subVectors(ball.pos, H.glove); var d2 = n.length();
      var reach = 0.11 + 0.17;
      if (d2 < reach && H.cool <= 0) {
        var bs = ball.vel.length();
        if (bs < 13 && ball.vel.x * F < 0) {
          // agarra
          ball.vel.set(0, 0, 0); ball.spin.set(0, 0, 0);
          var g = H.glove;
          ball.held = function (p) { p.copy(g); p.x += F * 0.12; };
          ctx.onSave && ctx.onSave('catch');
        } else {
          // espalma
          n.normalize();
          ball.vel.reflect(n).multiplyScalar(0.45);
          ball.vel.x = Math.abs(ball.vel.x) * F + F * 2;
          ball.vel.y += 2; ball.spin.multiplyScalar(0.3);
          ctx.onSave && ctx.onSave('parry');
        }
        H.cool = 0.4; FG.audio.kick(0.5); H.saves++;
        ball.touch(H.player, H.player && H.player.team, false);
        if (FG.vibrate) FG.vibrate(1, 80);
      }
      // corpo do goleiro também bloqueia (bola rasteira no meio)
      var bx = ball.pos.x - H.pos.x, bz = ball.pos.z - H.pos.z;
      if (!ball.held && Math.abs(bz) < 0.25 && Math.abs(bx) < 0.3 && ball.pos.y < 1.6 && H.cool <= 0) {
        ball.vel.x = F * Math.abs(ball.vel.x) * 0.3; ball.vel.z *= 0.4; H.cool = 0.4;
        ctx.onSave && ctx.onSave('body'); H.saves++;
        ball.touch(H.player, H.player && H.player.team, false);
      }
    }
    H.cool -= dt;
  };
})();
