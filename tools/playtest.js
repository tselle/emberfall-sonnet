// Headless play-test: drives the real game in Chrome through its main flows.
// node tools/playtest.js [outdir]
const B = require('./browser');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
let step = 0;
async function shot(b, name) { step++; await b.shot(`${OUT}/${String(step).padStart(2, '0')}-${name}.png`); }
async function until(b, expr, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await b.eval(expr)) return true; await B.sleep(100); }
  throw new Error('timeout waiting for ' + expr);
}
async function fightAuto(b) {
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const st = await b.eval(`(function(){ if (Game.mode!=='combat') return 'done'; var s=Combat.state(); if(!s) return 'ending'; if (UI.hasModal()) { UI.top().close(); return 'modal'; } if (s.ui && s.ui.mode==='idle' && !s.autoAll) { Combat.cmd('autoall'); return 'auto'; } return 'wait'; })()`);
    if (st === 'done') return;
    await B.sleep(150);
  }
  throw new Error('combat did not finish');
}
async function closeModals(b) { await b.eval(`(function(){ var n=0; while (UI.hasModal() && n++<20) { var t=UI.top(); var btn=(t.btns||[]).filter(function(x){return !x.disabled})[0]; if (btn && t.opts.close===false) { t.close(true); btn.fn&&btn.fn(t); } else t.close(); } return n; })()`); }
(async () => {
  const b = await B.launch({ width: 1280, height: 800 });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await b.goto(url);
  const out = [];
  const check = (name, v) => { out.push((v ? 'PASS ' : 'FAIL ') + name); };
  check('title visible', await b.eval(`document.getElementById('title').classList.contains('active')`));
  // party creation dialog
  await b.eval(`UI.partyCreate()`); await B.sleep(200);
  await b.eval(`UI.createChar(function(pc){ window._made = pc; })`); await B.sleep(200);
  await shot(b, 'create-char');
  await closeModals(b);
  await b.eval(`Game.startNew(UI.pregenParty())`); await B.sleep(300);
  await shot(b, 'campaign');
  await b.eval(`UI.closeAll(); Game.startAdventure('E0')`); await B.sleep(600);
  check('in town', await b.eval(`Game.mode==='explore' && Game.map.id==='town'`));
  // commission hall
  await b.eval(`UI.hall('Moot Hall')`); await B.sleep(200);
  await shot(b, 'hall');
  await b.eval(`UI.top().btns[0].fn(UI.top())`); await closeModals(b);
  check('quests accepted', await b.eval(`Object.keys(Game.advState().quests).length===4`));
  // shop and buy
  await b.eval(`UI.shop('Hobb the Smith','smith',1,['silver_dagger'])`); await B.sleep(200);
  await shot(b, 'shop');
  await closeModals(b);
  // walk around town with real input
  for (const k of ['d','w','w','w','a','w','w']) { await b.key(k); await B.sleep(260); }
  await shot(b, 'town-walk');
  check('moved in town', await b.eval(`Game.pos.x!==1 || Game.pos.y!==5`));
  // character sheet
  await b.key('1'); await B.sleep(250); await shot(b, 'sheet-stats');
  await b.eval(`UI.closeAll(); UI.sheet(5,'spells')`); await B.sleep(200); await shot(b, 'sheet-spells');
  await b.eval(`UI.closeAll(); UI.sheet(1,'items')`); await B.sleep(200); await shot(b, 'sheet-items');
  await closeModals(b);
  // down into the cellars
  await b.eval(`Game.useStairs(false)`); await B.sleep(500);
  check('entered d1', await b.eval(`Game.map.id==='d1'`));
  await shot(b, 'dungeon');
  // search a few times near the start, then walk
  await b.eval(`Game.search()`); await B.sleep(200);
  for (const k of ['s','s','d','w','w']) { await b.key(k); await B.sleep(260); await closeModals(b); }
  await shot(b, 'dungeon-walk');
  // fight the nearest group
  await b.eval(`(function(){ var m=Game.mons.filter(function(x){return x.f.mode!=='ambush'})[0]; Game.engage(m,null); })()`);
  await B.sleep(300);
  await closeModals(b);
  await until(b, `Game.mode==='combat'`);
  await B.sleep(800);
  await shot(b, 'combat');
  await fightAuto(b);
  await B.sleep(1200);
  await shot(b, 'after-combat');
  await closeModals(b);
  check('combat ended', await b.eval(`Game.mode==='explore'`));
  check('party alive', await b.eval(`Game.living().length>0`));
  // a second fight using player commands: attack with first PC manually
  await b.eval(`(function(){ var m=Game.mons.filter(function(x){return x.f.mode!=='ambush'})[0]; if(m) Game.engage(m,null); })()`);
  await B.sleep(300); await closeModals(b);
  if (await b.eval(`Game.mode==='combat'`)) {
    // wait for a PC turn and try a spell menu & cancel, then auto
    await until(b, `!Combat.state() || (Combat.state().ui && Combat.state().ui.mode==='idle')`, 30000).catch(()=>{});
    await b.eval(`Combat.state() && Combat.cmd('attack')`); await B.sleep(200);
    await shot(b, 'combat-target');
    await b.eval(`Combat.state() && Combat.cmd('cancel')`);
    await fightAuto(b); await B.sleep(1200); await closeModals(b);
  }
  // camp
  await b.eval(`Game.rest(8, true)`); await B.sleep(100);
  check('rested', await b.eval(`Game.S.time > 8*60+480`));
  // save and load
  await b.eval(`Game.save('1')`); await B.sleep(100);
  const posBefore = await b.eval(`JSON.stringify([Game.map.id,Game.pos.x,Game.pos.y])`);
  await b.eval(`Game.load('1')`); await B.sleep(500);
  check('save/load position', posBefore === await b.eval(`JSON.stringify([Game.map.id,Game.pos.x,Game.pos.y])`));
  // panels
  await b.eval(`MapView.open()`); await B.sleep(200); await shot(b, 'map'); await closeModals(b);
  await b.eval(`Journal.open()`); await B.sleep(200); await shot(b, 'journal'); await closeModals(b);
  await b.eval(`Bestiary.open()`); await B.sleep(200); await shot(b, 'bestiary'); await closeModals(b);
  await b.eval(`UI.howToPlay()`); await B.sleep(200); await closeModals(b);
  // overland
  await b.eval(`Game.useStairs(true)`); await B.sleep(400);
  await b.eval(`Game.exitToWild()`); await B.sleep(500);
  check('overland', await b.eval(`Game.mode==='wild'`));
  await shot(b, 'overland');
  for (const k of ['w','w','d','d','s']) { await b.key(k); await B.sleep(300); await closeModals(b); if (await b.eval(`Game.mode==='combat'`)) { await fightAuto(b); await B.sleep(1200); await closeModals(b); } }
  await shot(b, 'overland-moved');
  // visit each kind of site
  await b.eval(`(function(){ var s=Game.adv.wild.sites; var h=s.filter(function(x){return x.kind==='hamlet'})[0]; Overland.visit(h, s.indexOf(h)); })()`); await B.sleep(200); await shot(b, 'hamlet'); await closeModals(b);
  await b.eval(`(function(){ var s=Game.adv.wild.sites; var h=s.filter(function(x){return x.kind==='holy'})[0]; Overland.visit(h, s.indexOf(h)); })()`); await B.sleep(200); await closeModals(b);
  await b.eval(`(function(){ var s=Game.adv.wild.sites; var h=s.filter(function(x){return x.kind==='dungeon'})[0]; Overland.visit(h, s.indexOf(h)); })()`); await B.sleep(200); await shot(b, 'locked-site'); await closeModals(b);
  // lair fight
  await b.eval(`(function(){ var s=Game.adv.wild.sites; var h=s.filter(function(x){return x.kind==='lair'})[0]; Overland.visit(h, s.indexOf(h)); setTimeout(function(){ var t=UI.top(); if(t) { t.close(true); Game.fight([{entries:h.fight,name:h.name,gp:h.gp,items:h.items,lair:true}], null, function(o){ window._lair=o; }); } }, 100); })()`);
  await B.sleep(600);
  if (await b.eval(`Game.mode==='combat'`)) { await shot(b, 'wild-combat'); await fightAuto(b); await B.sleep(1300); await closeModals(b); }
  // campaign to a generated adventure
  await b.eval(`Game.startAdventure('G3-08')`); await B.sleep(700);
  check('generated adventure', await b.eval(`Game.adv.id==='G3-08' && Game.mode==='explore'`));
  await shot(b, 'generated-town');
  await b.eval(`Game.useStairs ? Game.exitToWild() : 0`); await B.sleep(400);
  await shot(b, 'generated-wild');
  await b.eval(`(function(){ var s=Game.adv.wild.sites.filter(function(x){return x.kind==='dungeon'})[0]; Game.enterMap(s.map, s.entry.x, s.entry.y, 1); })()`); await B.sleep(500);
  await shot(b, 'generated-dungeon');
  // phone portrait layout
  await b.resize(390, 844, true); await b.eval(`UI.layout(); Game.redraw()`); await B.sleep(400);
  await shot(b, 'phone-portrait');
  await b.resize(844, 390, true); await b.eval(`UI.layout(); Game.redraw()`); await B.sleep(400);
  await shot(b, 'phone-landscape');
  await b.resize(810, 1080, true); await b.eval(`UI.layout(); Game.redraw()`); await B.sleep(400);
  await shot(b, 'ipad-portrait');
  console.log(out.join('\n'));
  console.log('JS errors:', b.errors.length ? b.errors.join('\n') : 'none');
  await b.close();
  process.exit(out.some(l => l.startsWith('FAIL')) || b.errors.length ? 1 : 0);
})().catch(async e => { console.error('PLAYTEST CRASH', e); process.exit(2); });
