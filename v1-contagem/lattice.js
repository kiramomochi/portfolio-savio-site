/*
  Malha do painel de Design. Inspirada no "Lattice Background" (daiwiikharihar,
  21st.dev), escrita do zero em JS puro: pontos que vagam devagar, ligados por
  uma triangulação de Delaunay refeita a cada quadro. Só aparecem as arestas
  curtas, então a malha se junta em ilhas que se formam e se desfazem conforme
  os pontos andam. O cursor puxa os pontos e acende os triângulos em volta, como
  uma lâmpada de tungstênio; o clique solta uma onda; de tempos em tempos um
  vértice pulsa e a energia corre pelas arestas até os vizinhos.

  opts (tudo opcional; o padrão é tinta clara sobre o escuro):
    ink  cor da malha, "r, g, b"
    hot  cor da luz do cursor e da onda, "r, g, b"
*/
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // Bowyer-Watson: os pontos entram um a um e refazem só os triângulos cujo
  // círculo os contém. Devolve trios de índices em X/Y.
  function delaunay(X, Y, n) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, i;
    for (i = 0; i < n; i++) {
      if (X[i] < x0) x0 = X[i]; if (X[i] > x1) x1 = X[i];
      if (Y[i] < y0) y0 = Y[i]; if (Y[i] > y1) y1 = Y[i];
    }
    var d = Math.max(x1 - x0, y1 - y0, 1) * 20, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    X[n] = mx - d; Y[n] = my - d;
    X[n + 1] = mx + d; Y[n + 1] = my - d;
    X[n + 2] = mx; Y[n + 2] = my + d;

    function circ(a, b, c) {
      var ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx = X[c], cy = Y[c];
      var D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      if (Math.abs(D) < 1e-9) return { a: a, b: b, c: c, x: 0, y: 0, r2: Infinity };
      var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
      var ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / D;
      var uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / D;
      return { a: a, b: b, c: c, x: ux, y: uy, r2: (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy) };
    }

    var tris = [circ(n, n + 1, n + 2)];
    for (i = 0; i < n; i++) {
      var px = X[i], py = Y[i], edges = [], keep = [], t, e, f;
      for (t = 0; t < tris.length; t++) {
        var T = tris[t], dx = px - T.x, dy = py - T.y;
        if (dx * dx + dy * dy < T.r2) edges.push(T.a, T.b, T.b, T.c, T.c, T.a);
        else keep.push(T);
      }
      // as arestas que só um triângulo removido tinha formam a borda do buraco
      for (e = 0; e < edges.length; e += 2) {
        var a = edges[e], b = edges[e + 1], shared = false;
        for (f = 0; f < edges.length; f += 2) {
          if (f !== e && ((edges[f] === b && edges[f + 1] === a) || (edges[f] === a && edges[f + 1] === b))) { shared = true; break; }
        }
        if (!shared) keep.push(circ(a, b, i));
      }
      tris = keep;
    }
    var out = [];
    for (i = 0; i < tris.length; i++) {
      var q = tris[i];
      if (q.a < n && q.b < n && q.c < n) out.push(q.a, q.b, q.c);
    }
    return out;
  }

  function create(canvas, opts) {
    var g = canvas.getContext && canvas.getContext('2d');
    if (!g) return null;
    var o = opts || {};
    var INK = o.ink || '237, 237, 234', HOT = o.hot || '255, 166, 77';
    var W = 0, H = 0, dpr = 1, S = 100, L = 130, M = 120;
    var P = [], X = [], Y = [], deg = [], seen = null, live = [];
    var ripples = [], pulses = [], time = 0, nextPulse = 1.2, dirty = true;

    function rgba(c, a) { return 'rgba(' + c + ',' + a.toFixed(3) + ')'; }

    function point() {
      var a = Math.random() * TAU, sp = 4 + Math.random() * 9;
      return {
        hx: Math.random() * (W + 2 * M) - M, hy: Math.random() * (H + 2 * M) - M,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dx: 0, dy: 0, ux: 0, uy: 0, h: 0, w: 0, e: 0
      };
    }

    function resize(w, h) {
      var d = Math.min(global.devicePixelRatio || 1, 1.5);
      if (!w || !h || (w === W && h === H && d === dpr)) return;
      var sx = W ? w / W : 1, sy = H ? h / H : 1;
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      // S é o espaço médio entre pontos; a malha nunca passa de ~260 pontos
      S = clamp(Math.min(w, h) / 8, 54, 100);
      M = S * 1.2;
      S = Math.max(S, Math.sqrt((w + 2 * M) * (h + 2 * M) / 260));
      L = S * 1.38;
      var n = Math.round((w + 2 * M) * (h + 2 * M) / (S * S));
      P.forEach(function (p) { p.hx *= sx; p.hy *= sy; });
      while (P.length < n) P.push(point());
      P.length = n;
      seen = new Uint8Array(n * n);
      pulses = [];
      dirty = true;
    }

    // k (0 a 1) é a força da onda
    function ripple(x, y, k) {
      ripples.push({ x: x, y: y, t: 0, k: k == null ? 1 : k });
      if (ripples.length > 4) ripples.shift();
    }

    function pulse(i, k, gen) {
      for (var q = 0; q < pulses.length; q++) if (pulses[q].i === i) return;
      if (pulses.length < 28) pulses.push({ i: i, t: 0, k: k, gen: gen, spread: false });
    }

    // dt em ms; (px, py) o ponteiro no espaço do canvas; speed apressa a deriva
    function frame(dt, px, py, pOn, speed, on) {
      if (!W) return;
      if (!on && !dirty && !pOn) return;
      var s = Math.min(dt, 50) / 1000, n = P.length, i, p;
      if (on) {
        time += s;
        var run = 1 + Math.min(speed || 0, 3) * 1.5, span = W + 2 * M, spanY = H + 2 * M;
        for (i = 0; i < n; i++) {
          p = P[i];
          p.hx += p.vx * s * run; p.hy += p.vy * s * run;
          if (p.hx < -M) p.hx += span; else if (p.hx > W + M) p.hx -= span;
          if (p.hy < -M) p.hy += spanY; else if (p.hy > H + M) p.hy -= spanY;
        }
        ripples.forEach(function (r) { r.t += s; });
        ripples = ripples.filter(function (r) { return r.t < 2.4; });
        // um vértice à vista acende de tempos em tempos
        if (time >= nextPulse) {
          nextPulse = time + 0.8 + Math.random() * 1.2;
          for (var tries = 0; tries < 10; tries++) {
            var j = (Math.random() * n) | 0, pj = P[j];
            if (pj.hx > 0 && pj.hx < W && pj.hy > 0 && pj.hy < H && deg[j] > 1) { pulse(j, 1, 0); break; }
          }
        }
        // a energia corre pelas arestas acesas até os vizinhos, mais fraca a cada salto
        for (var q = 0; q < pulses.length; q++) {
          var pu = pulses[q];
          pu.t += s;
          if (!pu.spread && pu.t > 0.16 && pu.gen < 2) {
            pu.spread = true;
            for (var k = 0; k < live.length; k += 2) {
              if (live[k] === pu.i) pulse(live[k + 1], pu.k * 0.55, pu.gen + 1);
              else if (live[k + 1] === pu.i) pulse(live[k], pu.k * 0.55, pu.gen + 1);
            }
          }
        }
        pulses = pulses.filter(function (pu) { return pu.t < 1.3; });
      } else { ripples = []; pulses = []; }
      var R = Math.max(150, Math.max(W, H) * 0.2), R2 = R * R;
      for (i = 0; i < n; i++) {
        p = P[i];
        var tx = 0, ty = 0, hot = 0, wave = 0;
        if (pOn) {
          var ddx = px - p.hx, ddy = py - p.hy, d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1, f = 1 - d / R;
            f *= f;
            var pull = Math.min(d * 0.4, 38) * f;
            tx += ddx / d * pull; ty += ddy / d * pull;
            hot = Math.pow(1 - d / R, 1.5);
          }
        }
        for (var r = 0; r < ripples.length; r++) {
          var rp = ripples[r], rx = p.hx - rp.x, ry = p.hy - rp.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
          var band = Math.exp(-Math.pow((rd - rp.t * 560) / 52, 2)), amp = 20 * rp.k * Math.exp(-rp.t * 1.5);
          tx += rx / rd * amp * band; ty += ry / rd * amp * band;
          wave = Math.max(wave, band * rp.k * Math.exp(-rp.t * 1.1));
        }
        if (on) {
          p.ux += ((tx - p.dx) * 90 - p.ux * 12) * s;
          p.uy += ((ty - p.dy) * 90 - p.uy * 12) * s;
          p.dx += p.ux * s; p.dy += p.uy * s;
          p.h += (hot - p.h) * Math.min(1, s * 8);
          p.w += (wave - p.w) * Math.min(1, s * 14);
        } else { p.dx = tx; p.dy = ty; p.h = hot; p.w = 0; }
        p.e = 0;
      }
      pulses.forEach(function (pu) {
        var u = 1 - pu.t / 1.3;
        P[pu.i].e = Math.max(P[pu.i].e, pu.k * u * u);
      });
      draw();
      dirty = false;
    }

    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      var n = P.length, i, t, a, b, c, p;
      for (i = 0; i < n; i++) { X[i] = P[i].hx + P[i].dx; Y[i] = P[i].hy + P[i].dy; deg[i] = 0; }
      var T = delaunay(X, Y, n), fade = L * 0.3, pad = 4;
      seen.fill(0);
      live = [];

      // triângulos inteiros de lados curtos: um véu claro, e a luz do cursor e da onda por cima
      for (t = 0; t < T.length; t += 3) {
        a = T[t]; b = T[t + 1]; c = T[t + 2];
        var xa = X[a], ya = Y[a], xb = X[b], yb = Y[b], xc = X[c], yc = Y[c];
        if (Math.max(xa, xb, xc) < -pad || Math.min(xa, xb, xc) > W + pad || Math.max(ya, yb, yc) < -pad || Math.min(ya, yb, yc) > H + pad) continue;
        var mx = Math.max(Math.hypot(xb - xa, yb - ya), Math.hypot(xc - xb, yc - yb), Math.hypot(xa - xc, ya - yc));
        if (mx >= L) continue;
        var v = Math.min(1, (L - mx) / fade), pa = P[a], pb = P[b], pc = P[c];
        var hh = (pa.h + pb.h + pc.h) / 3, ww = (pa.w + pb.w + pc.w) / 3, ee = (pa.e + pb.e + pc.e) / 3;
        g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.lineTo(xc, yc); g.closePath();
        g.fillStyle = rgba(INK, v * (0.034 + 0.07 * ee));
        g.fill();
        var lit = 0.24 * hh + 0.26 * ww;
        if (lit > 0.004) { g.fillStyle = rgba(HOT, v * lit); g.fill(); }
      }

      // arestas: cada uma uma vez só, mais fortes quanto mais curtas
      g.lineWidth = 1;
      for (t = 0; t < T.length; t += 3) {
        for (var e = 0; e < 3; e++) {
          a = T[t + e]; b = T[t + (e + 1) % 3];
          var key = a < b ? a * n + b : b * n + a;
          if (seen[key]) continue;
          seen[key] = 1;
          var ex = X[b] - X[a], ey = Y[b] - Y[a], len = Math.sqrt(ex * ex + ey * ey);
          if (len >= L) continue;
          if (Math.max(X[a], X[b]) < -pad || Math.min(X[a], X[b]) > W + pad || Math.max(Y[a], Y[b]) < -pad || Math.min(Y[a], Y[b]) > H + pad) continue;
          var ve = Math.min(1, (L - len) / fade), A = P[a], B = P[b];
          var eh = (A.h + B.h) / 2, ew = (A.w + B.w) / 2, en = Math.max(A.e, B.e);
          deg[a]++; deg[b]++;
          live.push(a, b);
          var warm = eh + ew > 0.06;
          g.strokeStyle = warm ? rgba(HOT, ve * (0.12 + 0.5 * eh + 0.5 * ew + 0.4 * en)) : rgba(INK, ve * (0.15 + 0.42 * en));
          g.beginPath(); g.moveTo(X[a], Y[a]); g.lineTo(X[b], Y[b]); g.stroke();
        }
      }

      // vértices: os soltos são poeira; perto do cursor ganham um anel
      for (i = 0; i < n; i++) {
        var x = X[i], y = Y[i];
        if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
        p = P[i];
        var rad = 1.1 + 1.3 * p.h + 1.4 * p.e;
        g.fillStyle = p.h > 0.12 ? rgba(HOT, 0.45 + 0.5 * p.h) : rgba(INK, (deg[i] ? 0.34 : 0.2) + 0.55 * p.e);
        g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
        if (p.h > 0.22) {
          g.strokeStyle = rgba(HOT, 0.5 * p.h);
          g.beginPath(); g.arc(x, y, 4 + 3 * p.h, 0, TAU); g.stroke();
        }
      }

      // o pulso que nasce num vértice abre um anel
      pulses.forEach(function (pu) {
        if (pu.gen) return;
        var u = 1 - pu.t / 1.3;
        g.strokeStyle = rgba(INK, 0.4 * pu.k * u * u);
        g.beginPath(); g.arc(X[pu.i], Y[pu.i], 2 + pu.t * 24, 0, TAU); g.stroke();
      });
    }

    return { resize: resize, frame: frame, ripple: ripple, touch: function () { dirty = true; } };
  }

  global.LatticeField = { create: create };
})(window);
