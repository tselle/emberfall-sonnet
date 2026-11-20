/* Emberfall — watch.js
 * How monsters perceive and react to the party in the dungeon: line of sight,
 * noticing (with thieves creeping and parties sneaking), hunting groups that
 * close in, guards that hold their treasure, ambushers, and blocking. */
var Watch = (function () {
  'use strict';
  var W = {};
  var C = Modules.C;
  var SIGHT = 7;

  function opaque(c) { return Modules.isSolid(c) && c !== C.TREE && c !== C.PILLAR; }
  // Bresenham line of sight between two squares; walls and closed doors block
  W.los = function (cells, w, h, x0, y0, x1, y1, allowTargetSolid) {
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    var x = x0, y = y0, guard = 0;
    while (guard++ < 64) {
      if (x === x1 && y === y1) return true;
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (x === x1 && y === y1) return allowTargetSolid ? true : !opaque(cells[y * w + x]);
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      if (opaque(cells[y * w + x])) return false;
    }
    return false;
  };
  W.groupName = function (m) {
    var f = m.f || m, g = f.g || f.entries;
    if (f.name) return f.name;
    var lead = Monsters.byId[g[0][0]], n = g.reduce(function (a, e) { return a + e[1]; }, 0);
    return n > 1 ? lead.name.toLowerCase() + (/s$/.test(lead.name) ? '' : 's') : lead.name.toLowerCase();
  };
  W.noiseOf = function (m) {
    var t = m.type;
    if (t === 'undead') return 'a dry rattling and shuffling';
    if (t === 'goblinoid' || t === 'humanoid' || t === 'giant') return 'harsh voices and the clink of weapons';
    if (t === 'insect') return 'a dry chittering';
    if (t === 'beast' || t === 'lycanthrope') return 'growling and the scrape of claws';
    if (t === 'reptile' || t === 'dragon') return 'a slow, heavy hissing';
    if (t === 'ooze' || t === 'plant') return 'a wet, slithering sound';
    if (t === 'construct') return 'a grinding, as of stone on stone';
    if (t === 'fiend') return 'whispering and cruel laughter';
    return 'something moving';
  };
  // true if (x,y) is on the party's side of the door they face (used by listening)
  W.sameSide = function (x, y) {
    var p = Game.pos, d = p.dir;
    var ahead = (x - p.x) * Modules.DX[d] + (y - p.y) * Modules.DY[d];
    return ahead <= 0;
  };

  function stealth() {
    if (!Game.S.sneak) return 0;
    var best = 0;
    Game.ableParty().forEach(function (pc) {
      var d = Data.derive(pc);
      if (d.thief) best = Math.max(best, (d.thief.ms + d.thief.hs) / 200);
      else if (d.msBonus) best = Math.max(best, d.msBonus / 100);
    });
    var smallFolk = Game.ableParty().every(function (pc) { return pc.race === 'halfling' || pc.race === 'elf' || pc.race === 'gnome' || pc.race === 'halfelf'; });
    return Math.max(best * 0.85, smallFolk ? 0.3 : 0.12);
  }

  // a group that has noticed the party and stands next to both the party and the square it moves to
  W.blocker = function (nx, ny) {
    var p = Game.pos;
    for (var i = 0; i < Game.mons.length; i++) {
      var m = Game.mons[i];
      if (!m.st.noticed || (m.f.mode === 'ambush' && !m.st.revealed)) continue;
      var ax = Math.abs(m.st.x - p.x), ay = Math.abs(m.st.y - p.y);
      var bx = Math.abs(m.st.x - nx), by = Math.abs(m.st.y - ny);
      if (ax <= 1 && ay <= 1 && bx <= 1 && by <= 1 && W.los(Game.cells, Game.map.w, Game.map.h, m.st.x, m.st.y, nx, ny)) return m;
    }
    return null;
  };

  // a noisy act (forcing doors) alerts nearby groups
  W.noise = function (radius) {
    var p = Game.pos;
    Game.mons.forEach(function (m) { if (Math.abs(m.st.x - p.x) + Math.abs(m.st.y - p.y) <= radius + 3 && m.f.mode !== 'ambush') m.st.noticed = true; });
  };

  // a single BFS step towards the party; groups can open ordinary doors
  function stepToward(m) {
    var map = Game.map, w = map.w, h = map.h, cells = Game.cells;
    var start = m.st.y * w + m.st.x, goal = Game.pos.y * w + Game.pos.x;
    var prev = new Int32Array(w * h).fill(-1), q = [start];
    prev[start] = start;
    var occupied = {};
    Game.mons.forEach(function (o) { if (o !== m) occupied[o.st.y * w + o.st.x] = 1; });
    for (var qi = 0; qi < q.length && qi < 600; qi++) {
      var c = q[qi];
      if (c === goal) break;
      var cx = c % w, cy = (c / w) | 0;
      for (var d = 0; d < 4; d++) {
        var nx = cx + Modules.DX[d], ny = cy + Modules.DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var n = ny * w + nx;
        if (prev[n] !== -1) continue;
        var cv = cells[n];
        if (!(Modules.isWalkable(cv) || cv === C.DOOR) || cv === C.EXIT) continue;
        if (occupied[n] && n !== goal) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[goal] === -1) return false;
    var cur = goal, guard = 0;
    while (prev[cur] !== start && guard++ < 1000) cur = prev[cur];
    if (cur === goal) return false;
    if (cells[cur] === C.DOOR) { cells[cur] = C.OPEN; Game.ms.open[cur] = 1; }
    m.st.x = cur % w; m.st.y = (cur / w) | 0;
    return true;
  }

  // called after every party step; returns true if combat starts
  W.afterStep = function (searching) {
    var map = Game.map, w = map.w, h = map.h, p = Game.pos, st = stealth();
    var trigger = null, moved = false;
    for (var i = 0; i < Game.mons.length; i++) {
      var m = Game.mons[i], ms = m.st, f = m.f;
      if (ms.cool) { ms.cool--; continue; }
      var dist = Math.max(Math.abs(ms.x - p.x), Math.abs(ms.y - p.y));
      var man = Math.abs(ms.x - p.x) + Math.abs(ms.y - p.y);
      if (f.mode === 'ambush' && !ms.revealed) {
        if (man <= 1) {
          ms.revealed = true; ms.noticed = true;
          // elves and alert thieves sometimes spot the ambush first
          var spotter = Game.ableParty().filter(function (pc) { return pc.race === 'elf' || pc.cls === 'ranger' || pc.cls === 'thief'; })[0];
          var spotted = spotter && Math.random() < 0.3;
          UI.log(spotted ? spotter.name + ' spots ' + W.groupName(m) + ' lying in wait!' : 'Ambush! ' + cap(W.groupName(m)) + ' leap out!', 'bad');
          trigger = { m: m, surprise: spotted ? null : 'monsters' };
          break;
        }
        continue;
      }
      var sees = dist <= SIGHT && W.los(Game.cells, w, h, ms.x, ms.y, p.x, p.y);
      if (sees) {
        if (!ms.seen) { ms.seen = true; f.g.forEach(function (e) { Bestiary.see(e[0]); }); }
        if (!ms.noticed) {
          var chance = Math.min(0.95, 0.25 + (SIGHT - dist) * 0.1) * (1 - st);
          if (searching) chance = Math.min(1, chance * 1.5);
          if (Math.random() < chance) {
            ms.noticed = true;
            UI.log(cap(W.groupName(m)) + (Game.S.sneak ? ' notice the party despite its stealth!' : ' have noticed the party!'), 'warn');
          }
        }
      } else if (ms.noticed && f.mode !== 'hunt' && dist > SIGHT) {
        ms.noticed = false; // guards lose interest once the party is out of sight
      }
      if (ms.noticed) {
        if (man <= 1) { trigger = { m: m, surprise: null }; break; }
        if (f.mode === 'hunt' || (f.mode === 'guard' && dist <= 2 && !f.boss)) {
          var ox = ms.x, oy = ms.y;
          if (f.mode === 'hunt' || Math.random() < 0.5) moved = stepToward(m) || moved;
          var man2 = Math.abs(ms.x - p.x) + Math.abs(ms.y - p.y);
          if (man2 <= 1) { trigger = { m: m, surprise: null }; break; }
          if (f.mode === 'guard' && Math.abs(ms.x - f.x) + Math.abs(ms.y - f.y) > 2) { ms.x = ox; ms.y = oy; }
        }
      }
    }
    if (moved) Game.redraw();
    if (trigger) {
      var tm = trigger.m;
      setTimeout(function () { Game.engage(tm, trigger.surprise); }, 60);
      return true;
    }
    return false;
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  return W;
})();
