/*
  Site: idioma, preferência de movimento, vídeos e imagens com fallback.
  Compartilhado pelas três versões. Depende de content.js.
*/
(function (global) {
  'use strict';

  var S = global.SITE;
  var doc = document;
  var root = doc.documentElement;

  var store = {
    get: function (k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { global.localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  };

  var listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, data) { (listeners[evt] || []).forEach(function (fn) { fn(data); }); }

  /* ---------- Idioma ---------- */

  var extra = { pt: {}, en: {} };
  var lang = store.get('sc-lang') === 'en' ? 'en' : 'pt';

  function t(key) {
    var v = extra[lang][key];
    if (v == null) v = S.strings[lang][key];
    return v == null ? key : v;
  }

  function applyLang(scope) {
    var el = scope || doc;
    root.lang = lang === 'pt' ? 'pt-BR' : 'en';
    el.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = t(n.getAttribute('data-t')); });
    el.querySelectorAll('[data-t-attr]').forEach(function (n) {
      n.getAttribute('data-t-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) n.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    doc.title = t('meta.title');
    var md = doc.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta.description'));
  }

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'pt';
    store.set('sc-lang', lang);
    applyLang();
    emit('lang', lang);
  }

  /* ---------- Movimento ---------- */

  var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var stored = store.get('sc-motion');
  var motionExplicit = stored === 'on' || stored === 'off';
  var motion = motionExplicit ? stored === 'on' : !mq.matches;

  function applyMotion() {
    root.classList.toggle('motion-off', !motion);
    doc.querySelectorAll('[data-motion-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', motion ? 'true' : 'false');
      b.setAttribute('title', t(motion ? 'ui.motionOn' : 'ui.motionOff'));
      var label = b.querySelector('[data-motion-label]');
      if (label) label.textContent = t(motion ? 'ui.motionOn' : 'ui.motionOff');
    });
    syncVideos();
  }

  function setMotion(m) {
    motion = !!m;
    motionExplicit = true;
    store.set('sc-motion', motion ? 'on' : 'off');
    applyMotion();
    emit('motion', motion);
  }

  /* ---------- Vídeos ---------- */

  var smallScreen = function () { return Math.min(global.innerWidth, global.innerHeight) < 700; };
  var videos = [];
  var nearIO = null, playIO = null;

  function videosPaused() { return !motion && motionExplicit; }

  function syncVideos() {
    videos.forEach(function (v) {
      if (videosPaused() || !v._visible) { if (!v.paused) v.pause(); }
      else tryPlay(v);
    });
  }

  function tryPlay(v) {
    if (!v._loaded || v._failed) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () { v._blocked = true; });
  }

  // o pôster só é pedido quando o vídeo se aproxima: não disputa a rede com a abertura
  function posterOn(v) { if (v._poster && !v.poster) v.poster = v._poster; }

  function load(v) {
    if (v._loaded) return;
    v._loaded = true;
    var w = v._work;
    var file = (smallScreen() && w.fileMobile) ? w.fileMobile : w.file;
    v.src = /^(https?:)?\/\//.test(file) ? file : S.assets + file;
    v.load();
  }

  function ensureObservers() {
    if (nearIO || !('IntersectionObserver' in global)) return;
    nearIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { posterOn(e.target); load(e.target); } });
    }, { rootMargin: '75% 75% 75% 75%' });
    playIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        v._visible = e.isIntersecting && e.intersectionRatio > 0.12;
        if (v._visible) {
          posterOn(v); load(v);
          if (!videosPaused()) tryPlay(v);
          // o próximo trabalho já começa a carregar, para a passagem ser contínua
          var nx = videos[videos.indexOf(v) + 1];
          if (nx) { nx.setAttribute('preload', 'auto'); posterOn(nx); load(nx); }
        }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.12, 0.5] });
  }

  /*
    Cria o bloco de mídia de um trabalho. Sem controles, sem áudio, em loop.
    Quando o arquivo não existe, o bloco ganha .is-missing e mostra onde colocá-lo.
  */
  function workMedia(work, index) {
    ensureObservers();
    var wrap = doc.createElement('div');
    wrap.className = 'work-media';
    var v = doc.createElement('video');
    v.muted = true; v.defaultMuted = true;
    v.loop = true; v.playsInline = true; v.autoplay = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
    v.setAttribute('preload', 'none');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    v.setAttribute('aria-hidden', 'true');
    v.tabIndex = -1;
    v._poster = work.poster ? S.assets + work.poster : '';
    v._work = work;
    v.addEventListener('error', function () { v._failed = true; wrap.classList.add('is-missing'); }, true);
    v.addEventListener('loadeddata', function () { wrap.classList.add('is-ready'); });
    var ph = doc.createElement('div');
    ph.className = 'work-ph';
    ph.innerHTML = '<span class="work-ph-label"><span data-t="video.missing"></span> <code></code></span>';
    ph.querySelector('code').textContent = 'assets/' + work.file;
    wrap.appendChild(v);
    wrap.appendChild(ph);
    videos.push(v);
    if (nearIO) { nearIO.observe(v); playIO.observe(v); }
    else { posterOn(v); load(v); v._visible = true; }
    return wrap;
  }

  // iOS em modo economia pode bloquear o autoplay: tenta de novo no primeiro toque.
  function retryBlocked() {
    videos.forEach(function (v) { if (v._blocked && v._visible && !videosPaused()) { v._blocked = false; tryPlay(v); } });
  }
  doc.addEventListener('pointerdown', retryBlocked, { passive: true });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) videos.forEach(function (v) { if (!v.paused) v.pause(); });
    else syncVideos();
  });

  /* ---------- Imagens com fallback ---------- */

  function img(src, alt, cls) {
    var wrap = doc.createElement('span');
    wrap.className = (cls || '') + ' img-slot';
    var i = doc.createElement('img');
    i.alt = alt || '';
    i.decoding = 'async';
    i.loading = 'lazy';
    i.addEventListener('error', function () { wrap.classList.add('is-missing'); });
    i.addEventListener('load', function () { wrap.classList.add('is-ready'); });
    i.src = S.assets + src;
    wrap.appendChild(i);
    return wrap;
  }

  /* Marca: usa assets/logo.svg; sem o arquivo, mostra as iniciais. */
  function mark(el) {
    var i = doc.createElement('img');
    i.alt = '';
    i.className = 'mark-img';
    if (!S.logo) { el.classList.add('is-text'); return; }
    i.addEventListener('error', function () { el.classList.add('is-text'); i.remove(); });
    i.src = S.assets + S.logo;
    el.insertBefore(i, el.firstChild);
  }

  /* ---------- Utilidades ---------- */

  var isTouch = function () {
    return (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in global && !global.matchMedia('(pointer: fine)').matches);
  };

  function bindControls() {
    doc.querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(lang === 'pt' ? 'en' : 'pt'); applyMotion(); });
    });
    doc.querySelectorAll('[data-motion-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { setMotion(!motion); });
    });
  }

  global.Site = {
    t: t,
    lang: function () { return lang; },
    setLang: setLang,
    addStrings: function (pt, en) { Object.assign(extra.pt, pt || {}); Object.assign(extra.en, en || {}); },
    applyLang: applyLang,
    motion: function () { return motion; },
    setMotion: setMotion,
    applyMotion: applyMotion,
    workMedia: workMedia,
    syncVideos: syncVideos,
    img: img,
    mark: mark,
    isTouch: isTouch,
    on: on,
    store: store,
    init: function () { bindControls(); applyLang(); applyMotion(); }
  };
})(window);
