/* Versão 2 · Concreto */
(function () {
  'use strict';

  var S = window.SITE, Site = window.Site, M = window.SCMap;
  var clamp = M.clamp, lerp = M.lerp;
  var doc = document, root = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var t = Site.t;
  var motionOn = function () { return Site.motion(); };
  var smooth = function (a, b, x) { var u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  var expoOut = M.ease.expoOut;

  Site.addStrings({
    'v2.design.caption': 'Estrutura primeiro, depois variação: oito módulos, cinco arranjos, a mesma grade.',
    'v2.motion.sr': 'A palavra movimento perde duas letras e vira momento, e depois volta.',
    'v2.play.caption': 'Arraste para girar e abrir. Toque para dobrar. Pelo teclado: setas e Enter.',
    'v2.play.sr': 'Uma escultura de placas articuladas que respira, gira e se dobra ao toque.',
    'v2.play.caption.touch': 'Arraste para girar e abrir. Toque para dobrar.',
    'v2.hint.pointer': 'Role para entrar · arraste para explorar o poema',
    'v2.hint.touch': 'Deslize para entrar · arraste para explorar o poema',
    'v2.enter': 'Entrar',
    'v2.poem': 'Poema',
    'v2.restart': 'Voltar ao poema',
    'v2.of': 'de'
  }, {
    'v2.design.caption': 'Structure first, then variation: eight modules, five arrangements, one grid.',
    'v2.motion.sr': 'The word movement loses two letters and becomes moment, then comes back.',
    'v2.play.caption': 'Drag to turn it and open it. Tap to fold it. Keyboard: arrows and Enter.',
    'v2.play.sr': 'A sculpture of hinged plates that breathes, turns and folds when touched.',
    'v2.play.caption.touch': 'Drag to turn it and open it. Tap to fold it.',
    'v2.hint.pointer': 'Scroll to enter · drag to explore the poem',
    'v2.hint.touch': 'Swipe to enter · drag to explore the poem',
    'v2.enter': 'Enter',
    'v2.poem': 'Poem',
    'v2.restart': 'Back to the poem',
    'v2.of': 'of'
  });

  var css = getComputedStyle(root);
  var COLORS = {
    ink: css.getPropertyValue('--ink').trim() || '#101010',
    design: css.getPropertyValue('--v-design').trim(),
    motion: css.getPropertyValue('--v-motion').trim(),
    play: css.getPropertyValue('--v-play').trim(),
    works: css.getPropertyValue('--v-works').trim()
  };

  /* ---------- Conteúdo gerado ---------- */

  var nW = S.works.length;
  var worksHost = $('[data-works]');
  var workRefs = [];
  S.works.forEach(function (w, i) {
    var el = doc.createElement('div');
    el.className = 'stop panel panel--work';
    el.setAttribute('data-key', 'work');
    el.setAttribute('data-hash', i === 0 ? 'trabalhos' : 'trabalho-' + (i + 1));
    el.setAttribute('role', 'group');
    el.innerHTML = '<div class="panel-inner">' +
      (i === 0 ? '<div class="work-head"><h2 class="title" id="t-works" data-t="ch.works"></h2></div>' : '') +
      '<div class="work-slot"></div><p class="work-meta"><strong></strong><span></span></p></div>';
    var slot = $('.work-slot', el);
    var media = Site.workMedia(w, i);
    slot.parentNode.replaceChild(media, slot);
    worksHost.appendChild(el);
    workRefs.push({ el: el, title: $('.work-meta strong', el), count: $('.work-meta span', el), w: w, i: i });
  });
  function renderWorks() {
    var l = Site.lang();
    workRefs.forEach(function (r) {
      var title = r.w.title[l] || r.w.title.pt;
      r.title.textContent = title;
      r.count.textContent = (r.i + 1) + ' ' + t('v2.of') + ' ' + nW;
      r.el.setAttribute('aria-label', t('ch.works') + ': ' + title);
    });
  }

  var socialsHost = $('[data-socials]');
  function renderSocials() {
    socialsHost.innerHTML = '';
    S.socials.forEach(function (s) {
      var li = doc.createElement('li');
      var handle = s.handle || (s.url ? s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : t('social.draft'));
      if (s.url) {
        li.innerHTML = '<a target="_blank" rel="noopener"></a><span class="s-handle"></span>';
        var a = $('a', li); a.href = s.url; a.textContent = s.label.toLowerCase();
      } else {
        li.innerHTML = '<span class="s-name is-draft"></span><span class="s-handle"></span>';
        $('.s-name', li).textContent = s.label.toLowerCase();
      }
      $('.s-handle', li).textContent = handle;
      socialsHost.appendChild(li);
    });
  }
  $('[data-photo]').appendChild(Site.img(S.photo, S.name));
  Site.mark($('.mark'));

  var ROLE_COLORS = ['design', 'works', 'motion', 'play'];
  function renderRoles() {
    var roles = S.roles[Site.lang()];
    var ul = $('[data-roles]');
    ul.innerHTML = '';
    roles.forEach(function (r, i) {
      var li = doc.createElement('li');
      li.textContent = r.toLowerCase();
      li.style.color = COLORS[ROLE_COLORS[i % ROLE_COLORS.length]];
      ul.appendChild(li);
    });
    var rl = $('[data-roles-line]'); if (rl) rl.textContent = roles.join(' · ');
  }

  /* ---------- O poema ---------- */

  var WORDS = {
    pt: [
      { k: 0, w: 'DESIGN', x: 2, c: 'design' },
      { k: 1, w: 'CAVALCANTE', x: 1, c: 'ink' },
      { k: 2, w: 'MOVIMENTO', x: 2, c: 'motion' },
      { k: 3, w: 'INTERAÇÃO', x: 0, c: 'play' },
      { k: 4, w: 'TRABALHOS', x: 7, c: 'works' }
    ],
    en: [
      { k: 0, w: 'DESIGN', x: 2, c: 'design' },
      { k: 1, w: 'CAVALCANTE', x: 1, c: 'ink' },
      { k: 2, w: 'MOVEMENT', x: 2, c: 'motion' },
      { k: 3, w: 'INTERACTION', x: 0, c: 'play' },
      { k: 4, w: 'WORK', x: 1, c: 'works' }
    ]
  };
  var SPINE = 'SAVIO';

  var panels = $$('.stop');
  var keyK = { intro: 1, design: 0, motion: 2, play: 3, close: 4 + nW };
  var panelK = panels.map(function (el, i) {
    var key = el.getAttribute('data-key');
    if (key === 'work') return 4 + panels.slice(0, i).filter(function (p) { return p.getAttribute('data-key') === 'work'; }).length;
    return keyK[key];
  });
  // ordem da história: poema, A, S, V, I, O e trabalhos, ponto final
  var order = ['intro', 'design', 'motion', 'play'];
  var STOPS = [{ poem: true, hash: '' }];
  order.forEach(function (key) { var el = panels.filter(function (p) { return p.getAttribute('data-key') === key; })[0]; STOPS.push({ el: el, k: keyK[key], hash: el.getAttribute('data-hash') }); });
  panels.forEach(function (el, i) { if (el.getAttribute('data-key') === 'work') STOPS.push({ el: el, k: panelK[i], hash: el.getAttribute('data-hash') }); });
  var closeEl = panels.filter(function (p) { return p.getAttribute('data-key') === 'close'; })[0];
  STOPS.push({ el: closeEl, k: 4 + nW, hash: 'contato' });
  STOPS.forEach(function (s, i) { if (s.el) s.el.setAttribute('data-stop', i); });

  var geo = { s: 1, portrait: false, letters: [], z0: 0.1, cx: 0, cy: 0 };

  function cellPos(k, j) { return geo.portrait ? { x: k * geo.s, y: j * geo.s } : { x: j * geo.s, y: k * geo.s }; }

  function buildLetters() {
    var L = [];
    var words = WORDS[Site.lang()];
    var rnd = mulberry(7);
    words.forEach(function (wd, wi) {
      wd.w.split('').forEach(function (ch, i) {
        var j = i - wd.x;
        if (j === 0) return;
        var p = cellPos(wd.k, j);
        L.push({ ch: ch, x: p.x, y: p.y, color: wd.c, group: wd.c === 'ink' ? 'name' : 'word', phase: i * 0.55 + wi * 1.3,
          delay: wd.c === 'ink' ? 120 + Math.abs(j) * 55 : 1500 + wi * 110 + Math.abs(j) * 45,
          ox: (rnd() - 0.5) * 3, oy: (rnd() - 0.5) * 3 });
      });
    });
    SPINE.split('').forEach(function (ch, k) {
      var p = cellPos(k, 0);
      L.push({ ch: ch, x: p.x, y: p.y, color: 'ink', group: 'spine', phase: 0, delay: k * 70, ox: (rnd() - 0.5) * 3, oy: -2 - rnd() * 2 });
    });
    for (var k = 5; k <= 3 + nW; k++) {
      var p = cellPos(k, 0);
      L.push({ kind: 'square', x: p.x, y: p.y, color: 'ink', group: 'block', delay: 2100 + (k - 5) * 90, ox: 0, oy: 1.5 });
    }
    var pd = cellPos(4 + nW, 0);
    L.push({ kind: 'dot', x: pd.x, y: pd.y, color: 'ink', group: 'block', delay: 2100 + nW * 90, ox: 0, oy: 1.5 });
    geo.letters = L;
  }

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var r = Math.imul(a ^ a >>> 15, 1 | a); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }

  function layout(W, H) {
    geo.portrait = W / H < 0.9;
    geo.s = H;
    buildLetters();
    panels.forEach(function (el, i) {
      var p = cellPos(panelK[i], 0);
      el.style.left = Math.round(p.x - W / 2) + 'px';
      el.style.top = Math.round(p.y - H / 2) + 'px';
      el.style.width = W + 'px';
      el.style.height = H + 'px';
    });
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    geo.letters.forEach(function (l) { minX = Math.min(minX, l.x); maxX = Math.max(maxX, l.x); minY = Math.min(minY, l.y); maxY = Math.max(maxY, l.y); });
    var s = geo.s;
    var bounds = { x: minX - s / 2, y: minY - s / 2, w: maxX - minX + s, h: maxY - minY + s };
    var hudPad = 150;
    geo.z0 = Math.min(W / bounds.w, (H - hudPad) / bounds.h) * 0.94;
    geo.cx = bounds.x + bounds.w / 2;
    geo.cy = bounds.y + bounds.h / 2;
    var stops = STOPS.map(function (st) {
      if (st.poem) return { x: geo.cx, y: geo.cy + (hudPad * 0.08) / geo.z0, z: geo.z0, hash: '' };
      var p = cellPos(st.k, 0);
      return { x: Math.round(p.x), y: Math.round(p.y), el: st.el, hash: st.hash };
    });
    sizeCanvas(W, H);
    requestAnimationFrame(refit);
    return { stops: stops, bounds: bounds };
  }

  function travel(a, b, e, ctx) {
    var la = Math.log(a.z), lb = Math.log(b.z);
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    if (Math.abs(lb - la) > 0.25) {
      var z = Math.exp(la + (lb - la) * e);
      var ia = 1 / a.z, ib = 1 / b.z;
      var u = (1 / z - ia) / (ib - ia);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: z, r: 0 };
    }
    var span = Math.max(ctx.W, ctx.H);
    var dip = clamp(d / (span * 2.4), 0, 0.72);
    var z2 = Math.exp(la + (lb - la) * e) * (1 - dip * Math.sin(Math.PI * e));
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: z2, r: 0 };
  }

  /* ---------- Canvas do poema ---------- */

  var canvas = $('.poem');
  var ctx = canvas.getContext('2d');
  var dpr = 1, cW = 1, cH = 1;
  var capRatio = 0.7;
  function sizeCanvas(W, H) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cW = W; cH = H;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  function measureCap() {
    ctx.font = '600 100px Jost';
    var m = ctx.measureText('H');
    if (m.actualBoundingBoxAscent) capRatio = m.actualBoundingBoxAscent / 100;
  }

  var introT0 = 0, introOn = false;
  function drawPoem(cam, now, T) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cW, cH);
    var z = cam.z, s = geo.s, sp = s * z;
    if (sp < 3) return;
    var close = smooth(0.5, 1, z);
    // de perto, a letra-fantasma não passa da menor dimensão da tela
    var cap = Math.min(1, Math.min(cW, cH) * 1.15 / (s * 0.92));
    var fontPx = s * 0.92 * z * lerp(1, cap, close);
    ctx.font = '600 ' + fontPx.toFixed(2) + 'px Jost';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var capOff = capRatio * fontPx / 2;
    var floor = geo.portrait ? 0.035 : 0.055;
    var aZoom = 1 - (1 - floor) * smooth(0.16, 0.62, z);
    var live = motionOn();
    // atrás dos vídeos e do contato não fica letra-fantasma
    var ti = map ? map.target() : 0;
    var quiet = ti >= 5;
    for (var i = 0; i < geo.letters.length; i++) {
      var L = geo.letters[i];
      if (L.kind && z > 0.5) continue;
      if (quiet && z > 0.55) continue;
      var e = 1;
      if (introOn) e = expoOut(clamp((now - introT0 - L.delay) / 1100, 0, 1));
      if (e <= 0) continue;
      var x = L.x + L.ox * s * (1 - e), y = L.y + L.oy * s * (1 - e);
      var sx = (x - cam.x) * z + cW / 2, sy = (y - cam.y) * z + cH / 2;
      if (sx < -sp || sx > cW + sp || sy < -sp || sy > cH + sp) continue;
      var a = aZoom * Math.min(1, e * 1.3);
      // só a letra da célula atual resiste quando a câmera chega perto
      if (z > 0.6) a *= clamp(1 - Math.hypot(L.x - cam.x, L.y - cam.y) / (s * 0.9), 0, 1) * close + (1 - close);
      if (a < 0.004) continue;
      if (live && L.group === 'word' && z < 0.4) a *= 0.92 + 0.08 * Math.sin(T * 1.4 - L.phase);
      ctx.globalAlpha = a;
      ctx.fillStyle = COLORS[L.color];
      if (L.kind === 'square') { var q = sp * 0.5; ctx.fillRect(sx - q / 2, sy - q / 2, q, q); }
      else if (L.kind === 'dot') { ctx.beginPath(); ctx.arc(sx, sy + capOff * 0.86, sp * 0.07, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillText(L.ch, sx, sy + capOff);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- S · Design: oito módulos numa grade ---------- */

  var mods = $$('.modgrid .mg');
  var COMPS = [
    [[0, 0], [3, 3], [2, 0], [3, 0], [2, 1], [3, 1], [0, 3], [1, 3]],
    [[2, 2], [0, 3], [0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1]],
    [[1, 1], [0, 0], [3, 0], [3, 1], [3, 2], [3, 3], [1, 3], [2, 3]],
    [[2, 0], [1, 1], [0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]],
    [[0, 2], [2, 0], [2, 2], [3, 2], [2, 3], [3, 3], [0, 0], [1, 0]]
  ];
  var comp = 0, compAt = -10;
  function setComp(i, T) {
    comp = i; compAt = T;
    COMPS[i].forEach(function (p, k) { mods[k].style.setProperty('--c', p[0]); mods[k].style.setProperty('--r', p[1]); });
  }

  /* ---------- V · Movimento: movimento vira momento ---------- */

  var kin = $('.kinetic'), kinWord = $('.kinetic-word');
  var KW = { pt: { w: 'movimento', out: [2, 3] }, en: { w: 'movement', out: [2, 3] } };
  var kinSpans = [], kinState = 0, kinAt = -10, kinX = { a: [], b: [] };
  function buildKinetic() {
    var spec = KW[Site.lang()];
    kinWord.innerHTML = '';
    kinSpans = spec.w.split('').map(function (ch, i) {
      var s = doc.createElement('span');
      s.textContent = ch;
      if (spec.out.indexOf(i) >= 0) s.className = 'is-mover';
      kinWord.appendChild(s);
      return s;
    });
    layoutKinetic();
  }
  function layoutKinetic() {
    var spec = KW[Site.lang()];
    var cw = kin.clientWidth;
    if (!cw) return;
    ctx.font = '560 100px Jost';
    var widths = spec.w.split('').map(function (ch) { return ctx.measureText(ch).width / 100; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    var padX = parseFloat(getComputedStyle(doc.querySelector('.panel-inner')).paddingLeft) || 40;
    var fs = Math.min((cw - padX * 2) / total, kin.clientHeight * 0.95);
    var x0 = (cw - total * fs) / 2, acc = 0;
    kinX.a = widths.map(function (w) { var x = x0 + acc * fs; acc += w; return x; });
    var kept = widths.filter(function (w, i) { return spec.out.indexOf(i) < 0; });
    var totalB = kept.reduce(function (a, b) { return a + b; }, 0);
    var xb0 = (cw - totalB * fs) / 2, accB = 0;
    kinX.b = widths.map(function (w, i) {
      if (spec.out.indexOf(i) >= 0) return kinX.a[i];
      var x = xb0 + accB * fs; accB += w; return x;
    });
    kinSpans.forEach(function (s) { s.style.fontSize = fs.toFixed(1) + 'px'; });
    applyKinetic();
  }
  function applyKinetic() {
    var spec = KW[Site.lang()];
    var xs = kinState ? kinX.b : kinX.a;
    kinSpans.forEach(function (s, i) {
      s.style.setProperty('--x', Math.round(xs[i] || 0) + 'px');
      s.classList.toggle('is-out', kinState === 1 && spec.out.indexOf(i) >= 0);
    });
  }

  /* ---------- I · Interação: o bicho ---------- */

  var bWrap = $('.bicho-wrap'), bCan = $('.bicho'), bx = bCan.getContext('2d');
  var bicho = { yaw: 0.6, pitch: -0.32, vyaw: 0, open: 0, openT: 0, flinch: 0, w: 1, h: 1, dpr: 1, drag: null };
  bWrap.tabIndex = 0;
  bWrap.setAttribute('data-no-keys', '');
  function sizeBicho() {
    var r = bWrap.getBoundingClientRect();
    var w = bWrap.clientWidth, h = bWrap.clientHeight;
    if (!w || !h) return;
    bicho.dpr = Math.min(2, window.devicePixelRatio || 1);
    bicho.w = w; bicho.h = h;
    bCan.width = Math.round(w * bicho.dpr);
    bCan.height = Math.round(h * bicho.dpr);
    return r;
  }
  function rot(p, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1];
    return [x, y * cp - z * sp, y * sp + z * cp];
  }
  function drawBicho(T) {
    var W = bicho.w, H = bicho.h;
    bx.setTransform(bicho.dpr, 0, 0, bicho.dpr, 0, 0);
    bx.clearRect(0, 0, W, H);
    var unit = Math.min(W, H) * 0.3;
    var cx = W * 0.5, cy = H * 0.52;
    var open = bicho.open, fl = bicho.flinch;
    var breathe = motionOn() ? Math.sin(T * 0.8) : 0;
    var polys = [];
    var hh = 0.75;
    var base = [0, 1.25, 2.9, 4.4];
    for (var i = 0; i < 4; i++) {
      var a = base[i] + breathe * 0.22 * (i % 2 ? -1 : 1) + open * (i - 1.5) * 0.32 - fl * 0.5 * (i % 2 ? 1 : -1);
      var w = 1;
      var ex = w * Math.cos(a), ez = w * Math.sin(a);
      polys.push({ pts: [[0, -hh, 0], [0, hh, 0], [ex, hh, ez], [ex, -hh, ez]], kind: 'page', i: i });
      var b = a + (0.9 + 0.55 * Math.sin(T * 0.7 + i * 1.7) * (motionOn() ? 1 : 0)) * (i % 2 ? 1 : -1) + fl * 1.4 * (i % 2 ? -1 : 1) + open * 0.6;
      var f = 0.62;
      var tip = [ex + f * Math.cos(b), (i % 2 ? 0.25 : -0.25), ez + f * Math.sin(b)];
      polys.push({ pts: [[ex, -hh, ez], [ex, hh, ez], tip], kind: i === 1 ? 'voice' : 'flap', i: i });
    }
    var light = [0.35, 0.7, -0.6];
    var ln = Math.hypot(light[0], light[1], light[2]); light = light.map(function (v) { return v / ln; });
    polys.forEach(function (p) {
      p.r = p.pts.map(function (q) { return rot(q, bicho.yaw, bicho.pitch); });
      p.depth = p.r.reduce(function (s, q) { return s + q[2]; }, 0) / p.r.length;
      var u = [p.r[1][0] - p.r[0][0], p.r[1][1] - p.r[0][1], p.r[1][2] - p.r[0][2]];
      var v = [p.r[2][0] - p.r[0][0], p.r[2][1] - p.r[0][1], p.r[2][2] - p.r[0][2]];
      var n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      var nl = Math.hypot(n[0], n[1], n[2]) || 1;
      p.lam = Math.abs((n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / nl);
    });
    polys.sort(function (a, b) { return b.depth - a.depth; });
    var fov = 4.2;
    polys.forEach(function (p) {
      bx.beginPath();
      p.r.forEach(function (q, k) {
        var sc = fov / (fov + q[2]);
        var X = cx + q[0] * unit * sc, Y = cy - q[1] * unit * sc;
        if (k) bx.lineTo(X, Y); else bx.moveTo(X, Y);
      });
      bx.closePath();
      var l = p.lam;
      if (p.kind === 'page') { var g = Math.round(214 + 38 * l); bx.fillStyle = 'rgb(' + g + ',' + g + ',' + (g - 3) + ')'; }
      else if (p.kind === 'voice') bx.fillStyle = shade(COLORS.play, 0.72 + 0.28 * l);
      else { var k2 = Math.round(16 + 34 * l); bx.fillStyle = 'rgb(' + k2 + ',' + k2 + ',' + k2 + ')'; }
      bx.fill();
      bx.lineWidth = 1;
      bx.strokeStyle = 'rgba(16,16,16,0.9)';
      bx.lineJoin = 'round';
      bx.stroke();
    });
    // eixo
    var top = rot([0, hh, 0], bicho.yaw, bicho.pitch), bot = rot([0, -hh, 0], bicho.yaw, bicho.pitch);
    bx.beginPath();
    bx.moveTo(cx + top[0] * unit * fov / (fov + top[2]), cy - top[1] * unit * fov / (fov + top[2]));
    bx.lineTo(cx + bot[0] * unit * fov / (fov + bot[2]), cy - bot[1] * unit * fov / (fov + bot[2]));
    bx.lineWidth = 2.2; bx.strokeStyle = COLORS.ink; bx.stroke();
  }
  function shade(hex, k) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * k) + ',' + Math.round(g * k) + ',' + Math.round(b * k) + ')';
  }
  function stepBicho(dt) {
    var s = dt / 1000;
    if (!bicho.drag) {
      bicho.vyaw += ((motionOn() ? 0.22 : 0) - bicho.vyaw) * (1 - Math.exp(-s * 1.6));
    }
    bicho.yaw += bicho.vyaw * s;
    bicho.open += (bicho.openT - bicho.open) * (1 - Math.exp(-s * 5));
    bicho.flinch *= Math.exp(-s * 2.2);
  }
  bWrap.addEventListener('mousedown', function (e) { e.preventDefault(); });
  bWrap.addEventListener('pointerdown', function (e) {
    bicho.drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() };
    bicho.openT = 1;
    try { bWrap.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  bWrap.addEventListener('pointermove', function (e) {
    var d = bicho.drag; if (!d) return;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    bicho.yaw += dx * 0.009;
    bicho.vyaw = dx * 0.5;
    bicho.pitch = clamp(bicho.pitch + dy * 0.006, -1.0, 0.45);
  });
  function bEnd(e) {
    var d = bicho.drag; if (!d) return;
    bicho.drag = null; bicho.openT = 0;
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) bicho.flinch = 1;
  }
  bWrap.addEventListener('pointerup', bEnd);
  bWrap.addEventListener('pointercancel', bEnd);
  bWrap.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') bicho.yaw -= 0.25;
    else if (e.key === 'ArrowRight') bicho.yaw += 0.25;
    else if (e.key === 'ArrowUp') bicho.pitch = clamp(bicho.pitch - 0.15, -1, 0.45);
    else if (e.key === 'ArrowDown') bicho.pitch = clamp(bicho.pitch + 0.15, -1, 0.45);
    else if (e.key === 'Enter' || e.key === ' ') bicho.flinch = 1;
    else return;
    e.preventDefault();
    drawBicho(clock);
  });

  /* ---------- HUD ---------- */

  var spineHost = $('[data-spine]');
  var NAV = [
    { ch: 'S', stop: 2, key: 'ch.design' },
    { ch: 'A', stop: 1, key: 'ch.intro' },
    { ch: 'V', stop: 3, key: 'ch.motion' },
    { ch: 'I', stop: 4, key: 'ch.play' },
    { ch: 'O', stop: 5, key: 'ch.works' },
    { ch: '.', stop: STOPS.length - 1, key: 'ch.close' }
  ];
  function navOf(i) {
    if (i === 0) return -1;
    if (i >= 5 && i < 5 + nW) return 4;
    for (var n = 0; n < NAV.length; n++) if (NAV[n].stop === i) return n;
    return -1;
  }
  var navBtns = [];
  function renderNav() {
    spineHost.innerHTML = '';
    navBtns = NAV.map(function (n) {
      var li = doc.createElement('li');
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = n.ch;
      b.setAttribute('aria-label', t(n.key));
      b.addEventListener('click', function () { map.go(n.stop); });
      li.appendChild(b); spineHost.appendChild(li);
      return b;
    });
    updateHud(map ? map.index() : 0);
  }
  var visited = {};
  var whereEl = $('.where'), nextLabel = $('.next-label');
  function chapterName(i) { var n = navOf(i); return n < 0 ? t('v2.poem') : t(NAV[n].key); }
  function updateHud(i) {
    var ni = navOf(i);
    if (ni >= 0) visited[ni] = true;
    navBtns.forEach(function (b, k) {
      b.classList.toggle('is-current', k === ni);
      b.classList.toggle('is-visited', k !== ni && !!visited[k]);
      if (k === ni) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    whereEl.textContent = chapterName(i);
    var last = STOPS.length - 1;
    if (i === 0) nextLabel.innerHTML = '<span></span>';
    if (i === 0) $('span', nextLabel).textContent = t('v2.enter');
    else if (i >= last) nextLabel.textContent = t('v2.restart');
    else {
      var same = navOf(i + 1) === ni;
      nextLabel.innerHTML = '<span></span> <span class="n-dest"></span>';
      var sp = $$('span', nextLabel);
      sp[0].textContent = t('ui.next');
      var nwk = S.works[i + 1 - 5];
      sp[1].textContent = same && nwk ? (nwk.title[Site.lang()] || nwk.title.pt).toLowerCase() : chapterName(i + 1).toLowerCase();
    }
    hintEl.classList.toggle('is-on', i === 0 && !hinted && introDoneFlag);
  }
  $('[data-next]').addEventListener('click', function () { if (map.index() >= STOPS.length - 1) map.go(0); else map.next(); });
  $('[data-home]').addEventListener('click', function () { map.go(0); });
  var mapBtn = $('[data-map-toggle]');
  mapBtn.addEventListener('click', function () { map.overview(!map.isOverview()); });

  var hintEl = $('[data-hint]'), hinted = false, introDoneFlag = false;
  function renderHint() { hintEl.textContent = t(Site.isTouch() ? 'v2.hint.touch' : 'v2.hint.pointer'); }
  ['wheel', 'pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (introDoneFlag && !hinted) { hinted = true; hintEl.classList.remove('is-on'); } }, { passive: true });
  });

  /* ---------- Mapa ---------- */

  var map = SCMap.create({
    viewport: $('#viewport'),
    world: $('#world'),
    layout: layout,
    travel: travel,
    ease: M.ease.inOut,
    duration: function (d, W, H, a, b) {
      var zr = Math.abs(Math.log((a.z || 1) / (b.z || 1)));
      return clamp(850 + zr * 160 + (d / Math.max(W, H)) * 140, 900, 2000);
    },
    overviewPad: 0.9,
    reduced: function () { return !Site.motion(); },
    onStop: function (i) { updateHud(i); },
    onOverview: function (on) {
      mapBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('[data-map-label]').textContent = t(on ? 'ui.mapClose' : 'ui.map');
    },
    onFrame: onFrame
  });
  window.scMap = map;

  var clock = 0;
  function nearStop(i, cam) {
    var st = map.stops()[i]; if (!st) return false;
    var sz = map.size();
    return Math.abs(cam.x - st.x) < sz.W / 2 / cam.z + sz.W / 2 && Math.abs(cam.y - st.y) < sz.H / 2 / cam.z + sz.H / 2 && cam.z > 0.3;
  }
  function onFrame(cam, api, dt, now) {
    if (motionOn()) clock += dt / 1000;
    drawPoem(cam, now, clock);
    if (!motionOn()) return;
    if (nearStop(2, cam) && clock - compAt > 3) setComp((comp + 1) % COMPS.length, clock);
    if (nearStop(3, cam) && clock - kinAt > 2.3) { kinAt = clock; kinState = 1 - kinState; applyKinetic(); }
    if (nearStop(4, cam)) { stepBicho(dt); drawBicho(clock); }
  }

  function refit() {
    layoutKinetic();
    sizeBicho();
    drawBicho(clock);
    measureCap();
  }

  function relabel() {
    renderWorks(); renderSocials(); renderRoles(); renderNav(); renderHint();
    buildKinetic();
    var i = map.index();
    map.measure();
    map.go(i, { dur: 500 });
    $('[data-map-label]').textContent = t(map.isOverview() ? 'ui.mapClose' : 'ui.map');
  }
  Site.on('lang', relabel);
  Site.on('motion', function (on) { if (!on) { kinState = 0; applyKinetic(); setComp(0, clock); drawBicho(clock); } });

  /* ---------- Início ---------- */

  if (Site.isTouch()) $('.panel--play .caption').setAttribute('data-t', 'v2.play.caption.touch');
  Site.init();
  renderWorks(); renderSocials(); renderRoles(); renderNav(); renderHint();
  buildKinetic();
  setComp(0, 0);

  var startIndex = Math.max(0, map.hashIndex());
  var fontsReady = (doc.fonts && doc.fonts.load)
    ? Promise.race([Promise.all([doc.fonts.load('600 100px Jost'), doc.fonts.load('520 100px Jost'), doc.fonts.ready]), new Promise(function (r) { setTimeout(r, 1800); })])
    : Promise.resolve();
  // abertura: a câmera começa fechada no cruzamento SAVIO × CAVALCANTE e só depois abre o poema
  function crossCam() {
    map.measure();
    var s = geo.s, sz = map.size(), z;
    if (!geo.portrait) {
      z = Math.min(0.86 * sz.W / (10 * s), (sz.H - 170) / (5 * s));
      return { x: 3.5 * s, y: 2 * s, z: z, r: 0 };
    }
    z = Math.min(0.86 * sz.W / (5 * s), (sz.H - 170) / (10 * s));
    return { x: 2 * s, y: 3.5 * s, z: z, r: 0 };
  }

  fontsReady.then(function () {
    measureCap();
    var intro = startIndex === 0 && motionOn();
    if (intro) {
      introOn = true; introT0 = performance.now();
      map.start(0, { from: crossCam(), delay: 1350, dur: 1800, ease: M.ease.inOut });
    } else {
      map.start(startIndex);
    }
    refit();
    setTimeout(function () {
      introOn = false;
      introDoneFlag = true;
      root.classList.add('is-ready');
      updateHud(map.index());
    }, intro ? 3200 : 50);
  });
})();
