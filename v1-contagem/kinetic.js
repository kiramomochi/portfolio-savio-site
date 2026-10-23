/*
  Grade cinética (painel do fechamento; o de Design usa a malha de lattice.js). Inspirada no "Kinetic Grid"
  (SatoriUI, 21st.dev), escrita do zero em JS puro: uma grade de linhas e pontos
  que se curva em direção ao cursor e solta uma onda a cada clique. Os pontos têm
  mola, então a grade balança um pouco antes de assentar.

  opts (tudo opcional; o padrão é tinta escura sobre papel claro):
    ink   cor da grade, "r, g, b"
    hot   cor da onda, "r, g, b"
    line  opacidade das linhas
    dot   opacidade dos pontos em repouso
    near  quanto os pontos ganham perto do cursor
    glow  se maior que 0, as linhas também acendem perto do cursor e na frente da onda
*/
(function (global) {
  'use strict';

  function create(canvas, opts) {
    var g = canvas.getContext && canvas.getContext('2d');
    if (!g) return null;
    var o = opts || {};
    var INK = o.ink || '17, 17, 16', HOT = o.hot || '214, 120, 30';
    var A_LINE = o.line == null ? 0.075 : o.line, A_DOT = o.dot == null ? 0.2 : o.dot;
    var A_NEAR = o.near == null ? 0.5 : o.near, A_GLOW = o.glow || 0;
    var W = 0, H = 0, dpr = 1, gap = 46, cols = 0, rows = 0;
    var P = [], ripples = [], time = 0, dirty = true;

    function resize(w, h) {
      var d = Math.min(global.devicePixelRatio || 1, 1.5);
      if (w === W && h === H && d === dpr) return;
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gap = Math.max(34, Math.min(58, Math.min(w, h) / 13));
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
      var ox = (w - (cols - 1) * gap) / 2, oy = (h - (rows - 1) * gap) / 2;
      P = [];
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) P.push({ x: ox + i * gap, y: oy + j * gap, dx: 0, dy: 0, vx: 0, vy: 0, h: 0, w: 0 });
      }
      dirty = true;
    }

    // k (0 a 1) é a força da onda; o clique usa 1, um toque leve usa menos
    function ripple(x, y, k) {
      ripples.push({ x: x, y: y, t: 0, k: k == null ? 1 : k });
      if (ripples.length > 4) ripples.shift();
    }

    // dt em ms; (px, py) o ponteiro no espaço do canvas; speed acelera a respiração da grade
    function frame(dt, px, py, pOn, speed, live) {
      if (!W) return;
      if (!live && !dirty && !pOn) return;
      var s = Math.min(dt, 50) / 1000;
      if (live) time += s;
      ripples.forEach(function (r) { r.t += s; });
      ripples = ripples.filter(function (r) { return r.t < 2.4; });
      var R = Math.max(180, Math.max(W, H) * 0.19), R2 = R * R;
      var amb = live ? 1.8 + Math.min(speed, 3) * 3 : 0;
      for (var k = 0; k < P.length; k++) {
        var p = P[k], tx = 0, ty = 0, hot = 0, wave = 0;
        if (amb) {
          tx += amb * Math.sin(p.y * 0.011 + time * 0.9);
          ty += amb * Math.cos(p.x * 0.009 + time * 0.7);
        }
        if (pOn) {
          var ddx = px - p.x, ddy = py - p.y, d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1, f = 1 - d / R;
            f *= f;
            var pull = Math.min(d * 0.42, 34) * f;
            tx += ddx / d * pull; ty += ddy / d * pull;
            hot = f;
          }
        }
        for (var q = 0; q < ripples.length; q++) {
          var rp = ripples[q], rx = p.x - rp.x, ry = p.y - rp.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
          var band = Math.exp(-Math.pow((rd - rp.t * 620) / 46, 2)), amp = 22 * rp.k * Math.exp(-rp.t * 1.5);
          tx += rx / rd * amp * band; ty += ry / rd * amp * band;
          wave = Math.max(wave, band * rp.k * Math.exp(-rp.t * 1.1));
        }
        if (live) {
          p.vx += ((tx - p.dx) * 90 - p.vx * 12) * s;
          p.vy += ((ty - p.dy) * 90 - p.vy * 12) * s;
          p.dx += p.vx * s; p.dy += p.vy * s;
          p.h += (hot - p.h) * Math.min(1, s * 10);
          p.w += (wave - p.w) * Math.min(1, s * 14);
        } else { p.dx = tx; p.dy = ty; p.h = hot; p.w = 0; }
      }
      draw();
      dirty = false;
    }

    // um trecho da grade que acende: tinta perto do cursor, cor da onda na frente dela
    function glow(a, b) {
      var hh = (a.h + b.h) / 2, ww = (a.w + b.w) / 2;
      if (hh < 0.03 && ww < 0.03) return;
      g.strokeStyle = ww > hh ? 'rgba(' + HOT + ',' + (A_GLOW * 1.4 * ww).toFixed(3) + ')' : 'rgba(' + INK + ',' + (A_GLOW * hh).toFixed(3) + ')';
      g.beginPath();
      g.moveTo(a.x + a.dx, a.y + a.dy);
      g.lineTo(b.x + b.dx, b.y + b.dy);
      g.stroke();
    }

    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      var i, j, p;
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(' + INK + ',' + A_LINE + ')';
      g.beginPath();
      for (j = 0; j < rows; j++) {
        for (i = 0; i < cols; i++) {
          p = P[j * cols + i];
          if (i === 0) g.moveTo(p.x + p.dx, p.y + p.dy); else g.lineTo(p.x + p.dx, p.y + p.dy);
        }
      }
      for (i = 0; i < cols; i++) {
        for (j = 0; j < rows; j++) {
          p = P[j * cols + i];
          if (j === 0) g.moveTo(p.x + p.dx, p.y + p.dy); else g.lineTo(p.x + p.dx, p.y + p.dy);
        }
      }
      g.stroke();
      if (A_GLOW) {
        for (j = 0; j < rows; j++) for (i = 1; i < cols; i++) glow(P[j * cols + i - 1], P[j * cols + i]);
        for (i = 0; i < cols; i++) for (j = 1; j < rows; j++) glow(P[(j - 1) * cols + i], P[j * cols + i]);
      }
      // pontos: crescem perto do cursor; na frente da onda ficam cor de tungstênio
      for (var k = 0; k < P.length; k++) {
        p = P[k];
        var r = 1.15 + 1.9 * p.h + 1.2 * p.w;
        g.fillStyle = p.w > 0.18 ? 'rgba(' + HOT + ',' + (0.35 + 0.5 * p.w).toFixed(3) + ')' : 'rgba(' + INK + ',' + (A_DOT + A_NEAR * p.h).toFixed(3) + ')';
        g.beginPath();
        g.arc(p.x + p.dx, p.y + p.dy, r, 0, Math.PI * 2);
        g.fill();
      }
    }

    return { resize: resize, frame: frame, ripple: ripple, touch: function () { dirty = true; } };
  }

  global.KineticGrid = { create: create };
})(window);
