/* Emberfall — overland.js
 * The top-down wilderness map: square-by-square travel where terrain, time
 * of day and fatigue set the pace and the danger; sites to visit; random
 * encounters, friendly travellers and lairs. */
var Overland = (function () {
  'use strict';
  var O = {};
  var cv, ctx, cw = 640, ch = 400;
  var anim = null;

  O.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', function (ev) {
      if (Game.mode !== 'wild' || UI.hasModal()) return;
      var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      var dx = x - r.width / 2, dy = y - r.height / 2;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 16) { O.enterSite(); return; }
      if (Math.abs(dx) > Math.abs(dy)) O.input(dx > 0 ? 'E' : 'W'); else O.input(dy > 0 ? 'S' : 'N');
    });
  };
  O.resize = function (w, h) {
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(200, w); ch = Math.max(150, h);
    cv.width = Math.floor(cw * dpr); cv.height = Math.floor(ch * dpr);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (Game.mode === 'wild') O.draw();
  };
  function wild() { return Game.adv.wild; }
  function pos() { return Game.advState().wildPos; }
  function seenArr() {
    var a = Game.advState(), wd = wild(), n = wd.grid.length * wd.grid[0].length;
    if (!a._wildSeen) { a._wildSeen = new Uint8Array(n); if (a.wildSeen) for (var i = 0; i < a.wildSeen.length && i < n; i++) a._wildSeen[i] = a.wildSeen.charCodeAt(i) === 49 ? 1 : 0; }
    return a._wildSeen;
  }
  function reveal() {
    var wd = wild(), w = wd.grid[0].length, h = wd.grid.length, p = pos(), s = seenArr();
    var here = wd.grid[p.y][p.x], R = here === 'h' || here === '^' ? 4 : here === 'f' ? 2 : 3;
    var site = O.siteAt(p.x, p.y);
    if (site && site.s.kind === 'town') R = 5;
    for (var y = p.y - R; y <= p.y + R; y++) for (var x = p.x - R; x <= p.x + R; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) <= R * R + 1) s[y * w + x] = 1;
    }
  }
  O.seen = seenArr;
  O.terrainHere = function () { var p = pos(); return wild().grid[p.y][p.x]; };
  O.terrainName = function () { return Wilds.terrainName(O.terrainHere()); };
  O.siteAt = function (x, y) { var s = wild().sites; for (var i = 0; i < s.length; i++) if (s[i].x === x && s[i].y === y) return { s: s[i], i: i }; return null; };
  O.siteState = function (i) { var a = Game.advState(); return a.sites[i] || (a.sites[i] = {}); };
  O.safeHere = function () { var p = pos(), st = O.siteAt(p.x, p.y); return !!(st && (st.s.kind === 'camp' || st.s.kind === 'town' || st.s.kind === 'hamlet' || st.s.kind === 'healer' || st.s.kind === 'holy')); };
  O.lockOpen = function (lock) {
    if (!lock) return true;
    if (Game.flag(lock)) return true;
    var q = Game.adv.quests.filter(function (x) { return x.id === lock; })[0];
    if (q) return Journal.goalMet(q) || Game.advState().quests[q.id] === 'rewarded';
    return false;
  };

  O.enter = function (fromLoad) {
    anim = null;
    reveal();
    UI.layout();
    O.draw();
    if (!fromLoad) {
      var p = pos(), st = O.siteAt(p.x, p.y);
      if (st) UI.log('You stand at ' + st.s.name + '. (Enter to visit.)', 'info');
    }
  };

  /* ---------- drawing ---------- */
  O.draw = function () {
    if (!ctx || Game.mode !== 'wild') return;
    var wd = wild(), w = wd.grid[0].length, h = wd.grid.length, p = pos(), s = seenArr();
    var T = Math.max(22, Math.min(48, Math.floor(Math.min(cw / 15, ch / 10))));
    var px = p.x, py = p.y;
    if (anim) {
      var t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
      px = anim.fx + (anim.tx - anim.fx) * t; py = anim.fy + (anim.ty - anim.fy) * t;
      if (t < 1) requestAnimationFrame(O.draw); else { anim = null; }
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    var ox = cw / 2 - (px + 0.5) * T, oy = ch / 2 - (py + 0.5) * T;
    var x0 = Math.max(0, Math.floor(-ox / T) - 1), x1 = Math.min(w - 1, Math.ceil((cw - ox) / T) + 1);
    var y0 = Math.max(0, Math.floor(-oy / T) - 1), y1 = Math.min(h - 1, Math.ceil((ch - oy) / T) + 1);
    ctx.imageSmoothingEnabled = false;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (!s[y * w + x]) continue;
      var tile = Figures.tiles[wd.grid[y][x]] || Figures.tiles['.'];
      ctx.drawImage(tile, ox + x * T, oy + y * T, T + 0.5, T + 0.5);
    }
    // sites
    wd.sites.forEach(function (site, i) {
      if (!s[site.y * w + site.x]) return;
      var st = O.siteState(i);
      var name = 'site_' + site.kind;
      if (site.kind === 'dungeon' && !O.lockOpen(site.lock)) name = 'site_dungeon_locked';
      if (site.kind === 'lair' && st.cleared) name = 'site_cleared';
      ctx.drawImage(Figures.tiles[name], ox + site.x * T, oy + site.y * T, T, T);
      ctx.font = 'bold ' + Math.max(10, Math.round(T * 0.32)) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(site.name, ox + (site.x + 0.5) * T, oy + site.y * T - 2);
      ctx.fillStyle = '#ffe890'; ctx.fillText(site.name, ox + (site.x + 0.5) * T, oy + site.y * T - 2);
    });
    // fog edge
    var night = Wilds.isNight(Game.S.time);
    if (night) { ctx.fillStyle = 'rgba(0,10,40,0.35)'; ctx.fillRect(0, 0, cw, ch); }
    ctx.drawImage(Figures.tiles.party, ox + px * T, oy + py * T, T, T);
    MapView.mini();
  };

  /* ---------- movement ---------- */
  var DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  var ACT = { fwd: 'N', back: 'S', left: 'W', right: 'E', sl: 'W', sr: 'E' };
  O.input = function (act) {
    if (anim && performance.now() - anim.t0 > 1000) anim = null;
    if (Game.mode !== 'wild' || UI.hasModal() || anim) return;
    var d = DIRS[ACT[act] || act]; if (!d) return;
    var wd = wild(), p = pos(), nx = p.x + d[0], ny = p.y + d[1];
    if (nx < 0 || ny < 0 || nx >= wd.grid[0].length || ny >= wd.grid.length) return;
    var ch2 = wd.grid[ny][nx];
    if (!Wilds.passable(ch2)) { UI.log('The ' + Wilds.terrainName(ch2).toLowerCase() + ' blocks your way.', 'dim'); return; }
    var hours = Wilds.travelHours(ch2, Game.S.time, Game.S.fatigue);
    anim = { fx: p.x, fy: p.y, tx: nx, ty: ny, t0: performance.now(), dur: 160 / (Game.S.opts.speed || 1) };
    p.x = nx; p.y = ny;
    Game.S.loc.x = nx; Game.S.loc.y = ny;
    Game.passTime(Math.round(hours * 60));
    Game.S.fatigue += hours;
    reveal();
    O.draw();
    UI.updateStatus();
    if (Game.S.fatigue > 16 && !O._tiredWarned) { O._tiredWarned = true; UI.log('The party is exhausted and travels slowly. Make camp soon.', 'warn'); }
    var st = O.siteAt(nx, ny);
    setTimeout(function () {
      if (st) { O.visit(st.s, st.i); return; }
      if (Math.random() < Wilds.encounterChance(ch2, Game.S.time, Game.S.fatigue)) O.encounter(ch2);
    }, 170);
  };

  /* ---------- encounters ---------- */
  O.randomGroup = function (terrain) {
    var list = (wild().encounters || []).filter(function (e) { return !terrain || e.terrain === terrain || e.terrain === '*'; });
    if (!list.length) list = wild().encounters || [];
    if (!list.length) return null;
    var tot = 0; list.forEach(function (e) { tot += e.w || 1; });
    var r = Math.random() * tot, pick = list[0];
    for (var i = 0; i < list.length; i++) { r -= list[i].w || 1; if (r < 0) { pick = list[i]; break; } }
    return pick.g.map(function (e) { return [e[0], Math.max(1, e[1] + Math.floor(Math.random() * 3) - 1)]; });
  };
  O.encounter = function (terrain) {
    if (Math.random() < 0.18) { traveller(); return; }
    var g = O.randomGroup(terrain === 'b' ? '=' : terrain);
    if (!g) return;
    var name = Watch.groupName({ f: { g: g } });
    g.forEach(function (e) { Bestiary.see(e[0]); });
    var night = Wilds.isNight(Game.S.time);
    var surprise = Math.random() < (night ? 0.3 : 0.15) && !Game.party().some(function (p) { return p.cls === 'ranger' && Game.able(p); }) ? 'monsters' : (Math.random() < 0.15 ? 'party' : null);
    if (surprise === 'monsters') { UI.log('Ambush! ' + cap(name) + ' attack!', 'bad'); Game.fight([{ entries: g }], 'monsters'); return; }
    UI.choice('Encounter', 'The party encounters ' + name + (night ? ' in the darkness' : '') + '.', [
      { label: 'Fight', fn: function () { Game.fight([{ entries: g }], surprise); } },
      { label: 'Try to evade them', fn: function () {
        var slowest = Math.min.apply(null, Game.ableParty().map(function (p) { return Data.derive(p).move; }));
        var their = Math.max.apply(null, g.map(function (e) { return Monsters.byId[e[0]].mv; }));
        var chance = 45 + (slowest - their) * 5 + (Game.party().some(function (p) { return p.cls === 'ranger'; }) ? 15 : 0);
        if (Rules.d(100) <= chance) { UI.log('The party slips away unseen.', 'good'); }
        else { UI.log('They catch you!', 'bad'); Game.fight([{ entries: g }], null); }
      } }
    ]);
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function traveller() {
    var t = Wilds.TRAVELLERS[Math.floor(Math.random() * Wilds.TRAVELLERS.length)];
    var after = function () { };
    if (t.act === 'trade') { UI.alert('A Traveller', t.text, function () { UI.shop('A Merchant\'s Wagon', 'trader', Game.adv.band); }); return; }
    if (t.act === 'heal') { Game.party().forEach(function (p) { if (Game.alive(p) && p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + Rules.d(8)); }); UI.renderRoster(); }
    if (t.act === 'herbs') { Game.party().forEach(function (p) { if (Game.alive(p)) { delete p.status.poisoned; if (p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + 2); } }); UI.renderRoster(); }
    var text = t.text;
    if (t.act === 'rumour' || t.act === 'herbs') { var r = Game.adv.rumours[Math.floor(Math.random() * Game.adv.rumours.length)]; text += '\n\n"' + r + '"'; Game.note('Heard from ' + t.name + ': ' + r); }
    UI.alert('A Traveller', text, after);
  }
  O.afterFlee = function () {
    var a = Game.advState(), p = a.wildPos;
    UI.log('You run until the danger is behind you.', 'warn');
    Game.passTime(60);
    O.draw();
  };

  /* ---------- sites ---------- */
  O.enterSite = function () {
    if (Game.mode !== 'wild') return;
    var p = pos(), st = O.siteAt(p.x, p.y);
    if (!st) { UI.toast('There is nothing here to visit.'); return; }
    O.visit(st.s, st.i);
  };
  O.visit = function (site, i) {
    var st = O.siteState(i), adv = Game.adv;
    if (!st.visited) { st.visited = true; if (site.kind !== 'town') Game.note('Discovered ' + site.name + '.'); }
    if (site.kind === 'town') {
      UI.confirm(site.name, 'Enter ' + site.name + '?', function () { var e = site.entry || adv.start; Game.enterMap(site.map, e.x, e.y, e.dir); Game.autosave(); });
    } else if (site.kind === 'dungeon') {
      if (!O.lockOpen(site.lock)) { UI.alert(site.name, site.lockText || 'The way is sealed.'); return; }
      UI.confirm(site.name, 'Enter ' + site.name + '?', function () { var e = site.entry; Game.enterMap(site.map, e.x, e.y, e.dir || 0); Game.autosave(); });
    } else if (site.kind === 'hamlet') UI.hamlet(site);
    else if (site.kind === 'healer') UI.temple(site.name, adv.band);
    else if (site.kind === 'holy') {
      if (!st.blessed) {
        st.blessed = true;
        var xp = site.xp || 50;
        UI.alert(site.name, 'The party pauses at ' + site.name + ' to pay its respects. A quiet strength settles over every heart.', function () { Game.giveXp(xp, true); Game.note('Paid respects at ' + site.name + ' (' + xp + ' experience).'); UI.updateAll(); });
      } else UI.alert(site.name, 'The holy place is quiet. You have already received its blessing.');
    } else if (site.kind === 'camp') {
      UI.choice(site.name, 'A sheltered spot where the party can rest without fear of attack.', [
        { label: 'Make camp', fn: function () { UI.camp(); } }, { label: 'Move on', fn: function () { } }
      ]);
    } else if (site.kind === 'lair') {
      if (st.cleared) { UI.alert(site.name, 'The lair lies empty, its former occupants dead.'); return; }
      var g = site.fight, name = Watch.groupName({ f: { g: g } });
      UI.choice(site.name, 'You find the lair of ' + name + '. Bones and refuse litter the ground.', [
        { label: 'Attack!', fn: function () {
          var grp = { entries: g, name: site.name, tt: site.tt || '', gp: site.gp, items: site.items, flag: site.flag, lair: true };
          Game.fight([grp], null, function (outcome) { if (outcome === 'victory') { st.cleared = true; O.draw(); } });
        } },
        { label: 'Leave quietly', fn: function () { } }
      ]);
    }
  };
  return O;
})();
