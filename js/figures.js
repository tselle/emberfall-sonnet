/* Emberfall — figures.js
 * Every picture in the game is drawn here by code at start-up: wall and door
 * textures, building facades, monster and object sprites, character
 * portraits, combat figures and overland tiles. */
var Figures = (function () {
  'use strict';
  var F = {};
  var TEX = 64;
  F.TEX = TEX;

  /* ---------- colour helpers ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    var c = function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); };
    return '#' + c(r) + c(g) + c(b);
  }
  function shade(h, f) { var c = hexToRgb(h); return f >= 0 ? rgbToHex(c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f) : rgbToHex(c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)); }
  function mix(a, b, t) { var x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
  F.shade = shade; F.mix = mix; F.hexToRgb = hexToRgb;

  function canvas(w, h) {
    var c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    c.width = w; c.height = h;
    return c;
  }
  F.canvas = canvas;
  function rng(seed) { return Modules.rng('fig/' + seed); }

  function noiseFill(ctx, w, h, base, amt, r, size) {
    size = size || 1;
    var c = hexToRgb(base);
    for (var y = 0; y < h; y += size) for (var x = 0; x < w; x += size) {
      var n = (r() - 0.5) * amt;
      ctx.fillStyle = 'rgb(' + (c[0] + n | 0) + ',' + (c[1] + n | 0) + ',' + (c[2] + n | 0) + ')';
      ctx.fillRect(x, y, size, size);
    }
  }

  /* ======================================================================
   * Textures
   * ==================================================================== */
  var texDraw = {};
  texDraw.stone = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#6a6a72', 26, r, 2);
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2;
    for (var row = 0; row < 4; row++) {
      var y = row * 16;
      ctx.beginPath(); ctx.moveTo(0, y + 1); ctx.lineTo(TEX, y + 1); ctx.stroke();
      var off = row % 2 ? 0 : 16;
      for (var x = off; x < TEX; x += 32) { ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + 16); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (var row2 = 0; row2 < 4; row2++) ctx.fillRect(0, row2 * 16 + 3, TEX, 2);
  };
  texDraw.wood = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#6b4a2b', 18, r, 1);
    ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 1;
    for (var x = 0; x < TEX; x += 8) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, TEX); ctx.stroke(); }
    for (var i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(40,20,5,0.35)'; ctx.fillRect(r() * TEX | 0, r() * TEX | 0, 1, 3 + r() * 6 | 0); }
    ctx.fillStyle = '#3d2a17'; ctx.fillRect(0, 0, TEX, 6); ctx.fillRect(0, 30, TEX, 4);
    ctx.fillStyle = '#28190c'; ctx.fillRect(0, 5, TEX, 1); ctx.fillRect(0, 33, TEX, 1);
    ctx.fillStyle = '#8a8a90'; for (var n = 4; n < TEX; n += 16) { ctx.fillRect(n, 2, 2, 2); ctx.fillRect(n, 31, 2, 2); }
  };
  texDraw.cave = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#5a4c3e', 30, r, 2);
    for (var i = 0; i < 14; i++) {
      var x = r() * TEX, y = r() * TEX, rad = 4 + r() * 10;
      var g = ctx.createRadialGradient(x - rad / 3, y - rad / 3, 1, x, y, rad);
      g.addColorStop(0, 'rgba(150,130,105,0.5)'); g.addColorStop(1, 'rgba(30,22,15,0.4)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,15,10,0.6)';
    for (var j = 0; j < 6; j++) { ctx.beginPath(); var sx = r() * TEX, sy = r() * TEX; ctx.moveTo(sx, sy); for (var k = 0; k < 4; k++) { sx += (r() - 0.5) * 16; sy += r() * 10; ctx.lineTo(sx, sy); } ctx.stroke(); }
  };
  texDraw.crypt = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#4a4650', 22, r, 2);
    ctx.strokeStyle = '#1c1a20'; ctx.lineWidth = 2;
    for (var row = 0; row < 2; row++) { ctx.beginPath(); ctx.moveTo(0, row * 32 + 1); ctx.lineTo(TEX, row * 32 + 1); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(1, TEX); ctx.moveTo(33, 0); ctx.lineTo(33, 32); ctx.stroke();
    // a burial niche with a skull
    ctx.fillStyle = '#141216'; ctx.fillRect(40, 40, 18, 14);
    ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.arc(49, 47, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#141216'; ctx.fillRect(47, 46, 1, 1); ctx.fillRect(50, 46, 1, 1);
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(43, 51, 12, 1);
    ctx.fillStyle = 'rgba(80,140,80,0.25)'; for (var i = 0; i < 30; i++) ctx.fillRect(r() * TEX | 0, r() * TEX | 0, 2, 2);
  };
  texDraw.brass = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#7a6538', 16, r, 2);
    ctx.fillStyle = '#5a4520'; ctx.fillRect(0, 0, TEX, 4); ctx.fillRect(0, TEX - 4, TEX, 4); ctx.fillRect(0, 0, 4, TEX); ctx.fillRect(TEX - 4, 0, 4, TEX);
    ctx.strokeStyle = '#b8984c'; ctx.lineWidth = 2; ctx.strokeRect(8, 8, 48, 48);
    ctx.strokeStyle = '#4a3818'; ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(52, 32); ctx.lineTo(32, 52); ctx.lineTo(12, 32); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#d8b860'; [[6, 6], [56, 6], [6, 56], [56, 56]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(64,192,255,0.5)'; ctx.fillRect(30, 30, 4, 4);
  };
  texDraw.tower = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#181820', 10, r, 2);
    for (var i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(60,220,140,' + (0.25 + r() * 0.4) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); var x = r() * TEX, y = 0; ctx.moveTo(x, y);
      while (y < TEX) { x += (r() - 0.5) * 12; y += 4 + r() * 8; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    var g = ctx.createLinearGradient(0, 0, TEX, TEX); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, TEX, TEX);
    ctx.strokeStyle = '#08080c'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 62, 62);
  };
  texDraw.ice = function (ctx, r) { noiseFill(ctx, TEX, TEX, '#9ab8d0', 20, r, 2); };
  texDraw.citywall = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#7c7468', 24, r, 2);
    ctx.strokeStyle = '#3a342c'; ctx.lineWidth = 2;
    for (var row = 0; row < 5; row++) {
      var y = 12 + row * 13; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX, y); ctx.stroke();
      for (var x = (row % 2) * 10; x < TEX; x += 20) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 13); ctx.stroke(); }
    }
    // crenellations against the sky
    ctx.clearRect(0, 0, TEX, 4);
    ctx.fillStyle = '#7c7468'; for (var c = 0; c < TEX; c += 16) ctx.fillRect(c, 0, 9, 12);
    ctx.clearRect(9, 0, 7, 6); ctx.clearRect(25, 0, 7, 6); ctx.clearRect(41, 0, 7, 6); ctx.clearRect(57, 0, 7, 6);
  };
  var FACADE_COL = { 1: '#c8a870', 2: '#e8e0d0', 3: '#8a6a58', 4: '#6a5a90', 5: '#a07050', 6: '#c8c0a0', 7: '#b08860', 8: '#a09070', 9: '#d0c0a0' };
  function facadeBase(ctx, r, col) {
    noiseFill(ctx, TEX, TEX, col, 14, r, 2);
    // timber framing
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(0, 0, TEX, 5); ctx.fillRect(0, 30, TEX, 4); ctx.fillRect(0, 0, 4, TEX); ctx.fillRect(TEX - 4, 0, 4, TEX);
    ctx.beginPath(); ctx.moveTo(4, 30); ctx.lineTo(30, 5); ctx.lineTo(34, 5); ctx.lineTo(8, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, 30); ctx.lineTo(34, 5); ctx.lineTo(30, 5); ctx.lineTo(56, 30); ctx.fill();
  }
  function windowAt(ctx, x, y, lit) {
    ctx.fillStyle = '#3a2818'; ctx.fillRect(x - 1, y - 1, 12, 14);
    ctx.fillStyle = lit ? '#f0c060' : '#203048'; ctx.fillRect(x, y, 10, 12);
    ctx.fillStyle = '#3a2818'; ctx.fillRect(x + 4, y, 2, 12); ctx.fillRect(x, y + 5, 10, 2);
  }
  texDraw.facade = function (ctx, r, kind) {
    facadeBase(ctx, r, FACADE_COL[kind] || '#d0c0a0');
    windowAt(ctx, 10, 40, r() < 0.5); windowAt(ctx, 44, 40, r() < 0.6);
  };
  // sign icons for each kind of building
  function signIcon(ctx, kind, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(-11, -9, 22, 18);
    ctx.fillStyle = '#e8d8a8'; ctx.fillRect(-10, -8, 20, 16);
    ctx.lineWidth = 2;
    if (kind === 1) { // inn: tankard
      ctx.fillStyle = '#a06020'; ctx.fillRect(-5, -5, 8, 10); ctx.strokeStyle = '#a06020'; ctx.beginPath(); ctx.arc(4, 0, 3, -1.5, 1.5); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-5, -6, 8, 2);
    } else if (kind === 2) { // temple: rising sun
      ctx.fillStyle = '#e0a020'; ctx.beginPath(); ctx.arc(0, 3, 5, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#e0a020';
      for (var a = 0; a < 5; a++) { var an = Math.PI + a * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(an) * 6, 3 + Math.sin(an) * 6); ctx.lineTo(Math.cos(an) * 9, 3 + Math.sin(an) * 9); ctx.stroke(); }
    } else if (kind === 3) { // smith: anvil
      ctx.fillStyle = '#404048'; ctx.fillRect(-7, -3, 14, 4); ctx.fillRect(-3, 1, 6, 4); ctx.fillRect(-6, 5, 12, 2); ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(-10, -3); ctx.lineTo(-7, 0); ctx.fill();
    } else if (kind === 4) { // magic: star
      ctx.fillStyle = '#6040c0'; ctx.beginPath();
      for (var i = 0; i < 10; i++) { var rr = i % 2 ? 3 : 7, aa = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      ctx.fill();
    } else if (kind === 5) { // training: crossed swords
      ctx.strokeStyle = '#606878'; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(7, 6); ctx.moveTo(7, -6); ctx.lineTo(-7, 6); ctx.stroke();
      ctx.strokeStyle = '#a07020'; ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-3, 6); ctx.moveTo(6, 3); ctx.lineTo(3, 6); ctx.stroke();
    } else if (kind === 6) { // hall: scroll and seal
      ctx.fillStyle = '#f0e8c8'; ctx.fillRect(-7, -6, 14, 12); ctx.fillStyle = '#b02020'; ctx.beginPath(); ctx.arc(3, 3, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#806040'; ctx.fillRect(-5, -3, 8, 1); ctx.fillRect(-5, 0, 6, 1);
    } else if (kind === 7) { // tavern: grapes / goblet
      ctx.fillStyle = '#802040'; ctx.beginPath(); ctx.arc(0, -2, 5, 0, Math.PI); ctx.fill(); ctx.fillRect(-1, 2, 2, 4); ctx.fillRect(-4, 6, 8, 1);
    } else if (kind === 8) { // trader: coins
      ctx.fillStyle = '#d0a020'; ctx.beginPath(); ctx.arc(-3, 2, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(3, -1, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  texDraw.shopdoor = function (ctx, r, kind) {
    facadeBase(ctx, r, FACADE_COL[kind] || '#d0c0a0');
    // door
    ctx.fillStyle = '#2a1808'; ctx.fillRect(19, 33, 26, 31);
    ctx.fillStyle = '#6a4220'; ctx.fillRect(21, 35, 22, 29);
    ctx.fillStyle = '#4a2c10'; for (var x = 25; x < 43; x += 5) ctx.fillRect(x, 35, 1, 29);
    ctx.fillStyle = '#c0a040'; ctx.fillRect(38, 50, 3, 3);
    signIcon(ctx, kind, 32, 17);
    if (kind === 9) { ctx.fillStyle = FACADE_COL[9]; ctx.fillRect(20, 7, 24, 20); windowAt(ctx, 27, 10, true); }
  };
  texDraw.door = function (ctx, r, theme) {
    var frame = theme === 'cave' ? '#3a3026' : theme === 'brass' ? '#5a4520' : theme === 'tower' ? '#101014' : '#3a3a40';
    ctx.fillStyle = frame; ctx.fillRect(0, 0, TEX, TEX);
    var wood = theme === 'brass' ? '#8a7040' : theme === 'tower' ? '#2a2a34' : '#6a4422';
    noiseFill(ctx, 48, 58, wood, 16, r, 1);
    ctx.drawImage(ctx.canvas, 0, 0, 48, 58, 8, 6, 48, 58);
    ctx.fillStyle = shade(wood, -0.4); for (var x = 8; x < 56; x += 8) ctx.fillRect(x, 6, 1, 58);
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(8, 14, 48, 4); ctx.fillRect(8, 48, 48, 4);
    ctx.fillStyle = '#c0a040'; ctx.beginPath(); ctx.arc(48, 34, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = frame; ctx.fillRect(0, 0, 8, TEX); ctx.fillRect(56, 0, 8, TEX); ctx.fillRect(0, 0, TEX, 6);
  };
  texDraw.locked = function (ctx, r, theme) {
    texDraw.door(ctx, r, theme);
    ctx.fillStyle = '#505058'; ctx.fillRect(27, 28, 12, 12);
    ctx.strokeStyle = '#505058'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(33, 28, 4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#101010'; ctx.fillRect(32, 32, 2, 5);
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(8, 30, 48, 3);
  };
  texDraw.water = function (ctx, r) {
    noiseFill(ctx, TEX, TEX, '#28506a', 18, r, 2);
    ctx.strokeStyle = 'rgba(180,220,255,0.35)'; ctx.lineWidth = 1;
    for (var y = 6; y < TEX; y += 9) { ctx.beginPath(); for (var x = 0; x <= TEX; x += 4) ctx.lineTo(x, y + Math.sin(x / 6 + y) * 2); ctx.stroke(); }
    ctx.clearRect(0, 0, TEX, 40);
  };

  F.textures = {}; // name -> {w,h,data:[Uint32Array per shade]}
  var SHADES = 8;
  F.SHADES = SHADES;
  function bake(name, drawFn, arg, fog) {
    var c = canvas(TEX, TEX), ctx = c.getContext('2d');
    drawFn(ctx, rng(name), arg);
    var img = ctx.getImageData(0, 0, TEX, TEX);
    var levels = shadeLevels(img.data, fog || '#000000');
    F.textures[name] = { w: TEX, h: TEX, levels: levels, canvas: c };
    return F.textures[name];
  }
  // pre-shaded copies so the renderer only does table lookups
  function shadeLevels(px, fog) {
    var fc = hexToRgb(fog), out = [];
    for (var l = 0; l < SHADES; l++) {
      var t = l / (SHADES - 1) * 0.9, arr = new Uint32Array(px.length / 4);
      for (var i = 0, j = 0; i < px.length; i += 4, j++) {
        var a = px[i + 3];
        if (a < 128) { arr[j] = 0; continue; }
        var r = px[i] + (fc[0] - px[i]) * t, g = px[i + 1] + (fc[1] - px[i + 1]) * t, b = px[i + 2] + (fc[2] - px[i + 2]) * t;
        arr[j] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
      }
      out.push(arr);
    }
    return out;
  }
  F.shadeLevels = shadeLevels;

  F.THEMES = {
    stone: { wall: 'stone', fog: '#000000', ceil: ['#141418', '#2a2a30'], floor: ['#2a2622', '#4a443c'] },
    wood: { wall: 'wood', fog: '#000000', ceil: ['#1a120a', '#2e2214'], floor: ['#2a2018', '#4a3a28'] },
    cave: { wall: 'cave', fog: '#000000', ceil: ['#120e0a', '#2a2218'], floor: ['#221c14', '#3e3428'] },
    crypt: { wall: 'crypt', fog: '#04060a', ceil: ['#0a0a10', '#1c1c26'], floor: ['#1a1a20', '#34343c'] },
    brass: { wall: 'brass', fog: '#020408', ceil: ['#14100a', '#30261a'], floor: ['#2a2218', '#4a3e2a'] },
    tower: { wall: 'tower', fog: '#020a06', ceil: ['#060a08', '#101814'], floor: ['#101014', '#22222a'] },
    town: { wall: 'citywall', fog: '#8090a8', ceil: ['#4a78b8', '#a8c4e0'], floor: ['#5a6a40', '#7a8a58'], sky: true }
  };

  /* ======================================================================
   * Sprites (monsters, objects) — drawn into 64x64 (or larger) canvases
   * ==================================================================== */
  function ell(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); ctx.fill(); }
  function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
  function poly(ctx, pts, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); }
  function line(ctx, x1, y1, x2, y2, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function eyes(ctx, x, y, gap, col, size) { ell(ctx, x - gap, y, size || 1.6, size || 1.6, col || '#ff3020'); ell(ctx, x + gap, y, size || 1.6, size || 1.6, col || '#ff3020'); }
  function outline(ctx, w, h) {
    // dark outline makes sprites read against any background
    var img = ctx.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      if (d[i + 3] > 100) continue;
      var near = false;
      for (var k = 0; k < 4 && !near; k++) {
        var nx = x + [1, -1, 0, 0][k], ny = y + [0, 0, 1, -1][k];
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && d[(ny * w + nx) * 4 + 3] > 100) near = true;
      }
      if (near) { out[i] = 12; out[i + 1] = 10; out[i + 2] = 8; out[i + 3] = 255; }
    }
    img.data.set(out); ctx.putImageData(img, 0, 0);
  }

  var ARCH = {};
  // humanoid; scale 1 = man-size filling ~2/3 of the box height
  ARCH.hum = function (ctx, a, b, o, s) {
    s = s || 1;
    var skin = o.indexOf('z') >= 0 ? mix(a, '#80a080', 0.5) : o.indexOf('d') >= 0 ? '#e0b090' : mix(a, '#e0b090', 0.55);
    var cx = 32, base = 62, H = 46 * s, hw = 9 * s;
    var top = base - H;
    if (o.indexOf('w') >= 0) { poly(ctx, [cx - 4, top + H * 0.3, cx - 30 * s, top, cx - 26 * s, top + H * 0.5, cx - 4, top + H * 0.55], shade(b, -0.2)); poly(ctx, [cx + 4, top + H * 0.3, cx + 30 * s, top, cx + 26 * s, top + H * 0.5, cx + 4, top + H * 0.55], shade(b, -0.2)); }
    if (o.indexOf('t') >= 0) line(ctx, cx + 4, top + H * 0.65, cx + 18 * s, base - 2, shade(a, -0.2), 3 * s);
    if (o.indexOf('r') >= 0) {
      poly(ctx, [cx - hw, top + H * 0.28, cx + hw, top + H * 0.28, cx + hw * 1.5, base, cx - hw * 1.5, base], a);
      poly(ctx, [cx - 2, top + H * 0.28, cx + 2, top + H * 0.28, cx + 3, base, cx - 3, base], shade(b, 0));
    } else {
      rect(ctx, cx - hw * 0.8, top + H * 0.6, hw * 0.7, H * 0.4, shade(a, -0.35));
      rect(ctx, cx + hw * 0.1, top + H * 0.6, hw * 0.7, H * 0.4, shade(a, -0.35));
      rect(ctx, cx - hw, top + H * 0.28, hw * 2, H * 0.36, a);
      rect(ctx, cx - hw, top + H * 0.56, hw * 2, H * 0.06, b);
    }
    // arms
    var armY = top + H * 0.3;
    if (o.indexOf('z') >= 0) { rect(ctx, cx - hw - 4 * s, armY, 4 * s, H * 0.12, skin); rect(ctx, cx + hw, armY, 4 * s, H * 0.12, skin); rect(ctx, cx - hw - 4 * s, armY, 2, 2, skin); }
    else { rect(ctx, cx - hw - 4 * s, armY, 4 * s, H * 0.32, shade(a, -0.15)); rect(ctx, cx + hw, armY, 4 * s, H * 0.32, shade(a, -0.15)); }
    if (o.indexOf('c') >= 0) { line(ctx, cx - hw - 3 * s, armY + H * 0.32, cx - hw - 6 * s, armY + H * 0.4, '#f0f0e0', 1.5); line(ctx, cx + hw + 3 * s, armY + H * 0.32, cx + hw + 6 * s, armY + H * 0.4, '#f0f0e0', 1.5); }
    // head
    var hy = top + H * 0.15, hr = 6.5 * s;
    if (o.indexOf('m') >= 0) { ell(ctx, cx - 6 * s, hy, hr, hr, skin); ell(ctx, cx + 6 * s, hy, hr, hr, skin); eyes(ctx, cx - 6 * s, hy, 2 * s, '#ff3020', 1.2 * s); eyes(ctx, cx + 6 * s, hy, 2 * s, '#ff3020', 1.2 * s); }
    else {
      ell(ctx, cx, hy, hr, hr * 1.1, skin);
      if (o.indexOf('r') >= 0) { poly(ctx, [cx - hr - 1, hy + 2, cx, hy - hr * 1.6, cx + hr + 1, hy + 2], shade(a, -0.1)); }
      if (o.indexOf('x') >= 0) ell(ctx, cx, hy, 3 * s, 3 * s, '#f0e040'); else eyes(ctx, cx, hy - 1, 2.4 * s, o.indexOf('z') >= 0 ? '#e0ff80' : '#201010', 1.2 * s);
    }
    if (o.indexOf('d') >= 0) poly(ctx, [cx - hr, hy + 2, cx + hr, hy + 2, cx, hy + hr * 2.2], b);
    if (o.indexOf('h') >= 0) { poly(ctx, [cx - hr + 1, hy - hr + 2, cx - hr - 4 * s, hy - hr - 8 * s, cx - hr + 4, hy - hr], '#e8e0c8'); poly(ctx, [cx + hr - 1, hy - hr + 2, cx + hr + 4 * s, hy - hr - 8 * s, cx + hr - 4, hy - hr], '#e8e0c8'); }
    if (o.indexOf('k') >= 0) { poly(ctx, [cx - hr, hy - hr + 1, cx - hr, hy - hr - 5 * s, cx - hr / 2, hy - hr - 2, cx, hy - hr - 6 * s, cx + hr / 2, hy - hr - 2, cx + hr, hy - hr - 5 * s, cx + hr, hy - hr + 1], '#e8c030'); }
    if (o.indexOf('l') >= 0) for (var i = 0; i < 3; i++) { line(ctx, cx - hw, top + H * (0.35 + i * 0.1), cx - hw - 10 * s, top + H * (0.3 + i * 0.15), shade(a, -0.3), 1.5); line(ctx, cx + hw, top + H * (0.35 + i * 0.1), cx + hw + 10 * s, top + H * (0.3 + i * 0.15), shade(a, -0.3), 1.5); }
    // weapon
    if (o.indexOf('s') >= 0) { line(ctx, cx + hw + 2 * s, armY + H * 0.3, cx + hw + 10 * s, armY - H * 0.15, '#d0d0e0', 2.5 * s); line(ctx, cx + hw - 1, armY + H * 0.28, cx + hw + 6 * s, armY + H * 0.24, '#a07020', 2); }
    if (o.indexOf('b') >= 0) { ctx.strokeStyle = '#8a5a20'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx - hw - 4 * s, armY + H * 0.15, H * 0.25, -1.2, 1.2); ctx.stroke(); }
  };
  ARCH.gob = function (ctx, a, b, o) {
    ARCH.hum(ctx, a, b, o.replace('d', ''), 0.72);
    var hy = 62 - 46 * 0.72 + 46 * 0.72 * 0.15;
    poly(ctx, [26, hy, 18, hy - 5, 25, hy + 3], mix(a, '#e0b090', 0.4)); poly(ctx, [38, hy, 46, hy - 5, 39, hy + 3], mix(a, '#e0b090', 0.4));
  };
  ARCH.big = function (ctx, a, b, o) { ARCH.hum(ctx, a, b, o, 1.3); };
  ARCH.fiend = function (ctx, a, b, o) { ARCH.hum(ctx, a, b, o + 'h', o.indexOf('k') >= 0 ? 1.25 : 1); };
  ARCH.skel = function (ctx, a, b, o) {
    var bone = a, cx = 32, top = 16;
    if (o.indexOf('r') >= 0) poly(ctx, [cx - 9, top + 12, cx + 9, top + 12, cx + 14, 62, cx - 14, 62], b);
    line(ctx, cx, top + 8, cx, top + 30, bone, 3);
    for (var i = 0; i < 4; i++) line(ctx, cx - 7, top + 13 + i * 4, cx + 7, top + 13 + i * 4, bone, 2);
    line(ctx, cx - 6, top + 32, cx + 6, top + 32, bone, 3);
    line(ctx, cx - 4, top + 32, cx - 6, 62, bone, 3); line(ctx, cx + 4, top + 32, cx + 6, 62, bone, 3);
    line(ctx, cx - 8, top + 12, cx - 12, top + 30, bone, 2.5); line(ctx, cx + 8, top + 12, cx + 12, top + 30, bone, 2.5);
    ell(ctx, cx, top + 2, 7, 8, bone);
    rect(ctx, cx - 4, top, 3, 3, '#100808'); rect(ctx, cx + 1, top, 3, 3, '#100808'); rect(ctx, cx - 3, top + 6, 6, 1, '#100808');
    if (o.indexOf('k') >= 0) poly(ctx, [cx - 7, top - 4, cx - 7, top - 10, cx - 3, top - 6, cx, top - 11, cx + 3, top - 6, cx + 7, top - 10, cx + 7, top - 4], b);
    if (o.indexOf('s') >= 0) line(ctx, cx + 12, top + 30, cx + 20, top + 6, '#a0a0b0', 2.5);
  };
  ARCH.ghost = function (ctx, a, b, o) {
    var g = ctx.createLinearGradient(0, 8, 0, 62);
    g.addColorStop(0, a); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(18, 62); ctx.quadraticCurveTo(12, 30, 32, 10); ctx.quadraticCurveTo(52, 30, 46, 62);
    for (var x = 46; x > 18; x -= 7) ctx.lineTo(x - 3.5, 54 + (x % 14 ? 4 : -2));
    ctx.fill();
    if (o.indexOf('w') >= 0) { poly(ctx, [24, 26, 6, 18, 20, 36], a); poly(ctx, [40, 26, 58, 18, 44, 36], a); }
    if (o.indexOf('r') >= 0) poly(ctx, [20, 22, 32, 4, 44, 22, 40, 18, 32, 12, 24, 18], shade(a, -0.4));
    eyes(ctx, 32, 22, 5, b === '#000000' ? '#ff2020' : b, 2.4);
  };
  ARCH.quad = function (ctx, a, b, o, cat) {
    var by = 40, cx = 32;
    if (o.indexOf('w') >= 0) { poly(ctx, [28, by - 6, 8, by - 26, 18, by - 4], shade(b, -0.1)); poly(ctx, [36, by - 6, 56, by - 26, 46, by - 4], shade(b, -0.1)); }
    if (o.indexOf('t') >= 0 || cat) line(ctx, cx + 14, by, cx + 24, by - 12, shade(a, -0.2), 3);
    rect(ctx, cx - 14, by + 4, 5, 18, shade(a, -0.3)); rect(ctx, cx + 9, by + 4, 5, 18, shade(a, -0.3));
    rect(ctx, cx - 7, by + 6, 5, 16, shade(a, -0.2)); rect(ctx, cx + 2, by + 6, 5, 16, shade(a, -0.2));
    ell(ctx, cx, by, 18, 10, a);
    ell(ctx, cx, by + 4, 12, 5, shade(b, 0.1));
    // head facing the viewer
    var hy = by - 10;
    ell(ctx, cx, hy, 9, 8, shade(a, 0.08));
    if (o.indexOf('k') >= 0) { ell(ctx, cx, hy + 5, 5, 4, shade(a, -0.1)); poly(ctx, [cx - 8, hy - 4, cx - 6, hy - 14, cx - 2, hy - 6], a); poly(ctx, [cx + 8, hy - 4, cx + 6, hy - 14, cx + 2, hy - 6], a); }
    else if (cat) { poly(ctx, [cx - 8, hy - 3, cx - 7, hy - 11, cx - 2, hy - 6], a); poly(ctx, [cx + 8, hy - 3, cx + 7, hy - 11, cx + 2, hy - 6], a); ell(ctx, cx, hy + 4, 4, 3, shade(b, 0.2)); }
    else ell(ctx, cx, hy + 5, 6, 4, shade(a, 0.15));
    if (o.indexOf('h') >= 0) { poly(ctx, [cx - 6, hy - 5, cx - 14, hy - 16, cx - 3, hy - 7], '#e8e0c8'); poly(ctx, [cx + 6, hy - 5, cx + 14, hy - 16, cx + 3, hy - 7], '#e8e0c8'); }
    eyes(ctx, cx, hy - 1, 4, o.indexOf('k') >= 0 ? '#ffd040' : '#201008', 1.6);
    if (o.indexOf('c') >= 0) { rect(ctx, cx - 15, by + 21, 7, 2, '#f0f0e0'); rect(ctx, cx + 8, by + 21, 7, 2, '#f0f0e0'); }
    if (o.indexOf('b') >= 0) { ARCH.hum(ctx, b, a, 'b', 0.6); }
  };
  ARCH.cat = function (ctx, a, b, o) { ARCH.quad(ctx, a, b, o, true); };
  ARCH.lizard = function (ctx, a, b, o) {
    var cx = 32, by = 48;
    poly(ctx, [cx + 10, by, cx + 30, by + 10, cx + 12, by + 6], shade(a, -0.15));
    for (var i = -1; i <= 1; i += 2) { rect(ctx, cx + i * 14 - 3, by, 6, 12, shade(a, -0.3)); }
    ell(ctx, cx, by, 16, 8, a); ell(ctx, cx, by + 3, 10, 4, b);
    ell(ctx, cx, by - 8, 10, 7, shade(a, 0.1)); ell(ctx, cx, by - 4, 8, 3, shade(a, -0.1));
    eyes(ctx, cx, by - 11, 5, '#f0d020', 2);
    if (o.indexOf('h') >= 0) { poly(ctx, [cx - 5, by - 14, cx - 9, by - 24, cx - 2, by - 15], '#e8e0c8'); poly(ctx, [cx + 5, by - 14, cx + 9, by - 24, cx + 2, by - 15], '#e8e0c8'); }
  };
  ARCH.bird = function (ctx, a, b, o) {
    var cx = 32, cy = 36;
    poly(ctx, [cx - 4, cy - 4, cx - 30, cy - 18, cx - 26, cy + 2, cx - 6, cy + 8], shade(a, -0.15));
    poly(ctx, [cx + 4, cy - 4, cx + 30, cy - 18, cx + 26, cy + 2, cx + 6, cy + 8], shade(a, -0.15));
    for (var i = 0; i < 4; i++) { line(ctx, cx - 10 - i * 5, cy - 4 - i * 2, cx - 12 - i * 5, cy + 6, shade(a, -0.35), 1); line(ctx, cx + 10 + i * 5, cy - 4 - i * 2, cx + 12 + i * 5, cy + 6, shade(a, -0.35), 1); }
    ell(ctx, cx, cy + 4, 9, 13, a); ell(ctx, cx, cy + 8, 6, 8, shade(b, 0.1));
    ell(ctx, cx, cy - 12, 7, 7, shade(a, 0.1));
    poly(ctx, [cx - 3, cy - 10, cx + 3, cy - 10, cx, cy - 2], '#e0b020');
    eyes(ctx, cx, cy - 14, 3, '#100800', 1.5);
    line(ctx, cx - 4, cy + 16, cx - 6, 62, '#c0a040', 2); line(ctx, cx + 4, cy + 16, cx + 6, 62, '#c0a040', 2);
    if (o.indexOf('h') >= 0) { line(ctx, cx - 3, cy - 18, cx - 10, cy - 30, '#a07040', 2); line(ctx, cx + 3, cy - 18, cx + 10, cy - 30, '#a07040', 2); }
    if (o.indexOf('t') >= 0) line(ctx, cx, cy + 16, cx + 12, 60, '#40a040', 3);
  };
  ARCH.bat = function (ctx, a, b) {
    var cx = 32, cy = 30;
    poly(ctx, [cx, cy, cx - 30, cy - 14, cx - 26, cy + 4, cx - 20, cy, cx - 14, cy + 8, cx - 8, cy + 4, cx, cy + 10], a);
    poly(ctx, [cx, cy, cx + 30, cy - 14, cx + 26, cy + 4, cx + 20, cy, cx + 14, cy + 8, cx + 8, cy + 4, cx, cy + 10], a);
    ell(ctx, cx, cy + 2, 6, 9, shade(a, 0.1));
    poly(ctx, [cx - 5, cy - 5, cx - 6, cy - 13, cx - 2, cy - 7], a); poly(ctx, [cx + 5, cy - 5, cx + 6, cy - 13, cx + 2, cy - 7], a);
    eyes(ctx, cx, cy - 2, 2.5, b, 1.5);
  };
  ARCH.bug = function (ctx, a, b, o) {
    var cx = 32, cy = 44, legs = o.indexOf('l') >= 0 ? 4 : 3;
    for (var i = 0; i < legs; i++) {
      var ly = cy - 4 + i * 4;
      ctx.strokeStyle = shade(a, -0.3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 6, ly); ctx.lineTo(cx - 18 - i * 2, ly - 8); ctx.lineTo(cx - 24 - i * 2, ly + 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 6, ly); ctx.lineTo(cx + 18 + i * 2, ly - 8); ctx.lineTo(cx + 24 + i * 2, ly + 12); ctx.stroke();
    }
    if (o.indexOf('w') >= 0) { ctx.globalAlpha = 0.6; ell(ctx, cx - 14, cy - 12, 14, 6, '#e0f0ff'); ell(ctx, cx + 14, cy - 12, 14, 6, '#e0f0ff'); ctx.globalAlpha = 1; }
    if (o.indexOf('t') >= 0) { ctx.strokeStyle = a; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.quadraticCurveTo(cx + 2, cy - 30, cx - 8, cy - 22); ctx.stroke(); poly(ctx, [cx - 8, cy - 22, cx - 13, cy - 18, cx - 8, cy - 16], b); }
    ell(ctx, cx, cy + 6, 11, 9, a);
    ell(ctx, cx, cy - 4, 8, 6, shade(a, 0.1));
    ell(ctx, cx, cy + 6, 5, 6, shade(b, 0));
    if (o.indexOf('c') >= 0) { line(ctx, cx - 6, cy - 8, cx - 14, cy - 16, a, 3); line(ctx, cx + 6, cy - 8, cx + 14, cy - 16, a, 3); ell(ctx, cx - 15, cy - 18, 4, 3, b); ell(ctx, cx + 15, cy - 18, 4, 3, b); }
    if (o.indexOf('h') >= 0) poly(ctx, [cx - 2, cy - 9, cx, cy - 22, cx + 2, cy - 9], '#e0e0c0');
    eyes(ctx, cx, cy - 6, 3, '#ff4020', 1.6);
    if (o.indexOf('k') >= 0) poly(ctx, [cx - 6, cy - 9, cx - 6, cy - 15, cx, cy - 11, cx + 6, cy - 15, cx + 6, cy - 9], '#e8c030');
  };
  ARCH.snake = function (ctx, a, b, o) {
    ctx.strokeStyle = a; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(14, 58); ctx.quadraticCurveTo(52, 60, 44, 46); ctx.quadraticCurveTo(36, 36, 24, 38); ctx.quadraticCurveTo(14, 28, 30, 20); ctx.stroke();
    ctx.strokeStyle = b; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(14, 58); ctx.quadraticCurveTo(52, 60, 44, 46); ctx.quadraticCurveTo(36, 36, 24, 38); ctx.stroke();
    ctx.lineCap = 'butt';
    ell(ctx, 32, 17, 8, 6, shade(a, 0.1));
    eyes(ctx, 32, 15, 3.5, '#f0e020', 1.4);
    line(ctx, 32, 22, 32, 27, '#e02020', 1);
    if (o.indexOf('m') >= 0) { ell(ctx, 14, 58, 6, 5, shade(a, 0.1)); eyes(ctx, 14, 57, 2.5, '#f0e020', 1); }
    if (o.indexOf('w') >= 0) { poly(ctx, [28, 26, 6, 10, 18, 32], b); poly(ctx, [36, 26, 58, 10, 46, 32], b); }
    if (o.indexOf('s') >= 0 || o.indexOf('k') >= 0) { ARCH.hum(ctx, b, a, o.indexOf('k') >= 0 ? 'k' : 's', 0.55); }
  };
  ARCH.worm = function (ctx, a, b, o) {
    for (var i = 6; i >= 0; i--) {
      var x = 32 + Math.sin(i * 0.9) * 10, y = 60 - i * 6.5, r = 8 - i * 0.4;
      if (o.indexOf('l') >= 0) { line(ctx, x - r, y, x - r - 5, y + 4, shade(a, -0.3), 1.5); line(ctx, x + r, y, x + r + 5, y + 4, shade(a, -0.3), 1.5); }
      ell(ctx, x, y, r, r * 0.8, i % 2 ? a : shade(a, -0.12));
    }
    var hx = 32 + Math.sin(6 * 0.9) * 10;
    ell(ctx, hx, 18, 5, 3, '#300808');
    eyes(ctx, hx, 14, 3, b, 1.3);
  };
  ARCH.blob = function (ctx, a, b, o) {
    var g = ctx.createRadialGradient(28, 36, 2, 32, 46, 26);
    g.addColorStop(0, shade(a, 0.3)); g.addColorStop(1, a);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(6, 62); ctx.quadraticCurveTo(4, 30, 32, 24); ctx.quadraticCurveTo(60, 30, 58, 62); ctx.closePath(); ctx.fill();
    if (o.indexOf('t') >= 0) for (var i = 0; i < 3; i++) line(ctx, 20 + i * 12, 28, 10 + i * 20, 8, a, 3);
    if (o.indexOf('l') >= 0) for (var j = 0; j < 6; j++) line(ctx, 10 + j * 9, 58, 4 + j * 11, 40 - (j % 2) * 10, shade(a, -0.2), 2.5);
    if (o.indexOf('x') >= 0) { for (var k = 0; k < 7; k++) ell(ctx, 14 + (k * 37 % 36), 34 + (k * 23 % 22), 2.5, 2.5, '#f0f0d0'); }
    else eyes(ctx, 32, 40, 6, b, 2);
  };
  ARCH.dragon = function (ctx, a, b, o) {
    var cx = 32;
    if (o.indexOf('w') >= 0) { poly(ctx, [cx - 6, 30, cx - 31, 6, cx - 28, 30, cx - 20, 26, cx - 16, 38], shade(b, -0.25)); poly(ctx, [cx + 6, 30, cx + 31, 6, cx + 28, 30, cx + 20, 26, cx + 16, 38], shade(b, -0.25)); }
    line(ctx, cx + 10, 50, cx + 28, 60, shade(a, -0.2), 4);
    rect(ctx, cx - 15, 46, 7, 16, shade(a, -0.3)); rect(ctx, cx + 8, 46, 7, 16, shade(a, -0.3));
    ell(ctx, cx, 44, 17, 12, a); ell(ctx, cx, 48, 10, 7, shade(b, 0.2));
    var heads = o.indexOf('m') >= 0 ? [-14, -5, 5, 14] : [0];
    heads.forEach(function (hx) {
      line(ctx, cx + hx * 0.4, 36, cx + hx, 18, a, 6);
      ell(ctx, cx + hx, 14, 7, 6, shade(a, 0.1)); ell(ctx, cx + hx, 18, 5, 3, shade(a, -0.1));
      eyes(ctx, cx + hx, 12, 3, '#ffd020', 1.4);
      if (o.indexOf('h') >= 0) { poly(ctx, [cx + hx - 4, 9, cx + hx - 8, 0, cx + hx - 2, 8], '#e8e0c8'); poly(ctx, [cx + hx + 4, 9, cx + hx + 8, 0, cx + hx + 2, 8], '#e8e0c8'); }
    });
    if (o.indexOf('k') >= 0) poly(ctx, [cx - 5, 8, cx - 5, 3, cx, 6, cx + 5, 3, cx + 5, 8], '#e8c030');
    if (o.indexOf('t') >= 0 && o.indexOf('w') < 0) { ell(ctx, cx, 40, 22, 14, shade(b, -0.1)); ell(ctx, cx, 44, 17, 12, a); }
  };
  ARCH.eye = function (ctx, a, b, o) {
    var cx = 32, cy = 30;
    if (o.indexOf('x') >= 0) for (var i = 0; i < 8; i++) { var an = -Math.PI + i * Math.PI / 7; var ex = cx + Math.cos(an) * 26, ey = cy - 4 + Math.sin(an) * 22; line(ctx, cx + Math.cos(an) * 14, cy + Math.sin(an) * 12, ex, ey, shade(a, -0.2), 2); ell(ctx, ex, ey, 3, 3, '#f0f0e0'); ell(ctx, ex, ey, 1.4, 1.4, '#200000'); }
    if (o.indexOf('l') >= 0) for (var j = 0; j < 5; j++) line(ctx, cx - 12 + j * 6, cy + 10, cx - 18 + j * 9, 62, shade(a, -0.3), 2);
    var g = ctx.createRadialGradient(cx - 5, cy - 6, 2, cx, cy, 18);
    g.addColorStop(0, shade(a, 0.35)); g.addColorStop(1, a);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
    ell(ctx, cx, cy - 1, 8, 6, '#f8f8f0'); ell(ctx, cx, cy - 1, 4, 4, b); ell(ctx, cx, cy - 1, 1.8, 1.8, '#000');
    if (o.indexOf('x') >= 0) { ctx.fillStyle = '#300808'; ctx.fillRect(cx - 7, cy + 8, 14, 3); ctx.fillStyle = '#f0f0e0'; for (var t = 0; t < 6; t++) ctx.fillRect(cx - 6 + t * 2.4, cy + 8, 1, 2); }
  };
  ARCH.plant = function (ctx, a, b, o) {
    var cx = 32;
    if (o.indexOf('t') >= 0) { ell(ctx, cx, 44, 10, 18, a); for (var i = 0; i < 4; i++) line(ctx, cx, 30, cx - 20 + i * 13, 10 + (i % 2) * 8, shade(a, -0.1), 2); eyes(ctx, cx, 34, 4, '#ff2020', 2); return; }
    rect(ctx, cx - 4, 34, 8, 28, shade(a, -0.1));
    for (var j = 0; j < 9; j++) { var an = j / 9 * Math.PI * 2; ell(ctx, cx + Math.cos(an) * 12, 26 + Math.sin(an) * 10, 10, 8, j % 2 ? b : shade(b, -0.15)); }
    ell(ctx, cx, 26, 12, 10, b);
    if (o.indexOf('x') < 0) eyes(ctx, cx, 40, 3, '#ffe040', 1.4);
  };
  ARCH.elem = function (ctx, a, b) {
    for (var i = 0; i < 9; i++) {
      var y = 60 - i * 6, r = 7 + Math.sin(i * 1.3) * 3 + i * 0.8, x = 32 + Math.sin(i * 0.8) * 5;
      ctx.globalAlpha = 0.85; ell(ctx, x, y, r, 5, i % 2 ? a : b);
    }
    ctx.globalAlpha = 1;
    eyes(ctx, 32 + Math.sin(7 * 0.8) * 5, 16, 5, '#ffffff', 2);
  };
  ARCH.fish = function (ctx, a, b, o) {
    poly(ctx, [50, 36, 62, 26, 62, 46], shade(a, -0.2));
    ell(ctx, 32, 36, 22, 12, a); ell(ctx, 32, 40, 16, 6, b);
    poly(ctx, [28, 26, 36, 14, 40, 26], shade(a, -0.2));
    eyes(ctx, 18, 33, 0, '#101010', 2.4);
    if (o.indexOf('s') >= 0) ARCH.hum(ctx, b, a, 's', 0.5);
  };

  F.drawFigure = function (ctx, fig, size) {
    var p = fig.split(':'), arch = ARCH[p[0]] || ARCH.hum;
    ctx.save();
    if (size && size !== 64) ctx.scale(size / 64, size / 64);
    arch(ctx, p[1] || '#888888', p[2] || '#444444', p[3] || '');
    ctx.restore();
  };

  // sprite cache: name -> {w,h,canvas,levels}
  F.sprites = {};
  F.monsterSprite = function (monId) {
    var key = 'mon:' + monId;
    if (F.sprites[key]) return F.sprites[key];
    var m = Monsters.byId[monId];
    var c = canvas(64, 64), ctx = c.getContext('2d');
    F.drawFigure(ctx, m ? m.fig : 'hum:#888:#444:', 64);
    outline(ctx, 64, 64);
    var data = ctx.getImageData(0, 0, 64, 64).data;
    var sp = { w: 64, h: 64, canvas: c, px: data, levels: null, size: m ? m.size : 'M' };
    F.sprites[key] = sp;
    return sp;
  };
  F.spriteLevels = function (sp, fog) {
    if (!sp.levels || sp.fog !== fog) { sp.levels = shadeLevels(sp.px, fog); sp.fog = fog; }
    return sp.levels;
  };
  function objSprite(name, draw, w, h) {
    w = w || 64; h = h || 64;
    var c = canvas(w, h), ctx = c.getContext('2d');
    draw(ctx);
    outline(ctx, w, h);
    F.sprites[name] = { w: w, h: h, canvas: c, px: ctx.getImageData(0, 0, w, h).data, levels: null };
  }
  function buildObjects() {
    objSprite('chest', function (ctx) {
      rect(ctx, 14, 40, 36, 20, '#7a4a20'); poly(ctx, [14, 40, 18, 30, 46, 30, 50, 40], '#8a5a28');
      rect(ctx, 14, 44, 36, 3, '#c0a040'); rect(ctx, 30, 40, 4, 8, '#e0c050'); rect(ctx, 20, 40, 3, 20, '#5a3410'); rect(ctx, 41, 40, 3, 20, '#5a3410');
    });
    objSprite('loot', function (ctx) {
      ell(ctx, 32, 52, 14, 10, '#9a7a48'); ell(ctx, 32, 42, 8, 5, '#8a6a38'); rect(ctx, 28, 36, 8, 4, '#6a4a20');
      ell(ctx, 22, 58, 4, 2.5, '#e0c040'); ell(ctx, 42, 59, 4, 2.5, '#e0c040'); line(ctx, 40, 50, 54, 36, '#c0c0d0', 2);
    });
    objSprite('trap', function (ctx) {
      poly(ctx, [10, 60, 32, 48, 54, 60, 32, 63], 'rgba(200,40,20,0.9)');
      for (var i = 0; i < 5; i++) poly(ctx, [16 + i * 8, 60, 19 + i * 8, 50, 22 + i * 8, 60], '#c0c0c8');
    });
    objSprite('stairs_down', function (ctx) {
      for (var i = 0; i < 5; i++) rect(ctx, 12 + i * 2, 40 + i * 4, 40 - i * 4, 4, shade('#807060', -i * 0.15));
      rect(ctx, 8, 38, 4, 26, '#504030'); rect(ctx, 52, 38, 4, 26, '#504030');
      poly(ctx, [26, 18, 38, 18, 38, 26, 44, 26, 32, 36, 20, 26, 26, 26], '#e0c040');
    });
    objSprite('stairs_up', function (ctx) {
      for (var i = 0; i < 6; i++) rect(ctx, 12 + i * 3, 58 - i * 5, 40 - i * 6, 5, shade('#9a8a70', -i * 0.08));
      poly(ctx, [26, 22, 38, 22, 38, 14, 44, 14, 32, 4, 20, 14, 26, 14], '#80e0ff');
    });
    objSprite('exit', function (ctx) {
      rect(ctx, 10, 14, 8, 50, '#706858'); rect(ctx, 46, 14, 8, 50, '#706858'); poly(ctx, [6, 16, 32, 2, 58, 16, 54, 20, 32, 8, 10, 20], '#807868');
      var g = ctx.createLinearGradient(0, 16, 0, 64); g.addColorStop(0, '#a0c0e0'); g.addColorStop(1, '#507040'); ctx.fillStyle = g; ctx.fillRect(18, 18, 28, 46);
    });
    objSprite('tree', function (ctx) {
      rect(ctx, 28, 40, 8, 24, '#5a3a1a');
      ell(ctx, 32, 28, 22, 20, '#2a5a20'); ell(ctx, 24, 22, 12, 10, '#3a7028'); ell(ctx, 40, 30, 12, 10, '#346a24'); ell(ctx, 32, 14, 10, 8, '#408030');
    }, 64, 96);
    objSprite('pillar', function (ctx) { rect(ctx, 22, 4, 20, 60, '#8a8a90'); rect(ctx, 18, 2, 28, 6, '#9a9aa0'); rect(ctx, 18, 58, 28, 6, '#9a9aa0'); rect(ctx, 26, 8, 3, 50, '#a8a8b0'); }, 64, 96);
    objSprite('sign', function (ctx) { rect(ctx, 30, 30, 4, 34, '#5a3a1a'); rect(ctx, 14, 18, 36, 16, '#8a6a3a'); for (var i = 0; i < 3; i++) rect(ctx, 18, 22 + i * 4, 28 - i * 6, 1, '#3a2410'); });
    objSprite('event', function (ctx) { ell(ctx, 32, 50, 9, 9, 'rgba(255,240,160,0.9)'); ell(ctx, 32, 50, 4, 4, '#ffffff'); });
  }

  /* ======================================================================
   * Portraits
   * ==================================================================== */
  var SKIN = { human: ['#f0c8a0', '#d8a878', '#a87048', '#704828'], dwarf: ['#e8b890', '#c89070'], elf: ['#f4dcc0', '#e8c8a0'], gnome: ['#e8b888', '#d0a070'], halfelf: ['#f0d0a8', '#d8b088'], halfling: ['#f0c898', '#d8a878'] };
  var HAIR = ['#2a1a0a', '#5a3a1a', '#a06830', '#d8b060', '#e8e0c8', '#802010', '#404040', '#101010'];
  var CLASS_COL = { fighter: '#8a2020', paladin: '#d0d0e0', ranger: '#306030', mage: '#3040a0', cleric: '#e0d090', thief: '#404040' };
  F.CLASS_COL = CLASS_COL;
  F.portrait = function (pc, size) {
    size = size || 64;
    var key = 'por:' + pc.race + pc.gender + pc.cls + pc.portrait + ':' + size;
    if (F.sprites[key]) return F.sprites[key].canvas;
    var c = canvas(size, Math.round(size * 1.15)), ctx = c.getContext('2d');
    ctx.scale(size / 64, size / 64);
    var r = Modules.rng('portrait/' + pc.portrait);
    var skin = r.pick(SKIN[pc.race] || SKIN.human), hair = r.pick(HAIR), cc = CLASS_COL[pc.cls] || '#606060';
    var g = ctx.createLinearGradient(0, 0, 0, 74); g.addColorStop(0, shade(cc, -0.55)); g.addColorStop(1, shade(cc, -0.8));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 74);
    var short = pc.race === 'dwarf' || pc.race === 'gnome' || pc.race === 'halfling';
    var cx = 32, hy = short ? 36 : 32, hw = pc.race === 'dwarf' ? 15 : short ? 13 : 13, hh = 17;
    // shoulders and clothing
    poly(ctx, [4, 74, 10, 56, 54, 56, 60, 74], cc);
    if (pc.cls === 'fighter' || pc.cls === 'paladin') { poly(ctx, [4, 74, 10, 56, 54, 56, 60, 74], '#9098a8'); ell(ctx, 12, 60, 8, 5, '#a8b0c0'); ell(ctx, 52, 60, 8, 5, '#a8b0c0'); rect(ctx, 28, 58, 8, 16, cc); }
    if (pc.cls === 'ranger') { rect(ctx, 22, 56, 4, 18, '#5a3a1a'); }
    if (pc.cls === 'cleric') { rect(ctx, 29, 58, 6, 14, '#e0b020'); rect(ctx, 26, 62, 12, 4, '#e0b020'); }
    rect(ctx, cx - 5, hy + hh - 4, 10, 8, shade(skin, -0.15));
    // hair behind
    if (pc.gender === 'f' && pc.cls !== 'fighter') ell(ctx, cx, hy + 6, hw + 4, hh + 8, hair);
    // ears
    if (pc.race === 'elf' || pc.race === 'halfelf') { poly(ctx, [cx - hw + 1, hy, cx - hw - (pc.race === 'elf' ? 9 : 5), hy - 8, cx - hw + 2, hy + 6], skin); poly(ctx, [cx + hw - 1, hy, cx + hw + (pc.race === 'elf' ? 9 : 5), hy - 8, cx + hw - 2, hy + 6], skin); }
    else { ell(ctx, cx - hw, hy + 2, 3, 5, shade(skin, -0.1)); ell(ctx, cx + hw, hy + 2, 3, 5, shade(skin, -0.1)); }
    ell(ctx, cx, hy, hw, hh, skin);
    // shading
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(cx + 5, hy + 2, hw - 4, hh - 2, 0, -1.2, 1.4); ctx.fill();
    // eyes, brows, nose, mouth
    var ey = hy - 1, ex = 5.5;
    ell(ctx, cx - ex, ey, 2.6, 1.8, '#f8f8f0'); ell(ctx, cx + ex, ey, 2.6, 1.8, '#f8f8f0');
    var iris = r.pick(['#3060a0', '#406030', '#603010', '#202020', '#708090']);
    ell(ctx, cx - ex, ey, 1.4, 1.5, iris); ell(ctx, cx + ex, ey, 1.4, 1.5, iris);
    line(ctx, cx - ex - 3, ey - 4, cx - ex + 3, ey - 4 - r() * 1.5, shade(hair, -0.2), 1.5); line(ctx, cx + ex - 3, ey - 4 - r() * 1.5, cx + ex + 3, ey - 4, shade(hair, -0.2), 1.5);
    line(ctx, cx, ey + 1, cx - 1.5, ey + 7, shade(skin, -0.3), 1.2); line(ctx, cx - 1.5, ey + 7, cx + 1.5, ey + 7, shade(skin, -0.3), 1.2);
    line(ctx, cx - 4, ey + 11, cx + 4, ey + 11, pc.gender === 'f' ? '#b04050' : shade(skin, -0.4), 1.5);
    // beard
    if (pc.gender === 'm' && (pc.race === 'dwarf' || pc.race === 'gnome' || r() < 0.4)) {
      var long = pc.race === 'dwarf';
      poly(ctx, [cx - hw + 1, hy + 2, cx - hw + 3, hy + hh + (long ? 14 : 2), cx, hy + hh + (long ? 20 : 6), cx + hw - 3, hy + hh + (long ? 14 : 2), cx + hw - 1, hy + 2, cx + 6, hy + 9, cx - 6, hy + 9], hair);
      line(ctx, cx - 4, ey + 11, cx + 4, ey + 11, shade(hair, -0.4), 1.5);
    }
    // headgear by class
    if (pc.cls === 'fighter' || pc.cls === 'paladin') {
      ctx.fillStyle = '#8890a0'; ctx.beginPath(); ctx.ellipse(cx, hy - 6, hw + 2, hh - 4, 0, Math.PI, 0); ctx.fill();
      rect(ctx, cx - hw - 2, hy - 7, hw * 2 + 4, 4, '#a0a8b8'); rect(ctx, cx - 1.5, hy - 7, 3, 10, '#a0a8b8');
      if (pc.cls === 'paladin') poly(ctx, [cx - 2, hy - hh - 4, cx + 2, hy - hh - 4, cx + 1, hy - hh + 6, cx - 1, hy - hh + 6], '#e0c040');
    } else if (pc.cls === 'mage') {
      poly(ctx, [cx - hw - 6, hy - 8, cx + hw + 6, hy - 8, cx + 4, hy - 38, cx - 2, hy - 36], cc); rect(ctx, cx - hw - 6, hy - 10, hw * 2 + 12, 4, shade(cc, -0.3));
      if (r() < 0.5) ell(ctx, cx + 2, hy - 24, 2, 2, '#f0e060');
    } else if (pc.cls === 'thief') {
      ctx.fillStyle = cc; ctx.beginPath(); ctx.ellipse(cx, hy - 2, hw + 4, hh + 3, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(cx + hw + 4, hy + 10); ctx.lineTo(cx + hw, hy + 10); ctx.lineTo(cx + hw - 1, hy - 4); ctx.lineTo(cx - hw + 1, hy - 4); ctx.lineTo(cx - hw, hy + 10); ctx.lineTo(cx - hw - 4, hy + 10); ctx.fill();
    } else if (pc.cls === 'cleric') {
      ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(cx, hy - 6, hw + 1, hh - 6, 0, Math.PI, 0); ctx.fill();
      rect(ctx, cx - hw, hy - 9, hw * 2, 3, '#e0b020'); ell(ctx, cx, hy - 8, 2.5, 2.5, '#40a0ff');
    } else {
      ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(cx, hy - 5, hw + 1, hh - 5, 0, Math.PI, 0); ctx.fill();
      if (pc.cls === 'ranger') { poly(ctx, [cx - hw - 3, hy - 6, cx + hw + 3, hy - 6, cx + hw - 2, hy - 18, cx - hw + 2, hy - 18], '#406a30'); line(ctx, cx + 6, hy - 18, cx + 14, hy - 28, '#d02020', 2); }
    }
    F.sprites[key] = { canvas: c };
    return c;
  };

  /* ======================================================================
   * Combat figures for player characters (64x64)
   * ==================================================================== */
  var PC_COLS = ['#b03030', '#3060b0', '#30904a', '#b09030', '#8040a0', '#30a0a0'];
  F.pcFigure = function (pc) {
    var key = 'pcf:' + pc.cls + pc.race + (pc.color || 0) + ':' + (pc.weaponKind || '');
    if (F.sprites[key]) return F.sprites[key];
    var c = canvas(64, 64), ctx = c.getContext('2d');
    var short = pc.race === 'dwarf' || pc.race === 'gnome' || pc.race === 'halfling';
    var col = PC_COLS[(pc.color || 0) % PC_COLS.length];
    var opts = pc.cls === 'mage' ? 'r' : pc.cls === 'cleric' ? 'r' : '';
    if (pc.weaponKind === 'bow') opts += 'b'; else opts += 's';
    if (pc.race === 'dwarf') opts += 'd';
    ARCH.hum(ctx, col, pc.cls === 'paladin' ? '#e0e0f0' : CLASS_COL[pc.cls], opts, short ? 0.78 : 0.95);
    if (pc.cls === 'fighter' || pc.cls === 'paladin') { var s = short ? 0.78 : 0.95, hy = 62 - 46 * s + 46 * s * 0.15; ctx.fillStyle = '#9098a8'; ctx.beginPath(); ctx.ellipse(32, hy - 2, 7 * s, 6 * s, 0, Math.PI, 0); ctx.fill(); ell(ctx, 18, 62 - 46 * s * 0.55, 6 * s, 8 * s, '#8a7040'); }
    outline(ctx, 64, 64);
    F.sprites[key] = { w: 64, h: 64, canvas: c, px: ctx.getImageData(0, 0, 64, 64).data };
    return F.sprites[key];
  };

  /* ======================================================================
   * Overland tiles (32x32)
   * ==================================================================== */
  F.tiles = {};
  var TILE = 32;
  F.TILE = TILE;
  function tile(name, draw) {
    var c = canvas(TILE, TILE), ctx = c.getContext('2d');
    draw(ctx, rng('tile' + name));
    F.tiles[name] = c;
  }
  function buildTiles() {
    tile('.', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#5c8a3c', 18, r, 2); for (var i = 0; i < 10; i++) { ctx.fillStyle = '#4a7a2c'; ctx.fillRect(r() * 30 | 0, r() * 30 | 0, 1, 3); } });
    tile('=', function (ctx, r) { F.tiles['.'] && ctx.drawImage(F.tiles['.'], 0, 0); noiseFill(ctx, TILE, TILE, '#a08a60', 14, r, 2); ctx.fillStyle = 'rgba(80,60,30,0.3)'; for (var i = 0; i < 12; i++) ctx.fillRect(r() * 30 | 0, r() * 30 | 0, 2, 2); });
    tile('b', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#2a5a8a', 12, r, 2); rect(ctx, 0, 6, TILE, 20, '#8a6a3a'); for (var x = 0; x < TILE; x += 5) rect(ctx, x, 6, 1, 20, '#5a4020'); rect(ctx, 0, 5, TILE, 2, '#5a4020'); rect(ctx, 0, 25, TILE, 2, '#5a4020'); });
    tile('f', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#3a6a2a', 14, r, 2); for (var i = 0; i < 5; i++) { var x = 4 + r() * 24, y = 8 + r() * 18; rect(ctx, x - 1, y, 2, 6, '#4a3018'); ell(ctx, x, y - 1, 6, 7, '#1e4a18'); ell(ctx, x - 1, y - 3, 3, 3, '#2e6a24'); } });
    tile('h', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#7a8a4a', 14, r, 2); for (var i = 0; i < 2; i++) { var x = 6 + i * 14 + r() * 4, y = 20 + r() * 6; ell(ctx, x, y, 10, 7, '#8a7a4a'); ell(ctx, x - 2, y - 2, 6, 4, '#a09a6a'); } });
    tile('w', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#4a5a3a', 14, r, 2); for (var i = 0; i < 4; i++) ell(ctx, r() * 32, r() * 32, 5, 2, '#2a4a5a'); for (var j = 0; j < 8; j++) line(ctx, r() * 32, 30, r() * 32, 22, '#6a7a3a', 1); });
    tile('^', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#6a6a5a', 14, r, 2); poly(ctx, [2, 30, 14, 6, 26, 30], '#7a7a70'); poly(ctx, [14, 6, 18, 14, 10, 14], '#e8e8f0'); poly(ctx, [14, 30, 24, 12, 31, 30], '#5a5a50'); });
    tile('M', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#4a4a48', 10, r, 2); poly(ctx, [0, 31, 16, 2, 31, 31], '#5a5a58'); poly(ctx, [16, 2, 21, 12, 11, 12], '#f0f0f8'); });
    tile('~', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#2a5a8a', 12, r, 2); ctx.strokeStyle = 'rgba(200,230,255,0.4)'; for (var y = 6; y < TILE; y += 9) { ctx.beginPath(); for (var x = 0; x <= TILE; x += 4) ctx.lineTo(x, y + Math.sin(x / 4) * 1.5); ctx.stroke(); } });
    tile('L', function (ctx, r) { noiseFill(ctx, TILE, TILE, '#1e4a7a', 10, r, 2); });
    // site icons
    tile('site_town', function (ctx) { rect(ctx, 4, 12, 24, 16, '#c0a880'); poly(ctx, [2, 13, 16, 2, 30, 13], '#a03020'); rect(ctx, 13, 19, 6, 9, '#4a2a10'); rect(ctx, 6, 15, 4, 4, '#f0d060'); rect(ctx, 22, 15, 4, 4, '#f0d060'); });
    tile('site_dungeon', function (ctx) { poly(ctx, [2, 30, 16, 4, 30, 30], '#6a5a4a'); ell(ctx, 16, 24, 6, 7, '#100808'); rect(ctx, 10, 24, 12, 6, '#100808'); });
    tile('site_dungeon_locked', function (ctx) { poly(ctx, [2, 30, 16, 4, 30, 30], '#6a5a4a'); ell(ctx, 16, 24, 6, 7, '#100808'); rect(ctx, 10, 24, 12, 6, '#100808'); rect(ctx, 12, 18, 8, 6, '#c0a040'); });
    tile('site_hamlet', function (ctx) { rect(ctx, 6, 16, 12, 10, '#b09870'); poly(ctx, [4, 17, 12, 9, 20, 17], '#8a6030'); rect(ctx, 18, 20, 10, 8, '#b09870'); poly(ctx, [16, 21, 23, 14, 30, 21], '#8a6030'); });
    tile('site_healer', function (ctx) { ell(ctx, 16, 16, 12, 12, '#f0f0f0'); rect(ctx, 13, 7, 6, 18, '#c02020'); rect(ctx, 7, 13, 18, 6, '#c02020'); });
    tile('site_holy', function (ctx) { rect(ctx, 6, 10, 5, 20, '#9090a0'); rect(ctx, 21, 10, 5, 20, '#9090a0'); rect(ctx, 4, 6, 24, 5, '#a0a0b0'); ell(ctx, 16, 20, 4, 4, '#f0e080'); });
    tile('site_lair', function (ctx) { ell(ctx, 16, 22, 13, 8, '#5a4030'); ell(ctx, 16, 22, 7, 4, '#100808'); ell(ctx, 10, 12, 4, 4, '#e0e0d0'); rect(ctx, 9, 15, 3, 4, '#e0e0d0'); eyes(ctx, 16, 22, 3, '#ff3020', 1.2); });
    tile('site_camp', function (ctx) { poly(ctx, [4, 28, 16, 6, 28, 28], '#a08860'); poly(ctx, [12, 28, 16, 16, 20, 28], '#3a2a1a'); ell(ctx, 26, 26, 3, 2, '#f08020'); });
    tile('site_cleared', function (ctx) { ell(ctx, 16, 22, 13, 8, '#5a4030'); ell(ctx, 16, 22, 7, 4, '#100808'); line(ctx, 6, 6, 26, 26, '#40c040', 3); });
    tile('party', function (ctx) {
      ell(ctx, 16, 28, 9, 3, 'rgba(0,0,0,0.4)');
      rect(ctx, 11, 12, 10, 14, '#d0c020'); ell(ctx, 16, 9, 5, 5, '#f0c8a0'); rect(ctx, 11, 14, 10, 3, '#a02020'); line(ctx, 22, 12, 27, 3, '#e0e0f0', 2);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(11, 12, 10, 14);
    });
  }

  /* ---------- build everything ---------- */
  F.ready = false;
  F.init = function () {
    if (F.ready) return;
    ['stone', 'wood', 'cave', 'crypt', 'brass', 'tower', 'ice'].forEach(function (t) { bake(t, texDraw[t], null, F.THEMES[t] ? F.THEMES[t].fog : '#000'); });
    bake('citywall', texDraw.citywall, null, F.THEMES.town.fog);
    bake('water', texDraw.water, null, F.THEMES.town.fog);
    for (var k = 1; k <= 9; k++) { bake('facade' + k, texDraw.facade, k, F.THEMES.town.fog); bake('shopdoor' + k, texDraw.shopdoor, k, F.THEMES.town.fog); }
    Object.keys(F.THEMES).forEach(function (t) {
      bake('door_' + t, texDraw.door, t, F.THEMES[t].fog);
      bake('locked_' + t, texDraw.locked, t, F.THEMES[t].fog);
    });
    buildObjects();
    buildTiles();
    F.ready = true;
  };
  return F;
})();
