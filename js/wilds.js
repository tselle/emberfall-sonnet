/* Emberfall — wilds.js
 * Overland terrain, travel costs, encounter tables, friendly travellers and
 * the seeded wilderness-map generator used by generated adventures. */
var Wilds = (function () {
  'use strict';
  var W = {};

  W.TERRAIN = {
    '.': { name: 'Grassland', hours: 2, enc: 0.07, pass: true },
    '=': { name: 'Road', hours: 1, enc: 0.04, pass: true },
    'b': { name: 'Bridge', hours: 1, enc: 0.04, pass: true },
    'f': { name: 'Forest', hours: 3, enc: 0.11, pass: true },
    'h': { name: 'Hills', hours: 3, enc: 0.10, pass: true },
    'w': { name: 'Fen', hours: 4, enc: 0.13, pass: true },
    '^': { name: 'Mountains', hours: 6, enc: 0.12, pass: true },
    '~': { name: 'River', hours: 0, enc: 0, pass: false },
    'L': { name: 'Lake', hours: 0, enc: 0, pass: false },
    'M': { name: 'High Peaks', hours: 0, enc: 0, pass: false }
  };
  W.passable = function (ch) { var t = W.TERRAIN[ch]; return !!(t && t.pass); };
  W.terrainName = function (ch) { return (W.TERRAIN[ch] || { name: '?' }).name; };
  W.isNight = function (minutes) { var h = Math.floor(minutes / 60) % 24; return h >= 20 || h < 6; };
  // hours to cross one square
  W.travelHours = function (ch, minutes, fatigue) {
    var t = W.TERRAIN[ch]; if (!t) return 2;
    var h = t.hours;
    if (W.isNight(minutes)) h *= 1.5;
    if (fatigue > 16) h *= 1.5;
    return h;
  };
  // night and a weary, careless party both draw trouble
  W.encounterChance = function (ch, minutes, fatigue) {
    var t = W.TERRAIN[ch]; if (!t) return 0;
    return t.enc * (W.isNight(minutes) ? 1.5 : 1) * (fatigue > 16 ? 1.3 : 1);
  };

  W.SITE_KINDS = {
    town: { name: 'Town', icon: 'town' }, dungeon: { name: 'Dungeon', icon: 'dungeon' }, hamlet: { name: 'Hamlet', icon: 'hamlet' },
    healer: { name: 'Healer', icon: 'healer' }, holy: { name: 'Holy Site', icon: 'holy' }, lair: { name: 'Monster Lair', icon: 'lair' }, camp: { name: 'Safe Camp', icon: 'camp' }
  };

  W.TRAVELLERS = [
    { id: 'merchant', name: 'a travelling merchant', text: 'A merchant\'s wagon creaks along. "Fine wares, friends! Care to trade?"', act: 'trade' },
    { id: 'pilgrim', name: 'a band of pilgrims', text: 'Pilgrims bound for a distant shrine share their prayers. The party feels refreshed.', act: 'heal' },
    { id: 'scout', name: 'a ranger scout', text: 'A weather-beaten scout shares news of the road ahead.', act: 'rumour' },
    { id: 'minstrel', name: 'a wandering minstrel', text: 'A minstrel sings of old deeds and new dangers.', act: 'rumour' },
    { id: 'patrol', name: 'a mounted patrol', text: 'A patrol of riders salutes the party. "The roads are safer with folk like you on them."', act: 'none' },
    { id: 'hermit', name: 'an old hermit', text: 'A hermit offers herbs from his satchel and a word of warning.', act: 'herbs' }
  ];

  /* ---------- encounter table builder ---------- */
  var TERRAIN_TYPES = {
    '.': ['humanoid', 'goblinoid', 'beast', 'avian'],
    '=': ['humanoid', 'goblinoid', 'beast'],
    'b': ['humanoid', 'goblinoid', 'beast'],
    'f': ['beast', 'fey', 'goblinoid', 'insect', 'lycanthrope', 'plant'],
    'h': ['giant', 'goblinoid', 'beast', 'avian', 'humanoid'],
    'w': ['reptile', 'undead', 'insect', 'ooze', 'plant', 'goblinoid'],
    '^': ['giant', 'dragon', 'avian', 'beast', 'elemental']
  };
  W.bandPower = function (band) { return [null, [0.5, 4], [3, 8], [6, 12], [9, 16], [12, 30]][band]; };
  W.monstersFor = function (band, types, dungeon) {
    var p = W.bandPower(band);
    return Monsters.list.filter(function (m) {
      if (Monsters.isUnique(m)) return false;
      if (dungeon ? !Monsters.inDungeon(m) : !Monsters.outdoors(m)) return false;
      if (types && types.indexOf(m.type) < 0) return false;
      if (m.al === 'LG' || m.al === 'NG' || m.al === 'CG') return false;
      var pw = Monsters.power(m);
      return pw >= p[0] && pw <= p[1];
    });
  };
  // group size scaled so that total power is about right for a party of six
  W.groupSize = function (m, band, rng) {
    var target = [0, 6, 18, 36, 60, 90][band];
    var pw = Math.max(0.5, Monsters.power(m));
    var n = Math.round(target / pw * (0.6 + rng() * 0.6));
    return Math.max(1, Math.min(12, n));
  };
  W.buildEncounters = function (advId, band) {
    var rng = Modules.stream(advId, 'encounters');
    var out = [];
    Object.keys(TERRAIN_TYPES).forEach(function (t) {
      var list = W.monstersFor(band, TERRAIN_TYPES[t], false);
      if (list.length < 3) list = W.monstersFor(band, null, false);
      for (var i = 0; i < 4 && list.length; i++) {
        var m = rng.pick(list);
        out.push({ terrain: t, g: [[m.id, W.groupSize(m, band, rng)]], w: 4 - i });
      }
    });
    return out;
  };

  /* ---------- value noise ---------- */
  function noise(rng, w, h, scale) {
    var gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2, g = [];
    for (var i = 0; i < gw * gh; i++) g.push(rng());
    var out = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
        out.push(a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
    return out;
  }

  /* ---------- wilderness generator ---------- */
  // opts: { w, h, band, town:{name}, dungeons:[{name,map,entry,lock}], extra sites count }
  W.generate = function (advId, opts) {
    var rng = Modules.stream(advId, 'wild');
    var w = opts.w, h = opts.h, x, y, i;
    var elev = noise(rng, w, h, 6), moist = noise(rng, w, h, 5), rough = noise(rng, w, h, 3);
    var g = [];
    for (y = 0; y < h; y++) {
      g.push([]);
      for (x = 0; x < w; x++) {
        var e = elev[y * w + x] * 0.75 + rough[y * w + x] * 0.25, m = moist[y * w + x], ch = '.';
        if (e > 0.78) ch = '^'; else if (e > 0.64) ch = 'h';
        else if (m > 0.66 && e < 0.4) ch = 'w'; else if (m > 0.55) ch = 'f';
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) ch = e > 0.6 ? 'M' : (m > 0.5 ? 'f' : 'h');
        g[y].push(ch);
      }
    }
    // a river from top to bottom (or left to right)
    var vertical = rng() < 0.5;
    var rx = vertical ? rng.int(Math.floor(w * 0.25), Math.floor(w * 0.75)) : 1;
    var ry = vertical ? 1 : rng.int(Math.floor(h * 0.25), Math.floor(h * 0.75));
    var guard = 0;
    while (guard++ < 400) {
      if (rx <= 0 || ry <= 0 || rx >= w - 1 || ry >= h - 1) break;
      g[ry][rx] = '~';
      var r = rng();
      if (vertical) { if (r < 0.6) ry++; else if (r < 0.8) rx = Math.max(1, rx - 1); else rx = Math.min(w - 2, rx + 1); }
      else { if (r < 0.6) rx++; else if (r < 0.8) ry = Math.max(1, ry - 1); else ry = Math.min(h - 2, ry + 1); }
    }
    // sites
    var sites = [], taken = {};
    var free = function (sx, sy, minDist) {
      if (sx < 2 || sy < 2 || sx >= w - 2 || sy >= h - 2) return false;
      if (!W.passable(g[sy][sx])) return false;
      for (var k = 0; k < sites.length; k++) if (Math.abs(sites[k].x - sx) + Math.abs(sites[k].y - sy) < minDist) return false;
      return true;
    };
    var place = function (site, minDist, area) {
      for (var tries = 0; tries < 500; tries++) {
        var sx, sy;
        if (area) { sx = rng.int(area[0], area[2]); sy = rng.int(area[1], area[3]); }
        else { sx = rng.int(2, w - 3); sy = rng.int(2, h - 3); }
        if (free(sx, sy, tries > 300 ? 3 : minDist)) {
          site.x = sx; site.y = sy;
          if (g[sy][sx] === '^') g[sy][sx] = 'h';
          sites.push(site); return site;
        }
      }
      // fallback: scan for any free square
      for (var yy = 2; yy < h - 2; yy++) for (var xx = 2; xx < w - 2; xx++) if (free(xx, yy, 2)) { site.x = xx; site.y = yy; sites.push(site); return site; }
      throw new Error('cannot place site ' + site.name);
    };
    var town = place({ kind: 'town', name: opts.town.name, map: opts.town.map, entry: opts.town.entry }, 0, [Math.floor(w * 0.3), Math.floor(h * 0.3), Math.floor(w * 0.7), Math.floor(h * 0.7)]);
    g[town.y][town.x] = '.';
    opts.dungeons.forEach(function (d) { place({ kind: 'dungeon', name: d.name, map: d.map, entry: d.entry, lock: d.lock, dir: d.dir || 0 }, Math.floor((w + h) / 5)); });
    var nameRng = Modules.stream(advId, 'wildnames');
    var hamlets = opts.hamlets != null ? opts.hamlets : 1 + (rng() < 0.6 ? 1 : 0);
    for (i = 0; i < hamlets; i++) place({ kind: 'hamlet', name: W.placeName(nameRng) }, 6);
    place({ kind: 'healer', name: nameRng.pick(['Hermitage of St. Elric', 'The Herb-Wife\'s Cottage', 'Shrine of the Mending Hand', 'Grey Sisters\' Abbey', 'The Healing Spring']) }, 5);
    var holies = 1 + (rng() < 0.5 ? 1 : 0);
    for (i = 0; i < holies; i++) place({ kind: 'holy', name: nameRng.pick(['Standing Stones', 'Shrine of the Dawn', 'The Pilgrim\'s Cairn', 'Altar of the Old Gods', 'The Weeping Oak', 'Saint\'s Well', 'Moon Circle']), xp: 50 * opts.band * opts.band }, 5);
    var camps = 1 + (rng() < 0.5 ? 1 : 0);
    for (i = 0; i < camps; i++) place({ kind: 'camp', name: nameRng.pick(['Hunters\' Lodge', 'Ranger Camp', 'Old Watchtower', 'Sheltered Hollow', 'Waystation']) }, 5);
    var lairs = opts.lairs || 2;
    var lairMons = W.monstersFor(opts.band, null, false);
    for (i = 0; i < lairs && lairMons.length; i++) {
      var lm = rng.pick(lairMons);
      var n = Math.max(1, Math.round(W.groupSize(lm, opts.band, rng) * 1.2));
      place({ kind: 'lair', name: lm.name + ' Lair', fight: [[lm.id, n]], tt: lm.tt || 'C' }, 5);
    }
    // roads from town to hamlets and dungeons (A*-ish greedy with BFS)
    sites.forEach(function (s) {
      if (s.kind === 'hamlet' || s.kind === 'dungeon' || s.kind === 'healer') road(g, w, h, town, s);
    });
    // ensure everything is reachable from the town; if not, build a road
    sites.forEach(function (s) { if (!reach(g, w, h, town, s)) road(g, w, h, town, s); });
    var grid = g.map(function (row) { return row.join(''); });
    return { grid: grid, sites: sites };
  };
  function reach(g, w, h, a, b) {
    var seen = {}, q = [[a.x, a.y]]; seen[a.x + ',' + a.y] = 1;
    while (q.length) {
      var p = q.shift();
      if (p[0] === b.x && p[1] === b.y) return true;
      for (var d = 0; d < 4; d++) {
        var nx = p[0] + Modules.DX[d], ny = p[1] + Modules.DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[nx + ',' + ny]) continue;
        if (!W.passable(g[ny][nx])) continue;
        seen[nx + ',' + ny] = 1; q.push([nx, ny]);
      }
    }
    return false;
  }
  function road(g, w, h, a, b) {
    // Dijkstra over everything except map border, rivers cost more (bridges)
    var cost = function (ch) { return ch === '=' || ch === 'b' ? 1 : ch === '~' ? 6 : ch === 'L' ? 50 : ch === 'M' ? 99 : ch === '^' ? 8 : ch === 'w' ? 4 : ch === 'f' || ch === 'h' ? 3 : 2; };
    var dist = {}, prev = {}, open = [[0, a.x, a.y]];
    dist[a.x + ',' + a.y] = 0;
    while (open.length) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      var cur = open.splice(bi, 1)[0], cx = cur[1], cy = cur[2];
      if (cx === b.x && cy === b.y) break;
      for (var d = 0; d < 4; d++) {
        var nx = cx + Modules.DX[d], ny = cy + Modules.DY[d];
        if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
        var nd = cur[0] + cost(g[ny][nx]), key = nx + ',' + ny;
        if (dist[key] === undefined || nd < dist[key]) { dist[key] = nd; prev[key] = cx + ',' + cy; open.push([nd, nx, ny]); }
      }
    }
    var k = b.x + ',' + b.y, guard = 0;
    while (prev[k] && guard++ < 2000) {
      var parts = k.split(','), px = +parts[0], py = +parts[1];
      var ch = g[py][px];
      if (!(px === b.x && py === b.y)) {
        if (ch === '~') g[py][px] = 'b';
        else if (ch === 'M' || ch === 'L') g[py][px] = 'h';
        else if (ch !== 'b') g[py][px] = '=';
      } else if (!W.passable(ch)) g[py][px] = '.';
      k = prev[k];
    }
  }

  /* ---------- names ---------- */
  var PRE = ['Ash', 'Bram', 'Cold', 'Dun', 'Elder', 'Fern', 'Gor', 'Hollow', 'Iron', 'Kings', 'Long', 'Mill', 'North', 'Oak', 'Pike', 'Red', 'Stone', 'Thorn', 'Under', 'West', 'Wolf', 'Yew', 'Black', 'Briar', 'Crow', 'Dusk', 'Elm', 'Frost', 'Gold', 'High', 'Lark', 'Marsh', 'Raven', 'Silver', 'Swan', 'Willow', 'Ember', 'Glen', 'Hart', 'Moss'];
  var SUF = ['ford', 'bury', 'wick', 'ham', 'stead', 'mere', 'dale', 'combe', 'well', 'brook', 'field', 'hollow', 'gate', 'moor', 'by', 'thorpe', 'ton', 'holt', 'ridge', 'cross'];
  W.placeName = function (rng) { return rng.pick(PRE) + rng.pick(SUF); };

  return W;
})();
