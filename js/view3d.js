/* Emberfall — view3d.js
 * First-person textured raycaster for towns and dungeons. Renders into a
 * small fixed-size pixel buffer (cheap on old tablets) that CSS scales up.
 * Walls come from pre-shaded textures; monsters and objects are billboards. */
var View3D = (function () {
  'use strict';
  var V = {};
  var W = 320, H = 200, HALF = H >> 1;
  V.W = W; V.H = H;
  var cv, ctx, img, buf, bg, zbuf;
  var map = null, cells = null, theme = null, themeName = 'stone';
  var C = Modules.C;
  var FOV = 0.66;

  V.init = function (canvas) {
    cv = canvas;
    alloc(W);
  };
  function alloc(w) {
    W = w; V.W = W;
    cv.width = W; cv.height = H;
    ctx = cv.getContext('2d');
    img = ctx.createImageData(W, H);
    buf = new Uint32Array(img.data.buffer);
    bg = new Uint32Array(W * H);
    zbuf = new Float32Array(W);
    FOV = 0.66 * (W / H) / 1.6;
    if (theme) buildBackground();
  }
  // match the internal resolution to the shape of the view (height stays 200)
  V.setAspect = function (aspect) {
    var w = Math.max(240, Math.min(420, Math.round(H * aspect / 2) * 2));
    if (w !== W) alloc(w);
    return W;
  };

  function rgba(hex) { var c = Figures.hexToRgb(hex); return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }
  function lerpCol(a, b, t) {
    var x = Figures.hexToRgb(a), y = Figures.hexToRgb(b);
    return (255 << 24) | (Math.round(x[2] + (y[2] - x[2]) * t) << 16) | (Math.round(x[1] + (y[1] - x[1]) * t) << 8) | Math.round(x[0] + (y[0] - x[0]) * t);
  }
  function buildBackground() {
    var th = theme, fog = th.fog, y, x, col;
    for (y = 0; y < HALF; y++) {
      var t = y / HALF;
      col = th.sky ? lerpCol(th.ceil[0], th.ceil[1], t) : lerpCol(th.ceil[1], th.ceil[0], 1 - t * 0.2) ;
      if (!th.sky) col = lerpCol(th.ceil[0], fog, Math.min(1, t * t * 0.9));
      for (x = 0; x < W; x++) bg[y * W + x] = col;
    }
    for (y = HALF; y < H; y++) {
      var u = (y - HALF) / HALF;
      col = lerpCol(fog, th.floor[1], Math.min(1, Math.pow(u, 0.6)));
      if (th.sky) col = lerpCol(th.fog, th.floor[1], Math.min(1, Math.pow(u, 0.5)));
      for (x = 0; x < W; x++) {
        // faint flagstone banding in dungeons
        var band = !th.sky && ((y - HALF) % Math.max(2, Math.round(40 * u)) === 0) ? 0.85 : 1;
        bg[y * W + x] = band === 1 ? col : lerpCol(th.floor[0], th.floor[1], u * 0.8);
      }
    }
    if (th.sky) {
      // a few soft clouds
      var r = Modules.rng('clouds');
      for (var i = 0; i < 7; i++) {
        var cx = r() * W, cy = 8 + r() * (HALF - 40), rw = 20 + r() * 40, rh = 4 + r() * 6;
        for (y = Math.max(0, cy - rh | 0); y < Math.min(HALF, cy + rh); y++) for (x = Math.max(0, cx - rw | 0); x < Math.min(W, cx + rw); x++) {
          var dx = (x - cx) / rw, dy = (y - cy) / rh;
          if (dx * dx + dy * dy < 1) bg[y * W + x] = lerpCol('#e8eef8', '#ffffff', 0.5);
        }
      }
    }
  }

  V.setMap = function (m, liveCells) {
    map = m; cells = liveCells;
    themeName = (m.theme && Figures.THEMES[m.theme]) ? m.theme : 'stone';
    theme = Figures.THEMES[themeName];
    buildBackground();
  };
  V.theme = function () { return theme; };

  function wallTex(c, idx) {
    switch (c) {
      case C.WALL: case C.SECRET: return Figures.textures[theme.wall] || Figures.textures.stone;
      case C.DOOR: return Figures.textures['door_' + themeName];
      case C.LOCKED: return Figures.textures['locked_' + themeName];
      case C.BWALL: return Figures.textures['facade' + (map.facade[idx] || 9)];
      case C.SHOP: return Figures.textures['shopdoor' + (map.facade[idx] || 9)];
      case C.CWALL: return Figures.textures.citywall;
      case C.WATER: return Figures.textures.water;
    }
    return null;
  }
  function blocksRay(c) { return c === C.WALL || c === C.SECRET || c === C.DOOR || c === C.LOCKED || c === C.BWALL || c === C.SHOP || c === C.CWALL || c === C.WATER; }

  // px,py: camera position in cell units (centre of cell = x+0.5); ang: radians, 0 = north
  V.render = function (px, py, ang, sprites, bob) {
    if (!map) return;
    buf.set(bg);
    var dirX = Math.sin(ang), dirY = -Math.cos(ang);
    var planeX = Math.cos(ang) * FOV, planeY = Math.sin(ang) * FOV;
    var mw = map.w, mh = map.h;
    var fogMul = theme.sky ? 0.45 : 1.1;
    var horizon = HALF + (bob || 0);
    for (var x = 0; x < W; x++) {
      var camX = 2 * x / W - 1;
      var rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
      var mapX = px | 0, mapY = py | 0;
      var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      var stepX, stepY, sdx, sdy;
      if (rdx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
      var side = 0, hit = 0, c = 0, guard = 0;
      while (guard++ < 64) {
        if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= mw || mapY >= mh) { hit = 0; break; }
        c = cells[mapY * mw + mapX];
        if (blocksRay(c)) { hit = 1; break; }
      }
      if (!hit) { zbuf[x] = 1e9; continue; }
      var dist = side === 0 ? (sdx - ddx) : (sdy - ddy);
      if (dist < 0.05) dist = 0.05;
      zbuf[x] = dist;
      var lineH = (H / dist) | 0;
      var top = horizon - (lineH >> 1), bot = top + lineH;
      var tex = wallTex(c, mapY * mw + mapX);
      if (!tex) continue;
      var wallX = side === 0 ? py + dist * rdy : px + dist * rdx;
      wallX -= Math.floor(wallX);
      var tx = (wallX * 64) | 0;
      if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) tx = 63 - tx;
      var lvl = (dist * fogMul) | 0; if (side === 1) lvl += 1;
      if (lvl > 7) lvl = 7;
      var tdata = tex.levels[lvl];
      var y0 = top < 0 ? 0 : top, y1 = bot > H ? H : bot;
      var step = 64 / lineH, tpos = (y0 - top) * step;
      for (var y = y0; y < y1; y++) {
        var t = tdata[((tpos | 0) & 63) * 64 + tx];
        tpos += step;
        if (t !== 0) buf[y * W + x] = t;
      }
    }
    if (sprites && sprites.length) drawSprites(px, py, dirX, dirY, planeX, planeY, sprites, horizon, fogMul);
    ctx.putImageData(img, 0, 0);
  };

  function drawSprites(px, py, dirX, dirY, planeX, planeY, sprites, horizon, fogMul) {
    var invDet = 1 / (planeX * dirY - dirX * planeY);
    var list = [];
    for (var i = 0; i < sprites.length; i++) {
      var s = sprites[i], sx = s.x - px, sy = s.y - py;
      var tX = invDet * (dirY * sx - dirX * sy);
      var tY = invDet * (-planeY * sx + planeX * sy);
      if (tY <= 0.15) continue;
      list.push({ s: s, tX: tX, tY: tY });
    }
    list.sort(function (a, b) { return b.tY - a.tY; });
    for (var j = 0; j < list.length; j++) {
      var e = list[j], sp = e.s.sp, tY = e.tY;
      var scale = e.s.scale || 1;
      var screenX = (W / 2) * (1 + e.tX / tY);
      var aspect = sp.h / sp.w;
      var sh = (H / tY) * scale * aspect, sw = (H / tY) * scale;
      var floorY = horizon + (H / tY) / 2;
      var topY = floorY - sh - (e.s.lift || 0) * (H / tY);
      var x0 = (screenX - sw / 2) | 0, x1 = (screenX + sw / 2) | 0;
      var lvl = (tY * fogMul) | 0; if (lvl > 7) lvl = 7;
      var levels = Figures.spriteLevels(sp, theme.fog);
      var tdata = levels[lvl];
      var tw = sp.w, th = sp.h;
      for (var x = x0 < 0 ? 0 : x0; x < x1 && x < W; x++) {
        if (tY >= zbuf[x]) continue;
        var tx = (((x - x0) / sw) * tw) | 0;
        if (tx < 0 || tx >= tw) continue;
        var ys = topY | 0, ye = (topY + sh) | 0;
        var y0 = ys < 0 ? 0 : ys, y1 = ye > H ? H : ye;
        var stepT = th / sh, tpos = (y0 - topY) * stepT;
        for (var y = y0; y < y1; y++) {
          var ty = tpos | 0; tpos += stepT;
          if (ty >= th) break;
          var t = tdata[ty * tw + tx];
          if (t !== 0) buf[y * W + x] = t;
        }
      }
    }
  }

  // a quick flash overlay for traps / damage
  V.flash = function (color) {
    if (!ctx) return;
    ctx.fillStyle = color || 'rgba(255,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
  };
  return V;
})();
