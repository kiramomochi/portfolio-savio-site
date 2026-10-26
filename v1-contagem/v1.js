/* Versão 1 · Contagem: a rolagem
   A página rola como qualquer página. Cada capítulo é uma cena presa na tela
   (position: sticky) enquanto a rolagem a conta, e a seguinte sobe por cima
   dela. A cada quadro o script lê a rolagem, diz a cada cena quanto dela já
   passou e faz a de baixo recuar e escurecer enquanto é coberta. Nada segura a
   rolagem: roda, trackpad, toque, teclado e leitor de tela fazem o que sempre
   fazem numa página. */
(function () {
  'use strict';

  var S = window.SITE, Site = window.Site;
  var doc = document, root = doc.documentElement;
  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var inOut = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

  Site.addStrings({
    'hint.pointer': 'Role para continuar',
    'hint.touch': 'Deslize para continuar',
    'a.reels': 'Trabalhos recentes: os vídeos'
  }, {
    'hint.pointer': 'Scroll to continue',
    'hint.touch': 'Swipe to continue',
    'a.reels': 'Recent work: the videos'
  });

  var t = Site.t;
  var motionOn = function () { return Site.motion(); };
  var nW = S.works.length;

  var scenes = $$('.scene').map(function (el) {
    return { el: el, key: el.getAttribute('data-scene'), stage: $('.stage', el), top: 0, h: 0, last: '' };
  });
  var byKey = {};
  scenes.forEach(function (s) { byKey[s.key] = s; });

  var C = window.V1Cenas.create({
    overview: function () { return false; },
    goWork: goWork,
    goChapter: function (i) { goChapter(i); },
    opaque: true
  });

  /* ---------- Medidas ----------
     VH é a altura de uma cena (100lvh); cada cena tem as suas fatias de rolagem:
     chega (fin, a tela em que ela sobe), conta (p, enquanto está presa) e é
     coberta (fout, a tela em que a seguinte sobe por cima dela). */

  var VH = 1, step = 1;
  var strip = $('.strip'), reelEls = C.reels;
  function measure() {
    VH = scenes[0].stage.offsetHeight || window.innerHeight;
    scenes.forEach(function (s) { s.top = s.el.offsetTop; s.h = s.el.offsetHeight; s.last = ''; });
    step = reelEls.length > 1 ? reelEls[1].offsetLeft - reelEls[0].offsetLeft : 1;
  }
  function own(s) { return Math.max(1, s.h - 2 * VH); }
  function spans(s, i, y) {
    return {
      p: clamp((y - s.top) / own(s), 0, 1),
      fin: i ? clamp((y - (s.top - VH)) / VH, 0, 1) : 1,
      fout: i < scenes.length - 1 ? clamp((y - (s.top + s.h - 2 * VH)) / VH, 0, 1) : 0
    };
  }

  /* a cena coberta recua para dentro da janela do projetor: encolhe, ganha os
     cantos do quadro e escurece; a que chega traz os cantos de cima e os perde
     ao encostar no alto da tela */
  var RAD = 28;
  function depth(s, fin, fout) {
    var live = motionOn();
    var k = live ? 1 - 0.07 * fout : 1;
    var rad = !live ? 0 : fout > 0 ? RAD * Math.min(1, fout / 0.3) : fin < 1 ? RAD * Math.min(1, (1 - fin) / 0.3) : 0;
    var topOnly = fout <= 0;
    var dim = live ? 0.72 * fout : 0;
    var arriving = fin > 0 && fin < 1;
    var key = k.toFixed(4) + '|' + rad.toFixed(1) + '|' + topOnly + '|' + dim.toFixed(3) + '|' + arriving;
    if (key === s.last) return;
    s.last = key;
    var st = s.stage.style, r = rad.toFixed(1) + 'px';
    st.transform = k < 1 ? 'scale(' + k.toFixed(4) + ')' : '';
    st.borderRadius = rad > 0.05 ? (topOnly ? r + ' ' + r + ' 0 0' : r) : '';
    st.setProperty('--dim', dim.toFixed(3));
    st.willChange = fout > 0 && fout < 1 ? 'transform' : '';
    s.stage.classList.toggle('is-arriving', arriving);
    // com os cantos do projetor a cena passa a ser recortada, e nesse trecho o navegador
    // deixa de recortar o que tem desfoque de fundo: o vidro da pasta vira camada comum
    s.stage.classList.toggle('is-cut', rad > 0.05);
  }

  /* ---------- O rolo ----------
     Presa a cena, a rolagem passa os vídeos de lado: o do meio fica inteiro, os
     vizinhos encolhem e apagam. O fim da fatia segura o último vídeo. */

  var REEL_RUN = 0.86;
  var pos = 0, reelsOn = false;
  function reels(p, vis, dt) {
    var want = clamp(p / REEL_RUN, 0, 1) * (nW - 1);
    if (!motionOn()) pos = Math.round(want);
    else { pos += (want - pos) * (1 - Math.exp(-dt / 90)); if (Math.abs(want - pos) < 0.0005) pos = want; }
    if (!vis && !reelsOn) return;
    reelsOn = vis;
    strip.style.transform = 'translate3d(' + (-pos * step).toFixed(1) + 'px,0,0)';
    reelEls.forEach(function (el, k) {
      var d = Math.abs(pos - k), w = Math.min(1, d);
      el.style.transform = motionOn() ? 'scale(' + (1 - 0.07 * w).toFixed(4) + ')' : '';
      el.style.opacity = (1 - 0.62 * w).toFixed(3);
      el.classList.toggle('is-on', d < 0.5);
      C.set('reel' + k, 1 - w, vis && d < 1.5);
    });
  }
  function reelY(k) {
    var s = byKey.reels;
    return s.top + (nW > 1 ? k / (nW - 1) : 0) * REEL_RUN * own(s);
  }

  /* ---------- Para onde a página vai ---------- */

  function scrollToY(y, instant) {
    if (instant || !motionOn()) {
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, y);
      root.style.scrollBehavior = '';
    } else window.scrollTo({ top: y, behavior: 'smooth' });
  }
  function goWork(k) { scrollToY(reelY(k)); }

  /* no toque os vídeos também se arrastam de lado: o gesto horizontal vira a mesma rolagem
     que passa o rolo (a cena continua presa e a fita segue o dedo) e, ao soltar, ela assenta
     no vídeo mais perto, ou no seguinte se o gesto foi um peteleco. O gesto vertical continua
     sendo a rolagem da página, e com mouse nada muda. */
  (function reelSwipe() {
    var st = byKey.reels && byKey.reels.stage;
    if (!st || nW < 2) return;
    var g = null, swallow = false;
    // quantos pixels de rolagem passam um vídeo
    function perReel() { return REEL_RUN * own(byKey.reels) / (nW - 1); }
    st.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') return;
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sy: window.pageYOffset, on: false, pts: [], f0: 0 };
    });
    st.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.on) {
        // só vira arrasto de lado quando o dedo anda mais na horizontal que na vertical
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        g.on = true; g.x0 = e.clientX; dx = 0;
        g.sy = clamp(window.pageYOffset, reelY(0), reelY(nW - 1)); g.f0 = (g.sy - reelY(0)) / perReel();
        try { st.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      }
      scrollToY(clamp(g.sy - dx / Math.max(1, step) * perReel(), reelY(0), reelY(nW - 1)), true);
      var now = performance.now();
      g.pts.push({ x: e.clientX, t: now });
      while (g.pts.length > 2 && now - g.pts[0].t > 90) g.pts.shift();
    });
    function endSwipe(e) {
      if (!g || e.pointerId !== g.id) return;
      var d = g; g = null;
      if (!d.on) return;
      swallow = true;
      setTimeout(function () { swallow = false; }, 60);
      var a = d.pts[0], b = d.pts[d.pts.length - 1];
      var vx = a && b && b.t > a.t && performance.now() - b.t < 80 ? (b.x - a.x) / (b.t - a.t) : 0;
      // passou de um quarto de vídeo (ou foi um peteleco), assenta no seguinte na direção do gesto
      var f = (window.pageYOffset - reelY(0)) / perReel(), dl = f - d.f0, k = Math.round(f);
      if (dl > 0) k = Math.floor(f + 0.75); else if (dl < 0) k = Math.ceil(f - 0.75);
      if (vx < -0.3) k = Math.max(k, Math.round(d.f0) + 1); else if (vx > 0.3) k = Math.min(k, Math.round(d.f0) - 1);
      k = clamp(k, 0, nW - 1);
      goWork(k);
    }
    st.addEventListener('pointerup', endSwipe);
    st.addEventListener('pointercancel', endSwipe);
    // o toque que terminou um arrasto não vale como clique
    st.addEventListener('click', function (e) { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, true);
  })();

  var CH = [
    // os três primeiros aparecem só pelo número (o nome fica para o leitor de tela)
    { num: '1', key: 'ch.intro', scene: 'title', hash: 'apresentacao', bare: true },
    { num: '2', key: 'ch.design', scene: 'design', hash: 'design', bare: true },
    { num: '3', key: 'ch.play', scene: 'play', hash: 'interacao', bare: true },
    // os vídeos são parte do capítulo dos trabalhos
    { num: '4', key: 'ch.works', scene: 'works', hash: 'trabalhos' },
    { num: '', key: 'v1.credits', shortKey: 'v1.end', scene: 'close', hash: 'contato' }
  ];
  function chStart(i) { return i ? byKey[CH[i].scene].top : 0; }
  // a régua do capítulo vai do começo dele ao começo do seguinte; a do fim, da chegada ao fim
  function chSpan(i) {
    if (i === CH.length - 1) { var a = chStart(i); return { a: a - VH, b: a }; }
    return { a: chStart(i), b: chStart(i + 1) };
  }
  function goChapter(i) { scrollToY(chStart(clamp(i, 0, CH.length - 1))); }

  /* ---------- HUD ---------- */

  var indexHost = $('[data-index]'), indexBtns = [];
  function renderIndex() {
    indexHost.innerHTML = '';
    indexBtns = [];
    CH.forEach(function (c, ci) {
      var li = doc.createElement('li'), b = doc.createElement('button');
      b.type = 'button';
      var label = t(c.key);
      b.innerHTML = (c.num ? '<span class="i-num" aria-hidden="true"></span>' : '') + (c.bare ? '' : '<span class="i-label"></span>') + (c.shortKey ? '<span class="i-label i-label--short" aria-hidden="true"></span>' : '');
      if (c.num) $('.i-num', b).textContent = c.num;
      if (!c.bare) $('.i-label', b).textContent = label;
      if (c.shortKey) $('.i-label--short', b).textContent = t(c.shortKey);
      b.setAttribute('aria-label', (c.num ? c.num + ', ' : '') + label);
      b.addEventListener('click', function () { goChapter(ci); });
      li.appendChild(b);
      indexHost.appendChild(li);
      indexBtns.push(b);
    });
    hudCh = -1;
    prLast = [];
  }

  var hudCh = -1, prLast = [], hashNow = '';
  function updateHud(y) {
    var ci = 0;
    for (var i = 0; i < CH.length; i++) if (chStart(i) <= y + VH * 0.5) ci = i;
    CH.forEach(function (c, k) {
      var sp = chSpan(k), pr = clamp((y - sp.a) / Math.max(1, sp.b - sp.a), 0, 1);
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
    // o endereço acompanha a leitura; dentro do rolo, o vídeo da vez
    var h = CH[ci].hash;
    if (CH[ci].scene === 'works' && y >= byKey.reels.top - VH * 0.5 && y < byKey.close.top - VH * 0.5) h = 'trabalho-' + (Math.round(pos) + 1);
    if (h !== hashNow) {
      hashNow = h;
      try { history.replaceState(null, '', '#' + h); } catch (e) { /* file:// */ }
    }
  }
  $('[data-home]').addEventListener('click', function () { goChapter(0); });

  /* ---------- Laço ---------- */

  var last = 0, lastY = -1, speed = 0;
  function tick(now) {
    var dt = Math.min(64, now - (last || now));
    last = now;
    var y = window.scrollY || window.pageYOffset || 0;
    // a velocidade da rolagem, em telas por segundo, apressa o relógio das cenas
    var v = lastY < 0 || !dt ? 0 : Math.abs(y - lastY) / VH / (dt / 1000);
    lastY = y;
    speed += (Math.min(v, 6) - speed) * (1 - Math.exp(-dt / 140));
    var focus = '', best = -1;
    scenes.forEach(function (s, i) {
      var sp = spans(s, i, y), vis = sp.fin > 0 && sp.fout < 1;
      depth(s, sp.fin, sp.fout);
      if (s.key === 'reels') reels(sp.p, vis, dt);
      else C.set(s.key, sp.p, vis);
      var w = sp.fin - sp.fout;
      if (w >= best) { best = w; focus = s.key; }
    });
    C.current(focus === 'reels' ? 'reel' + Math.round(pos) : focus);
    C.frame(dt, now, speed);
    updateHud(y);
    requestAnimationFrame(tick);
  }

  /* ---------- Início ---------- */

  Site.on('lang', function () { renderIndex(); });
  Site.on('motion', function () { scenes.forEach(function (s) { s.last = ''; }); reelsOn = true; });

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { measure(); C.refit(); measure(); }, 120);
  });

  try { history.scrollRestoration = 'manual'; } catch (e) { /* ok */ }
  measure();
  C.refit();
  measure();
  renderIndex();

  // um endereço com capítulo ou vídeo abre direto nele
  var h0 = (location.hash || '').replace('#', ''), m = /^trabalho-(\d+)$/.exec(h0);
  if (m) scrollToY(reelY(clamp(parseInt(m[1], 10) - 1, 0, nW - 1)), true);
  else {
    var ci0 = -1;
    CH.forEach(function (c, i) { if (c.hash === h0) ci0 = i; });
    scrollToY(ci0 > 0 ? chStart(ci0) : 0, true);
  }

  /* ---------- Início da página ----------
     A abertura é o próprio letreiro: o nome ocupa a tela, fica um instante e sobe
     para o lugar dele. Com um capítulo no endereço, a página já abre nele. */

  C.ready();
  requestAnimationFrame(function () { root.classList.add('is-ready'); });
  C.titleIn(!!h0);

  // quando a fonte chega as cenas mudam de medida
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); });
  requestAnimationFrame(tick);
})();
