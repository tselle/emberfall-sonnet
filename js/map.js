/* Emberfall — map.js
 * The automap: a minimap under the 3D view, and a full-page map of every
 * explored square of the current level or of the wilderness. */
var MapView = (function () {
  'use strict';
  var M = {};
  var C = Modules.C;
  var COL = {
    wall: '#4a5a9a', floor: '#1a2034', door: '#c08040', locked: '#e04848', secret: '#b080ff', shop: '#e0c040', bwall: '#7a6a58', cwall: '#8a8478', tree: '#2a6a2a', water: '#2a5a8a'
  };
  function cellColor(c, idx, map) {
    switch (c) {
      case C.WALL: case C.SECRET: case C.PILLAR: return COL.wall;
      case C.DOOR: return map.def && Game.ms && Game.ms.found[idx] ? COL.secret : COL.door;
      case C.LOCKED: return COL.locked;
      case C.OPEN: return Game.ms && Game.ms.found[idx] ? COL.secret : COL.floor;
      case C.SHOP: return COL.shop;
      case C.BWALL: return COL.bwall;
      case C.CWALL: return COL.cwall;
      case C.TREE: return COL.tree;
      case C.WATER: return COL.water;
    }
    return COL.floor;
  }
  // draws a dungeon/town map; cx,cy centre; R radius in cells (or whole map)
  function drawMap(ctx, W, H, map, cells, ms, cx, cy, R, showAll) {
    var w = map.w, h = map.h, seen = Game.seenArr(ms, w, h);
    var cellsX = R ? R * 2 + 1 : w, cellsY = R ? R * 2 + 1 : h;
    var s = Math.floor(Math.min(W / cellsX, H / cellsY));
    var ox = Math.floor((W - s * cellsX) / 2), oy = Math.floor((H - s * cellsY) / 2);
    var x0 = R ? cx - R : 0, y0 = R ? cy - R : 0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (var y = 0; y < cellsY; y++) for (var x = 0; x < cellsX; x++) {
      var mx = x0 + x, my = y0 + y;
      if (mx < 0 || my < 0 || mx >= w || my >= h) continue;
      var i = my * w + mx;
      if (!seen[i] && !showAll) continue;
      ctx.fillStyle = cellColor(cells[i], i, map);
      ctx.fillRect(ox + x * s, oy + y * s, s, s);
      var c = cells[i];
      var gx = ox + x * s, gy = oy + y * s;
      if (c === C.UP || c === C.DOWN) { ctx.fillStyle = '#80e0ff'; ctx.beginPath(); if (c === C.UP) { ctx.moveTo(gx + s / 2, gy + 1); ctx.lineTo(gx + s - 1, gy + s - 1); ctx.lineTo(gx + 1, gy + s - 1); } else { ctx.moveTo(gx + 1, gy + 1); ctx.lineTo(gx + s - 1, gy + 1); ctx.lineTo(gx + s / 2, gy + s - 1); } ctx.fill(); }
      if (c === C.EXIT) { ctx.fillStyle = '#60f060'; ctx.fillRect(gx + s * 0.2, gy + s * 0.2, s * 0.6, s * 0.6); }
      var f = map.feat[i];
      if (f && f.t === 'trap' && ms.traps[i] === 'found') { ctx.strokeStyle = '#ff3030'; ctx.lineWidth = Math.max(1, s / 6); ctx.beginPath(); ctx.moveTo(gx + 2, gy + 2); ctx.lineTo(gx + s - 2, gy + s - 2); ctx.moveTo(gx + s - 2, gy + 2); ctx.lineTo(gx + 2, gy + s - 2); ctx.stroke(); }
      if (f && f.t === 'chest' && !ms.taken[i] && seen[i]) { ctx.fillStyle = '#e0b030'; ctx.fillRect(gx + s * 0.3, gy + s * 0.3, s * 0.4, s * 0.4); }
      if (ms.loot[i] && ms.loot[i].length) { ctx.fillStyle = '#c0c060'; ctx.fillRect(gx + s * 0.35, gy + s * 0.35, s * 0.3, s * 0.3); }
    }
    // known monster groups
    Game.mons.forEach(function (m) {
      if (!m.st.seen || (m.f.mode === 'ambush' && !m.st.revealed)) return;
      var x = m.st.x - x0, y = m.st.y - y0;
      if (x < 0 || y < 0 || x >= cellsX || y >= cellsY) return;
      ctx.fillStyle = m.st.noticed ? '#ff4040' : '#c06060';
      ctx.beginPath(); ctx.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, Math.max(2, s * 0.32), 0, 7); ctx.fill();
    });
    // party arrow
    var px = Game.pos.x - x0, py = Game.pos.y - y0, a = Game.pos.dir * Math.PI / 2;
    ctx.save(); ctx.translate(ox + (px + 0.5) * s, oy + (py + 0.5) * s); ctx.rotate(a);
    ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(0, -s * 0.45); ctx.lineTo(s * 0.38, s * 0.38); ctx.lineTo(0, s * 0.15); ctx.lineTo(-s * 0.38, s * 0.38); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawWild(ctx, W, H, R) {
    var wd = Game.adv.wild, w = wd.grid[0].length, h = wd.grid.length, s0 = Overland.seen(), p = Game.advState().wildPos;
    var cellsX = R ? R * 2 + 1 : w, cellsY = R ? R * 2 + 1 : h;
    var s = Math.min(W / cellsX, H / cellsY);
    var ox = (W - s * cellsX) / 2, oy = (H - s * cellsY) / 2, x0 = R ? p.x - R : 0, y0 = R ? p.y - R : 0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    var TC = { '.': '#5c8a3c', '=': '#a08a60', 'b': '#8a6a3a', 'f': '#2e5a22', 'h': '#7a8a4a', 'w': '#4a5a3a', '^': '#7a7a70', 'M': '#4a4a48', '~': '#2a5a8a', 'L': '#1e4a7a' };
    for (var y = 0; y < cellsY; y++) for (var x = 0; x < cellsX; x++) {
      var mx = x0 + x, my = y0 + y;
      if (mx < 0 || my < 0 || mx >= w || my >= h || !s0[my * w + mx]) continue;
      ctx.fillStyle = TC[wd.grid[my][mx]] || '#333';
      ctx.fillRect(ox + x * s, oy + y * s, Math.ceil(s), Math.ceil(s));
    }
    wd.sites.forEach(function (site, i) {
      if (!s0[site.y * w + site.x]) return;
      var x = site.x - x0, y = site.y - y0;
      if (x < 0 || y < 0 || x >= cellsX || y >= cellsY) return;
      if (s >= 10) ctx.drawImage(Figures.tiles['site_' + site.kind] || Figures.tiles.site_camp, ox + x * s, oy + y * s, s, s);
      else { ctx.fillStyle = '#ffe060'; ctx.fillRect(ox + x * s, oy + y * s, s, s); }
      if (!R) { ctx.font = 'bold ' + Math.max(10, Math.round(s * 0.55)) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(site.name, ox + (x + 0.5) * s, oy + y * s - 2); ctx.fillStyle = '#ffe890'; ctx.fillText(site.name, ox + (x + 0.5) * s, oy + y * s - 2); }
    });
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + (p.x - x0 + 0.5) * s, oy + (p.y - y0 + 0.5) * s, Math.max(3, s * 0.4), 0, 7); ctx.fill(); ctx.stroke();
  }
  M.mini = function () {
    var cv = document.getElementById('minimap'); if (!cv || !Game.S) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = Math.round(cv.clientWidth * dpr) || 132, H = Math.round(cv.clientHeight * dpr) || 132;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d');
    if (Game.mode === 'wild') drawWild(ctx, W, H, 6);
    else if (Game.map) drawMap(ctx, W, H, Game.map, Game.cells, Game.ms, Game.pos.x, Game.pos.y, 6);
  };
  M.open = function () {
    if (!Game.S) return;
    var c = document.createElement('canvas');
    c.className = 'mapcanvas';
    var wd = Game.mode === 'wild';
    var w = wd ? Game.adv.wild.grid[0].length : Game.map.w, h = wd ? Game.adv.wild.grid.length : Game.map.h;
    var scale = Math.max(10, Math.min(24, Math.floor(720 / Math.max(w, h * 1.3))));
    c.width = w * scale; c.height = h * scale;
    var ctx = c.getContext('2d');
    if (wd) drawWild(ctx, c.width, c.height, 0);
    else drawMap(ctx, c.width, c.height, Game.map, Game.cells, Game.ms, 0, 0, 0);
    var wrap = document.createElement('div');
    wrap.appendChild(c);
    var legend = wd ? '<p class="small">Explored wilderness. Sites you have seen are marked. The white dot is your company.</p>'
      : '<p class="small"><span style="color:' + COL.door + '">■</span> door &nbsp; <span style="color:' + COL.locked + '">■</span> locked &nbsp; <span style="color:' + COL.secret + '">■</span> secret door &nbsp; <span style="color:#80e0ff">▲▼</span> stairs &nbsp; <span style="color:#60f060">■</span> exit &nbsp; <span style="color:#e0b030">■</span> chest &nbsp; <span style="color:#ff3030">✕</span> trap &nbsp; <span style="color:#ff4040">●</span> monsters &nbsp; <span style="color:' + COL.shop + '">■</span> building</p>';
    wrap.appendChild(UI.el('div', '', legend));
    UI.modal({ title: wd ? Game.adv.wild.name : Game.map.name + ' (dungeon level ' + (Game.map.dl || 1) + ')', cls: 'wide', node: wrap, buttons: [{ label: 'Close', key: 'Enter', fn: function () { } }] });
  };
  return M;
})();
