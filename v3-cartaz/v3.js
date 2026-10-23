/* Versão 3 · Cartaz */
(function () {
  'use strict';

  var S = window.SITE, Site = window.Site, M = window.SCMap;
  var clamp = M.clamp, lerp = M.lerp;
  var doc = document, root = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var t = Site.t;
  var motionOn = function () { return Site.motion(); };

  Site.addStrings({
    'v3.skip': 'Pular',
    'v3.design.caption': 'A mesma palavra, seis larguras de tipo. Passe o cursor nas letras.',
    'v3.design.caption.touch': 'A mesma palavra, seis larguras de tipo. Toque nas letras.',
    'v3.beat.1': 'peso', 'v3.beat.2': 'impacto', 'v3.beat.3': 'assentamento',
    'v3.play.caption': 'Pegue as letras e jogue. Funciona com o dedo também.',
    'v3.play.reset': 'Derrubar de novo',
    'v3.play.sr': 'Blocos de tipo de madeira com as letras do nome, que caem, empilham e podem ser arremessados.',
    'v3.works.shout': 'Trabalhos recentes',
    'v3.restart': 'De novo',
    'v3.of': 'de',
    'v3.door.0': 'Savio', 'v3.door.1': 'Design', 'v3.door.2': 'Movimento', 'v3.door.3': 'Interação', 'v3.door.4': 'Trabalhos', 'v3.door.5': 'Contato'
  }, {
    'v3.skip': 'Skip',
    'v3.design.caption': 'One word, six widths of type. Hover the letters.',
    'v3.design.caption.touch': 'One word, six widths of type. Tap the letters.',
    'v3.beat.1': 'weight', 'v3.beat.2': 'impact', 'v3.beat.3': 'settle',
    'v3.play.caption': 'Grab the letters and throw them. Works with a finger too.',
    'v3.play.reset': 'Drop them again',
    'v3.play.sr': 'Wood type blocks with the letters of the name that fall, stack and can be thrown.',
    'v3.works.shout': 'Recent work',
    'v3.restart': 'Again',
    'v3.of': 'of',
    'v3.door.0': 'Savio', 'v3.door.1': 'Design', 'v3.door.2': 'Motion', 'v3.door.3': 'Interaction', 'v3.door.4': 'Work', 'v3.door.5': 'Contact'
  });

  var css = getComputedStyle(root);
  var C = {
    wall: css.getPropertyValue('--wall').trim(), paper: css.getPropertyValue('--paper').trim(),
    ink: css.getPropertyValue('--ink').trim(), red: css.getPropertyValue('--red').trim()
  };

  /* ---------- Textura de papel ---------- */
  (function noise() {
    var c = doc.createElement('canvas'); c.width = c.height = 220;
    var g = c.getContext('2d'); if (!g) return;
    var img = g.createImageData(220, 220);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 200 + Math.random() * 55;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    root.style.setProperty('--noise', 'url(' + c.toDataURL('image/png') + ')');
  })();

  /* ---------- Medidor de texto ---------- */
  var meter = doc.createElement('span');
  meter.setAttribute('aria-hidden', 'true');
  meter.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:100px;line-height:1;text-transform:uppercase;font-family:Anybody,sans-serif;';
  doc.body.appendChild(meter);
  function textW(txt, stretch, weight) {
    meter.style.fontStretch = stretch + '%';
    meter.style.fontWeight = weight || 900;
    meter.textContent = txt;
    return meter.getBoundingClientRect().width || 1;
  }

  /* ---------- Conteúdo gerado ---------- */

  var nW = S.works.length;
  var worksHost = $('[data-works]');
  var workRefs = [];
  S.works.forEach(function (w, i) {
    var el = doc.createElement('div');
    el.className = 'stop';
    el.setAttribute('data-key', 'work');
    el.setAttribute('data-hash', i === 0 ? 'trabalhos' : 'trabalho-' + (i + 1));
    el.setAttribute('role', 'group');
    el.innerHTML = '<div class="poster poster--ink poster--work' + (i === 0 ? ' is-first' : '') + '">' +
      (i === 0 ? '<p class="work-shout" aria-hidden="true" data-t="v3.works.shout"></p>' : '') +
      '<div class="work-slot"></div><p class="work-meta"><strong></strong><span></span></p></div>';
    var slot = $('.work-slot', el);
    var media = Site.workMedia(w, i);
    var num = doc.createElement('span'); num.className = 'ph-n'; num.setAttribute('aria-hidden', 'true'); num.textContent = (i < 9 ? '0' : '') + (i + 1);
    $('.work-ph', media).insertBefore(num, $('.work-ph', media).firstChild);
    slot.parentNode.replaceChild(media, slot);
    worksHost.appendChild(el);
    workRefs.push({ el: el, title: $('.work-meta strong', el), count: $('.work-meta span', el), w: w, i: i });
  });
  function renderWorks() {
    var l = Site.lang();
    workRefs.forEach(function (r) {
      var title = r.w.title[l] || r.w.title.pt;
      r.title.textContent = title;
      r.count.textContent = (r.i + 1) + ' ' + t('v3.of') + ' ' + nW;
      r.el.setAttribute('aria-label', t('ch.works') + ': ' + title);
    });
    var first = workRefs[0] && $('.poster--work', workRefs[0].el);
    var shout = first && $('.work-shout', first);
    if (shout) first.style.setProperty('--shout-h', shout.offsetHeight + 'px');
  }

  var socialsHost = $('[data-socials]');
  function renderSocials() {
    socialsHost.innerHTML = '';
    S.socials.forEach(function (s) {
      var li = doc.createElement('li');
      if (s.url) {
        var a = doc.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = s.label;
        if (s.handle) a.setAttribute('aria-label', s.label + ' ' + s.handle);
        li.appendChild(a);
      } else {
        li.innerHTML = '<span class="s-draft"></span><span class="s-note"></span>';
        $('.s-draft', li).textContent = s.label;
        $('.s-note', li).textContent = t('social.draft');
      }
      socialsHost.appendChild(li);
    });
  }
  $('[data-photo]').appendChild(Site.img(S.photo, S.name));
  Site.mark($('.mark'));

  var bandRun = $('.band-run');
  function renderRoles() {
    var roles = S.roles[Site.lang()];
    $('[data-roles-text]').textContent = roles.join(', ');
    $('[data-roles-line]').textContent = roles.join(' · ');
    bandRun.innerHTML = '';
    for (var k = 0; k < 3; k++) {
      var sp = doc.createElement('span');
      sp.textContent = roles.join(' · ') + ' · ';
      bandRun.appendChild(sp);
    }
  }

  /* ---------- Design: a caixa de tipos ---------- */

  var caseEl = $('[data-case]');
  var CASES = [
    [[56, 900], [130, 900], [70, 800], [112, 900], [58, 900], [96, 800]],
    [[110, 900], [70, 800], [140, 900], [56, 900], [96, 900], [72, 900]],
    [[76, 900], [76, 900], [76, 900], [76, 900], [76, 900], [76, 900]],
    [[130, 800], [66, 900], [96, 900], [62, 800], [124, 900], [58, 900]],
    [[62, 900], [104, 800], [62, 900], [104, 800], [62, 900], [104, 800]]
  ];
  var TAP_W = [56, 82, 118, 146];
  var caseIdx = 2, caseAt = -10, caseSpans = [];
  function buildCase() {
    var word = t('ch.design').toUpperCase();
    caseEl.innerHTML = '';
    caseSpans = word.split('').map(function (ch) {
      var s = doc.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); caseEl.appendChild(s);
      s.addEventListener('click', function () {
        var cur = parseFloat(s.style.fontStretch) || 76, nx = TAP_W[0];
        for (var q = 0; q < TAP_W.length; q++) if (TAP_W[q] > cur + 1) { nx = TAP_W[q]; break; }
        s.style.fontStretch = nx + '%'; caseAt = clock + 6;
      });
      return s;
    });
    applyCase(caseIdx);
  }
  function applyCase(i) {
    caseIdx = i;
    caseSpans.forEach(function (s, k) {
      var c = CASES[i][k % CASES[i].length];
      s.style.fontStretch = c[0] + '%';
      s.style.fontWeight = c[1];
    });
  }

  /* ---------- Movimento: o golpe ---------- */

  var slamEl = $('[data-slam]');
  var slamSplit = false;
  function buildSlam() {
    var word = t('ch.motion').toUpperCase();
    var mp = $('.poster--motion');
    slamSplit = !!mp.clientWidth && mp.clientWidth / mp.clientHeight < 0.85 && word.length > 6;
    var cut = Math.ceil(word.length / 2) - (word.length % 2 ? 1 : 0);
    slamEl.innerHTML = '';
    word.split('').forEach(function (ch, i) {
      if (slamSplit && i === cut) { var br = doc.createElement('i'); br.className = 'br'; slamEl.appendChild(br); }
      var s = doc.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true');
      s.style.animationDelay = (i * 70) + 'ms';
      slamEl.appendChild(s);
    });
  }

  /* ---------- Encaixes ---------- */

  var introPoster = $('.poster--intro');
  var nm = $$('.nm', introPoster);
  function fitAll() {
    var pw = introPoster.clientWidth, ph = introPoster.clientHeight;
    if (!pw) return;
    var vertical = pw / ph < 0.85;
    introPoster.classList.toggle('is-vertical', vertical);
    var span = vertical ? ph : pw, cross = vertical ? pw : ph;
    var w1 = textW(S.first, 52), w2 = textW(S.last, 78);
    var s1 = 100 * span * 0.96 / w1, s2 = 100 * span * 1.02 / w2;
    var k = Math.min(1, (cross * (vertical ? 0.8 : 0.78)) / ((s1 + s2) * 0.76));
    nm[0].style.fontSize = (s1 * k).toFixed(1) + 'px';
    nm[1].style.fontSize = (s2 * k).toFixed(1) + 'px';

    var dp = $('.poster--design');
    var dw = textW(t('ch.design'), 86);
    var dVert = dp.clientWidth / dp.clientHeight < 0.85;
    if (dVert) {
      caseEl.style.removeProperty('--ang');
      caseEl.style.fontSize = Math.min(100 * dp.clientHeight * 0.8 / dw, dp.clientWidth * 0.5).toFixed(1) + 'px';
    } else {
      var ang = Math.atan2(dp.clientHeight, dp.clientWidth) * 0.62;
      var diag = Math.hypot(dp.clientWidth, dp.clientHeight);
      caseEl.style.setProperty('--ang', (-ang * 180 / Math.PI).toFixed(2) + 'deg');
      caseEl.style.fontSize = Math.min(100 * diag * 0.74 / dw, dp.clientHeight * 0.56).toFixed(1) + 'px';
    }

    var ws = $('.work-shout');
    if (ws) { var wsw = textW(ws.textContent, 55); ws.style.fontSize = Math.min(100 * ws.parentNode.clientWidth * 0.92 / wsw, ws.parentNode.clientHeight * 0.12).toFixed(1) + 'px'; }

    var mp = $('.poster--motion');
    var mVert = mp.clientWidth / mp.clientHeight < 0.85;
    var word = t('ch.motion');
    if ((mVert && word.length > 6) !== slamSplit) buildSlam();
    var longest = slamSplit ? word.slice(0, Math.ceil(word.length / 2)) : word;
    var mw = textW(longest, 58);
    slamEl.style.fontSize = Math.min(100 * mp.clientWidth * 0.9 / mw, mp.clientHeight * (slamSplit ? 0.26 : 0.42)).toFixed(1) + 'px';

    $$('.socials a, .socials .s-draft').forEach(function (a) {
      var host = socialsHost.clientWidth;
      if (!host) return;
      var w = textW(a.textContent, 55);
      var ph = socialsHost.parentNode.clientHeight, vert = socialsHost.parentNode.clientWidth / ph < 0.85;
      var avail = ph * (vert ? 0.5 : 0.78) - S.socials.length * 30;
      a.style.fontSize = Math.max(28, Math.min(100 * host * 0.98 / w, avail / (S.socials.length * 0.86))).toFixed(1) + 'px';
    });
    renderWorks();
  }

  /* ---------- O muro ---------- */

  var stopEls = $$('.stop');
  var STOPS = [];
  stopEls.forEach(function (el, k) {
    if (k === 0) { STOPS.push({ el: el, p: 0 }); STOPS.push({ el: el, p: 0 }); }
    else STOPS.push({ el: el, p: k });
  });
  stopEls.forEach(function (el) { for (var i = 0; i < STOPS.length; i++) if (STOPS[i].el === el) { el.setAttribute('data-stop', i); break; } });

  var SLOTS = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]];
  var JIT = [[0, 0], [0.02, -0.03], [-0.015, 0.025], [0.025, 0.012], [-0.02, -0.02], [0.015, 0.03], [-0.025, 0.01], [0.02, -0.02], [0.006, 0.026], [0.015, 0], [-0.015, 0.015], [0, -0.015]];
  var ROWX = [0, 0.16, -0.1, 0.06];
  var ROT = [-2.2, 1.6, -1.1, 2.6, -3, 1.3, -1.8, 2.1, -1.4, 2.8, -2.4, 1.2];
  var wall = $('.wall'), shoutsEl = $('.shouts');
  var posterPos = [];

  function layout(W, H) {
    var px = W * 0.985, py = H * 0.93;
    posterPos = stopEls.map(function (el, k) {
      var sl = SLOTS[k], j = JIT[k];
      var x = Math.round(sl[0] * px + (ROWX[sl[1]] + j[0]) * W), y = Math.round(sl[1] * py + j[1] * H);
      el.style.setProperty('--rot', ROT[k] + 'deg');
      el.style.left = Math.round(x - W / 2) + 'px';
      el.style.top = Math.round(y - H / 2) + 'px';
      el.style.width = W + 'px';
      el.style.height = H + 'px';
      return { x: x, y: y };
    });
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    posterPos.forEach(function (p) { minX = Math.min(minX, p.x - W / 2); maxX = Math.max(maxX, p.x + W / 2); minY = Math.min(minY, p.y - H / 2); maxY = Math.max(maxY, p.y + H / 2); });
    var mX = W * 0.7, mY = H * 0.72;
    var b = { x: minX - mX, y: minY - mY, w: maxX - minX + 2 * mX, h: maxY - minY + 2 * mY };
    wall.style.left = b.x + 'px'; wall.style.top = b.y + 'px'; wall.style.width = b.w + 'px'; wall.style.height = b.h + 'px';
    buildShouts(W, H);
    var stops = STOPS.map(function (s) { var p = posterPos[s.p]; return { x: p.x, y: p.y, el: s.el, hash: s.el.getAttribute('data-hash') }; });
    requestAnimationFrame(fitAll);
    return { stops: stops, bounds: b };
  }

  // as palavras pintadas no muro, cada uma ao lado do seu cartaz; no mapa elas são portas
  function buildShouts(W, H) {
    shoutsEl.innerHTML = '';
    var P = posterPos, last = stopEls.length - 1, wk = 4 + Math.min(nW, 2);
    var g = Math.min(W, H) * 0.05, maxT = W * 0.6;      // espessura máxima de um grito vertical
    var list = [
      { txt: S.name, stop: 0, edge: 'left', p: P[0], len: H * 1.6, st: 55, r: -90 },
      { txt: t('ch.design'), stop: 2, edge: 'top', p: P[1], len: W * 0.62, st: 60, r: -3 },
      { txt: t('ch.motion'), stop: 3, edge: 'top', p: P[2], len: W * 0.7, st: 62, r: 2 },
      { txt: t('ch.play'), stop: 4, edge: 'right', p: P[3], len: H * 0.95, st: 55, r: 90 },
      { txt: t('ch.works'), stop: 5, edge: 'bottom', p: P[Math.min(wk, last - 1)], x0: P[6].x - W * 0.4, len: W * 1.3, st: 58, r: 2 },
      { txt: t('v3.door.5'), stop: STOPS.length - 1, edge: 'right', p: P[last], len: H * 0.8, st: 55, r: 90 }
    ];
    list.forEach(function (s) {
      var e = doc.createElement('span');
      e.className = 'shout-w';
      e.textContent = s.txt;
      e.setAttribute('data-stop', s.stop);
      var fs = 100 * s.len / textW(s.txt, s.st);
      if (s.edge === 'left' || s.edge === 'right') fs = Math.min(fs, maxT / 0.8);
      var th = fs * 0.8, x, y;
      if (s.edge === 'left') { x = s.p.x - W / 2 - g - th; y = s.p.y + H * 0.45; }
      else if (s.edge === 'right') { x = s.p.x + W / 2 + g + th; y = s.p.y - H * 0.45; }
      else if (s.edge === 'top') { x = s.p.x - W * 0.45; y = s.p.y - H / 2 - g - th; }
      else { x = s.x0; y = s.p.y + H / 2 + g; }
      e.style.fontSize = fs.toFixed(0) + 'px';
      e.style.fontStretch = s.st + '%';
      e.style.left = x + 'px';
      e.style.top = y + 'px';
      e.style.transform = 'rotate(' + s.r + 'deg)';
      shoutsEl.appendChild(e);
    });
  }

  var reducedNow = false;
  function travel(a, b, e, ctx) {
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var span = Math.max(ctx.W, ctx.H);
    var dip = clamp(d / (span * 2.6), 0, 0.62);
    var z = lerp(a.z, b.z, e) * (1 - dip * Math.sin(Math.PI * e));
    var dir = clamp((b.x - a.x) / span, -1.5, 1.5);
    var r = lerp(a.r, b.r, e) + (reducedNow ? 0 : -0.05 * dir * Math.sin(Math.PI * e));
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: z, r: r };
  }

  /* ---------- Interação: física ---------- */

  var phys = { host: $('.physics'), cv: $('.physics-canvas'), ctx: null, engine: null, blocks: [], drag: null, w: 1, h: 1, dpr: 1, touchedAt: -10, ok: !!window.Matter };
  phys.ctx = phys.cv.getContext('2d');
  var STRETCH = [['ultra-condensed', 50], ['extra-condensed', 62.5], ['condensed', 75], ['semi-condensed', 87.5]];

  function physSize() {
    var w = phys.host.clientWidth, h = phys.host.clientHeight;
    if (!w || !h) return false;
    phys.dpr = Math.min(2, window.devicePixelRatio || 1);
    phys.w = w; phys.h = h;
    phys.cv.width = Math.round(w * phys.dpr); phys.cv.height = Math.round(h * phys.dpr);
    return true;
  }

  function physBuild(drop) {
    if (!phys.ok || !physSize()) return;
    var Mt = window.Matter;
    if (!phys.engine) {
      phys.engine = Mt.Engine.create({ enableSleeping: true });
      phys.engine.gravity.y = 1;
      phys.engine.gravity.scale = 0.0012;
    }
    Mt.Composite.clear(phys.engine.world, false);
    var w = phys.w, h = phys.h, T = 200;
    var walls = [
      Mt.Bodies.rectangle(w / 2, h + T / 2, w * 3, T, { isStatic: true }),
      Mt.Bodies.rectangle(-T / 2, h / 2 - h, T, h * 4, { isStatic: true }),
      Mt.Bodies.rectangle(w + T / 2, h / 2 - h, T, h * 4, { isStatic: true })
    ];
    Mt.Composite.add(phys.engine.world, walls);
    var letters = (S.first + S.last).toUpperCase().split('');
    var bh = clamp(Math.min(w, h * 1.4) * 0.15, 40, 124);
    var ctx = phys.ctx;
    phys.blocks = letters.map(function (ch, i) {
      var st = STRETCH[(i * 7 + 3) % STRETCH.length];
      ctx.font = st[0] + ' 900 ' + (bh * 0.92).toFixed(1) + 'px Anybody';
      var tw = ctx.measureText(ch).width;
      var bw = Math.max(bh * 0.46, tw + bh * 0.2);
      var x = clamp(bw + ((i * 0.618) % 1) * (w - 2 * bw), bw, w - bw);
      var y = drop ? -bh * (1 + i * 0.55) - (i % 3) * bh : h - bh * (0.6 + Math.floor(i / 6));
      var body = Mt.Bodies.rectangle(x, y, bw, bh, { restitution: 0.12, friction: 0.7, frictionAir: 0.012, density: 0.0016, chamfer: { radius: 2 } });
      Mt.Body.setAngle(body, ((i % 5) - 2) * 0.06);
      var palette = i === 2 || i === 9 ? 'red' : (i % 4 === 1 ? 'wall' : 'paper');
      body.sc = { ch: ch, st: st[0], bw: bw, bh: bh, fill: C[palette], fg: palette === 'red' ? '#fff' : C.ink };
      return body;
    });
    Mt.Composite.add(phys.engine.world, phys.blocks);
    if (!motionOn() && !drop) for (var k = 0; k < 240; k++) Mt.Engine.update(phys.engine, 16);
    phys.started = true;
  }

  function physDraw() {
    var ctx = phys.ctx, dpr = phys.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, phys.w, phys.h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    phys.blocks.forEach(function (b) {
      var s = b.sc;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = s.fill;
      ctx.fillRect(-s.bw / 2, -s.bh / 2, s.bw, s.bh);
      ctx.fillStyle = s.fg;
      ctx.font = s.st + ' 900 ' + (s.bh * 0.92).toFixed(1) + 'px Anybody';
      ctx.fillText(s.ch, 0, s.bh * 0.04);
      ctx.restore();
    });
  }

  function physPoint(e) {
    var r = phys.cv.getBoundingClientRect();
    var k = r.width / phys.w || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  }
  phys.host.addEventListener('pointerdown', function (e) {
    if (!phys.engine) return;
    var Mt = window.Matter, p = physPoint(e);
    var hit = Mt.Query.point(phys.blocks, p)[0];
    if (!hit) return;
    Mt.Sleeping.set(hit, false);
    var c = Mt.Constraint.create({ pointA: p, bodyB: hit, pointB: { x: p.x - hit.position.x, y: p.y - hit.position.y }, stiffness: 0.16, damping: 0.08, length: 0 });
    Mt.Composite.add(phys.engine.world, c);
    phys.drag = { c: c, id: e.pointerId };
    phys.touchedAt = clock;
    try { phys.host.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  phys.host.addEventListener('pointermove', function (e) {
    if (!phys.drag || phys.drag.id !== e.pointerId) return;
    phys.drag.c.pointA = physPoint(e);
    phys.touchedAt = clock;
  });
  function physUp() {
    if (!phys.drag) return;
    window.Matter.Composite.remove(phys.engine.world, phys.drag.c);
    phys.drag = null;
    phys.touchedAt = clock;
  }
  phys.host.addEventListener('pointerup', physUp);
  phys.host.addEventListener('pointercancel', physUp);
  $('[data-reset]').addEventListener('click', function () { physBuild(true); phys.touchedAt = clock; });

  /* ---------- HUD ---------- */

  var doorsHost = $('[data-doors]');
  var DOORS = [0, 2, 3, 4, 5, 5 + nW];
  function doorOf(i) {
    if (i <= 1) return 0;
    if (i >= 5 && i < 5 + nW) return 4;
    return DOORS.indexOf(i);
  }
  var doorBtns = [];
  function renderDoors() {
    doorsHost.innerHTML = '';
    doorBtns = DOORS.map(function (stop, k) {
      var li = doc.createElement('li');
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'tag';
      b.textContent = t('v3.door.' + k);
      b.style.setProperty('--tilt', ((k * 37) % 5 - 2) * 0.6 + 'deg');
      b.addEventListener('click', function () { map.go(stop); });
      li.appendChild(b); doorsHost.appendChild(li);
      return b;
    });
    updateHud(map ? map.index() : 0);
  }
  var visited = {};
  var nextLabel = $('.next-label');
  function updateHud(i) {
    var di = doorOf(i);
    visited[di] = true;
    doorBtns.forEach(function (b, k) {
      b.classList.toggle('is-current', k === di);
      b.classList.toggle('is-visited', k !== di && !!visited[k]);
      if (k === di) { b.setAttribute('aria-current', 'step'); if (b.scrollIntoView && doorsHost.scrollWidth > doorsHost.clientWidth) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
      else b.removeAttribute('aria-current');
    });
    var last = STOPS.length - 1;
    if (i >= last) nextLabel.textContent = t('v3.restart');
    else {
      var nd = doorOf(i + 1);
      nextLabel.textContent = t('ui.next') + (nd === di ? '' : ': ' + t('v3.door.' + nd));
    }
  }
  $('[data-next]').addEventListener('click', function () { if (map.index() >= STOPS.length - 1) map.go(0); else map.next(); });
  $('[data-home]').addEventListener('click', function () { map.go(0); });
  var mapBtn = $('[data-map-toggle]');
  mapBtn.addEventListener('click', function () { map.overview(!map.isOverview()); });

  /* ---------- Mapa ---------- */

  var map = SCMap.create({
    viewport: $('#viewport'),
    world: $('#world'),
    layout: layout,
    travel: travel,
    ease: M.ease.expoInOut,
    duration: function (d, W, H) { return clamp(950 + (d / Math.max(W, H)) * 200, 1000, 1700); },
    overviewPad: 0.84,
    reduced: function () { return !Site.motion(); },
    onStop: function (i) { updateHud(i); },
    onOverview: function (on) {
      mapBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('[data-map-label]').textContent = t(on ? 'ui.mapClose' : 'ui.map');
    },
    onFrame: onFrame
  });
  window.scMap = map;

  var clock = 0, sCur = 0, bandX = 0;
  function near(k, cam) {
    var p = posterPos[k]; if (!p) return false;
    var sz = map.size();
    return Math.abs(cam.x - p.x) < sz.W / 2 / cam.z + sz.W / 2 && Math.abs(cam.y - p.y) < sz.H / 2 / cam.z + sz.H / 2;
  }
  function onFrame(cam, api, dt) {
    reducedNow = !motionOn();
    if (motionOn()) clock += dt / 1000;
    var p = api.progress();
    var sT;
    if (!api.flying() && !api.isOverview()) { sT = clamp(p, 0, 1); sCur = sT; }
    else { sT = api.target() === 0 ? 0 : 1; sCur += (sT - sCur) * (1 - Math.exp(-dt / 200)); }
    introPoster.style.setProperty('--s', sCur.toFixed(4));

    if (motionOn() && near(0, cam) && sCur > 0.01) {
      var one = bandRun.firstChild ? bandRun.firstChild.offsetWidth : 0;
      bandX -= dt * 0.05;
      if (one && -bandX > one) bandX += one;
      bandRun.style.transform = 'translateX(' + bandX.toFixed(1) + 'px)';
    }
    if (motionOn() && near(1, cam) && clock - caseAt > 2.6) { caseAt = clock; applyCase((caseIdx + 1) % CASES.length); }
    if (motionOn() && near(2, cam)) syncBeats();

    if (phys.ok && near(3, cam)) {
      if (!phys.started) physBuild(motionOn());
      if (phys.engine && (motionOn() || phys.drag || clock - phys.touchedAt < 4 || !motionOn() && performance.now() - lastUserAt < 4000)) {
        window.Matter.Engine.update(phys.engine, Math.min(dt, 32));
      }
      physDraw();
    }
  }
  var beats = $$('.beats li'), beatOn = -2;
  function syncBeats() {
    var first = slamEl.querySelector('span');
    var an = first && first.getAnimations && first.getAnimations()[0];
    if (!an || an.currentTime == null) return;
    var p = (an.currentTime % 5000) / 5000;
    var b = p < 0.09 ? 0 : p < 0.13 ? 1 : p < 0.85 ? 2 : -1;
    if (b !== beatOn) { beatOn = b; beats.forEach(function (li, k) { li.classList.toggle('is-on', k === b); }); }
  }
  var lastUserAt = 0;
  phys.host.addEventListener('pointerdown', function () { lastUserAt = performance.now(); });
  phys.host.addEventListener('pointermove', function () { if (phys.drag) lastUserAt = performance.now(); });

  /* ---------- Idioma e movimento ---------- */

  function relabel() {
    renderWorks(); renderSocials(); renderRoles(); renderDoors();
    buildCase(); buildSlam();
    var i = map.index();
    map.measure();
    map.go(i, { dur: 400 });
    $('[data-map-label]').textContent = t(map.isOverview() ? 'ui.mapClose' : 'ui.map');
  }
  Site.on('lang', relabel);
  Site.on('motion', function () { /* as animações CSS obedecem a .motion-off */ });

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (phys.started) physBuild(false); }, 200);
  });

  /* ---------- Abertura: três cortes ---------- */

  function runIntro(startIndex, done) {
    var intro = $('#intro');
    if (!motionOn() || startIndex > 0) { intro.classList.add('is-done'); done(); return; }
    var cuts = $$('.cut', intro), finished = false, timers = [];
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      intro.classList.add('is-done');
      setTimeout(function () { intro.hidden = true; }, 320);
      ['keydown', 'wheel', 'pointerdown'].forEach(function (ev) { window.removeEventListener(ev, skip, true); });
      done();
    }
    function skip(e) { if (e && e.type === 'keydown' && e.key === 'Tab') return; finish(); }
    ['keydown', 'wheel', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, skip, true); });
    $('.intro-skip', intro).addEventListener('click', finish);
    var BEAT = 330;
    cuts.forEach(function (c, k) {
      timers.push(setTimeout(function () { cuts.forEach(function (o) { o.classList.remove('is-on'); }); c.classList.add('is-on'); }, 120 + k * BEAT));
    });
    timers.push(setTimeout(finish, 120 + cuts.length * BEAT));
  }

  /* ---------- Início ---------- */

  if (Site.isTouch()) $$('[data-touch-t]').forEach(function (n) { n.setAttribute('data-t', n.getAttribute('data-touch-t')); });
  Site.init();
  renderWorks(); renderSocials(); renderRoles(); renderDoors();
  buildCase(); buildSlam();

  var startIndex = Math.max(0, map.hashIndex());
  var fontsReady = (doc.fonts && doc.fonts.load)
    ? Promise.race([Promise.all([doc.fonts.load('900 100px Anybody'), doc.fonts.load('ultra-condensed 900 100px Anybody'), doc.fonts.ready]), new Promise(function (r) { setTimeout(r, 1800); })])
    : Promise.resolve();

  fontsReady.then(function () {
    runIntro(startIndex, function () {
      root.classList.add('is-ready');
      map.start(startIndex);
      fitAll();
      requestAnimationFrame(function () { introPoster.classList.add('slam-in'); });
    });
  });
})();
