/*
  SCMap: câmera sobre um plano. Os capítulos ficam espalhados no plano e a
  câmera voa entre eles. Compartilhado pelas três versões; cada versão decide
  o layout (onde fica cada parada) e o trajeto (como a câmera viaja).

  Entradas:
    roda/trackpad  segue a história (uma parada por gesto, com scrub contínuo)
    arrastar       explora livremente e assenta na parada mais próxima
    deslizar       (gesto rápido) próxima / anterior
    pinça, ctrl+roda, tecla M   mapa geral
    setas, PageUp/Down, Home/End, espaço   navegação por teclado
*/
(function (global) {
  'use strict';

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = {
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    expoOut: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    expoInOut: function (t) {
      if (t <= 0) return 0; if (t >= 1) return 1;
      return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
  };

  function defaultTravel(a, b, t, ctx) {
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var span = Math.max(ctx.W, ctx.H);
    var dip = clamp(d / (span * 4), 0, 0.7);
    var z = lerp(a.z, b.z, t) * (1 - dip * Math.sin(Math.PI * t));
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: z, r: lerp(a.r, b.r, t) };
  }

  function create(o) {
    var vp = o.viewport;
    var world = o.world;
    var cfg = {
      layout: o.layout,
      travel: o.travel || defaultTravel,
      ease: o.ease || ease.inOut,
      duration: o.duration || function (d, W, H) { return clamp(700 + (d / Math.max(W, H)) * 240, 800, 1700); },
      overviewPad: o.overviewPad || 0.86,
      reduced: o.reduced || function () { return false; },
      onFrame: o.onFrame || null,
      onStop: o.onStop || null,
      onOverview: o.onOverview || null,
      onTarget: o.onTarget || null
    };

    var W = 1, H = 1, stops = [], bounds = { x: 0, y: 0, w: 1, h: 1 };
    var cam = { x: 0, y: 0, z: 1, r: 0 };
    var mode = 'idle';          // story | flight | drag | overview
    var rest = 0, p = 0, pT = 0;
    var gesture = null;         // gesto de roda em andamento
    var flight = null;
    var overview = false;
    var running = false;
    var last = 0;
    var lastTransform = '';
    var lastZ = -1;
    var suppressClick = false;
    var lastMoving = null;

    function ctx() { return { W: W, H: H, stops: stops, bounds: bounds, cam: cam }; }

    function measure() {
      W = vp.clientWidth || global.innerWidth;
      H = vp.clientHeight || global.innerHeight;
      var L = cfg.layout(W, H);
      stops = L.stops;
      bounds = L.bounds;
    }

    function stopCam(i) {
      var s = stops[clamp(i, 0, stops.length - 1)];
      return { x: s.x, y: s.y, z: s.z || 1, r: 0 };
    }

    function overviewCam() {
      var z = Math.min(W / bounds.w, H / bounds.h) * cfg.overviewPad;
      return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2, z: Math.min(z, 0.8), r: 0 };
    }

    function nearest(x, y) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < stops.length; i++) {
        var d = Math.hypot(stops[i].x - x, stops[i].y - y);
        if (d < bd - 0.5) { bd = d; best = i; }
      }
      // paradas no mesmo ponto: fica na atual
      if (Math.hypot(stops[rest].x - x, stops[rest].y - y) <= bd + 0.5) return rest;
      return best;
    }

    function render() {
      var tr;
      if (Math.abs(cam.z - 1) < 1e-4 && Math.abs(cam.r) < 1e-5) {
        tr = 'translate3d(' + Math.round(W / 2 - cam.x) + 'px,' + Math.round(H / 2 - cam.y) + 'px,0)';
      } else {
        tr = 'translate3d(' + (W / 2).toFixed(2) + 'px,' + (H / 2).toFixed(2) + 'px,0) scale(' + cam.z.toFixed(5) +
          ') rotate(' + cam.r.toFixed(5) + 'rad) translate3d(' + (-cam.x).toFixed(2) + 'px,' + (-cam.y).toFixed(2) + 'px,0)';
      }
      if (tr !== lastTransform) { world.style.transform = tr; lastTransform = tr; }
      if (Math.abs(cam.z - lastZ) > 0.002) { world.style.setProperty('--z', cam.z.toFixed(3)); lastZ = cam.z; }
    }

    function arrive(i) {
      rest = i;
      var ae = document.activeElement;
      if (ae && ae !== document.body && world.contains(ae) && stops[i] && stops[i].el && !stops[i].el.contains(ae)) ae.blur();
      var curEl = stops[i] && stops[i].el;
      stops.forEach(function (s) { if (s.el) s.el.classList.toggle('is-current', s.el === curEl); });
      var s = stops[i];
      if (s && s.hash && global.history && global.history.replaceState) {
        try { global.history.replaceState(null, '', '#' + s.hash); } catch (e) { /* file:// */ }
      }
      if (cfg.onStop) cfg.onStop(i, s);
    }

    function cut() {
      vp.classList.remove('is-cut');
      void vp.offsetWidth;
      vp.classList.add('is-cut');
    }

    function flyTo(target, opts) {
      opts = opts || {};
      var d = Math.hypot(target.x - cam.x, target.y - cam.y);
      var dur = opts.dur != null ? opts.dur : cfg.duration(d, W, H, cam, target);
      if (cfg.reduced()) {
        dur = 0;
        if (d > 2) cut();
      }
      flight = { from: { x: cam.x, y: cam.y, z: cam.z, r: cam.r }, to: target, t0: performance.now() + (opts.delay || 0), dur: dur,
        index: opts.index, ov: !!opts.ov, ease: opts.ease || cfg.ease, travel: opts.travel || cfg.travel };
      mode = 'flight';
      if (opts.index != null && cfg.onTarget) cfg.onTarget(opts.index);
    }

    function go(i, opts) {
      if (!stops.length) return;
      i = clamp(i, 0, stops.length - 1);
      if (overview) setOverview(false, true);
      flyTo(stopCam(i), Object.assign({ index: i }, opts || {}));
    }

    function targetIndex() { return flight && flight.index != null ? flight.index : rest; }

    function setOverview(on, silent) {
      on = !!on;
      if (on === overview) return;
      overview = on;
      vp.classList.toggle('is-overview', on);
      if (on) flyTo(overviewCam(), { ov: true, ease: ease.inOut });
      else if (!silent) go(rest);
      if (cfg.onOverview) cfg.onOverview(on);
    }

    /* ---------- laço ---------- */

    function tick(now) {
      if (!running) return;
      var dt = Math.min(64, now - (last || now));
      last = now;

      if (flight) {
        var t = flight.dur ? clamp((now - flight.t0) / flight.dur, 0, 1) : 1;
        var c = flight.travel(flight.from, flight.to, flight.ease(t), ctx(), t);
        cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.r = c.r;
        if (t >= 1) {
          var f = flight; flight = null;
          cam.x = f.to.x; cam.y = f.to.y; cam.z = f.to.z; cam.r = f.to.r;
          if (f.index != null) { p = pT = f.index; mode = 'story'; arrive(f.index); }
          else mode = f.ov ? 'overview' : 'story';
        }
      } else if (mode === 'story') {
        if (gesture && now - gesture.last > 160) {
          var dlt = pT - gesture.base;
          pT = Math.abs(dlt) > 0.12 ? gesture.base + Math.sign(dlt) : gesture.base;
          pT = clamp(pT, 0, stops.length - 1);
          gesture = null;
        }
        p += (pT - p) * (1 - Math.exp(-dt / 120));
        if (Math.abs(pT - p) < 0.0008) p = pT;
        var i0 = Math.floor(p), fr = p - i0;
        if (fr < 1e-4 || i0 >= stops.length - 1) {
          var sc = stopCam(Math.round(p));
          cam.x = sc.x; cam.y = sc.y; cam.z = sc.z; cam.r = 0;
        } else {
          var c2 = cfg.travel(stopCam(i0), stopCam(i0 + 1), fr, ctx(), fr);
          cam.x = c2.x; cam.y = c2.y; cam.z = c2.z; cam.r = c2.r;
        }
        if (p === pT && pT === Math.round(pT) && pT !== rest && !gesture) arrive(pT);
      }

      var moving = !!flight || mode === 'drag' || (mode === 'story' && Math.abs(p - Math.round(p)) > 0.0015);
      if (moving !== lastMoving) { vp.classList.toggle('is-moving', moving); lastMoving = moving; }
      render();
      if (cfg.onFrame) cfg.onFrame(cam, api, dt, now);
      global.requestAnimationFrame(tick);
    }

    /* ---------- roda ---------- */

    function onWheel(e) {
      if (!running) return;
      if (e.target.closest && e.target.closest('[data-no-wheel]')) return;
      e.preventDefault();
      var dy = e.deltaY, dx = e.deltaX;
      if (e.deltaMode === 1) { dy *= 16; dx *= 16; }
      else if (e.deltaMode === 2) { dy *= H; dx *= W; }

      if (e.ctrlKey) {               // pinça no trackpad
        if (dy > 6 && !overview) setOverview(true);
        else if (dy < -6 && overview) { var w = screenToWorld(e.clientX, e.clientY); go(nearest(w.x, w.y)); }
        return;
      }
      if (overview) { if (Math.abs(dy) + Math.abs(dx) > 24) setOverview(false); return; }
      if (mode !== 'story') return;

      var d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
      var now = performance.now();
      if (!gesture) gesture = { base: rest, last: now };
      gesture.last = now;
      var per = clamp(H * 0.95, 520, 980);
      pT = clamp(pT + d / per, Math.max(0, gesture.base - 1), Math.min(stops.length - 1, gesture.base + 1));
    }

    /* ---------- arrastar / pinça ---------- */

    var pointers = new Map();
    var drag = null;
    var pinch = null;

    function screenToWorld(sx, sy) {
      var dx = (sx - W / 2) / cam.z, dy = (sy - H / 2) / cam.z;
      var c = Math.cos(-cam.r), s = Math.sin(-cam.r);
      return { x: cam.x + dx * c - dy * s, y: cam.y + dx * s + dy * c };
    }

    function onDown(e) {
      if (!running) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('[data-no-drag]')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinch = { d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, done: false };
        drag = null;
        return;
      }
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false, samples: [] };
    }

    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        var pts = Array.from(pointers.values());
        var ratio = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / pinch.d0;
        if (!pinch.done && ratio < 0.72 && !overview) { pinch.done = true; setOverview(true); }
        else if (!pinch.done && ratio > 1.35 && overview) {
          pinch.done = true;
          var w = screenToWorld((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
          go(nearest(w.x, w.y));
        }
        return;
      }
      if (!drag || drag.id !== e.pointerId) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
        drag.moved = true;
        flight = null;
        gesture = null;
        mode = overview ? 'overview' : 'drag';
        vp.classList.add('is-dragging');
        dx = e.clientX - drag.x; dy = e.clientY - drag.y;
      }
      var c = Math.cos(-cam.r), s = Math.sin(-cam.r);
      cam.x -= (dx * c - dy * s) / cam.z;
      cam.y -= (dx * s + dy * c) / cam.z;
      if (overview) clampToBounds();
      drag.x = e.clientX; drag.y = e.clientY;
      var now = performance.now();
      drag.samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (drag.samples.length && now - drag.samples[0].t > 90) drag.samples.shift();
    }

    function clampToBounds() {
      cam.x = clamp(cam.x, bounds.x, bounds.x + bounds.w);
      cam.y = clamp(cam.y, bounds.y, bounds.y + bounds.h);
    }

    function onUp(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; return; }
      if (!drag || drag.id !== e.pointerId) return;
      var d = drag; drag = null;
      vp.classList.remove('is-dragging');
      if (!d.moved) return;
      suppressClick = true;
      global.setTimeout(function () { suppressClick = false; }, 60);

      var vx = 0, vy = 0, sm = d.samples;
      if (sm.length > 1) {
        var a = sm[0], b = sm[sm.length - 1], dtt = Math.max(1, b.t - a.t);
        vx = (b.x - a.x) / dtt; vy = (b.y - a.y) / dtt;
      }
      var cr = Math.cos(-cam.r), sr = Math.sin(-cam.r);
      var wvx = (vx * cr - vy * sr) / cam.z, wvy = (vx * sr + vy * cr) / cam.z;

      if (overview) {
        var tx = clamp(cam.x - wvx * 260, bounds.x, bounds.x + bounds.w);
        var ty = clamp(cam.y - wvy * 260, bounds.y, bounds.y + bounds.h);
        flyTo({ x: tx, y: ty, z: cam.z, r: 0 }, { ov: true, dur: 650, ease: ease.out });
        return;
      }
      var tot = { x: e.clientX - d.x0, y: e.clientY - d.y0 };
      var speed = Math.hypot(vx, vy);
      var dur = performance.now() - d.t0;
      var travelled = Math.hypot(tot.x, tot.y);
      var flick = (dur < 600 && speed > 0.3 && travelled > 24) || (dur < 900 && travelled > Math.min(W, H) * 0.22 && speed > 0.12);
      if (flick) {
        var axis = Math.abs(tot.x) > Math.abs(tot.y) ? tot.x : tot.y;
        go(rest + (axis < 0 ? 1 : -1));
        return;
      }
      var target = nearest(cam.x - wvx * 220, cam.y - wvy * 220);
      go(target, { dur: 720, ease: ease.out });
    }

    function onClickCapture(e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      if (overview) {
        var panel = e.target.closest('[data-stop]');
        e.preventDefault(); e.stopPropagation();
        if (panel) go(parseInt(panel.getAttribute('data-stop'), 10));
        else { var w = screenToWorld(e.clientX, e.clientY); go(nearest(w.x, w.y)); }
      }
    }

    /* ---------- teclado e foco ---------- */

    function onKey(e) {
      if (!running) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      var k = e.key;
      // um objeto interativo focado fica com as setas, o espaço e o Enter; o resto continua navegando
      if (e.target.closest && e.target.closest('[data-no-keys]') && /^(Arrow|Enter$| $)/.test(k)) return;
      var interactive = tag === 'button' || tag === 'a' || !!(e.target.closest && e.target.closest('[data-no-keys]'));
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !interactive)) { e.preventDefault(); go(targetIndex() + 1); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(targetIndex() - 1); }
      else if (k === 'Home') { e.preventDefault(); go(0); }
      else if (k === 'End') { e.preventDefault(); go(stops.length - 1); }
      else if (k === 'm' || k === 'M') { setOverview(!overview); }
      else if (k === 'Escape' && overview) { setOverview(false); }
    }

    function onFocusIn(e) {
      if (!running) return;
      var panel = e.target.closest && e.target.closest('[data-stop]');
      if (!panel || !world.contains(panel)) return;
      var i = parseInt(panel.getAttribute('data-stop'), 10);
      if (i !== targetIndex() || overview) go(i);
    }

    /* ---------- tamanho ---------- */

    var rt = 0;
    function onResize() {
      global.clearTimeout(rt);
      rt = global.setTimeout(function () {
        measure();
        flight = null;
        if (overview) { var oc = overviewCam(); cam.x = oc.x; cam.y = oc.y; cam.z = oc.z; cam.r = 0; }
        else { var sc = stopCam(rest); cam.x = sc.x; cam.y = sc.y; cam.z = sc.z; cam.r = 0; p = pT = rest; mode = 'story'; }
        render();
      }, 120);
    }

    function lockScroll() { if (vp.scrollTop || vp.scrollLeft) { vp.scrollTop = 0; vp.scrollLeft = 0; } }

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('pointerdown', onDown);
    global.addEventListener('pointermove', onMove, { passive: true });
    global.addEventListener('pointerup', onUp);
    global.addEventListener('pointercancel', onUp);
    vp.addEventListener('click', onClickCapture, true);
    global.addEventListener('keydown', onKey);
    vp.addEventListener('focusin', onFocusIn);
    vp.addEventListener('scroll', lockScroll);
    global.addEventListener('scroll', function () { if (global.scrollY || global.scrollX) global.scrollTo(0, 0); });
    global.addEventListener('resize', onResize);
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    var api = {
      start: function (index, opts) {
        measure();
        index = clamp(index || 0, 0, stops.length - 1);
        opts = opts || {};
        if (opts.from) {
          cam.x = opts.from.x; cam.y = opts.from.y; cam.z = opts.from.z; cam.r = opts.from.r || 0;
          running = true; last = 0;
          global.requestAnimationFrame(tick);
          flyTo(stopCam(index), { index: index, dur: opts.dur, ease: opts.ease, delay: opts.delay, travel: opts.travel });
        } else {
          var sc = stopCam(index);
          cam.x = sc.x; cam.y = sc.y; cam.z = sc.z; cam.r = 0;
          p = pT = index; mode = 'story';
          running = true; last = 0;
          render();
          arrive(index);
          global.requestAnimationFrame(tick);
        }
      },
      measure: function () { measure(); render(); },
      go: go,
      next: function () { go(targetIndex() + 1); },
      prev: function () { go(targetIndex() - 1); },
      overview: setOverview,
      isOverview: function () { return overview; },
      index: function () { return rest; },
      target: targetIndex,
      progress: function () { return mode === 'story' ? p : rest; },
      flying: function () { return !!flight; },
      dragging: function () { return mode === 'drag'; },
      cam: cam,
      stops: function () { return stops; },
      size: function () { return { W: W, H: H }; },
      bounds: function () { return bounds; },
      overviewCam: overviewCam,
      stopCam: stopCam,
      hashIndex: function () {
        var h = (global.location.hash || '').replace('#', '');
        if (!h) return -1;
        measure();
        for (var i = 0; i < stops.length; i++) if (stops[i].hash === h) return i;
        return -1;
      }
    };
    return api;
  }

  global.SCMap = { create: create, ease: ease, clamp: clamp, lerp: lerp };
})(window);
