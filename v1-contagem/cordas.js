/*
  Cordas de luz do título. Vêm do fundo que ficou de reserva na Interação
  (backups/interacao-opcao-b): cada corda é a mesma curva cubic-bezier esticada
  no quadro inteiro, e elas passam das bordas para cobrir o fundo todo. Paradas,
  são brancas; quando se mexem, a luz abre em R, G e B. Os pulsos de luz vêm em
  ondas ordenadas, de corda em corda, alternando a ordem e a velocidade, com uma
  pausa entre elas; a curva respira sozinha e o campo anda devagar na diagonal.
  O cursor puxa as alças da curva (as cordas de cima respondem primeiro), afasta
  as cordas perto dele e as acende, como uma lanterna passando entre elas; o
  clique belisca a corda mais próxima, o tremido se espalha pelas vizinhas e solta
  dois pulsos dali.
  Quem desenha é o relógio da página (frame), não um laço próprio.

  Desempenho: o que pesa no canvas é o número de traços, não o de pontos. Todas as
  cordas de um mesmo brilho e canal saem num traço só (6 no total), e todos os
  pulsos em mais 3. O canvas tem no máximo ~1,2 milhão de pixels; se os quadros
  passarem de ~21 ms, ele perde nitidez e detalhe antes de perder fluidez.
*/
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var RGBC = ['255, 70, 60', '70, 235, 120', '80, 130, 255'];
  var KEYS = ['x1', 'y1', 'x2', 'y2'];
  var PSEG = 10, MAXQ = 128;
  var BG = '#050505';

  // as ondas de pulsos se revezam: a ordem (de cima para baixo, de baixo para cima) e a
  // velocidade (rápida, lenta) alternam a cada uma; stagger é o atraso entre uma corda e a seguinte
  var WAVES = [
    { dir: 1, stagger: 0.045, dur: 1.0 },
    { dir: -1, stagger: 0.1, dur: 1.9 },
    { dir: 1, stagger: 0.1, dur: 1.9 },
    { dir: -1, stagger: 0.045, dur: 1.0 }
  ];
  var PAUSE = 0.55;
  function inOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

  function create(canvas) {
    // opaco: a camada não precisa ser misturada com o fundo a cada quadro
    var g = canvas.getContext ? canvas.getContext('2d', { alpha: false }) : null;
    if (!g) return null;

    // qualidade: orçamento de pixels, faixas de brilho e pontos por corda (adapt baixa os três)
    var budget = 1.2e6, levels = 2, SEG = 36;
    var W = 0, H = 0, dpr = 1, NS = 0;
    var x0 = 0, xw = 1, rise = 1, bellW = 1, push = 0, pushR = 1, gap = 1, drift = 0, along = 0;
    var cords = [], byLevel = [], X = [], Y = [];
    var QX = new Float32Array(MAXQ * (PSEG + 1)), QY = new Float32Array(MAXQ * (PSEG + 1)), items = [];
    var T = 0, flow = 0, dirty = true, dim = 0, late = 0, strikes = 0, frames = 0;
    var aimB = { x1: 0.65, y1: 0, x2: 0.35, y2: 1 };
    var ptr = { x: 0, y: 0, on: false, p: 0, sx: 0, sy: 0, lx: 0, ly: 0, speed: 0 };
    var plucks = [], bursts = [];
    var seq = null, seqN = 0;
    var out = [0, 0, 0];

    function build() {
      var keep = cords;
      cords = []; byLevel = []; X = []; Y = [];
      for (var l = 0; l < levels; l++) byLevel.push([]);
      for (var k = 0; k < NS; k++) {
        var fk = k / (NS - 1);
        // as cordas do meio brilham mais
        var lvl = Math.min(levels - 1, Math.floor((1 - Math.abs(fk - 0.5) * 2) * levels));
        var old = keep.length === NS ? keep[k] : null;
        cords.push(old || {
          b: { x1: aimB.x1, y1: aimB.y1, x2: aimB.x2, y2: aimB.y2 },
          v: { x1: 0, y1: 0, x2: 0, y2: 0 },
          fk: fk, base: 0, dx: 0, dy: 0, sp: 0, bump: 0, bv: 0, cy: 0, vib: 0, amp: [], split: 0
        });
        byLevel[lvl].push(k);
        X.push(new Float32Array(SEG + 1)); Y.push(new Float32Array(SEG + 1));
      }
    }

    function resize(w, h) {
      if (!w || !h) return;
      var d = Math.min(global.devicePixelRatio || 1, 1.5, Math.sqrt(budget / (w * h)));
      if (w === W && h === H && d === dpr) return;
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      x0 = -W * 0.04; xw = W * 1.08;
      rise = H * (W < H ? 0.24 : 0.34);
      // o campo cobre o quadro inteiro: as alças podem afundar ou passar da curva (~35% da
      // subida) e tudo anda na diagonal, então a primeira corda nasce acima do quadro e a
      // última abaixo, com folga, em qualquer coluna
      gap = H * (W < H ? 0.052 : 0.036);
      drift = gap * 1.4; along = W * (W < H ? 0.045 : 0.03);
      var top = -rise * 0.35 - drift - along - gap, bot = H + rise * 1.35 + drift + along + gap;
      var n = Math.min(64, Math.ceil((bot - top) / gap) + 1);
      // com outro número de cordas, a onda em curso e os beliscões apontariam para cordas que não
      // existem mais: recomeçam do zero
      if (n !== NS) { NS = n; cords = []; build(); seq = null; plucks.length = 0; bursts.length = 0; }
      bellW = Math.max(100, W * 0.12);
      push = H * 0.075; pushR = H * 0.1;
      cords.forEach(function (cd, k) { cd.base = top + gap * k; });
      dirty = true;
    }

    // a curva que as cordas perseguem: respira sozinha e se inclina para o cursor
    function aim(live) {
      var s = live ? T : 0, p = ptr.p, u = W ? ptr.sx / W - 0.5 : 0, w = H ? 0.5 - ptr.sy / H : 0;
      aimB.x1 = clamp(0.65 + 0.07 * Math.sin(s * 0.31) + u * 0.5 * p, 0, 1);
      aimB.y1 = 0.12 * Math.sin(s * 0.23 + 1) - w * 0.7 * p;
      aimB.x2 = clamp(0.35 + 0.07 * Math.sin(s * 0.27 + 2) + u * 0.5 * p, 0, 1);
      aimB.y2 = 1 + 0.12 * Math.sin(s * 0.19 + 3) + w * 0.7 * p;
    }

    // onde a corda (sem os empurrões) cruza a coluna px: devolve a altura e guarda o u em out[2]
    function cordYAt(cd, px) {
      var b = cd.b, xf = (px - cd.dx - x0) / xw, lo = 0, hi = 1, u = 0.5, mu;
      for (var i = 0; i < 14; i++) {
        u = (lo + hi) / 2; mu = 1 - u;
        if (3 * mu * mu * u * b.x1 + 3 * mu * u * u * b.x2 + u * u * u < xf) lo = u; else hi = u;
      }
      mu = 1 - u; out[2] = u;
      return cd.base + cd.dy - (3 * mu * mu * u * b.y1 + 3 * mu * u * u * b.y2 + u * u * u) * rise;
    }

    function step(dt) {
      var s = Math.min(dt, 50) / 1000;
      // o cursor: posição suavizada, presença e velocidade (telas por segundo)
      ptr.p += ((ptr.on ? 1 : 0) - ptr.p) * (1 - Math.exp(-dt / 260));
      if (ptr.on) {
        var mv = Math.hypot(ptr.x - ptr.lx, ptr.y - ptr.ly) / Math.max(W, H) / Math.max(s, 0.004);
        ptr.speed += (Math.min(mv, 6) - ptr.speed) * (1 - Math.exp(-dt / 90));
        var pk = 1 - Math.exp(-dt / 70);
        ptr.sx += (ptr.x - ptr.sx) * pk; ptr.sy += (ptr.y - ptr.sy) * pk;
      } else ptr.speed *= Math.exp(-dt / 220);
      ptr.lx = ptr.x; ptr.ly = ptr.y;

      var near = ptr.p > 0.01, k, cd;
      for (k = 0; k < NS; k++) {
        cd = cords[k];
        // as de cima são mais duras e chegam antes; as de baixo atrasam e balançam
        var stiff = 170 - 130 * k / Math.max(1, NS - 1), damp = Math.sqrt(stiff), sp = 0;
        for (var i = 0; i < 4; i++) {
          var key = KEYS[i];
          cd.v[key] += ((aimB[key] - cd.b[key]) * stiff - cd.v[key] * damp) * s;
          cd.b[key] += cd.v[key] * s;
          sp += Math.abs(cd.v[key]);
        }
        // o campo anda na diagonal: uma onda lenta leva cada corda ao longo da própria subida
        // (para cima e para a direita, e de volta), passando de uma corda à outra, e o conjunto
        // todo balança devagar na perpendicular
        var ph = T * 0.5 + k * 0.23, sw = Math.sin(T * 0.23) * drift, al = along * Math.sin(ph);
        cd.dx = 0.8 * al + 0.6 * sw;
        cd.dy = -0.6 * al + 0.8 * sw;
        // o cursor afasta as cordas perto dele; quando ele sai, elas voltam balançando
        var want = 0;
        if (near) {
          cd.cy = cordYAt(cd, ptr.sx);
          var q = (ptr.sy - cd.cy) / pushR;
          want = -push * 2.33 * q * Math.exp(-q * q) * ptr.p;
        }
        cd.bv += ((want - cd.bump) * 90 - cd.bv * 9) * s;
        cd.bump += cd.bv * s;
        cd.sp = sp + Math.abs(cd.bv) / H * 2.5;
      }

      // os beliscões: cada um treme a corda dele e, com atraso, as vizinhas
      for (var j = plucks.length - 1; j >= 0; j--) if (T - plucks[j].t0 > 3) plucks.splice(j, 1);
      for (j = bursts.length - 1; j >= 0; j--) if (T - bursts[j].t0 > 1.6) bursts.splice(j, 1);
      for (k = 0; k < NS; k++) {
        cd = cords[k];
        cd.vib = 0; cd.amp.length = plucks.length;
        for (var n = 0; n < plucks.length; n++) {
          var pl = plucks[n], dk = Math.abs(k - pl.k), tk = T - pl.t0 - dk * 0.035, a = 0;
          if (tk > 0) {
            a = pl.a * Math.exp(-tk * 1.8) * Math.exp(-dk / 5) * Math.min(1, tk / 0.04);
            cd.vib += Math.abs(a);
            a *= Math.sin(tk * TAU * 2.4);
          }
          cd.amp[n] = a;
        }
      }
    }

    function settle() {
      cords.forEach(function (cd) {
        KEYS.forEach(function (key) { cd.b[key] = aimB[key]; cd.v[key] = 0; });
        cd.sp = 0; cd.bump = 0; cd.bv = 0; cd.vib = 0; cd.amp.length = 0; cd.dx = 0; cd.dy = 0;
      });
      plucks.length = 0; bursts.length = 0;
    }

    // um ponto da corda em u, com o empurrão do cursor e o tremido dos beliscões
    function point(cd, u) {
      var b = cd.b, mu = 1 - u, a = 3 * mu * mu * u, bb = 3 * mu * u * u, cc = u * u * u;
      var xf = a * b.x1 + bb * b.x2 + cc, yf = a * b.y1 + bb * b.y2 + cc;
      var px = x0 + xf * xw + cd.dx, py = cd.base + cd.dy - yf * rise;
      if (cd.bump > 0.05 || cd.bump < -0.05) { var e = (px - ptr.sx) / bellW; py += cd.bump * Math.exp(-e * e); }
      for (var n = 0; n < cd.amp.length; n++) {
        var am = cd.amp[n];
        if (am > 0.05 || am < -0.05) {
          // a corda presa nas pontas: o tremido é maior no ponto beliscado
          var pl = plucks[n], sh = xf < pl.x ? xf / pl.x : (1 - xf) / (1 - pl.x);
          py += am * Math.sin(clamp(sh, 0, 1) * Math.PI / 2);
        }
      }
      out[0] = px; out[1] = py; out[2] = yf;
    }

    // guarda um trecho de pulso (de u0 a u1) para o traço único do fim; fan é quanto ele abre em cor
    function pulse(cd, u0, u1, fan) {
      var slot = items.length >> 1;
      if (slot >= MAXQ) return 0;
      var o = slot * (PSEG + 1), ys = 0, ye = 0;
      for (var s = 0; s <= PSEG; s++) {
        point(cd, clamp(u0 + (u1 - u0) * s / PSEG, 0, 1));
        QX[o + s] = out[0]; QY[o + s] = out[1];
        if (!s) ys = out[2]; else ye = out[2];
      }
      items.push(o, fan);
      return Math.abs(ye - ys);
    }

    // as cordas que aparecem em alguma parte do quadro, de cima para baixo
    function shown() {
      var ids = [];
      for (var k = 0; k < NS; k++) {
        if (cordYAt(cords[k], W) < H + gap && cordYAt(cords[k], 0) > -gap) ids.push(k);
      }
      return ids;
    }
    // o relógio dos pulsos: parado, um instante fixo no meio da primeira onda
    function seqTime(live, make) {
      if (!seq || (live && flow > seq.end + PAUSE)) seq = make(live ? flow : 0);
      return live ? flow : seq.t0 + (seq.end - seq.t0) * 0.42;
    }

    // ondas: as cordas disparam em ordem, uma depois da outra, cada pulso acelerando e freando
    // pelo quadro; só uma onda por vez, com uma pausa entre elas
    function makeWave(t) {
      var w = WAVES[seqN++ % WAVES.length], ids = shown();
      if (w.dir < 0) ids.reverse();
      return { t0: t, ids: ids, w: w, end: t + Math.max(0, ids.length - 1) * w.stagger + w.dur };
    }
    function wavePulses(live) {
      var t = seqTime(live, makeWave), w = seq.w;
      for (var i = 0; i < seq.ids.length; i++) {
        var p = (t - seq.t0 - i * w.stagger) / w.dur;
        if (p <= 0 || p >= 1 || !cords[seq.ids[i]]) continue;
        var e = inOut(p), len = 0.11 * Math.min(1, p * 6, (1 - p) * 6);
        var climb = pulse(cords[seq.ids[i]], e - len, e, 0);
        items[items.length - 1] = Math.min(10, 1.2 + climb * 30);
      }
    }

    // o trecho da corda k entre as colunas xa e xb
    function tracePart(k, xa, xb) {
      var xs = X[k], ys = Y[k], on = false;
      for (var s = 0; s <= SEG; s++) {
        if (xs[s] < xa || xs[s] > xb) { if (on) break; continue; }
        if (on) g.lineTo(xs[s], ys[s]); else { g.moveTo(xs[s], ys[s]); on = true; }
      }
    }

    function draw(live) {
      var k, s, cd, xs, ys, l, chn, i;
      for (k = 0; k < NS; k++) {
        cd = cords[k]; xs = X[k]; ys = Y[k];
        for (s = 0; s <= SEG; s++) { point(cd, s / SEG); xs[s] = out[0]; ys[s] = out[1]; }
        cd.split = Math.min(18, 0.7 + cd.sp * 10 + cd.vib * 0.4);
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = BG;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // na segunda parada a luz apaga um pouco, para o texto ler
      g.globalAlpha = 1 - dim;
      g.lineCap = 'round'; g.lineJoin = 'round';
      // traço de menos de 1 pixel do canvas: o navegador desenha linhas finas por um caminho rápido;
      // a partir de 1 px (mesmo 1,0000001, por arredondamento) cada traço vira um polígono e pesa
      var hair = 0.92 / dpr;
      g.lineWidth = hair;
      for (l = 0; l < levels; l++) {
        var ids = byLevel[l];
        if (!ids.length) continue;
        var alpha = (0.12 + 0.1 * (l + 0.5) / levels).toFixed(3);
        for (chn = 0; chn < 3; chn++) {
          g.strokeStyle = 'rgba(' + RGBC[chn] + ', ' + alpha + ')';
          g.beginPath();
          for (i = 0; i < ids.length; i++) {
            k = ids[i]; xs = X[k]; ys = Y[k];
            var off = (chn - 1) * cords[k].split;
            g.moveTo(xs[0], ys[0] + off);
            for (s = 1; s <= SEG; s++) g.lineTo(xs[s], ys[s] + off);
          }
          g.stroke();
        }
      }

      // as cordas-guia apagam mais no meio do quadro, onde fica o texto; os pulsos, a luz do
      // cursor e os beliscões vêm depois, por cima, com o brilho inteiro
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.setTransform(dpr * W * 0.56, 0, 0, dpr * H * 0.56, dpr * W / 2, dpr * H / 2);
      var cg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      cg.addColorStop(0, 'rgba(5, 5, 5, 0.6)');
      cg.addColorStop(0.55, 'rgba(5, 5, 5, 0.38)');
      cg.addColorStop(1, 'rgba(5, 5, 5, 0)');
      g.fillStyle = cg;
      g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1 - dim;

      // a luz do cursor: as cordas perto dele acendem em branco, num traço só com degradê;
      // as que tremem de um beliscão acendem também
      var reach = Math.max(180, W * 0.2), n = 0;
      g.lineWidth = hair;
      if (ptr.p > 0.02) {
        var gr = g.createRadialGradient(ptr.sx, ptr.sy, 0, ptr.sx, ptr.sy, reach);
        gr.addColorStop(0, 'rgba(255, 255, 255, ' + (0.95 * ptr.p).toFixed(3) + ')');
        gr.addColorStop(0.4, 'rgba(255, 255, 255, ' + (0.42 * ptr.p).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255, 255, 255, 0)');
        g.strokeStyle = gr;
        g.beginPath();
        for (k = 0; k < NS; k++) {
          if (Math.abs(cords[k].cy - ptr.sy) > reach + push) continue;
          tracePart(k, ptr.sx - reach, ptr.sx + reach); n++;
        }
        // o mesmo traço duas vezes: na mistura aditiva, as linhas perto do cursor chegam ao branco
        if (n) { g.stroke(); g.stroke(); }
      }
      n = 0;
      g.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      g.beginPath();
      for (k = 0; k < NS; k++) if (cords[k].vib > 6) { tracePart(k, -1e9, 1e9); n++; }
      if (n) g.stroke();

      items.length = 0;
      wavePulses(live);
      // os pulsos do beliscão saem do ponto tocado, um para cada lado, pelas cordas vizinhas;
      // apagam encurtando, para irem no mesmo traço dos outros
      for (i = 0; i < bursts.length; i++) {
        var bu = bursts[i], age = T - bu.t0, fade = Math.max(0, 1 - age / 1.6);
        for (var dk = -3; dk <= 3; dk++) {
          k = bu.k + dk;
          var a2 = age - Math.abs(dk) * 0.06;
          if (k < 0 || k >= NS || a2 <= 0) continue;
          var bl = 0.09 * fade * (1 - Math.abs(dk) / 4);
          for (var dir = -1; dir <= 1; dir += 2) {
            var head = bu.u + dir * a2 * 0.75;
            if (head > -0.1 && head < 1.1) pulse(cords[k], head - dir * bl, head, 6 * fade);
          }
        }
      }
      if (items.length) {
        g.lineWidth = 2.2;
        for (chn = 0; chn < 3; chn++) {
          g.strokeStyle = 'rgba(' + RGBC[chn] + ', 0.85)';
          g.beginPath();
          for (i = 0; i < items.length; i += 2) {
            var o = items[i], fan = (chn - 1) * items[i + 1];
            g.moveTo(QX[o], QY[o]);
            for (s = 1; s <= PSEG; s++) g.lineTo(QX[o + s], QY[o + s] + fan * s / PSEG);
          }
          g.stroke();
        }
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // quadros lentos (o tempo entre um e outro, não só o do script: o que pesa é a placa de vídeo):
    // primeiro menos pixels, depois uma faixa de brilho só, depois menos pontos
    function adapt(dt) {
      // a entrada (fonte chegando, letras se revelando) não conta, nem um tranco solto:
      // baixa quando, duas janelas seguidas, mais de 1 em cada 8 de 64 quadros passa de 22 ms
      if (T < 3 || dt > 120) return;
      if (dt > 22) late++;
      if (++frames < 64) return;
      strikes = late > 8 ? strikes + 1 : 0;
      frames = 0; late = 0;
      if (strikes < 2) return;
      strikes = 0;
      var w = W, h = H;
      if (budget > 0.7e6) { budget = 0.7e6; W = 0; resize(w, h); }
      else if (levels > 1) { levels = 1; build(); }
      else if (SEG > 24) { SEG = 24; build(); }
    }

    // dm: quanto a luz apaga (0 a 1)
    function frame(dt, v, dm, live) {
      if (!W) return;
      if (Math.abs(dm - dim) > 0.002) { dim = dm; dirty = true; }
      if (!live) {
        if (!dirty) return;
        dirty = false; ptr.p = 0; ptr.speed = 0;
        aim(false); settle(); seq = null; draw(false);
        return;
      }
      var s = Math.min(dt, 50) / 1000;
      T += s;
      flow += s * (1 + clamp(v || 0, 0, 3) * 0.9 + ptr.speed * 0.3);
      aim(true); step(dt); draw(true);
      dirty = true;
      adapt(dt);
    }

    function pointer(x, y, on) {
      if (on && !ptr.on) {
        ptr.lx = x; ptr.ly = y;
        if (ptr.p < 0.05) { ptr.sx = x; ptr.sy = y; }
      }
      ptr.x = x; ptr.y = y; ptr.on = on;
    }

    function pluck(x, y) {
      if (!NS) return;
      var best = 0, bd = Infinity, bu = 0.5;
      for (var k = 0; k < NS; k++) {
        var d = Math.abs(cordYAt(cords[k], x) - y);
        if (d < bd) { bd = d; best = k; bu = out[2]; }
      }
      plucks.push({ x: clamp((x - x0) / xw, 0.05, 0.95), k: best, t0: T, a: clamp(H / 800, 0.6, 1.3) * 44 });
      bursts.push({ k: best, u: bu, t0: T });
      if (plucks.length > 4) plucks.shift();
      if (bursts.length > 4) bursts.shift();
    }

    return { resize: resize, frame: frame, pointer: pointer, pluck: pluck, touch: function () { dirty = true; } };
  }

  global.LightCords = { create: create };
})(window);
