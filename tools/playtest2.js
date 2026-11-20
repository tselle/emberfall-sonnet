// Second headless play-test: traps, secret doors, locks, events, hunters,
// ambushes, training, temple, learning spells, camping and overland encounters.
const B = require('./browser');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await B.launch({ width: 1280, height: 800 });
  await b.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const out = [];
  const check = (n, v) => out.push((v ? 'PASS ' : 'FAIL ') + n);
  const E = (x) => b.eval(x);
  const closeAll = () => E(`(function(){ var n=0; while (UI.hasModal() && n++<30) { var t=UI.top(); var btn=(t.btns||[]).filter(function(x){return !x.disabled})[0]; if (t.opts.close===false && btn) { t.close(true); btn.fn&&btn.fn(t); } else if (t.opts.close===false) { var b2=t.el.querySelector('.menu .btn'); if (b2) b2.click(); else t.close(true); } else t.close(); } })()`);
  const fight = async () => { const t0 = Date.now(); while (Date.now() - t0 < 60000) { const st = await E(`(function(){ if (Game.mode!=='combat') return 'done'; var s=Combat.state(); if (UI.hasModal()) { UI.top().close(); } if (s && s.ui && s.ui.mode==='idle' && !s.autoAll) Combat.cmd('autoall'); return 'w'; })()`); if (st === 'done') return; await B.sleep(100); } };
  await E(`Game.startNew(UI.pregenParty()); UI.closeAll(); Game.startAdventure('E0'); UI.closeAll(); Game.S.opts.speed = 6;`);
  // trap: stand next to the pit at (8,9) in d1 and step onto it
  await E(`Game.enterMap('d1', 8, 8, 2)`); await B.sleep(200);
  const hpBefore = await E(`Game.party().reduce(function(a,p){return a+p.hp},0)`);
  await E(`Game.input('fwd')`); await B.sleep(500);
  check('trap alert shown', await E(`UI.hasModal() && /Trap/.test(UI.top().opts.title)`));
  await closeAll();
  check('trap did damage', hpBefore > await E(`Game.party().reduce(function(a,p){return a+p.hp},0)`));
  check('trap spent', await E(`Game.ms.traps[9*Game.map.w+8]==='gone'`));
  // secret door at (6,12): search from (5,12) until found
  await E(`Game.party().forEach(function(p){p.hp=p.hpMax;}); Game.enterMap('d1', 5, 12, 1)`);
  let found = false;
  for (let i = 0; i < 25 && !found; i++) { await E(`UI.closeAll(); Game.mode==='explore' && Game.search()`); await B.sleep(30); if (await E(`Game.mode==='combat'`)) { await fight(); await B.sleep(1200); await closeAll(); } found = await E(`!!Game.ms.found[12*Game.map.w+6]`); }
  check('secret door found by searching', found);
  // locked door: put a locked door in front and pick it
  await E(`UI.closeAll(); Game.enterMap('town', 1, 5, 1); Game.useStairs(false)`); await B.sleep(200);
  await E(`Game.cells[1*Game.map.w+2] = Modules.C.LOCKED; Game.pos={x:1,y:1,dir:1};`);
  await E(`Game.input('fwd')`); await B.sleep(200);
  check('locked door prompt', await E(`UI.hasModal() && /Locked/.test(UI.top().opts.title)`));
  await closeAll();
  // event with choices (E2 shades)
  await E(`UI.closeAll(); Game.startAdventure('E2'); UI.closeAll(); Game.enterMap('d2', 3, 9, 2)`); await B.sleep(200);
  await E(`Game.mons=[]; Game.input('fwd')`); await B.sleep(500);
  check('choice event shown', await E(`UI.hasModal() && /Kneeling/.test(UI.top().opts.title)`));
  await E(`UI.top().el.querySelector('.menu .btn').click()`); await B.sleep(100); await closeAll();
  check('event flag set', await E(`Game.flag('e2_rest')`));
  // hunting monsters close in and attack
  await E(`UI.closeAll(); Game.startAdventure('E0'); UI.closeAll(); Game.enterMap('d1', 9, 6, 2)`); await B.sleep(100);
  await E(`(function(){ var m=Game.mons.filter(function(x){return x.f.mode==='hunt'})[0]; m.st.x=9; m.st.y=8; m.st.noticed=true; })()`);
  await E(`Game.input('left')`); await B.sleep(300);
  await E(`Game.input('right')`); await B.sleep(300);
  await E(`Watch.afterStep()`); await B.sleep(400); await closeAll();
  check('hunters engaged', await E(`Game.mode==='combat'`));
  await fight(); await B.sleep(1200); await closeAll();
  // ambush: centipedes at (15,2)
  await E(`UI.closeAll(); Game.party().forEach(function(p){p.hp=p.hpMax;p.status={};}); Game.enterMap('d1', 15, 4, 0)`); await B.sleep(100);
  await E(`Game.input('fwd')`); await B.sleep(600); await closeAll();
  check('ambush triggered', await E(`Game.mode==='combat'`));
  await fight(); await B.sleep(1200); await closeAll();
  // training
  await E(`UI.closeAll(); var pc=Game.party()[0]; pc.xp=3000; Game.S.gold=5000; UI.train('Hall')`); await B.sleep(100);
  await E(`Array.prototype.filter.call(UI.top().body.querySelectorAll('button'), function(b){return /Train/.test(b.textContent) && !b.disabled})[0].click()`); await B.sleep(100);
  check('trained to level 2', await E(`Game.party()[0].lvl===2`));
  await closeAll();
  // temple raise dead
  await E(`UI.closeAll(); var pc=Game.party()[1]; pc.status.dead=true; pc.hp=-10; UI.temple('Temple',1)`); await B.sleep(100);
  await E(`Array.prototype.filter.call(UI.top().body.querySelectorAll('button'), function(b){return /Raise/.test(b.textContent)})[0].click()`); await B.sleep(100);
  check('raised dead at temple', await E(`!Game.party()[1].status.dead && Game.party()[1].hp===1`));
  await closeAll();
  // learning a spell from a scroll; Learn button greyed for known spells
  await E(`UI.closeAll(); var m=Game.party()[5]; m.ab.int=19; m.inv.push(Data.makeItem('scroll_web')); m.inv.push(Data.makeItem('scroll_sleep')); UI.sheet(5,'items')`); await B.sleep(100);
  const greyed = await E(`(function(){ var m=Game.party()[5]; var idx=m.inv.findIndex(function(i){return i.id==='scroll_sleep'}); var rows=UI.top().body.querySelectorAll('tr.click'); rows[idx].click(); var b=Array.prototype.filter.call(UI.top().body.querySelectorAll('button'), function(b){return /^Learn/.test(b.textContent)})[0]; return b && b.disabled; })()`);
  check('learn greyed for known spell', greyed);
  await E(`(function(){ var m=Game.party()[5]; var idx=m.inv.findIndex(function(i){return i.id==='scroll_web'}); UI.top().body.querySelectorAll('tr.click')[idx].click(); var b=Array.prototype.filter.call(UI.top().body.querySelectorAll('button'), function(b){return /^Learn/.test(b.textContent)})[0]; for (var k=0;k<10 && Game.party()[5].book.indexOf('web')<0;k++){ Game.party()[5].learnFail={}; UI.learnScroll(Game.party()[5], Game.party()[5].inv.findIndex(function(i){return i.id==='scroll_web'}), function(){}); } })()`);
  check('learned web', await E(`Game.party()[5].book.indexOf('web')>=0`));
  await closeAll();
  // rest until healed with clerical healing
  await E(`UI.closeAll(); Game.enterMap('d1', 1, 1, 1); Game.party().forEach(function(p){ p.hp=Math.max(1, Math.floor(p.hpMax/3)); });`);
  await E(`Game.restUntilHealed(true, function(l,d){ window._rest=[l.length,d]; })`); await B.sleep(200);
  check('rest until healed', await E(`Game.party().every(function(p){return p.status.dead || p.hp===p.hpMax})`));
  // camp interrupted by wanderers (force the roll)
  await E(`Math._r=Math.random; Math.random=function(){return 0.001}; Game.rest(8,false); Math.random=Math._r;`); await B.sleep(500); await closeAll();
  check('camp interrupted -> combat', await E(`Game.mode==='combat'`));
  await fight(); await B.sleep(1200); await closeAll();
  // overland random encounter
  await E(`UI.closeAll(); Game.party().forEach(function(p){p.hp=p.hpMax;p.status={};}); Game.exitToWild(); Overland.encounter('f')`); await B.sleep(300);
  const enc = await E(`UI.hasModal() ? UI.top().opts.title : Game.mode`);
  check('overland encounter: ' + enc, enc === 'Encounter' || enc === 'A Traveller' || enc === 'combat');
  await closeAll(); if (await E(`Game.mode==='combat'`)) { await fight(); await B.sleep(1200); await closeAll(); }
  // quest reward pays a quarter of the listed xp to each survivor
  await E(`UI.closeAll(); Game.advState().quests['q_e0_pip']='active'; Game.setFlag('e0_pip'); window._xp=Game.party().map(function(p){return p.xp});`);
  await E(`Journal.reward(Game.adv.quests.filter(function(q){return q.id==='q_e0_pip'})[0])`); await closeAll();
  const gain = await E(`Game.party().map(function(p,i){return p.xp-window._xp[i]})`);
  check('quest xp quarter (' + gain.join(',') + ')', gain.every(g => g === 0 || Math.abs(g - 200) <= 21));
  // a locked site opens when its flag is set
  check('cove locked before', !(await E(`Overland.lockOpen('e0_cove')`)));
  await E(`Game.setFlag('e0_cove')`);
  check('cove open after', await E(`Overland.lockOpen('e0_cove')`));
  await b.shot(OUT + '/p2-end.png');
  console.log(out.join('\n'));
  console.log('JS errors:', b.errors.length ? b.errors.join('\n') : 'none');
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
