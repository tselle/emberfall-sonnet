/* Emberfall — modules.js
 * Seeded RNG streams, map compilation from ASCII grids, the adventure
 * registry and the content validator used by both the game and Node tools. */
var Modules = (function () {
  'use strict';
  var M = {};

  /* ---------- seeded RNG ---------- */
  M.hash = function (str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
  // each named stream is independent, so adding a new stream never shifts old content
  M.rng = function (seed) {
    var a = typeof seed === 'number' ? seed >>> 0 : M.hash(String(seed));
    var f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.chance = function (p) { return f() < p; };
    f.shuffle = function (arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    f.weighted = function (list, wkey) {
      var tot = 0, i; for (i = 0; i < list.length; i++) tot += (wkey ? list[i][wkey] : list[i][1]) || 0;
      var r = f() * tot;
      for (i = 0; i < list.length; i++) { r -= (wkey ? list[i][wkey] : list[i][1]) || 0; if (r < 0) return list[i]; }
      return list[list.length - 1];
    };
    return f;
  };
  M.stream = function (advId, name) { return M.rng('emberfall/' + advId + '/' + name); };

  /* ---------- cells ---------- */
  var C = M.C = { FLOOR: 0, WALL: 1, DOOR: 2, LOCKED: 3, SECRET: 4, OPEN: 5, UP: 6, DOWN: 7, EXIT: 8, SHOP: 9, BWALL: 10, CWALL: 11, TREE: 12, WATER: 13, PILLAR: 14 };
  var CHAR = { '#': C.WALL, '.': C.FLOOR, '+': C.DOOR, '=': C.LOCKED, 'S': C.SECRET, '<': C.UP, '>': C.DOWN, 'X': C.EXIT, '%': C.BWALL, 'W': C.CWALL, 'T': C.TREE, '~': C.WATER, 'o': C.PILLAR, ',': C.FLOOR, ' ': C.WALL };
  M.CHAR = CHAR;
  M.DX = [0, 1, 0, -1]; M.DY = [-1, 0, 1, 0];
  M.DIR_NAMES = ['North', 'East', 'South', 'West'];
  M.isSolid = function (c) { return c === C.WALL || c === C.DOOR || c === C.LOCKED || c === C.SECRET || c === C.SHOP || c === C.BWALL || c === C.CWALL || c === C.TREE || c === C.WATER || c === C.PILLAR; };
  M.isDoorish = function (c) { return c === C.DOOR || c === C.LOCKED || c === C.SECRET; };
  // passable for the validator: closed, locked and secret doors count as passable
  M.isPassableForCheck = function (c) { return c === C.FLOOR || c === C.OPEN || c === C.DOOR || c === C.LOCKED || c === C.SECRET || c === C.UP || c === C.DOWN || c === C.EXIT; };
  M.isWalkable = function (c) { return c === C.FLOOR || c === C.OPEN || c === C.UP || c === C.DOWN || c === C.EXIT; };

  /* ---------- compile ---------- */
  // def: { id, name, type, theme, dl, grid:[strings], keys:{ch:feat}, feats:[{x,y,...}], up, down }
  M.compile = function (def) {
    var h = def.grid.length, w = 0, x, y;
    for (y = 0; y < h; y++) w = Math.max(w, def.grid[y].length);
    var cells = new Uint8Array(w * h), feat = {}, secrets = 0, traps = 0;
    var map = { id: def.id, name: def.name, type: def.type || 'dungeon', theme: def.theme || 'stone', dl: def.dl || 1, w: w, h: h, cells: cells, feat: feat, up: def.up, down: def.down, def: def, upAt: null, downAt: null, exits: [], dark: !!def.dark, music: def.music };
    for (y = 0; y < h; y++) {
      var row = def.grid[y];
      for (x = 0; x < w; x++) {
        var ch = row[x] === undefined ? '#' : row[x];
        var idx = y * w + x, c = CHAR[ch];
        if (c === undefined) {
          var k = def.keys && def.keys[ch];
          if (!k) throw new Error('Map ' + def.id + ': unknown char "' + ch + '" at ' + x + ',' + y);
          var f = clone(k); f.key = ch; f.x = x; f.y = y;
          feat[idx] = f;
          c = f.t === 'shop' ? C.SHOP : f.cell != null ? f.cell : C.FLOOR;
          if (f.t === 'door') c = f.locked ? C.LOCKED : C.DOOR;
          if (f.t === 'secret') c = C.SECRET;
        }
        cells[idx] = c;
        if (c === C.UP) map.upAt = { x: x, y: y };
        if (c === C.DOWN) map.downAt = { x: x, y: y };
        if (c === C.EXIT) map.exits.push({ x: x, y: y });
      }
    }
    (def.feats || []).forEach(function (f0) {
      var f = clone(f0), idx = f.y * w + f.x;
      feat[idx] = f;
      if (f.t === 'shop') cells[idx] = C.SHOP;
      else if (f.t === 'door') cells[idx] = f.locked ? C.LOCKED : C.DOOR;
      else if (f.t === 'secret') cells[idx] = C.SECRET;
      else if (f.cell != null) cells[idx] = f.cell;
    });
    // building facades: flood-fill BWALL blocks and tag them with the shop they front
    map.facade = new Uint8Array(w * h);
    if (map.type === 'town') tagFacades(map);
    return map;
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var SHOP_FACADE = { inn: 1, temple: 2, smith: 3, magic: 4, train: 5, hall: 6, tavern: 7, trader: 8, house: 9 };
  M.SHOP_FACADE = SHOP_FACADE;
  function tagFacades(map) {
    var w = map.w, h = map.h, cells = map.cells, seen = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) {
      if (cells[i] !== C.BWALL || seen[i]) continue;
      var stack = [i], block = [], kind = 9;
      seen[i] = 1;
      while (stack.length) {
        var c = stack.pop(); block.push(c);
        var cx = c % w, cy = (c / w) | 0;
        for (var d = 0; d < 4; d++) {
          var nx = cx + M.DX[d], ny = cy + M.DY[d];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          var n = ny * w + nx;
          if (cells[n] === C.SHOP && map.feat[n] && kind === 9) kind = SHOP_FACADE[map.feat[n].shop] || 9;
          if (cells[n] === C.BWALL && !seen[n]) { seen[n] = 1; stack.push(n); }
        }
      }
      for (var b = 0; b < block.length; b++) map.facade[block[b]] = kind;
    }
    for (var j = 0; j < w * h; j++) if (cells[j] === C.SHOP && map.feat[j]) map.facade[j] = SHOP_FACADE[map.feat[j].shop] || 9;
  }

  /* ---------- registry ---------- */
  M.list = [];
  M.byId = {};
  M.register = function (adv) {
    if (M.byId[adv.id]) throw new Error('Duplicate adventure ' + adv.id);
    M.byId[adv.id] = adv; M.list.push(adv);
    return adv;
  };
  M.get = function (id) { return M.byId[id]; };
  var compiled = {};
  M.map = function (advId, mapId) {
    var key = advId + ':' + mapId;
    if (compiled[key]) return compiled[key];
    var adv = M.byId[advId];
    if (!adv) throw new Error('No adventure ' + advId);
    if (adv.build && !adv.built) adv.build();
    var def = adv.maps[mapId];
    if (!def) throw new Error('No map ' + mapId + ' in ' + advId);
    compiled[key] = M.compile(def);
    compiled[key].adv = advId;
    return compiled[key];
  };
  M.ensureBuilt = function (adv) { if (adv.build && !adv.built) adv.build(); return adv; };

  /* ---------- reachability ---------- */
  M.flood = function (map, sx, sy, passFn) {
    var w = map.w, h = map.h, seen = new Uint8Array(w * h), q = [sy * w + sx];
    passFn = passFn || M.isPassableForCheck;
    seen[q[0]] = 1;
    for (var qi = 0; qi < q.length; qi++) {
      var c = q[qi], cx = c % w, cy = (c / w) | 0;
      // stairs and exits are endpoints, but we still step past them
      for (var d = 0; d < 4; d++) {
        var nx = cx + M.DX[d], ny = cy + M.DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var n = ny * w + nx;
        if (seen[n]) continue;
        if (!passFn(map.cells[n], n)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    return seen;
  };

  /* ---------- validator ---------- */
  M.validate = function (adv, opts) {
    opts = opts || {};
    M.ensureBuilt(adv);
    var errs = [], warn = [];
    var E = function (m) { errs.push(adv.id + ': ' + m); };
    var W = function (m) { warn.push(adv.id + ': ' + m); };
    var monOk = function (id, where) { if (typeof Monsters !== 'undefined' && !Monsters.byId[id]) E('unknown monster "' + id + '" in ' + where); };
    var itemOk = function (id, where) { if (typeof Data !== 'undefined' && !Data.items[id]) E('unknown item "' + id + '" in ' + where); };
    var checkGroup = function (g, where) {
      if (!g || !g.length) { E('empty monster group in ' + where); return; }
      g.forEach(function (e) { monOk(e[0], where); if (!(e[1] > 0)) E('bad count in ' + where); });
    };
    var flags = {};
    (adv.quests || []).forEach(function (q) { if (q.goal && q.goal.flag) flags[q.goal.flag] = flags[q.goal.flag] || []; if (q.goal && q.goal.item) itemOk(q.goal.item, 'quest ' + q.id); });
    var setFlags = {};
    Object.keys(adv.maps).forEach(function (mid) {
      var map;
      try { map = M.compile(adv.maps[mid]); } catch (e) { E(e.message); return; }
      var where = mid;
      // locate start
      var start = null;
      if (adv.start && adv.start.map === mid) start = adv.start;
      else if (map.upAt) start = map.upAt;
      else if (map.exits.length) start = map.exits[0];
      else if (map.downAt) start = map.downAt;
      if (!start) { E(where + ': no entry point'); return; }
      if (!M.isPassableForCheck(map.cells[start.y * map.w + start.x])) E(where + ': start square not walkable at ' + start.x + ',' + start.y);
      var seen = M.flood(map, start.x, start.y);
      var secrets = 0, trapCount = 0;
      for (var i = 0; i < map.w * map.h; i++) {
        var c = map.cells[i], x = i % map.w, y = (i / map.w) | 0;
        if (c === C.SECRET) secrets++;
        if (M.isWalkable(c) && !seen[i]) E(where + ': unreachable floor at ' + x + ',' + y);
        if ((x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1) && M.isWalkable(c) && c !== C.EXIT) E(where + ': open edge at ' + x + ',' + y);
        if (c === C.SHOP) {
          var adj = false;
          for (var d = 0; d < 4; d++) { var nx = x + M.DX[d], ny = y + M.DY[d]; if (nx >= 0 && ny >= 0 && nx < map.w && ny < map.h && seen[ny * map.w + nx] && M.isWalkable(map.cells[ny * map.w + nx])) adj = true; }
          if (!adj) E(where + ': shop door at ' + x + ',' + y + ' not reachable');
        }
        if (c === C.SECRET || c === C.DOOR || c === C.LOCKED) {
          // doors must join two walkable squares (either axis)
          var ns = M.isWalkableOrDoor(map, x, y - 1) && M.isWalkableOrDoor(map, x, y + 1);
          var ew = M.isWalkableOrDoor(map, x - 1, y) && M.isWalkableOrDoor(map, x + 1, y);
          if (!ns && !ew) E(where + ': door at ' + x + ',' + y + ' does not join two squares');
        }
      }
      Object.keys(map.feat).forEach(function (k) {
        var f = map.feat[k], idx = +k, fx = idx % map.w, fy = (idx / map.w) | 0;
        if (f.t !== 'shop' && !seen[idx]) E(where + ': feature ' + (f.key || f.t) + ' unreachable at ' + fx + ',' + fy);
        if (f.t === 'trap') { trapCount++; if (!Rules.TRAPS[f.trap]) E(where + ': unknown trap ' + f.trap); }
        if (f.t === 'mon') { checkGroup(f.g, where + ' group ' + (f.key || '') + '@' + fx + ',' + fy); if (f.flag) setFlags[f.flag] = 1; }
        if (f.items) f.items.forEach(function (it) { itemOk(typeof it === 'string' ? it : it.id, where + ' feature@' + fx + ',' + fy); });
        if (f.give) f.give.forEach(function (it) { itemOk(typeof it === 'string' ? it : it.id, where + ' event@' + fx + ',' + fy); });
        if (f.flag) setFlags[f.flag] = 1;
        if (f.choices) f.choices.forEach(function (ch) { if (ch.flag) setFlags[ch.flag] = 1; if (ch.fight) checkGroup(ch.fight, where + ' choice'); if (ch.give) ch.give.forEach(function (it) { itemOk(typeof it === 'string' ? it : it.id, where); }); });
        if (f.fight) checkGroup(f.fight, where + ' event fight');
        if (f.t === 'door' && f.key) itemOk(f.keyItem || 'none', where + ' door');
        if (f.t === 'stairs' || f.t === 'portal') {
          if (!adv.maps[f.to]) E(where + ': stairs to unknown map ' + f.to);
        }
      });
      if (map.type === 'dungeon') {
        if (secrets < 1 || secrets > 3) E(where + ': has ' + secrets + ' secret doors (need 1-3)');
        if (trapCount < 2 || trapCount > 3) E(where + ': has ' + trapCount + ' traps (need 2-3)');
      }
      // stairs links
      if (map.upAt) {
        if (!map.up) E(where + ': up stairs with no destination');
        else if (map.up !== 'wild') {
          var tm = adv.maps[map.up];
          if (!tm) E(where + ': up leads to unknown map ' + map.up);
          else { var t = M.compile(tm); if (!t.downAt) E(where + ': up target ' + map.up + ' has no down stairs'); else if (t.down !== mid) E(where + ': ' + map.up + '.down should be ' + mid); }
        }
      }
      if (map.downAt) {
        if (!map.down) E(where + ': down stairs with no destination');
        else {
          var tm2 = adv.maps[map.down];
          if (!tm2) E(where + ': down leads to unknown map ' + map.down);
          else { var t2 = M.compile(tm2); if (!t2.upAt) E(where + ': down target ' + map.down + ' has no up stairs'); }
        }
      }
      if (map.type === 'town' && !map.exits.length) E(where + ': town has no exit');
    });
    // wilderness
    var wd = adv.wild;
    if (!wd) E('no wilderness map');
    else {
      var wh = wd.grid.length, ww = wd.grid[0].length;
      wd.grid.forEach(function (r, y) { if (r.length !== ww) E('wild row ' + y + ' has length ' + r.length); });
      var home = null;
      (wd.sites || []).forEach(function (s) {
        if (s.x < 0 || s.y < 0 || s.x >= ww || s.y >= wh) { E('wild site ' + s.name + ' out of bounds'); return; }
        var tch = wd.grid[s.y][s.x];
        if (typeof Wilds !== 'undefined' && !Wilds.passable(tch)) E('wild site ' + s.name + ' on impassable terrain "' + tch + '"');
        if (s.kind === 'town') home = s;
        if (s.map && !adv.maps[s.map]) E('wild site ' + s.name + ' leads to unknown map ' + s.map);
        if (s.map && s.entry) {
          try {
            var em = M.compile(adv.maps[s.map]);
            var ec = em.cells[s.entry.y * em.w + s.entry.x];
            if (!M.isWalkable(ec)) E('wild site ' + s.name + ' entry not walkable');
          } catch (e) { }
        }
        if (s.fight) checkGroup(s.fight, 'wild lair ' + s.name);
        if (s.flag) setFlags[s.flag] = 1;
        (s.items || []).forEach(function (it) { itemOk(it, 'wild site ' + s.name); });
      });
      (wd.sites || []).forEach(function (s) {
        if (s.lock && !(adv.quests || []).some(function (q) { return q.id === s.lock || (q.goal && q.goal.flag === s.lock); }) && !setFlags[s.lock]) E('wild site ' + s.name + ' locked by unknown quest/flag ' + s.lock);
      });
      if (!home) E('wild map has no home town site');
      else if (typeof Wilds !== 'undefined') {
        var grid = wd.grid, seenW = {}, q2 = [[home.x, home.y]];
        seenW[home.x + ',' + home.y] = 1;
        while (q2.length) {
          var p = q2.shift();
          for (var dd = 0; dd < 4; dd++) {
            var ax = p[0] + M.DX[dd], ay = p[1] + M.DY[dd];
            if (ax < 0 || ay < 0 || ax >= ww || ay >= wh || seenW[ax + ',' + ay]) continue;
            if (!Wilds.passable(grid[ay][ax])) continue;
            seenW[ax + ',' + ay] = 1; q2.push([ax, ay]);
          }
        }
        wd.sites.forEach(function (s) { if (!seenW[s.x + ',' + s.y]) E('wild site ' + s.name + ' unreachable from home'); });
      }
      (wd.encounters || []).forEach(function (en, i) { checkGroup(en.g, 'wild encounter ' + i); });
    }
    (adv.wander || []).forEach(function (g, i) { checkGroup(g.g || g, 'wandering ' + i); });
    // quests (after the wilderness, whose lairs may also set flags)
    (adv.quests || []).forEach(function (q) {
      if (q.goal && q.goal.flag && !setFlags[q.goal.flag]) E('quest ' + q.id + ' goal flag "' + q.goal.flag + '" is never set');
      if (!q.reward) E('quest ' + q.id + ' has no reward');
    });
    if (!(adv.quests || []).some(function (q) { return q.main; })) E('no main quest');
    return { errors: errs, warnings: warn };
  };
  M.isWalkableOrDoor = function (map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    var c = map.cells[y * map.w + x];
    return M.isWalkable(c) || M.isDoorish(c);
  };

  return M;
})();
