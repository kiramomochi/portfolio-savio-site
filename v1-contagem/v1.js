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
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

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
  var nextBtn = $('[data-next]'), nextLabel = $('.next-label'), cue = $('.cue'), tcEl = $('.timecode');
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
      if (ci >= CH.length - 1) nextLabel.textContent = t('v1.restart');
      else nextLabel.textContent = (CH[ci + 1].num ? CH[ci + 1].num + ' ' : '') + t(CH[ci + 1].key);
      cue.classList.remove('is-blink'); void cue.offsetWidth;
      if (motionOn()) cue.classList.add('is-blink');
    }
    // o endereço acompanha a leitura; dentro do rolo, o vídeo da vez
    var h = CH[ci].hash;
    if (CH[ci].scene === 'works' && y >= byKey.reels.top - VH * 0.5 && y < byKey.close.top - VH * 0.5) h = 'trabalho-' + (Math.round(pos) + 1);
    if (h !== hashNow) {
      hashNow = h;
      try { history.replaceState(null, '', '#' + h); } catch (e) { /* file:// */ }
    }
    // o timecode é a posição da página no filme: cada tela, quatro segundos
    var f = Math.floor(y / VH * 4 * 24);
    tcEl.textContent = pad(Math.floor(f / 86400)) + ':' + pad(Math.floor(f / 1440) % 60) + ':' + pad(Math.floor(f / 24) % 60) + ':' + pad(f % 24);
  }
  nextBtn.addEventListener('click', function () { if (hudCh >= CH.length - 1) goChapter(0); else goChapter(hudCh + 1); });
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

  /* ---------- Introdução: o projetor acende ----------
     A tela começa preta, com a cruz e os anéis de uma ponta de filme se riscando
     e o timecode correndo um segundo de quadros. Então um ponteiro de tungstênio
     dá uma volta e, por onde passa, abre a página por baixo, que chega de longe
     num zoom (a entrada). Qualquer gesto pula para o fim. */

  var introEl = $('.intro');
  function startPage() {
    if (motionOn() && !h0) {
      root.classList.add('is-entering');
      setTimeout(function () { root.classList.remove('is-entering'); }, 1900);
    }
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
    C.titleIn();
  }
  function runIntro() {
    var t0 = performance.now(), tc = $('.intro-tc', introEl), hand = $('.intro-hand', introEl);
    var COUNT = 700, SWEEP = 900, opened = false, done = false;
    var skipEvents = ['wheel', 'keydown', 'pointerdown', 'touchstart'];
    function finish() {
      if (done) return;
      done = true;
      skipEvents.forEach(function (ev) { window.removeEventListener(ev, finish, true); });
      if (!opened) { opened = true; startPage(); }
      introEl.classList.add('is-out');
      setTimeout(function () { introEl.remove(); }, 420);
    }
    function step(now) {
      if (done) return;
      var el = now - t0;
      var f = Math.min(24, Math.floor(el / COUNT * 24));
      tc.textContent = '00:00:' + (f >= 24 ? '01:00' : '00:' + pad(f));
      if (el >= COUNT && !opened) { opened = true; startPage(); }
      var a = 360 * inOut(clamp((el - COUNT) / SWEEP, 0, 1));
      introEl.style.setProperty('--a', a.toFixed(2) + 'deg');
      hand.setAttribute('transform', 'rotate(' + a.toFixed(2) + ')');
      if (el >= COUNT + SWEEP) { finish(); return; }
      requestAnimationFrame(step);
    }
    introEl.classList.add('is-on');
    skipEvents.forEach(function (ev) { window.addEventListener(ev, finish, true); });
    requestAnimationFrame(step);
  }
  C.ready();
  if (motionOn() && !h0 && introEl) runIntro();
  else { if (introEl) introEl.remove(); startPage(); }
  // quando a fonte chega as cenas mudam de medida
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); });
  requestAnimationFrame(tick);
})();
