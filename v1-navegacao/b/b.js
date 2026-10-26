/* Versão B · Trilho
   O mapa continua um plano que se explora em qualquer ordem, mas a história não
   pula mais de quadro em quadro: os capítulos são regiões de uma folha de
   contato e um trilho passa por todas. A rolagem anda pelo trilho sem parar em
   degraus. Dentro de cada região ela conta a cena (o mesmo p de 0 a 1 da versão
   A); entre uma e outra a câmera segue o trilho, recua um pouco e mostra o
   caminho, e um ponto de tungstênio anda nele deixando cópias para trás. O
   ritmo dessa passagem é a curva da Interação: o visitante a desenha e o mapa
   passa a andar com ela.

   Entradas:
     roda/trackpad, deslizar   anda pelo trilho
     arrastar (mouse)          explora o plano livre; a próxima rolagem volta ao trilho onde você está
     mostrador                 gira a história inteira
     setas, PageUp/Down, espaço  vão de um tempo da cena ao seguinte
     pinça, ctrl+roda, M, Mapa   o mapa geral; clique numa região para ir até ela */
(function () {
  'use strict';

  var S = window.SITE, Site = window.Site;
  var doc = document, root = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var inOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var outC = function (t) { return 1 - Math.pow(1 - t, 3); };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var TAU = Math.PI * 2;

  Site.addStrings({
    'hint.pointer': 'Role para seguir o trilho · arraste para explorar',
    'hint.touch': 'Deslize para seguir o trilho · pinça para o mapa',
    'b.play.note': 'Esta curva também move o mapa: é ela que leva você de um capítulo ao outro.',
    'b.jog': 'Mostrador: gire para percorrer o site',
    'b.work': 'Trabalho'
  }, {
    'hint.pointer': 'Scroll to follow the track · drag to explore',
    'hint.touch': 'Swipe to follow the track · pinch for the map',
    'b.play.note': 'This curve moves the map too: it is what carries you from one chapter to the next.',
    'b.jog': 'Dial: turn it to travel the site',
    'b.work': 'Work'
  });

  var t = Site.t;
  var motionOn = function () { return Site.motion(); };
  var nW = S.works.length;
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  var vp = $('#viewport'), world = $('#world');
  var ov = { on: false, k: 0, x: 0, y: 0, z: 0.2 };

  var C = window.V1Cenas.create({
    overview: function () { return ov.on || ov.k > 0.02; },
    goWork: function (k) { goRegion(4 + k); },
    opaque: false
  });

  /* ---------- Regiões ----------
     D é quanto de rolagem a região ganha, em telas; beats são os tempos da cena
     em que o teclado para (frações de D). */

  var DEF = {
    title: { D: 1.1, beats: [0, 0.66], ch: 0 },
    design: { D: 2, beats: [0.04, 0.3, 0.5, 0.76, 0.98], ch: 1 },
    play: { D: 1.4, beats: [0.08, 0.8], ch: 2 },
    // os tempos da pasta são as quedas: cada trabalho já dentro, com a folha erguida
    works: { D: 1.7, beats: [0.04, 0.21, 0.42, 0.62, 0.83, 0.97], ch: 3 },
    reel: { D: 0.6, beats: [0.5], ch: 3 },
    close: { D: 0.8, beats: [0.5], ch: 4 }
  };
  var REG = [];
  ['title', 'design', 'play', 'works'].forEach(function (k) { REG.push({ key: k, el: $('.region[data-scene="' + k + '"]') }); });
  C.reels.forEach(function (el, i) { el.classList.add('region'); REG.push({ key: 'reel' + i, el: el, work: i }); });
  REG.push({ key: 'close', el: $('.region[data-scene="close"]') });
  REG.forEach(function (r, i) {
    var d = DEF[r.work != null ? 'reel' : r.key];
    r.i = i; r.D = d.D; r.beats = d.beats; r.ch = d.ch;
    r.hash = r.el.getAttribute('data-hash');
  });
  var n = REG.length;

  var CH = [
    { num: '1', key: 'ch.intro', first: 0 },
    { num: '2', key: 'ch.design', first: 1 },
    { num: '3', key: 'ch.play', first: 2 },
    { num: '4', key: 'ch.works', first: 3 },
    { num: '', key: 'v1.credits', shortKey: 'v1.end', first: n - 1 }
  ];

  /* ---------- O plano: a folha de contato e o trilho ----------
     As regiões têm o tamanho da tela e descem em serpentina, três por fileira na
     tela deitada e duas em pé, com um pouco de desalinho, como fotos coladas à mão.
     O trilho passa pelo centro de cada uma e, no fim da fileira, sai para fora e
     volta na de baixo, como filme dando a volta num carretel. */

  var W = 1, H = 1, GX = 0.3, GY = 0.36;
  var JIT = [[0, 0], [0.02, 0.05], [-0.015, -0.03], [0.025, 0.025], [-0.02, 0.045], [0.015, -0.025], [-0.025, 0.03], [0.02, -0.04], [0.01, 0.02]];
  var R = { X: [], Y: [], L: [], len: 1, sAt: [], gaps: [] };
  var segs = [], U = 1, bounds = { x: 0, y: 0, w: 1, h: 1 }, DRIFT = 20;

  function crc(p0, p1, p2, p3, tt) {
    // Catmull-Rom centrípeta: não dá laço quando os pontos ficam desiguais
    var kn = function (ti, a, b) { return ti + Math.max(1e-3, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y))); };
    var t0 = 0, t1 = kn(t0, p0, p1), t2 = kn(t1, p1, p2), t3 = kn(t2, p2, p3);
    var u = t1 + (t2 - t1) * tt;
    var L = function (a, b, ta, tb) { var w = (u - ta) / (tb - ta); return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w }; };
    var A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
    return L(L(A1, A2, t0, t2), L(A2, A3, t1, t3), t1, t2);
  }

  function layout() {
    W = vp.clientWidth || window.innerWidth;
    H = vp.clientHeight || window.innerHeight;
    var cols = W >= H ? 3 : 2;
    REG.forEach(function (r, i) {
      var row = Math.floor(i / cols), k = i % cols, col = row % 2 ? cols - 1 - k : k, j = JIT[i % JIT.length];
      r.row = row; r.col = col;
      r.x = Math.round(col * W * (1 + GX) + j[0] * W);
      r.y = Math.round(row * H * (1 + GY) + j[1] * H);
      r.cx = r.x + W / 2; r.cy = r.y + H / 2;
      var st = r.el.style;
      st.left = r.x + 'px'; st.top = r.y + 'px'; st.width = W + 'px'; st.height = H + 'px';
    });
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    REG.forEach(function (r) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + W); y1 = Math.max(y1, r.y + H); });

    // os pontos do trilho: o centro de cada região e a volta no fim de cada fileira
    var P = [];
    REG.forEach(function (r, i) {
      P.push({ x: r.cx, y: r.cy, reg: i });
      var nx = REG[i + 1];
      if (nx && nx.row !== r.row) {
        var side = r.col === 0 ? -1 : 1;
        P.push({ x: r.cx + side * W * (0.5 + GX * 0.5 + 0.04), y: (r.cy + nx.cy) / 2 });
      }
    });
    var ends = [{ x: 2 * P[0].x - P[1].x, y: 2 * P[0].y - P[1].y }].concat(P, [{ x: 2 * P[P.length - 1].x - P[P.length - 2].x, y: 2 * P[P.length - 1].y - P[P.length - 2].y }]);
    R.X = []; R.Y = []; R.L = []; R.sAt = [];
    var acc = 0, px = null, py = null, STEPS = 56;
    for (var q = 1; q < ends.length - 2; q++) {
      if (ends[q].reg != null) R.sAt[ends[q].reg] = { idx: R.X.length };
      for (var k2 = 0; k2 < STEPS; k2++) {
        var c = crc(ends[q - 1], ends[q], ends[q + 1], ends[q + 2], k2 / STEPS);
        if (px !== null) acc += Math.hypot(c.x - px, c.y - py);
        R.X.push(c.x); R.Y.push(c.y); R.L.push(acc);
        px = c.x; py = c.y;
      }
    }
    var last = ends[ends.length - 2];
    acc += Math.hypot(last.x - px, last.y - py);
    R.X.push(last.x); R.Y.push(last.y); R.L.push(acc);
    R.sAt[n - 1] = { idx: R.X.length - 1 };
    R.len = acc;
    R.sAt.forEach(function (a) { a.s = R.L[a.idx]; });

    // os trechos do trilho que ficam fora das regiões: é só ali que ele aparece
    R.gaps = [];
    var run = null, m = Math.min(W, H) * 0.06;
    for (var g = 0; g < R.X.length; g++) {
      var inside = false;
      for (var ri = 0; ri < n && !inside; ri++) {
        var rr = REG[ri];
        inside = R.X[g] > rr.x + m && R.X[g] < rr.x + W - m && R.Y[g] > rr.y + m && R.Y[g] < rr.y + H - m;
      }
      if (!inside) { if (!run) { run = [g, g]; R.gaps.push(run); } run[1] = g; }
      else run = null;
    }
    var pad0 = Math.max(W, H) * 0.3;
    bounds = { x: Math.min(x0, Math.min.apply(null, R.X)) - pad0 * 0.4, y: y0 - pad0 * 0.5, w: 0, h: 0 };
    bounds.w = Math.max(x1, Math.max.apply(null, R.X)) + pad0 * 0.4 - bounds.x;
    bounds.h = y1 + pad0 * 0.5 - bounds.y;
    buildSegs();
  }

  // a rolagem (u, em telas) vira um ponto do trilho (s, em px): devagar dentro da
  // região, depressa entre elas, na curva do visitante
  function buildSegs() {
    DRIFT = Math.min(W, H) * 0.035;
    segs = [];
    var u = 0;
    REG.forEach(function (r, i) {
      var s = R.sAt[i].s, a = i ? DRIFT : 0, b = i < n - 1 ? DRIFT : 0;
      r.u0 = u; r.u1 = u + r.D;
      segs.push({ type: 'd', i: i, u0: u, u1: u + r.D, s0: s - a, s1: s + b });
      u += r.D;
      if (i < n - 1) {
        var s0 = s + b, s1 = R.sAt[i + 1].s - DRIFT, len = s1 - s0, span = Math.max(W, H);
        var T = 0.75 * clamp(len / (span * 1.3), 0.85, 1.6);
        segs.push({ type: 't', i: i, u0: u, u1: u + T, s0: s0, s1: s1, dip: clamp(len / (span * 3.4), 0.14, 0.4) });
        u += T;
      }
    });
    U = u;
    CH.forEach(function (c) { c.u0 = REG[c.first].u0; });
    CH.forEach(function (c, i) { c.u1 = i < CH.length - 1 ? CH[i + 1].u0 : U; });
    BEATS = [];
    REG.forEach(function (r) { r.beats.forEach(function (b) { BEATS.push(r.u0 + b * r.D); }); });
    BEATS.push(U);
  }
  var BEATS = [];

  function segAt(u) {
    var lo = 0, hi = segs.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (segs[mid].u0 <= u) lo = mid; else hi = mid - 1; }
    return segs[lo];
  }
  function routeAt(s) {
    s = clamp(s, 0, R.len);
    var L = R.L, lo = 0, hi = L.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (L[mid] <= s) lo = mid; else hi = mid; }
    var d = L[hi] - L[lo], w = d ? (s - L[lo]) / d : 0;
    return { x: lerp(R.X[lo], R.X[hi], w), y: lerp(R.Y[lo], R.Y[hi], w) };
  }
  function camAt(u) {
    var g = segAt(clamp(u, 0, U)), f = clamp((u - g.u0) / Math.max(1e-6, g.u1 - g.u0), 0, 1), s, z = 1;
    if (g.type === 'd') s = lerp(g.s0, g.s1, f);
    else {
      s = g.s0 + (g.s1 - g.s0) * (motionOn() ? C.curve(f) : f);
      z = motionOn() ? 1 - g.dip * Math.sin(Math.PI * f) : 1;
    }
    var p = routeAt(s);
    return { x: p.x, y: p.y, z: z, s: s, g: g, f: f };
  }
  function regionAt(x, y) {
    for (var i = 0; i < n; i++) { var r = REG[i]; if (x >= r.x && x < r.x + W && y >= r.y && y < r.y + H) return i; }
    return -1;
  }
  // o ponto da história mais perto de um lugar do plano: dentro de uma região é a
  // própria região (do começo, se for outra), no vão é o trecho do trilho ali
  function storyNear(x, y) {
    var ri = regionAt(x, y);
    if (ri >= 0) {
      var g = segAt(u);
      if (g.type === 'd' && g.i === ri) return u;
      return REG[ri].u0 + 0.02;
    }
    var best = 0, bd = Infinity;
    for (var k = 0; k <= 480; k++) {
      var uu = U * k / 480, c = camAt(uu), d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = uu; }
    }
    return best;
  }

  /* ---------- Câmera ----------
     u anda até uT com uma mola (tau); a câmera fica no trilho em u, mais o
     desvio do arrasto (off), que desliza de volta quando a rolagem recomeça.
     blend leva a câmera de um instantâneo até o trilho ou até o mapa geral. */

  var u = 0, uT = 0, tau = 110, uv = 0;
  var cam = { x: 0, y: 0, z: 1 };
  var off = { x: 0, y: 0, vx: 0, vy: 0, back: false };
  var blend = null, zs = 1;
  var running = false, last = 0, lastTr = '', lastZ = -1;

  function per() { return clamp(H * 0.95, 520, 980); }
  function overviewCam() {
    var z = Math.min(W / bounds.w, H / bounds.h) * 0.92;
    return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2, z: Math.min(z, 0.6) };
  }
  function snap() { return { x: cam.x, y: cam.y, z: cam.z }; }
  function startBlend(to, dur, dip) {
    blend = { from: snap(), to: to, t0: performance.now(), dur: motionOn() ? dur : 0, dip: dip || 0 };
  }
  // a rolagem recomeça depois de um arrasto: a história passa a ser o ponto mais perto da câmera
  function anchor() {
    if (off.back || Math.abs(off.x) + Math.abs(off.y) < 1) return;
    var uu = storyNear(cam.x, cam.y), c = camAt(uu);
    u = uT = uu;
    off.x = cam.x - c.x; off.y = cam.y - c.y; off.vx = off.vy = 0; off.back = true;
  }
  function setU(target, smoothness) {
    anchor();
    uT = clamp(target, 0, U);
    tau = smoothness || 110;
    if (!motionOn()) { u = uT; cut(); }
  }
  function cut() {
    vp.classList.remove('is-cut');
    void vp.offsetWidth;
    vp.classList.add('is-cut');
  }
  // de longe, a câmera vai direto, mergulhando um pouco; de perto, anda pelo trilho
  function goRegion(i, at) {
    i = clamp(i, 0, n - 1);
    var wasOv = ov.on;
    if (wasOv) setOverview(false, true);
    var target = REG[i].u0 + (at != null ? at : 0.02) * REG[i].D;
    var here = curRegion();
    if (!wasOv && Math.abs(i - here) <= 1 && !blend) { setU(target, 420); return; }
    off.x = off.y = off.vx = off.vy = 0;
    startBlend('route', 1150, 0.35);
    u = uT = target;
  }
  function goBeat(dir) {
    var from = uT, to = from;
    if (dir > 0) { for (var i = 0; i < BEATS.length; i++) if (BEATS[i] > from + 0.02) { to = BEATS[i]; break; } }
    else { for (var j = BEATS.length - 1; j >= 0; j--) if (BEATS[j] < from - 0.02) { to = BEATS[j]; break; } }
    setU(to, 380);
  }

  function render() {
    var tr;
    if (Math.abs(cam.z - 1) < 1e-4) tr = 'translate3d(' + Math.round(W / 2 - cam.x) + 'px,' + Math.round(H / 2 - cam.y) + 'px,0)';
    else tr = 'translate3d(' + (W / 2).toFixed(2) + 'px,' + (H / 2).toFixed(2) + 'px,0) scale(' + cam.z.toFixed(5) + ') translate3d(' + (-cam.x).toFixed(2) + 'px,' + (-cam.y).toFixed(2) + 'px,0)';
    if (tr !== lastTr) { world.style.transform = tr; lastTr = tr; }
    if (Math.abs(cam.z - lastZ) > 0.002) { world.style.setProperty('--z', cam.z.toFixed(3)); lastZ = cam.z; }
  }

  /* ---------- Mapa geral ---------- */

  var mapBtn = $('[data-map-toggle]');
  function setOverview(on, silent) {
    on = !!on;
    if (on === ov.on) return;
    ov.on = on;
    vp.classList.toggle('is-overview', on);
    mapBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('[data-map-label]').textContent = t(on ? 'ui.mapClose' : 'ui.map');
    if (on) { var oc = overviewCam(); ov.x = oc.x; ov.y = oc.y; ov.z = oc.z; startBlend('overview', 900); }
    else if (!silent) startBlend('route', 900, 0);
    if (!on) setHover(-1);
  }
  mapBtn.addEventListener('click', function () { setOverview(!ov.on); });

  var hoverReg = -1;
  function setHover(i) {
    if (i === hoverReg) return;
    if (hoverReg >= 0) REG[hoverReg].el.classList.remove('is-hover');
    hoverReg = i;
    if (i >= 0) REG[i].el.classList.add('is-hover');
  }
  function screenToWorld(sx, sy) { return { x: cam.x + (sx - W / 2) / cam.z, y: cam.y + (sy - H / 2) / cam.z }; }

  /* ---------- Entradas ---------- */

  var suppressClick = false;
  function onWheel(e) {
    if (!running) return;
    e.preventDefault();
    if (intro) { skipIntro(); return; }
    var dy = e.deltaY, dx = e.deltaX;
    if (e.deltaMode === 1) { dy *= 16; dx *= 16; } else if (e.deltaMode === 2) { dy *= H; dx *= W; }
    if (e.ctrlKey) {
      if (dy > 4 && !ov.on) setOverview(true);
      else if (dy < -4 && ov.on) { var w = screenToWorld(e.clientX, e.clientY), ri = regionAt(w.x, w.y); if (ri >= 0) goRegion(ri); else setOverview(false); }
      return;
    }
    if (ov.on) { if (Math.abs(dy) + Math.abs(dx) > 30) setOverview(false); return; }
    var d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (!motionOn()) { wheelSteps(d); return; }
    if (blend && blend.to === 'route') blend = null;
    anchor();
    uT = clamp(uT + d / per(), 0, U);
    tau = 110;
  }
  // sem animação, a roda vai de um tempo ao outro, com corte seco
  var wAcc = 0, wAt = 0, wLock = 0;
  function wheelSteps(d) {
    var now = performance.now();
    if (now < wLock) return;
    if (now - wAt > 260) wAcc = 0;
    wAt = now;
    wAcc += d;
    // um passo por gesto: o resto da rajada da roda não conta
    if (Math.abs(wAcc) > 60) { goBeat(wAcc > 0 ? 1 : -1); wAcc = 0; wLock = now + 420; }
  }

  var pointers = new Map(), drag = null, pinch = null;
  function onDown(e) {
    if (!running) return;
    if (intro) skipIntro();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('[data-no-drag]')) return;
    if (e.pointerType === 'mouse' && e.target.closest('[data-no-drag-mouse]') && !ov.on) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinch = { d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, done: false };
      drag = null;
      return;
    }
    drag = { id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, samples: [] };
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      var pts = Array.from(pointers.values());
      var ratio = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / pinch.d0;
      if (!pinch.done && ratio < 0.72 && !ov.on) { pinch.done = true; setOverview(true); }
      else if (!pinch.done && ratio > 1.35 && ov.on) {
        pinch.done = true;
        var w = screenToWorld((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2), ri = regionAt(w.x, w.y);
        if (ri >= 0) goRegion(ri); else setOverview(false);
      }
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
      drag.moved = true;
      vp.classList.add('is-dragging');
      dx = e.clientX - drag.x; dy = e.clientY - drag.y;
    }
    drag.x = e.clientX; drag.y = e.clientY;
    var now = performance.now();
    drag.samples.push({ t: now, x: e.clientX, y: e.clientY });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 90) drag.samples.shift();
    if (ov.on) {
      // no mapa, o dedo e o mouse arrastam o plano
      ov.x = clamp(ov.x - dx / cam.z, bounds.x, bounds.x + bounds.w);
      ov.y = clamp(ov.y - dy / cam.z, bounds.y, bounds.y + bounds.h);
      return;
    }
    if (drag.type === 'touch') {
      // no toque, deslizar anda pelo trilho: para cima ou para a esquerda é para a frente
      var d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      if (blend && blend.to === 'route') blend = null;
      anchor();
      if (motionOn()) { uT = clamp(uT - d / per() * 1.15, 0, U); tau = 70; }
      return;
    }
    // o mouse arrasta o plano livre, para qualquer lado
    if (blend) blend = null;
    off.back = false;
    off.x -= dx / cam.z; off.y -= dy / cam.z;
  }
  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag;
    drag = null;
    vp.classList.remove('is-dragging');
    if (!d.moved) return;
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 60);
    var vx = 0, vy = 0, sm = d.samples;
    if (sm.length > 1) {
      var a = sm[0], b = sm[sm.length - 1], dtt = Math.max(1, b.t - a.t);
      if (performance.now() - b.t < 80) { vx = (b.x - a.x) / dtt; vy = (b.y - a.y) / dtt; }
    }
    if (ov.on) return;
    if (d.type === 'touch') {
      var v = Math.abs(vy) >= Math.abs(vx) ? vy : vx;
      if (!motionOn()) { var tot = Math.abs(d.y - d.y0) >= Math.abs(d.x - d.x0) ? d.y - d.y0 : d.x - d.x0; if (Math.abs(tot) > 30) goBeat(tot < 0 ? 1 : -1); return; }
      // o deslize solto continua um pouco, como uma página
      uT = clamp(uT - clamp(v * 300 / per(), -1.4, 1.4), 0, U);
      tau = 260;
      return;
    }
    if (motionOn()) { off.vx = -vx / cam.z; off.vy = -vy / cam.z; }
  }
  function onClickCapture(e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    if (ov.on) {
      e.preventDefault(); e.stopPropagation();
      var w = screenToWorld(e.clientX, e.clientY), ri = regionAt(w.x, w.y);
      if (ri >= 0) goRegion(ri);
    }
  }
  function onHover(e) {
    if (!ov.on || e.pointerType !== 'mouse') return;
    var w = screenToWorld(e.clientX, e.clientY);
    setHover(regionAt(w.x, w.y));
  }

  function onKey(e) {
    if (!running) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    var k = e.key;
    if (intro && k !== 'Tab' && k !== 'Shift') skipIntro();
    // um objeto focado fica com as setas, o espaço e o Enter; o resto continua andando
    if (e.target.closest && e.target.closest('[data-no-keys]') && /^(Arrow|Enter$| $)/.test(k)) return;
    var interactive = tag === 'button' || tag === 'a';
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !interactive)) { e.preventDefault(); if (ov.on) setOverview(false); goBeat(1); }
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); if (ov.on) setOverview(false); goBeat(-1); }
    else if (k === 'Home') { e.preventDefault(); goRegion(0, 0); }
    else if (k === 'End') { e.preventDefault(); goRegion(n - 1, 0.5); }
    else if (k === 'm' || k === 'M') setOverview(!ov.on);
    else if (k === 'Escape' && ov.on) setOverview(false);
  }
  // o foco do teclado leva a câmera até a região dele
  function onFocusIn(e) {
    if (!running) return;
    var el = e.target.closest && e.target.closest('.region');
    if (!el) return;
    for (var i = 0; i < n; i++) if (REG[i].el === el && i !== curRegion()) { goRegion(i); return; }
  }

  vp.addEventListener('wheel', onWheel, { passive: false });
  vp.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  vp.addEventListener('pointermove', onHover, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  vp.addEventListener('click', onClickCapture, true);
  window.addEventListener('keydown', onKey);
  vp.addEventListener('focusin', onFocusIn);
  vp.addEventListener('dragstart', function (e) { e.preventDefault(); });
  vp.addEventListener('scroll', function () { if (vp.scrollTop || vp.scrollLeft) { vp.scrollTop = 0; vp.scrollLeft = 0; } });
  window.addEventListener('scroll', function () { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); });

  /* ---------- O chão: a grade, o trilho e o ponto ---------- */

  var ground = $('.ground'), gg = ground.getContext('2d');
  var GW = 0, GH = 0, GD = 1, tile = null, dotPat = null;
  var trail = [], dot = { r: 7, a: 0 };
  function sizeGround() {
    GD = Math.min(window.devicePixelRatio || 1, 2);
    GW = W; GH = H;
    ground.width = Math.round(W * GD); ground.height = Math.round(H * GD);
    tile = doc.createElement('canvas');
    tile.width = tile.height = 22;
    var tg = tile.getContext('2d');
    tg.fillStyle = 'rgba(255,255,255,0.08)';
    tg.beginPath(); tg.arc(11, 11, 1.25, 0, TAU); tg.fill();
    dotPat = gg.createPattern(tile, 'repeat');
  }
  function sx(x) { return (x - cam.x) * cam.z + W / 2; }
  function sy(y) { return (y - cam.y) * cam.z + H / 2; }
  function routePath(i0, i1) {
    gg.beginPath();
    gg.moveTo(sx(R.X[i0]), sy(R.Y[i0]));
    for (var i = i0 + 1; i <= i1; i++) gg.lineTo(sx(R.X[i]), sy(R.Y[i]));
  }
  // o índice do trilho mais perto de um ponto s
  function idxAt(s) {
    var L = R.L, lo = 0, hi = L.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (L[mid] < s) lo = mid + 1; else hi = mid; }
    return lo;
  }

  var labels = [];
  function renderLabels() {
    labels = REG.map(function (r) {
      if (r.work != null) return { num: '4·' + pad(r.work + 1), name: (S.works[r.work].title[Site.lang()] || S.works[r.work].title.pt) };
      var c = CH[r.ch];
      return { num: c.num || '', name: t(c.key) };
    });
  }

  function drawGround(drawTo, sCam, inGap) {
    var g = gg;
    g.setTransform(GD, 0, 0, GD, 0, 0);
    g.fillStyle = '#070707';
    g.fillRect(0, 0, W, H);
    // a grade de pontos fica no plano: com a câmera longe, ela abre de dois em dois
    if (dotPat && dotPat.setTransform) {
      var lvl = Math.max(0, Math.ceil(Math.log(11 / (22 * cam.z)) / Math.LN2)), lod = Math.pow(2, lvl);
      var fine = 22 * cam.z * lod, ox = W / 2 - cam.x * cam.z, oy = H / 2 - cam.y * cam.z;
      [[lod * 2, 1], [lod, clamp((fine - 11) / 11, 0, 1)]].forEach(function (L) {
        if (L[1] <= 0.01) return;
        var k = cam.z * L[0];
        dotPat.setTransform(new DOMMatrix([k, 0, 0, k, ox - 11 * k, oy - 11 * k]));
        g.globalAlpha = L[1];
        g.fillStyle = dotPat;
        g.fillRect(0, 0, W, H);
      });
      g.globalAlpha = 1;
    }
    // o trilho só aparece entre as regiões: pontilhado no que falta, cheio no que já foi
    var upTo = idxAt(drawTo);
    g.lineWidth = 1;
    g.lineCap = 'round';
    R.gaps.forEach(function (run) {
      var a = run[0], b = Math.min(run[1], upTo);
      if (b <= a) return;
      g.setLineDash([2, 6]);
      g.strokeStyle = 'rgba(255,255,255,0.3)';
      routePath(a, b); g.stroke();
    });
    g.setLineDash([]);
    var walked = idxAt(sCam);
    R.gaps.forEach(function (run) {
      var a = run[0], b = Math.min(run[1], walked, upTo);
      if (b <= a) return;
      g.strokeStyle = 'rgba(241,240,236,0.5)';
      g.lineWidth = 1.4;
      routePath(a, b); g.stroke();
    });
    // os números da folha de contato, em cima de cada região
    g.font = '600 12px Archivo, ui-sans-serif, sans-serif';
    g.textBaseline = 'alphabetic';
    REG.forEach(function (r, i) {
      if (!r.shown) return;
      var x = sx(r.x), y = sy(r.y) - 12;
      if (x > W || y < -20 || x < -400 || y > H + 20) return;
      var lb = labels[i];
      g.fillStyle = 'rgba(255,166,77,0.9)';
      g.fillText(lb.num, x, y);
      // com a região pequena demais (o mapa no celular), fica só o número
      if (W * cam.z < 150 && lb.num) return;
      var w = lb.num ? g.measureText(lb.num + '  ').width : 0;
      g.fillStyle = 'rgba(214,213,208,0.55)';
      g.fillText(lb.name, x + w, y);
    });
    // o ponto: só no vão, do tamanho da pressa, com as cópias atrás dele
    if (dot.a > 0.01) {
      for (var k = trail.length - 1, gi = 0; k >= 0; k -= 3, gi++) {
        var tp = trail[k];
        if (gi === 0) continue;
        g.strokeStyle = 'rgba(241,240,236,' + (0.32 * dot.a * (1 - gi / 7)).toFixed(3) + ')';
        g.lineWidth = 1;
        g.beginPath(); g.arc(sx(tp.x), sy(tp.y), tp.r * 0.94, 0, TAU); g.stroke();
      }
      var hd = trail[trail.length - 1];
      if (hd) {
        g.fillStyle = 'rgba(255,166,77,' + dot.a.toFixed(3) + ')';
        g.beginPath(); g.arc(sx(hd.x), sy(hd.y), hd.r, 0, TAU); g.fill();
      }
    }
  }

  /* ---------- HUD ---------- */

  var indexHost = $('[data-index]'), indexBtns = [];
  function renderIndex() {
    indexHost.innerHTML = '';
    indexBtns = [];
    CH.forEach(function (c, ci) {
      var li = doc.createElement('li'), b = doc.createElement('button');
      b.type = 'button';
      var label = t(c.key);
      b.innerHTML = (c.num ? '<span class="i-num" aria-hidden="true"></span>' : '') + '<span class="i-label"></span>' + (c.shortKey ? '<span class="i-label i-label--short" aria-hidden="true"></span>' : '');
      if (c.num) $('.i-num', b).textContent = c.num;
      $('.i-label', b).textContent = label;
      if (c.shortKey) $('.i-label--short', b).textContent = t(c.shortKey);
      b.setAttribute('aria-label', (c.num ? c.num + ', ' : '') + label);
      b.addEventListener('click', function () { goRegion(c.first, ci === CH.length - 1 ? 0.5 : 0); });
      li.appendChild(b);
      indexHost.appendChild(li);
      indexBtns.push(b);
    });
    hudCh = -1; prLast = [];
  }
  $('[data-home]').addEventListener('click', function () { goRegion(0, 0); });

  // o mostrador: o arco de cada capítulo, o que já passou e o ponteiro
  var NS = 'http://www.w3.org/2000/svg';
  var jog = $('.jog'), jogSvg = $('svg', jog), jogArcs = [], jogDone, jogHand, jogKnob;
  var J0 = -150 * Math.PI / 180, J1 = 150 * Math.PI / 180;
  function jAngle(uu) { return J0 + (J1 - J0) * clamp(uu / U, 0, 1); }
  function polar(r, a) { return { x: r * Math.sin(a), y: -r * Math.cos(a) }; }
  function arcD(r, a0, a1) {
    var p0 = polar(r, a0), p1 = polar(r, a1);
    return 'M' + p0.x.toFixed(2) + ',' + p0.y.toFixed(2) + 'A' + r + ',' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2);
  }
  function el(tag, cls) { var e = doc.createElementNS(NS, tag); e.setAttribute('class', cls); jogSvg.appendChild(e); return e; }
  function buildJog() {
    jogSvg.innerHTML = '';
    var face = el('circle', 'jog-face'); face.setAttribute('r', 47);
    for (var i = 0; i <= 40; i++) {
      var a = lerp(J0, J1, i / 40), p0 = polar(33, a), p1 = polar(i % 10 ? 36 : 38.5, a), tk = el('line', 'jog-tick');
      tk.setAttribute('x1', p0.x.toFixed(2)); tk.setAttribute('y1', p0.y.toFixed(2)); tk.setAttribute('x2', p1.x.toFixed(2)); tk.setAttribute('y2', p1.y.toFixed(2));
    }
    jogArcs = CH.map(function (c) {
      var a0 = jAngle(c.u0) + 0.04, a1 = jAngle(c.u1) - 0.04, p = el('path', 'jog-arc');
      p.setAttribute('d', arcD(43, a0, Math.max(a0 + 0.02, a1)));
      return p;
    });
    jogDone = el('path', 'jog-done');
    jogHand = el('line', 'jog-hand'); jogHand.setAttribute('x1', 0); jogHand.setAttribute('y1', 0);
    jogKnob = el('circle', 'jog-knob'); jogKnob.setAttribute('r', 4);
    var hub = el('circle', 'jog-hub'); hub.setAttribute('r', 3.2);
    jogLast = -1;
  }
  var jogLast = -1, jogCh = -1;
  function drawJog(uu, ci) {
    var a = jAngle(uu);
    if (Math.abs(a - jogLast) > 0.002) {
      jogLast = a;
      var h = polar(27, a);
      jogHand.setAttribute('x2', h.x.toFixed(2)); jogHand.setAttribute('y2', h.y.toFixed(2));
      jogKnob.setAttribute('cx', h.x.toFixed(2)); jogKnob.setAttribute('cy', h.y.toFixed(2));
      jogDone.setAttribute('d', a - J0 > 0.02 ? arcD(30, J0, a) : '');
      jog.setAttribute('aria-valuenow', Math.round(100 * uu / U));
    }
    if (ci !== jogCh) {
      jogCh = ci;
      jogArcs.forEach(function (p, k) { p.classList.toggle('is-current', k === ci); });
      jog.setAttribute('aria-valuetext', (CH[ci].num ? CH[ci].num + ', ' : '') + t(CH[ci].key));
    }
  }
  var jogDrag = null;
  function jogAt(e) {
    var r = jog.getBoundingClientRect(), a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2)));
    return clamp(a, J0, J1);
  }
  jog.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (intro) skipIntro();
    if (ov.on) setOverview(false, true);
    jogDrag = { id: e.pointerId };
    jog.classList.add('is-held');
    try { jog.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    setU(U * (jogAt(e) - J0) / (J1 - J0), 160);
  });
  jog.addEventListener('pointermove', function (e) {
    if (!jogDrag || jogDrag.id !== e.pointerId) return;
    var target = U * (jogAt(e) - J0) / (J1 - J0);
    if (motionOn()) setU(target, 160);
  });
  var jogUp = function () { jogDrag = null; jog.classList.remove('is-held'); };
  jog.addEventListener('pointerup', jogUp);
  jog.addEventListener('pointercancel', jogUp);

  var hudCh = -1, prLast = [], hashNow = '', tcEl = $('.timecode');
  function updateHud(uE) {
    var ci = 0;
    for (var i = 0; i < CH.length; i++) if (CH[i].u0 <= uE + 0.3) ci = i;
    CH.forEach(function (c, k) {
      var pr = clamp((uE - c.u0) / Math.max(0.01, c.u1 - c.u0), 0, 1);
      if (k === CH.length - 1) pr = clamp((uE - c.u0) / Math.max(0.01, REG[n - 1].D * 0.5), 0, 1);
      if (prLast[k] == null || Math.abs(pr - prLast[k]) > 0.002 || (pr !== prLast[k] && (pr === 0 || pr === 1))) {
        prLast[k] = pr;
        indexBtns[k].style.setProperty('--pr', pr.toFixed(3));
      }
    });
    if (ci !== hudCh) {
      hudCh = ci;
      indexBtns.forEach(function (b, k) {
        b.classList.toggle('is-current', k === ci);
        if (k === ci) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
    }
    drawJog(uE, ci);
    // o timecode é o lugar da história no filme: cada tela de rolagem, quatro segundos
    var f = Math.floor(uE * 4 * 24);
    tcEl.textContent = pad(Math.floor(f / 86400)) + ':' + pad(Math.floor(f / 1440) % 60) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
  }

  /* ---------- Laço ---------- */

  var curIdx = -1, uEff = 0;
  function curRegion() { return curIdx < 0 ? 0 : curIdx; }

  function tick(now) {
    if (!running) return;
    var dt = Math.min(64, now - (last || now));
    last = now;
    var live = motionOn();

    // a história anda até onde a rolagem mandou
    var u0 = u;
    if (live) { u += (uT - u) * (1 - Math.exp(-dt / tau)); if (Math.abs(uT - u) < 0.0004) u = uT; }
    else u = uT;
    var du = dt ? Math.abs(u - u0) / (dt / 1000) : 0;
    uv += (du - uv) * (1 - Math.exp(-dt / 120));

    // o desvio do arrasto: inércia ao soltar; volta ao trilho quando a rolagem recomeça
    if (!drag || drag.type === 'touch') {
      if (off.back) { var kb = 1 - Math.exp(-dt / 300); off.x -= off.x * kb; off.y -= off.y * kb; if (Math.abs(off.x) + Math.abs(off.y) < 0.5) { off.x = off.y = 0; off.back = false; } }
      else if (off.vx || off.vy) {
        off.x += off.vx * dt; off.y += off.vy * dt;
        var fr = Math.exp(-dt / 220); off.vx *= fr; off.vy *= fr;
        if (Math.abs(off.vx) + Math.abs(off.vy) < 0.005) off.vx = off.vy = 0;
      }
    }

    // muito depressa (o mostrador, um salto), a câmera recua para não perder o caminho
    var zw = live ? 1 / (1 + 0.18 * Math.max(0, uv - 3)) : 1;
    zs += (zw - zs) * (1 - Math.exp(-dt / 180));

    var rc = camAt(u);
    var story = { x: rc.x + off.x, y: rc.y + off.y, z: rc.z * zs };
    var oc = ov.on ? { x: ov.x, y: ov.y, z: ov.z } : null;
    var want = ov.on ? oc : story;
    if (intro) want = introCam(now, want);
    if (blend) {
      var bt = blend.dur ? clamp((now - blend.t0) / blend.dur, 0, 1) : 1, e = inOut(bt);
      var to = blend.to === 'overview' ? oc || story : want;
      var zA = Math.log(blend.from.z), zB = Math.log(to.z);
      var zz = Math.exp(lerp(zA, zB, e)) * (1 - blend.dip * Math.sin(Math.PI * bt));
      cam.x = lerp(blend.from.x, to.x, e); cam.y = lerp(blend.from.y, to.y, e); cam.z = zz;
      if (bt >= 1) blend = null;
    } else { cam.x = want.x; cam.y = want.y; cam.z = want.z; }
    ov.k = ov.on ? 1 : (blend ? 0.5 : 0);
    if (ov.on) { var oz = overviewCam(); ov.z = oz.z; }
    render();

    // onde a história está para as cenas: no trilho, u; longe dele, o lugar mais perto da câmera
    var far = Math.abs(off.x) + Math.abs(off.y) > Math.min(W, H) * 0.25 && !off.back;
    uEff = far ? storyNear(cam.x, cam.y) : u;
    var g = segAt(uEff), gf = clamp((uEff - g.u0) / Math.max(1e-6, g.u1 - g.u0), 0, 1);
    var ci = g.type === 'd' ? g.i : (gf < 0.55 ? g.i : g.i + 1);
    if (far) { var hr = regionAt(cam.x, cam.y); if (hr >= 0) ci = hr; }

    var vx0 = cam.x - W / 2 / cam.z, vx1 = cam.x + W / 2 / cam.z, vy0 = cam.y - H / 2 / cam.z, vy1 = cam.y + H / 2 / cam.z;
    REG.forEach(function (r) {
      var vis = r.x < vx1 && r.x + W > vx0 && r.y < vy1 && r.y + H > vy0;
      C.set(r.key, clamp((uEff - r.u0) / r.D, 0, 1), vis);
    });
    if (ci !== curIdx) {
      var prev = curIdx;
      curIdx = ci;
      C.current(REG[ci].key);
      if (prev >= 0 && live && !ov.on && !intro) {
        var re = REG[ci].el;
        re.classList.remove('is-lit'); void re.offsetWidth; re.classList.add('is-lit');
      }
      if (!intro && REG[ci].hash && history.replaceState && REG[ci].hash !== hashNow) {
        hashNow = REG[ci].hash;
        try { history.replaceState(null, '', '#' + hashNow); } catch (err) { /* file:// */ }
      }
    }

    // o ponto anda no vão: aparece ao sair da região e some ao chegar na seguinte
    var inGap = rc.g.type === 't' && !ov.on && live && !far;
    var da = inGap ? smooth(rc.f / 0.16) * smooth((1 - rc.f) / 0.16) : 0;
    dot.a += (da - dot.a) * (1 - Math.exp(-dt / 70));
    var rr = 7 * clamp(0.7 + 0.45 * uv, 0.7, 2.6);
    trail.push({ x: rc.x, y: rc.y, r: rr });
    if (trail.length > 22) trail.shift();

    var drawTo = intro ? intro.drawn : R.len;
    drawGround(drawTo, rc.s, inGap);

    C.frame(dt, now, Math.max(uv * 0.8, Math.hypot(off.vx, off.vy) * 1000 / Math.max(W, H)));
    updateHud(uEff);
    requestAnimationFrame(tick);
  }

  /* ---------- Abertura ----------
     A câmera parte do mapa inteiro. O trilho se desenha da primeira região à
     última, e cada região acende quando ele passa por ela; depois a câmera desce
     até o título. Qualquer gesto pula para o fim. */

  var intro = null;
  var DRAW_MS = 1700, DIVE_MS = 1500;
  function runIntro() {
    root.classList.add('is-intro');
    var oc = overviewCam();
    intro = { t0: performance.now(), drawn: 0, oc: { x: oc.x, y: oc.y, z: oc.z * 0.9 }, dove: false };
    cam.x = intro.oc.x; cam.y = intro.oc.y; cam.z = intro.oc.z;
  }
  function introCam(now, want) {
    var el2 = now - intro.t0, k = clamp(el2 / DRAW_MS, 0, 1);
    intro.drawn = R.len * inOut(k);
    REG.forEach(function (r, i) { if (!r.shown && R.sAt[i].s <= intro.drawn + 1) { r.shown = true; r.el.classList.add('is-in'); } });
    if (el2 > DRAW_MS * 0.7) root.classList.add('is-ready');
    if (el2 >= DRAW_MS && !intro.dove) {
      intro.dove = true;
      cam.x = intro.oc.x; cam.y = intro.oc.y; cam.z = intro.oc.z;
      startBlend('route', DIVE_MS, 0);
      blend.from = { x: intro.oc.x, y: intro.oc.y, z: intro.oc.z };
      setTimeout(endIntro, DIVE_MS + 30);
    }
    return intro.dove ? want : intro.oc;
  }
  function skipIntro() {
    if (!intro) return;
    var from = snap();
    REG.forEach(function (r) { r.shown = true; r.el.classList.add('is-in'); });
    intro.drawn = R.len;
    if (!intro.dove) { intro.dove = true; startBlend('route', 700, 0); blend.from = from; }
    endIntro();
  }
  function endIntro() {
    if (!intro) return;
    intro = null;
    REG.forEach(function (r) { r.shown = true; r.el.classList.add('is-in'); });
    root.classList.add('is-ready');
    setTimeout(function () { root.classList.remove('is-intro'); }, 1500);
    C.ready();
    C.titleIn();
  }

  /* ---------- Idioma, movimento e tamanho ---------- */

  Site.on('lang', function () {
    renderIndex();
    renderLabels();
    jogCh = -1;
    $('[data-map-label]').textContent = t(ov.on ? 'ui.mapClose' : 'ui.map');
  });
  Site.on('motion', function (on) { if (!on) { off.vx = off.vy = 0; blend = null; dot.a = 0; trail = []; } });

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      // a história fica no mesmo ponto da mesma região
      var i = curRegion(), r = REG[i], f = clamp((u - r.u0) / r.D, 0, 1);
      layout();
      sizeGround();
      buildJog();
      u = uT = REG[i].u0 + f * REG[i].D;
      off.x = off.y = off.vx = off.vy = 0;
      blend = null;
      if (ov.on) { var oc = overviewCam(); ov.x = oc.x; ov.y = oc.y; ov.z = oc.z; }
      C.refit();
    }, 120);
  });

  /* ---------- Início ---------- */

  layout();
  sizeGround();
  renderIndex();
  renderLabels();
  buildJog();
  C.refit();

  // um endereço com capítulo ou vídeo abre direto nele
  var h0 = (location.hash || '').replace('#', ''), start = 0;
  REG.forEach(function (r, i) { if (r.hash === h0) start = i; });
  u = uT = start ? REG[start].u0 + 0.02 : 0;
  var c0 = camAt(u);
  cam.x = c0.x; cam.y = c0.y; cam.z = 1;
  running = true;
  if (motionOn() && !start) runIntro();
  else {
    REG.forEach(function (r) { r.shown = true; r.el.classList.add('is-in'); });
    root.classList.add('is-ready');
    C.ready();
    C.titleIn();
  }
  render();
  requestAnimationFrame(tick);
})();
