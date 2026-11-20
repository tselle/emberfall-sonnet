/* Emberfall — game.js
 * The game controller: state, saving, exploration in the 3D view, smooth
 * movement, doors, searching, traps, events, stairs, camping and the hand-off
 * to combat, the overland map and the campaign screen. */
var Game = (function () {
  'use strict';
  var G = {};
  var C = Modules.C, DX = Modules.DX, DY = Modules.DY;
  G.S = null;
  G.mode = 'title';
  G.adv = null; G.map = null; G.cells = null; G.ms = null; G.mons = [];
  G.pos = { x: 0, y: 0, dir: 0 };
  G.VERSION = 1;
  var SAVE_PREFIX = 'emberfall.';

  /* ---------- small helpers ---------- */
  G.party = function () { return G.S ? G.S.party : []; };
  G.alive = function (pc) { return !pc.status.dead && !pc.status.stone; };
  G.able = function (pc) { return G.alive(pc) && pc.hp > 0 && !pc.status.paralyzed && !pc.status.poisoned; };
  G.living = function () { return G.party().filter(G.alive); };
  G.ableParty = function () { return G.party().filter(G.able); };
  G.timeText = function (t) {
    t = t == null ? G.S.time : t;
    var day = Math.floor(t / 1440) + 1, h = Math.floor(t / 60) % 24, m = Math.floor(t % 60);
    return 'Day ' + day + ', ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  };
  G.passTime = function (min) {
    G.S.time += min;
    // paralysis wears off with time; ring regeneration ticks
    G.party().forEach(function (pc) {
      if (pc.status.paralyzed && G.S.time >= pc.status.paralyzed) { delete pc.status.paralyzed; UI.log(pc.name + ' can move again.', 'good'); }
      if (G.alive(pc) && pc.hp > 0 && pc.hp < pc.hpMax) {
        var d = Data.derive(pc);
        if (d.regen) { pc.regenAcc = (pc.regenAcc || 0) + min * d.regen / 10; var h = Math.floor(pc.regenAcc); if (h > 0) { pc.hp = Math.min(pc.hpMax, pc.hp + h); pc.regenAcc -= h; } }
      }
    });
  };
  G.rnd = function (n) { return Rules.d(n); };
  G.best = function (fn) { var b = null, bv = -1e9; G.ableParty().forEach(function (pc) { var v = fn(pc); if (v > bv) { bv = v; b = pc; } }); return { pc: b, v: bv }; };
  G.note = function (text) { G.S.journal.push({ t: G.S.time, adv: G.S.adv, text: text }); };
  G.flag = function (f) { return !!G.advState().flags[f]; };
  G.setFlag = function (f) { if (!f) return; G.advState().flags[f] = true; Journal.onFlag(f); };

  /* ---------- state ---------- */
  G.newState = function (party) {
    return {
      ver: G.VERSION, party: party, gold: Data.STARTING_GOLD, adv: null,
      loc: { mode: 'map', map: 'town', x: 1, y: 1, dir: 1 }, time: 8 * 60, fatigue: 0,
      advs: {}, journal: [], bestiary: {}, sneak: false,
      opts: { navpad: ('ontouchstart' in window) || navigator.maxTouchPoints > 0, speed: 1, autoSave: true },
      created: Date.now()
    };
  };
  G.advState = function (id) {
    id = id || G.S.adv;
    var a = G.S.advs[id];
    if (!a) a = G.S.advs[id] = { flags: {}, quests: {}, maps: {}, sites: {}, wild: null, wildSeen: null, visited: true };
    return a;
  };
  G.mapState = function (mapId) {
    var a = G.advState();
    var m = a.maps[mapId];
    if (!m) m = a.maps[mapId] = { seen: null, mons: {}, open: {}, found: {}, traps: {}, taken: {}, loot: {}, ev: {}, unlocked: {} };
    return m;
  };
  // bitset helpers for explored squares
  G.seenArr = function (st, w, h) {
    if (!st._seen) {
      st._seen = new Uint8Array(w * h);
      if (st.seen) { for (var i = 0; i < st.seen.length && i < w * h; i++) st._seen[i] = st.seen.charCodeAt(i) === 49 ? 1 : 0; }
    }
    return st._seen;
  };
  function packSeen(st) { if (st._seen) { var s = ''; for (var i = 0; i < st._seen.length; i++) s += st._seen[i] ? '1' : '0'; st.seen = s.replace(/0+$/, ''); } }

  /* ---------- saving ---------- */
  G.SLOTS = ['1', '2', '3', '4', '5'];
  function serialize() {
    Object.keys(G.S.advs).forEach(function (k) {
      var a = G.S.advs[k];
      Object.keys(a.maps).forEach(function (m) { packSeen(a.maps[m]); });
      if (a._wildSeen) { var s = ''; for (var i = 0; i < a._wildSeen.length; i++) s += a._wildSeen[i] ? '1' : '0'; a.wildSeen = s; }
    });
    return JSON.stringify(G.S, function (k, v) { return k.charAt(0) === '_' ? undefined : v; });
  }
  G.save = function (slot, quiet) {
    if (!G.S || G.mode === 'combat') { if (!quiet) UI.toast('You cannot save during combat.'); return false; }
    try {
      var data = serialize();
      localStorage.setItem(SAVE_PREFIX + 'save.' + slot, data);
      var meta = { slot: slot, time: G.timeText(), adv: G.S.adv ? Modules.get(G.S.adv).name : '', party: G.party().map(function (p) { return p.name + ' (' + p.lvl + ')'; }).join(', '), real: Date.now(), where: G.whereText() };
      localStorage.setItem(SAVE_PREFIX + 'meta.' + slot, JSON.stringify(meta));
      if (!quiet) UI.toast(slot === 'auto' ? 'Autosaved.' : 'Game saved to slot ' + slot + '.');
      return true;
    } catch (e) { UI.toast('Could not save: ' + e.message); return false; }
  };
  G.autosave = function () { if (G.S && G.S.opts.autoSave !== false) G.save('auto', true); };
  G.saveMeta = function (slot) { try { return JSON.parse(localStorage.getItem(SAVE_PREFIX + 'meta.' + slot) || 'null'); } catch (e) { return null; } };
  G.hasSave = function () { return ['auto'].concat(G.SLOTS).some(function (s) { return !!localStorage.getItem(SAVE_PREFIX + 'save.' + s); }); };
  G.load = function (slot) {
    var raw;
    try { raw = localStorage.getItem(SAVE_PREFIX + 'save.' + slot); } catch (e) { raw = null; }
    if (!raw) { UI.toast('That slot is empty.'); return false; }
    var S;
    try { S = JSON.parse(raw); } catch (e) { UI.toast('That save is damaged.'); return false; }
    G.S = S;
    S.opts = S.opts || {};
    UI.closeAll();
    UI.show('game');
    G.mode = 'explore';
    G.adv = Modules.get(S.adv);
    Modules.ensureBuilt(G.adv);
    NavPad.apply();
    if (S.loc.mode === 'wild') G.enterWild(S.loc.x, S.loc.y, true);
    else G.enterMap(S.loc.map, S.loc.x, S.loc.y, S.loc.dir, true);
    UI.log('Game loaded. ' + G.timeText(), 'info');
    return true;
  };
  G.deleteSave = function (slot) { localStorage.removeItem(SAVE_PREFIX + 'save.' + slot); localStorage.removeItem(SAVE_PREFIX + 'meta.' + slot); };
  G.whereText = function () {
    if (!G.S || !G.S.adv) return '';
    if (G.S.loc.mode === 'wild') return G.adv && G.adv.wild ? G.adv.wild.name : 'Wilderness';
    return G.map ? G.map.name : '';
  };

  /* ---------- starting play ---------- */
  G.startNew = function (party) {
    G.S = G.newState(party);
    party.forEach(function (pc) {
      if (pc.cls === 'mage' && !pc.book.length) pc.book = ['magic_missile', 'sleep', 'shield'];
      Game.autoMemorize(pc);
    });
    UI.show('game');
    NavPad.apply();
    Campaign.open(true);
  };
  G.startAdventure = function (advId, fresh) {
    var adv = Modules.get(advId);
    Modules.ensureBuilt(adv);
    G.S.adv = advId;
    G.adv = adv;
    var a = G.advState(advId);
    G.mode = 'explore';
    UI.show('game');
    if (!a.started) {
      a.started = true;
      G.note('Arrived at ' + adv.maps[adv.start.map].name + ' to begin "' + adv.name + '".');
    }
    var st = adv.start;
    var home = adv.wild.sites.filter(function (s) { return s.kind === 'town'; })[0];
    a.wildPos = a.wildPos || { x: home.x, y: home.y };
    G.enterMap(st.map, st.x, st.y, st.dir);
    UI.log('Welcome to ' + G.map.name + '. ' + adv.blurb, 'info');
    UI.log('Visit ' + (G.hallName() || 'the hall') + ' to speak with ' + adv.giver + '.', 'warn');
    G.autosave();
  };
  G.hallName = function () {
    var t = G.adv.maps.town, f = null;
    if (t.keys) Object.keys(t.keys).forEach(function (k) { if (t.keys[k].shop === 'hall') f = t.keys[k]; });
    if (t.feats) t.feats.forEach(function (x) { if (x.shop === 'hall') f = x; });
    return f ? f.name : null;
  };

  /* ---------- entering maps ---------- */
  G.enterMap = function (mapId, x, y, dir, fromLoad) {
    var map = Modules.map(G.S.adv, mapId);
    G.map = map;
    G.ms = G.mapState(mapId);
    var cells = new Uint8Array(map.cells);
    var ms = G.ms;
    Object.keys(ms.open).forEach(function (k) { cells[k] = C.OPEN; });
    Object.keys(ms.found).forEach(function (k) { if (cells[k] === C.SECRET) cells[k] = ms.open[k] ? C.OPEN : C.DOOR; });
    Object.keys(ms.unlocked).forEach(function (k) { if (cells[k] === C.LOCKED) cells[k] = ms.open[k] ? C.OPEN : C.DOOR; });
    G.cells = cells;
    // live monster groups
    G.mons = [];
    Object.keys(map.feat).forEach(function (k) {
      var f = map.feat[k];
      if (f.t !== 'mon') return;
      var st = ms.mons[k];
      if (st && st.dead) return;
      if (!st) st = ms.mons[k] = { x: f.x, y: f.y };
      G.mons.push({ key: +k, f: f, st: st });
    });
    G.pos = { x: x, y: y, dir: dir || 0 };
    G.S.loc = { mode: 'map', map: mapId, x: x, y: y, dir: G.pos.dir };
    G.mode = 'explore';
    document.getElementById('view').style.display = 'block';
    document.getElementById('wildview').style.display = 'none';
    View3D.setMap(map, cells);
    NavPad.apply();
    G.anim = null;
    G.reveal();
    UI.updateAll();
    G.redraw();
    if (!fromLoad && map.type === 'town') UI.log('You are in ' + map.name + '.', 'info');
    if (!fromLoad && map.type === 'dungeon' && !ms.visited) { ms.visited = true; G.note('Entered ' + map.name + '.'); UI.log('You enter ' + map.name + '.', 'info'); }
  };
  G.enterWild = function (x, y, fromLoad) {
    var a = G.advState();
    if (x == null) { x = a.wildPos.x; y = a.wildPos.y; }
    a.wildPos = { x: x, y: y };
    G.S.loc = { mode: 'wild', x: x, y: y };
    G.mode = 'wild';
    G.map = null;
    document.getElementById('view').style.display = 'none';
    document.getElementById('wildview').style.display = 'block';
    Overland.enter(fromLoad);
    NavPad.apply();
    UI.updateAll();
  };

  /* ---------- line of sight reveal for the automap ---------- */
  G.reveal = function () {
    var map = G.map, w = map.w, h = map.h, seen = G.seenArr(G.ms, w, h);
    var px = G.pos.x, py = G.pos.y, R = map.type === 'town' ? 6 : 4;
    for (var y = Math.max(0, py - R); y <= Math.min(h - 1, py + R); y++) for (var x = Math.max(0, px - R); x <= Math.min(w - 1, px + R); x++) {
      if (seen[y * w + x]) continue;
      if (Watch.los(G.cells, w, h, px, py, x, y, true)) seen[y * w + x] = 1;
    }
  };

  /* ---------- rendering ---------- */
  var rafPending = false;
  G.anim = null;
  G.redraw = function () { if (!rafPending) { rafPending = true; requestAnimationFrame(frame); } };
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function frame(now) {
    rafPending = false;
    if (G.mode === 'wild') { Overland.draw(); return; }
    if (G.mode !== 'explore' || !G.map) return;
    var px = G.pos.x + 0.5, py = G.pos.y + 0.5, ang = G.pos.dir * Math.PI / 2, bob = 0;
    var a = G.anim;
    if (a) {
      var t = Math.min(1, (now - a.t0) / a.dur), e = easeInOut(t);
      if (a.kind === 'move') { px = a.fx + (a.tx - a.fx) * e; py = a.fy + (a.ty - a.fy) * e; ang = a.ta; bob = Math.sin(t * Math.PI) * 2; }
      else if (a.kind === 'turn') { ang = a.fa + (a.ta - a.fa) * e; px = a.fx; py = a.fy; }
      else if (a.kind === 'bump') { var b = Math.sin(t * Math.PI) * 0.12; px = a.fx + a.dx * b; py = a.fy + a.dy * b; ang = a.ta; }
      if (t >= 1) { G.anim = null; if (a.done) a.done(); }
      else rafPending = true, requestAnimationFrame(frame);
    }
    View3D.render(px, py, ang, G.sprites(), bob);
    MapView.mini();
  }
  // sprites visible in the 3D view
  var SIZE_SCALE = { S: 0.62, M: 0.8, L: 0.95, H: 1.1, G: 1.25 };
  G.sprites = function () {
    var out = [], map = G.map, ms = G.ms, w = map.w;
    // groups show up to three figures side by side (followers a little behind)
    var fdx = DX[G.pos.dir], fdy = DY[G.pos.dir], pdx = -fdy, pdy = fdx;
    G.mons.forEach(function (m) {
      if (m.f.mode === 'ambush' && !m.st.revealed) return;
      var figs = [];
      m.f.g.forEach(function (e) { for (var k = 0; k < e[1] && figs.length < 3; k++) figs.push(e[0]); });
      var offs = figs.length === 1 ? [[0, 0]] : figs.length === 2 ? [[-0.2, 0.1], [0.2, 0.1]] : [[0, 0], [-0.28, 0.18], [0.28, 0.18]];
      figs.forEach(function (id, k) {
        var mon = Monsters.byId[id], o = offs[k];
        var sc = (SIZE_SCALE[mon ? mon.size : 'M'] || 0.8) * (k === 0 ? 1 : 0.85);
        out.push({ x: m.st.x + 0.5 + pdx * o[0] + fdx * o[1], y: m.st.y + 0.5 + pdy * o[0] + fdy * o[1], sp: Figures.monsterSprite(id), scale: sc });
      });
    });
    Object.keys(map.feat).forEach(function (k) {
      var f = map.feat[k], x = f.x + 0.5, y = f.y + 0.5;
      if (f.t === 'chest' && !ms.taken[k]) { if (!f.hidden || G.seenArr(ms, w, map.h)[k]) out.push({ x: x, y: y, sp: Figures.sprites.chest, scale: 0.55 }); }
      else if (f.t === 'trap' && ms.traps[k] === 'found') out.push({ x: x, y: y, sp: Figures.sprites.trap, scale: 0.7 });
      else if (f.t === 'sign') out.push({ x: x, y: y, sp: Figures.sprites.sign, scale: 0.45 });
    });
    Object.keys(ms.loot).forEach(function (k) { if (ms.loot[k] && ms.loot[k].length) { var lx = k % w, ly = (k / w) | 0; out.push({ x: lx + 0.5, y: ly + 0.5, sp: Figures.sprites.loot, scale: 0.5 }); } });
    // stairs, exits and scenery
    var cells = G.cells, px = G.pos.x, py = G.pos.y, R = 12;
    for (var y = Math.max(0, py - R); y < Math.min(map.h, py + R + 1); y++) for (var x2 = Math.max(0, px - R); x2 < Math.min(w, px + R + 1); x2++) {
      var c = cells[y * w + x2];
      if (c === C.DOWN) out.push({ x: x2 + 0.5, y: y + 0.5, sp: Figures.sprites.stairs_down, scale: 0.8 });
      else if (c === C.UP) out.push({ x: x2 + 0.5, y: y + 0.5, sp: Figures.sprites.stairs_up, scale: 0.8 });
      else if (c === C.EXIT) out.push({ x: x2 + 0.5, y: y + 0.5, sp: Figures.sprites.exit, scale: 0.95 });
      else if (c === C.TREE) out.push({ x: x2 + 0.5, y: y + 0.5, sp: Figures.sprites.tree, scale: 0.95 });
      else if (c === C.PILLAR) out.push({ x: x2 + 0.5, y: y + 0.5, sp: Figures.sprites.pillar, scale: 0.7 });
    }
    return out;
  };

  /* ---------- movement ---------- */
  var queued = null;
  G.busy = function () { return !!G.anim || UI.hasModal() || G.mode !== 'explore'; };
  G.input = function (act) {
    if (G.mode === 'wild') { Overland.input(act); return; }
    if (G.mode !== 'explore' || UI.hasModal()) return;
    if (G.anim) { queued = act; return; }
    if (act === 'fwd') G.move(0); else if (act === 'back') G.move(2); else if (act === 'left') G.turn(-1); else if (act === 'right') G.turn(1);
    else if (act === 'sl') G.move(3); else if (act === 'sr') G.move(1);
  };
  function runQueued() { if (queued && !UI.hasModal() && G.mode === 'explore') { var q = queued; queued = null; G.input(q); } else queued = null; }
  G.turn = function (d) {
    var fa = G.pos.dir * Math.PI / 2;
    G.pos.dir = (G.pos.dir + d + 4) % 4;
    G.S.loc.dir = G.pos.dir;
    G.anim = { kind: 'turn', fa: fa, ta: fa + d * Math.PI / 2, fx: G.pos.x + 0.5, fy: G.pos.y + 0.5, t0: performance.now(), dur: 150 / (G.S.opts.speed || 1), done: function () { UI.updateCompass(); MapView.mini(); runQueued(); } };
    G.redraw();
  };
  G.monAt = function (x, y) { for (var i = 0; i < G.mons.length; i++) if (G.mons[i].st.x === x && G.mons[i].st.y === y) return G.mons[i]; return null; };
  G.move = function (off) {
    var d = (G.pos.dir + off) % 4, nx = G.pos.x + DX[d], ny = G.pos.y + DY[d], map = G.map;
    if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return bump(d);
    var idx = ny * map.w + nx, c = G.cells[idx];
    var m = G.monAt(nx, ny);
    if (m) { G.engage(m, m.st.noticed ? null : 'party'); return; }
    // a group that has noticed the party will not let it slip past
    var blocker = Watch.blocker(nx, ny);
    if (blocker) { UI.log('The ' + Watch.groupName(blocker) + ' move to block your way!', 'warn'); G.engage(blocker, null); return; }
    if (c === C.DOOR) { G.cells[idx] = C.OPEN; G.ms.open[idx] = 1; UI.log('You open the door.', 'dim'); }
    else if (c === C.LOCKED) { lockedDoor(idx); return; }
    else if (c === C.SHOP) { bump(d); UI.building(map.feat[idx]); return; }
    else if (Modules.isSolid(c)) return bump(d);
    // a known trap ahead: let the party decide
    var tf = map.feat[idx];
    if (tf && tf.t === 'trap' && G.ms.traps[idx] === 'found') { knownTrap(idx, d, nx, ny); return; }
    stepTo(nx, ny, d);
  };
  function stepTo(nx, ny, d) {
    var fx = G.pos.x + 0.5, fy = G.pos.y + 0.5;
    G.pos.x = nx; G.pos.y = ny;
    G.S.loc.x = nx; G.S.loc.y = ny;
    G.anim = { kind: 'move', fx: fx, fy: fy, tx: nx + 0.5, ty: ny + 0.5, ta: G.pos.dir * Math.PI / 2, t0: performance.now(), dur: (G.S.sneak ? 260 : 180) / (G.S.opts.speed || 1), done: function () { arrive(); } };
    G.redraw();
  }
  function bump(d) {
    G.anim = { kind: 'bump', fx: G.pos.x + 0.5, fy: G.pos.y + 0.5, dx: DX[d], dy: DY[d], ta: G.pos.dir * Math.PI / 2, t0: performance.now(), dur: 140, done: runQueued };
    G.redraw();
  }
  function arrive() {
    G.passTime(G.S.sneak ? 2 : 1);
    G.reveal();
    UI.updateStatus();
    MapView.mini();
    if (Watch.afterStep()) return; // combat began
    G.squareEffects(function () { runQueued(); });
  }

  /* ---------- what happens on a square ---------- */
  G.squareEffects = function (done) {
    var map = G.map, idx = G.pos.y * map.w + G.pos.x, f = map.feat[idx], ms = G.ms, c = G.cells[idx];
    done = done || function () { };
    var chain = [];
    if (f) {
      if (f.t === 'trap' && ms.traps[idx] !== 'gone' && G._safeTrap !== idx) chain.push(function (next) { springTrap(idx, f, next); });
      else if (f.t === 'event') chain.push(function (next) { runEvent(idx, f, next); });
      else if (f.t === 'sign') chain.push(function (next) { if (!ms.ev[idx]) { ms.ev[idx] = 1; UI.alert('', f.text, next); } else { UI.log(f.text, 'dim'); next(); } });
      else if (f.t === 'chest' && !ms.taken[idx]) chain.push(function (next) { openChest(idx, f, next); });
      else if (f.t === 'holy' && !ms.ev[idx]) chain.push(function (next) { ms.ev[idx] = 1; G.giveXp(f.xp || 50, true); UI.alert('A Holy Place', f.text || 'A sense of peace settles on the party.', next); });
    }
    if (ms.loot[idx] && ms.loot[idx].length) chain.push(function (next) { UI.loot('Items on the ground', 0, ms.loot[idx], function (left) { ms.loot[idx] = left; G.redraw(); next(); }); });
    if (c === C.UP || c === C.DOWN) chain.push(function (next) {
      var up = c === C.UP, tgt = up ? map.up : map.down;
      var txt = (up ? map.def.upText : map.def.downText) || (up ? (tgt === 'wild' ? 'Stairs lead up to the surface.' : 'A stair climbs upward.') : 'A stair leads down into darkness.');
      UI.confirm('Stairs', txt + ' Take them?', function () { G.useStairs(up); }, next);
    });
    if (c === C.EXIT) chain.push(function (next) { UI.confirm('Leave', map.type === 'town' ? 'Leave ' + map.name + ' for the open country?' : 'Leave ' + map.name + '?', function () { G.exitToWild(); }, next); });
    G._safeTrap = null;
    var i = 0;
    var next = function () { if (i < chain.length) chain[i++](next); else { UI.updateAll(); G.redraw(); done(); } };
    next();
  };

  function runEvent(idx, f, next) {
    var ms = G.ms;
    if (f.req && !G.flag(f.req)) return next();
    if (f.unless && G.flag(f.unless)) return next();
    if (ms.ev[idx] && f.once !== false) return next();
    UI.event(f, function (choice) {
      var r = choice || f;
      if (!choice || !choice.keep) ms.ev[idx] = 1;
      if (r.flag) G.setFlag(r.flag);
      if (r.gp) { G.S.gold += r.gp; UI.log('The party gains ' + r.gp + ' gold.', 'good'); }
      if (r.xp) G.giveXp(r.xp, true);
      if (r.heal) G.party().forEach(function (pc) { if (G.alive(pc)) pc.hp = pc.hpMax; });
      if (r.give && r.give.length) {
        var items = r.give.map(function (id) { return Data.makeItem(id); });
        UI.loot(f.title || 'Found', 0, items, function (left) { if (left.length) G.dropHere(left); after(); });
      } else after();
      function after() {
        if (r.title || f.title) G.note((r.note || f.title || 'Event') + ': ' + (r.text || f.text).slice(0, 90) + ((r.text || f.text).length > 90 ? '…' : ''));
        if (r.fight || f.fight) { var g = r.fight || f.fight; G.fight([{ entries: g, name: f.title }], null, next); return; }
        UI.updateAll(); next();
      }
    });
  }
  function openChest(idx, f, next) {
    var ms = G.ms;
    var items = (f.items || []).map(function (it) { return typeof it === 'string' ? Data.makeItem(it) : JSON.parse(JSON.stringify(it)); });
    var gp = f.gp || 0;
    if (f.tt) { var tr = Treasure.roll(f.tt, Modules.rng(G.S.adv + ':' + G.map.id + ':chest' + idx), G.adv.band, 1); gp += tr.gp; items = items.concat(tr.items); }
    ms.taken[idx] = 1;
    UI.loot(f.hidden ? 'A Hidden Cache' : 'A Chest', gp, items, function (left) { if (left.length) G.dropHere(left); G.redraw(); next(); });
  }
  G.dropHere = function (items) {
    if (!G.map || !items.length) return;
    var idx = G.pos.y * G.map.w + G.pos.x;
    G.ms.loot[idx] = (G.ms.loot[idx] || []).concat(items);
    G.redraw();
  };

  /* ---------- doors ---------- */
  function lockedDoor(idx) {
    var f = G.map.feat[idx], key = f && f.keyItem;
    if (key) {
      var holder = G.party().filter(function (pc) { return pc.inv.some(function (i) { return i.id === key; }); })[0];
      if (holder) { unlock(idx); UI.log(holder.name + ' unlocks the door with the ' + Data.items[key].name + '.', 'good'); return; }
      UI.alert('Locked', 'The door is locked fast. It needs a key.'); return;
    }
    var thief = G.best(function (pc) { var d = Data.derive(pc); return d.thief ? d.thief.ol : -1; });
    var brute = G.best(function (pc) { return Rules.strTable(Data.derive(pc).str, Data.derive(pc).strEx).door; });
    var opts = [];
    if (thief.pc && thief.v > 0) opts.push({ label: 'Pick the lock (' + thief.pc.name + ', ' + thief.v + '%)', fn: function () {
      G.passTime(1);
      if (Rules.d(100) <= thief.v) { unlock(idx); UI.log(thief.pc.name + ' picks the lock.', 'good'); }
      else { UI.log(thief.pc.name + ' fails to pick the lock.', 'warn'); G.ms.pickFail = G.ms.pickFail || {}; }
      Watch.noise(1);
    } });
    if (brute.pc) opts.push({ label: 'Force it (' + brute.pc.name + ', ' + Math.round(brute.v / 20 * 100) + '%)', fn: function () {
      G.passTime(1);
      if (Rules.d(20) <= brute.v) { unlock(idx); G.cells[idx] = C.OPEN; G.ms.open[idx] = 1; UI.log(brute.pc.name + ' smashes the door open!', 'good'); G.redraw(); }
      else UI.log(brute.pc.name + ' throws a shoulder against the door, but it holds.', 'warn');
      Watch.noise(3);
    } });
    var caster = castersOf('knock')[0];
    if (caster) opts.push({ label: 'Cast Knock (' + caster.name + ')', fn: function () { useSpellSlot(caster, 'knock'); unlock(idx); UI.log(caster.name + ' casts Knock. The lock clicks open.', 'good'); } });
    opts.push({ label: 'Leave it', fn: function () { } });
    UI.choice('A Locked Door', 'The door is locked.', opts);
  }
  function unlock(idx) { G.cells[idx] = C.DOOR; G.ms.unlocked[idx] = 1; G.redraw(); MapView.mini(); }
  G.unlockAhead = function () {
    var d = G.pos.dir, nx = G.pos.x + DX[d], ny = G.pos.y + DY[d];
    if (nx < 0 || ny < 0 || nx >= G.map.w || ny >= G.map.h) return false;
    var idx = ny * G.map.w + nx;
    if (G.cells[idx] === C.LOCKED && !(G.map.feat[idx] && G.map.feat[idx].keyItem)) { unlock(idx); return true; }
    return false;
  };

  /* ---------- traps ---------- */
  function knownTrap(idx, d, nx, ny) {
    var f = G.map.feat[idx], tr = Rules.TRAPS[f.trap];
    var thief = G.best(function (pc) { var dd = Data.derive(pc); return dd.thief ? dd.thief.rt : -1; });
    var opts = [];
    if (thief.pc && thief.v > 0) opts.push({ label: 'Disarm it (' + thief.pc.name + ', ' + thief.v + '%)', fn: function () { G.disarm(idx, thief.pc, thief.v); } });
    opts.push({ label: 'Step carefully past', fn: function () {
      var lead = G.ableParty()[0];
      var chance = 60 + (lead ? Rules.dexTable(lead.ab.dex).react * 10 : 0);
      if (Rules.d(100) <= chance) { UI.log('The party edges carefully around the ' + tr.name + '.', 'dim'); G._safeTrap = idx; stepTo(nx, ny, d); }
      else { UI.log('Someone misjudges a step!', 'bad'); stepTo(nx, ny, d); }
    } });
    opts.push({ label: 'Stay back', fn: function () { } });
    UI.choice('A Known Trap', 'There is a ' + tr.name + ' on the square ahead.', opts);
  }
  G.disarm = function (idx, pc, chance) {
    var f = G.map.feat[idx], tr = Rules.TRAPS[f.trap];
    G.passTime(5);
    var r = Rules.d(100);
    if (r <= chance) {
      G.ms.traps[idx] = 'gone';
      var xp = 25 * (G.map.dl || 1);
      Rules.addXp(pc, xp);
      UI.log(pc.name + ' disarms the ' + tr.name + '. (+' + xp + ' XP)', 'good');
      G.redraw();
    } else if (r >= 96 || r > chance + 40) {
      UI.log(pc.name + ' fumbles — the trap goes off!', 'bad');
      springTrap(idx, f, function () { }, pc);
    } else UI.log(pc.name + ' cannot work out the mechanism this time.', 'warn');
  };
  function springTrap(idx, f, next, victim) {
    var tr = Rules.TRAPS[f.trap], dl = G.map.dl || 1, ms = G.ms;
    var dmgSpec = Rules.trapDamageSpec(f.trap, dl);
    var targets = tr.party ? G.living().filter(function (p) { return p.hp > -10; }) : [victim || G.ableParty()[0] || G.living()[0]];
    var lines = [tr.text];
    View3D.flash(f.trap === 'fire' ? 'rgba(255,120,0,0.5)' : f.trap === 'gas' ? 'rgba(60,200,60,0.4)' : 'rgba(255,0,0,0.35)');
    targets.forEach(function (pc) {
      if (!pc) return;
      var dmg = Rules.roll(dmgSpec), d = Data.derive(pc);
      var save = d.saves[Rules.SAVE_IDX[tr.save]];
      var saved = Rules.d(20) >= save;
      if (saved) dmg = Math.floor(dmg / 2);
      if (f.trap === 'fire' && d.resist.indexOf('fire') >= 0) dmg = Math.floor(dmg / 2);
      if (f.trap === 'gas' && d.immune.poison) dmg = 0;
      G.damagePc(pc, dmg);
      lines.push(pc.name + (saved ? ' partly avoids it and' : '') + ' takes ' + dmg + ' damage.' + (pc.hp <= 0 ? ' ' + pc.name + ' falls!' : ''));
    });
    // single-target traps are spent; party traps reset once triggered too
    ms.traps[idx] = 'gone';
    lines.forEach(function (l, i) { UI.log(l, i ? 'bad' : 'warn'); });
    UI.updateAll();
    G.checkPartyDead();
    UI.alert('Trap!', lines.join('\n'), next);
  }
  G.damagePc = function (pc, dmg) {
    pc.hp -= dmg;
    if (pc.hp <= -10) { pc.hp = -10; pc.status.dead = true; UI.log(pc.name + ' is dead!', 'bad'); G.note(pc.name + ' died.'); }
  };
  G.checkPartyDead = function () {
    if (!G.party().some(function (p) { return G.alive(p) && p.hp > 0; })) { UI.gameOver(); return true; }
    return false;
  };

  /* ---------- search, listen, sneak ---------- */
  G.search = function () {
    if (G.mode === 'wild') { UI.log('You search the area but find nothing of note.', 'dim'); G.passTime(30); return; }
    if (G.busy()) return;
    G.passTime(10);
    var map = G.map, w = map.w, found = 0;
    var finders = G.ableParty().map(function (pc) {
      var d = Data.derive(pc), base = Rules.RACES[pc.race].search + d.search;
      var tChance = d.thief ? d.thief.rt / 100 : 0;
      return { pc: pc, secret: Math.max(base, pc.cls === 'thief' ? Math.max(1 / 3, tChance) : 0), trap: Math.max(pc.cls === 'thief' ? tChance : 0, pc.race === 'dwarf' ? 1 / 3 : 1 / 6) + d.search };
    });
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var x = G.pos.x + dx, y = G.pos.y + dy;
      if (x < 0 || y < 0 || x >= w || y >= map.h) continue;
      var idx = y * w + x;
      if (G.cells[idx] === C.SECRET && (dx === 0 || dy === 0)) {
        var who = finders.filter(function (f) { return Math.random() < f.secret; })[0];
        if (who) { G.cells[idx] = C.DOOR; G.ms.found[idx] = 1; found++; UI.log(who.pc.name + ' finds a secret door!', 'good'); G.seenArr(G.ms, w, map.h)[idx] = 1; }
      }
      var f = map.feat[idx];
      if (f && f.t === 'trap' && !G.ms.traps[idx]) {
        var tw = finders.filter(function (fi) { return Math.random() < fi.trap; })[0];
        if (tw) { G.ms.traps[idx] = 'found'; found++; UI.log(tw.pc.name + ' spots a ' + Rules.TRAPS[f.trap].name + '!', 'warn'); }
      }
    }
    if (!found) UI.log('You search the area carefully but find nothing.', 'dim');
    UI.updateStatus(); G.redraw();
    Watch.afterStep(true);
  };
  G.listen = function () {
    if (G.mode !== 'explore' || G.busy()) { if (G.mode === 'wild') UI.log('Only the wind answers.', 'dim'); return; }
    var d = G.pos.dir, nx = G.pos.x + DX[d], ny = G.pos.y + DY[d], map = G.map;
    if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return;
    var c = G.cells[ny * map.w + nx];
    G.passTime(1);
    if (c !== C.DOOR && c !== C.LOCKED) { UI.log('You need to face a door to listen at it.', 'dim'); return; }
    var best = G.best(function (pc) { var dd = Data.derive(pc); return Math.max(dd.thief ? dd.thief.hn : 0, Rules.RACES[pc.race].listen); });
    var bx = nx + DX[d], by = ny + DY[d];
    var near = G.mons.filter(function (m) { return Math.abs(m.st.x - bx) + Math.abs(m.st.y - by) <= 5 && !Watch.sameSide(m.st.x, m.st.y); });
    if (near.length && Rules.d(100) <= best.v) {
      var m = Monsters.byId[near[0].f.g[0][0]];
      UI.log(best.pc.name + ' presses an ear to the door and hears ' + Watch.noiseOf(m) + ' beyond.', 'warn');
    } else UI.log(best.pc ? best.pc.name + ' listens at the door but hears nothing.' : 'You hear nothing.', 'dim');
  };
  G.toggleSneak = function () {
    G.S.sneak = !G.S.sneak;
    var thief = G.best(function (pc) { var dd = Data.derive(pc); return dd.thief ? dd.thief.ms : 0; });
    UI.log(G.S.sneak ? 'The party moves stealthily' + (thief.v > 0 ? ', following ' + thief.pc.name + '\'s lead.' : ' — though without a thief, not very quietly.') : 'The party stops creeping.', 'info');
    UI.updateCmdbar(); UI.updateStatus();
  };

  /* ---------- stairs and exits ---------- */
  G.useStairs = function (up) {
    var tgt = up ? G.map.up : G.map.down;
    if (!tgt) return;
    if (tgt === 'wild') { G.exitToWild(); return; }
    var tm = Modules.map(G.S.adv, tgt);
    var p = up ? tm.downAt : tm.upAt;
    if (!p) p = tm.exits[0] || { x: 1, y: 1 };
    G.enterMap(tgt, p.x, p.y, G.pos.dir);
    G.autosave();
  };
  G.exitToWild = function () {
    var cur = G.map.id, sites = G.adv.wild.sites;
    var site = sites.filter(function (s) { return s.map === cur; })[0] || sites.filter(function (s) { return s.kind === 'town'; })[0];
    G.enterWild(site.x, site.y);
    UI.log('You emerge into ' + G.adv.wild.name + '.', 'info');
    G.autosave();
  };

  /* ---------- combat hand-off ---------- */
  G.engage = function (m, surprise) {
    if (surprise === 'party' && !G.S.sneak && Math.random() < 0.5) surprise = null;
    if (m.f.talk && !m.st.talked) {
      m.st.talked = true;
      UI.choice(m.f.name ? cap(m.f.name) : 'Encounter', m.f.talk, [
        { label: 'Fight!', fn: function () { begin(); } },
        { label: 'Back away', fn: function () { if (m.f.boss || m.st.noticed || Math.random() < 0.5) { UI.log('There is no escape — they attack!', 'bad'); begin(); } else UI.log('You back away carefully.', 'dim'); } }
      ]);
      return;
    }
    begin();
    function begin() {
      var groups = [{ entries: m.f.g, name: m.f.name, mon: m }];
      G.fight(groups, surprise, function () { });
    }
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // groups: [{entries:[[id,n,opts]], name, mon (dungeon group ref) }]
  G.fight = function (groups, surprise, after) {
    var where = G.mode === 'wild' ? 'wild' : (G.map && G.map.type === 'town' ? 'town' : 'dungeon');
    groups.forEach(function (g) { g.entries.forEach(function (e) { Bestiary.see(e[0]); }); });
    var prevMode = G.mode;
    G.mode = 'combat';
    Combat.start({
      groups: groups, where: where, surprise: surprise,
      map: where === 'wild' ? null : G.map, cells: G.cells, px: G.pos.x, py: G.pos.y, dir: G.pos.dir,
      terrain: where === 'wild' ? Overland.terrainHere() : null,
      onEnd: function (res) { G.afterCombat(res, groups, prevMode, after); }
    });
  };
  G.afterCombat = function (res, groups, prevMode, after) {
    G.mode = prevMode === 'wild' ? 'wild' : 'explore';
    UI.show('game');
    // anyone who fell is stabilised once the fighting stops
    G.party().forEach(function (pc) { if (!pc.status.dead && pc.hp < 0) pc.hp = 0; });
    if (res.outcome === 'defeat') { UI.gameOver(); return; }
    if (G.mode === 'wild') { document.getElementById('view').style.display = 'none'; document.getElementById('wildview').style.display = 'block'; }
    if (res.outcome === 'fled') {
      UI.log('The party flees!', 'warn');
      if (G.mode === 'explore') {
        var bd = (G.pos.dir + 2) % 4, bx = G.pos.x + DX[bd], by = G.pos.y + DY[bd];
        if (bx >= 0 && by >= 0 && bx < G.map.w && by < G.map.h && Modules.isWalkable(G.cells[by * G.map.w + bx]) && !G.monAt(bx, by)) { G.pos.x = bx; G.pos.y = by; G.S.loc.x = bx; G.S.loc.y = by; }
        groups.forEach(function (g) { if (g.mon) { g.mon.st.noticed = false; g.mon.st.cool = 3; } });
      } else Overland.afterFlee();
      UI.updateAll(); G.redraw(); after && after('fled');
      return;
    }
    // victory
    var gp = 0, items = [];
    groups.forEach(function (g, gi) {
      var m = g.mon, f = m ? m.f : g;
      var seed = G.S.adv + ':' + (G.map ? G.map.id : 'wild') + ':' + (m ? m.key : 'w' + G.S.time) + ':' + gi;
      var trng = Modules.rng(seed);
      // individual treasure for each slain creature, lair treasure for groups that guard a hoard
      g.entries.forEach(function (e) {
        var mon = Monsters.byId[e[0]]; if (!mon || !mon.tt) return;
        var indiv = mon.tt.split(',').filter(function (L) { return Treasure.TYPES[L.trim()] && Treasure.TYPES[L.trim()].indiv; }).join(',');
        if (indiv) { var r = Treasure.roll(indiv, trng, G.adv.band, e[1]); gp += r.gp; items = items.concat(r.items); }
      });
      var lairTT = f.tt != null ? f.tt : (g.lairTT || '');
      if (lairTT) { var lr = Treasure.roll(lairTT, trng, G.adv.band, 1, { lairOnly: true }); gp += lr.gp; items = items.concat(lr.items); }
      if (f.gp) gp += f.gp;
      (f.items || []).forEach(function (id) { items.push(typeof id === 'string' ? Data.makeItem(id) : id); });
      if (m) { m.st.dead = true; G.mons = G.mons.filter(function (x) { return x !== m; }); }
      if (f.flag) G.setFlag(f.flag);
      if (f.boss || f.flag) G.note('Defeated ' + (f.name || Watch.groupName(m || g)) + '.');
    });
    var drops = res.drops || [];
    items = items.concat(drops);
    var finish = function () { UI.updateAll(); G.redraw(); G.autosave(); if (after) after('victory'); };
    var gpShown = gp;
    if (gpShown || items.length) {
      UI.loot('Spoils of Battle', gpShown, items, function (left) {
        if (left.length) { if (G.mode === 'explore') G.dropHere(left); else UI.log('You leave ' + left.length + ' item(s) behind.', 'dim'); }
        afterLoot();
      });
    } else afterLoot();
    function afterLoot() {
      if (G.mode === 'explore') G.squareEffects(finish); else finish();
    }
  };
  // split experience among survivors
  G.giveXp = function (total, quiet) {
    var surv = G.living();
    if (!surv.length) return;
    var each = Math.floor(total / surv.length);
    surv.forEach(function (pc) { Rules.addXp(pc, each); });
    if (!quiet) UI.log('Each survivor receives ' + each + ' experience.', 'good');
    else UI.log('The party gains ' + total + ' experience (' + each + ' each).', 'good');
    G.checkTraining();
  };
  G.checkTraining = function () {
    G.party().forEach(function (pc) { if (Rules.canTrain(pc) && !pc._trainNoted) { pc._trainNoted = true; UI.log(pc.name + ' has enough experience to train for level ' + (pc.lvl + 1) + '.', 'warn'); } });
  };

  /* ---------- spells outside combat ---------- */
  function castersOf(spellId) {
    return G.ableParty().filter(function (pc) { return (pc.mem || []).some(function (m) { return m.id === spellId && !m.used; }); });
  }
  G.castersOf = castersOf;
  function useSpellSlot(pc, spellId) {
    var m = pc.mem.filter(function (x) { return x.id === spellId && !x.used; })[0];
    if (m) m.used = true;
  }
  G.useSpellSlot = useSpellSlot;
  G.autoMemorize = function (pc) {
    var ct = Rules.casterType(pc.cls);
    if (!ct) { pc.mem = []; return; }
    var d = Data.derive(pc), slots = d.slots, out = [];
    var prev = (pc.memPlan || []).slice();
    for (var lvl = 1; lvl <= slots.length; lvl++) {
      var n = slots[lvl - 1];
      var known = ct === 'wiz' ? pc.book.filter(function (id) { return Rules.SPELLS[id] && Rules.SPELLS[id].lvl === lvl; }) : Rules.spellsOf('pri', lvl).map(function (s) { return s.id; });
      if (!known.length) continue;
      var planned = prev.filter(function (id) { return known.indexOf(id) >= 0 && Rules.SPELLS[id].lvl === lvl; });
      var prefs = defaultPrefs(pc, lvl, known);
      for (var i = 0; i < n; i++) {
        var id = planned.length ? planned.shift() : prefs[i % prefs.length];
        out.push({ id: id, used: false });
      }
    }
    pc.mem = out;
    pc.memPlan = out.map(function (m) { return m.id; });
  };
  var PRIORITY = {
    wiz: ['magic_missile', 'sleep', 'shield', 'spark_bolt', 'stinking_cloud', 'web', 'mirror_image', 'fireball', 'lightning_bolt', 'haste', 'hold_person', 'ice_storm', 'stoneskin', 'confusion', 'cone_of_cold', 'cloudkill', 'hold_monster', 'chain_lightning', 'disintegrate', 'death_spell', 'delayed_fireball', 'pw_stun', 'finger_death', 'incendiary_cloud', 'withering', 'meteor_swarm', 'pw_kill', 'time_stop'],
    pri: ['cure_light', 'bless', 'cure_light', 'prot_evil', 'hold_person_p', 'spiritual_hammer', 'aid', 'chant', 'prayer', 'remove_paralysis', 'dispel_magic_p', 'cure_serious', 'neutralize_poison', 'free_action', 'cure_critical', 'flame_strike', 'raise_dead', 'heal', 'blade_barrier', 'harm', 'restoration', 'holy_word', 'fire_storm']
  };
  function defaultPrefs(pc, lvl, known) {
    var ct = Rules.casterType(pc.cls), pr = PRIORITY[ct].filter(function (id) { return known.indexOf(id) >= 0; });
    if (ct === 'pri' && lvl === 1) pr = ['cure_light', 'cure_light', 'bless', 'cure_light', 'prot_evil'].filter(function (id) { return known.indexOf(id) >= 0; });
    if (ct === 'pri' && lvl === 4) pr = ['cure_serious', 'cure_serious', 'neutralize_poison', 'free_action'];
    if (ct === 'pri' && lvl === 5) pr = ['cure_critical', 'flame_strike', 'cure_critical', 'raise_dead'];
    var rest = known.filter(function (id) { return pr.indexOf(id) < 0; });
    return pr.concat(rest).length ? pr.concat(rest) : known;
  };
  // recover all spells (after a full rest)
  G.rememorize = function (pc) {
    if (!Rules.casterType(pc.cls)) return;
    var slots = Data.derive(pc).slots, total = slots.reduce(function (a, b) { return a + b; }, 0);
    if (!pc.mem || pc.mem.length !== total) G.autoMemorize(pc);
    else pc.mem.forEach(function (m) { m.used = false; });
  };

  /* ---------- camping ---------- */
  G.canCamp = function () {
    if (G.mode === 'wild') return true;
    if (G.mode !== 'explore' || !G.map) return false;
    if (G.map.type === 'town') return false;
    return true;
  };
  // rest for a number of hours; returns true if interrupted
  G.rest = function (hours, safe, onDone) {
    var interrupted = null;
    for (var h = 0; h < hours; h++) {
      G.passTime(60);
      if (!safe && Math.random() < (G.mode === 'wild' ? 0.05 : 0.04)) { interrupted = h + 1; break; }
    }
    G.S.fatigue = 0;
    if (interrupted !== null && interrupted < 8) {
      UI.log('Your rest is interrupted after ' + interrupted + ' hour(s)!', 'bad');
      var grp = G.wanderGroup();
      if (grp) { G.fight([{ entries: grp, name: 'wanderers' }], 'monsters', function () { if (onDone) onDone(true); }); return true; }
    }
    // a full night's rest heals naturally and restores spells
    G.party().forEach(function (pc) {
      if (!G.alive(pc)) return;
      if (pc.hp < 1 && !pc.status.poisoned) pc.hp = Math.max(pc.hp, 1);
      if (pc.hp > 0 && !pc.status.poisoned && !pc.status.diseased) pc.hp = Math.min(pc.hpMax, pc.hp + Math.max(1, Math.ceil(pc.lvl / 2)) + (Data.derive(pc).regen ? 8 : 0));
      if (pc.hp > 0) G.rememorize(pc);
      if (pc.status.paralyzed) delete pc.status.paralyzed;
    });
    if (onDone) onDone(false);
    return false;
  };
  G.wanderGroup = function () {
    if (G.mode === 'wild') return Overland.randomGroup();
    var list = G.adv.wander || [];
    if (!list.length) return null;
    var w = list[Math.floor(Math.random() * list.length)];
    return (w.g || w).map(function (e) { return [e[0], Math.max(1, e[1] - 1 + Math.floor(Math.random() * 3))]; });
  };
  // healers spend their curing spells on the wounded
  G.castHealing = function () {
    var log = [];
    var healers = G.ableParty().filter(function (pc) { return Rules.casterType(pc.cls) === 'pri'; });
    var order = ['heal', 'cure_critical', 'cure_serious', 'cure_light'];
    var changed = true, guard = 0;
    while (changed && guard++ < 200) {
      changed = false;
      var wounded = G.living().filter(function (p) { return p.hp < p.hpMax && !p.status.dead; }).sort(function (a, b) { return a.hp / a.hpMax - b.hp / b.hpMax; });
      if (!wounded.length) break;
      var t = wounded[0];
      for (var hi = 0; hi < healers.length && !changed; hi++) {
        var h = healers[hi];
        for (var oi = 0; oi < order.length && !changed; oi++) {
          var sid = order[oi];
          var slot = h.mem.filter(function (m) { return m.id === sid && !m.used; })[0];
          if (!slot) continue;
          var sp = Rules.SPELLS[sid];
          var amt = sp.heal === 'full' ? t.hpMax - t.hp - Rules.d(4) : Rules.roll(sp.heal);
          // don't waste a big heal on a scratch
          if (sid !== 'cure_light' && t.hpMax - t.hp < Rules.avg(sp.heal === 'full' ? '20' : sp.heal) * 0.6 && h.mem.some(function (m) { return m.id === 'cure_light' && !m.used; })) continue;
          slot.used = true;
          var before = t.hp;
          t.hp = Math.min(t.hpMax, Math.max(t.hp, 0) + Math.max(1, amt));
          log.push(h.name + ' casts ' + sp.name + ' on ' + t.name + ' (+' + (t.hp - before) + ').');
          changed = true;
        }
      }
    }
    // cure afflictions too
    healers.forEach(function (h) {
      G.living().forEach(function (t) {
        [['poisoned', ['neutralize_poison', 'slow_poison']], ['diseased', ['cure_disease']], ['blind', ['cure_blindness']], ['paralyzed', ['remove_paralysis']]].forEach(function (pair) {
          if (!t.status[pair[0]]) return;
          pair[1].some(function (sid) {
            var slot = h.mem.filter(function (m) { return m.id === sid && !m.used; })[0];
            if (!slot) return false;
            slot.used = true; delete t.status[pair[0]]; if (pair[0] === 'poisoned' && t.hp < 1) t.hp = 1;
            log.push(h.name + ' casts ' + Rules.SPELLS[sid].name + ' on ' + t.name + '.');
            return true;
          });
        });
      });
    });
    return log;
  };
  G.restUntilHealed = function (safe, onDone) {
    var days = 0, logs = [];
    var step = function () {
      logs = logs.concat(G.castHealing());
      var need = G.living().some(function (p) { return p.hp < p.hpMax || p.status.poisoned || p.status.diseased; });
      if (!need || days >= 14) { onDone(logs, days, false); return; }
      days++;
      var interrupted = G.rest(8, safe, function (intr) { if (intr) onDone(logs, days, true); });
      if (interrupted) return;
      G.passTime(4 * 60);
      step();
    };
    step();
  };

  /* ---------- party money and items ---------- */
  G.giveItem = function (inst) {
    // to the first living member with carrying capacity, else first living
    var lv = G.living();
    var who = lv.filter(function (p) { var d = Data.derive(p); return d.weight + Data.weight(inst) <= d.carry; })[0] || lv[0];
    if (!who) return null;
    G.addToInv(who, inst);
    return who;
  };
  G.addToInv = function (pc, inst) {
    var it = Data.items[inst.id];
    if (it && it.stack) {
      var ex = pc.inv.filter(function (i) { return i.id === inst.id && !i.n; })[0];
      if (ex) { ex.q = (ex.q || 0) + (inst.q || 1); return; }
    }
    pc.inv.push(inst);
  };
  G.questItemHolder = function (id) {
    for (var i = 0; i < G.S.party.length; i++) { var pc = G.S.party[i]; for (var j = 0; j < pc.inv.length; j++) if (pc.inv[j].id === id) return { pc: pc, idx: j }; }
    return null;
  };

  /* ---------- keyboard ---------- */
  var KEYS = {
    ArrowUp: 'fwd', w: 'fwd', W: 'fwd', ArrowDown: 'back', s: 'back', S: 'back', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    q: 'sl', Q: 'sl', e: 'sr', E: 'sr'
  };
  function onKey(ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
    if (UI.hasModal()) { UI.modalKey(ev); return; }
    if (G.mode === 'combat') { Combat.key(ev); return; }
    if (G.mode === 'title' || !G.S) return;
    var k = ev.key;
    if (KEYS[k]) { ev.preventDefault(); G.input(KEYS[k]); return; }
    var lk = k.toLowerCase();
    if (k === 'Escape') { ev.preventDefault(); UI.menu(); return; }
    if (lk === 'f') { G.search(); return; }
    if (lk === 'r') { UI.camp(); return; }
    if (lk === 'm') { MapView.open(); return; }
    if (lk === 'j') { Journal.open(); return; }
    if (lk === 'b') { Bestiary.open(); return; }
    if (lk === 'l') { G.listen(); return; }
    if (lk === 'c') { UI.castMenu(); return; }
    if (lk === 'x') { G.toggleSneak(); return; }
    if (lk === 'h') { UI.howToPlay(); return; }
    if (lk === 'p') { Campaign.open(false); return; }
    if (k === 'Enter' && G.mode === 'wild') { Overland.enterSite(); return; }
    if (k >= '1' && k <= '6') { var i = +k - 1; if (G.party()[i]) UI.sheet(i); return; }
  }

  /* ---------- boot ---------- */
  G.boot = function () {
    try {
      Figures.init();
    } catch (e) { console.error(e); }
    View3D.init(document.getElementById('view'));
    UI.init();
    NavPad.init();
    Overland.init(document.getElementById('wildview'));
    Combat.init(document.getElementById('ccanvas'));
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { UI.layout(); G.redraw(); if (G.mode === 'combat') Combat.resize(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { UI.layout(); G.redraw(); }, 300); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && G.S && G.mode !== 'combat' && G.mode !== 'title') G.autosave(); });
    UI.title();
  };
  if (typeof window !== 'undefined') window.addEventListener('load', function () { G.boot(); });
  return G;
})();
