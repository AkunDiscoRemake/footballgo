/* Football Go - modelos humanos (SkinnedMesh: 1 draw call por jogador), chuteiras e pernas em 1ª pessoa */
(function () {
  var BONES = ['hips', 'spine', 'neck', 'head', 'shL', 'elL', 'shR', 'elR', 'thL', 'knL', 'thR', 'knR'];
  var BIND = { // [pai, x, y, z] (posição relativa ao pai)
    hips: [null, 0, 0.95, 0], spine: ['hips', 0, 0.1, 0], neck: ['spine', 0, 0.47, 0], head: ['neck', 0, 0.1, 0],
    shL: ['spine', 0.2, 0.4, 0], elL: ['shL', 0.02, -0.27, 0], shR: ['spine', -0.2, 0.4, 0], elR: ['shR', -0.02, -0.27, 0],
    thL: ['hips', 0.095, -0.03, 0], knL: ['thL', 0, -0.44, 0], thR: ['hips', -0.095, -0.03, 0], knR: ['thR', 0, -0.44, 0]
  };
  var geoCache = null;

  function buildGeo() {
    var parts = [];
    function add(geo, bone, region, x, y, z, sx, sy, sz) {
      if (sx) geo.scale(sx, sy, sz);
      geo.translate(x, y, z);
      parts.push({ g: geo, b: BONES.indexOf(bone), r: region });
    }
    var C = THREE.CylinderGeometry, Sp = THREE.SphereGeometry;
    // quadril / calção
    add(new C(0.165, 0.172, 0.24, 16), 'hips', 'shorts', 0, 0.93, 0, 1, 1, 0.74);
    [1, -1].forEach(function (s) {
      var th = s > 0 ? 'thL' : 'thR', kn = s > 0 ? 'knL' : 'knR', sh = s > 0 ? 'shL' : 'shR', el = s > 0 ? 'elL' : 'elR';
      var x = s * 0.095;
      add(new C(0.09, 0.083, 0.21, 12), th, 'shorts', x, 0.8, 0);
      add(new C(0.075, 0.058, 0.3, 12), th, 'skin', x, 0.6, 0.005);
      add(new Sp(0.058, 10, 8), kn, 'skin', x, 0.48, 0.008);
      add(new C(0.058, 0.04, 0.36, 12), kn, 'socks', x, 0.29, 0);
      add(new Sp(1, 10, 8), kn, 'socks', x, 0.37, -0.018, 0.06, 0.11, 0.062);
      add(new Sp(1, 14, 10), kn, 'boots', x, 0.06, 0.045, 0.054, 0.048, 0.128);
      add(new THREE.BoxGeometry(0.1, 0.022, 0.25), kn, 'boots', x, 0.014, 0.045);
      // braços
      add(new Sp(0.078, 12, 10), sh, 'sleeve', s * 0.19, 1.45, 0);
      add(new C(0.064, 0.056, 0.17, 12), sh, 'sleeve', s * 0.212, 1.36, 0);
      add(new C(0.048, 0.043, 0.13, 10), sh, 'skin', s * 0.218, 1.24, 0);
      add(new Sp(0.046, 8, 6), el, 'skin', s * 0.22, 1.18, 0);
      add(new C(0.044, 0.033, 0.24, 10), el, 'skin', s * 0.222, 1.06, 0.005);
      add(new Sp(1, 10, 8), el, 'hands', s * 0.222, 0.9, 0.008, 0.035, 0.058, 0.03);
      // orelhas
      add(new Sp(1, 8, 6), 'head', 'skin', s * 0.089, 1.685, -0.005, 0.014, 0.03, 0.022);
    });
    // tronco
    add(new C(0.2, 0.162, 0.5, 24, 1), 'spine', 'torso', 0, 1.27, 0, 1, 1, 0.62);
    add(new Sp(1, 16, 10), 'spine', 'sleeve', 0, 1.43, 0.0, 0.205, 0.1, 0.13);
    // pescoço e cabeça
    add(new C(0.05, 0.056, 0.13, 10), 'neck', 'skin', 0, 1.56, -0.005);
    add(new Sp(0.1, 22, 16), 'head', 'face', 0, 1.69, 0, 0.9, 1.08, 1.0);
    add(new Sp(0.104, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), 'head', 'hair', 0, 1.698, -0.006, 0.92, 1.08, 1.03);
    add(new Sp(1, 8, 6), 'head', 'skin', 0, 1.672, 0.096, 0.016, 0.024, 0.02); // nariz

    // mescla com skinning rígido
    var pos = [], nor = [], uv = [], si = [], sw = [], idx = [], off = 0;
    parts.forEach(function (p) {
      var g = p.g, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      var r = FG.atlasUV(p.r), pad = 1.5 / 256;
      var u0 = r[0] + pad, v0 = r[1] + pad, u1 = r[2] - pad, v1 = r[3] - pad;
      for (var i = 0; i < P.count; i++) {
        pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i));
        uv.push(u0 + U.getX(i) * (u1 - u0), v0 + U.getY(i) * (v1 - v0));
        si.push(p.b, 0, 0, 0); sw.push(1, 0, 0, 0);
      }
      if (g.index) { var a = g.index.array; for (var k = 0; k < a.length; k++) idx.push(a[k] + off); }
      else for (var k2 = 0; k2 < P.count; k2++) idx.push(k2 + off);
      off += P.count;
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere(); geo.boundingSphere.radius = 1.6;
    return geo;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // opts: {team, number, name, gk, referee, skin, hair, boot, bootAccent}
  FG.Humanoid = function (o) {
    if (!geoCache) geoCache = buildGeo();
    o.skin = o.skin || pick(FG.SKIN_TONES);
    o.hair = o.hair || pick(FG.HAIR_COLORS);
    if (o.beard === undefined) o.beard = Math.random() < 0.25;
    if (!o.boot) { var bt = pick(FG.BOOTS); o.boot = bt.color; o.bootAccent = bt.accent; }
    var tex = FG.playerTexture(o);
    var mat = FG.quality === 'high' ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0 }) : new THREE.MeshLambertMaterial({ map: tex });
    mat.skinning = true; // necessário no three r128
    var bones = {}, list = [];
    BONES.forEach(function (n) {
      var b = new THREE.Bone(), d = BIND[n]; b.name = n; b.position.set(d[1], d[2], d[3]);
      bones[n] = b; list.push(b);
      if (d[0]) bones[d[0]].add(b);
    });
    var mesh = new THREE.SkinnedMesh(geoCache, mat);
    mesh.add(bones.hips);
    mesh.bind(new THREE.Skeleton(list));
    mesh.castShadow = FG.quality === 'high';
    mesh.frustumCulled = true;
    var root = new THREE.Group(); root.add(mesh);
    var H = { root: root, mesh: mesh, bones: bones, opts: o, tex: tex, mat: mat };
    H.pose = function (t) { posePlayer(H, t); };
    H.dispose = function () { tex.dispose(); mat.dispose(); };
    return H;
  };

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  // t: {phase, speed, kick(0..1|-1), time, celebrate, gkReady, dive(-1..1), throwIn}
  function posePlayer(H, t) {
    var B = H.bones, amp = clamp((t.speed || 0) / 7, 0, 1), ph = t.phase || 0;
    var sinp = Math.sin(ph), cosp = Math.cos(ph);
    B.hips.position.y = 0.95 + Math.abs(sinp) * 0.045 * amp - amp * 0.04;
    B.hips.rotation.set(0, sinp * 0.12 * amp, 0);
    B.spine.rotation.set(0.04 + amp * 0.18 + Math.sin((t.time || 0) * 2) * 0.012, -sinp * 0.15 * amp, 0);
    B.thL.rotation.set(-sinp * 0.85 * amp, 0, 0);
    B.thR.rotation.set(sinp * 0.85 * amp, 0, 0);
    B.knL.rotation.set(amp * (0.15 + 1.1 * Math.max(0, cosp)) + 0.03, 0, 0);
    B.knR.rotation.set(amp * (0.15 + 1.1 * Math.max(0, -cosp)) + 0.03, 0, 0);
    B.shL.rotation.set(sinp * 0.75 * amp, 0, 0.09);
    B.shR.rotation.set(-sinp * 0.75 * amp, 0, -0.09);
    B.elL.rotation.set(-0.25 - 1.0 * amp, 0, 0);
    B.elR.rotation.set(-0.25 - 1.0 * amp, 0, 0);
    B.head.rotation.set(t.lookUp || 0, 0, 0);
    B.neck.rotation.set(-amp * 0.12, 0, 0);
    if (t.kick >= 0 && t.kick <= 1) {
      var k = t.kick, leg = t.leftKick ? 'L' : 'R';
      var th = B['th' + leg], kn = B['kn' + leg];
      if (k < 0.35) { var f = k / 0.35; th.rotation.x = 0.75 * f; kn.rotation.x = 1.3 * f; }
      else { var g = (k - 0.35) / 0.65, e = 1 - (1 - g) * (1 - g); th.rotation.x = 0.75 - 2.0 * e; kn.rotation.x = Math.max(0, 1.3 - 2.2 * e); }
      B.shL.rotation.z = 0.6; B.shR.rotation.z = -0.6; B.spine.rotation.x = 0.05 - 0.2 * k;
      var other = t.leftKick ? 'R' : 'L';
      B['th' + other].rotation.x = -0.1; B['kn' + other].rotation.x = 0.25;
    }
    if (t.gkReady) {
      B.thL.rotation.x = -0.45; B.thR.rotation.x = -0.45; B.knL.rotation.x = 0.8; B.knR.rotation.x = 0.8;
      B.hips.position.y = 0.84; B.spine.rotation.x = 0.35;
      B.shL.rotation.set(-0.7, 0, 0.45); B.shR.rotation.set(-0.7, 0, -0.45); B.elL.rotation.x = -0.6; B.elR.rotation.x = -0.6;
    }
    if (t.dive) {
      B.shL.rotation.set(0, 0, 2.9); B.shR.rotation.set(0, 0, -2.9); B.elL.rotation.x = 0; B.elR.rotation.x = 0;
      B.thL.rotation.x = 0.1; B.thR.rotation.x = -0.2; B.knL.rotation.x = 0.4; B.knR.rotation.x = 0.2;
    }
    if (t.celebrate) {
      var c = Math.sin((t.time || 0) * 9);
      B.shL.rotation.set(-0.3, 0, 2.6 + c * 0.2); B.shR.rotation.set(-0.3, 0, -2.6 - c * 0.2);
      B.elL.rotation.x = -0.4; B.elR.rotation.x = -0.4;
    }
    if (t.throwIn) {
      var p = t.throwIn; // 0..1
      var a = p < 0.5 ? -2.4 - p * 1.2 : -3.0 + (p - 0.5) * 3.6;
      B.shL.rotation.set(a, 0, 0.15); B.shR.rotation.set(a, 0, -0.15); B.elL.rotation.x = -0.9 * (1 - p); B.elR.rotation.x = -0.9 * (1 - p);
      B.spine.rotation.x = p < 0.5 ? -0.25 : 0.2;
    }
  }

  /* ---------- Chuteira (vitrine, recompensas, 1ª pessoa) ---------- */
  FG.bootMesh = function (item, scale) {
    var g = new THREE.Group(), s = scale || 1;
    var M = FG.quality === 'high' ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
    var upMat = new M({ color: item.color }); if (upMat.roughness !== undefined) { upMat.roughness = 0.35; upMat.metalness = item.rarity === 'legendary' ? 0.6 : 0.1; }
    var acMat = new M({ color: item.accent });
    var soleMat = new M({ color: 0x1b1b1b });
    var upper = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), upMat); upper.scale.set(0.052, 0.046, 0.135); upper.position.set(0, 0.048, 0.02); g.add(upper);
    var heel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 16), upMat); heel.position.set(0, 0.075, -0.06); g.add(heel);
    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.01, 6, 16), acMat); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.108, -0.055); g.add(collar);
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.012, 0.13), acMat); stripe.position.set(0, 0.04, 0.0); stripe.rotation.x = 0.15; g.add(stripe);
    var sole = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.016, 0.28), soleMat); sole.position.set(0, 0.008, 0.012); g.add(sole);
    for (var i = 0; i < 4; i++) {
      var lace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.006, 0.008), acMat); lace.position.set(0, 0.092 - i * 0.008, 0.0 + i * 0.022); lace.rotation.x = 0.35; g.add(lace);
    }
    var studGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.014, 6);
    [[0.03, 0.1], [-0.03, 0.1], [0.032, 0.03], [-0.032, 0.03], [0.028, -0.08], [-0.028, -0.08]].forEach(function (p) {
      var st = new THREE.Mesh(studGeo, soleMat); st.position.set(p[0], -0.006, p[1]); g.add(st);
    });
    g.scale.setScalar(s);
    return g;
  };

  /* ---------- Pernas em 1ª pessoa (IK de 2 ossos) ---------- */
  FG.FPLegs = function (scene) {
    var L = { group: new THREE.Group() };
    var M = THREE.MeshLambertMaterial;
    var skinMat = new M({ color: 0xc68863 }), sockMat = new M({ color: 0xffffff }), shortMat = new M({ color: 0x1d4fb8 });
    function limb(r1, r2, len, mat) { var g = new THREE.CylinderGeometry(r1, r2, len, 10); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, mat); }
    L.thigh = limb(0.08, 0.062, 0.44, skinMat); L.shorts = limb(0.092, 0.088, 0.2, shortMat);
    L.thigh.add(L.shorts);
    L.shin = limb(0.058, 0.042, 0.44, sockMat);
    L.thigh2 = limb(0.08, 0.062, 0.44, skinMat); L.shorts2 = limb(0.092, 0.088, 0.2, shortMat); L.thigh2.add(L.shorts2);
    L.shin2 = limb(0.058, 0.042, 0.44, sockMat);
    L.group.add(L.thigh, L.shin, L.thigh2, L.shin2);
    scene.add(L.group);
    L.setKit = function (team, bootItem, skin) {
      sockMat.color.set(team.socks); shortMat.color.set(team.shorts); skinMat.color.set(skin || '#c68863');
      if (L.boot) L.group.remove(L.boot); if (L.boot2) L.group.remove(L.boot2);
      L.boot = FG.bootMesh(bootItem, 1.0); L.boot2 = FG.bootMesh(bootItem, 1.0);
      L.group.add(L.boot, L.boot2);
    };
    var up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), knee = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Quaternion(), pole = new THREE.Vector3();
    function placeLimb(mesh, a, b) {
      mesh.position.copy(a);
      dir.subVectors(a, b).normalize(); // cilindro aponta +y; queremos +y -> de b para a
      q.setFromUnitVectors(up, dir); mesh.quaternion.copy(q);
    }
    function ik(hip, foot, fwd, thigh, shin) {
      var l1 = 0.44, l2 = 0.44;
      tmp.subVectors(foot, hip); var d = Math.min(tmp.length(), l1 + l2 - 0.001); tmp.normalize();
      var a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      pole.copy(fwd).addScaledVector(tmp, -fwd.dot(tmp)).normalize();
      knee.copy(hip).addScaledVector(tmp, a).addScaledVector(pole, h);
      var footAdj = tmp.clone().multiplyScalar(d).add(hip);
      placeLimb(thigh, hip, knee); placeLimb(shin, knee, footAdj);
      return footAdj;
    }
    var hip = new THREE.Vector3(), hip2 = new THREE.Vector3(), f2 = new THREE.Vector3(), fwdV = new THREE.Vector3();
    // pos: posição do corpo (x,z); yaw: direção do corpo; foot: posição do pé (mundo); footYaw: direção do pé; left: pé esquerdo chuta
    L.update = function (bx, bz, yaw, foot, footYaw, left) {
      var side = left ? 1 : -1;
      fwdV.set(Math.sin(yaw), 0, Math.cos(yaw));
      var rx = -Math.cos(yaw), rz = Math.sin(yaw); // direita do corpo
      hip.set(bx - rx * 0.11 * side, 0.92, bz - rz * 0.11 * side);
      hip.addScaledVector(fwdV, -0.12);
      var fa = ik(hip, foot, fwdV, L.thigh, L.shin);
      L.boot.position.set(fa.x, Math.max(0, fa.y - 0.06), fa.z); L.boot.rotation.set(0, footYaw, 0);
      // perna de apoio
      hip2.set(bx + rx * 0.11 * side, 0.92, bz + rz * 0.11 * side).addScaledVector(fwdV, -0.12);
      f2.set(hip2.x + fwdV.x * 0.05, 0.08, hip2.z + fwdV.z * 0.05);
      var fb = ik(hip2, f2, fwdV, L.thigh2, L.shin2);
      L.boot2.position.set(fb.x, 0, fb.z); L.boot2.rotation.set(0, yaw, 0);
    };
    return L;
  };
})();
