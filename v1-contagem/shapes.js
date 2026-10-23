/*
  Formas do quadro de Design: círculos, quadrados, triângulos, um anel e um
  meio disco, semiopacos, com uma física simples. Elas vagam, batem nas bordas
  do quadro (que muda de proporção e as empurra), batem umas nas outras,
  desviam da forma fluida e são repelidas pelo texto e pelo mouse.
  Toda forma colide como um círculo; o desenho gira por cima.
*/
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var COLORS = ['#ffa64d', '#2c4bd1', '#e4472b', '#f4f2ec'];
  var KINDS = [
    ['circle', 0, 0.085], ['square', 1, 0.07], ['tri', 2, 0.082], ['ring', 1, 0.062],
    ['square', 3, 0.056], ['circle', 2, 0.05], ['tri', 0, 0.06], ['half', 3, 0.07]
  ];
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  function create(canvas) {
    var g = canvas.getContext && canvas.getContext('2d');
    if (!g) return null;
    var W = 0, H = 0, dpr = 1, m = 100;
    var rects = [], circles = [];
    var S = KINDS.map(function (d) {
      return { kind: d[0], col: COLORS[d[1]], sf: d[2], x: 0, y: 0, r: 10,
        vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
        a: Math.random() * TAU, av: (Math.random() - 0.5) * 0.8,
        wa: Math.random() * TAU, wt: Math.random() * 2, placed: false };
    });

    function bounds(w, h) {
      var d = Math.min(global.devicePixelRatio || 1, 2);
      if (Math.round(w) !== W || Math.round(h) !== H || d !== dpr) {
        W = Math.round(w); H = Math.round(h); dpr = d;
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
      }
      m = Math.max(40, Math.min(W, H));
      S.forEach(function (o, i) {
        o.r = o.sf * m;
        if (!o.placed) {
          // começam espalhadas pela metade de baixo e pelas bordas, longe do texto
          o.x = W * (0.12 + 0.76 * ((i * 0.618) % 1));
          o.y = H * (0.18 + 0.64 * ((i * 0.382 + 0.2) % 1));
          o.placed = true;
        }
      });
    }

    // retângulos do texto e círculos (a forma fluida), no espaço do quadro
    function obstacles(r, c) { rects = r; circles = c; }

    function step(s, px, py, pOn) {
      var i, j, o;
      for (i = 0; i < S.length; i++) {
        o = S[i];
        // um vento próprio que muda de direção de vez em quando
        o.wt -= s;
        if (o.wt <= 0) { o.wa = Math.random() * TAU; o.wt = 1.4 + Math.random() * 2.4; }
        o.vx += Math.cos(o.wa) * 0.34 * m * s;
        o.vy += Math.sin(o.wa) * 0.34 * m * s;
        var sp = Math.hypot(o.vx, o.vy), want = 0.2 * m;
        var damp = sp > want ? 1.8 : 0.25;
        o.vx -= o.vx * damp * s; o.vy -= o.vy * damp * s;

        if (pOn) {
          var mx = o.x - px, my = o.y - py, md = Math.hypot(mx, my) || 1, MR = 0.34 * m + o.r;
          if (md < MR) { var mf = 1 - md / MR; o.vx += mx / md * mf * 11 * m * s; o.vy += my / md * mf * 11 * m * s; }
        }

        for (j = 0; j < rects.length; j++) {
          var rc = rects[j];
          var nx = clamp(o.x, rc.x, rc.x + rc.w), ny = clamp(o.y, rc.y, rc.y + rc.h);
          var dx = o.x - nx, dy = o.y - ny, d = Math.hypot(dx, dy), pad = o.r + 0.07 * m;
          if (d === 0) {
            // dentro do texto: sai pela borda mais perto
            var l = o.x - rc.x, rr = rc.x + rc.w - o.x, t = o.y - rc.y, b = rc.y + rc.h - o.y;
            var mn = Math.min(l, rr, t, b), k = 40 * m * s;
            if (mn === l) o.vx -= k; else if (mn === rr) o.vx += k; else if (mn === t) o.vy -= k; else o.vy += k;
          } else if (d < pad) {
            var f = (pad - d) / pad;
            o.vx += dx / d * f * 34 * m * s; o.vy += dy / d * f * 34 * m * s;
            // perto demais: a forma também é empurrada para fora
            if (d < o.r) { o.x += dx / d * (o.r - d) * 0.25; o.y += dy / d * (o.r - d) * 0.25; }
          }
        }

        for (j = 0; j < circles.length; j++) {
          var c = circles[j], cx = o.x - c.x, cy = o.y - c.y, cd = Math.hypot(cx, cy) || 1, cm = c.r + o.r;
          if (cd < cm) {
            var ux = cx / cd, uy = cy / cd;
            o.x = c.x + ux * cm; o.y = c.y + uy * cm;
            var vn = o.vx * ux + o.vy * uy;
            if (vn < 0) { o.vx -= 1.7 * vn * ux; o.vy -= 1.7 * vn * uy; o.av += (o.vx * uy - o.vy * ux) * 0.004; }
          }
        }

        o.x += o.vx * s; o.y += o.vy * s;
        o.a += o.av * s; o.av -= o.av * 0.35 * s;

        if (o.x < o.r) { o.x = o.r; if (o.vx < 0) { o.vx = -o.vx * 0.82; o.av += o.vy * 0.003; } }
        if (o.x > W - o.r) { o.x = W - o.r; if (o.vx > 0) { o.vx = -o.vx * 0.82; o.av -= o.vy * 0.003; } }
        if (o.y < o.r) { o.y = o.r; if (o.vy < 0) { o.vy = -o.vy * 0.82; o.av -= o.vx * 0.003; } }
        if (o.y > H - o.r) { o.y = H - o.r; if (o.vy > 0) { o.vy = -o.vy * 0.82; o.av += o.vx * 0.003; } }
      }
      // as formas batem umas nas outras
      for (i = 0; i < S.length; i++) {
        for (j = i + 1; j < S.length; j++) {
          var A = S[i], B = S[j], ex = B.x - A.x, ey = B.y - A.y, ed = Math.hypot(ex, ey), em = A.r + B.r;
          if (ed > 0 && ed < em) {
            var qx = ex / ed, qy = ey / ed, ov = (em - ed) / 2;
            A.x -= qx * ov; A.y -= qy * ov; B.x += qx * ov; B.y += qy * ov;
            var rv = (B.vx - A.vx) * qx + (B.vy - A.vy) * qy;
            if (rv < 0) {
              var imp = -1.85 * rv / 2;
              A.vx -= imp * qx; A.vy -= imp * qy; B.vx += imp * qx; B.vy += imp * qy;
              var tang = (B.vx - A.vx) * -qy + (B.vy - A.vy) * qx;
              A.av -= tang * 0.004; B.av += tang * 0.004;
            }
          }
        }
      }
    }

    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      S.forEach(function (o) {
        var r = o.r;
        g.save();
        g.translate(o.x, o.y);
        g.rotate(o.a);
        g.globalAlpha = 0.8;
        g.fillStyle = o.col;
        g.strokeStyle = o.col;
        g.beginPath();
        if (o.kind === 'circle') { g.arc(0, 0, r, 0, TAU); g.fill(); }
        else if (o.kind === 'square') { var q = r * 1.55; g.rect(-q / 2, -q / 2, q, q); g.fill(); }
        else if (o.kind === 'tri') {
          var R = r * 1.18;
          for (var k = 0; k < 3; k++) { var th = -Math.PI / 2 + k * TAU / 3; if (k) g.lineTo(R * Math.cos(th), R * Math.sin(th)); else g.moveTo(R * Math.cos(th), R * Math.sin(th)); }
          g.closePath(); g.fill();
        }
        else if (o.kind === 'ring') { g.lineWidth = r * 0.34; g.arc(0, 0, r * 0.83, 0, TAU); g.stroke(); }
        else { g.arc(0, r * 0.3, r, Math.PI, TAU); g.closePath(); g.fill(); }
        g.restore();
      });
    }

    return {
      bounds: bounds,
      obstacles: obstacles,
      frame: function (dt, live, px, py, pOn) {
        if (live) {
          var total = Math.min(dt, 64) / 1000, n = Math.max(1, Math.ceil(total / 0.008));
          for (var i = 0; i < n; i++) step(total / n, px, py, pOn);
        }
        draw();
      },
      // sem animação: roda a física em silêncio até assentar e desenha uma vez
      settle: function () {
        for (var i = 0; i < 360; i++) step(1 / 120, 0, 0, false);
        S.forEach(function (o) { o.vx *= 0.2; o.vy *= 0.2; });
        draw();
      }
    };
  }

  global.ShapeField = { create: create };
})(window);
