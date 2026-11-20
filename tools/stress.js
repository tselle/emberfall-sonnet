// Stress test in headless Chrome: every map of every adventure is entered and
// rendered, and hundreds of automatic battles are fought across all level bands
// with spell-casting parties, checking that every battle ends without errors.
const B = require('./browser');
const path = require('path');
(async () => {
  const b = await B.launch({ width: 1280, height: 800 });
  await b.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  // 1. every map renders
  const maps = await b.eval(`(function(){
    Game.startNew(UI.pregenParty()); UI.closeAll();
    var n=0, errs=[];
    Modules.list.forEach(function(adv){
      try {
        Game.startAdventure(adv.id); UI.closeAll();
        Object.keys(adv.maps).forEach(function(mid){
          var m = Modules.map(adv.id, mid);
          var p = m.upAt || m.exits[0] || m.downAt || adv.start;
          Game.enterMap(mid, p.x, p.y, 1, true);
          View3D.render(p.x+0.5, p.y+0.5, 1, Game.sprites(), 0); MapView.mini(); n++;
        });
        Game.enterWild(null, null, true); Overland.draw(); MapView.mini();
      } catch(e) { errs.push(adv.id+': '+e.message); }
    });
    return {n:n, errs:errs};
  })()`);
  console.log('maps rendered:', maps.n, 'errors:', maps.errs.length ? maps.errs : 'none');
  // 2. auto-battles per band with a levelled party
  const res = await b.eval(`(async function(){
    function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    Game.S.opts.speed = 40;
    var out = { fights: 0, wins: 0, fled: 0, defeat: 0, stuck: 0, byBand: {} };
    function party(lvl) {
      var p = UI.pregenParty();
      p.forEach(function(pc){
        pc.xp = Rules.xpFor(pc.cls, lvl);
        while (pc.lvl < lvl && Rules.gainLevel(pc)) {}
        pc.hp = pc.hpMax;
        if (pc.cls === 'mage') pc.book = Rules.spellsOf('wiz').filter(function(s){ return s.lvl <= Data.derive(pc).slots.length; }).map(function(s){ return s.id; });
        Game.autoMemorize(pc);
        // gear up to the band
        var plus = Math.min(5, Math.floor(lvl / 4));
        if (plus > 0) pc.inv.forEach(function(i){ var it = Data.items[i.id]; if (it.type === 'weapon' && !it.missile && Data.items[it.base + '_' + plus]) i.id = it.base + '_' + Math.min(plus, 3); });
      });
      return p;
    }
    for (var band = 1; band <= 5; band++) {
      var lvl = (band - 1) * 4 + 2 + Math.floor(Math.random()*3);
      var bb = out.byBand[band] = { w: 0, l: 0, f: 0 };
      var advs = Modules.list.filter(function(a){ return a.band === band && a.generated; });
      for (var i = 0; i < 12; i++) {
        var adv = advs[i % advs.length];
        Game.S.party = party(lvl);
        Game.startAdventure(adv.id); UI.closeAll();
        // pick a monster group from a dungeon level of this adventure
        var mids = Object.keys(adv.maps).filter(function(k){ return k !== 'town'; });
        var mid = mids[i % mids.length], def = adv.maps[mid];
        var groups = def.feats.filter(function(f){ return f.t === 'mon'; });
        var g = groups[i % groups.length];
        var m = Modules.map(adv.id, mid);
        Game.enterMap(mid, m.upAt.x, m.upAt.y, 1, true);
        var mon = Game.mons.filter(function(x){ return x.f === g || (x.f.x === g.x && x.f.y === g.y); })[0] || Game.mons[0];
        out.fights++;
        var done = null;
        Game.fight([{ entries: mon.f.g, name: mon.f.name, mon: mon }], null, function(o){ done = o || 'victory'; });
        var t0 = Date.now();
        while (Game.mode === 'combat' && Date.now() - t0 < 45000) {
          var s = Combat.state();
          if (UI.hasModal()) UI.top().close();
          if (s && s.ui && s.ui.mode === 'idle' && !s.autoAll) Combat.cmd('autoall');
          await sleep(20);
        }
        if (Game.mode === 'combat') { out.stuck++; continue; }
        await sleep(50);
        while (UI.hasModal()) { var t = UI.top(); if (t.opts.close === false) { var bt=(t.btns||[])[0]; t.close(true); if (bt && /fallen/i.test(t.opts.title||'')) { out.defeat++; bb.l++; UI._over=false; break; } } else t.close(); }
        if (Game.living().filter(function(p){return p.hp>0}).length) { out.wins++; bb.w++; } else { bb.l++; }
        UI._over = false;
      }
    }
    return out;
  })()`);
  console.log('battles:', JSON.stringify(res));
  // 3. every spell cast in combat by a high-level party against a mixed group
  const spells = await b.eval(`(async function(){
    function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    var bad = [];
    var p = UI.pregenParty(); p.forEach(function(pc){ pc.xp = Rules.xpFor(pc.cls, 18); while (pc.lvl < 18 && Rules.gainLevel(pc)) {} pc.hp = pc.hpMax; });
    Game.S.party = p; Game.startAdventure('G5-01'); UI.closeAll();
    var mage = p[5], cleric = p[3];
    var list = Rules.SPELL_LIST.filter(function(s){ return s.combat && s.aim !== 'dead'; });
    for (var i = 0; i < list.length; i++) {
      var sp = list[i];
      Game.S.party.forEach(function(pc){ pc.hp = pc.hpMax; pc.status = {}; });
      Game.fight([{ entries: [['ogre', 2], ['skeleton', 2], ['troll', 1]] }], null, function(){});
      await sleep(400);
      var s = Combat.state();
      if (!s) { bad.push(sp.id + ': no combat'); continue; }
      try {
        var caster = s.units.filter(function(u){ return u.pc === (sp.cls === 'wiz' ? mage : cleric); })[0];
        var foe = s.units.filter(function(u){ return u.side === 'mon' && u.alive; })[0];
        Combat._cast(caster, sp, foe.x, foe.y);
      } catch (e) { bad.push(sp.id + ': ' + e.message); }
      s.over = true; Game.mode = 'explore'; UI.show('game');
      await sleep(20);
    }
    return { tested: list.length, bad: bad };
  })()`);
  console.log('spells:', JSON.stringify(spells));
  console.log('JS errors:', b.errors.length ? b.errors.slice(0, 20).join('\n') : 'none');
  await b.close();
})().catch(e => { console.error('STRESS CRASH', e); process.exit(2); });
