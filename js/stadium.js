/* Football Go - estádio: gramado, linhas, gols, arquibancadas, torcida, refletores, placas */
(function () {
  var P = FG.PITCH;

  // Junta várias geometrias (já transformadas) numa só -> menos draw calls (importante no Oculus Go)
  FG.merge = function (geos) {
    var pos = [], nor = [], uv = [];
    geos.forEach(function (g) {
      var n = g.index ? g.toNonIndexed() : g;
      if (!n.attributes.normal) n.computeVertexNormals();
      var p = n.attributes.position.array, no = n.attributes.normal.array, u = n.attributes.uv ? n.attributes.uv.array : null;
      for (var i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(no[i]); }
      var cnt = p.length / 3;
      for (var j = 0; j < cnt; j++) { uv.push(u ? u[j * 2] : 0, u ? u[j * 2 + 1] : 0); }
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  };
  function scaleUV(g, su, sv) { var u = g.attributes.uv; for (var i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * su, u.getY(i) * sv); return g; }

  FG.buildStadium = function (scene, quality) {
    var hi = quality === 'high';
    var S = FG.stadium = { scene: scene, hi: hi };
    var night = FG.save.settings.night;

    // céu
    var sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), FG.skyMaterial(night));
    sky.renderOrder = -1; scene.add(sky); S.sky = sky;
    scene.fog = new THREE.Fog(night ? 0x0a1426 : 0xc9dcea, 180, 460);

    // luzes
    var hemi = new THREE.HemisphereLight(night ? 0xb8c8ff : 0xcfe6ff, night ? 0x2a3a2a : 0x4a6a3a, night ? 0.75 : 0.8);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(night ? 0xfff6e8 : 0xfff2d8, night ? 0.85 : 1.05);
    sun.position.set(night ? 20 : -40, 80, night ? 30 : 50);
    scene.add(sun); S.sun = sun;
    if (hi) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      var sc = sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 45; sc.bottom = -45; sc.near = 10; sc.far = 200;
      sun.shadow.bias = -0.0008;
    }

    // chão ao redor
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: FG.grassTexture(), color: 0xa0b8a0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);
    // gramado
    var pitchMat = new THREE.MeshLambertMaterial({ map: FG.pitchTexture(hi) });
    var pitch = new THREE.Mesh(new THREE.PlaneGeometry(P.L + 10, P.W + 10), pitchMat);
    pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = hi; scene.add(pitch);

    // linhas
    var LW = 0.12, lines = [];
    function strip(x1, z1, x2, z2) {
      var dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz);
      var g = new THREE.PlaneGeometry(len + LW, LW); g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(dz, dx)); g.translate((x1 + x2) / 2, 0.012, (z1 + z2) / 2); lines.push(g);
    }
    function arc(cx, cz, r, start, len, seg) {
      var g = new THREE.RingGeometry(r - LW / 2, r + LW / 2, seg || 64, 1, start, len);
      g.rotateX(-Math.PI / 2); g.translate(cx, 0.012, cz); lines.push(g);
    }
    function spot(cx, cz, r) { var g = new THREE.CircleGeometry(r, 16); g.rotateX(-Math.PI / 2); g.translate(cx, 0.012, cz); lines.push(g); }
    strip(-P.HL, -P.HW, P.HL, -P.HW); strip(-P.HL, P.HW, P.HL, P.HW);
    strip(-P.HL, -P.HW, -P.HL, P.HW); strip(P.HL, -P.HW, P.HL, P.HW);
    strip(0, -P.HW, 0, P.HW);
    arc(0, 0, P.CIRCLE, 0, Math.PI * 2, 96); spot(0, 0, 0.15);
    [-1, 1].forEach(function (s) {
      var gx = s * P.HL, bx = s * (P.HL - P.BOX_D), sx = s * (P.HL - P.SIX_D), px = s * (P.HL - P.SPOT);
      strip(gx, -P.BOX_HW, bx, -P.BOX_HW); strip(gx, P.BOX_HW, bx, P.BOX_HW); strip(bx, -P.BOX_HW, bx, P.BOX_HW);
      strip(gx, -P.SIX_HW, sx, -P.SIX_HW); strip(gx, P.SIX_HW, sx, P.SIX_HW); strip(sx, -P.SIX_HW, sx, P.SIX_HW);
      spot(px, 0, 0.13);
      // meia-lua da grande área
      lines.push(penArc(px, s));
    });
    function penArc(px, s) {
      // RingGeometry depois de rotateX(-90°): ponto (cosθ, sinθ) -> (x = cosθ, z = -sinθ)
      // s>0: queremos cosθ < -c  => θ ∈ (aa', 2π - aa') com aa' = acos(-c)
      var c = (P.BOX_D - P.SPOT) / P.CIRCLE;
      var g;
      if (s > 0) { var t = Math.acos(-c); g = new THREE.RingGeometry(P.CIRCLE - LW / 2, P.CIRCLE + LW / 2, 32, 1, t, 2 * Math.PI - 2 * t); }
      else { var t2 = Math.acos(c); g = new THREE.RingGeometry(P.CIRCLE - LW / 2, P.CIRCLE + LW / 2, 32, 1, -t2, 2 * t2); }
      g.rotateX(-Math.PI / 2); g.translate(px, 0.012, 0); return g;
    }
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
      var th = Math.atan2(c[1], -c[0]);
      arc(c[0] * P.HL, c[1] * P.HW, 1, th - Math.PI / 4, Math.PI / 2, 12);
    });
    var lineMesh = new THREE.Mesh(FG.merge(lines), new THREE.MeshLambertMaterial({ color: 0xf4f4f0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    lineMesh.receiveShadow = hi;
    scene.add(lineMesh);

    // gols
    S.goals = [];
    var postMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x202020 });
    var netTex = FG.netTexture();
    var netMat = new THREE.MeshLambertMaterial({ map: netTex, side: THREE.DoubleSide, alphaTest: 0.4, transparent: false, color: 0xffffff });
    [-1, 1].forEach(function (s) {
      var g = new THREE.Group(); g.position.x = s * P.HL;
      var R = 0.06, H = P.GOAL_H, HW = P.GOAL_HW, D = 2.0;
      var parts = [];
      var p1 = new THREE.CylinderGeometry(R, R, H + R, 12); p1.translate(0, (H + R) / 2, -HW - R); parts.push(p1);
      var p2 = new THREE.CylinderGeometry(R, R, H + R, 12); p2.translate(0, (H + R) / 2, HW + R); parts.push(p2);
      var cb = new THREE.CylinderGeometry(R, R, 2 * HW + 4 * R, 12); cb.rotateX(Math.PI / 2); cb.translate(0, H + R, 0); parts.push(cb);
      // estrutura de trás
      var b1 = new THREE.CylinderGeometry(0.03, 0.03, 2 * HW, 6); b1.rotateX(Math.PI / 2); b1.translate(s * D, H * 0.85, 0); parts.push(b1);
      [-1, 1].forEach(function (zz) {
        var bb = new THREE.CylinderGeometry(0.03, 0.03, Math.sqrt(D * D + 0.13), 6); bb.rotateZ(Math.PI / 2); bb.translate(s * D / 2, H * 0.92, zz * (HW + R)); parts.push(bb);
        var bv = new THREE.CylinderGeometry(0.03, 0.03, H * 0.85, 6); bv.translate(s * D, H * 0.425, zz * HW); parts.push(bv);
      });
      g.add(new THREE.Mesh(FG.merge(parts), postMat));
      // rede (5 planos) - tamanho da malha ~12 cm
      var cell = 0.12 * 4, nets = [];
      var back = new THREE.PlaneGeometry(2 * HW, H * 0.85); scaleUV(back, 2 * HW / cell, H * 0.85 / cell); back.rotateY(Math.PI / 2); back.translate(s * D, H * 0.425, 0); nets.push(back);
      var top = new THREE.PlaneGeometry(Math.sqrt(D * D + 0.13), 2 * HW); scaleUV(top, D / cell, 2 * HW / cell); top.rotateX(-Math.PI / 2); top.rotateZ(-s * 0.18); top.translate(s * D / 2, H * 0.92, 0); nets.push(top);
      [-1, 1].forEach(function (zz) {
        var sd = new THREE.PlaneGeometry(D, H); scaleUV(sd, D / cell, H / cell); sd.translate(s * D / 2, H / 2, zz * (HW + R)); nets.push(sd);
      });
      var netMesh = new THREE.Mesh(FG.merge(nets), netMat); g.add(netMesh);
      g.userData.net = netMesh;
      scene.add(g); S.goals.push(g);
    });

    // bandeirinhas de escanteio
    var flagParts = [], flagCloth = [];
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
      var pole = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6); pole.translate(c[0] * P.HL, 0.75, c[1] * P.HW); flagParts.push(pole);
      var cl = new THREE.PlaneGeometry(0.4, 0.3); cl.translate(c[0] * P.HL + 0.2, 1.33, c[1] * P.HW); flagCloth.push(cl);
    });
    scene.add(new THREE.Mesh(FG.merge(flagParts), new THREE.MeshLambertMaterial({ color: 0xeeeeee })));
    scene.add(new THREE.Mesh(FG.merge(flagCloth), new THREE.MeshLambertMaterial({ color: 0xffd23f, side: THREE.DoubleSide })));

    // placas de publicidade (LED)
    var adTex = FG.adTexture(); S.adTex = adTex;
    var ads = [], adBacks = [];
    function board(cx, cz, len, rotY) {
      var g = new THREE.PlaneGeometry(len, 0.9); scaleUV(g, len / 48, 1); g.translate(0, 0.45, 0.06); g.rotateY(rotY); g.translate(cx, 0, cz); ads.push(g);
      var b = new THREE.BoxGeometry(len, 0.95, 0.1); b.translate(0, 0.475, 0); b.rotateY(rotY); b.translate(cx, 0, cz); adBacks.push(b);
    }
    board(0, -(P.HW + 4), 112, 0); board(0, P.HW + 4, 112, Math.PI);
    board(-(P.HL + 4.5), -20, 30, Math.PI / 2); board(-(P.HL + 4.5), 20, 30, Math.PI / 2);
    board(P.HL + 4.5, -20, 30, -Math.PI / 2); board(P.HL + 4.5, 20, 30, -Math.PI / 2);
    scene.add(new THREE.Mesh(FG.merge(adBacks), new THREE.MeshLambertMaterial({ color: 0x1a1a1a })));
    scene.add(new THREE.Mesh(FG.merge(ads), new THREE.MeshBasicMaterial({ map: adTex })));

    // bancos de reservas
    var dug = [], dugGlass = [];
    [-12, 12].forEach(function (x) {
      var b = new THREE.BoxGeometry(8, 0.5, 1.2); b.translate(x, 0.5, P.HW + 6.2); dug.push(b);
      var back = new THREE.BoxGeometry(8, 2.2, 0.15); back.translate(x, 1.1, P.HW + 6.9); dug.push(back);
      var gl = new THREE.BoxGeometry(8.2, 0.08, 2); gl.translate(x, 2.2, P.HW + 6.1); dugGlass.push(gl);
    });
    scene.add(new THREE.Mesh(FG.merge(dug), new THREE.MeshLambertMaterial({ color: 0x1d4fb8 })));
    scene.add(new THREE.Mesh(FG.merge(dugGlass), new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.35 })));

    // arquibancadas
    var ROWS = 26, RISE = 0.48, DEPTH = 0.88, BASE = 1.6;
    var steps = [], seats = [], seatPos = [];
    var sides = [
      { cx: 0, cz: -(P.HW + 8), len: 124, rot: 0, out: -1, axis: 'z' },
      { cx: 0, cz: P.HW + 8, len: 124, rot: Math.PI, out: 1, axis: 'z' },
      { cx: -(P.HL + 9), cz: 0, len: 84, rot: Math.PI / 2, out: -1, axis: 'x' },
      { cx: P.HL + 9, cz: 0, len: 84, rot: -Math.PI / 2, out: 1, axis: 'x' }
    ];
    sides.forEach(function (sd, si) {
      // parede frontal
      var wall = new THREE.BoxGeometry(sd.len, BASE, 0.3); wall.translate(0, BASE / 2, 0); wall.rotateY(sd.rot); wall.translate(sd.cx, 0, sd.cz); steps.push(wall);
      for (var r = 0; r < ROWS; r++) {
        var h = BASE + (r + 1) * RISE, d = 0.15 + r * DEPTH + DEPTH / 2;
        var b = new THREE.BoxGeometry(sd.len, h, DEPTH); b.translate(0, h / 2, -d); // -z = para fora
        b.rotateY(sd.rot); b.translate(sd.cx, 0, sd.cz);
        steps.push(b);
        var st = new THREE.BoxGeometry(sd.len, 0.12, 0.25); st.translate(0, h + 0.06, -d + 0.15); st.rotateY(sd.rot); st.translate(sd.cx, 0, sd.cz);
        seats.push(st);
        seatPos.push({ side: si, row: r, h: h, d: d, sd: sd });
      }
      // parede de trás + cobertura
      var topH = BASE + ROWS * RISE, backD = 0.15 + ROWS * DEPTH;
      var bw = new THREE.BoxGeometry(sd.len, topH + 6, 0.5); bw.translate(0, (topH + 6) / 2, -backD - 0.25); bw.rotateY(sd.rot); bw.translate(sd.cx, 0, sd.cz); steps.push(bw);
    });
    // cantos (blocos)
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
      var b = new THREE.BoxGeometry(22, BASE + ROWS * RISE * 0.9, 22);
      b.translate(c[0] * (P.HL + 20), (BASE + ROWS * RISE * 0.9) / 2, c[1] * (P.HW + 19)); steps.push(b);
    });
    var standMat = new THREE.MeshLambertMaterial({ map: FG.concreteTexture('#7d838b'), color: 0xbfc4c9 });
    var stands = new THREE.Mesh(FG.merge(steps), standMat); scene.add(stands);
    var seatMat = new THREE.MeshLambertMaterial({ color: 0x1d4fb8 });
    scene.add(new THREE.Mesh(FG.merge(seats), seatMat));

    // cobertura (teto)
    var roofs = [], roofLights = [];
    sides.forEach(function (sd) {
      var topH = BASE + ROWS * RISE, backD = 0.15 + ROWS * DEPTH;
      var depth = backD + 4;
      var rf = new THREE.BoxGeometry(sd.len + 2, 0.4, depth); rf.rotateX(-0.08); rf.translate(0, topH + 6, -backD + depth / 2 - 0.5); rf.rotateY(sd.rot); rf.translate(sd.cx, 0, sd.cz); roofs.push(rf);
      var lt = new THREE.BoxGeometry(sd.len, 0.25, 0.3); lt.translate(0, topH + 5.6, 3.2); lt.rotateY(sd.rot); lt.translate(sd.cx, 0, sd.cz); roofLights.push(lt);
      for (var k = -2; k <= 2; k++) {
        var col = new THREE.CylinderGeometry(0.35, 0.35, topH + 6, 8); col.translate(k * sd.len / 5, (topH + 6) / 2, -backD - 0.8); col.rotateY(sd.rot); col.translate(sd.cx, 0, sd.cz); roofs.push(col);
      }
    });
    scene.add(new THREE.Mesh(FG.merge(roofs), new THREE.MeshLambertMaterial({ color: 0x9aa3ad, side: THREE.DoubleSide })));
    scene.add(new THREE.Mesh(FG.merge(roofLights), new THREE.MeshBasicMaterial({ color: night ? 0xfff8e0 : 0xdddddd })));

    // refletores (torres)
    var towers = [], lampPanels = [], glowMat = new THREE.SpriteMaterial({ map: FG.glowTexture(), color: 0xfff6d8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: night ? 0.95 : 0.25 });
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) {
      var x = c[0] * (P.HL + 26), z = c[1] * (P.HW + 26);
      var t = new THREE.CylinderGeometry(0.6, 1.2, 42, 8); t.translate(x, 21, z); towers.push(t);
      var panel = new THREE.BoxGeometry(8, 5, 0.6);
      panel.lookAt(new THREE.Vector3(-x, -30, -z)); panel.translate(x, 44, z); towers.push(panel);
      var lp = new THREE.PlaneGeometry(7.4, 4.4); lp.lookAt(new THREE.Vector3(-x, -30, -z));
      var dir = new THREE.Vector3(-x, -30, -z).normalize();
      lp.translate(x + dir.x * 0.35, 44 + dir.y * 0.35, z + dir.z * 0.35); lampPanels.push(lp);
      for (var i = 0; i < 6; i++) {
        var sp = new THREE.Sprite(glowMat); sp.position.set(x + dir.x * 0.6 + (i % 3 - 1) * 2.3 * Math.abs(c[1]) * 0.7, 44 + (i < 3 ? 1.2 : -1.2), z + dir.z * 0.6 + (i % 3 - 1) * 2.3 * Math.abs(c[0]) * 0.7);
        sp.scale.set(9, 9, 1); scene.add(sp);
      }
    });
    scene.add(new THREE.Mesh(FG.merge(towers), new THREE.MeshLambertMaterial({ color: 0x8a9099 })));
    scene.add(new THREE.Mesh(FG.merge(lampPanels), new THREE.MeshBasicMaterial({ color: night ? 0xffffff : 0xcccccc })));

    // telões
    S.screens = [];
    var scrCanvas = FG.makeCanvas(512, 256), scrTex = new THREE.CanvasTexture(scrCanvas);
    S.scrCanvas = scrCanvas; S.scrTex = scrTex;
    [-1, 1].forEach(function (s) {
      var topH = BASE + ROWS * RISE;
      var frame = new THREE.Mesh(new THREE.BoxGeometry(17, 9, 0.8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      var x = s * (P.HL + 6.8);
      frame.position.set(x, topH + 1.2, s > 0 ? -18 : 18); frame.rotation.y = -s * Math.PI / 2; scene.add(frame);
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: scrTex }));
      scr.position.copy(frame.position); scr.rotation.y = -s * Math.PI / 2; scr.translateZ(0.42); scene.add(scr);
    });
    S.setScoreboard = function (lines) {
      var c = scrCanvas.getContext('2d');
      var g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0d1b2a'); g.addColorStop(1, '#03070c');
      c.fillStyle = g; c.fillRect(0, 0, 512, 256);
      c.fillStyle = '#35d07f'; c.fillRect(0, 0, 512, 8); c.fillRect(0, 248, 512, 8);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#ffffff'; c.font = 'bold 64px Arial'; c.fillText(lines[0] || '', 256, 90, 490);
      c.fillStyle = '#ffd23f'; c.font = 'bold 40px Arial'; c.fillText(lines[1] || '', 256, 170, 490);
      c.fillStyle = '#9fb3c8'; c.font = '24px Arial'; c.fillText(lines[2] || 'FOOTBALL GO', 256, 220, 490);
      scrTex.needsUpdate = true;
    };
    S.setScoreboard(['FOOTBALL GO', 'Play in VR', 'Inspirado em VRFS']);

    // torcida
    buildCrowd(S, seatPos, hi);

    // sombras (blobs) instanciadas
    var blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
    S.blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({ map: FG.blobTexture(), transparent: true, depthWrite: false }), 40);
    S.blobs.count = 0; S.blobs.renderOrder = 1; S.blobs.frustumCulled = false; scene.add(S.blobs);
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3();
    S.setBlobs = function (list) { // list de {x,z,s}
      var n = Math.min(list.length, 40);
      for (var i = 0; i < n; i++) { pv.set(list[i].x, 0.02, list[i].z); sc.set(list[i].s, 1, list[i].s); m4.compose(pv, q, sc); S.blobs.setMatrixAt(i, m4); }
      S.blobs.count = n; S.blobs.instanceMatrix.needsUpdate = true;
    };

    var adOff = 0;
    S.update = function (dt, time) {
      adOff = (adOff + dt * 0.02) % 1; adTex.offset.x = adOff;
      if (S.crowd) { S.crowd.material.uniforms.uTime.value = time; S.crowd.material.uniforms.uExcite.value = 0.15 + FG.audio.excite * 0.85; }
    };
    return S;
  };

  function buildCrowd(S, seatPos, hi) {
    var density = hi ? 0.92 : 0.6, spacing = hi ? 0.62 : 0.9;
    var offs = [], misc = [], cols = [];
    seatPos.forEach(function (sp) {
      var sd = sp.sd, n = Math.floor(sd.len / spacing);
      for (var i = 0; i < n; i++) {
        if (Math.random() > density) continue;
        var lx = -sd.len / 2 + (i + 0.5) * spacing + (Math.random() - 0.5) * 0.15;
        var lz = -sp.d + 0.05;
        // rotação do lado
        var c = Math.cos(sd.rot), s = Math.sin(sd.rot);
        var wx = lx * c + lz * s + sd.cx, wz = -lx * s + lz * c + sd.cz;
        offs.push(wx, sp.h - 0.05, wz);
        misc.push(Math.random() < 0.5 ? 0 : 2, Math.random(), Math.random(), Math.random());
        cols.push(1, 1, 1);
      }
    });
    var count = offs.length / 3;
    var base = new THREE.PlaneGeometry(0.58, 1.15); base.translate(0, 0.575, 0);
    var g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(offs), 3));
    g.setAttribute('aMisc', new THREE.InstancedBufferAttribute(new Float32Array(misc), 4));
    var colAttr = new THREE.InstancedBufferAttribute(new Float32Array(cols), 3); g.setAttribute('aCol', colAttr);
    g.instanceCount = count;
    var mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: FG.crowdTexture() }, uTime: { value: 0 }, uExcite: { value: 0.2 }, uLight: { value: FG.save.settings.night ? 0.8 : 1.0 } },
      vertexShader: [
        'attribute vec3 aPos; attribute vec3 aCol; attribute vec4 aMisc;',
        'uniform float uTime; uniform float uExcite;',
        'varying vec2 vUv; varying vec3 vCol; varying vec3 vSkin; varying vec3 vHair;',
        'void main(){',
        ' float ph = aMisc.y;',
        ' float jump = max(0.0, sin(uTime*(5.0+ph*3.0)+ph*6.28)) * uExcite * 0.32 + sin(uTime*1.3+ph*20.0)*0.015;',
        ' float v = aMisc.x;',
        ' float up = step(1.0 - uExcite*0.9, fract(ph*7.13));',
        ' if (v < 0.5 && up > 0.5) v = 1.0; else if (v > 1.5 && v < 2.5 && up > 0.5) v = 3.0;',
        ' vUv = vec2((uv.x + v)/4.0, uv.y);',
        ' vec3 b = aPos + vec3(0.0, jump, 0.0);',
        ' vec3 tc = cameraPosition - b; tc.y = 0.0; tc = normalize(tc);',
        ' vec3 r = vec3(tc.z, 0.0, -tc.x);',
        ' vec3 wp = b + r*position.x + vec3(0.0, position.y, 0.0);',
        ' vCol = aCol; vSkin = mix(vec3(0.96,0.80,0.66), vec3(0.30,0.19,0.12), aMisc.z);',
        ' vHair = mix(vec3(0.05,0.04,0.03), vec3(0.45,0.32,0.18), aMisc.w*aMisc.w);',
        ' gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);',
        '}'].join('\n'),
      fragmentShader: [
        'uniform sampler2D map; uniform float uLight;',
        'varying vec2 vUv; varying vec3 vCol; varying vec3 vSkin; varying vec3 vHair;',
        'void main(){',
        ' vec4 t = texture2D(map, vUv); if (t.a < 0.5) discard;',
        ' vec3 c = t.r*vCol + t.g*vSkin + t.b*vHair;',
        ' if (min(t.r, min(t.g, t.b)) > 0.7) c = vec3(0.95);',
        ' c *= (0.7 + 0.3*vUv.y) * uLight;',
        ' gl_FragColor = vec4(c, 1.0);',
        '}'].join('\n')
    });
    var mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
    S.scene.add(mesh); S.crowd = mesh; S.crowdCount = count;
    S.setCrowdColors = function (home, away) {
      var arr = colAttr.array, ph = new THREE.Color(home.primary), sh = new THREE.Color(home.secondary), pa = new THREE.Color(away.primary), sa = new THREE.Color(away.secondary), tmp = new THREE.Color();
      var pos = g.attributes.aPos.array;
      for (var i = 0; i < count; i++) {
        var x = pos[i * 3];
        var awayBias = x > 30 ? 0.65 : 0.22; // torcida visitante atrás de um dos gols
        var r = Math.random();
        if (r < 0.12) tmp.setHSL(Math.random(), 0.2, 0.25 + Math.random() * 0.5);
        else if (Math.random() < awayBias) tmp.copy(Math.random() < 0.75 ? pa : sa);
        else tmp.copy(Math.random() < 0.75 ? ph : sh);
        arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b;
      }
      colAttr.needsUpdate = true;
    };
    S.setCrowdColors(FG.teamById('bra'), FG.teamById('arg'));
  }
})();
