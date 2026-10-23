/*
  Versão 1 · Contagem: as cenas.

  Aqui mora o conteúdo de cada capítulo (título, Design, Interação, a pasta dos
  trabalhos, os vídeos e o fechamento) e o relógio mestre que anima tudo. Quem
  decide onde cada cena está e quanto dela já passou é a rolagem (v1.js): ela
  chama V1Cenas.create(motor) e, a cada quadro, diz o progresso de cada cena
  (p, de 0 a 1) e se ela está à vista.

  motor:
    overview()   true enquanto um mapa geral estiver aberto (a rolagem não tem um)
    goWork(k)    leva até o vídeo k
    goChapter(i) leva até o capítulo i (0 é o título)
    opaque       true se cada cena pinta o próprio fundo
*/
(function (global) {
  'use strict';

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var M = { ease: {
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); }
  } };

  function create(E) {
    var S = global.SITE, Site = global.Site;
    var doc = document, root = doc.documentElement;
    var $ = function (s, el) { return (el || doc).querySelector(s); };
    var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };

    Site.addStrings({
      'v1.lead': 'Design, edição, motion e web.',
      'v1.box': 'Clique, arraste, faça o que quiser!',
      'v1.box.zone': 'ARREMESSE',
      'v1.design.title': 'Design',
      'v1.design.caption': 'Organizamos o caos para criar forma, desmontamos a forma para gerar movimento…',
      'v1.design.sub': 'E o caos volta se tornar design!',
      'v1.design.formats': 'Formatos',
      'v1.design.claim': 'A arte de brincar com o:',
      'v1.design.caos': 'caos',
      'v1.design.caosLabel': 'caos: ordenar ou desordenar as letras',
      'v1.design.handle': 'Proporção do quadro. Use as setas para mudar.',
      'v1.design.sr': 'Um quadro com uma forma fluida e uma frase em corrente: movimento gera forma, forma gera movimento. Embaixo: e o caos volta se tornar design! A composição se reorganiza em cada proporção.',
      'v1.w.motion': 'movimento',
      'v1.w.makes': 'gera',
      'v1.w.form': 'forma',
      'v1.works.sr': 'A abertura dos trabalhos: uma pasta de vidro com os trabalhos dentro. Um ponto percorre um arco e cai dentro dela, e a cada queda uma folha sobe. Abrir a pasta espalha as folhas, e cada folha leva direto ao vídeo daquele trabalho.',
      'v1.works.folder': 'Vídeos',
      'v1.works.items': '{n} trabalhos',
      'v1.works.open': 'Abrir a pasta',
      'v1.works.close': 'Fechar a pasta',
      'v1.works.watch': 'Ver o vídeo',
      'v1.works.openNote': 'abrir',
      'v1.play.title': 'Colorir é uma dança',
      'v1.play.line': 'E a interação é o que cria a experiência',
      'v1.play.graph': 'Editor de curva de tempo',
      'v1.play.presets': 'Curvas prontas',
      'v1.play.cor': 'Cor',
      'v1.play.mess': 'bagunce',
      'v1.curve.linear': 'Linear',
      'v1.curve.soft': 'Suave',
      'v1.curve.out': 'Saída',
      'v1.curve.back': 'Elástico',
      'v1.handle': 'Alça {n}: tempo {x}, valor {y}. Use as setas para mover.',
      'v1.credits': 'Créditos',
      'v1.end': 'Fim',
      'v1.restart': 'Do início',
      'v1.of': 'de',
      'v1.soon': 'em breve'
    }, {
      'v1.lead': 'Design, editing, motion and web.',
      'v1.box': 'Click, drag, do whatever you want!',
      'v1.box.zone': 'THROW IT',
      'v1.design.title': 'Design',
      'v1.design.caption': 'We organize chaos to create form, then take form apart to generate motion…',
      'v1.design.sub': 'And chaos turns back into design!',
      'v1.design.formats': 'Formats',
      'v1.design.claim': 'The art of playing with:',
      'v1.design.caos': 'chaos',
      'v1.design.caosLabel': 'chaos: put the letters in order or scramble them',
      'v1.design.handle': 'Frame proportion. Use the arrow keys to change it.',
      'v1.design.sr': 'A frame with a fluid shape and a chained phrase: motion makes form, form makes motion. Below it: and chaos turns back into design! The composition rearranges for each proportion.',
      'v1.w.motion': 'motion',
      'v1.w.makes': 'makes',
      'v1.w.form': 'form',
      'v1.works.sr': 'The opening of the work chapter: one glass folder with the work inside. A dot travels an arc and drops into it, and each drop lifts a sheet. Opening the folder fans the sheets out, and each sheet leads straight to that video.',
      'v1.works.folder': 'Videos',
      'v1.works.items': '{n} pieces',
      'v1.works.open': 'Open the folder',
      'v1.works.close': 'Close the folder',
      'v1.works.watch': 'Watch the video',
      'v1.works.openNote': 'open',
      'v1.play.title': 'Coloring is a dance',
      'v1.play.line': 'And interaction is what creates the experience',
      'v1.play.graph': 'Timing curve editor',
      'v1.play.presets': 'Preset curves',
      'v1.play.cor': 'Color',
      'v1.play.mess': 'mess it up',
      'v1.curve.linear': 'Linear',
      'v1.curve.soft': 'Smooth',
      'v1.curve.out': 'Ease out',
      'v1.curve.back': 'Elastic',
      'v1.handle': 'Handle {n}: time {x}, value {y}. Use the arrow keys to move it.',
      'v1.credits': 'Credits',
      'v1.end': 'End',
      'v1.restart': 'From the top',
      'v1.of': 'of',
      'v1.soon': 'coming soon'
    });

    var t = Site.t;
    var motionOn = function () { return Site.motion(); };

    /* ---------- Trabalhos e créditos ---------- */

    var worksHost = $('[data-works]');
    var reelLabels = [];
    S.works.forEach(function (w, i) {
      var el = doc.createElement('div');
      el.className = 'reel';
      el.setAttribute('data-hash', 'trabalho-' + (i + 1));
      el.setAttribute('data-scene', 'reel' + i);
      el.setAttribute('role', 'group');
      el.innerHTML = '<div class="reel-label"><strong></strong><span></span></div><div class="reel-window"><div class="reel-screen"></div></div>';
      var media = Site.workMedia(w, i);
      // sem o vídeo, o espaço vira uma ponta de filme contando até ele
      $('.work-ph', media).insertAdjacentHTML('afterbegin',
        '<svg class="ph-leader" viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<rect x="-400" y="-400" width="800" height="800" class="ph-bg"/><path class="ph-sweep" d=""/>' +
        '<line x1="-400" y1="0" x2="400" y2="0" class="ph-cross"/><line x1="0" y1="-400" x2="0" y2="400" class="ph-cross"/>' +
        '<circle r="78" class="ph-ring1"/><circle r="66" class="ph-ring2"/></svg>' +
        '<span class="ph-num" aria-hidden="true">3</span><span class="ph-cap"></span>');
      $('.reel-screen', el).appendChild(media);
      // a janela segue a proporção do arquivo: sem faixas pretas em volta do vídeo
      var vid = $('video', media);
      if (vid) vid.addEventListener('loadedmetadata', function () {
        if (vid.videoWidth && vid.videoHeight) el.style.setProperty('--ar', (vid.videoWidth / vid.videoHeight).toFixed(4));
      });
      worksHost.appendChild(el);
      reelLabels.push({ el: el, title: $('strong', el), count: $('.reel-label span', el), work: w, i: i,
        media: media, num: $('.ph-num', media), sweep: $('.ph-sweep', media), cap: $('.ph-cap', media), p: 0, vis: false });
    });

    function tickPlaceholders(T) {
      reelLabels.forEach(function (r) {
        var missing = r.media.classList.contains('is-missing');
        if (missing !== r.el.classList.contains('has-missing')) renderReelLabels();
        if (!missing || !r.vis) return;
        var k = 3 - (Math.floor(T) % 3);
        if (r.num.textContent !== String(k)) r.num.textContent = k;
        r.sweep.setAttribute('d', wedge(T % 1));
      });
    }

    function renderReelLabels() {
      var lang = Site.lang();
      reelLabels.forEach(function (r) {
        var title = r.work.title[lang] || r.work.title.pt;
        r.title.textContent = title;
        r.count.textContent = pad(r.i + 1) + ' ' + t('v1.of') + ' ' + pad(S.works.length);
        r.el.setAttribute('aria-label', t('ch.works') + ': ' + title);
        r.cap.textContent = '';
        var missing = r.media.classList.contains('is-missing');
        r.el.classList.toggle('has-missing', missing);
        r.title.textContent = missing ? title + ' · ' + t('v1.soon') : title;
      });
    }

    var socialsHost = $('[data-socials]');
    function renderSocials() {
      socialsHost.innerHTML = '';
      S.socials.forEach(function (s) {
        var li = doc.createElement('li');
        var value = s.handle || (s.url ? s.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : t('social.draft'));
        if (s.url) {
          var a = doc.createElement('a');
          a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
          a.innerHTML = '<span class="c-label"></span><span class="c-value"></span>';
          $('.c-label', a).textContent = s.label;
          $('.c-value', a).textContent = value;
          li.appendChild(a);
        } else {
          li.innerHTML = '<span class="c-label"></span><span class="c-value is-draft"></span>';
          $('.c-label', li).textContent = s.label;
          $('.c-value', li).textContent = value;
        }
        socialsHost.appendChild(li);
      });
    }

    $('[data-photo]').appendChild(Site.img(S.photo, S.name));
    Site.mark($('.mark'));

    function renderRolesText() {
      var roles = S.roles[Site.lang()];
      $('[data-roles-text]').textContent = roles.join(', ');
      $('[data-roles-line]').textContent = roles.join(' · ');
      var st = $('.roles-static');
      if (st) st.textContent = roles.join(' · ');
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    var nW = S.works.length;
    var TAU = Math.PI * 2;
    function wrapPi(d) { while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
    var WHITE = '237,237,234', TUNG = '255,166,77';

    /* ponteiro do mouse: torce a luz do título, puxa a malha e a forma */
    var ptr = { x: 0, y: 0, on: false, down: false, mouse: false };
    global.addEventListener('pointermove', function (e) {
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.mouse = e.pointerType === 'mouse';
      ptr.on = ptr.mouse || ptr.down;
    }, { passive: true });
    global.addEventListener('pointerdown', function (e) { ptr.down = true; ptr.on = true; ptr.x = e.clientX; ptr.y = e.clientY; ptr.mouse = e.pointerType === 'mouse'; }, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      global.addEventListener(ev, function (e) { ptr.down = false; if (e.pointerType !== 'mouse') ptr.on = false; });
    });
    doc.documentElement.addEventListener('pointerleave', function () { ptr.on = false; });
    global.addEventListener('blur', function () { ptr.on = false; ptr.down = false; });

    /* ---------- Título ---------- */

    var title = $('.frame--title');
    var nameLines = $$('.name-line', title);
    nameLines.forEach(function (line) {
      var txt = line.textContent;
      line.textContent = '';
      line.setAttribute('aria-label', txt);
      txt.split('').forEach(function (c, i) {
        var s = doc.createElement('span');
        s.className = 'ch';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = c;
        s.style.transitionDelay = (120 + i * 38) + 'ms';
        line.appendChild(s);
      });
    });

    var measurer = doc.createElement('span');
    measurer.className = 'name-measure';
    measurer.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(measurer);
    function textWidth(txt) { measurer.textContent = txt; return measurer.getBoundingClientRect().width || 1; }

    function fitName() {
      var fw = title.clientWidth, fh = title.clientHeight;
      if (!fw) return;
      var target = fw * 0.88;
      var sizes = nameLines.map(function (line) { return 100 * target / textWidth(line.getAttribute('aria-label')); });
      var total = sizes.reduce(function (s, v) { return s + v * 0.86; }, 0);
      var k = Math.min(1, (fh * 0.66) / total);
      nameLines.forEach(function (line, i) { line.style.fontSize = (sizes[i] * k).toFixed(2) + 'px'; });
      layoutTitle();
    }

    /* papéis em células fixas: muda a letra, a célula fica */
    var rolesP = $('.roles');
    var cellsEl = $('.cells', rolesP);
    var staticRoles = doc.createElement('span');
    staticRoles.className = 'roles-static';
    rolesP.appendChild(staticRoles);
    var nCells = 0;
    ['pt', 'en'].forEach(function (l) { S.roles[l].forEach(function (r) { nCells = Math.max(nCells, r.length); }); });
    var cells = [];
    for (var c = 0; c < nCells; c++) {
      var cell = doc.createElement('span');
      cell.className = 'cell';
      cell.innerHTML = '&nbsp;';
      cellsEl.appendChild(cell);
      cells.push({ el: cell, ch: ' ', want: ' ' });
    }
    var roleIdx = 0, roleAt = -10;
    function setRole(i, T) {
      var r = S.roles[Site.lang()][i % S.roles[Site.lang()].length].toUpperCase();
      var left = Math.floor((nCells - r.length) / 2);
      for (var k = 0; k < nCells; k++) {
        var ch = (k >= left && k < left + r.length) ? r[k - left] : ' ';
        cells[k].want = ch;
        cells[k].at = T + Math.abs(k - nCells / 2) * 0.026;
      }
      roleAt = T;
    }
    function tickRoles(T) {
      if (T - roleAt > 2.6) { roleIdx++; setRole(roleIdx, T); }
      cells.forEach(function (c) {
        if (c.ch !== c.want && T >= c.at) {
          c.ch = c.want;
          c.el.textContent = c.ch === ' ' ? ' ' : c.ch;
          c.el.classList.remove('is-flip');
          void c.el.offsetWidth;
          c.el.classList.add('is-flip');
        }
      });
    }

    /* na segunda parada nome, papéis, frase e caixinha formam um bloco só, centrado no quadro:
       o nome encolhe até a medida dele e o resto vem logo abaixo, a um passo do tamanho dos papéis */
    var nameEl = $('.name', title), subEl = $('.title-sub', title);
    // a barra de cima ocupa a borda do quadro: o bloco nunca sobe por baixo dela
    function hudTop() { var h = $('.hud-top'); return h ? h.offsetHeight : 48; }
    function layoutTitle() {
      var fw = title.clientWidth, fh = title.clientHeight;
      if (!fw) return;
      var k = fw < fh ? 0.74 : 0.58;
      var nh = nameEl.offsetHeight * k;
      var gap = parseFloat(global.getComputedStyle(rolesP).fontSize) * 0.8 + 14;
      var top = Math.max(hudTop() + fh * 0.02, (fh - nh - gap - subEl.offsetHeight) / 2 - fh * 0.02);
      title.style.setProperty('--nk', k);
      title.style.setProperty('--nh', nameEl.offsetHeight + 'px');
      title.style.setProperty('--ny', (top + nh / 2 - fh / 2).toFixed(1) + 'px');
      title.style.setProperty('--sub-top', (top + nh + gap).toFixed(1) + 'px');
      boxLim = null;
    }

    /* a caixinha: um quadro pequeno, aceso, solto sobre o título. Segue a mão, inclina com a
       velocidade, voa se for jogada e volta para o lugar com mola, pendendo para o lado em que
       foi jogada. Parada, chama de tempos em tempos: treme ou dá um puxão, e pisca a marca de
       troca de rolo no canto. */
    var tbox = $('.title-box');
    var bx = { x: 0, y: 0, vx: 0, vy: 0, r: -2.4, vr: 0, lean: -2.4, lift: 0, hover: false, drag: null, wob: -1, next: 0, calls: 0, awake: false };
    var boxLim = null, subOn = false;
    tbox.style.transform = 'rotate(' + bx.lean + 'deg)';
    function boxLimits() {
      if (boxLim) return boxLim;
      // a caixinha mora dentro da linha dela (.title-play), que mora no bloco de baixo
      var tp = tbox.offsetParent && tbox.offsetParent !== subEl ? tbox.offsetParent : null;
      var m = 10, hx = subEl.offsetLeft + (tp ? tp.offsetLeft : 0) + tbox.offsetLeft, hy = subEl.offsetTop + (tp ? tp.offsetTop : 0) + tbox.offsetTop;
      boxLim = { x0: m - hx, x1: title.clientWidth - m - hx - tbox.offsetWidth, y0: m - hy, y1: title.clientHeight - m - hy - tbox.offsetHeight };
      return boxLim;
    }
    function cueBox() {
      tbox.classList.remove('is-cue', 'is-call');
      void tbox.offsetWidth;
      tbox.classList.add('is-cue', 'is-call');
      bx.awake = true;
    }
    function shiverBox() { bx.wob = performance.now(); cueBox(); }
    function tugBox(dir) { bx.vx += dir * 420; cueBox(); }
    function hopBox() { bx.vy -= 560; cueBox(); }

    tbox.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (bx.thrown) return;
      var sc = title.getBoundingClientRect().width / Math.max(1, title.offsetWidth) || 1;
      bx.drag = { id: e.pointerId, px: e.clientX, py: e.clientY, x0: bx.x, y0: bx.y, sc: sc, moved: false, pts: [{ x: bx.x, y: bx.y, t: performance.now() }] };
      bx.wob = -1;
      bx.next = clock + 7;
      bx.awake = true;
      tbox.classList.add('is-held');
      try { tbox.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    });
    tbox.addEventListener('pointermove', function (e) {
      var d = bx.drag;
      if (!d || e.pointerId !== d.id) return;
      var dx = (e.clientX - d.px) / d.sc, dy = (e.clientY - d.py) / d.sc, lim = boxLimits(), now = performance.now();
      if (Math.hypot(dx, dy) > 4 && !d.moved) { d.moved = true; title.classList.add('is-pulling'); }
      bx.x = clamp(d.x0 + dx, lim.x0, lim.x1);
      bx.y = clamp(d.y0 + dy, lim.y0, lim.y1);
      d.pts.push({ x: bx.x, y: bx.y, t: now });
      while (d.pts.length > 2 && now - d.pts[0].t > 80) d.pts.shift();
      // quanto mais perto da zona de baixo, mais o guia acende; chegou nela, a página segue
      var goal = zoneGoal(lim);
      title.style.setProperty('--pull', clamp(bx.y / Math.max(1, goal), 0, 1).toFixed(3));
      if (bx.y >= goal) {
        try { tbox.releasePointerCapture(e.pointerId); } catch (err) { /* ok */ }
        dropBox(e);
        // chegou na zona: cai por ela, mesmo sem força
        if (!bx.thrown) throwBox();
      }
    });
    // quanto a caixinha desce até o meio dela chegar ao meio da zona "ARREMESSE"
    var zoneEl = $('.title-zone', title);
    function zoneGoal(lim) {
      var h = tbox.offsetHeight, restMid = title.clientHeight - 10 - lim.y1 - h / 2;
      var zm = zoneEl ? zoneEl.offsetTop + zoneEl.offsetHeight / 2 : title.clientHeight - 10 - h / 2;
      return Math.min(lim.y1 - 2, Math.max(60, zm - restMid));
    }
    function dropBox(e) {
      var d = bx.drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      bx.drag = null;
      bx.next = clock + 7;
      tbox.classList.remove('is-held');
      title.classList.remove('is-pulling');
      title.style.setProperty('--pull', '0');
      if (!motionOn()) { bx.x = bx.y = bx.vx = bx.vy = 0; return; }
      if (!d.moved) { hopBox(); return; }
      // a velocidade de soltura só vale se a mão ainda estava andando
      var a = d.pts[0], b = d.pts[d.pts.length - 1], fresh = performance.now() - b.t < 60 && b.t > a.t;
      bx.vx = fresh ? clamp((b.x - a.x) / (b.t - a.t) * 1000, -2600, 2600) : 0;
      bx.vy = fresh ? clamp((b.y - a.y) / (b.t - a.t) * 1000, -2600, 2600) : 0;
      if (Math.abs(bx.vx) > 160) bx.lean = (bx.vx > 0 ? 1 : -1) * (1.8 + Math.random() * 1.4);
      // jogada para baixo com força, ela cai para fora do quadro e a página segue para o Design
      if (bx.vy > 700 && bx.vy > Math.abs(bx.vx)) throwBox();
    }
    function throwBox() {
      if (!motionOn()) { if (E.goChapter) E.goChapter(1); return; }
      bx.thrown = true;
      bx.vy = Math.max(bx.vy, 1600);
      bx.vr = (bx.vx >= 0 ? 1 : -1) * 260;
      title.classList.add('is-pulling');
      title.style.setProperty('--pull', '1');
      // a página só segue depois que ela já saiu de cena, para o arremesso ser visto
      setTimeout(function () { if (E.goChapter) E.goChapter(1); }, 240);
      setTimeout(catchBox, 1300);
    }
    // volta para o lugar enquanto o Design cobre o título, e reaparece com um pulo
    function catchBox() {
      if (!bx.thrown) return;
      bx.thrown = false;
      title.classList.remove('is-pulling');
      title.style.setProperty('--pull', '0');
      bx.lean = -2.4;
      settleBox();
      tbox.classList.remove('is-back');
      void tbox.offsetWidth;
      tbox.classList.add('is-back');
    }
    tbox.addEventListener('pointerup', dropBox);
    tbox.addEventListener('pointercancel', dropBox);
    tbox.addEventListener('lostpointercapture', dropBox);
    tbox.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { bx.hover = true; bx.awake = true; } });
    tbox.addEventListener('pointerleave', function () { bx.hover = false; });

    function tiltBox(target, s) {
      bx.vr += ((target - bx.r) * 260 - bx.vr * 17) * s;
      bx.r += bx.vr * s;
    }
    function tickBox(dt) {
      var live = motionOn(), now = performance.now(), d = bx.drag, s = Math.min(dt, 40) / 1000;
      // com o bloco inteiro à vista, ela chama: primeiro treme, depois puxa para um lado, treme, puxa para o outro
      if (live && !d && cur === 'title' && sCur > 0.97 && !E.overview() && clock >= bx.next) {
        if (bx.calls % 2) tugBox(bx.calls % 4 === 1 ? 1 : -1); else shiverBox();
        bx.calls++;
        bx.next = clock + 6.5;
      }
      if (!bx.awake) return;
      if (d) {
        var a = d.pts[0], b = d.pts[d.pts.length - 1];
        bx.vx = b.t > a.t && now - b.t < 80 ? (b.x - a.x) / (b.t - a.t) * 1000 : 0;
        bx.vy = 0;
        if (live) tiltBox(bx.lean + clamp(bx.vx * 0.012, -14, 14), s);
      } else if (bx.thrown) {
        // em queda livre: sem mola e sem bordas, girando para o lado em que foi jogada
        bx.vy += 4200 * s;
        bx.x += bx.vx * s;
        bx.y += bx.vy * s;
        bx.r += bx.vr * s;
      } else if (live) {
        bx.vx += (-bx.x * 120 - bx.vx * 7.5) * s;
        bx.vy += (-bx.y * 120 - bx.vy * 7.5) * s;
        bx.x += bx.vx * s;
        bx.y += bx.vy * s;
        // as bordas do quadro devolvem a caixinha
        var lim = boxLimits();
        if (bx.x < lim.x0) { bx.x = lim.x0; bx.vx = Math.abs(bx.vx) * 0.5; }
        else if (bx.x > lim.x1) { bx.x = lim.x1; bx.vx = -Math.abs(bx.vx) * 0.5; }
        if (bx.y < lim.y0) { bx.y = lim.y0; bx.vy = Math.abs(bx.vy) * 0.5; }
        else if (bx.y > lim.y1) { bx.y = lim.y1; bx.vy = -Math.abs(bx.vy) * 0.5; }
        tiltBox(bx.lean + clamp(bx.vx * 0.01, -12, 12), s);
      } else { bx.vx = bx.vy = bx.vr = 0; bx.r = bx.lean; }
      // erguida na mão, meio erguida sob o mouse; sem animação ela não cresce
      bx.lift = live ? bx.lift + ((d ? 1 : bx.hover ? 0.45 : 0) - bx.lift) * (1 - Math.exp(-dt / 90)) : 0;
      var wr = 0, wx = 0;
      if (bx.wob >= 0) {
        var ws = (now - bx.wob) / 1000;
        if (ws > 1.2) bx.wob = -1;
        else {
          var env = Math.exp(-ws * 4) * Math.min(1, ws / 0.04);
          wr = 5.5 * env * Math.sin(ws * TAU * 5.4);
          wx = 2 * env * Math.sin(ws * TAU * 5.4 + 0.8);
        }
      }
      var st = Math.min(Math.abs(bx.vy) / 4000, 0.1), k = 1 + 0.05 * bx.lift;
      tbox.style.transform = 'translate(' + (bx.x + wx).toFixed(2) + 'px, ' + bx.y.toFixed(2) + 'px) rotate(' + (bx.r + wr).toFixed(2) + 'deg) scale(' + (k * (1 - st * 0.5)).toFixed(4) + ', ' + (k * (1 + st)).toFixed(4) + ')';
      var rest = !d && !bx.thrown && !bx.hover && bx.wob < 0 && bx.lift < 0.002 && Math.abs(bx.x) + Math.abs(bx.y) < 0.05 &&
        Math.abs(bx.vx) + Math.abs(bx.vy) < 0.5 && Math.abs(bx.r - bx.lean) < 0.02 && Math.abs(bx.vr) < 0.05;
      if (rest) settleBox();
    }
    function settleBox() {
      bx.x = bx.y = bx.vx = bx.vy = bx.vr = bx.lift = 0; bx.r = bx.lean; bx.awake = false;
      tbox.style.transform = 'rotate(' + bx.lean.toFixed(2) + 'deg)';
    }
    function resetBox() {
      bx.drag = null; bx.wob = -1; bx.thrown = false;
      tbox.classList.remove('is-held', 'is-cue', 'is-call', 'is-back');
      title.classList.remove('is-pulling');
      settleBox();
    }

    /* ---------- 2 · Design ---------- */

    /* caos: as letras trocam de lugar; ao ordenar, a cor pinta uma letra por vez a partir do c */
    var caosEl = $('[data-caos]');
    var caos = { ordered: false, at: -10, shuffles: 0, lockUntil: -1, hover: false, letters: [] };
    function buildCaos() {
      var word = t('v1.design.caos');
      var n = word.length, cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
      caos.n = n; caos.cols = cols; caos.cells = cols * rows; caos.letters = [];
      caosEl.innerHTML = '';
      caosEl.style.setProperty('--cols', cols);
      caosEl.style.setProperty('--rows', rows);
      word.split('').forEach(function (ch) {
        var l = doc.createElement('span');
        l.className = 'caos-l';
        l.setAttribute('aria-hidden', 'true');
        l.textContent = ch;
        l.setAttribute('data-ch', ch);
        caosEl.appendChild(l);
        caos.letters.push(l);
      });
      caosEl.setAttribute('aria-label', t('v1.design.caosLabel'));
      // sem animação, a palavra já aparece ordenada
      if (caos.ordered || !motionOn()) caosOrder(true); else caosScramble(true);
    }
    // o quadrado tem a largura da palavra do título, sem passar da altura que sobra na coluna
    function fitCaos() {
      var frame = caosEl.closest('.frame'), copy = caosEl.parentNode, head = $('#t-design');
      if (!frame || !frame.clientHeight || !head.firstChild) return;
      var range = doc.createRange();
      range.selectNodeContents(head);
      var sc = frame.getBoundingClientRect().width / Math.max(1, frame.offsetWidth);
      var tw = range.getBoundingClientRect().width / (sc || 1);
      var cs = global.getComputedStyle(frame);
      var inner = frame.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var portrait = frame.clientWidth / frame.clientHeight < 1;
      var rows = Math.ceil(caos.n / caos.cols);
      var avail = portrait ? inner * 0.22 : inner - (copy.offsetHeight - caosEl.offsetHeight) - 6;
      var cell = Math.max(24, Math.min(tw * 0.8 / caos.cols, avail / rows));
      caosEl.style.fontSize = (cell / 1.16).toFixed(1) + 'px';
    }
    function placeLetter(l, cell, rot, delay) {
      l.style.setProperty('--x', cell % caos.cols);
      l.style.setProperty('--y', Math.floor(cell / caos.cols));
      l.style.setProperty('--rot', rot.toFixed(1) + 'deg');
      l.style.setProperty('--d', Math.round(delay) + 'ms');
    }
    function caosInstant(on) {
      caosEl.classList.toggle('is-instant', on);
      if (on) requestAnimationFrame(function () { requestAnimationFrame(function () { caosEl.classList.remove('is-instant'); }); });
    }
    function caosOrder(instant) {
      caos.ordered = true; caos.at = clock;
      caosInstant(!!instant);
      caos.letters.forEach(function (l, i) {
        placeLetter(l, i, 0, i * 150);
        l.style.setProperty('--pd', Math.round(620 + i * 240) + 'ms');
        l.classList.add('is-painted');
      });
      caosEl.setAttribute('aria-pressed', 'true');
    }
    function caosScramble(instant) {
      caos.ordered = false; caos.at = clock;
      caosInstant(!!instant);
      // uma permutação em que nenhuma letra fica no seu lugar
      var p = [], i, tries;
      for (tries = 0; tries < 40; tries++) {
        p = [];
        for (i = 0; i < caos.cells; i++) p.push(i);
        for (i = p.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
        var ok = true;
        for (i = 0; i < caos.n; i++) if (p[i] === i) { ok = false; break; }
        if (ok) break;
      }
      caos.letters.forEach(function (l, k) {
        placeLetter(l, p[k], (Math.random() * 2 - 1) * 10, 120 + Math.random() * 140);
        l.style.setProperty('--pd', Math.round(Math.max(0, caos.n - 1 - k) * 60) + 'ms');
        l.classList.remove('is-painted');
      });
      caosEl.setAttribute('aria-pressed', 'false');
    }
    // o caos anda sozinho, sem a rolagem: embaralha duas vezes, se arruma, segura e recomeça
    function tickCaos(T) {
      if (caos.hover || T < caos.lockUntil) return;
      var held = T - caos.at;
      if (caos.ordered && held > 3.4) { caos.shuffles = 0; caosScramble(); }
      else if (!caos.ordered && held > 1.05) {
        if (caos.shuffles < 2) { caos.shuffles++; caosScramble(); } else caosOrder();
      }
    }
    caosEl.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      caos.hover = true;
      if (!caos.ordered) caosOrder();
    });
    caosEl.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      caos.hover = false; caos.at = clock; caos.lockUntil = clock + 0.6;
    });
    caosEl.addEventListener('click', function () {
      caos.lockUntil = clock + 6; caos.shuffles = 2;
      if (caos.ordered) caosScramble(); else caosOrder();
    });

    /* o quadro: uma composição que se reorganiza em qualquer proporção */
    var monitor = $('.monitor');
    var monArea = $('.monitor-area');
    var fmtBtns = $$('[data-format]');
    var FORMATS = [[16, 9], [1, 1], [9, 16], [4, 5]];
    var fmt = 0, fmtLock = -100;
    // manual: o visitante pegou o canto, e a rolagem deixa a proporção com ele até a cena sair
    var mon = { a: 16 / 9, k: 1, tw: null, manual: false };
    var A_MIN = 0.5, A_MAX = 2.2;
    // posições em frações do quadro para as quatro proporções; entre elas, interpola
    var COMP = [
      { a: 9 / 16, bx: 0.5, by: 0.25, bs: 0.62, wx: 0.09, wy: 0.47, ww: 0.82, wh: 0.2, rx: 0.09, ry: 0.73, rw: 0.5, tx: 0.09, ty: 0.79, tw: 0.72 },
      { a: 4 / 5, bx: 0.67, by: 0.25, bs: 0.44, wx: 0.09, wy: 0.5, ww: 0.82, wh: 0.2, rx: 0.09, ry: 0.75, rw: 0.46, tx: 0.09, ty: 0.81, tw: 0.6 },
      { a: 1, bx: 0.7, by: 0.27, bs: 0.42, wx: 0.08, wy: 0.52, ww: 0.84, wh: 0.2, rx: 0.08, ry: 0.77, rw: 0.42, tx: 0.08, ty: 0.83, tw: 0.5 },
      { a: 16 / 9, bx: 0.73, by: 0.5, bs: 0.7, wx: 0.07, wy: 0.22, ww: 0.44, wh: 0.34, rx: 0.07, ry: 0.62, rw: 0.3, tx: 0.07, ty: 0.7, tw: 0.3 }
    ];
    function comp(a) {
      if (a <= COMP[0].a) return COMP[0];
      if (a >= COMP[COMP.length - 1].a) return COMP[COMP.length - 1];
      for (var i = 0; i < COMP.length - 1; i++) {
        var A = COMP[i], B = COMP[i + 1];
        if (a <= B.a) {
          var u = (Math.log(a) - Math.log(A.a)) / (Math.log(B.a) - Math.log(A.a));
          u = u * u * (3 - 2 * u);
          var o = {};
          for (var key in A) o[key] = lerp(A[key], B[key], u);
          return o;
        }
      }
      return COMP[0];
    }

    /* a frase é uma corrente: movimento / gera / forma, e a palavra de baixo começa a frase
       seguinte (forma / gera / movimento). A coluna rola duas linhas por vez, como os créditos
       de um filme, uma palavra depois da outra; a que passa adiante sobe com rastro de papel de cebola. */
    var wordsEl = $('.m-words');
    var CHAIN = ['motion', 'makes', 'form', 'makes'];
    var WLH = 0.92, WROLL = 1.15, WSTAG = 0.09, WHOLD = 2.8, WTRAIL = [0.07, 0.14, 0.21];
    var chain = { k: 0, roll: -1, next: 2, n: 0, fmtAt: 0, last: -10, unit: null, pool: [], ghosts: [] };
    var wMeasure = doc.createElement('span');
    wMeasure.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(wMeasure);
    function wordClass(key) { return 'm-w' + (key === 'makes' ? ' m-w--verb' : ''); }
    function buildWords() {
      wordsEl.innerHTML = '';
      var make = function (ghost) {
        var s = doc.createElement('span');
        wordsEl.appendChild(s);
        return { el: s, key: '', ghost: ghost };
      };
      chain.pool = [0, 1, 2, 3, 4].map(function () { return make(false); });
      chain.ghosts = WTRAIL.map(function () { return make(true); });
      chain.unit = null;
    }
    function setWord(w, key) {
      if (w.key === key) return;
      w.key = key;
      w.el.className = wordClass(key) + (w.ghost ? ' m-w--ghost' : '');
      w.el.textContent = t('v1.w.' + key);
    }
    function measureWords() {
      var u = {};
      ['motion', 'makes', 'form'].forEach(function (k) {
        wMeasure.className = wordClass(k) + ' m-w-measure';
        wMeasure.textContent = t('v1.w.' + k);
        u[k] = (wMeasure.getBoundingClientRect().width || 100) / 100;
      });
      chain.unit = u;
    }
    function rollAt(s) { return M.ease.inOut(clamp(s / WROLL, 0, 1)); }
    // as três linhas da janela ficam inteiras; fora delas a palavra se apaga
    function placeWord(w, y, alpha) {
      var out = Math.max(0, -y, y - 2 * WLH) / (0.7 * WLH);
      w.el.style.transform = 'translate(0,' + y.toFixed(3) + 'em)';
      w.el.style.opacity = (alpha * clamp(1 - out, 0, 1)).toFixed(3);
    }
    function drawWords(T) {
      if (!chain.pool.length) return;
      var tau = chain.roll >= 0 ? T - chain.roll : -1;
      chain.pool.forEach(function (w, j) {
        setWord(w, CHAIN[(2 * chain.k + j) % 4]);
        placeWord(w, (j - 2 * (tau < 0 ? 0 : rollAt(tau - j * WSTAG))) * WLH, 1);
      });
      // o rastro só existe enquanto a palavra de baixo sobe
      chain.ghosts.forEach(function (g, n) {
        setWord(g, chain.pool[2].key);
        var u = tau < 0 ? 0 : rollAt(tau - 2 * WSTAG - WTRAIL[n]);
        placeWord(g, (2 - 2 * u) * WLH, (0.34 - n * 0.1) * Math.sin(Math.PI * u));
      });
    }
    function rollWords(T) {
      if (chain.roll >= 0) return;
      chain.roll = T;
      kickBlob(0.05);
    }
    function tickWords(T) {
      if (!chain.unit) return;
      // a frase não rola enquanto o quadro ainda está chegando
      if (T - chain.last > 0.5) chain.next = Math.max(chain.next, T + 1.2);
      chain.last = T;
      if (chain.roll >= 0 && T - chain.roll >= WROLL + 4 * WSTAG) {
        chain.roll = -1; chain.k++; chain.n++;
        chain.next = T + WHOLD;
      }
      if (chain.roll < 0 && T >= chain.next) rollWords(T);
      drawWords(T);
    }
    monitor.addEventListener('click', function (e) {
      if (e.target.closest('.m-handle')) return;
      if (!motionOn()) { chain.k++; drawWords(clock); return; }
      chain.next = clock;
      rollWords(clock);
    });

    /* forma fluida: harmônicos com amplitude e fase sorteadas, que vagam devagar */
    var blobSvg = $('.m-blob'), blobPaths = $$('.m-blob path'), blobImg = $('.m-blob-img');
    // a foto dentro da forma: o rosto (focus) fica sempre no centro da parte visível
    var photo = { ok: false, w: 1, h: 1, focus: [0.5, 0.5], span: 0.5 };
    (function loadPhoto() {
      var P = S.designPhoto;
      if (!P || !P.file || !blobImg) return;
      photo.focus = P.focus || photo.focus;
      photo.span = P.span || photo.span;
      var img = new Image();
      img.onload = function () {
        photo.ok = true; photo.w = img.naturalWidth; photo.h = img.naturalHeight;
        blobImg.setAttribute('href', img.src);
        drawBlob();
        blobImg.classList.add('is-ready');
      };
      img.src = S.assets + P.file;
    })();
    var HARM = [[2, 0.035, 0.085], [3, 0.02, 0.06], [4, 0.01, 0.035], [5, 0.004, 0.018]].map(function (h) {
      var amp = h[1] + Math.random() * (h[2] - h[1]);
      return { k: h[0], lo: h[1], hi: h[2], a: amp, aT: amp, ph: Math.random() * TAU,
        sp: (0.16 + Math.random() * 0.28) * (Math.random() < 0.5 ? -1 : 1), next: Math.random() * 3 };
    });
    var blob = { wob: 0, wv: 0, wph: 0, pa: 0, pOn: 0, lean: 0 };
    function kickBlob(v) { blob.wv += v; blob.wph = Math.random() * TAU; }
    function tickBlob(dt) {
      var s = Math.min(dt, 64) / 1000;
      HARM.forEach(function (h) {
        h.next -= s;
        if (h.next <= 0) {
          h.aT = h.lo + Math.random() * (h.hi - h.lo);
          h.sp = (0.16 + Math.random() * 0.28) * (h.sp < 0 ? -1 : 1) * (Math.random() < 0.25 ? -1 : 1);
          h.next = 2.2 + Math.random() * 1.8;
        }
        h.a += (h.aT - h.a) * (1 - Math.exp(-s / 1.1));
        h.ph += h.sp * s;
      });
      // tremor de gelatina quando o quadro muda
      for (var i = 0; i < 2; i++) {
        blob.wv += (-70 * blob.wob - 4.5 * blob.wv) * (s / 2);
        blob.wob += blob.wv * (s / 2);
      }
      // o mouse por perto puxa a borda
      var want = 0;
      if (ptr.on && ptr.mouse) {
        var r = blobSvg.getBoundingClientRect();
        if (r.width > 0) {
          var dx = ptr.x - (r.left + r.width / 2), dy = ptr.y - (r.top + r.height / 2);
          var dist = Math.hypot(dx, dy) / (r.width / 2);
          if (dist < 2.4) { want = 1 - clamp((dist - 0.9) / 1.5, 0, 1); blob.pa = Math.atan2(dx, -dy); }
        }
      }
      blob.pOn += (want - blob.pOn) * (1 - Math.exp(-s / 0.25));
      drawBlob();
    }
    function drawBlob() {
      var N = 72, pts = [];
      var lx = 0.05 * blob.pOn * Math.sin(blob.pa), ly = -0.05 * blob.pOn * Math.cos(blob.pa);
      for (var i = 0; i < N; i++) {
        var th = i / N * TAU, r = 1;
        for (var h = 0; h < HARM.length; h++) r += HARM[h].a * Math.sin(HARM[h].k * th + HARM[h].ph);
        r += blob.wob * Math.sin(2 * th + blob.wph);
        if (blob.pOn > 0.001) { var d = wrapPi(th - blob.pa); r += 0.09 * blob.pOn * Math.exp(-d * d / 0.35); }
        r *= 0.86;
        pts.push([lx + r * Math.sin(th), ly - r * Math.cos(th)]);
      }
      // centro da área visível (centroide do polígono): é onde o rosto fica
      if (photo.ok) {
        var A = 0, gx = 0, gy = 0;
        for (var a = 0; a < N; a++) {
          var p0 = pts[a], p1 = pts[(a + 1) % N], cr = p0[0] * p1[1] - p1[0] * p0[1];
          A += cr; gx += (p0[0] + p1[0]) * cr; gy += (p0[1] + p1[1]) * cr;
        }
        gx /= 3 * A; gy /= 3 * A;
        var iw = 1.72 / photo.span, ih = iw * photo.h / photo.w;
        blobImg.setAttribute('x', (gx - photo.focus[0] * iw).toFixed(4));
        blobImg.setAttribute('y', (gy - photo.focus[1] * ih).toFixed(4));
        blobImg.setAttribute('width', iw.toFixed(4));
        blobImg.setAttribute('height', ih.toFixed(4));
      }
      var mid = function (p, q) { return ((p[0] + q[0]) / 2).toFixed(4) + ',' + ((p[1] + q[1]) / 2).toFixed(4); };
      var dd = 'M' + mid(pts[N - 1], pts[0]);
      for (var j = 0; j < N; j++) {
        var p = pts[j], q = pts[(j + 1) % N];
        dd += 'Q' + p[0].toFixed(4) + ',' + p[1].toFixed(4) + ' ' + mid(p, q);
      }
      blobPaths.forEach(function (bp) { bp.setAttribute('d', dd + 'Z'); });
    }

    function fitSize(a) {
      var aw = monArea.clientWidth, ah = monArea.clientHeight;
      var w = Math.min(aw, ah * a);
      return { w: w, h: w / a };
    }
    function ratioText(a) {
      for (var i = 0; i < FORMATS.length; i++) if (Math.abs(a - FORMATS[i][0] / FORMATS[i][1]) < 0.012) return FORMATS[i][0] + ':' + FORMATS[i][1];
      var dec = Site.lang() === 'pt' ? ',' : '.';
      return a >= 1 ? (a.toFixed(2).replace('.', dec) + ':1') : ('1:' + (1 / a).toFixed(2).replace('.', dec));
    }
    function syncFormatUi() {
      var on = -1;
      FORMATS.forEach(function (f, k) { if (Math.abs(mon.a - f[0] / f[1]) < 0.012 && mon.k > 0.99) on = k; });
      fmtBtns.forEach(function (bt, k) { bt.classList.toggle('is-on', k === on); bt.setAttribute('aria-pressed', k === on ? 'true' : 'false'); });
      var rt = ratioText(mon.a);
      $('.m-ratio', monitor).textContent = rt;
      handle.setAttribute('aria-valuenow', mon.a.toFixed(2));
      handle.setAttribute('aria-valuetext', rt);
    }
    function layoutMonitor() {
      var aw = monArea.clientWidth, ah = monArea.clientHeight;
      if (!aw || !ah) return;
      var fit = fitSize(mon.a), w = fit.w * mon.k, h = fit.h * mon.k;
      monitor.style.width = w.toFixed(1) + 'px';
      monitor.style.height = h.toFixed(1) + 'px';
      var P = comp(mon.a), m = Math.min(w, h);
      var bs = P.bs * m, bx = P.bx * w - bs / 2, by = P.by * h - bs / 2;
      blobSvg.style.left = bx.toFixed(1) + 'px';
      blobSvg.style.top = by.toFixed(1) + 'px';
      blobSvg.style.width = bs.toFixed(1) + 'px';
      blobSvg.style.height = bs.toFixed(1) + 'px';
      mon.blob = { x: bx + bs / 2, y: by + bs / 2, r: bs * 0.42 };
      if (shapes) shapes.bounds(w, h);
      // as palavras nunca passam por cima da forma
      if (!chain.unit) measureWords();
      var U = chain.unit, maxWord = Math.max(U.motion, U.makes, U.form);
      var wx = P.wx * w, wy = P.wy * h, budget = P.ww * w, hb = P.wh * h;
      var b0 = by + bs * 0.06, b1 = by + bs * 0.94;
      if (b0 < wy + hb && b1 > wy && bx + bs * 0.06 > wx) budget = Math.min(budget, bx + bs * 0.06 - wx - 0.04 * w);
      // uma palavra por linha, três linhas: a janela da corrente
      var f = Math.max(6, Math.min(budget / maxWord, hb / (2 * WLH + 1)));
      wordsEl.style.left = wx.toFixed(1) + 'px';
      wordsEl.style.top = wy.toFixed(1) + 'px';
      wordsEl.style.width = (maxWord * 100).toFixed(1) + 'px';
      wordsEl.style.height = ((2 * WLH + 0.8) * 100).toFixed(1) + 'px';
      wordsEl.style.transform = 'scale(' + (f / 100).toFixed(4) + ')';
      drawWords(clock);
      var bar = $('.m-bar', monitor), txt = $('.m-text', monitor);
      bar.style.left = (P.rx * w).toFixed(1) + 'px'; bar.style.top = (P.ry * h).toFixed(1) + 'px'; bar.style.width = (P.rw * w).toFixed(1) + 'px';
      txt.style.left = (P.tx * w).toFixed(1) + 'px'; txt.style.top = (P.ty * h).toFixed(1) + 'px'; txt.style.width = (P.tw * w).toFixed(1) + 'px';
      drawBlob();
    }
    function tweenMon(a, k, instant) {
      if (instant || !motionOn()) { mon.a = a; mon.k = k; mon.tw = null; layoutMonitor(); syncFormatUi(); return; }
      mon.tw = { a0: mon.a, a1: a, k0: mon.k, k1: k, t0: performance.now(), dur: 1100 };
      kickBlob(0.9);
    }
    function tickMon(now) {
      if (!mon.tw) return;
      var u = clamp((now - mon.tw.t0) / mon.tw.dur, 0, 1), e = M.ease.inOut(u);
      mon.a = Math.exp(lerp(Math.log(mon.tw.a0), Math.log(mon.tw.a1), e));
      mon.k = lerp(mon.tw.k0, mon.tw.k1, e);
      layoutMonitor();
      syncFormatUi();
      if (u >= 1) mon.tw = null;
    }
    function setFormat(i, instant) {
      fmt = i;
      tweenMon(FORMATS[i][0] / FORMATS[i][1], 1, instant);
    }
    fmtBtns.forEach(function (bt) {
      bt.addEventListener('click', function () { fmtLock = clock; setFormat(parseInt(bt.getAttribute('data-format'), 10)); });
    });

    /* fundo do painel e formas do quadro */
    var designFrame = $('.frame--design');
    var lattice = global.LatticeField ? global.LatticeField.create($('.lattice', designFrame)) : null;
    var shapes = global.ShapeField ? global.ShapeField.create($('.m-shapes')) : null;
    function toLocal(el, cx, cy) {
      var b = el.getBoundingClientRect(), sc = b.width / Math.max(1, el.offsetWidth) || 1;
      return { x: (cx - b.left) / sc, y: (cy - b.top) / sc, inside: cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom };
    }
    // o texto do quadro, no espaço do quadro: as formas desviam dele
    function textRects() {
      var mb = monitor.getBoundingClientRect(), sc = mb.width / Math.max(1, monitor.offsetWidth) || 1, out = [];
      var els = [wordsEl, $('.m-bar', monitor), $('.m-text', monitor)];
      els.forEach(function (el) {
        if (!el) return;
        var b = el.getBoundingClientRect();
        if (b.width > 0) out.push({ x: (b.left - mb.left) / sc, y: (b.top - mb.top) / sc, w: b.width / sc, h: b.height / sc });
      });
      return out;
    }
    // a borda do vidro pega a luz do lado do cursor; sem cursor, a luz volta para o alto à esquerda
    var GLASS_X = 0.18, GLASS_Y = 0;
    var glass = { x: GLASS_X, y: GLASS_Y, sx: GLASS_X, sy: GLASS_Y };
    function lightGlass(dt, gp, sp) {
      var gx = GLASS_X, gy = GLASS_Y;
      if (gp && gp.inside && sp) {
        gx = clamp(sp.x / Math.max(1, monitor.offsetWidth), -0.15, 1.15);
        gy = clamp(sp.y / Math.max(1, monitor.offsetHeight), -0.15, 1.15);
      }
      var k = 1 - Math.exp(-dt / 160);
      glass.x += (gx - glass.x) * k; glass.y += (gy - glass.y) * k;
      if (Math.abs(glass.x - glass.sx) < 0.002 && Math.abs(glass.y - glass.sy) < 0.002) return;
      glass.sx = glass.x; glass.sy = glass.y;
      monitor.style.setProperty('--gx', (glass.x * 100).toFixed(1) + '%');
      monitor.style.setProperty('--gy', (glass.y * 100).toFixed(1) + '%');
    }
    function designFx(dt, v) {
      var live = motionOn(), ov = E.overview();
      var gp = ptr.on && !ov ? toLocal(designFrame, ptr.x, ptr.y) : null;
      var sp = ptr.on && !ov ? toLocal(monitor, ptr.x, ptr.y) : null;
      if (lattice) lattice.frame(dt, gp ? gp.x : 0, gp ? gp.y : 0, !!(gp && gp.inside), v, live);
      if (shapes) {
        shapes.obstacles(textRects(), mon.blob ? [mon.blob] : []);
        shapes.frame(dt, live, sp ? sp.x : 0, sp ? sp.y : 0, !!(sp && sp.inside));
      }
      lightGlass(dt, gp, sp);
    }
    // sem animação: a malha parada, as formas já assentadas e a luz do vidro no lugar de sempre
    function designStatic() {
      if (lattice) { lattice.touch(); lattice.frame(16, 0, 0, false, 0, false); }
      if (shapes) { shapes.obstacles(textRects(), mon.blob ? [mon.blob] : []); shapes.settle(); }
      glass.x = glass.sx = GLASS_X; glass.y = glass.sy = GLASS_Y;
      monitor.style.removeProperty('--gx'); monitor.style.removeProperty('--gy');
    }
    designFrame.addEventListener('pointerdown', function (e) {
      if (!lattice || !motionOn() || E.overview()) return;
      var p = toLocal(designFrame, e.clientX, e.clientY);
      lattice.ripple(p.x, p.y);
    });

    /* fundo do fechamento: a mesma grade, em tinta clara sobre o escuro.
       Passar por um link acende a grade em volta dele; ao chegar, uma onda sai do centro. */
    var creditsFrame = $('.frame--credits');
    var cgrid = global.KineticGrid ? global.KineticGrid.create($('.kgrid', creditsFrame), {
      ink: WHITE, hot: TUNG, line: 0.06, dot: 0.17, near: 0.55, glow: 0.32
    }) : null;
    function creditsFx(dt, v) {
      if (!cgrid) return;
      var gp = ptr.on && !E.overview() ? toLocal(creditsFrame, ptr.x, ptr.y) : null;
      cgrid.frame(dt, gp ? gp.x : 0, gp ? gp.y : 0, !!(gp && gp.inside), v, motionOn());
    }
    function creditsStatic() {
      if (cgrid) { cgrid.touch(); cgrid.frame(16, 0, 0, false, 0, false); }
    }
    creditsFrame.addEventListener('pointerdown', function (e) {
      if (!cgrid || !motionOn() || E.overview()) return;
      var p = toLocal(creditsFrame, e.clientX, e.clientY);
      cgrid.ripple(p.x, p.y);
    });
    var hoverLink = null;
    function linkPulse(e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a === hoverLink) return;
      hoverLink = a;
      if (!a || !cgrid || !motionOn() || E.overview()) return;
      var b = $('.c-value', a).getBoundingClientRect();
      var p = toLocal(creditsFrame, b.left + b.width / 2, b.top + b.height / 2);
      cgrid.ripple(p.x, p.y, 0.7);
    }
    socialsHost.addEventListener('pointerover', linkPulse);
    socialsHost.addEventListener('focusin', linkPulse);
    ['pointerleave', 'focusout'].forEach(function (ev) { socialsHost.addEventListener(ev, function () { hoverLink = null; }); });

    /* o canto do quadro: arrastar muda a proporção e o tamanho */
    var handle = $('.m-handle');
    var mdrag = null;
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var r = monitor.getBoundingClientRect();
      mdrag = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, sc: r.width / Math.max(1, monitor.offsetWidth), a: mon.a };
      mon.tw = null;
      mon.manual = true;
      fmtLock = clock;
      monitor.classList.add('is-resizing');
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    });
    handle.addEventListener('pointermove', function (e) {
      if (!mdrag || e.pointerId !== mdrag.id) return;
      var aw = monArea.clientWidth, ah = monArea.clientHeight;
      var w = clamp(Math.abs(e.clientX - mdrag.cx) * 2 / mdrag.sc, aw * 0.3, aw);
      var h = clamp(Math.abs(e.clientY - mdrag.cy) * 2 / mdrag.sc, ah * 0.3, ah);
      var a = clamp(w / h, A_MIN, A_MAX);
      var fit = fitSize(a);
      kickBlob(clamp((a - mon.a) * 0.6, -0.08, 0.08));
      mon.a = a;
      mon.k = clamp(Math.max(w / fit.w, h / fit.h), 0.45, 1);
      layoutMonitor();
      syncFormatUi();
    });
    var endMdrag = function () {
      if (!mdrag) return;
      mdrag = null;
      fmtLock = clock;
      monitor.classList.remove('is-resizing');
    };
    handle.addEventListener('pointerup', endMdrag);
    handle.addEventListener('pointercancel', endMdrag);
    handle.addEventListener('keydown', function (e) {
      var a = mon.a, k = mon.k;
      if (e.key === 'ArrowRight') a *= 1.06;
      else if (e.key === 'ArrowLeft') a /= 1.06;
      else if (e.key === 'ArrowUp') k += 0.05;
      else if (e.key === 'ArrowDown') k -= 0.05;
      else return;
      e.preventDefault();
      fmtLock = clock;
      mon.tw = null;
      mon.manual = true;
      mon.a = clamp(a, A_MIN, A_MAX);
      mon.k = clamp(k, 0.45, 1);
      kickBlob(0.3);
      layoutMonitor();
      syncFormatUi();
    });

    /* ---------- 4 · Trabalhos recentes: a abertura do capítulo ----------
       Uma pasta de vidro guarda os trabalhos (desenho do Glassmorphism Folder
       Cards, de Kedhareswer Naidu, licença MIT, reescrito sem React). O ponto
       continua percorrendo o arco com as cópias do caminho atrás dele, mas agora
       só guia o olhar: ele cai dentro da pasta, e cada queda levanta a folha de
       um trabalho. Clicar abre a pasta e espalha as folhas; cada folha leva ao vídeo. */

    var onion = {
      svg: $('.onion-svg'), path: $('.onion-path'), run: $('.onion-run'), g: $('.onion-ghosts'),
      dot: $('.onion-dot'), ghosts: [], len: [], w: 1000, h: 360, r: 22, portrait: false
    };
    // o ponto anda sozinho, sempre mirando a pasta: um passo (STEP) até o bolso e uma
    // pausa (HOLD), uma vez por trabalho. A rolagem, à parte, destaca as folhas (sel)
    var WGN = 7, WK_STEP = 1.2, WK_HOLD = 1.3;
    var WK_CYCLE = nW * (WK_STEP + WK_HOLD);
    var wk = { start: 0, cur: -1, hover: -1, called: -1, landed: -1, sel: -2 };
    var openNote = $('.note--open', worksFrame);
    var readCount = $('.readout-count'), readWork = $('.readout-work');
    var NS = 'http://www.w3.org/2000/svg';
    var worksFrame = $('.frame--works'), foldersHost = $('.folders');

    // a pasta, nas medidas do componente (px de palco): fundo com a aba, folhas, frente de vidro
    var GF_W = 340, GF_H = 272, GF_FRONT = 74;
    var GF_BACK_D = 'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
    var GF_FRONT_D = 'M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 176A22 22 0 0 1 318 198L22 198A22 22 0 0 1 0 176Z';
    // espaço acima do palco para as folhas subirem quando a pasta abre
    var GF_ROOM = 150;

    function workTitle(k) { var w = S.works[k]; return w ? (w.title[Site.lang()] || w.title.pt) : ''; }
    function goWork(k) { E.goWork(k); }

    // uma folha por trabalho: o pôster dele, ou o número no lugar
    function buildSheet(k, J, n) {
      var s = doc.createElement('button');
      s.type = 'button';
      s.className = 'gf-sheet';
      s.tabIndex = -1;
      s.setAttribute('data-no-keys', '');
      s.setAttribute('data-k', k);
      s.style.setProperty('--gf-slot', (J - (n - 1) / 2).toFixed(2));
      s.style.setProperty('--gf-depth', n - 1 - J);
      s.style.setProperty('--gf-jx', (((k * 37 + J * 11) % 7) - 3) + 'px');
      s.style.setProperty('--gf-jr', ((((k * 53 + J * 7) % 5) - 2) * 0.6).toFixed(1) + 'deg');
      var w = S.works[k];
      if (w && w.poster) {
        s.classList.add('gf-sheet--art');
        s.innerHTML = '<img class="gf-sheet-art" alt="" draggable="false">';
        $('img', s).src = S.assets + w.poster;
      } else {
        s.innerHTML = '<span class="gf-ph"></span>';
      }
      s.insertAdjacentHTML('beforeend', '<span class="gf-sheet-head"><span class="gf-sheet-name"></span><span class="gf-sheet-meta"></span></span>');
      return { el: s, k: k, name: $('.gf-sheet-name', s), meta: $('.gf-sheet-meta', s), ph: $('.gf-ph', s) };
    }

    var folder = (function () {
      var f = { root: doc.createElement('div'), sheets: [], x: 0, y: 0, s: 1, open: false };
      f.root.className = 'gf';
      f.root.setAttribute('data-entered', '');
      f.root.innerHTML =
        '<div class="gf-stage"><div class="gf-tilt">' +
        '<div class="gf-shadow" aria-hidden="true"></div>' +
        '<div class="gf-back" aria-hidden="true"><div class="gf-art"></div><div class="gf-back-sheen"></div></div>' +
        '<svg class="gf-rim gf-back-rim" viewBox="0 0 340 272" aria-hidden="true"><path/></svg>' +
        '<div class="gf-files"></div>' +
        '<div class="gf-front">' +
        '<div class="gf-tint" aria-hidden="true"></div><div class="gf-spec" aria-hidden="true"></div>' +
        '<svg class="gf-rim gf-front-rim" viewBox="0 0 340 198" aria-hidden="true"><defs><linearGradient id="gf-rim" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0.12"/>' +
        '</linearGradient></defs><path/></svg>' +
        '<button type="button" class="gf-hit" data-no-keys aria-expanded="false"></button>' +
        '<div class="gf-label"><span class="gf-title"></span><span class="gf-meta"></span></div>' +
        '</div></div></div>';
      $('.gf-back', f.root).style.clipPath = "path('" + GF_BACK_D + "')";
      $('.gf-back-rim path', f.root).setAttribute('d', GF_BACK_D);
      f.front = $('.gf-front', f.root);
      f.front.style.clipPath = "path('" + GF_FRONT_D + "')";
      var rim = $('.gf-front-rim path', f.root);
      rim.setAttribute('d', GF_FRONT_D);
      rim.setAttribute('stroke', 'url(#gf-rim)');
      f.stage = $('.gf-stage', f.root);
      f.hit = $('.gf-hit', f.root);
      f.title = $('.gf-title', f.root);
      f.meta = $('.gf-meta', f.root);
      // o primeiro trabalho fica na frente da pilha
      var files = $('.gf-files', f.root);
      for (var k = nW - 1, J = 0; k >= 0; k--, J++) {
        var sh = buildSheet(k, J, nW);
        files.appendChild(sh.el);
        f.sheets.push(sh);
      }
      foldersHost.appendChild(f.root);
      return f;
    })();

    function setOpen(on) {
      if (folder.open === on) return;
      folder.open = on;
      if (on) folder.root.setAttribute('data-open', ''); else folder.root.removeAttribute('data-open');
      folder.hit.setAttribute('aria-expanded', on ? 'true' : 'false');
      folder.sheets.forEach(function (sh) { sh.el.tabIndex = on ? 0 : -1; });
      worksFrame.classList.toggle('is-open', on);
      // aberta, a pasta mostra todas; fechada, volta a folha que a rolagem destacou
      if (on) callSheet(-1); else wk.sel = -2;
      renderFolder();
    }
    // a folha do trabalho da vez sobe acima do vidro
    function callSheet(k) {
      if (wk.called === k) return;
      wk.called = k;
      folder.sheets.forEach(function (sh) { sh.el.classList.toggle('is-called', sh.k === k); });
    }
    function bump() {
      folder.front.classList.remove('gf-front--bump');
      void folder.front.offsetWidth;
      folder.front.classList.add('gf-front--bump');
    }
    function setHover(k) {
      if (wk.hover === k) return;
      wk.hover = k;
      renderWork();
    }

    (function () {
      for (var i = 0; i < WGN; i++) {
        var c = doc.createElementNS(NS, 'circle');
        onion.g.appendChild(c);
        onion.ghosts.push({ el: c });
      }
      folder.root.addEventListener('click', function (e) {
        var sh = e.target.closest('.gf-sheet');
        e.stopPropagation();
        if (sh && folder.open) goWork(+sh.getAttribute('data-k'));
        else setOpen(!folder.open);
      });
      folder.sheets.forEach(function (sh) {
        ['pointerenter', 'focus'].forEach(function (ev) { sh.el.addEventListener(ev, function () { if (folder.open) setHover(sh.k); }); });
        ['pointerleave', 'blur'].forEach(function (ev) { sh.el.addEventListener(ev, function () { setHover(-1); }); });
      });
      worksFrame.addEventListener('click', function () { setOpen(false); });
      // o bilhete ao lado da pasta também abre
      if (openNote) openNote.addEventListener('click', function (e) { e.stopPropagation(); setOpen(true); });
      worksFrame.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && folder.open) { setOpen(false); folder.hit.focus(); }
      });
    })();

    // a pasta se inclina na direção do ponteiro
    worksFrame.addEventListener('pointermove', function (e) {
      if (!motionOn()) return;
      var r = worksFrame.getBoundingClientRect(), z = worksFrame.clientWidth / (r.width || 1);
      var px = (e.clientX - r.left) * z, py = (e.clientY - r.top) * z, f = folder;
      var cx = f.x + GF_W * f.s / 2, cy = f.y + (GF_ROOM + GF_H / 2) * f.s;
      f.root.style.setProperty('--gf-px', clamp((px - cx) / (GF_W * f.s * 1.4), -1, 1).toFixed(3));
      f.root.style.setProperty('--gf-py', clamp((py - cy) / (GF_H * f.s * 1.4), -1, 1).toFixed(3));
    });
    worksFrame.addEventListener('pointerleave', function () {
      folder.root.style.setProperty('--gf-px', '0');
      folder.root.style.setProperty('--gf-py', '0');
    });

    // ao chegar no quadro a pasta se monta: fundo, folhas e por fim o vidro
    function enterFolders() {
      if (!motionOn()) { folder.root.setAttribute('data-entered', ''); return; }
      folder.root.removeAttribute('data-entered');
      void folder.root.offsetWidth;
      setTimeout(function () { folder.root.setAttribute('data-entered', ''); }, 140);
    }

    function onionPoint(u) {
      var P = onion.P;
      var m = 1 - u;
      return {
        x: m * m * m * P[0] + 3 * m * m * u * P[2] + 3 * m * u * u * P[4] + u * u * u * P[6],
        y: m * m * m * P[1] + 3 * m * m * u * P[3] + 3 * m * u * u * P[5] + u * u * u * P[7]
      };
    }
    // o inverso do comprimento: em que ponto do traçado está tal fração dele
    function uAtLen(f) {
      var L = onion.len, n = L.length - 1;
      if (n < 1) return f;
      var want = clamp(f, 0, 1) * L[n];
      for (var i = 1; i <= n; i++) {
        if (L[i] >= want) {
          var d = L[i] - L[i - 1];
          return (i - 1 + (d ? (want - L[i - 1]) / d : 0)) / n;
        }
      }
      return 1;
    }
    // comprimento ao longo do caminho: é o que faz a linha se desenhar atrás do ponto
    function lenFrac(u) {
      var L = onion.len, n = L.length - 1;
      if (n < 1) return 0;
      var x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x));
      return lerp(L[i], L[i + 1], x - i) / L[n];
    }
    function placeFolder(f, x, y, s) {
      f.x = x; f.y = y; f.s = s;
      f.root.style.left = x.toFixed(1) + 'px';
      f.root.style.top = y.toFixed(1) + 'px';
      f.root.style.width = (GF_W * s).toFixed(1) + 'px';
      f.root.style.height = ((GF_H + GF_ROOM) * s).toFixed(1) + 'px';
      f.root.style.setProperty('--s', s.toFixed(4));
      f.stage.style.transform = 'translateY(' + (GF_ROOM * s).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    }
    // onde termina o bloco do título, em px do quadro
    function copyBottom() {
      var c = $('.works-copy');
      return c ? c.offsetTop + c.offsetHeight : 0;
    }
    // a pasta à direita (embaixo, no retrato); o arco sobe do lado do título e mergulha no bolso dela
    function layoutOnion() {
      var w = worksFrame.clientWidth || 1000, h = worksFrame.clientHeight || 360;
      onion.w = w; onion.h = h;
      onion.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      onion.portrait = w / h < 1;
      onion.r = clamp(Math.min(w, h) * 0.024, 8, 18);
      var s, x, yb;
      if (!onion.portrait) { s = Math.min(w * 0.33 / GF_W, h * 0.44 / GF_H); x = w * 0.66 - GF_W * s / 2; yb = h * 0.88; }
      else {
        s = Math.min(w * 0.82 / GF_W, h * 0.34 / GF_H); x = (w - GF_W * s) / 2;
        yb = h * 0.92 - Math.max(0, (h * 0.92 - copyBottom() - GF_H * s - h * 0.3) / 2);
      }
      placeFolder(folder, x, yb - (GF_H + GF_ROOM) * s, s);
      var cx = x + GF_W * s / 2, top = yb - GF_H * s, pocket = top + (GF_FRONT + 44) * s;
      var P = onion.P = onion.portrait
        ? [w * -0.03, top - h * 0.06, w * 0.24, top - h * 0.24, cx, top - h * 0.3, cx, pocket]
        : [w * -0.03, h * 0.64, w * 0.3, h * 0.66, cx, h * -0.06, cx, pocket];
      var d = 'M' + P[0] + ',' + P[1] + ' C' + P[2] + ',' + P[3] + ' ' + P[4] + ',' + P[5] + ' ' + P[6] + ',' + P[7];
      onion.path.setAttribute('d', d);
      onion.run.setAttribute('d', d);
      onion.len = [];
      for (var k = 0, acc = 0, prev = onionPoint(0); k <= 64; k++) {
        var q = onionPoint(k / 64);
        acc += Math.hypot(q.x - prev.x, q.y - prev.y);
        onion.len.push(acc);
        prev = q;
      }
      onion.dot.setAttribute('r', onion.r);
      onion.ghosts.forEach(function (g) { g.el.setAttribute('r', (onion.r * 0.94).toFixed(1)); });
      onion.u0 = uAtLen(0.02);
      placeOpenNote(x, yb, s);
      if (motionOn()) drawOnion(clock || 0); else staticOnion();
    }
    function placeDot(u, r) {
      var p = onionPoint(u);
      onion.dot.setAttribute('cx', p.x.toFixed(1));
      onion.dot.setAttribute('cy', p.y.toFixed(1));
      onion.dot.setAttribute('r', r.toFixed(1));
    }
    // as cópias ficam onde estaria cada quadro da queda e acendem quando o ponto passa
    function placeGhosts(lead, fade) {
      onion.ghosts.forEach(function (g, k) {
        var f = k / (WGN - 1), gp = onionPoint(lerp(onion.u0, 1, M.ease.inOut(f)));
        g.el.setAttribute('cx', gp.x.toFixed(1));
        g.el.setAttribute('cy', gp.y.toFixed(1));
        g.el.setAttribute('opacity', (0.3 * clamp((lead - f) * 7, 0, 1) * fade).toFixed(3));
      });
    }
    // o bilhete "abrir": à esquerda da frente de vidro; no retrato, em cima da pasta, do lado direito
    function placeOpenNote(x, yb, s) {
      if (!openNote) return;
      openNote.classList.toggle('is-portrait', onion.portrait);
      var st = openNote.style;
      if (!onion.portrait) {
        st.left = 'auto'; st.right = (onion.w - x - 4).toFixed(1) + 'px';
        st.top = (yb - GF_H * s + (GF_FRONT + 30) * s).toFixed(1) + 'px'; st.bottom = 'auto';
      } else {
        st.right = (onion.w - x - GF_W * s + 8).toFixed(1) + 'px'; st.left = 'auto';
        st.top = 'auto'; st.bottom = (onion.h - (yb - GF_H * s) + GF_ROOM * s * 0.1 + 6).toFixed(1) + 'px';
      }
    }
    // o ponto percorre o arco e cai no bolso; ao cair, a pasta dá um tranco
    function drawOnion(T) {
      if (!onion.P) return;
      var span = WK_STEP + WK_HOLD, tau = T - wk.start;
      tau -= Math.floor(tau / WK_CYCLE) * WK_CYCLE;
      var i = Math.min(nW - 1, Math.floor(tau / span)), inStep = tau - i * span;
      var lead = M.ease.inOut(clamp(inStep / WK_STEP, 0, 1));
      var u = lerp(onion.u0, 1, lead), landed = inStep >= WK_STEP;
      placeDot(u, onion.r * (landed ? 0.6 : 1));
      onion.dot.setAttribute('opacity', landed ? '0' : '1');
      onion.run.setAttribute('stroke-dashoffset', (1000 * (1 - lenFrac(u))).toFixed(1));
      onion.run.setAttribute('opacity', (landed ? 0.45 * (1 - clamp((inStep - WK_STEP) / WK_HOLD * 1.6, 0, 1)) : 0.45).toFixed(3));
      placeGhosts(lead, landed ? 1 - clamp((inStep - WK_STEP) * 3, 0, 1) : 1);
      if (landed) { if (wk.landed !== i) { wk.landed = i; if (!folder.open) bump(); } }
      else wk.landed = -1;
    }
    // a rolagem destaca os projetos da pasta, um depois do outro: a folha da vez sobe
    // acima do vidro e o nome dela aparece embaixo do título
    function scrubWorks() {
      var p = SC.works.p, k = p < 0.06 ? -1 : Math.min(nW - 1, Math.floor((p - 0.06) / 0.84 * nW));
      if (k === wk.sel) return;
      wk.sel = k;
      if (!folder.open) callSheet(k);
      wk.cur = Math.max(0, k);
      renderWork();
    }
    // embaixo do título: o trabalho da vez, ou a folha sob o mouse
    function renderWork() {
      var i = clamp(wk.hover >= 0 ? wk.hover : wk.cur, 0, nW - 1);
      readCount.textContent = pad(i + 1) + ' ' + t('v1.of') + ' ' + pad(nW);
      readWork.textContent = workTitle(i);
    }
    function renderFolder() {
      var f = folder;
      f.title.textContent = t('v1.works.folder');
      f.meta.textContent = t('v1.works.items').replace('{n}', nW);
      f.hit.setAttribute('aria-label', t(f.open ? 'v1.works.close' : 'v1.works.open') + ': ' + t('v1.works.folder') + ', ' + f.meta.textContent);
      f.sheets.forEach(function (sh) {
        sh.name.textContent = workTitle(sh.k);
        sh.meta.textContent = pad(sh.k + 1);
        if (sh.ph) sh.ph.textContent = pad(sh.k + 1);
        sh.el.setAttribute('aria-label', t('v1.works.watch') + ': ' + workTitle(sh.k));
      });
      renderWork();
    }
    // sem animação: o caminho inteiro e o ponto chegando na pasta
    function staticOnion() {
      if (!onion.P) return;
      onion.ghosts.forEach(function (g, k) {
        var gp = onionPoint(uAtLen(lerp(0.02, 0.86, M.ease.inOut(k / (WGN - 1)))));
        g.el.setAttribute('cx', gp.x.toFixed(1));
        g.el.setAttribute('cy', gp.y.toFixed(1));
        g.el.setAttribute('opacity', '0.24');
      });
      placeDot(uAtLen(0.9), onion.r);
      onion.dot.setAttribute('opacity', '1');
      onion.run.setAttribute('stroke-dashoffset', '0');
      onion.run.setAttribute('opacity', '0.45');
      folder.root.setAttribute('data-entered', '');
      wk.sel = -2;
    }

    /* ---------- 4 · Interação: a curva comanda o fundo ----------
       O editor volta ao tamanho de antes. Cada mudança na curva redesenha o fundo
       no mesmo instante, sem botão de aplicar. Ao chegar, as alças tremem e o
       tremido passa para o fundo. */

    var SVGNS = 'http://www.w3.org/2000/svg';
    var playFrame = $('.frame--play');
    var graph = $('.graph');
    var curvePath = $('.graph-curve', graph);
    var arm1 = $('.graph-arm--1', graph), arm2 = $('.graph-arm--2', graph);
    var handles = $$('.graph-handle', graph);
    var knobs = handles.map(function (h) { return $('.graph-knob', h); });
    var rings = $$('.graph-ring', graph);
    var rider = $('.graph-rider', graph);
    var bez = { x1: 0.65, y1: 0, x2: 0.35, y2: 1 };
    var PRESETS = { linear: [0, 0, 1, 1], soft: [0.65, 0, 0.35, 1], out: [0.16, 1, 0.3, 1], back: [0.3, 1.3, 0.6, 1] };
    var riderR = 0.026;
    // o rastro da bolinha (cópias atrás dela, como papel de cebola), o halo e as linhas até os eixos
    var trail = $$('.rider-ghost', graph), halo = $('.graph-halo', graph), guideX = $('.guide-x', graph), guideY = $('.guide-y', graph);
    // COR: a palavra pinta com a cor que a forma da curva dá
    var corEl = $('.cor', playFrame), cor = { h: -1, k: -1 };
    var messNote = $('.note--mess', playFrame);
    var playWarp = 0;
    var YMIN = -0.3, YMAX = 1.3;
    var MOVE = 1.6, HOLD = 0.6, CYCLE = MOVE + HOLD;
    var pluck = null, bezTw = null, hdrag = null;

    (function grid() {
      var g = $('.graph-grid', graph);
      [0.25, 0.5, 0.75].forEach(function (v) {
        var a = doc.createElementNS(SVGNS, 'line');
        a.setAttribute('x1', v); a.setAttribute('x2', v); a.setAttribute('y1', 0); a.setAttribute('y2', 1);
        g.appendChild(a);
        var b = doc.createElementNS(SVGNS, 'line');
        b.setAttribute('y1', v); b.setAttribute('y2', v); b.setAttribute('x1', 0); b.setAttribute('x2', 1);
        g.appendChild(b);
      });
    })();

    function fmtN(v) { var s = (Math.round(v * 100) / 100).toFixed(2); return s.replace(/0$/, '').replace(/\.0$/, '').replace(/\.$/, ''); }

    // o tremido da chegada: as alças tremem em sentidos opostos, crescem e soltam anéis
    function startPluck() { if (motionOn() && hdrag === null) pluck = { t0: performance.now(), dx: 0, dy: 0, e: 0 }; }
    function stepPluck(now) {
      if (!pluck) return;
      var s = (now - pluck.t0) / 1000;
      if (s > 2.4) { pluck = null; return; }
      var env = Math.exp(-s * 1.9) * Math.min(1, s / 0.05);
      pluck.e = env;
      pluck.dy = 0.15 * env * Math.sin(s * TAU * 2.6);
      pluck.dx = 0.05 * env * Math.sin(s * TAU * 3.7 + 1.1);
    }
    function shownBez() {
      if (!pluck) return bez;
      return { x1: clamp(bez.x1 + pluck.dx, 0, 1), y1: bez.y1 + pluck.dy, x2: clamp(bez.x2 - pluck.dx, 0, 1), y2: bez.y2 - pluck.dy };
    }

    function renderGraph() {
      handles.forEach(function (h, i) {
        var x = i ? bez.x2 : bez.x1, y = i ? bez.y2 : bez.y1;
        var label = t('v1.handle').replace('{n}', i + 1).replace('{x}', fmtN(x)).replace('{y}', fmtN(y));
        h.setAttribute('aria-valuenow', fmtN(x));
        h.setAttribute('aria-valuetext', label);
        h.setAttribute('aria-label', label);
      });
      $$('[data-preset]').forEach(function (b) {
        var p = PRESETS[b.getAttribute('data-preset')];
        var on = Math.abs(p[0] - bez.x1) < 0.005 && Math.abs(p[1] - bez.y1) < 0.005 && Math.abs(p[2] - bez.x2) < 0.005 && Math.abs(p[3] - bez.y2) < 0.005;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      drawCurve();
    }

    function drawCurve() {
      var b = shownBez();
      var y1 = 1 - b.y1, y2 = 1 - b.y2;
      curvePath.setAttribute('d', 'M0,1 C' + b.x1.toFixed(4) + ',' + y1.toFixed(4) + ' ' + b.x2.toFixed(4) + ',' + y2.toFixed(4) + ' 1,0');
      arm1.setAttribute('x2', b.x1.toFixed(4)); arm1.setAttribute('y2', y1.toFixed(4));
      arm2.setAttribute('x2', b.x2.toFixed(4)); arm2.setAttribute('y2', y2.toFixed(4));
      handles[0].setAttribute('transform', 'translate(' + b.x1.toFixed(4) + ',' + y1.toFixed(4) + ')');
      handles[1].setAttribute('transform', 'translate(' + b.x2.toFixed(4) + ',' + y2.toFixed(4) + ')');
      // as áreas de pegar seguem as alças (o viewBox do gráfico é -0.22 -0.32 1.44 1.64)
      grips.forEach(function (gp, i) {
        gp.style.left = (((i ? b.x2 : b.x1) + 0.22) / 1.44 * 100).toFixed(2) + '%';
        gp.style.top = (((i ? y2 : y1) + 0.32) / 1.64 * 100).toFixed(2) + '%';
      });
      var e = pluck ? pluck.e : 0;
      knobs.forEach(function (k) { k.setAttribute('r', (0.028 * (1 + 0.7 * e)).toFixed(4)); });
      var s = pluck ? (performance.now() - pluck.t0) / 1000 : 0, u = (s % 0.6) / 0.6;
      rings.forEach(function (r, i) {
        r.setAttribute('cx', (i ? b.x2 : b.x1).toFixed(4)); r.setAttribute('cy', (i ? y2 : y1).toFixed(4));
        r.setAttribute('r', (0.03 + 0.13 * u).toFixed(4));
        r.style.opacity = pluck ? ((1 - u) * e).toFixed(3) : '0';
      });
      if (!motionOn()) { placeRider(0.5, true); drawBg(0); }
    }

    function bezAt(x, c) {
      c = c || bez;
      var ax = 3 * c.x1 - 3 * c.x2 + 1, bx = 3 * c.x2 - 6 * c.x1, cx = 3 * c.x1;
      var ay = 3 * c.y1 - 3 * c.y2 + 1, by = 3 * c.y2 - 6 * c.y1, cy = 3 * c.y1;
      var sx = function (u) { return ((ax * u + bx) * u + cx) * u; };
      var u = x;
      for (var i = 0; i < 8; i++) {
        var e = sx(u) - x;
        var d = (3 * ax * u + 2 * bx) * u + cx;
        if (Math.abs(e) < 1e-5) break;
        if (Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      if (u < 0 || u > 1 || Math.abs(sx(u) - x) > 1e-3) {
        var lo = 0, hi = 1; u = x;
        for (var j = 0; j < 30; j++) { var v = sx(u); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = u; else hi = u; u = (lo + hi) / 2; }
      }
      return ((ay * u + by) * u + cy) * u;
    }

    /* a bolinha de tungstênio anda sobre a curva no ritmo da própria curva: o
       tempo reto s vira avanço pela bezier, e o tamanho segue a velocidade (a
       inclinação da curva naquele instante). Atrás dela ficam cópias do caminho,
       mais espaçadas quanto mais depressa ela vai; um halo cresce com a pressa e
       duas linhas finas a ligam ao tempo (embaixo) e ao valor (à esquerda).
       Passado o fim (s > 1), ela espera e as cópias a alcançam. */
    function placeRider(s, still) {
      var c = shownBez(), sd = Math.min(s, 1), rest = s > 1;
      var at = function (tt) { var px = clamp(bezAt(clamp(tt, 0, 1), c), 0, 1); return { x: px, y: 1 - bezAt(px, c) }; };
      var q = at(sd);
      var h = 0.02, v = Math.abs(bezAt(clamp(sd + h, 0, 1), c) - bezAt(clamp(sd - h, 0, 1), c)) / (Math.min(sd + h, 1) - Math.max(sd - h, 0));
      if (still) v = 1; else if (rest) v = 0;
      var r = 0.026 * clamp(0.7 + 0.55 * v, 0.7, 2.3);
      riderR = still || !motionOn() ? r : riderR + (r - riderR) * 0.3;
      var cx = q.x.toFixed(4), cy = q.y.toFixed(4);
      rider.setAttribute('cx', cx); rider.setAttribute('cy', cy);
      rider.setAttribute('r', riderR.toFixed(4));
      halo.setAttribute('cx', cx); halo.setAttribute('cy', cy);
      halo.setAttribute('r', (riderR * 1.9 + 0.012).toFixed(4));
      halo.style.opacity = (still ? 0.3 : clamp(0.12 + 0.3 * v, 0.12, 0.6)).toFixed(3);
      guideX.setAttribute('x1', cx); guideX.setAttribute('x2', cx); guideX.setAttribute('y1', 1); guideX.setAttribute('y2', cy);
      guideY.setAttribute('x1', 0); guideY.setAttribute('x2', cx); guideY.setAttribute('y1', cy); guideY.setAttribute('y2', cy);
      trail.forEach(function (g, k) {
        var tk = s - (k + 1) * 0.05;
        if (still || tk < 0 || tk >= 1) { g.style.opacity = '0'; return; }
        var p = at(tk);
        g.setAttribute('cx', p.x.toFixed(4)); g.setAttribute('cy', p.y.toFixed(4));
        g.setAttribute('r', (riderR * (0.9 - k * 0.1)).toFixed(4));
        g.style.opacity = ((0.5 - k * 0.085) * clamp((1 - tk) / 0.06, 0, 1)).toFixed(3);
      });
    }

    // a cor da palavra COR sai da forma da curva: cada alça empurra o matiz, e a
    // cor anda aos poucos até lá. As quatro curvas prontas caem em laranja, azul,
    // verde e magenta
    function corHue(b) {
      var h = 0.418 * b.x1 + 0.512 * b.y1 + 1.146 * b.x2 + 0.3 * b.y2 - 0.89;
      return ((h % 1) + 1) % 1 * 360;
    }
    function tickCor(dt) {
      if (!corEl) return;
      var want = corHue(shownBez());
      if (cor.h < 0 || !motionOn()) cor.h = want;
      else {
        var d = ((want - cor.h + 540) % 360) - 180;
        cor.h = (cor.h + d * (1 - Math.exp(-dt / 260)) + 360) % 360;
      }
      var key = Math.round(cor.h * 4);
      if (key === cor.k) return;
      cor.k = key;
      corEl.style.color = 'hsl(' + cor.h.toFixed(1) + ', 88%, 62%)';
    }

    function tickTrack(T) {
      var now = performance.now();
      if (bezTw) {
        var tw = bezTw, k = clamp((now - tw.t0) / tw.dur, 0, 1), e = M.ease.inOut(k);
        ['x1', 'y1', 'x2', 'y2'].forEach(function (key) { bez[key] = lerp(tw.from[key], tw.to[key], e); });
        if (k >= 1) bezTw = null;
        renderGraph();
      }
      if (pluck) { stepPluck(now); drawCurve(); }
      var f = (T % CYCLE) / CYCLE;
      placeRider(f * CYCLE / MOVE);
      drawBg(T);
    }

    function layoutPlay() {
      var W = playFrame.clientWidth, H = playFrame.clientHeight;
      if (!W || !H) return;
      layoutBg(W, H);
      drawCurve();
    }

    function svgPoint(e) {
      var pt = graph.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var m = graph.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      var r = pt.matrixTransform(m.inverse());
      return { x: r.x, y: r.y };
    }
    function setHandle(i, x, y) {
      x = clamp(x, 0, 1); y = clamp(y, YMIN, YMAX);
      if (i === 0) { bez.x1 = x; bez.y1 = y; } else { bez.x2 = x; bez.y2 = y; }
      renderGraph();
    }
    // cada alça tem uma área de pegar do tamanho de um dedo: no toque só elas pegam,
    // e o resto do gráfico deixa a página (ou o trilho) seguir com o gesto
    var graphWrap = $('.graph-wrap');
    var grips = $$('.graph-grip', graphWrap);
    var hoff = { x: 0, y: 0 };
    graphWrap.addEventListener('mousedown', function (e) { e.preventDefault(); });
    graphWrap.addEventListener('pointerdown', function (e) {
      var grip = e.target.closest('.graph-grip, .graph-handle');
      if (!grip && e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = svgPoint(e);
      bezTw = null; pluck = null;
      if (grip) {
        hdrag = parseInt(grip.getAttribute('data-h'), 10) - 1;
        hoff.x = (hdrag ? bez.x2 : bez.x1) - p.x; hoff.y = (hdrag ? bez.y2 : bez.y1) - (1 - p.y);
      } else {
        var d1 = Math.hypot(p.x - bez.x1, (1 - p.y) - bez.y1), d2 = Math.hypot(p.x - bez.x2, (1 - p.y) - bez.y2);
        hdrag = d1 <= d2 ? 0 : 1;
        hoff.x = hoff.y = 0;
        setHandle(hdrag, p.x, 1 - p.y);
      }
      handles[hdrag].classList.add('is-active');
      if (messNote) messNote.classList.add('is-done');
      drawCurve();
      try { graphWrap.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      e.preventDefault();
    });
    graphWrap.addEventListener('pointermove', function (e) {
      if (hdrag === null) return;
      var p = svgPoint(e);
      setHandle(hdrag, p.x + hoff.x, 1 - p.y + hoff.y);
    });
    var endDrag = function () { if (hdrag !== null) handles[hdrag].classList.remove('is-active'); hdrag = null; };
    graphWrap.addEventListener('pointerup', endDrag);
    graphWrap.addEventListener('pointercancel', endDrag);
    handles.forEach(function (h, i) {
      h.addEventListener('keydown', function (e) {
        var st = e.shiftKey ? 0.1 : 0.01;
        var x = i ? bez.x2 : bez.x1, y = i ? bez.y2 : bez.y1;
        if (e.key === 'ArrowLeft') x -= st;
        else if (e.key === 'ArrowRight') x += st;
        else if (e.key === 'ArrowUp') y += st;
        else if (e.key === 'ArrowDown') y -= st;
        else return;
        e.preventDefault();
        bezTw = null;
        if (messNote) messNote.classList.add('is-done');
        setHandle(i, x, y);
      });
    });
    $$('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = PRESETS[b.getAttribute('data-preset')];
        pluck = null;
        var to = { x1: p[0], y1: p[1], x2: p[2], y2: p[3] };
        if (motionOn()) bezTw = { from: { x1: bez.x1, y1: bez.y1, x2: bez.x2, y2: bez.y2 }, to: to, t0: performance.now(), dur: 620 };
        else { bez.x1 = to.x1; bez.y1 = to.y1; bez.x2 = to.x2; bez.y2 = to.y2; renderGraph(); }
      });
    });
    /* fundo: os três canais como histogramas, como no painel de cor de um editor.
       A curva funciona como curva de tons: onde ela é plana os tons se juntam em
       picos, onde é íngreme eles se espalham em vales; o que passa de 0 ou de 1
       estoura na borda. Os picos andam no ritmo da curva, um passo por ciclo. */
    var bgCanvas = $('.play-bg'), bgc = bgCanvas.getContext && bgCanvas.getContext('2d');
    var BW = 0, BH = 0, BD = 1;
    var NX = 420, NB = 160;
    var RGB = [
      { col: '255,59,48', peaks: [[0.18, 0.06, 1], [0.55, 0.11, 0.65], [0.86, 0.05, 0.55]], ph: 0 },
      { col: '48,209,88', peaks: [[0.3, 0.08, 0.85], [0.5, 0.05, 1], [0.76, 0.09, 0.6]], ph: 0.33 },
      { col: '10,132,255', peaks: [[0.12, 0.05, 0.75], [0.42, 0.1, 0.9], [0.68, 0.06, 0.8]], ph: 0.66 }
    ];
    var hist = [new Float32Array(NB), new Float32Array(NB), new Float32Array(NB)];
    var hTmp = new Float32Array(NB), toneOut = new Float32Array(NX);
    var histMax = 0;

    function layoutBg(W, H) {
      BD = Math.min(global.devicePixelRatio || 1, 1.5);
      BW = W; BH = H;
      bgCanvas.width = Math.round(W * BD); bgCanvas.height = Math.round(H * BD);
    }
    function smoothHist(a) {
      for (var pass = 0; pass < 2; pass++) {
        for (var j = 0; j < NB; j++) {
          var s = 0, w = 0;
          for (var o = -2; o <= 2; o++) {
            var q = j + o;
            if (q < 0 || q >= NB) continue;
            var k = 3 - Math.abs(o);
            s += a[q] * k; w += k;
          }
          hTmp[j] = s / w;
        }
        a.set(hTmp);
      }
    }
    function drawBg(T) {
      if (!bgc || !BW) return;
      var c = shownBez();
      var k = Math.floor(T / CYCLE), f = (T - k * CYCLE) / CYCLE;
      var phase = k + bezAt(Math.min(f * CYCLE / MOVE, 1), c);
      var i, j, ch;
      for (i = 0; i < NX; i++) toneOut[i] = bezAt((i + 0.5) / NX, c);
      var top = 0;
      for (ch = 0; ch < 3; ch++) {
        var C = RGB[ch], h = hist[ch];
        h.fill(0);
        var drift = 0.05 * Math.sin((phase / 3 + C.ph) * TAU), sway = 0.025 * Math.sin((phase / 2 + C.ph * 2) * TAU);
        for (i = 0; i < NX; i++) {
          var x = (i + 0.5) / NX, v = 0.05;
          for (var q = 0; q < 3; q++) {
            var P = C.peaks[q];
            var d = (x - (P[0] + (q % 2 ? -drift : drift) + sway + 0.04 * Math.sin((playWarp * 1.6 + C.ph + q * 0.37) * TAU))) / (P[1] * (1 + 0.24 * Math.sin((playWarp * 1.3 + C.ph * 2 + q * 0.29) * TAU)));
            v += P[2] * Math.exp(-0.5 * d * d);
          }
          h[Math.round(clamp(toneOut[i], 0, 1) * (NB - 1))] += v;
        }
        smoothHist(h);
        for (j = 3; j < NB - 3; j++) if (h[j] > top) top = h[j];
      }
      histMax = (histMax && motionOn()) ? histMax + (top - histMax) * 0.2 : top;

      var g = bgc, amp = BH * (BW < BH ? 0.46 : 0.6);
      g.setTransform(BD, 0, 0, BD, 0, 0);
      g.globalCompositeOperation = 'source-over';
      if (E.opaque) { g.fillStyle = '#070707'; g.fillRect(0, 0, BW, BH); }
      else g.clearRect(0, 0, BW, BH);
      // a grade do medidor
      g.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      g.lineWidth = 1;
      g.beginPath();
      for (j = 1; j <= 4; j++) { var gyy = Math.round(BH - amp * j / 4) + 0.5; g.moveTo(0, gyy); g.lineTo(BW, gyy); }
      for (j = 1; j < 4; j++) { var gxx = Math.round(BW * j / 4) + 0.5; g.moveTo(gxx, BH - amp); g.lineTo(gxx, BH); }
      g.stroke();
      // os canais somam luz: onde se cruzam viram ciano, magenta, amarelo e branco.
      // A altura vai pela raiz, para os vales não sumirem perto dos picos estourados.
      g.globalCompositeOperation = 'lighter';
      var hy = function (v) { return BH - amp * Math.sqrt(Math.min(v / histMax, 1.6)); };
      for (ch = 0; ch < 3; ch++) {
        var hh = hist[ch], col = RGB[ch].col;
        var fill = g.createLinearGradient(0, BH - amp, 0, BH);
        fill.addColorStop(0, 'rgba(' + col + ', 0.5)');
        fill.addColorStop(1, 'rgba(' + col + ', 0.05)');
        g.beginPath();
        g.moveTo(0, BH);
        for (j = 0; j < NB; j++) g.lineTo(BW * j / (NB - 1), hy(hh[j]));
        g.lineTo(BW, BH);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
        g.beginPath();
        for (j = 0; j < NB; j++) {
          var px = BW * j / (NB - 1), py = hy(hh[j]);
          if (j) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.strokeStyle = 'rgba(' + col + ', 0.95)';
        g.lineWidth = 1.5;
        g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }

    var hint = $('[data-hint]');
    function renderHint() { hint.textContent = t(Site.isTouch() ? 'hint.touch' : 'hint.pointer'); }
    var hinted = false;
    function dismissHint() { if (hinted) return; hinted = true; hint.classList.add('is-gone'); }
    ['wheel', 'pointerdown', 'keydown', 'scroll', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, function () { if (introDone) dismissHint(); }, { passive: true }); });

    /* ---------- Grão ---------- */

    (function grain() {
      var c = doc.createElement('canvas'); c.width = c.height = 180;
      var g = c.getContext('2d');
      if (!g) return;
      var img = g.createImageData(180, 180);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      $('.grain').style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
    })();

    /* ---------- As cenas e o relógio mestre ----------
       A navegação diz, a cada quadro, quanto de cada cena já passou (p, de 0 a 1)
       e se ela está à vista; a cena em foco ganha o gesto de chegada. Tudo o que
       anda sozinho anda pelo mesmo relógio, que acelera com a velocidade da
       navegação. */

    var SC = {
      title: { el: title, p: 0, vis: false },
      design: { el: designFrame, p: 0, vis: false },
      play: { el: playFrame, p: 0, vis: false },
      works: { el: worksFrame, p: 0, vis: false },
      close: { el: creditsFrame, p: 0, vis: false }
    };
    reelLabels.forEach(function (r, i) { SC['reel' + i] = r; });
    var cur = '', clock = 0, sCur = 0, sLast = -1, introDone = false;

    function setCurrent(key) {
      if (key === cur) return;
      var prev = cur;
      cur = key;
      if (prev === 'works') setOpen(false);
      if (prev === 'design') mon.manual = false;
      // na Interação a curva dá uma vibrada ao chegar e o bilhete se desenha: as alças pedem para ser puxadas
      if (key === 'play') { startPluck(); drawNote(messNote); }
      // a pasta se monta a cada chegada, e o ponto recomeça do primeiro trabalho
      if (key === 'works') { wk.start = clock; enterFolders(); drawNote(openNote); }
      // no Design a corrente anda logo depois da chegada
      if (key === 'design' && chain.roll < 0) chain.next = clock + 0.9;
      // no título a caixinha chama logo depois da chegada
      if (key === 'title') { bx.next = clock + 0.5; bx.calls = 0; }
      if (key === 'close' && cgrid && motionOn()) cgrid.ripple(creditsFrame.clientWidth / 2, creditsFrame.clientHeight / 2, 1.2);
    }

    function smooth01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
    // os bilhetes à mão (bagunce, abrir): a seta se desenha a cada chegada
    function drawNote(el) {
      if (!el || !motionOn()) return;
      el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in');
    }

    // título: o nome sozinho; rolando, ele sobe e encolhe e os papéis entram por baixo
    function scrubTitle(dt) {
      var live = motionOn(), sT = live ? smooth01((SC.title.p - 0.08) / 0.5) : (SC.title.p > 0.3 ? 1 : 0);
      sCur = live ? sCur + (sT - sCur) * (1 - Math.exp(-dt / 80)) : sT;
      if (Math.abs(sT - sCur) < 0.0004) sCur = sT;
      if (Math.abs(sCur - sLast) > 0.0002 || (sCur !== sLast && (sCur === 0 || sCur === 1))) { sLast = sCur; title.style.setProperty('--s', sCur.toFixed(4)); }
      // a caixinha só se deixa pegar quando está à vista
      if ((sCur > 0.85) !== subOn) { subOn = !subOn; title.classList.toggle('has-sub', subOn); }
    }

    // Design: o quadro com a foto segue a rolagem, de 16:9 a 1:1, a 9:16 e de
    // volta, parando um pouco em cada uma (o caos, ao lado, anda sozinho)
    var ASPECT = [[0, 16 / 9], [0.12, 16 / 9], [0.32, 1], [0.42, 1], [0.62, 9 / 16], [0.72, 9 / 16], [0.92, 16 / 9]];
    function aspectAt(p) {
      for (var i = 1; i < ASPECT.length; i++) {
        if (p <= ASPECT[i][0]) {
          var A = ASPECT[i - 1], B = ASPECT[i], u = smooth01((p - A[0]) / (B[0] - A[0]));
          return Math.exp(lerp(Math.log(A[1]), Math.log(B[1]), u));
        }
      }
      return ASPECT[ASPECT.length - 1][1];
    }
    function scrubDesign(dt) {
      var D = SC.design;
      if (!D.vis || !motionOn() || mdrag || mon.manual || mon.tw) return;
      var f = 1 - Math.exp(-dt / 110), a = aspectAt(D.p);
      var na = Math.exp(lerp(Math.log(mon.a), Math.log(a), f)), nk = mon.k + (1 - mon.k) * f;
      if (Math.abs(a - na) < 0.0008) na = a;
      if (Math.abs(1 - nk) < 0.001) nk = 1;
      if (na === mon.a && nk === mon.k) return;
      kickBlob(clamp((na - mon.a) * 0.6, -0.08, 0.08));
      mon.a = na; mon.k = nk;
      layoutMonitor();
      syncFormatUi();
    }

    // dt em ms; v é a velocidade da navegação, em telas por segundo
    function tickAll(dt, now, v) {
      var live = motionOn();
      if (live) clock += (dt / 1000) * (1 + clamp(v * 0.7, 0, 3));
      scrubTitle(dt);
      if (SC.title.vis) tickBox(dt);
      tickMon(now);
      scrubDesign(dt);
      scrubWorks();
      // a rolagem pela Interação torce de leve as curvas de cor
      playWarp += (SC.play.p - playWarp) * (live ? 1 - Math.exp(-dt / 140) : 1);
      if (SC.play.vis) tickCor(dt);
      lightFrame(dt, v);
      if (live) {
        if (SC.title.vis) tickRoles(clock);
        if (SC.design.vis) { tickCaos(clock); tickWords(clock); tickBlob(dt); designFx(dt, v); }
        if (SC.play.vis) tickTrack(clock);
        if (SC.works.vis) drawOnion(clock);
        if (SC.close.vis) creditsFx(dt, v);
      }
      tickPlaceholders(clock);
    }

    /* ---------- Idioma e movimento ---------- */

    function relabel() {
      buildCaos();
      fitCaos();
      buildWords();
      measureWords();
      layoutMonitor();
      syncFormatUi();
      renderReelLabels();
      renderSocials();
      renderRolesText();
      renderHint();
      renderGraph();
      renderFolder();
      setRole(roleIdx, clock);
      layoutTitle();
    }
    Site.on('lang', relabel);
    Site.on('motion', function (on) {
      lightDirty = true; wk.sel = -2; cor.k = -1;
      if (!on) { caosOrder(true); chain.roll = -1; drawWords(clock); designStatic(); creditsStatic(); staticOnion(); pluck = null; bezTw = null; drawCurve(); resetBox(); setRole(0, clock); cells.forEach(function (c) { c.ch = c.want; c.el.textContent = c.ch === ' ' ? ' ' : c.ch; }); }
      else { roleAt = clock; }
    });

    function refit() {
      // o nome e os títulos alargam ou estreitam com a proporção da tela
      var fw = title.clientWidth || global.innerWidth, fh = title.clientHeight || global.innerHeight;
      root.style.setProperty('--wdth', clamp(62 + ((fw - 40) / Math.max(1, fh - 100) - 0.56) * (63 / 1.22), 62, 125).toFixed(1) + '%');
      fitName();
      if (light) { light.resize(title.clientWidth, title.clientHeight); lightDirty = true; }
      fitCaos();
      measureWords();
      layoutMonitor();
      if (lattice) lattice.resize(designFrame.clientWidth, designFrame.clientHeight);
      if (cgrid) cgrid.resize(creditsFrame.clientWidth, creditsFrame.clientHeight);
      if (!motionOn()) { designStatic(); creditsStatic(); }
      layoutOnion();
      if (!motionOn()) staticOnion();
      layoutPlay();
    }

    /* ---------- Luz do título ---------- */

    var lightCanvas = $('.title-light');
    var light = global.MeshLight ? global.MeshLight.create(lightCanvas) : null;
    var lightDirty = true, lastDim = -1;
    if (light) light.seek(14);
    else title.classList.add('no-light');

    function lightFrame(dt, v) {
      if (!light || !SC.title.vis) return;
      var live = motionOn();
      var dim = sCur * 0.62;
      if (!live && !lightDirty && Math.abs(dim - lastDim) < 0.002) return;
      lightDirty = false; lastDim = dim;
      var on = false, x = 0, y = 0;
      if (live && ptr.on && !E.overview()) {
        var r = lightCanvas.getBoundingClientRect();
        if (r.width > 0) {
          x = (ptr.x - r.left) / r.width * 2 - 1;
          y = -((ptr.y - r.top) / r.height * 2 - 1);
          on = x > -1 && x < 1 && y > -1 && y < 1;
        }
      }
      light.pointer(x, y, on);
      light.frame(dt, live ? clamp(v * 1.4, 0, 3) : 0, dim, live);
    }

    // a varredura da ponta de filme, no espaço dos vídeos que ainda não chegaram
    function wedge(frac) {
      var r = 400;
      if (frac <= 0) return '';
      if (frac >= 0.999) return 'M-400,-400H400V400H-400Z';
      var a = frac * Math.PI * 2;
      return 'M0,0L0,' + (-r) + 'A' + r + ',' + r + ' 0 ' + (frac > 0.5 ? 1 : 0) + ' 1 ' + (r * Math.sin(a)).toFixed(2) + ',' + (-r * Math.cos(a)).toFixed(2) + 'Z';
    }

    /* ---------- Início ---------- */

    Site.init();
    renderReelLabels();
    renderFolder();
    renderSocials();
    renderRolesText();
    renderHint();
    renderGraph();
    buildCaos();
    buildWords();
    setFormat(0, true);
    setRole(0, 0);

    // quando a fonte chega, as medidas do nome e da frase são refeitas
    if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', function () { refit(); });
    var fontsReady = (doc.fonts && doc.fonts.ready) ? Promise.race([doc.fonts.ready, new Promise(function (r) { setTimeout(r, 1800); })]) : Promise.resolve();
    function titleIn() {
      fontsReady.then(function () {
        refit();
        requestAnimationFrame(function () { title.classList.add('is-titled'); });
      });
    }

    return {
      scenes: SC,
      // p de 0 a 1: quanto da cena já passou; vis: se ela está na tela
      set: function (key, p, vis) { var sc = SC[key]; if (sc) { sc.p = p; sc.vis = vis; } },
      current: setCurrent,
      focus: function () { return cur; },
      frame: tickAll,
      refit: refit,
      clock: function () { return clock; },
      // a curva que o visitante desenha na Interação: entra o tempo (0 a 1), sai o avanço (pode passar de 1)
      curve: function (x) { return bezAt(clamp(x, 0, 1)); },
      reels: reelLabels.map(function (r) { return r.el; }),
      titleIn: titleIn,
      ready: function () { introDone = true; }
    };
  }

  global.V1Cenas = { create: create };
})(window);
