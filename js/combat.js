/* Emberfall — combat.js
 * Turn-based tactical combat on an isometric field: initiative, movement with
 * free attacks, melee and missile attacks, backstab, spells with real ranges
 * and areas, lingering clouds, turning undead, morale and fleeing, monster
 * special attacks, auto-fight and experience shared among survivors. */
var Combat = (function () {
  'use strict';
  var K = {};
  var cv, ctx, dpr = 1;
  var GW = 16, GH = 16;
  var S = null;
  K.state = function () { return S; };
  K._cast = function (u, sp, x, y) { castSpell(u, sp, x, y); }; // test hook
  function $(id) { return document.getElementById(id); }
  function d20() { return Rules.d(20); }
  function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var DIRS8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  /* ---------- setup ---------- */
  K.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    var down = null;
    cv.addEventListener('pointerdown', function (ev) { down = { x: ev.clientX, y: ev.clientY, moved: false, px: S && S.pan ? S.pan.x : 0, py: S && S.pan ? S.pan.y : 0 }; try { cv.setPointerCapture(ev.pointerId); } catch (e) { } });
    cv.addEventListener('pointermove', function (ev) {
      if (down && S) {
        var dx = ev.clientX - down.x, dy = ev.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 10) down.moved = true;
        if (down.moved && S.zoomed) { S.pan = { x: down.px + dx * dpr, y: down.py + dy * dpr }; draw(); return; }
      }
      onHover(ev);
    });
    cv.addEventListener('pointerup', function (ev) { var d = down; down = null; if (d && !d.moved) onPointer(ev); });
    cv.addEventListener('pointercancel', function () { down = null; });
  };
  K.resize = function () {
    if (!cv) return;
    var r = cv.parentNode.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(100, Math.floor(r.width * dpr)); cv.height = Math.max(100, Math.floor(r.height * dpr));
    draw();
  };

  // opts: { groups, where, surprise, map, cells, px, py, dir, terrain, onEnd }
  K.start = function (opts) {
    S = {
      opts: opts, round: 0, units: [], order: [], turn: -1, active: null, log: [], clouds: [], floats: [],
      blocked: new Uint8Array(GW * GH), theme: 'dungeon', ui: { mode: 'wait', sel: null, spell: null, hover: null },
      xp: 0, autoAll: false, over: false, turnedUsed: {}, drops: []
    };
    buildField(opts);
    var party = Game.party();
    party.forEach(function (pc, i) {
      if (!Game.alive(pc) || pc.hp <= 0) return;
      var d = Data.derive(pc);
      pc.weaponKind = d.missile ? 'bow' : 'melee';
      var u = { id: 'p' + i, side: 'pc', pc: pc, name: pc.name, size: 'M', sprite: Figures.pcFigure(pc).canvas, cond: {}, buffs: {}, alive: true, gone: false, mirror: 0, skin: 0, facing: [0, -1], undead: null, evil: false, auto: false, idx: i };
      if (pc.status.paralyzed) u.cond.held = 99;
      if (pc.status.blind) u.cond.blind = 99;
      if (d.fx.haste) u.buffs.boots = { rounds: 999, haste: true };
      if (d.fx.shifting) u.buffs.shift = { rounds: 999, shifting: true };
      S.units.push(u);
    });
    opts.groups.forEach(function (g, gi) {
      g.entries.forEach(function (e) {
        var def = Monsters.byId[e[0]];
        if (!def) return;
        var o = e[2] || {};
        for (var n = 0; n < e[1]; n++) {
          var hp = 0;
          for (var h = 0; h < Math.max(1, Math.floor(def.hd)); h++) hp += Rules.d(8);
          if (def.hd < 1) hp = Math.max(1, Math.round(Rules.d(8) * def.hd));
          hp = Math.max(1, Math.round((hp + def.hpPlus) * (o.hpMul || 1)));
          var u = {
            id: 'm' + S.units.length, side: 'mon', def: def, name: o.name || def.name, size: def.size, sprite: Figures.monsterSprite(def.id).canvas,
            hp: hp, hpMax: hp, cond: {}, buffs: {}, alive: true, gone: false, group: gi, leader: !!o.name || def.leader, boss: !!o.name,
            mirror: 0, skin: 0, facing: [0, 1], undead: def.undead != null ? def.undead : null, evil: def.evil, breathLeft: def.breath ? 3 : 0,
            spellsLeft: (def.spells || []).slice(), xp: Math.round(def.xp * (o.hpMul ? 1.5 : 1)), hd: def.hd, mr: def.mr || 0
          };
          if (def.spells && def.spells.length) u.spellsLeft = def.spells.concat(def.spells.length < 3 ? def.spells : []);
          S.units.push(u);
          Bestiary.fought(def.id);
        }
      });
    });
    S.groupSize = {};
    S.units.forEach(function (u) { if (u.side === 'mon') S.groupSize[u.group] = (S.groupSize[u.group] || 0) + 1; });
    S.moraleChecked = {};
    placeUnits(opts);
    UI.show('combat');
    $('clog').innerHTML = '';
    K.resize();
    var names = opts.groups.map(function (g) { return Watch.groupName({ f: { g: g.entries, name: g.name } }); }).join(' and ');
    log('Battle! ' + cap(names) + '.', 'info');
    if (opts.surprise === 'party') log('The party has surprised them!', 'good');
    if (opts.surprise === 'monsters') log('The party is caught by surprise!', 'bad');
    setTimeout(startRound, 300);
  };

  function buildField(opts) {
    var b = S.blocked;
    S.decor = new Uint8Array(GW * GH);
    if (opts.where === 'wild') {
      S.theme = 'wild';
      var t = opts.terrain || '.';
      S.terrain = t;
      var dens = t === 'f' ? 0.14 : t === 'h' ? 0.08 : t === '^' ? 0.12 : t === 'w' ? 0.08 : 0.04;
      for (var i = 0; i < GW * GH; i++) {
        var x = i % GW, y = (i / GW) | 0;
        if (y >= 11 || y <= 3) continue;
        if (Math.random() < dens) { b[i] = 1; S.decor[i] = t === 'f' ? 1 : t === 'w' ? 3 : 2; }
      }
      return;
    }
    S.theme = opts.map.theme || 'stone';
    // copy the dungeon around the party: each map square becomes 2x2 battle squares
    var cells = opts.cells, map = opts.map, ox = opts.px - 4, oy = opts.py - 4;
    S.origin = { x: ox, y: oy };
    for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
      var mx = ox + (gx >> 1), my = oy + (gy >> 1), solid = true;
      if (mx >= 0 && my >= 0 && mx < map.w && my < map.h) {
        var c = cells[my * map.w + mx];
        solid = !(Modules.isWalkable(c) || c === Modules.C.OPEN);
        if (c === Modules.C.TREE) { solid = true; S.decor[gy * GW + gx] = 1; }
      }
      b[gy * GW + gx] = solid ? 1 : 0;
    }
  }
  function free(x, y) {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return false;
    if (S.blocked[y * GW + x]) return false;
    return !unitAt(x, y);
  }
  function unitAt(x, y) { for (var i = 0; i < S.units.length; i++) { var u = S.units[i]; if (u.x === x && u.y === y && !u.gone && (u.alive || (u.pc && !u.pc.status.dead))) return u; } return null; }
  function bfsFrom(sx, sy) {
    var dist = new Int16Array(GW * GH).fill(-1), q = [[sx, sy]];
    if (sx < 0 || sy < 0 || sx >= GW || sy >= GH) return dist;
    dist[sy * GW + sx] = 0;
    while (q.length) {
      var p = q.shift();
      for (var d = 0; d < 8; d++) {
        var nx = p[0] + DIRS8[d][0], ny = p[1] + DIRS8[d][1];
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        var n = ny * GW + nx;
        if (dist[n] >= 0 || S.blocked[n]) continue;
        dist[n] = dist[p[1] * GW + p[0]] + 1; q.push([nx, ny]);
      }
    }
    return dist;
  }
  function placeUnits(opts) {
    var pcs = S.units.filter(function (u) { return u.side === 'pc'; }), mons = S.units.filter(function (u) { return u.side === 'mon'; });
    var pAnchor, mAnchor;
    if (opts.where === 'wild') { pAnchor = [GW >> 1, GH - 3]; mAnchor = [GW >> 1, 2]; }
    else {
      pAnchor = [8, 8];
      var dir = opts.dir, g = opts.groups[0] && opts.groups[0].mon;
      if (g) mAnchor = [(g.st.x - S.origin.x) * 2, (g.st.y - S.origin.y) * 2];
      else mAnchor = [8 + Modules.DX[dir] * 6, 8 + Modules.DY[dir] * 6];
      mAnchor[0] = Math.max(0, Math.min(GW - 1, mAnchor[0])); mAnchor[1] = Math.max(0, Math.min(GH - 1, mAnchor[1]));
      if (Math.abs(mAnchor[0] - 8) + Math.abs(mAnchor[1] - 8) < 3) { mAnchor[0] = 8 + Modules.DX[dir] * 4; mAnchor[1] = 8 + Modules.DY[dir] * 4; }
    }
    var reach = bfsFrom(pAnchor[0], pAnchor[1]);
    var fillNear = function (list, ax, ay, avoid) {
      var cands = [];
      for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
        if (S.blocked[y * GW + x] || reach[y * GW + x] < 0) continue;
        var d = Math.max(Math.abs(x - ax), Math.abs(y - ay));
        var pen = avoid ? Math.max(0, 3 - Math.max(Math.abs(x - avoid[0]), Math.abs(y - avoid[1]))) * 5 : 0;
        cands.push([d + pen + Math.random() * 0.5, x, y]);
      }
      cands.sort(function (a, b) { return a[0] - b[0]; });
      var ci = 0;
      list.forEach(function (u) {
        while (ci < cands.length && unitAt(cands[ci][1], cands[ci][2])) ci++;
        if (ci < cands.length) { u.x = cands[ci][1]; u.y = cands[ci][2]; ci++; }
        else { u.x = ax; u.y = ay; }
      });
    };
    // fighters to the front of the party
    pcs.sort(function (a, b) { return frontRank(a) - frontRank(b); });
    var front = [mAnchor[0] - pAnchor[0], mAnchor[1] - pAnchor[1]], fl = Math.max(1, Math.abs(front[0]) + Math.abs(front[1]));
    var pa = [pAnchor[0] + Math.round(front[0] / fl), pAnchor[1] + Math.round(front[1] / fl)];
    if (S.blocked[pa[1] * GW + pa[0]] || reach[pa[1] * GW + pa[0]] < 0) pa = pAnchor;
    fillNear(pcs, pa[0], pa[1]);
    if (reach[mAnchor[1] * GW + mAnchor[0]] < 0) {
      // the monsters' square is cut off: put them at the farthest reachable squares in front
      var best = null;
      for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) { var dd = reach[y * GW + x]; if (dd >= 0 && (x - pAnchor[0]) * front[0] + (y - pAnchor[1]) * front[1] >= 0 && (!best || dd > best[0])) best = [dd, x, y]; }
      if (best) mAnchor = [best[1], best[2]];
    }
    fillNear(mons, mAnchor[0], mAnchor[1], pa);
    S.units.forEach(function (u) { faceToward(u, u.side === 'pc' ? { x: mAnchor[0], y: mAnchor[1] } : { x: pa[0], y: pa[1] }); });
  }
  function frontRank(u) { var c = u.pc.cls; return c === 'fighter' || c === 'paladin' ? 0 : c === 'ranger' ? 1 : c === 'cleric' ? 2 : c === 'thief' ? 3 : 4; }
  function faceToward(u, t) { var dx = Math.sign(t.x - u.x), dy = Math.sign(t.y - u.y); if (dx || dy) u.facing = [dx, dy]; }

  /* ---------- unit stats ---------- */
  function hp(u) { return u.pc ? u.pc.hp : u.hp; }
  function hpMax(u) { return u.pc ? u.pc.hpMax : u.hpMax; }
  function D(u) { return u.pc ? Data.derive(u.pc, { strSet: buffVal(u, 'strSet', 'max') }) : null; }
  function buffVal(u, key, how) {
    var v = how === 'max' ? 0 : 0;
    Object.keys(u.buffs).forEach(function (k) { var b = u.buffs[k]; if (b[key] != null && b[key] !== true) { if (how === 'max') v = Math.max(v, b[key]); else v += b[key]; } });
    return v;
  }
  function hasBuff(u, key) { return Object.keys(u.buffs).some(function (k) { return u.buffs[k][key]; }); }
  function acOf(u, rear) {
    var ac;
    if (u.pc) { var d = D(u); ac = rear ? d.acRear : d.ac; var set = buffVal(u, 'acSet', 'max'); if (set && !d.armor) ac = Math.min(ac, set + (rear ? 0 : d.dex.ac)); }
    else ac = u.def.ac;
    ac += buffVal(u, 'ac');
    if (u.cond.blind) ac += 2;
    if (hasBuff(u, 'haste')) ac -= 0;
    return ac;
  }
  function savesOf(u) { return u.pc ? D(u).saves : Rules.monSaves(u.def.hd); }
  function thac0Of(u) { return u.pc ? D(u).thac0 : u.def.thac0; }
  function moveOf(u) {
    var m = u.pc ? D(u).cmove : Math.max(1, Math.round(u.def.mv / 2));
    if (hasBuff(u, 'haste')) m *= 2;
    if (u.cond.slow) m = Math.max(1, Math.floor(m / 2));
    if (u.cond.web) m = 0;
    return m;
  }
  function isEnemy(a, b) { return sideOf(a) !== sideOf(b); }
  function sideOf(u) { return u.charmed ? (u.side === 'pc' ? 'mon' : 'pc') : u.side; }
  function active(u) { return u.alive && !u.gone && hp(u) > 0; }
  function helpless(u) { return !!(u.cond.sleep || u.cond.held || u.cond.reel || (u.pc && u.pc.status.paralyzed) || hp(u) <= 0); }
  function canAct(u) { return active(u) && !helpless(u) && !u.cond.stun; }
  function hdOf(u) { return u.pc ? u.pc.lvl : u.def.hd; }
  function typeOf(u) { return u.pc ? 'humanoid' : u.def.type; }
  function immune(u, what) {
    if (u.pc) {
      var d = D(u);
      if (what === 'sleep' || what === 'charm') { if (d.immune[what]) return true; var r = Rules.RACES[u.pc.race].sleepRes; if (r && Rules.d(100) <= r) return true; }
      if (what === 'held' || what === 'web' || what === 'slow') return !!(d.immune.hold || hasBuff(u, 'free'));
      if (what === 'afraid') return !!(d.immune.fear || hasBuff(u, 'fearless'));
      if (what === 'poison') return !!d.immune.poison;
      if (what === 'drain') return !!(d.immune.drain || hasBuff(u, 'noDrain'));
      if (what === 'disease') return !!(d.immune.disease || u.pc.cls === 'paladin');
      return false;
    }
    var imm = u.def.imm || [];
    if (imm.indexOf(what) >= 0) return true;
    if ((what === 'sleep' || what === 'charm' || what === 'held' || what === 'afraid' || what === 'confused') && (imm.indexOf('mind') >= 0 || u.def.type === 'construct' || u.def.type === 'ooze' || u.def.type === 'plant')) return true;
    if ((what === 'sleep' || what === 'charm' || what === 'held') && u.undead != null) return true;
    if (what === 'poison' && (u.undead != null || u.def.type === 'construct')) return true;
    if (what === 'drain' && (u.undead != null || u.def.type === 'construct')) return true;
    if ((u.def.res || []).indexOf(what) >= 0 && Math.random() < 0.5) return true;
    return false;
  }

  /* ---------- logging and floating text ---------- */
  function log(text, cls) {
    var l = $('clog'); if (!l) return;
    var d = document.createElement('div'); d.className = 'm ' + (cls || ''); d.textContent = text;
    l.appendChild(d); while (l.childNodes.length > 80) l.removeChild(l.firstChild);
    l.scrollTop = l.scrollHeight;
  }
  K.log = log;
  function float(u, text, col) { S.floats.push({ x: u.x, y: u.y, text: String(text), col: col || '#fff', t0: performance.now() }); animate(); }
  var animating = false;
  function animate() {
    if (animating) return; animating = true;
    var step = function () {
      var now = performance.now();
      S && (S.floats = S.floats.filter(function (f) { return now - f.t0 < 1000; }));
      draw();
      if (S && S.floats.length) requestAnimationFrame(step); else animating = false;
    };
    requestAnimationFrame(step);
  }
  function delay(fn, ms) { setTimeout(function () { if (S && !S.over) fn(); }, (ms || 380) / ((Game.S && Game.S.opts.speed) || 1)); }

  /* ---------- rounds and turns ---------- */
  function startRound() {
    if (!S || S.over) return;
    S.round++;
    S.units.forEach(function (u) { u.aoo = false; u.turnsThisRound = 0; });
    var order = [];
    S.units.forEach(function (u) {
      if (!u.alive || u.gone) return;
      if (S.round === 1 && S.opts.surprise && ((S.opts.surprise === 'party' && u.side === 'mon') || (S.opts.surprise === 'monsters' && u.side === 'pc'))) return;
      if (u.cond.slow && S.round % 2 === 0) return;
      var init = Rules.d(10);
      if (u.pc) init -= Rules.dexTable(u.pc.ab.dex).react;
      if (u.def && u.def.size === 'S') init -= 1;
      if (u.def && (u.def.size === 'H' || u.def.size === 'G')) init += 1;
      order.push({ u: u, init: init });
      if (hasBuff(u, 'haste')) order.push({ u: u, init: init + 5 });
    });
    order.sort(function (a, b) { return a.init - b.init || (a.u.side === 'pc' ? -1 : 1); });
    S.order = order.map(function (o) { return o.u; });
    S.turn = -1;
    $('cbanner').textContent = 'Round ' + S.round;
    nextTurn();
  }
  function nextTurn() {
    if (!S || S.over) return;
    if (checkEnd()) return;
    S.turn++;
    if (S.turn >= S.order.length) { endRound(); return; }
    var u = S.order[S.turn];
    if (!u.alive || u.gone) return nextTurn();
    beginTurn(u);
  }
  function endRound() {
    // clouds age, conditions tick at round end
    S.clouds.forEach(function (c) { c.rounds--; });
    S.clouds = S.clouds.filter(function (c) { return c.rounds > 0; });
    S.units.forEach(function (u) {
      if (!u.alive) return;
      Object.keys(u.cond).forEach(function (k) {
        u.cond[k]--;
        if (u.cond[k] <= 0) { delete u.cond[k]; if (active(u)) log(u.name + ' is no longer ' + condName(k) + '.', 'info'); if (k === 'charmedTmp') u.charmed = false; }
      });
      Object.keys(u.buffs).forEach(function (k) { var b = u.buffs[k]; b.rounds--; if (b.rounds <= 0) delete u.buffs[k]; });
      // dying characters bleed
      if (u.pc && u.pc.hp < 0 && !u.pc.status.dead && !u.bandaged) { u.pc.hp--; if (u.pc.hp <= -10) { u.pc.hp = -10; u.pc.status.dead = true; u.alive = false; log(u.name + ' has bled to death.', 'bad'); } }
    });
    delay(startRound, 200);
  }
  function condName(k) { return { sleep: 'asleep', held: 'held', web: 'entangled', blind: 'blind', slow: 'slowed', afraid: 'afraid', confused: 'confused', stun: 'stunned', reel: 'reeling', cursed: 'cursed', weak: 'weakened', silenced: 'silenced', turned: 'turned', feeble: 'feebleminded', acid: 'burning', charmedTmp: 'charmed' }[k] || k; }

  function beginTurn(u) {
    S.active = u;
    S.focus = u; S.pan = { x: 0, y: 0 };
    u.moveLeft = moveOf(u);
    u.turnsThisRound++;
    u.acted = false;
    // start-of-turn effects
    applyCloudsTo(u);
    if (u.cond.acid && u.acid) { var ad = Rules.roll(u.acid); log(u.name + ' burns for ' + ad + '.', 'hit'); damage(u, ad, null, 'acid'); }
    var regen = u.def ? u.def.regen : (D(u).regen ? 1 : 0);
    if (regen && u.alive && hp(u) > 0 && hp(u) < hpMax(u) && u.turnsThisRound === 1) { if (u.pc) u.pc.hp = Math.min(u.pc.hpMax, u.pc.hp + regen); else u.hp = Math.min(u.hpMax, u.hp + regen); float(u, '+' + regen, '#6f6'); }
    if (!u.alive || u.gone) return delay(nextTurn, 150);
    if (hp(u) <= 0) return delay(nextTurn, 60);
    draw();
    if (helpless(u) || u.cond.stun) { log(u.name + ' is ' + (u.cond.sleep ? 'asleep' : u.cond.held || (u.pc && u.pc.status.paralyzed) ? 'held fast' : u.cond.reel ? 'retching helplessly' : 'stunned') + '.', 'info'); return delay(nextTurn, 350); }
    if (u.def && u.side === 'mon') moraleCheck(u);
    if (u.cond.afraid || u.cond.turned) { fleeAI(u); return; }
    if (u.cond.confused) { confusedAI(u); return; }
    var player = u.side === 'pc' && !u.charmed && !u.auto && !S.autoAll;
    if (player) { S.ui = { mode: 'idle', sel: null, spell: null }; renderSide(); draw(); }
    else { renderSide(); delay(function () { AI(u); }, 300); }
  }
  function endTurn(u) {
    if (!S || S.over) return;
    S.ui = { mode: 'wait' };
    renderSide();
    draw();
    delay(nextTurn, u && u.side === 'pc' && !u.auto && !S.autoAll ? 120 : 260);
  }
  function checkEnd() {
    if (!S || S.over) return true;
    var foes = S.units.filter(function (u) { return u.side === 'mon' && active(u) && !u.charmed; });
    var pcs = S.units.filter(function (u) { return u.side === 'pc' && active(u) && !u.charmed; });
    var pcsLeft = S.units.filter(function (u) { return u.side === 'pc' && !u.gone && u.pc.hp > 0; });
    if (!foes.length) { finish('victory'); return true; }
    if (!pcs.length) {
      var fled = S.units.some(function (u) { return u.side === 'pc' && u.gone; });
      // a charmed party member still standing keeps the fight going
      if (!pcsLeft.length || !fled) { finish(fled ? 'fled' : 'defeat'); return true; }
      finish('fled'); return true;
    }
    return false;
  }
  function finish(outcome) {
    S.over = true;
    S.units.forEach(function (u) { if (u.pc) { u.charmed = false; } });
    var xp = 0;
    S.units.forEach(function (u) { if (u.side === 'mon' && (!u.alive || u.charmed) && !u.gone) { xp += u.xp; if (!u.alive) Bestiary.killed(u.def.id); } });
    var opts = S.opts;
    if (outcome === 'victory') { log('Victory!', 'good'); }
    else if (outcome === 'fled') log('The party escapes.', 'info');
    else log('The party has fallen...', 'bad');
    draw();
    setTimeout(function () {
      var res = { outcome: outcome, xp: xp, drops: S.drops };
      var end = opts.onEnd;
      var st = S;
      S = null;
      if (outcome === 'victory' && xp > 0) Game.giveXp(xp);
      if (outcome !== 'defeat') UI.log(outcome === 'victory' ? 'The battle is won. (' + xp + ' experience)' : 'You escape the battle.', outcome === 'victory' ? 'good' : 'warn');
      end(res);
    }, 900);
  }

  /* ---------- morale ---------- */
  function moraleCheck(u) {
    var g = u.group;
    if (S.moraleChecked[g]) return;
    var members = S.units.filter(function (x) { return x.side === 'mon' && x.group === g; });
    var dead = members.filter(function (x) { return !x.alive; }).length;
    var leaderDead = members.some(function (x) { return x.leader && !x.alive; });
    if (dead * 2 < S.groupSize[g] && !leaderDead) return;
    S.moraleChecked[g] = true;
    var m = u.def.morale;
    if (m >= 20) return;
    if (Rules.roll('2d10') > m + (leaderDead ? -2 : 0)) {
      members.forEach(function (x) { if (active(x)) x.cond.afraid = 99; });
      log('The ' + u.def.name.toLowerCase() + 's lose heart and try to flee!', 'good');
    }
  }

  /* ---------- clouds ---------- */
  function applyCloudsTo(u) {
    if (!u.alive || u.gone) return;
    S.clouds.forEach(function (c) {
      if (!c.cells[u.y * GW + u.x]) return;
      if (c.kind === 'stinking') {
        if (!u.cond.reel && !immune(u, 'poison') && !save(u, 0, 0)) { u.cond.reel = Rules.roll('1d4+1'); log(u.name + ' is overcome by the stinking cloud!', 'spell'); }
      } else if (c.kind === 'kill') {
        if (immune(u, 'poison')) return;
        if (hdOf(u) < 5 && !u.pc) { log(u.name + ' chokes to death in the cloud!', 'spell'); damage(u, hp(u) + 10, c.caster, 'poison'); }
        else { var dmg = Rules.d(10); if (save(u, 0, 0)) dmg = Math.floor(dmg / 2); log(u.name + ' takes ' + dmg + ' from the poison cloud.', 'spell'); damage(u, dmg, c.caster, 'poison'); }
      } else if (c.kind === 'fire') {
        var fd = Rules.roll('4d6'); if (save(u, 4, 0)) fd = Math.floor(fd / 2); log(u.name + ' is seared by the burning cloud (' + fd + ').', 'spell'); damage(u, fd, c.caster, 'fire');
      } else if (c.kind === 'insects') {
        log(u.name + ' is stung by the swarm.', 'spell'); damage(u, 1, c.caster, 'magic'); u.cond.silenced = Math.max(u.cond.silenced || 0, 1);
        if (hdOf(u) < 3 && !u.pc) u.cond.afraid = 3;
      } else if (c.kind === 'blades') {
        var bd = Rules.roll('8d8'); if (save(u, 4, 0)) bd = Math.floor(bd / 2); log(u.name + ' is cut by the whirling blades (' + bd + ').', 'spell'); damage(u, bd, c.caster, 'magic');
      }
    });
  }

  /* ---------- saving throws ---------- */
  // type: 0 ppd, 1 rsw, 2 pp, 3 breath, 4 spell
  function save(u, type, mod, mental, vsEvil) {
    var need = savesOf(u)[type];
    var bonus = (mod || 0) + buffVal(u, 'save');
    if (u.pc && mental) bonus += D(u).magDef;
    if (vsEvil && hasBuff(u, 'vsEvil')) bonus += 2;
    if (u.cond.cursed) bonus -= 1;
    var r = d20();
    return r === 20 || (r !== 1 && r + bonus >= need);
  }
  function resists(u, el) {
    if (!el) return 1;
    if (u.pc) { var d = D(u); if (d.resist.indexOf(el) >= 0 || hasBuffVal(u, 'resist', el)) return 0.5; return 1; }
    if ((u.def.imm || []).indexOf(el) >= 0) return 0;
    if ((u.def.res || []).indexOf(el) >= 0) return 0.5;
    if (hasBuffVal(u, 'resist', el)) return 0.5;
    return 1;
  }
  function hasBuffVal(u, key, val) { return Object.keys(u.buffs).some(function (k) { return u.buffs[k][key] === val; }); }

  /* ---------- damage ---------- */
  function damage(t, amt, src, el) {
    if (!t.alive || amt <= 0) return;
    amt = Math.max(0, Math.round(amt));
    if (t.cond.sleep) { delete t.cond.sleep; }
    float(t, amt, el === 'fire' ? '#ff9040' : el === 'cold' ? '#80d0ff' : el === 'elec' ? '#ffff60' : '#ff5050');
    if (t.pc) {
      t.pc.hp -= amt;
      if (t.pc.hp <= -10) { t.pc.hp = -10; t.pc.status.dead = true; t.alive = false; log(t.name + ' is killed!', 'bad'); Game.note(t.name + ' was killed in battle.'); }
      else if (t.pc.hp <= 0) { log(t.name + ' falls' + (t.pc.hp < 0 ? ', bleeding' : '') + '!', 'bad'); t.bandaged = false; }
    } else {
      t.hp -= amt;
      if (t.hp <= 0) {
        t.alive = false;
        log(t.name + ' is slain!', 'good');
        var bodyLoot = (t.def.id === 'skeleton_warrior') ? [] : null;
        if (bodyLoot) S.drops = S.drops.concat(bodyLoot);
      }
    }
  }
  function heal(t, amt) {
    if (t.pc) {
      var was = t.pc.hp;
      t.pc.hp = Math.min(t.pc.hpMax, Math.max(0, t.pc.hp) + amt);
      if (was <= 0 && t.pc.hp > 0) log(t.name + ' gets back up!', 'good');
    } else t.hp = Math.min(t.hpMax, t.hp + amt);
    float(t, '+' + amt, '#70f070');
  }

  /* ---------- attacks ---------- */
  function needMagicOk(a, t) {
    if (!t.def || !t.def.needMagic) return true;
    var plus = 0, silver = false;
    if (a.pc) { var d = D(a); plus = d.magicPlus || 0; silver = d.silver; if (hasBuff(a, 'shill')) plus = Math.max(plus, 1); }
    else plus = Math.max(1, Math.floor((a.def.hd || 0) / 4));
    if (t.def.needMagic === 0.5) return plus >= 1 || silver;
    return plus >= t.def.needMagic;
  }
  function isBehind(a, t) {
    // attacker stands opposite the way the target faces
    var fx = t.facing[0], fy = t.facing[1];
    var dx = a.x - t.x, dy = a.y - t.y;
    return dx * fx + dy * fy < 0;
  }
  function attacksThisTurn(u) {
    if (u.pc) {
      var r = D(u).rate;
      var n = Math.floor(r / 2) + ((r % 2) && (S.round % 2 === 1) ? 1 : 0);
      return Math.max(1, n);
    }
    return u.def.att.length;
  }
  function vsBonus(a, t, d) {
    var b = 0;
    if (!d || !t.def) return 0;
    var it = d.weaponIt;
    if (it && it.vs) {
      if (it.vs.undead && t.undead != null) b += it.vs.undead;
      if (it.vs.dragon && t.def.type === 'dragon') b += it.vs.dragon;
      if (it.vs.giant && t.def.type === 'giant') b += it.vs.giant;
      if (it.vs.evil && t.evil) b += it.vs.evil;
      if (it.vs.regen && t.def.regen) b += it.vs.regen;
      if (it.vs.fire && (t.def.imm || []).indexOf('fire') >= 0) b += it.vs.fire;
      if (it.vs.construct && t.def.type === 'construct') b += it.vs.construct;
    }
    return b;
  }
  // one weapon attack; returns damage dealt
  function swing(a, t, opts) {
    opts = opts || {};
    var d = D(a), ranged = !!opts.ranged;
    var thac0 = thac0Of(a), hitB = 0, dmgB = 0, dice, notes = [];
    if (a.pc) {
      if (opts.off) { var oi = d.offIt; hitB = d.strHit + (oi.plus || 0); dice = oi.dmg; dmgB = d.strDmg + (oi.plus || 0); }
      else if (ranged && !d.missile) { hitB = d.missileHitThrown; dice = d.dmgDice; dmgB = d.dmgBonus; }
      else { hitB = d.hit; dice = d.dmgDice; dmgB = d.dmgBonus; }
      hitB += vsBonus(a, t, d); dmgB += vsBonus(a, t, d);
      if (a.pc.cls === 'paladin' && t.evil) { hitB += 1; dmgB += 2; }
      if (a.pc.cls === 'ranger' && t.def && (t.def.type === 'giant' || t.def.type === 'goblinoid')) hitB += 4;
    } else {
      dice = [opts.dice, opts.dice];
      if (a.boss) dmgB += Math.floor(a.def.hd / 3);
    }
    hitB += buffVal(a, 'hit');
    dmgB += buffVal(a, 'dmg');
    if (a.cond.cursed) hitB -= 1;
    if (a.cond.weak) { hitB -= 2; dmgB -= 2; }
    if (a.cond.blind) hitB -= 4;
    var backstab = !ranged && a.pc && a.pc.cls === 'thief' && (opts.surpriseRound || isBehind(a, t) || t.cond.held || t.cond.sleep);
    if (backstab) { hitB += 4; notes.push('backstab'); }
    if (hasBuff(t, 'invis') && !opts.seeInvis) hitB -= 4;
    if (hasBuff(t, 'shifting')) hitB -= 2;
    if (a.evil && hasBuff(t, 'vsEvil')) hitB -= 2;
    if (a.evil && t.pc && t.pc.cls === 'paladin') hitB -= 1;
    if (t.undead == null && false) hitB += 0;
    if (a.def && a.undead != null && hasBuff(t, 'vsType')) hitB -= 4;
    if (ranged && hasBuff(t, 'noArrows') && !(a.pc && d.magicPlus)) { log(t.name + ' is untouched by the missile.', 'miss'); return 0; }
    var ac = acOf(t, backstab);
    var need = thac0 - ac - hitB;
    var roll = d20();
    var auto = helpless(t);
    var crit = a.pc && d.weaponIt && d.weaponIt.critRange ? roll >= d.weaponIt.critRange : false;
    if (!(auto || roll === 20 || (roll !== 1 && roll >= need))) { log(a.name + ' misses ' + t.name + '.', 'miss'); float(t, 'miss', '#aaa'); return 0; }
    // illusions and stoneskin soak blows
    if (t.mirror > 0 && Rules.d(t.mirror + 1) > 1) { t.mirror--; log(a.name + ' strikes an illusory double of ' + t.name + '! (' + t.mirror + ' left)', 'spell'); return 0; }
    if (t.skin > 0) { t.skin--; log(t.name + '\'s stony skin turns the blow.', 'spell'); return 0; }
    if (!needMagicOk(a, t)) { log(a.name + '\'s weapon has no effect on ' + t.name + '!', 'bad'); return 0; }
    var large = t.size === 'L' || t.size === 'H' || t.size === 'G';
    var base = Rules.roll(dice[large ? 1 : 0]);
    if (backstab) base *= Rules.backstabMult(a.pc.lvl);
    if (crit) base *= 2;
    var dmg = Math.max(1, base + dmgB);
    if (a.pc && d.weaponIt && d.weaponIt.mult && t.def) { if (d.weaponIt.mult.dragon && t.def.type === 'dragon') dmg *= d.weaponIt.mult.dragon; if (d.weaponIt.mult.giant && t.def.type === 'giant') dmg *= d.weaponIt.mult.giant; if (d.weaponIt.mult.construct && t.def.type === 'construct') dmg *= d.weaponIt.mult.construct; }
    if (a.pc && d.weaponIt && d.weaponIt.elDmg) { var ex = Rules.roll(d.weaponIt.elDmg.dice) * resists(t, d.weaponIt.elDmg.el); dmg += Math.round(ex); }
    if (t.def && (t.def.res || []).indexOf('edged') >= 0 && a.pc && d.weaponIt && d.weaponIt.kind !== 'blunt') dmg = Math.ceil(dmg / 2);
    if (a.def && a.def.elHit) dmg += Math.round(Rules.roll(a.def.elHit.dice) * resists(t, a.def.elHit.el));
    if (a.pc && d.weaponIt && d.weaponIt.disrupt && t.undead != null && !save(t, 0, 0)) { log(t.name + ' is blasted to dust by the mace!', 'good'); damage(t, hp(t) + 10, a); return hp(t); }
    log(a.name + (backstab ? ' backstabs ' : ' hits ') + t.name + ' for ' + dmg + (crit ? ' (critical)' : '') + '.', 'hit');
    damage(t, dmg, a);
    // fire shield burns melee attackers
    if (!ranged && hasBuff(t, 'retaliate') && a.alive) { var back = dmg * 2; log(a.name + ' is burned by the fire shield (' + back + ').', 'spell'); damage(a, back, t, 'fire'); }
    if (a.pc && d.weaponIt && d.weaponIt.drainHit && roll === 20 && t.alive && !immune(t, 'drain')) { log(a.name + '\'s blade drinks ' + t.name + '\'s life!', 'spell'); t.hd = Math.max(0, t.hd - 1); t.hpMax -= 5; t.hp -= 5; if (t.hp <= 0) damage(t, 1, a); }
    if (a.def && t.alive) onHitSpecials(a, t);
    return dmg;
  }
  function onHitSpecials(a, t) {
    var m = a.def;
    if (m.poison && !immune(t, 'poison') && !t.poisonedThisTurn) {
      t.poisonedThisTurn = true;
      if (!save(t, 0, 0)) {
        if (m.poison === 'save' || m.poison === 'x') {
          if (t.pc) { t.pc.status.poisoned = true; log(t.name + ' is poisoned and collapses!', 'bad'); damage(t, t.pc.hp, a, 'poison'); if (t.pc.hp < 0) t.pc.hp = 0; }
          else { log(t.name + ' succumbs to poison!', 'good'); damage(t, t.hp + 10, a); }
        } else if (m.poison === 'para') { t.cond.held = Rules.roll('2d4'); log(t.name + ' is paralysed by venom!', 'bad'); }
        else if (m.poison === 'weak') { t.cond.weak = 10; log(t.name + ' is weakened by venom.', 'bad'); }
        else { var pd = Rules.roll(m.poison); log(t.name + ' is poisoned (' + pd + ').', 'bad'); damage(t, pd, a, 'poison'); }
      }
    }
    if (m.para && !immune(t, 'held') && !(t.pc && t.pc.race === 'elf' && m.id === 'ghoul') && !t.cond.held && !save(t, 0, 0)) { t.cond.held = Rules.roll('2d4'); log(t.name + ' is paralysed!', 'bad'); }
    if (m.drain && !immune(t, 'drain')) {
      for (var i = 0; i < m.drain; i++) {
        if (t.pc) { Rules.loseLevel(t.pc); log(t.name + ' feels life drain away! (now level ' + t.pc.lvl + ')', 'bad'); }
        else { t.hpMax -= 5; t.hp -= 5; if (t.hp <= 0) damage(t, 1, a); }
      }
    }
    if (m.weak && !t.cond.weak) { t.cond.weak = 8; log(t.name + ' is chilled and weakened.', 'bad'); }
    if (m.disease && t.pc && !immune(t, 'disease') && !t.pc.status.diseased && !save(t, 0, 0)) { t.pc.status.diseased = true; log(t.name + ' has contracted a disease!', 'bad'); }
    if (m.stone && t.pc && !save(t, 2, 0)) { t.pc.status.stone = true; t.alive = false; log(t.name + ' turns to stone!', 'bad'); }
    if (m.blind && !t.cond.blind && Math.random() < 0.3 && !save(t, 0, 0)) { t.cond.blind = 4; log(t.name + ' is blinded!', 'bad'); }
    if (m.charm && t.pc && Math.random() < 0.25 && !immune(t, 'charm') && !save(t, 4, 0, true)) { t.charmed = true; t.cond.charmedTmp = Rules.roll('2d4'); log(t.name + ' is charmed and turns on the party!', 'bad'); }
  }
  // full attack action at a target (or the nearest foe if it falls)
  function attackAction(a, t, ranged) {
    var n = attacksThisTurn(a), total = 0;
    var d = a.pc ? D(a) : null;
    faceToward(a, t);
    S.units.forEach(function (u) { u.poisonedThisTurn = false; });
    var surpriseRound = S.round === 1 && S.opts.surprise === 'party' && a.side === 'pc';
    for (var i = 0; i < n; i++) {
      if (!t.alive || hp(t) <= 0) {
        var nt = ranged ? nearestFoe(a, d ? d.range : 1, true) : adjacentFoes(a)[0];
        if (!nt) break; t = nt; faceToward(a, t);
      }
      if (a.pc) {
        if (ranged && d.missile) {
          if (!d.ammo || d.ammo.q <= 0) { log(a.name + ' is out of ammunition!', 'bad'); break; }
          d.ammo.q--; if (d.ammo.q <= 0) { a.pc.inv.splice(a.pc.inv.indexOf(d.ammo), 1); }
        }
        if (ranged && !d.missile && d.weaponIt && d.weaponIt.stack) {
          var w = d.weapon; w.q = (w.q || 1) - 1;
          if (w.q <= 0) { a.pc.inv.splice(a.pc.inv.indexOf(w), 1); }
          n = Math.min(n, (w.q || 0) + i + 1);
        }
        total += swing(a, t, { ranged: ranged, surpriseRound: surpriseRound });
      } else {
        total += swing(a, t, { dice: a.def.att[i % a.def.att.length] || '1d4' });
      }
    }
    if (a.pc && !ranged && d.offIt && t.alive && hp(t) > 0 && n >= 1) { swing(a, t, { off: true }); }
    if (hasBuff(a, 'invis') && !hasBuffVal(a, 'keep', true)) { Object.keys(a.buffs).forEach(function (k) { if (a.buffs[k].invis && !a.buffs[k].keep) delete a.buffs[k]; }); log(a.name + ' becomes visible.', 'info'); }
    if (hasBuff(a, 'sanct')) Object.keys(a.buffs).forEach(function (k) { if (a.buffs[k].sanct) delete a.buffs[k]; });
    a.acted = true;
    return total;
  }
  function adjacentFoes(u) { return S.units.filter(function (o) { return active(o) && isEnemy(u, o) && cheb(u, o) <= 1; }); }
  function nearestFoe(u, range, needLos) {
    var best = null, bd = 1e9;
    S.units.forEach(function (o) {
      if (!active(o) || !isEnemy(u, o)) return;
      var dd = cheb(u, o);
      if (range && dd > range) return;
      if (needLos && !losOk(u, o)) return;
      if (dd < bd) { bd = dd; best = o; }
    });
    return best;
  }
  function losOk(a, b) {
    var x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y, dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
    while (!(x0 === x1 && y0 === y1)) {
      var e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      if (x0 === x1 && y0 === y1) break;
      if (S.blocked[y0 * GW + x0]) return false;
    }
    return true;
  }

  /* ---------- movement ---------- */
  function pathTo(u, gx, gy, adjacentOk) {
    var prev = new Int16Array(GW * GH).fill(-1), q = [u.y * GW + u.x], start = q[0];
    prev[start] = start;
    var goal = -1;
    for (var qi = 0; qi < q.length; qi++) {
      var c = q[qi], cx = c % GW, cy = (c / GW) | 0;
      if ((cx === gx && cy === gy) || (adjacentOk && Math.max(Math.abs(cx - gx), Math.abs(cy - gy)) <= 1 && c !== start)) { goal = c; break; }
      if (adjacentOk && c === start && Math.max(Math.abs(cx - gx), Math.abs(cy - gy)) <= 1) { goal = c; break; }
      for (var d = 0; d < 8; d++) {
        var nx = cx + DIRS8[d][0], ny = cy + DIRS8[d][1];
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        var n = ny * GW + nx;
        if (prev[n] !== -1 || S.blocked[n]) continue;
        if (unitAt(nx, ny) && !(nx === gx && ny === gy && !adjacentOk)) continue;
        // no squeezing diagonally between two walls
        if (d % 2 === 1 && S.blocked[cy * GW + nx] && S.blocked[ny * GW + cx]) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (goal < 0) return null;
    var path = [], cur = goal;
    while (cur !== start) { path.unshift([cur % GW, (cur / GW) | 0]); cur = prev[cur]; }
    return path;
  }
  // move one square; free attacks from enemies the unit leaves behind
  function stepUnit(u, nx, ny) {
    if (!free(nx, ny)) return false;
    var before = adjacentFoes(u);
    var ox = u.x, oy = u.y;
    u.x = nx; u.y = ny;
    u.facing = [Math.sign(nx - ox), Math.sign(ny - oy)];
    u.moveLeft--;
    before.forEach(function (e) {
      if (cheb(e, u) <= 1 || e.aoo || !canAct(e) || !u.alive) return;
      e.aoo = true;
      log(e.name + ' strikes at ' + u.name + ' as it moves away!', 'hit');
      if (e.pc) swing(e, u, {}); else swing(e, u, { dice: e.def.att[0] || '1d4' });
    });
    return true;
  }
  function moveAlong(u, path, then) {
    var i = 0;
    var step = function () {
      if (!S || S.over) return;
      if (i >= path.length || u.moveLeft <= 0 || !active(u) || helpless(u)) { draw(); renderSide(); then && then(); return; }
      if (!stepUnit(u, path[i][0], path[i][1])) { draw(); then && then(); return; }
      i++;
      draw();
      setTimeout(step, 90 / ((Game.S && Game.S.opts.speed) || 1));
    };
    step();
  }
  function moveRange(u) {
    var dist = new Int16Array(GW * GH).fill(-1), q = [[u.x, u.y]];
    dist[u.y * GW + u.x] = 0;
    while (q.length) {
      var p = q.shift(), pd = dist[p[1] * GW + p[0]];
      if (pd >= u.moveLeft) continue;
      for (var d = 0; d < 8; d++) {
        var nx = p[0] + DIRS8[d][0], ny = p[1] + DIRS8[d][1];
        if (!free(nx, ny)) continue;
        if (d % 2 === 1 && S.blocked[p[1] * GW + nx] && S.blocked[ny * GW + p[0]]) continue;
        var n = ny * GW + nx;
        if (dist[n] >= 0) continue;
        dist[n] = pd + 1; q.push([nx, ny]);
      }
    }
    return dist;
  }
  function onEdge(u) { return u.x === 0 || u.y === 0 || u.x === GW - 1 || u.y === GH - 1; }

  /* ---------- spells: areas ---------- */
  function areaCells(sp, caster, tx, ty, lvl) {
    var a = sp.area, out = [];
    var add = function (x, y) { if (x >= 0 && y >= 0 && x < GW && y < GH && !S.blocked[y * GW + x]) out.push([x, y]); };
    if (a.k === 'one') add(tx, ty);
    else if (a.k === 'burst') { for (var y = ty - a.r; y <= ty + a.r; y++) for (var x = tx - a.r; x <= tx + a.r; x++) add(x, y); }
    else if (a.k === 'box') { var o = a.s === 3 ? -1 : 0; for (var y2 = ty + o; y2 < ty + o + a.s; y2++) for (var x2 = tx + o; x2 < tx + o + a.s; x2++) add(x2, y2); }
    else if (a.k === 'cone') {
      var len = typeof a.l === 'function' ? a.l(lvl) : a.l;
      var dx = tx - caster.x, dy = ty - caster.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= dl; dy /= dl;
      for (var y3 = caster.y - len; y3 <= caster.y + len; y3++) for (var x3 = caster.x - len; x3 <= caster.x + len; x3++) {
        var vx = x3 - caster.x, vy = y3 - caster.y, vl = Math.sqrt(vx * vx + vy * vy);
        if (vl === 0 || vl > len + 0.5) continue;
        if ((vx * dx + vy * dy) / vl >= 0.7) add(x3, y3);
      }
    } else if (a.k === 'line') {
      var ln = a.l, ddx = tx - caster.x, ddy = ty - caster.y, steps = Math.max(Math.abs(ddx), Math.abs(ddy)) || 1;
      for (var s = 1; s <= ln; s++) {
        var lx = Math.round(caster.x + ddx / steps * s), ly = Math.round(caster.y + ddy / steps * s);
        if (lx < 0 || ly < 0 || lx >= GW || ly >= GH || S.blocked[ly * GW + lx]) break;
        add(lx, ly);
      }
    }
    return out;
  }
  function unitsIn(cells) {
    var set = {}; cells.forEach(function (c) { set[c[1] * GW + c[0]] = 1; });
    return S.units.filter(function (u) { return u.alive && !u.gone && set[u.y * GW + u.x]; });
  }
  function casterLevel(u) { if (u.pc) return u.pc.cls === 'paladin' ? Math.max(1, u.pc.lvl - 8) : u.pc.cls === 'ranger' ? Math.max(1, u.pc.lvl - 7) : u.pc.lvl; return u.clvl || Math.max(1, Math.round(u.def.hd)); }
  function canCast(u) { return !u.cond.silenced && !u.cond.feeble && !u.cond.blind; }

  /* ---------- spells: effects ---------- */
  // targets: unit list, or for area spells derived from the cells; srcItem: item use (wand/scroll)
  function castSpell(caster, sp, tx, ty, opts) {
    opts = opts || {};
    var lvl = opts.lvl || casterLevel(caster);
    var cells = (sp.area.k === 'self') ? [[caster.x, caster.y]] : sp.area.k === 'party' ? null : sp.area.k === 'foes' ? null : areaCells(sp, caster, tx, ty, lvl);
    var targets;
    if (sp.area.k === 'party') targets = S.units.filter(function (u) { return active(u) && !isEnemy(u, caster); });
    else if (sp.area.k === 'foes') targets = S.units.filter(function (u) { return active(u) && isEnemy(u, caster); });
    else targets = unitsIn(cells);
    if (sp.aim === 'foe' && sp.area.k === 'one') targets = targets.filter(function (u) { return u.alive; });
    if (cells) S.flash = { cells: cells, col: sp.el === 'fire' ? 'rgba(255,120,30,0.55)' : sp.el === 'cold' ? 'rgba(120,200,255,0.55)' : sp.el === 'elec' ? 'rgba(255,255,100,0.55)' : 'rgba(190,120,255,0.45)', t: performance.now() };
    log(caster.name + ' casts ' + sp.name + (opts.from ? ' from ' + opts.from : '') + '!', 'spell');
    var hostile = sp.aim === 'foe' || sp.aim === 'square';
    targets.forEach(function (t) {
      if (!t.alive && sp.fx !== 'raise') return;
      if (sp.foesOnly && !isEnemy(t, caster)) return;
      if (hostile && isEnemy(t, caster) && t.mr && Rules.d(100) <= t.mr) { log(t.name + ' resists the magic!', 'info'); t._resisted = true; return; }
      if (hostile && hasBuff(t, 'globe')) { var gl = buffVal(t, 'blockLvl', 'max'); if (sp.lvl <= gl) { log('The spell breaks against ' + t.name + '\'s globe.', 'info'); t._resisted = true; return; } }
      if (hostile && isEnemy(t, caster) && t.pc && D(t).mr && Rules.d(100) <= D(t).mr) { log(t.name + ' shrugs off the spell!', 'info'); t._resisted = true; return; }
      t._resisted = false;
    });
    targets = targets.filter(function (t) { var r = t._resisted; delete t._resisted; return !r; });
    var F = FX[sp.fx];
    if (F) F(caster, sp, targets, lvl, { tx: tx, ty: ty, cells: cells });
    else log('Nothing seems to happen.', 'miss');
    animate();
  }
  function enemiesOnly(caster, list) { return list.filter(function (t) { return isEnemy(t, caster); }); }
  var FX = {
    dmg: function (c, sp, targets, lvl) {
      var dice = sp.dmg(lvl), rolled = Rules.roll(dice), reps = sp.repeat || 1;
      targets.forEach(function (t) {
        if (sp.noUndead && t.undead != null) { log(t.name + ' is unaffected.', 'miss'); return; }
        for (var r = 0; r < reps; r++) {
          var dmg = reps > 1 || sp.area.k === 'one' ? Rules.roll(dice) : rolled;
          var saved = false;
          if (sp.save) saved = save(t, Rules.SAVE_IDX[sp.st || 'sp'], sp.saveMod || 0);
          if (saved && sp.save === 'neg') { log(t.name + ' avoids the ' + sp.name.toLowerCase() + '.', 'miss'); continue; }
          if (saved) dmg = Math.floor(dmg / 2);
          dmg = Math.round(dmg * resists(t, sp.el));
          if (hasBuffVal(t, 'resist', sp.el) && sp.el) dmg = Math.floor(dmg / 2);
          log(t.name + (saved ? ' partly resists and' : '') + ' takes ' + dmg + ' damage.', 'spell');
          damage(t, dmg, c, sp.el);
          if (sp.dot && t.alive) { var dt = sp.dot(lvl); t.cond.acid = dt.rounds; t.acid = dt.dice; }
          if (sp.extra && t.alive && !saved) { t.cond[sp.extra.cond] = sp.extra.dur; }
          if (!t.alive) break;
        }
      });
    },
    missiles: function (c, sp, targets, lvl, ctx2) {
      var n = sp.count ? sp.count(lvl) : Math.min(5, 1 + Math.floor((lvl - 1) / 2));
      var t = targets.filter(function (x) { return isEnemy(x, c); })[0] || targets[0];
      for (var i = 0; i < n; i++) {
        if (!t || !t.alive || hp(t) <= 0) t = nearestFoe(c, 12, true);
        if (!t) break;
        if (hasBuffVal(t, 'id', 'shield') || hasBuff(t, 'noMissile')) { log('The missile breaks against ' + t.name + '\'s shield.', 'miss'); continue; }
        var dmg = Rules.roll(sp.die || '1d4+1');
        if (sp.die && t.undead != null) dmg = Rules.roll('2d4');
        log('A missile strikes ' + t.name + ' for ' + dmg + '.', 'spell');
        damage(t, dmg, c, 'magic');
      }
    },
    heal: function (c, sp, targets, lvl) {
      targets.forEach(function (t) {
        if (isEnemy(t, c) && t.undead == null) return;
        if (t.undead != null) { var hd = Rules.roll(sp.heal === 'full' ? '10d8' : sp.heal); log(t.name + ' is seared by holy power (' + hd + ').', 'spell'); damage(t, hd, c); return; }
        var amt = sp.heal === 'full' ? hpMax(t) - Math.max(0, hp(t)) - Rules.d(4) : Rules.roll(sp.heal);
        heal(t, Math.max(1, amt));
        (sp.cures || []).forEach(function (k) { delete t.cond[k]; if (t.pc) delete t.pc.status[k]; });
        if (sp.buff) t.buffs[sp.buff.id] = Object.assign({ rounds: sp.dur ? sp.dur(lvl) : 6 }, sp.buff);
        log(t.name + ' is healed.', 'good');
      });
    },
    buff: function (c, sp, targets, lvl) {
      targets.forEach(function (t) {
        if (isEnemy(t, c)) return;
        var b = Object.assign({}, sp.buff, { rounds: sp.dur ? sp.dur(lvl) : 10 });
        if (b.acSetLvl) b.acSet = Math.max(1, 5 - Math.floor(Math.max(0, lvl - 5) / 3));
        if (b.skin) { t.skin = Rules.d(4) + Math.floor(lvl / 2); }
        t.buffs[b.id] = b;
        (sp.cures || []).forEach(function (k) { delete t.cond[k]; });
        log(t.name + ' is ' + ({ shield: 'shielded', haste: 'hastened', invis: 'turned invisible', iminvis: 'turned invisible', stoneskin: 'given stony skin', bless: 'blessed', strength: 'filled with strength' }[b.id] || 'enchanted') + '.', 'good');
      });
    },
    mirror: function (c) { c.mirror = Rules.d(4) + Math.floor(casterLevel(c) / 3); log(c.name + ' is surrounded by ' + c.mirror + ' illusory doubles!', 'good'); },
    cond: function (c, sp, targets, lvl) {
      var list = enemiesOnly(c, targets);
      if (sp.personOnly) list = list.filter(function (t) { return t.pc || (t.def && t.def.person); });
      if (sp.hdMax) list = list.filter(function (t) { return hdOf(t) <= sp.hdMax; });
      if (sp.maxTargets) list = list.slice(0, sp.maxTargets);
      list.forEach(function (t) {
        if (immune(t, sp.cond)) { log(t.name + ' is unaffected.', 'miss'); return; }
        if (sp.save && save(t, Rules.SAVE_IDX[sp.st || 'sp'], sp.saveMod || 0, true)) { log(t.name + ' resists.', 'miss'); return; }
        t.cond[sp.cond] = sp.dur ? sp.dur(lvl) : 3;
        log(t.name + ' is ' + condName(sp.cond) + '!', 'spell');
      });
    },
    sleep: function (c, sp, targets) {
      var pool = Rules.roll(sp.hd || '2d4');
      enemiesOnly(c, targets).sort(function (a, b) { return hdOf(a) - hdOf(b); }).forEach(function (t) {
        var hd = Math.max(1, Math.ceil(hdOf(t)));
        if (hdOf(t) > 4.5 || hd > pool) return;
        if (immune(t, 'sleep')) { log(t.name + ' does not fall asleep.', 'miss'); return; }
        pool -= hd; t.cond.sleep = 5 * casterLevel(c);
        log(t.name + ' falls asleep!', 'spell');
      });
    },
    colorspray: function (c, sp, targets) {
      var lvl = casterLevel(c);
      enemiesOnly(c, targets).forEach(function (t) {
        var hd = hdOf(t);
        if (hd > lvl && save(t, 4, 0)) { log(t.name + ' blinks away the colours.', 'miss'); return; }
        if (hd <= 2) { t.cond.sleep = Rules.roll('2d4'); log(t.name + ' is knocked senseless!', 'spell'); }
        else if (hd <= 4) { t.cond.blind = Rules.roll('1d4'); log(t.name + ' is blinded!', 'spell'); }
        else { t.cond.stun = 1; log(t.name + ' is stunned!', 'spell'); }
      });
    },
    charm: function (c, sp, targets) {
      var list = enemiesOnly(c, targets);
      if (sp.personOnly) list = list.filter(function (t) { return t.pc || (t.def && t.def.person); });
      if (sp.area.k === 'one') list = list.slice(0, 1);
      list.forEach(function (t) {
        if (immune(t, 'charm')) { log(t.name + ' cannot be charmed.', 'miss'); return; }
        if (save(t, 4, sp.saveMod || 0, true)) { log(t.name + ' resists the charm.', 'miss'); return; }
        t.charmed = !t.charmed;
        if (t.pc) t.cond.charmedTmp = Rules.roll('2d4');
        log(t.name + ' is charmed and now fights for ' + (sideOf(t) === 'pc' ? 'the party' : 'the enemy') + '!', 'spell');
      });
    },
    cloud: function (c, sp, targets, lvl, ctx2) {
      var set = {};
      ctx2.cells.forEach(function (p) { set[p[1] * GW + p[0]] = 1; });
      S.clouds.push({ kind: sp.cloud, cells: set, rounds: sp.dur ? sp.dur(lvl) : 3, caster: c });
      S.units.forEach(function (u) { if (set[u.y * GW + u.x]) applyCloudsTo(u); });
    },
    dispel: function (c, sp, targets) {
      targets.forEach(function (t) {
        var n = Object.keys(t.buffs).length + (t.mirror ? 1 : 0);
        t.buffs = {}; t.mirror = 0; t.skin = 0;
        ['web', 'held', 'slow', 'confused', 'blind', 'afraid', 'cursed'].forEach(function (k) { if (t.cond[k]) { delete t.cond[k]; n++; } });
        if (t.charmed && !t.pc) { t.charmed = false; n++; }
        if (n) log('Magic fades from ' + t.name + '.', 'spell');
      });
    },
    drain: function (c, sp, targets, lvl) {
      var t = enemiesOnly(c, targets)[0]; if (!t) return;
      if (t.undead != null) { log(t.name + ' has no life to drain.', 'miss'); return; }
      var dmg = Rules.roll(sp.dmg(lvl));
      log(c.name + ' drains ' + dmg + ' life from ' + t.name + '.', 'spell');
      damage(t, dmg, c); heal(c, dmg);
    },
    energy: function (c, sp, targets, lvl) {
      var n = sp.levels(lvl);
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (immune(t, 'drain')) { log(t.name + ' is unaffected.', 'miss'); return; }
        if (sp.save && save(t, 4, 0)) { log(t.name + ' resists.', 'miss'); return; }
        for (var i = 0; i < n; i++) { if (t.pc) Rules.loseLevel(t.pc); else { t.hd -= 1; t.hpMax -= 5; t.hp -= 5; } }
        log(t.name + ' loses ' + n + ' level(s) of life force!', 'spell');
        if (!t.pc && (t.hp <= 0 || t.hd <= 0)) damage(t, Math.max(1, t.hp + 1), c);
      });
    },
    disintegrate: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (save(t, 4, 0)) { log(t.name + ' dodges the green ray.', 'miss'); return; }
        log(t.name + ' crumbles into dust!', 'spell'); damage(t, hp(t) + 20, c);
        if (t.pc) { t.pc.status.dead = true; t.alive = false; }
      });
    },
    deathspell: function (c, sp, targets) {
      var pool = Rules.roll('4d20');
      enemiesOnly(c, targets).sort(function (a, b) { return hdOf(a) - hdOf(b); }).forEach(function (t) {
        var hd = Math.max(1, Math.ceil(hdOf(t)));
        if (hd >= 9 || hd > pool || t.undead != null || (t.def && t.def.type === 'construct')) return;
        pool -= hd; log(t.name + ' drops dead!', 'spell'); damage(t, hp(t) + 20, c);
      });
    },
    chain: function (c, sp, targets, lvl) {
      var t = enemiesOnly(c, targets)[0], n = Math.min(12, lvl), hit = {};
      while (t && n > 0) {
        var dmg = Rules.roll(n + 'd6'); if (save(t, 4, 0)) dmg = Math.floor(dmg / 2);
        dmg = Math.round(dmg * resists(t, 'elec'));
        log('Lightning strikes ' + t.name + ' for ' + dmg + '.', 'spell'); damage(t, dmg, c, 'elec');
        hit[t.id] = 1; n--;
        var from = t;
        t = S.units.filter(function (o) { return active(o) && isEnemy(o, c) && !hit[o.id] && cheb(o, from) <= 6; }).sort(function (a, b) { return cheb(a, from) - cheb(b, from); })[0];
      }
    },
    stone: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (save(t, 2, 0)) { log(t.name + ' resists petrification.', 'miss'); return; }
        log(t.name + ' turns to stone!', 'spell');
        if (t.pc) { t.pc.status.stone = true; t.alive = false; } else damage(t, hp(t) + 20, c);
      });
    },
    death: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if ((sp.noUndead || sp.id === 'finger_death') && t.undead != null) { log(t.name + ' is already dead.', 'miss'); return; }
        if (save(t, 0, 0)) { var fd = Rules.roll(sp.failDmg || '2d8'); log(t.name + ' resists death but takes ' + fd + '.', 'spell'); damage(t, fd, c); return; }
        log(t.name + ' dies instantly!', 'spell'); damage(t, hp(t) + 20, c);
      });
    },
    pwstun: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        var h = hp(t); if (h > 90) { log(t.name + ' is too mighty to be stunned.', 'miss'); return; }
        t.cond.stun = Rules.roll(h <= 30 ? '4d4' : h <= 60 ? '2d4' : '1d4'); log(t.name + ' is stunned!', 'spell');
      });
    },
    pwkill: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (hp(t) > 60) { log(t.name + ' withstands the word.', 'miss'); return; }
        log(t.name + ' falls dead at the word!', 'spell'); damage(t, hp(t) + 20, c);
      });
    },
    prismatic: function (c, sp, targets) {
      enemiesOnly(c, targets).forEach(function (t) {
        var r = Rules.d(7);
        if (r <= 3) { var dmg = [20, 40, 80][r - 1]; if (save(t, 4, 0)) dmg /= 2; log('A ' + ['red', 'orange', 'yellow'][r - 1] + ' ray burns ' + t.name + ' (' + dmg + ').', 'spell'); damage(t, dmg, c, 'fire'); }
        else if (r === 4) { if (!save(t, 0, 0) && !immune(t, 'poison')) { log('A green ray poisons ' + t.name + ' to death!', 'spell'); damage(t, hp(t) + 20, c); } else { log(t.name + ' resists the green ray.', 'miss'); } }
        else if (r === 5) { if (!save(t, 2, 0)) { log('A blue ray turns ' + t.name + ' to stone!', 'spell'); damage(t, hp(t) + 20, c); } else log(t.name + ' resists the blue ray.', 'miss'); }
        else if (r === 6) { if (!save(t, 4, 0)) { t.cond.confused = 10; log('An indigo ray drives ' + t.name + ' mad!', 'spell'); } }
        else { if (!save(t, 4, 0)) { t.gone = true; log('A violet ray sends ' + t.name + ' to another plane!', 'spell'); } }
      });
    },
    feeble: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (!(t.spellsLeft && t.spellsLeft.length) && !(t.pc && Rules.casterType(t.pc.cls))) { log(t.name + ' has no great mind to wreck.', 'miss'); return; }
        if (save(t, 4, -4, true)) { log(t.name + ' resists.', 'miss'); return; }
        t.cond.feeble = 99; t.spellsLeft = []; log(t.name + '\'s mind is shattered!', 'spell');
      });
    },
    dispelevil: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        if (!(t.evil && (t.undead != null || t.def.type === 'fiend'))) { log('Nothing happens.', 'miss'); return; }
        if (save(t, 4, 0)) { log(t.name + ' resists banishment.', 'miss'); return; }
        log(t.name + ' is banished!', 'spell'); damage(t, hp(t) + 20, c);
      });
    },
    harm: function (c, sp, targets) {
      enemiesOnly(c, targets).slice(0, 1).forEach(function (t) {
        var left = Rules.d(4);
        if (hp(t) > left) { var d = hp(t) - left; log(t.name + ' is wracked by harmful magic (' + d + ').', 'spell'); damage(t, d, c); }
      });
    },
    holyword: function (c, sp, targets) {
      enemiesOnly(c, targets).forEach(function (t) {
        if (!t.evil) return;
        var hd = hdOf(t);
        if (hd < 4) { log(t.name + ' is struck dead by the holy word!', 'spell'); damage(t, hp(t) + 20, c); }
        else if (hd < 8) { t.cond.stun = Rules.roll('2d4'); log(t.name + ' is stunned.', 'spell'); }
        else if (hd < 12) { t.cond.slow = Rules.roll('1d4') + 2; log(t.name + ' reels from the word.', 'spell'); }
      });
    },
    sunray: function (c, sp, targets) {
      enemiesOnly(c, targets).forEach(function (t) {
        if (t.undead != null) { var d = Rules.roll('8d6'); if (save(t, 4, 0)) d = Math.floor(d / 2); log('Sunlight sears ' + t.name + ' (' + d + ').', 'spell'); damage(t, d, c); }
        else if (!save(t, 4, 0)) { t.cond.blind = 6; log(t.name + ' is blinded!', 'spell'); }
      });
    },
    timestop: function (c) {
      for (var i = 0; i < 3; i++) S.order.splice(S.turn + 1, 0, c);
      log('Time freezes around ' + c.name + '!', 'spell');
    },
    prayer: function (c, sp, targets, lvl) {
      S.units.forEach(function (u) {
        if (!active(u)) return;
        if (!isEnemy(u, c)) u.buffs.prayer = { rounds: lvl, hit: 1, dmg: 1, save: 1 };
        else u.cond.cursed = Math.max(u.cond.cursed || 0, lvl);
      });
      log('The prayer strengthens allies and weakens foes.', 'spell');
    },
    cure: function (c, sp, targets) {
      targets.forEach(function (t) {
        if (isEnemy(t, c)) return;
        var n = 0;
        (sp.cures || []).forEach(function (k) { if (t.cond[k]) { delete t.cond[k]; n++; } if (t.pc && t.pc.status[k]) { delete t.pc.status[k]; n++; } });
        if (t.pc && t.pc.status.poisoned === undefined && t.pc.hp < 1 && sp.cures.indexOf('poisoned') >= 0 && n) t.pc.hp = 1;
        if (sp.buff) t.buffs[sp.buff.id] = Object.assign({ rounds: 10 }, sp.buff);
        log(n ? t.name + ' is cured.' : t.name + ' is unaffected.', n ? 'good' : 'miss');
      });
    },
    raise: function () { log('That spell needs time and quiet; it cannot be cast in battle.', 'miss'); },
    restore: function () { log('That spell needs time and quiet; it cannot be cast in battle.', 'miss'); }
  };

  /* ---------- special monster actions ---------- */
  function breathe(u, target) {
    var b = u.def.breath, shape = b.shape;
    var sp = { area: shape === 'cone' ? { k: 'cone', l: 6 } : shape === 'line' ? { k: 'line', l: 9 } : { k: 'burst', r: 2 } };
    var cells = areaCells(sp, u, target.x, target.y, 1);
    var targets = unitsIn(cells).filter(function (t) { return t !== u; });
    u.breathLeft--;
    var col = b.el === 'fire' ? 'rgba(255,120,30,0.6)' : b.el === 'cold' ? 'rgba(150,220,255,0.6)' : b.el === 'elec' ? 'rgba(255,255,90,0.6)' : b.el === 'acid' ? 'rgba(120,255,90,0.5)' : 'rgba(160,200,120,0.5)';
    S.flash = { cells: cells, col: col, t: performance.now() };
    log(u.name + ' breathes ' + ({ fire: 'fire', cold: 'frost', elec: 'lightning', acid: 'acid', poison: 'poison gas', sleep: 'sleeping gas', stone: 'petrifying vapour', drain: 'life-draining darkness' }[b.el] || b.el) + '!', 'bad');
    var dmgBase = b.dice ? Rules.roll(b.dice) : Math.max(1, hp(u));
    targets.forEach(function (t) {
      if (b.el === 'sleep') { if (!immune(t, 'sleep') && !save(t, 3, 0)) { t.cond.sleep = Rules.roll('2d6'); log(t.name + ' falls asleep.', 'bad'); } return; }
      if (b.el === 'stone') { if (!save(t, 2, 0)) { log(t.name + ' turns to stone!', 'bad'); if (t.pc) { t.pc.status.stone = true; t.alive = false; } else damage(t, hp(t) + 20, u); } return; }
      var dmg = dmgBase;
      if (save(t, 3, 0)) dmg = Math.floor(dmg / 2);
      dmg = Math.round(dmg * resists(t, b.el === 'drain' ? null : b.el));
      log(t.name + ' takes ' + dmg + '.', 'hit');
      damage(t, dmg, u, b.el);
    });
    animate();
  }
  function gazeAttack(u, t) {
    var g = u.def.gaze;
    log(u.name + ' turns its terrible gaze on ' + t.name + '!', 'bad');
    if (g === 'stone') { if (!save(t, 2, 0)) { log(t.name + ' turns to stone!', 'bad'); if (t.pc) { t.pc.status.stone = true; t.alive = false; } else damage(t, hp(t) + 20, u); } else log(t.name + ' averts their eyes.', 'miss'); }
    else if (g === 'death') { if (!save(t, 0, 0)) { log(t.name + ' dies!', 'bad'); damage(t, hp(t) + 20, u); } else log(t.name + ' resists.', 'miss'); }
    else if (g === 'para') { if (!immune(t, 'held') && !save(t, 0, 0)) { t.cond.held = Rules.roll('2d4'); log(t.name + ' is paralysed.', 'bad'); } else log(t.name + ' resists.', 'miss'); }
    else if (g === 'charm') { if (!immune(t, 'charm') && !save(t, 4, 0, true)) { t.charmed = true; t.cond.charmedTmp = Rules.roll('2d4'); log(t.name + ' is charmed!', 'bad'); } else log(t.name + ' resists.', 'miss'); }
    else if (g === 'confuse') { if (!save(t, 4, 0, true)) { t.cond.confused = Rules.roll('1d4') + 1; log(t.name + ' is confused.', 'bad'); } else log(t.name + ' resists.', 'miss'); }
    else if (g === 'sleep') { if (!immune(t, 'sleep') && !save(t, 4, 0, true)) { t.cond.sleep = Rules.roll('2d4'); log(t.name + ' falls asleep.', 'bad'); } else log(t.name + ' resists.', 'miss'); }
    u.acted = true;
  }

  /* ---------- turn undead ---------- */
  function canTurn(u) {
    if (!u.pc) return false;
    var lvl = Rules.turnLevel(u.pc) + (D(u).turnBonus || 0);
    return lvl >= 1 && !S.turnedUsed[u.id] && S.units.some(function (o) { return active(o) && isEnemy(o, u) && o.undead != null; });
  }
  function turnUndead(u) {
    S.turnedUsed[u.id] = true;
    var lvl = Rules.turnLevel(u.pc) + (D(u).turnBonus || 0);
    var undead = S.units.filter(function (o) { return active(o) && isEnemy(o, u) && o.undead != null; }).sort(function (a, b) { return a.undead - b.undead; });
    var roll = d20(), count = Rules.roll('2d6'), affected = 0;
    log(u.name + ' raises a holy symbol against the undead!', 'spell');
    undead.forEach(function (t) {
      if (affected >= count) return;
      var v = Rules.turnValue(lvl, t.undead);
      if (v === 0) return;
      if (v > 0 && roll < v) return;
      affected++;
      if (v === -2 || v === -3) { log(t.name + ' is destroyed by holy light!', 'good'); damage(t, hp(t) + 20, u); if (v === -3) count += Rules.roll('2d4'); }
      else { t.cond.turned = Rules.roll('3d4'); log(t.name + ' is turned and flees!', 'good'); }
    });
    if (!affected) log('The undead are not impressed.', 'miss');
    u.acted = true;
  }

  /* ---------- AI ---------- */
  function fleeAI(u) {
    // run towards the nearest edge; escape from it
    if (onEdge(u)) { u.gone = true; log(u.name + ' flees the battle!', u.side === 'pc' ? 'bad' : 'info'); return endTurn(u); }
    var best = null;
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      if (!(x === 0 || y === 0 || x === GW - 1 || y === GH - 1) || !free(x, y)) continue;
      var dd = Math.max(Math.abs(x - u.x), Math.abs(y - u.y));
      if (!best || dd < best[0]) best = [dd, x, y];
    }
    if (!best) { log(u.name + ' cowers.', 'info'); return endTurn(u); }
    var path = pathTo(u, best[1], best[2], false);
    if (!path) { log(u.name + ' cowers.', 'info'); return endTurn(u); }
    moveAlong(u, path, function () { if (onEdge(u) && active(u)) { u.gone = true; log(u.name + ' flees the battle!', u.side === 'pc' ? 'bad' : 'info'); } endTurn(u); });
  }
  function confusedAI(u) {
    var r = Rules.d(3);
    if (r === 1) {
      var near = S.units.filter(function (o) { return o !== u && active(o) && cheb(o, u) <= 1; });
      if (near.length) { var t = near[Math.floor(Math.random() * near.length)]; log(u.name + ' lashes out in confusion!', 'info'); attackAction(u, t, false); return endTurn(u); }
    }
    if (r === 2) { var d = DIRS8[Rules.d(8) - 1]; if (free(u.x + d[0], u.y + d[1])) stepUnit(u, u.x + d[0], u.y + d[1]); log(u.name + ' wanders aimlessly.', 'info'); return endTurn(u); }
    log(u.name + ' babbles incoherently.', 'info');
    endTurn(u);
  }
  function targetScore(u, t) { return cheb(u, t) * 3 + hp(t) / Math.max(1, hpMax(t)) * 2 + (helpless(t) ? -2 : 0) + (t.pc && t.pc.cls === 'mage' ? -1 : 0); }
  function chooseFoe(u, list) { list.sort(function (a, b) { return targetScore(u, a) - targetScore(u, b); }); return list[0]; }
  function AI(u) {
    if (!S || S.over || S.active !== u) return;
    if (!canAct(u)) return endTurn(u);
    var foes = S.units.filter(function (o) { return active(o) && isEnemy(o, u) && !hasBuffVal(o, 'sanct', true); });
    if (!foes.length) return endTurn(u);
    if (u.pc) return pcAI(u, foes);
    var def = u.def;
    // breath weapon
    if (u.breathLeft > 0 && Math.random() < 0.45) {
      var bt = chooseFoe(u, foes.filter(function (f) { return cheb(f, u) <= 6 && losOk(u, f); }));
      if (bt) { faceToward(u, bt); breathe(u, bt); u.acted = true; return endTurn(u); }
    }
    // gaze
    if (def.gaze && Math.random() < 0.5) {
      var gt = foes.filter(function (f) { return cheb(f, u) <= 4 && losOk(u, f); })[0];
      if (gt) { gazeAttack(u, gt); return endTurn(u); }
    }
    // spells
    if (u.spellsLeft && u.spellsLeft.length && canCast(u) && Math.random() < 0.65) {
      if (monsterCast(u, foes)) return endTurn(u);
    }
    var adj = adjacentFoes(u).filter(function (f) { return !hasBuffVal(f, 'sanct', true); });
    if (adj.length) { attackAction(u, chooseFoe(u, adj), false); return endTurn(u); }
    if (def.ranged && Math.random() < 0.7) {
      var rt = chooseFoe(u, foes.filter(function (f) { return cheb(f, u) <= def.ranged.range && losOk(u, f); }));
      if (rt) {
        faceToward(u, rt);
        var need = thac0Of(u) - acOf(rt) - 0, r = d20();
        if (hasBuff(rt, 'noArrows') && def.ranged.kind !== 'rock') log(rt.name + ' is untouched by the missile.', 'miss');
        else if (r === 20 || (r !== 1 && r >= need)) { var dmg = Rules.roll(def.ranged.dice); log(u.name + (def.ranged.kind === 'rock' ? ' hurls a boulder at ' : ' shoots at ') + rt.name + ' for ' + dmg + '.', 'hit'); damage(rt, dmg, u); }
        else log(u.name + (def.ranged.kind === 'rock' ? ' hurls a boulder that misses ' : ' shoots and misses ') + rt.name + '.', 'miss');
        return endTurn(u);
      }
    }
    // close in
    var target = chooseFoe(u, foes.slice());
    var path = pathTo(u, target.x, target.y, true);
    if (!path) { var alt = foes.map(function (f) { return { f: f, p: pathTo(u, f.x, f.y, true) }; }).filter(function (o) { return o.p; })[0]; if (alt) { target = alt.f; path = alt.p; } }
    if (!path) return endTurn(u);
    moveAlong(u, path, function () {
      var adj2 = adjacentFoes(u);
      if (adj2.length && active(u) && canAct(u)) attackAction(u, chooseFoe(u, adj2), false);
      endTurn(u);
    });
  }
  function monsterCast(u, foes) {
    var list = u.spellsLeft;
    var lvl = Math.max(1, Math.round(u.def.hd));
    var order = list.slice().sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < order.length; i++) {
      var sp = Rules.SPELLS[order[i]];
      if (!sp || !sp.combat || sp.aim === 'dead') continue;
      var range = Rules.spellRange(sp, lvl) || 1;
      var pick = planCast(u, sp, foes, lvl, range);
      if (!pick) continue;
      list.splice(list.indexOf(order[i]), 1);
      castSpell(u, sp, pick.x, pick.y, { lvl: lvl });
      u.acted = true;
      return true;
    }
    return false;
  }
  // choose where to aim a spell: maximise foes hit, avoid allies
  function planCast(u, sp, foes, lvl, range) {
    if (sp.aim === 'self' || sp.area.k === 'self') { if (sp.fx === 'buff' && hasBuff(u, sp.buff.id)) return null; if (sp.fx === 'mirror' && u.mirror) return null; return { x: u.x, y: u.y }; }
    if (sp.aim === 'ally') {
      if (sp.fx === 'heal') { var w = S.units.filter(function (o) { return active(o) && !isEnemy(o, u) && hp(o) < hpMax(o) * 0.5 && cheb(o, u) <= Math.max(1, range); })[0]; return w ? { x: w.x, y: w.y } : null; }
      if (sp.area.k === 'party') return Math.random() < 0.5 ? { x: u.x, y: u.y } : null;
      if (sp.fx === 'buff') { var a = S.units.filter(function (o) { return active(o) && !isEnemy(o, u) && !hasBuff(o, sp.buff.id) && cheb(o, u) <= Math.max(1, range); })[0]; return a ? { x: a.x, y: a.y } : null; }
      return null;
    }
    if (sp.area.k === 'foes') return { x: u.x, y: u.y };
    var best = null;
    var cands = sp.aim === 'square' ? foes : foes;
    cands.forEach(function (f) {
      var d = cheb(u, f);
      if (d > range || !losOk(u, f)) return;
      if (sp.touch && d > 1) return;
      var cells = areaCells(sp, u, f.x, f.y, lvl), hit = unitsIn(cells);
      var score = 0;
      hit.forEach(function (h) { if (h === u && sp.area.k !== 'one') score -= 3; else if (isEnemy(h, u)) score += helpless(h) && sp.fx !== 'dmg' ? 0 : 1 + (sp.fx === 'cond' && h.cond[sp.cond] ? -1 : 0); else if (!sp.foesOnly && (sp.fx === 'dmg' || sp.fx === 'cloud')) score -= 2; });
      if (sp.fx === 'sleep' && hit.every(function (h) { return hdOf(h) > 4.5; })) score = -1;
      if (sp.fx === 'charm' && f.charmed) score = -1;
      if (!best || score > best.s) best = { s: score, x: f.x, y: f.y };
    });
    if (!best || best.s <= 0) return null;
    if (sp.area.k !== 'one' && best.s < 2 && Math.random() < 0.5) return null;
    return best;
  }
  function pcAI(u, foes) {
    var pc = u.pc, d = D(u);
    var allies = S.units.filter(function (o) { return active(o) && !isEnemy(o, u); });
    var downed = S.units.filter(function (o) { return o.pc && o.alive && !o.gone && o.pc.hp <= 0 && !o.pc.status.dead && sideOf(o) === 'pc'; });
    // healers keep the party standing
    if (Rules.casterType(pc.cls) === 'pri' && canCast(u)) {
      var hurt = allies.concat(downed).filter(function (o) { return hp(o) < hpMax(o) * 0.4; }).sort(function (a, b) { return hp(a) / hpMax(a) - hp(b) / hpMax(b); })[0];
      if (hurt) {
        var hs = ['heal', 'cure_critical', 'cure_serious', 'cure_light'].map(function (id) { return pc.mem.filter(function (m) { return m.id === id && !m.used; })[0]; }).filter(Boolean)[0];
        if (hs) {
          if (cheb(u, hurt) <= 1) { hs.used = true; castSpell(u, Rules.SPELLS[hs.id], hurt.x, hurt.y); return endTurn(u); }
          var hp2 = pathTo(u, hurt.x, hurt.y, true);
          if (hp2 && hp2.length <= u.moveLeft) { moveAlong(u, hp2, function () { if (cheb(u, hurt) <= 1 && active(u)) { hs.used = true; castSpell(u, Rules.SPELLS[hs.id], hurt.x, hurt.y); } endTurn(u); }); return; }
        }
      }
    }
    if (canTurn(u) && foes.filter(function (f) { return f.undead != null; }).length >= 2) { turnUndead(u); return endTurn(u); }
    // spellcasting
    if (Rules.casterType(pc.cls) && canCast(u)) {
      var mem = pc.mem.filter(function (m) { return !m.used; });
      var tried = {};
      var sorted = mem.slice().sort(function (a, b) { return Rules.SPELLS[b.id].lvl - Rules.SPELLS[a.id].lvl; });
      for (var i = 0; i < sorted.length; i++) {
        var m = sorted[i]; if (tried[m.id]) continue; tried[m.id] = 1;
        var sp = Rules.SPELLS[m.id];
        if (!sp.combat || sp.aim === 'dead' || sp.fx === 'heal' || sp.fx === 'cure' || sp.fx === 'raise' || sp.fx === 'restore') continue;
        if (pc.cls === 'cleric' && sp.fx === 'buff' && S.round > 2) continue;
        var lvl = casterLevel(u), range = Rules.spellRange(sp, lvl) || 1;
        var pick = planCast(u, sp, foes, lvl, range);
        if (pick && (sp.area.k === 'one' || sp.fx === 'missiles' || planScore(u, sp, pick, lvl) >= (sp.lvl >= 3 ? 2 : 1))) {
          m.used = true; castSpell(u, sp, pick.x, pick.y); return endTurn(u);
        }
      }
    }
    var adj = adjacentFoes(u);
    if (d.missile && d.ammo && !adj.length) {
      var rt = chooseFoe(u, foes.filter(function (f) { return cheb(u, f) <= d.range && losOk(u, f); }));
      if (rt) { attackAction(u, rt, true); return endTurn(u); }
    }
    if (pc.cls === 'mage' && !adj.length) {
      if (d.thrown && d.weapon && d.weapon.q) { var tt = chooseFoe(u, foes.filter(function (f) { return cheb(u, f) <= d.weaponIt.thrown && losOk(u, f); })); if (tt) { attackAction(u, tt, true); return endTurn(u); } }
      return endTurn(u);
    }
    if (adj.length) { attackAction(u, chooseFoe(u, adj), false); return endTurn(u); }
    // thieves look for a spot behind an engaged foe
    var target = chooseFoe(u, foes.slice());
    if (pc.cls === 'thief') {
      var engaged = foes.filter(function (f) { return S.units.some(function (o) { return o !== u && active(o) && !isEnemy(o, u) && cheb(o, f) <= 1; }); });
      for (var e = 0; e < engaged.length; e++) {
        var f = engaged[e], bx = f.x - f.facing[0], by = f.y - f.facing[1];
        if (free(bx, by)) { var bp = pathTo(u, bx, by, false); if (bp && bp.length <= u.moveLeft) { moveAlong(u, bp, function () { var a2 = adjacentFoes(u); if (a2.length && active(u)) attackAction(u, a2.indexOf(f) >= 0 ? f : a2[0], false); endTurn(u); }); return; } }
      }
    }
    var path = pathTo(u, target.x, target.y, true);
    if (!path) return endTurn(u);
    moveAlong(u, path, function () { var a3 = adjacentFoes(u); if (a3.length && active(u) && canAct(u)) attackAction(u, chooseFoe(u, a3), false); endTurn(u); });
  }
  function planScore(u, sp, pick, lvl) {
    var cells = areaCells(sp, u, pick.x, pick.y, lvl), hit = unitsIn(cells), s = 0;
    hit.forEach(function (h) { if (isEnemy(h, u)) s++; else if (!sp.foesOnly) s -= 3; });
    return s;
  }

  /* ---------- player actions ---------- */
  function act() { return S && S.active && S.ui.mode !== 'wait' ? S.active : null; }
  K.cmd = function (c) {
    var u = act(); if (!u) return;
    var d = D(u);
    if (c === 'attack') {
      var adj = adjacentFoes(u);
      var ranged = d.missile || (d.thrown && !adj.length);
      S.ui = { mode: 'target', kind: ranged ? 'ranged' : 'melee', sel: null };
      var list = validTargets(u);
      if (!list.length) { UI.toast(ranged ? 'No target in range.' : 'No enemy within reach. Move next to one, or ready a missile weapon.'); S.ui = { mode: 'idle' }; return; }
      S.ui.sel = list[0];
      log('Choose a target (Tab cycles, Enter confirms).', 'info');
    } else if (c === 'cast') { castMenu(u); return; }
    else if (c === 'turn') { if (!canTurn(u)) { UI.toast('No undead to turn, or already tried this battle.'); return; } turnUndead(u); endTurn(u); return; }
    else if (c === 'use') { useMenu(u); return; }
    else if (c === 'guard') { u.buffs.guard = { rounds: 1, ac: -2 }; log(u.name + ' stands guard.', 'info'); endTurn(u); return; }
    else if (c === 'delay') {
      if (S.turn < S.order.length - 1 && !u.delayed) { u.delayed = true; S.order.splice(S.turn, 1); S.order.push(u); S.turn--; log(u.name + ' waits.', 'info'); endTurn(u); return; }
      UI.toast('Cannot delay further this round.'); return;
    } else if (c === 'flee') {
      if (!onEdge(u)) { UI.toast('Move to the edge of the battlefield to flee.'); return; }
      u.gone = true; log(u.name + ' flees from the battle!', 'info'); endTurn(u); return;
    } else if (c === 'bandage') {
      var dying = S.units.filter(function (o) { return o.pc && o.alive && !o.gone && o.pc.hp < 0 && !o.bandaged && cheb(o, u) <= 1; })[0];
      if (!dying) { UI.toast('No dying companion beside you.'); return; }
      dying.bandaged = true; dying.pc.hp = 0; log(u.name + ' binds ' + dying.name + '\'s wounds.', 'good'); endTurn(u); return;
    } else if (c === 'auto') { u.auto = true; log(u.name + ' fights on their own.', 'info'); renderSide(); AI(u); return; }
    else if (c === 'autoall') { S.autoAll = true; log('The party fights automatically. (Press any command key to retake control.)', 'info'); renderSide(); AI(u); return; }
    else if (c === 'end') { log(u.name + ' ends their turn.', 'info'); endTurn(u); return; }
    else if (c === 'cancel') { S.ui = { mode: 'idle' }; }
    renderSide(); draw();
  };
  function validTargets(u) {
    var d = D(u);
    if (S.ui.kind === 'melee') return adjacentFoes(u);
    var range = d.missile ? d.range : (d.weaponIt && d.weaponIt.thrown) || 1;
    return S.units.filter(function (o) { return active(o) && isEnemy(o, u) && cheb(o, u) <= range && losOk(u, o); }).sort(function (a, b) { return cheb(u, a) - cheb(u, b); });
  }
  function spellTargetsValid(u, sp, x, y) {
    var lvl = casterLevel(u), range = Rules.spellRange(sp, lvl) || 1;
    if (sp.touch) range = 1;
    var t = unitAt(x, y);
    var dist = Math.max(Math.abs(x - u.x), Math.abs(y - u.y));
    if (sp.aim === 'foe' && sp.area.k !== 'cone' && sp.area.k !== 'line') return t && active(t) && isEnemy(t, u) && dist <= range && losOk(u, t);
    if (sp.aim === 'ally') return t && t.alive && !t.gone && !isEnemy(t, u) && dist <= Math.max(1, range);
    if (sp.area.k === 'cone' || sp.area.k === 'line') return dist >= 1 && !(x === u.x && y === u.y);
    if (sp.aim === 'square') return x >= 0 && y >= 0 && x < GW && y < GH && !S.blocked[y * GW + x] && dist <= range && losOk(u, { x: x, y: y });
    return true;
  }
  function castMenu(u) {
    if (!canCast(u)) { UI.toast(u.name + ' cannot cast spells right now.'); return; }
    var mem = (u.pc.mem || []).filter(function (m) { return !m.used; });
    var seen = {}, opts = [];
    mem.forEach(function (m) {
      var sp = Rules.SPELLS[m.id];
      if (seen[m.id] || !sp.combat || sp.aim === 'dead') return; seen[m.id] = 1;
      var n = mem.filter(function (x) { return x.id === m.id; }).length;
      opts.push({ label: sp.name + ' (L' + sp.lvl + ', ' + n + ')', fn: function () { beginSpell(u, sp, function () { m.used = true; }); } });
    });
    if (!opts.length) { UI.toast('No spells ready.'); return; }
    opts.push({ label: 'Cancel', fn: function () { } });
    UI.choice('Cast — ' + u.name, 'Choose a spell.', opts);
  }
  function beginSpell(u, sp, consume, from, lvl) {
    if (sp.aim === 'self' || sp.area.k === 'self' || sp.area.k === 'party' || sp.area.k === 'foes') {
      consume(); castSpell(u, sp, u.x, u.y, { from: from, lvl: lvl }); endTurn(u); return;
    }
    S.ui = { mode: 'spell', spell: sp, consume: consume, from: from, lvl: lvl, sel: null };
    // preselect a sensible target
    var foes = S.units.filter(function (o) { return active(o) && isEnemy(o, u); });
    var allies = S.units.filter(function (o) { return o.alive && !o.gone && !isEnemy(o, u); });
    var pool = sp.aim === 'ally' ? allies.sort(function (a, b) { return hp(a) / hpMax(a) - hp(b) / hpMax(b); }) : foes.sort(function (a, b) { return cheb(u, a) - cheb(u, b); });
    var first = pool.filter(function (t) { return spellTargetsValid(u, sp, t.x, t.y); })[0];
    S.ui.hover = first ? { x: first.x, y: first.y } : { x: u.x + u.facing[0], y: u.y + u.facing[1] };
    log('Choose where to cast ' + sp.name + '. (Enter confirms, Esc cancels.)', 'info');
    renderSide(); draw();
  }
  function useMenu(u) {
    var pc = u.pc, opts = [];
    pc.inv.forEach(function (inst) {
      var it = Data.items[inst.id];
      if (it.type === 'potion' || (it.type === 'scroll' && it.use) || (it.type === 'wand') || (it.uses && inst.eq) || (it.type === 'scroll' && it.spell && Rules.SPELLS[it.spell].combat && ((it.scls === 'wiz' && pc.cls === 'mage') || (it.scls === 'pri' && Rules.casterType(pc.cls) === 'pri')))) {
        if (it.type === 'wand' && it.only && it.only.indexOf(pc.cls) < 0) return;
        opts.push({ label: Data.itemName(inst), fn: function () { useItem(u, inst); } });
      }
    });
    if (D(u).fx.invisUse && !hasBuff(u, 'invis')) opts.push({ label: 'Ring of Invisibility', fn: function () { u.buffs.invis = { rounds: 99, invis: true }; log(u.name + ' slips on the ring and vanishes.', 'spell'); endTurn(u); } });
    if (!opts.length) { UI.toast('Nothing usable in battle.'); return; }
    opts.push({ label: 'Cancel', fn: function () { } });
    UI.choice('Use — ' + u.name, 'Choose an item.', opts);
  }
  function useItem(u, inst) {
    var pc = u.pc, it = Data.items[inst.id];
    var consume = function () { if (it.stack && inst.q > 1) inst.q--; else { var i = pc.inv.indexOf(inst); if (i >= 0) pc.inv.splice(i, 1); } };
    if (it.type === 'wand' || it.uses) {
      var spells = it.uses || [it.spell];
      var go = function (sid) { beginSpell(u, Rules.SPELLS[sid], function () { inst.c = (inst.c != null ? inst.c : it.charges) - 1; if (inst.c <= 0 && it.type === 'wand') { pc.inv.splice(pc.inv.indexOf(inst), 1); log('The ' + it.name + ' crumbles to dust.', 'info'); } }, 'the ' + it.name, it.clvl); };
      if ((inst.c != null ? inst.c : it.charges) <= 0) { UI.toast('No charges left.'); return; }
      if (spells.length === 1) go(spells[0]);
      else UI.choice(it.name, 'Which power?', spells.map(function (s) { return { label: Rules.SPELLS[s].name, fn: function () { go(s); } }; }).concat([{ label: 'Cancel', fn: function () { } }]));
      return;
    }
    if (it.type === 'scroll' && it.spell) { beginSpell(u, Rules.SPELLS[it.spell], consume, 'a scroll', Math.max(casterLevel(u), Rules.SPELLS[it.spell].lvl * 2 - 1)); return; }
    var use = it.use;
    if (use.fx === 'throwdmg') {
      S.ui = { mode: 'throw', item: inst, use: use, sel: null };
      var tlist = S.units.filter(function (o) { return active(o) && isEnemy(o, u) && cheb(o, u) <= 4 && losOk(u, o); });
      if (!tlist.length) { UI.toast('No target within throwing range.'); S.ui = { mode: 'idle' }; return; }
      S.ui.sel = tlist[0]; renderSide(); draw(); return;
    }
    if (use.party) { consume(); S.units.forEach(function (o) { if (o.pc && active(o)) o.buffs[use.buff.id] = Object.assign({ rounds: 999 }, use.buff); }); log(u.name + ' reads the ' + it.name + '. A ward settles over the party.', 'spell'); endTurn(u); return; }
    var targets = S.units.filter(function (o) { return o.pc && o.alive && !o.gone && cheb(o, u) <= 1; });
    var apply = function (t) {
      consume();
      if (use.fx === 'heal') { heal(t, use.dice === 'full' ? hpMax(t) : Rules.roll(use.dice)); }
      if (use.fx === 'cure') { (use.cures || []).forEach(function (k) { delete t.cond[k]; delete t.pc.status[k]; }); if (use.heal) heal(t, Rules.roll(use.heal)); if (t.pc.hp < 1) t.pc.hp = 1; }
      if (use.fx === 'buff') { t.buffs[use.buff.id] = Object.assign({ rounds: 999 }, use.buff); if (use.heal) heal(t, Rules.roll(use.heal)); }
      log(u.name + ' uses ' + it.name + (t !== u ? ' on ' + t.name : '') + '.', 'good');
      endTurn(u);
    };
    if (targets.length <= 1) apply(u);
    else UI.choice(it.name, 'Give it to whom?', targets.map(function (t) { return { label: t.name + ' (' + hp(t) + '/' + hpMax(t) + ')', fn: function () { apply(t); } }; }).concat([{ label: 'Cancel', fn: function () { } }]));
  }
  function confirmTarget(u, t) {
    if (S.ui.mode === 'target') {
      if (!t || validTargets(u).indexOf(t) < 0) return;
      attackAction(u, t, S.ui.kind === 'ranged');
      endTurn(u);
    } else if (S.ui.mode === 'throw') {
      if (!t || !isEnemy(t, u) || cheb(t, u) > 4) return;
      var it = S.ui.item, use = S.ui.use;
      if (Data.items[it.id].stack && it.q > 1) it.q--; else u.pc.inv.splice(u.pc.inv.indexOf(it), 1);
      var r = d20(), need = thac0Of(u) - acOf(t) - Rules.dexTable(u.pc.ab.dex).missile;
      if (r >= need || r === 20) { var dmg = (use.vs === 'undead' && t.undead == null) ? 0 : Rules.roll(use.dice); log(u.name + ' hurls the flask at ' + t.name + (dmg ? ' for ' + dmg + '!' : ', to no effect.'), 'hit'); if (dmg) damage(t, dmg, u, 'fire'); }
      else log(u.name + '\'s flask shatters harmlessly.', 'miss');
      endTurn(u);
    }
  }
  function confirmSpell(u, x, y) {
    var sp = S.ui.spell;
    if (!spellTargetsValid(u, sp, x, y)) { UI.toast('Not a valid target for ' + sp.name + '.'); return; }
    S.ui.consume();
    castSpell(u, sp, x, y, { from: S.ui.from, lvl: S.ui.lvl });
    endTurn(u);
  }

  /* ---------- input ---------- */
  function gridAt(ev) {
    var r = cv.getBoundingClientRect();
    var sx = (ev.clientX - r.left) * dpr, sy = (ev.clientY - r.top) * dpr;
    var L = S.lay;
    var a = (sx - L.ox) / (L.tw / 2), b = (sy - L.oy) / (L.th / 2);
    var gx = Math.floor((a + b) / 2), gy = Math.floor((b - a) / 2);
    return { x: gx, y: gy };
  }
  function onHover(ev) {
    if (!S || !S.lay) return;
    var g = gridAt(ev);
    if (S.ui && (S.ui.mode === 'spell' || S.ui.mode === 'idle')) {
      if (!S.ui.hover || S.ui.hover.x !== g.x || S.ui.hover.y !== g.y) { S.ui.hover = g; draw(); }
    }
  }
  function onPointer(ev) {
    if (!S || !S.lay || UI.hasModal()) return;
    var u = act(); if (!u) return;
    var g = gridAt(ev);
    if (g.x < 0 || g.y < 0 || g.x >= GW || g.y >= GH) return;
    var t = unitAt(g.x, g.y);
    if (S.ui.mode === 'spell') {
      // first tap previews, second tap on the same square casts (touch friendly)
      if (ev.pointerType === 'mouse' || (S.ui.hover && S.ui.hover.x === g.x && S.ui.hover.y === g.y)) confirmSpell(u, g.x, g.y);
      else { S.ui.hover = g; draw(); }
      return;
    }
    if (S.ui.mode === 'target' || S.ui.mode === 'throw') { if (t && isEnemy(t, u)) confirmTarget(u, t); else { S.ui = { mode: 'idle' }; renderSide(); draw(); } return; }
    if (S.ui.mode === 'idle') {
      if (t && t !== u && isEnemy(t, u) && active(t)) {
        var d = D(u);
        if (cheb(u, t) <= 1) { attackAction(u, t, false); endTurn(u); return; }
        var range = d.missile ? d.range : d.thrown ? d.weaponIt.thrown : 0;
        if (range && cheb(u, t) <= range && losOk(u, t) && (!d.missile || d.ammo)) { attackAction(u, t, true); endTurn(u); return; }
        // walk towards it, then strike if adjacent
        var p = pathTo(u, t.x, t.y, true);
        if (p && u.moveLeft > 0) { S.ui = { mode: 'wait' }; moveAlong(u, p.slice(0, u.moveLeft), function () { if (cheb(u, t) <= 1 && active(u) && canAct(u)) { attackAction(u, t, false); endTurn(u); } else { S.ui = { mode: u.moveLeft > 0 ? 'idle' : 'idle' }; renderSide(); draw(); if (u.moveLeft <= 0 && !adjacentFoes(u).length) endTurn(u); } }); }
        return;
      }
      if (!t && u.moveLeft > 0) {
        var range2 = moveRange(u);
        if (range2[g.y * GW + g.x] > 0) {
          var path = pathTo(u, g.x, g.y, false);
          if (path) { S.ui = { mode: 'wait' }; moveAlong(u, path, function () { if (!active(u)) return endTurn(u); S.ui = { mode: 'idle' }; renderSide(); draw(); if (u.moveLeft <= 0 && !adjacentFoes(u).length && !(D(u).missile)) endTurn(u); }); }
        }
      }
    }
  }
  var KEYDIR = { ArrowUp: [-1, -1], ArrowDown: [1, 1], ArrowLeft: [-1, 1], ArrowRight: [1, -1], '8': [-1, -1], '2': [1, 1], '4': [-1, 1], '6': [1, -1], '7': [-1, 0], '9': [0, -1], '1': [0, 1], '3': [1, 0], w: [-1, -1], s: [1, 1], a: [-1, 1], d: [1, -1] };
  K.key = function (ev) {
    if (!S) return;
    var k = ev.key, lk = k.length === 1 ? k.toLowerCase() : k;
    if (S.autoAll && /^[a-z ]$/.test(lk) && lk !== 'q') { S.autoAll = false; S.units.forEach(function (u) { u.auto = false; }); log('You retake command of the party.', 'info'); renderSide(); return; }
    var u = act(); if (!u) return;
    if (S.ui.mode === 'target' || S.ui.mode === 'throw') {
      var list = S.ui.mode === 'throw' ? S.units.filter(function (o) { return active(o) && isEnemy(o, u) && cheb(o, u) <= 4 && losOk(u, o); }) : validTargets(u);
      if (k === 'Tab' || k === 'ArrowRight' || k === 'ArrowDown') { ev.preventDefault(); var i = list.indexOf(S.ui.sel); S.ui.sel = list[(i + 1) % list.length]; draw(); return; }
      if (k === 'ArrowLeft' || k === 'ArrowUp') { ev.preventDefault(); var j = list.indexOf(S.ui.sel); S.ui.sel = list[(j - 1 + list.length) % list.length]; draw(); return; }
      if (k === 'Enter' || k === ' ' || lk === 'a') { ev.preventDefault(); confirmTarget(u, S.ui.sel); return; }
      if (k === 'Escape') { S.ui = { mode: 'idle' }; renderSide(); draw(); return; }
      return;
    }
    if (S.ui.mode === 'spell') {
      var h = S.ui.hover || { x: u.x, y: u.y };
      if (KEYDIR[k] && k.length > 1 || (KEYDIR[lk] && /[wasd]/.test(lk))) { ev.preventDefault(); var dd = KEYDIR[k] || KEYDIR[lk]; S.ui.hover = { x: Math.max(0, Math.min(GW - 1, h.x + dd[0])), y: Math.max(0, Math.min(GH - 1, h.y + dd[1])) }; draw(); return; }
      if (k === 'Tab') {
        ev.preventDefault();
        var sp = S.ui.spell, cands = S.units.filter(function (o) { return o.alive && !o.gone && spellTargetsValid(u, sp, o.x, o.y); });
        if (cands.length) { var ci = cands.findIndex(function (o) { return o.x === h.x && o.y === h.y; }); var n = cands[(ci + 1) % cands.length]; S.ui.hover = { x: n.x, y: n.y }; draw(); }
        return;
      }
      if (k === 'Enter' || k === ' ') { ev.preventDefault(); confirmSpell(u, h.x, h.y); return; }
      if (k === 'Escape') { S.ui = { mode: 'idle' }; renderSide(); draw(); return; }
      return;
    }
    if (S.ui.mode !== 'idle') return;
    var dir = KEYDIR[k] || (k.length === 1 && /[1-9]/.test(k) ? KEYDIR[k] : null) || (/^[wasd]$/.test(lk) && lk !== 'a' && lk !== 'd' ? KEYDIR[lk] : null);
    if (KEYDIR[k] && (k.indexOf('Arrow') === 0 || /[1-9]/.test(k))) {
      ev.preventDefault();
      var dv = KEYDIR[k], nx = u.x + dv[0], ny = u.y + dv[1];
      var t = unitAt(nx, ny);
      if (t && isEnemy(t, u) && active(t)) { attackAction(u, t, false); endTurn(u); return; }
      if (u.moveLeft > 0 && free(nx, ny)) { stepUnit(u, nx, ny); draw(); renderSide(); if (!active(u)) endTurn(u); }
      return;
    }
    if (lk === 'a') K.cmd('attack');
    else if (lk === 'c') K.cmd('cast');
    else if (lk === 't') K.cmd('turn');
    else if (lk === 'u') K.cmd('use');
    else if (lk === 'g') K.cmd('guard');
    else if (lk === 'd') K.cmd('delay');
    else if (lk === 'f') K.cmd('flee');
    else if (lk === 'b') K.cmd('bandage');
    else if (lk === 'q') K.cmd('auto');
    else if (k === ' ' || k === 'Enter') { ev.preventDefault(); K.cmd('end'); }
  };

  /* ---------- side panel ---------- */
  function renderSide() {
    if (!S) return;
    var u = S.active, t = $('cturn'), m = $('cmenu');
    if (!u) { t.innerHTML = ''; m.innerHTML = ''; return; }
    var conds = Object.keys(u.cond).map(condName).concat(Object.keys(u.buffs).map(function (k) { return k; }));
    if (u.mirror) conds.push(u.mirror + ' images');
    if (u.charmed) conds.push('charmed');
    t.innerHTML = '<div class="nm">' + UI.esc(u.name) + '</div>HP ' + hp(u) + '/' + hpMax(u) + ' · AC ' + acOf(u) + (u.pc ? ' · Move ' + u.moveLeft : '') + (conds.length ? '<br><span class="cyan">' + UI.esc(conds.join(', ')) + '</span>' : '') +
      (u.pc ? '<br><span class="dim">' + UI.esc(D(u).weaponIt ? D(u).weaponIt.name : 'Bare hands') + (D(u).missile && D(u).ammo ? ' (' + D(u).ammo.q + ' shots)' : '') + '</span>' : '');
    m.innerHTML = '';
    var player = u.side === 'pc' && !u.charmed && !u.auto && !S.autoAll && S.ui.mode !== 'wait';
    if (!player) {
      if (S.autoAll) { var b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Take control'; b.onclick = function () { S.autoAll = false; S.units.forEach(function (x) { x.auto = false; }); renderSide(); }; m.appendChild(b); }
      return;
    }
    var add = function (label, cmd, dis, key) { var b2 = document.createElement('button'); b2.className = 'btn'; b2.innerHTML = (key ? '<span class="key">' + key + '</span>' : '') + label; b2.disabled = !!dis; b2.onclick = function () { if (!UI.hasModal()) K.cmd(cmd); }; m.appendChild(b2); };
    if (S.ui.mode === 'target' || S.ui.mode === 'spell' || S.ui.mode === 'throw') {
      add('Confirm', 'confirm', false, '↵');
      m.lastChild.onclick = function () { if (S.ui.mode === 'spell') { var h = S.ui.hover || { x: u.x, y: u.y }; confirmSpell(u, h.x, h.y); } else confirmTarget(u, S.ui.sel); };
      add('Cancel', 'cancel', false, 'Esc');
      return;
    }
    var d = D(u);
    add('Attack', 'attack', false, 'A');
    add('Cast', 'cast', !Rules.casterType(u.pc.cls) || !(u.pc.mem || []).some(function (x) { return !x.used && Rules.SPELLS[x.id].combat; }), 'C');
    add('Turn', 'turn', !canTurn(u), 'T');
    add('Use', 'use', false, 'U');
    add('Guard', 'guard', false, 'G');
    add('Delay', 'delay', u.delayed, 'D');
    add('Bandage', 'bandage', !S.units.some(function (o) { return o.pc && o.alive && o.pc.hp < 0 && !o.bandaged && cheb(o, u) <= 1; }), 'B');
    add('Flee', 'flee', !onEdge(u), 'F');
    add('Auto', 'auto', false, 'Q');
    add('Auto All', 'autoall', false, '');
    add('End Turn', 'end', false, '␣');
  }

  /* ---------- drawing ---------- */
  var THEME_COL = {
    stone: ['#3e3a36', '#6a6a72'], wood: ['#3a2c1e', '#6b4a2b'], cave: ['#3a3026', '#5a4c3e'], crypt: ['#2c2a30', '#4a4650'],
    brass: ['#3a3020', '#7a6538'], tower: ['#18181e', '#2a2a36'], town: ['#5a5a50', '#8a7a68'], wild: ['#4a7a34', '#6a6a5a']
  };
  function draw() {
    if (!S || !ctx) return;
    var w = cv.width, h = cv.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    // only floor squares and the walls that touch them are drawn; fit the view to them
    if (!S.vis) {
      S.vis = new Uint8Array(GW * GH);
      // floor that any combatant can reach; unreachable pockets are left dark
      var reach = new Uint8Array(GW * GH);
      S.units.forEach(function (un) {
        if (un.x == null) return;
        var d0 = bfsFrom(un.x, un.y);
        for (var ri = 0; ri < GW * GH; ri++) if (d0[ri] >= 0) reach[ri] = 1;
        reach[un.y * GW + un.x] = 1;
      });
      for (var vy = 0; vy < GH; vy++) for (var vx = 0; vx < GW; vx++) {
        var vi = vy * GW + vx;
        if (!S.blocked[vi]) { if (reach[vi]) S.vis[vi] = 1; continue; }
        for (var ny = vy - 1; ny <= vy + 1; ny++) for (var nx = vx - 1; nx <= vx + 1; nx++) if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && !S.blocked[ny * GW + nx] && reach[ny * GW + nx]) S.vis[vi] = 2;
      }
      var minD = 1e9, maxD = -1e9, minS = 1e9, maxS = -1e9;
      for (var bi = 0; bi < GW * GH; bi++) { if (!S.vis[bi]) continue; var bx = bi % GW, by = (bi / GW) | 0; minD = Math.min(minD, bx - by); maxD = Math.max(maxD, bx - by); minS = Math.min(minS, bx + by); maxS = Math.max(maxS, bx + by); }
      S.bounds = { minD: minD, maxD: maxD, minS: minS, maxS: maxS };
    }
    var bd = S.bounds;
    var th = Math.floor(Math.min(w / (bd.maxD - bd.minD + 2.5), h / ((bd.maxS - bd.minS + 2) / 2 + 3.2), 56 * dpr));
    var minTh = Math.round((w / dpr < 700 ? 28 : 18) * dpr);
    var tw, ox, oy;
    S.zoomed = th < minTh;
    if (S.zoomed) {
      // small screens: keep figures readable, centre on the active combatant, allow panning
      th = minTh; tw = th * 2;
      var f = S.focus || S.active || S.units[0];
      var pan = S.pan || { x: 0, y: 0 };
      ox = w / 2 - (f.x - f.y) * tw / 2 + pan.x;
      oy = h / 2 - (f.x + f.y + 1) * th / 2 + th + pan.y;
    } else {
      tw = th * 2;
      ox = w / 2 - ((bd.minD + bd.maxD) / 2) * tw / 2;
      var needH = (bd.maxS - bd.minS + 2) * th / 2 + 2.8 * th;
      oy = (h - needH) / 2 + 2.6 * th - bd.minS * th / 2;
    }
    S.lay = { tw: tw, th: th, ox: ox, oy: oy };
    var theme = S.theme === 'wild' ? 'wild' : (THEME_COL[S.theme] ? S.theme : 'stone');
    var cols = THEME_COL[theme];
    var floorA = S.theme === 'wild' ? (S.terrain === 'w' ? '#4a5a3a' : S.terrain === 'h' ? '#7a8a4a' : S.terrain === '^' ? '#6a6a5a' : S.terrain === '=' ? '#8a7a58' : '#4f8436') : cols[0];
    var u = S.active, mr = null, tgtSet = {}, areaSet = {};
    if (u && S.ui.mode === 'idle' && u.side === 'pc') mr = moveRange(u);
    if (u && (S.ui.mode === 'target' || S.ui.mode === 'throw') && S.ui.sel) tgtSet[S.ui.sel.y * GW + S.ui.sel.x] = 1;
    if (u && S.ui.mode === 'spell' && S.ui.hover) {
      var sp = S.ui.spell, hv = S.ui.hover;
      var valid = spellTargetsValid(u, sp, hv.x, hv.y);
      areaCells(sp, u, hv.x, hv.y, casterLevel(u)).forEach(function (c) { areaSet[c[1] * GW + c[0]] = valid ? 1 : 2; });
    }
    var flash = S.flash && performance.now() - S.flash.t < 600 ? S.flash : null;
    var flashSet = {};
    if (flash) { flash.cells.forEach(function (c) { flashSet[c[1] * GW + c[0]] = 1; }); requestAnimationFrame(draw); }
    var cloudSet = {};
    S.clouds.forEach(function (c) { Object.keys(c.cells).forEach(function (k) { cloudSet[k] = c.kind; }); });
    var iso = function (x, y) { return [ox + (x - y) * tw / 2, oy + (x + y) * th / 2]; };
    var diamond = function (x, y, fill, stroke) {
      var p = iso(x, y);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + tw / 2, p[1] + th / 2); ctx.lineTo(p[0], p[1] + th); ctx.lineTo(p[0] - tw / 2, p[1] + th / 2); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, dpr); ctx.stroke(); }
    };
    // floor
    for (var y = 0; y < GH; y++) for (var x = 0; x < GW; x++) {
      var i = y * GW + x;
      if (S.blocked[i] || !S.vis[i]) continue;
      var shadeF = ((x + y) % 2) ? Figures.shade(floorA, 0.06) : floorA;
      diamond(x, y, shadeF, 'rgba(0,0,0,0.25)');
      if (cloudSet[i]) diamond(x, y, cloudSet[i] === 'fire' ? 'rgba(255,90,20,0.45)' : cloudSet[i] === 'blades' ? 'rgba(200,200,220,0.4)' : cloudSet[i] === 'insects' ? 'rgba(60,60,20,0.5)' : 'rgba(120,200,60,0.45)');
      if (mr && mr[i] > 0) diamond(x, y, 'rgba(80,140,255,0.28)', 'rgba(120,170,255,0.6)');
      if (areaSet[i]) diamond(x, y, areaSet[i] === 1 ? 'rgba(255,150,40,0.45)' : 'rgba(255,40,40,0.3)', 'rgba(255,200,100,0.8)');
      if (flashSet[i]) diamond(x, y, flash.col);
      if (tgtSet[i]) diamond(x, y, 'rgba(255,40,40,0.45)', '#ff8080');
    }
    if (u && S.ui.mode === 'idle' && S.ui.hover && u.side === 'pc') { var hv2 = S.ui.hover; if (hv2.x >= 0 && hv2.y >= 0 && hv2.x < GW && hv2.y < GH && !S.blocked[hv2.y * GW + hv2.x]) diamond(hv2.x, hv2.y, null, '#ffffff'); }
    // walls and units, back to front
    var wallH = th * 0.9;
    for (var dsum = 0; dsum <= GW + GH - 2; dsum++) {
      for (var x2 = Math.max(0, dsum - GH + 1); x2 <= Math.min(GW - 1, dsum); x2++) {
        var y2 = dsum - x2, i2 = y2 * GW + x2;
        if (S.blocked[i2]) {
          if (!S.vis[i2]) continue;
          var p = iso(x2, y2);
          var dec = S.decor[i2];
          if (S.theme === 'wild' || dec) { drawDecor(p, tw, th, dec || 2); continue; }
          var top = Figures.shade(cols[1], 0.1), left = Figures.shade(cols[1], -0.25), right = Figures.shade(cols[1], -0.45);
          ctx.fillStyle = left; ctx.beginPath(); ctx.moveTo(p[0] - tw / 2, p[1] + th / 2 - wallH); ctx.lineTo(p[0], p[1] + th - wallH); ctx.lineTo(p[0], p[1] + th); ctx.lineTo(p[0] - tw / 2, p[1] + th / 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = right; ctx.beginPath(); ctx.moveTo(p[0] + tw / 2, p[1] + th / 2 - wallH); ctx.lineTo(p[0], p[1] + th - wallH); ctx.lineTo(p[0], p[1] + th); ctx.lineTo(p[0] + tw / 2, p[1] + th / 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(p[0], p[1] - wallH); ctx.lineTo(p[0] + tw / 2, p[1] + th / 2 - wallH); ctx.lineTo(p[0], p[1] + th - wallH); ctx.lineTo(p[0] - tw / 2, p[1] + th / 2 - wallH); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      S.units.forEach(function (un) {
        if (un.gone || un.x + un.y !== dsum) return;
        if (!un.alive && !un.pc) return;
        drawUnit(un, iso(un.x, un.y), tw, th);
      });
    }
    // floating numbers
    var now = performance.now();
    S.floats.forEach(function (f) {
      var p = iso(f.x, f.y), age = (now - f.t0) / 1000;
      ctx.globalAlpha = Math.max(0, 1 - age);
      ctx.fillStyle = f.col; ctx.font = 'bold ' + Math.round(th * 0.75) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(f.text, p[0], p[1] - th * 1.8 - age * th * 1.5); ctx.fillText(f.text, p[0], p[1] - th * 1.8 - age * th * 1.5);
      ctx.globalAlpha = 1;
    });
  }
  function drawDecor(p, tw, th, kind) {
    if (kind === 1) { // tree
      ctx.fillStyle = '#4a3018'; ctx.fillRect(p[0] - tw * 0.05, p[1] - th * 0.6, tw * 0.1, th * 1.2);
      ctx.fillStyle = '#1e4a18'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - th * 1.1, tw * 0.32, th * 0.9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2e6a24'; ctx.beginPath(); ctx.ellipse(p[0] - tw * 0.08, p[1] - th * 1.3, tw * 0.16, th * 0.45, 0, 0, 7); ctx.fill();
    } else if (kind === 3) { // pool
      ctx.fillStyle = '#2a4a6a'; ctx.beginPath(); ctx.ellipse(p[0], p[1] + th / 2, tw * 0.4, th * 0.4, 0, 0, 7); ctx.fill();
    } else { // boulder
      ctx.fillStyle = '#6a6a62'; ctx.beginPath(); ctx.ellipse(p[0], p[1] + th * 0.2, tw * 0.32, th * 0.7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a8a80'; ctx.beginPath(); ctx.ellipse(p[0] - tw * 0.08, p[1], tw * 0.14, th * 0.3, 0, 0, 7); ctx.fill();
    }
  }
  var SIZE = { S: 0.75, M: 0.95, L: 1.15, H: 1.35, G: 1.5 };
  function drawUnit(u, p, tw, th) {
    var cx = p[0], cy = p[1] + th / 2;
    var isActive = S.active === u;
    var friendly = sideOf(u) === 'pc';
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, tw * 0.3, th * 0.3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = isActive ? '#ffe060' : friendly ? 'rgba(90,150,255,0.9)' : 'rgba(255,80,80,0.8)';
    ctx.lineWidth = isActive ? 3 * dpr : 1.5 * dpr;
    ctx.beginPath(); ctx.ellipse(cx, cy, tw * 0.33, th * 0.33, 0, 0, 7); ctx.stroke();
    var sz = SIZE[u.size] || 1, sw = tw * 1.2 * sz, sh = sw;
    var down = u.pc && (u.pc.hp <= 0 || !u.alive);
    ctx.save();
    if (hasBuff(u, 'invis')) ctx.globalAlpha = 0.45;
    if (down) { ctx.translate(cx, cy - th * 0.1); ctx.rotate(-Math.PI / 2); ctx.globalAlpha = 0.75; ctx.drawImage(u.sprite, -sh * 0.45, -sw / 2, sw * 0.9, sw * 0.9); }
    else ctx.drawImage(u.sprite, cx - sw / 2, cy - sh + th * 0.18, sw, sh);
    ctx.restore();
    if (u.pc && u.pc.status.stone) { ctx.fillStyle = 'rgba(150,150,150,0.7)'; ctx.fillRect(cx - sw / 3, cy - sh * 0.8, sw * 0.66, sh * 0.8); }
    // hp bar and markers
    if (!down) {
      var bw = tw * 0.6, frac = Math.max(0, hp(u) / hpMax(u));
      var by = cy - sh + th * 0.05;
      ctx.fillStyle = '#300'; ctx.fillRect(cx - bw / 2, by, bw, Math.max(3, th * 0.12));
      ctx.fillStyle = frac > 0.5 ? '#50e050' : frac > 0.25 ? '#e0c040' : '#ff3030'; ctx.fillRect(cx - bw / 2, by, bw * frac, Math.max(3, th * 0.12));
      var marks = '';
      if (u.cond.sleep) marks += 'z'; if (u.cond.held) marks += 'H'; if (u.cond.afraid || u.cond.turned) marks += '!'; if (u.cond.confused) marks += '?'; if (u.charmed) marks += '♥'; if (u.cond.web) marks += '#'; if (u.mirror) marks += 'M';
      if (marks) { ctx.font = 'bold ' + Math.round(th * 0.6) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#80e0ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(marks, cx, by - 3); ctx.fillText(marks, cx, by - 3); }
    }
    if (u.pc && S.units.indexOf(u) >= 0) {
      ctx.font = Math.round(th * 0.5) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(String(u.idx + 1), cx + tw * 0.32, cy + th * 0.1);
    }
  }
  return K;
})();
