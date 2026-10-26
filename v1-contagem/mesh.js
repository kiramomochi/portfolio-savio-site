/*
  Malha de luz do painel de abertura. Adaptado do "Mesh drift" (21st.dev
  Shader Builder) para JS puro: um canvas WebGL, fundo escuro, luz branca.
  Quem desenha é o relógio da página (frame), não um laço próprio, para a
  luz andar junto com a câmera.
*/
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 a_position;\nvoid main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec3 u_colors[6];',
    'uniform vec4 u_scene;      // resolution.xy, time, presença do cursor',
    'uniform vec4 u_shape;      // escala, intensidade, apagar, warp',
    'uniform vec4 u_finish;     // detalhe, contraste, vinheta, grão',
    'uniform vec4 u_transform;  // semente, rotação, deriva, raio do cursor',
    'uniform vec4 u_space;      // offset.xy, cursor.xy',
    '#define u_resolution u_scene.xy',
    '#define u_time u_scene.z',
    '#define u_presence u_scene.w',
    '#define u_scale u_shape.x',
    '#define u_intensity u_shape.y',
    '#define u_dim u_shape.z',
    '#define u_warp u_shape.w',
    '#define u_detail u_finish.x',
    '#define u_contrast u_finish.y',
    '#define u_vignette u_finish.z',
    '#define u_grain u_finish.w',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    '#define u_seed u_transform.x',
    '#else',
    '#define u_seed mod(u_transform.x, 31.0)',
    '#endif',
    '#define u_rotate u_transform.y',
    '#define u_drift u_transform.z',
    '#define u_radius u_transform.w',
    '#define u_offset u_space.xy',
    '#define u_mouse u_space.zw',

    'float hash21(vec2 p) {',
    '#ifndef GL_FRAGMENT_PRECISION_HIGH',
    '  p = mod(p, 31.0);',
    '#endif',
    '  p = fract(p * vec2(234.34, 435.345));',
    '  p += dot(p, p + 34.23);',
    '  return fract(p.x * p.y);',
    '}',
    'float grainHash(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.2); a *= 0.5; }',
    '  return v;',
    '}',
    'vec3 shade(vec2 p, float t) {',
    '  vec3 acc = u_colors[0] * 0.15;',
    '  float total = 0.15;',
    '  for (int i = 0; i < 6; i++) {',
    '    float fi = float(i);',
    '    vec2 c = vec2(sin(t * (0.21 + fi * 0.071) + fi * 2.4 + u_seed),',
    '                  cos(t * (0.17 + fi * 0.093) + fi * 1.7)) * (0.45 + u_intensity * 0.35);',
    '    float w = exp(-dot(p - c, p - c) * 5.5);',
    '    acc += u_colors[i] * w;',
    '    total += w;',
    '  }',
    '  return acc / total;',
    '}',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);',
    '  float mask = 0.0;',
    // o cursor torce a luz em volta dele e acende um pouco onde passa
    '  if (u_presence > 0.001) {',
    '    vec2 cursor = (0.5 * u_mouse * u_resolution.xy) / min(u_resolution.x, u_resolution.y);',
    '    vec2 d = p - cursor;',
    '    mask = u_presence * (1.0 - smoothstep(0.0, u_radius, length(d)));',
    '    float ang = mask * 1.45;',
    '    float cc = cos(ang), cs = sin(ang);',
    '    p = cursor + mat2(cc, -cs, cs, cc) * d;',
    '  }',
    '  p *= u_scale;',
    '  float cr = cos(u_rotate), sr = sin(u_rotate);',
    '  p = mat2(cr, -sr, sr, cr) * p;',
    '  p += u_offset;',
    '  p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));',
    '  p += u_warp * (vec2(fbm(p * u_detail + u_seed), fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);',
    '  vec3 col = shade(p, u_time);',
    '  col = (col - 0.5) * u_contrast + 0.5;',
    '  float vd = length(uv - 0.5) * 1.41421356;',
    '  col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);',
    // embaixo e em cima a luz cai, para o texto pequeno ficar sobre o escuro
    '  col *= mix(0.32, 1.0, smoothstep(0.0, 0.26, uv.y)) * mix(0.6, 1.0, smoothstep(1.0, 0.82, uv.y));',
    '  col += vec3(0.07) * mask;',
    '  col *= 1.0 - u_dim;',
    '  col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  // receita: fundo quase preto; manchas claras e escuras alternadas desenham a luz branca
  var R = {
    colors: [[0.02, 0.02, 0.019], [0.94, 0.94, 0.92], [0.03, 0.03, 0.029], [0.4, 0.4, 0.39], [0.012, 0.012, 0.012], [0.72, 0.72, 0.7]],
    scale: 2.2, intensity: 0.6, warp: 0.34, detail: 1.536, contrast: 1.12,
    vignette: 0.32, grain: 0.05, seed: 4012.0, rotate: 5.6549,
    offsetX: 0.11, offsetY: -0.19, drift: 0.116, radius: 0.46, timeScale: -0.727
  };

  function make(canvas) {
    var gl = null;
    // sem placa de vídeo (desenho por software) a luz custaria o quadro inteiro: aí o
    // painel fica com o fundo parado do .no-light
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }); } catch (e) { gl = null; }
    if (!gl) return null;
    var dbg = gl.getExtension('WEBGL_debug_renderer_info');
    var gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) return null;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    var prog = gl.createProgram();
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.deleteShader(vs); gl.deleteShader(fs);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['u_colors', 'u_scene', 'u_shape', 'u_finish', 'u_transform', 'u_space'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    var flat = [];
    R.colors.forEach(function (c) { flat.push(c[0], c[1], c[2]); });
    gl.uniform3fv(U.u_colors, new Float32Array(flat));
    gl.uniform4f(U.u_finish, R.detail, R.contrast, R.vignette, R.grain);
    gl.uniform4f(U.u_transform, R.seed, R.rotate, R.drift, R.radius);

    var time = 0, mx = 0, my = 0, pres = 0, tx = 0, ty = 0, tp = 0;
    var cw = 0, ch = 0;

    function resize(w, h, ratio) {
      var dpr = Math.min(ratio || 1, 1.25);
      var rw = Math.max(1, Math.round(w * dpr)), rh = Math.max(1, Math.round(h * dpr));
      // teto de ~1 milhão de pixels: a luz é macia, não precisa de mais
      var k = Math.min(1, Math.sqrt(1000000 / (rw * rh)));
      rw = Math.max(1, Math.round(rw * k)); rh = Math.max(1, Math.round(rh * k));
      if (rw !== cw || rh !== ch) {
        canvas.width = cw = rw; canvas.height = ch = rh;
        gl.viewport(0, 0, rw, rh);
      }
    }

    return {
      resize: resize,
      // ponteiro em -1..1 no espaço do canvas; presença 0 ou 1
      pointer: function (x, y, on) {
        if (on && tp === 0 && pres < 0.01) { mx = x; my = y; }
        tx = x; ty = y; tp = on ? 1 : 0;
      },
      // dt em ms; speed acelera a deriva enquanto a câmera anda
      step: function (dt, speed, live) {
        var s = dt / 1000;
        if (live) time += s * (1 + speed) * R.timeScale;
        var f = 1 - Math.exp(-9 * s);
        mx += (tx - mx) * f; my += (ty - my) * f; pres += (tp - pres) * f * 0.7;
      },
      // dim apaga a luz
      draw: function (dim) {
        gl.uniform4f(U.u_scene, cw, ch, time, pres);
        gl.uniform4f(U.u_shape, R.scale, R.intensity, dim, R.warp);
        gl.uniform4f(U.u_space, R.offsetX, R.offsetY, mx, my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      seek: function (t) { time = t * R.timeScale; }
    };
  }

  // sem WebGL (ou com desenho por software) devolve null e o painel fica com o fundo parado
  function create(canvas, seekT) {
    var m = make(canvas);
    if (!m) return null;
    m.seek(seekT);
    return {
      resize: function (cw, ch) { m.resize(cw, ch, global.devicePixelRatio || 1); },
      pointer: m.pointer,
      frame: function (dt, speed, dim, live) { m.step(dt, speed, live); m.draw(dim); }
    };
  }

  global.MeshLight = { create: create };
})(window);
