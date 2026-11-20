// Content validator: every referenced monster and item exists, every map is
// reachable, every exit and site lands on a valid square, dungeon levels have
// 1-3 secret doors and 2-3 traps, and generation is deterministic.
const load = require('./load');
const ctx = load();
const { Modules, Data, Monsters, Rules, Treasure } = ctx;
let errors = 0, warnings = 0;
const t0 = Date.now();
const counts = { adventures: 0, maps: 0, dungeonLevels: 0, secrets: 0, traps: 0 };
for (const adv of Modules.list) {
  const res = Modules.validate(adv);
  counts.adventures++;
  for (const m of Object.values(adv.maps)) {
    counts.maps++;
    if (m.type === 'dungeon') counts.dungeonLevels++;
  }
  res.errors.forEach(e => { console.log('ERROR', e); errors++; });
  res.warnings.forEach(w => { warnings++; });
}
// item sanity
for (const it of Data.itemList) {
  if (it.type === 'scroll' && it.spell && !Rules.SPELLS[it.spell]) { console.log('ERROR scroll with unknown spell', it.id); errors++; }
  if (it.type === 'wand' && it.spell && !Rules.SPELLS[it.spell]) { console.log('ERROR wand with unknown spell', it.id); errors++; }
  if (it.uses) it.uses.forEach(s => { if (!Rules.SPELLS[s]) { console.log('ERROR item uses unknown spell', it.id, s); errors++; } });
}
for (const p of Data.PREGENS) for (const k of p.kit) if (!Data.items[k]) { console.log('ERROR pregen kit item', k); errors++; }
for (const m of Monsters.list) {
  (m.spells || []).forEach(s => { if (!Rules.SPELLS[s]) { console.log('ERROR monster', m.id, 'casts unknown spell', s); errors++; } });
  m.att.forEach(a => { if (!/^\d*d?\d+([+-]\d+)?$/.test(a)) { console.log('ERROR monster', m.id, 'bad attack', a); errors++; } });
  if (!m.fig) { console.log('ERROR monster without figure', m.id); errors++; }
}
// shops
for (let b = 1; b <= 5; b++) for (const k of ['smith', 'magic', 'trader']) Data.shopStock(k, b).forEach(id => { if (!Data.items[id]) { console.log('ERROR shop item', id); errors++; } });
// determinism: build a second copy and compare generated adventures
const ctx2 = load();
let diffs = 0;
for (const adv of Modules.list) {
  if (!adv.generated) continue;
  const b = ctx2.Modules.get(adv.id);
  ctx2.Modules.ensureBuilt(b);
  const a1 = JSON.stringify({ n: adv.name, m: adv.maps, w: adv.wild, q: adv.quests });
  const a2 = JSON.stringify({ n: b.name, m: b.maps, w: b.wild, q: b.quests });
  if (a1 !== a2) { console.log('ERROR non-deterministic adventure', adv.id); diffs++; errors++; }
}
const bands = {};
Modules.list.forEach(a => { const k = a.band + (a.generated ? ' gen' : ' hand'); bands[k] = (bands[k] || 0) + 1; });
console.log(`Items: ${Data.itemList.length}  Monsters: ${Monsters.list.length}  Spells: ${Rules.SPELL_LIST.length} (wizard ${Rules.SPELL_LIST.filter(s=>s.cls==='wiz').length}, priest ${Rules.SPELL_LIST.filter(s=>s.cls==='pri').length})`);
console.log(`Adventures: ${counts.adventures}  Maps: ${counts.maps}  Dungeon levels: ${counts.dungeonLevels}`);
console.log('By band:', JSON.stringify(bands));
console.log(`${errors} errors, ${warnings} warnings (${Date.now() - t0} ms)`);
process.exit(errors ? 1 : 0);
