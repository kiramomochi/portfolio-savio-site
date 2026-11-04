/*
  Retícula do capítulo dos trabalhos. Adaptada do "Halftone Wordmark Footer"
  (Kedhareswer Naidu, 21st.dev, licença MIT), reescrita sem React: o fundo do
  quadro inteiro é uma retícula de pontos miúdos, e o título nasce da mesma
  retícula, com os pontos crescendo até o tamanho cheio dentro das letras.
  Os pontos têm mola: o cursor os afasta e eles esquentam para o tungstênio
  enquanto estão fora do lugar; o clique solta um anel de choque e arranca os
  pontos em volta, que voam até a pasta e depois brotam de novo; o destaque que
  corre o arco passa pela retícula como um cometa, inchando os pontos por onde passa.

  Só o que se mexe é redesenhado: os pontos em repouso ficam numa camada pronta,
  e o quadro dorme quando nada anda.

  opts (tudo opcional):
    bg, ink, hot   cores do fundo, da tinta e do calor ("#rrggbb")
    paper, paperInk, paperHot   as mesmas três dentro do recorte (cut)
    font, weight   família e peso do título

  O recorte (cut) é um pedaço do quadro embaixo de uma borda, y(x), em que a retícula se
  inverte: papel claro com pontos escuros. Um ponto que cai em cima da borda sai metade de
  cada lado, cortado por ela.
*/
(function (global) {
  'use strict';

  var TAU = Math.PI * 2, STEP = 1000 / 60;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  function hex(c) {
    var m = /^#?([0-9a-f]{6})$/i.exec(c || ''), n = m ? parseInt(m[1], 16) : 0;
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  // níveis de brilho e de calor: cada par é uma cor pronta, e os pontos de uma mesma
  // cor saem num traço só (o brilho tem mais degraus no escuro, onde mora o fundo)
  var NB = 16, NW = 8, GAMMA = 1.8;

  function create(canvas, opts) {
    var g = canvas.getContext && canvas.getContext('2d');
    if (!g) return null;
    var o = opts || {};
    var BG = hex(o.bg || '#070707'), INK = hex(o.ink || '#f1f0ec'), HOT = hex(o.hot || '#ffa64d');
    var BG2 = hex(o.paper || '#eeede8'), INK2 = hex(o.paperInk || '#0b0b0b'), HOT2 = hex(o.paperHot || '#d2681b');
    var FONT = o.font || 'Archivo', WEIGHT = o.weight || 760;
    var base = document.createElement('canvas'), bx = base.getContext('2d');
    // a mesma camada de repouso em papel, só desenhada quando há recorte
    var base2 = null, b2x = null;
    var cutYs = null, cutIn = null, cutOut = null;
    var meas = document.createElement('canvas').getContext('2d');

    var W = 0, H = 0, dpr = 1, G = 9, cols = 0, rows = 0, ox = 0, oy = 0, N = 0;
    // por casa da retícula: o lugar de repouso, onde está, a velocidade, o raio e o brilho
    // de repouso, a energia do cometa, o crescimento (0 a 1) e a hora de brotar de novo
    var HX, HY, X, Y, VX, VY, R0, B0, E, GR, GV, TR, FL, act, inAct, nAct = 0;
    // o que sai no quadro: posição, raio e cor de cada ponto fora do lugar
    var DX, DY, DR, DQ, ORD, cnt = new Int32Array(NB * NW + 1);
    var COL = [], COL2 = [], bgStr = 'rgb(' + BG.join(',') + ')', bg2Str = 'rgb(' + BG2.join(',') + ')';
    var title = null, pool = null, needBuild = true, dirty = true, changed = false;
    var rings = [], flyers = [], time = 0, acc = 0;
    var head = { on: false, was: false, x: 0, y: 0, px: 0, py: 0 };
    var ptr = { on: false, x: 0, y: 0 };
    var rP = 80, rC = 26, rSw = 4, warmD = 28;

    function palette(out, BG, INK, HOT) {
      for (var qb = 0; qb < NB; qb++) {
        var b = Math.pow(qb / (NB - 1), GAMMA);
        for (var qw = 0; qw < NW; qw++) {
          var w = qw / (NW - 1), c = [0, 1, 2].map(function (k) {
            return Math.round(BG[k] + (INK[k] + (HOT[k] - INK[k]) * w - BG[k]) * b);
          });
          out[qb * NW + qw] = 'rgb(' + c.join(',') + ')';
        }
      }
    }
    palette(COL, BG, INK, HOT);
    palette(COL2, BG2, INK2, HOT2);
    function qOf(b, w) {
      return Math.round(Math.pow(clamp(b, 0, 1), 1 / GAMMA) * (NB - 1)) * NW + Math.round(clamp(w, 0, 1) * (NW - 1));
    }

    function setFont(c, px, stretch) {
      c.font = WEIGHT + ' ' + px.toFixed(2) + 'px ' + FONT;
      if ('fontStretch' in c) c.fontStretch = stretch || 'normal';
      if ('letterSpacing' in c) c.letterSpacing = (-0.02 * px).toFixed(2) + 'px';
    }

    function resize(w, h) {
      var d = Math.min(global.devicePixelRatio || 1, 1.5);
      if (w === W && h === H && d === dpr) return;
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      needBuild = true;
    }

    /* o título em linhas, no maior corpo que cabe na caixa
       box: x, y (canto de cima do desenho das letras), w (largura de cada linha; a
       última vale para as seguintes), h (altura do bloco), max (corpo máximo)
       devolve o corpo e onde termina o desenho, em px do quadro */
    function setTitle(lines, box, stretch) {
      setFont(meas, 100, stretch);
      var m = lines.map(function (s) { return meas.measureText(s); });
      var asc = m[0].actualBoundingBoxAscent || 72, LH = 0.94, F = box.max || 1e4;
      m.forEach(function (mm, i) {
        var ink = (mm.actualBoundingBoxRight + mm.actualBoundingBoxLeft) || mm.width;
        F = Math.min(F, box.w[Math.min(i, box.w.length - 1)] / ink * 100);
      });
      F = Math.max(box.min || 0, Math.min(F, box.h / (asc / 100 + LH * (lines.length - 1))));
      var k = F / 100, desc = m[m.length - 1].actualBoundingBoxDescent || 0;
      var t = {
        lines: lines, stretch: stretch, F: F, LH: LH,
        x: box.x, top: box.y, base: box.y + asc * k,
        left: m.map(function (mm) { return mm.actualBoundingBoxLeft * k; }),
        right: box.x + Math.max.apply(null, m.map(function (mm) { return (mm.actualBoundingBoxRight + mm.actualBoundingBoxLeft) * k; }))
      };
      t.bottom = t.base + LH * F * (lines.length - 1) + desc * k;
      var same = title && title.F.toFixed(2) === t.F.toFixed(2) && title.x === t.x && title.top === t.top &&
        title.lines.join('|') === t.lines.join('|') && title.stretch === t.stretch;
      if (!same) { title = t; needBuild = true; }
      return { size: F, bottom: t.bottom, right: t.right };
    }

    // a luz mansa em volta da pasta: os pontos do fundo crescem e clareiam um pouco ali
    function setPool(x, y, rx, ry) {
      var p = [x, y, rx, ry].map(function (v) { return Math.round(v); });
      if (pool && pool.join(',') === p.join(',')) return;
      pool = p; needBuild = true;
    }

    function build() {
      needBuild = false;
      reset();
      // a retícula acompanha o título: umas 24 casas por corpo de letra; o fundo usa uma
      // casa a cada tantas, para a trama ficar perto da de antes (uns 19px)
      G = clamp(title ? title.F / 24 : Math.min(W, H) / 110, 3.6, 9);
      var every = Math.max(2, Math.round(19 / G)), kf = clamp(G / 7, 0.8, 1.3);
      rP = Math.max(70, G * 12); rC = G * 3.3; rSw = G * 0.46; warmD = Math.max(22, G * 4);
      cols = Math.ceil(W / G) + 2; rows = Math.ceil(H / G) + 2;
      ox = (W - (cols - 1) * G) / 2; oy = (H - (rows - 1) * G) / 2;
      N = cols * rows;
      HX = new Float32Array(N); HY = new Float32Array(N); X = new Float32Array(N); Y = new Float32Array(N);
      VX = new Float32Array(N); VY = new Float32Array(N); R0 = new Float32Array(N); B0 = new Float32Array(N);
      E = new Float32Array(N); GR = new Float32Array(N); GV = new Float32Array(N); TR = new Float32Array(N);
      FL = new Uint8Array(N); act = new Int32Array(N); inAct = new Uint8Array(N); nAct = 0;
      var cap = N + 600;
      DX = new Float32Array(cap); DY = new Float32Array(cap); DR = new Float32Array(cap);
      DQ = new Uint16Array(cap); ORD = new Int32Array(cap);

      // as letras numa tela à parte, do tamanho delas: a cobertura de cada casa vira o raio
      var cov = null, tx0 = 0, ty0 = 0, tw = 0, th = 0;
      if (title) {
        tx0 = Math.floor(title.x - G * 2); ty0 = Math.floor(title.top - G * 2);
        tw = Math.max(1, Math.ceil(title.right - tx0 + G * 2)); th = Math.max(1, Math.ceil(title.bottom - ty0 + G * 2));
        var tc = document.createElement('canvas');
        tc.width = tw; tc.height = th;
        var tg = tc.getContext('2d', { willReadFrequently: true });
        setFont(tg, title.F, title.stretch);
        tg.fillStyle = '#000';
        tg.textBaseline = 'alphabetic';
        title.lines.forEach(function (s, i) { tg.fillText(s, title.x + title.left[i] - tx0, title.base + i * title.LH * title.F - ty0); });
        cov = tg.getImageData(0, 0, tw, th).data;
      }
      function coverage(cx, cy) {
        if (!cov) return 0;
        var sum = 0;
        for (var a = 0; a < 3; a++) {
          for (var b = 0; b < 3; b++) {
            var sx = Math.floor(cx - G / 2 + (b + 0.5) * G / 3) - tx0, sy = Math.floor(cy - G / 2 + (a + 0.5) * G / 3) - ty0;
            if (sx >= 0 && sy >= 0 && sx < tw && sy < th) sum += cov[(sy * tw + sx) * 4 + 3];
          }
        }
        return sum / (9 * 255);
      }

      var rText = G / 2 - 0.5;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var n = j * cols + i, x = ox + i * G, y = oy + j * G;
          HX[n] = X[n] = x; HY[n] = Y[n] = y; GR[n] = 1; TR[n] = -1;
          var c = coverage(x, y);
          if (c >= 0.06) { R0[n] = Math.sqrt(c) * rText; B0[n] = 1; continue; }
          // as casas vazias do fundo só aparecem quando o cometa passa por elas
          if (i % every || j % every) { R0[n] = 0; B0[n] = 0.16; continue; }
          var t = 0;
          if (pool) { var px = (x - pool[0]) / pool[2], py = (y - pool[1]) / pool[3]; t = Math.exp(-(px * px + py * py)); }
          R0[n] = (0.75 + 0.65 * t) * kf;
          B0[n] = 0.15 + 0.17 * t;
        }
      }
      drawBase();
      dirty = true;
    }

    // a camada de repouso: o fundo e cada ponto no lugar, separados por cor
    function drawBase() {
      var m = 0;
      for (var n = 0; n < N; n++) {
        if (R0[n] < 0.2) continue;
        DX[m] = HX[n]; DY[m] = HY[n]; DR[m] = R0[n]; DQ[m] = qOf(B0[n], 0); m++;
      }
      base.width = canvas.width; base.height = canvas.height;
      bx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bx.fillStyle = bgStr;
      bx.fillRect(0, 0, W, H);
      paint(bx, m, COL);
      if (!base2) return;
      base2.width = canvas.width; base2.height = canvas.height;
      b2x.setTransform(dpr, 0, 0, dpr, 0, 0);
      b2x.fillStyle = bg2Str;
      b2x.fillRect(0, 0, W, H);
      paint(b2x, m, COL2);
    }

    /* a borda do recorte: ys[i] é a altura dela em x = i * w / (ys.length - 1), em px do
       quadro (w é a largura com que ys foi feito); embaixo dela é papel. null tira o recorte */
    function setCut(ys, w) {
      cutYs = ys && ys.length > 1 ? ys : null;
      dirty = true;
      if (!cutYs) { cutIn = cutOut = null; return; }
      if (!base2) { base2 = document.createElement('canvas'); b2x = base2.getContext('2d'); needBuild = true; }
      var K = cutYs.length - 1, ww = w || W, p = new Path2D();
      p.moveTo(-4, cutYs[0]);
      for (var i = 0; i <= K; i++) p.lineTo(i * ww / K, cutYs[i]);
      p.lineTo(ww + 4, cutYs[K]);
      p.lineTo(ww + 4, H + 4);
      p.lineTo(-4, H + 4);
      p.closePath();
      var q = new Path2D();
      q.rect(-8, -8, ww + 16, H + 16);
      q.addPath(p);
      cutIn = p; cutOut = q;
    }

    // os pontos da lista, um traço por cor (ordenados por contagem)
    function paint(c, m, cols) {
      var q, k, nq = NB * NW;
      cnt.fill(0);
      for (k = 0; k < m; k++) cnt[DQ[k] + 1]++;
      for (q = 1; q <= nq; q++) cnt[q] += cnt[q - 1];
      for (k = 0; k < m; k++) ORD[cnt[DQ[k]]++] = k;
      var s = 0;
      for (q = 0; q < nq; q++) {
        var e = cnt[q];
        if (e === s) continue;
        c.fillStyle = cols[q];
        c.beginPath();
        for (k = s; k < e; k++) {
          var p = ORD[k], r = DR[p];
          // abaixo de um pixel e pouco, um quadradinho é igual ao círculo e sai mais barato
          if (r < 1.1) { c.rect(DX[p] - r * 0.89, DY[p] - r * 0.89, r * 1.78, r * 1.78); continue; }
          c.moveTo(DX[p] + r, DY[p]);
          c.arc(DX[p], DY[p], r, 0, TAU);
        }
        c.fill();
        s = e;
      }
    }

    function activate(n) {
      if (inAct[n]) return;
      inAct[n] = 1; act[nAct++] = n; changed = true;
    }

    // devolve tudo ao lugar (o movimento desligado, ou uma retícula nova)
    function reset() {
      for (var k = 0; k < nAct; k++) {
        var n = act[k];
        X[n] = HX[n]; Y[n] = HY[n]; VX[n] = VY[n] = 0; E[n] = 0; GR[n] = 1; GV[n] = 0; TR[n] = -1; FL[n] = 0; inAct[n] = 0;
      }
      nAct = 0; rings = []; flyers = []; head.on = false; head.was = false; dirty = true;
    }

    // casas dentro de um raio (r) de (x, y), pela posição de repouso
    function near(x, y, r, fn) {
      var i0 = Math.max(0, Math.floor((x - r - ox) / G)), i1 = Math.min(cols - 1, Math.ceil((x + r - ox) / G));
      var j0 = Math.max(0, Math.floor((y - r - oy) / G)), j1 = Math.min(rows - 1, Math.ceil((y + r - oy) / G));
      for (var j = j0; j <= j1; j++) {
        for (var i = i0; i <= i1; i++) {
          var n = j * cols + i, dx = HX[n] - x, dy = HY[n] - y, d2 = dx * dx + dy * dy;
          if (d2 < r * r) fn(n, Math.sqrt(d2));
        }
      }
    }

    // o cometa acende as casas em volta da cabeça (até as vazias)
    function excite(x, y) {
      near(x, y, rC, function (n, d) {
        if (FL[n]) return;
        var f = 1 - d / rC;
        f = f * f * (3 - 2 * f);
        if (f > E[n]) { E[n] = f; activate(n); }
      });
    }

    function ringStep(rg) {
      var rad = rg.t * rg.v, B = rg.band, hi = rad + B, lo = Math.max(0, rad - B);
      var amp = rg.k * 3.2 * (1 - rg.t / rg.life);
      var j0 = Math.max(0, Math.floor((rg.y - hi - oy) / G)), j1 = Math.min(rows - 1, Math.ceil((rg.y + hi - oy) / G));
      for (var j = j0; j <= j1; j++) {
        var dy = oy + j * G - rg.y;
        if (Math.abs(dy) > hi) continue;
        var span = Math.sqrt(hi * hi - dy * dy), hole = Math.abs(dy) < lo ? Math.sqrt(lo * lo - dy * dy) : 0;
        var i0 = Math.max(0, Math.floor((rg.x - span - ox) / G)), i1 = Math.min(cols - 1, Math.ceil((rg.x + span - ox) / G));
        for (var i = i0; i <= i1; i++) {
          var dx = ox + i * G - rg.x;
          if (Math.abs(dx) < hole - G) { i = Math.max(i, Math.floor((rg.x + hole - G - ox) / G)); continue; }
          var n = j * cols + i;
          if (R0[n] <= 0 || FL[n]) continue;
          var d = Math.sqrt(dx * dx + dy * dy) + 0.001, f = 1 - Math.abs(d - rad) / B;
          if (f * amp < 0.04) continue;
          VX[n] += dx / d * f * amp; VY[n] += dy / d * f * amp;
          activate(n);
        }
      }
    }

    function step() {
      var k, n;
      for (k = rings.length - 1; k >= 0; k--) {
        var rg = rings[k];
        rg.t += STEP;
        if (rg.t >= rg.life) { rings.splice(k, 1); continue; }
        ringStep(rg);
      }
      if (ptr.on) near(ptr.x, ptr.y, rP, function (m) { if (R0[m] > 0 && !FL[m]) activate(m); });
      if (head.on) {
        var x0 = head.was ? head.px : head.x, y0 = head.was ? head.py : head.y;
        var L = Math.hypot(head.x - x0, head.y - y0), s = Math.max(1, Math.ceil(L / (G * 0.7)));
        for (var q = 1; q <= s; q++) excite(x0 + (head.x - x0) * q / s, y0 + (head.y - y0) * q / s);
        head.px = head.x; head.py = head.y; head.was = true;
      }
      var rP2 = rP * rP, decay = Math.exp(-STEP / 340), moving = changed;
      changed = false;
      for (k = nAct - 1; k >= 0; k--) {
        n = act[k];
        // arrancado: espera a hora de brotar de novo, do nada, com mola
        if (FL[n]) {
          if (time < TR[n]) continue;
          FL[n] = 0; GR[n] = 0; GV[n] = 0; X[n] = HX[n]; Y[n] = HY[n]; VX[n] = VY[n] = 0;
        }
        var x = X[n], y = Y[n], vx = VX[n], vy = VY[n];
        if (ptr.on) {
          var dx = x - ptr.x, dy = y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < rP2) { var d = Math.sqrt(d2) + 0.001, f = (1 - d / rP) * 2.6; vx += dx / d * f; vy += dy / d * f; }
        }
        vx = (vx + (HX[n] - x) * 0.05) * 0.84;
        vy = (vy + (HY[n] - y) * 0.05) * 0.84;
        x += vx; y += vy;
        var e = E[n];
        if (e > 0) { e *= decay; if (e < 0.01) e = 0; E[n] = e; moving = true; }
        var gr = GR[n], gv = GV[n];
        if (gr < 1 || gv !== 0) {
          gv = (gv + (1 - gr) * 0.055) * 0.8; gr += gv;
          if (Math.abs(1 - gr) < 0.004 && Math.abs(gv) < 0.003) { gr = 1; gv = 0; }
          GR[n] = gr; GV[n] = gv; moving = true;
        }
        if (Math.abs(vx) + Math.abs(vy) < 0.03 && Math.abs(x - HX[n]) + Math.abs(y - HY[n]) < 0.15 && e === 0 && gr === 1) {
          X[n] = HX[n]; Y[n] = HY[n]; VX[n] = VY[n] = 0;
          inAct[n] = 0; act[k] = act[--nAct];
          moving = true;
          continue;
        }
        if (Math.abs(vx) + Math.abs(vy) > 0.01) moving = true;
        X[n] = x; Y[n] = y; VX[n] = vx; VY[n] = vy;
      }
      return moving || rings.length > 0 || flyers.length > 0;
    }

    function draw() {
      var cp = cutIn && base2 ? cutIn : null;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(base, 0, 0);
      if (cp) {
        g.save();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clip(cp);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(base2, 0, 0);
        g.restore();
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var k, n, m = 0, er = null;
      if (nAct) {
        // o lugar de repouso de quem saiu dele vira fundo; quem saiu menos de um terço de
        // pixel fica como está na camada pronta (é o grosso de um anel passando)
        er = new Path2D();
        for (k = 0; k < nAct; k++) {
          n = act[k];
          var dd = Math.hypot(X[n] - HX[n], Y[n] - HY[n]), e = E[n];
          if (!FL[n] && dd < 0.35 && e < 0.02 && GR[n] === 1) continue;
          if (R0[n] >= 0.2) {
            var re = R0[n] + 0.7;
            er.moveTo(HX[n] + re, HY[n]);
            er.arc(HX[n], HY[n], re, 0, TAU);
          }
          if (FL[n]) continue;
          var r = R0[n] * GR[n];
          if (e > 0) r += Math.max(0, rSw - r) * e;
          if (r < 0.25) continue;
          var wd = Math.min(1, dd / warmD);
          DX[m] = X[n]; DY[m] = Y[n]; DR[m] = r;
          DQ[m] = qOf(B0[n] + (1 - B0[n]) * Math.max(e, wd * 0.75), Math.max(wd, e > 0 ? 3.8 * e * (1 - e) : 0));
          m++;
        }
      }
      // os pontos arrancados, a caminho da pasta, cada um com duas cópias atrás
      for (k = flyers.length - 1; k >= 0; k--) {
        var fl = flyers[k], u = (time - fl.t0) / fl.dur;
        if (u >= 1) { flyers.splice(k, 1); continue; }
        if (u < 0) {
          if (fl.r0 >= 0.25) { DX[m] = fl.sx; DY[m] = fl.sy; DR[m] = fl.r0; DQ[m] = qOf(fl.b, 0); m++; }
          continue;
        }
        for (var c = 0; c < 3; c++) {
          var uc = u - c * 0.045;
          if (uc < 0) break;
          var ee = uc * uc * (3 - 2 * uc), mm = 1 - ee;
          var rr = (fl.r0 + (fl.r - fl.r0) * Math.min(1, uc * 6)) * (1 - 0.6 * ee) * (1 - c * 0.28);
          if (rr < 0.25 || m >= DX.length) continue;
          DX[m] = mm * mm * fl.sx + 2 * mm * ee * fl.cx + ee * ee * fl.tx;
          DY[m] = mm * mm * fl.sy + 2 * mm * ee * fl.cy + ee * ee * fl.ty;
          DR[m] = rr;
          DQ[m] = qOf((fl.b + (1 - fl.b) * Math.min(1, uc * 5)) * (1 - c * 0.38), Math.min(1, ee * 1.4));
          m++;
        }
      }
      if (!cp) {
        if (er) { g.fillStyle = bgStr; g.fill(er); }
        if (m) paint(g, m, COL);
        return;
      }
      // com recorte, duas passadas: fora dele no escuro, dentro no papel
      g.save();
      g.clip(cutOut, 'evenodd');
      if (er) { g.fillStyle = bgStr; g.fill(er); }
      if (m) paint(g, m, COL);
      g.restore();
      g.save();
      g.clip(cp);
      if (er) { g.fillStyle = bg2Str; g.fill(er); }
      if (m) paint(g, m, COL2);
      g.restore();
    }

    // dt em ms; (px, py) o ponteiro no espaço do quadro; live: false desenha parado
    function frame(dt, px, py, pOn, live) {
      if (!W || !H) return;
      if (needBuild) build();
      if (!live) {
        if (nAct || rings.length || flyers.length || head.on) reset();
        ptr.on = false;
        if (dirty) { draw(); dirty = false; }
        return;
      }
      var moved = pOn !== ptr.on || (pOn && Math.abs(px - ptr.x) + Math.abs(py - ptr.y) > 0.3);
      ptr.on = pOn; ptr.x = px; ptr.y = py;
      if (!moved && !dirty && !nAct && !rings.length && !flyers.length && !head.on) { acc = 0; return; }
      acc += Math.min(dt, 64);
      var busy = false, s = 0;
      while (acc >= STEP && s < 4) { acc -= STEP; time += STEP / 1000; busy = step() || busy; s++; }
      if (busy || dirty) { draw(); dirty = false; }
    }

    // anel de choque: k (0 a 1) é a força; o clique usa 1, a queda na pasta bem menos
    function ripple(x, y, k, life) {
      rings.push({ x: x, y: y, t: 0, k: k == null ? 1 : k, v: 0.9, band: G * 2.7, life: life || 900 });
      if (rings.length > 4) rings.shift();
    }

    // o clique arranca a retícula em volta de (x, y): cada casa vira um ponto (as vazias se
    // condensam do nada) que voa em fila até (tx, ty); os que estavam à vista brotam de novo
    // depois, de fora para dentro. Devolve em quantos segundos o primeiro cai
    var FLY = 0.75;
    function burst(x, y, tx, ty, lift) {
      ripple(x, y, 1);
      var Rs = Math.max(30, G * 6.5), got = [];
      near(x, y, Rs, function (n, d) { if (!FL[n]) got.push([n, d]); });
      got.sort(function (a, b) { return a[1] - b[1]; });
      got = got.slice(0, 150);
      got.forEach(function (it, k) {
        var n = it[0], f = it[1] / Rs, r0 = R0[n] * GR[n];
        var delay = k ? f * 0.2 + Math.random() * 0.06 : 0;
        var sx = X[n], sy = Y[n];
        flyers.push({
          sx: sx, sy: sy, tx: tx + (Math.random() - 0.5) * G * 1.2, ty: ty,
          cx: (sx + tx) / 2 + (Math.random() - 0.5) * G * 10,
          // de cima da pasta a fila só se curva um pouco; de baixo, sobe antes de cair
          cy: Math.min(sy, ty) - lift * (sy < ty ? 0.05 + Math.random() * 0.08 : 0.18 + Math.random() * 0.16),
          t0: time + delay, dur: k ? FLY + Math.random() * 0.18 : FLY,
          r0: r0, r: Math.max(r0, G * (0.24 + Math.random() * 0.2)), b: B0[n]
        });
        FL[n] = 1; E[n] = 0; GR[n] = 0; GV[n] = 0;
        TR[n] = time + FLY + 0.3 + (1 - f) * 0.4;
        activate(n);
      });
      return FLY;
    }

    function comet(x, y, on) {
      head.on = !!on; head.x = x; head.y = y;
      if (!on) head.was = false;
    }

    return {
      resize: resize, title: setTitle, pool: setPool, frame: frame,
      ripple: ripple, burst: burst, comet: comet, reset: reset, cut: setCut,
      touch: function () { dirty = true; }
    };
  }

  global.HalftoneField = { create: create };
})(window);
