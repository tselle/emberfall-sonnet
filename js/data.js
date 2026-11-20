/* Emberfall — data.js
 * Item catalogue (~330 entries), item helpers, shop stock by level band,
 * ready-made company and name lists. */
var Data = (function () {
  'use strict';
  var D = {};
  D.items = {};
  D.itemList = [];

  function add(o) {
    if (D.items[o.id]) throw new Error('Duplicate item ' + o.id);
    if (o.weight == null) o.weight = 1;
    if (o.value == null) o.value = 1;
    D.items[o.id] = o; D.itemList.push(o);
    return o;
  }
  D.addItem = add;

  /* ---------- weapons ---------- */
  // id, name, dmg S/M, dmg L, weight, value, kind, hands, extra
  var WEAPONS = [
    ['dagger', 'Dagger', '1d4', '1d3', 1, 2, 'blade', 1, { thrown: 3, small: true }],
    ['dart', 'Darts', '1d3', '1d2', 0.5, 1, 'missile', 1, { thrown: 4, rof: 3, stack: true, small: true }],
    ['short_sword', 'Short Sword', '1d6', '1d8', 3, 10, 'blade', 1, { small: true }],
    ['long_sword', 'Long Sword', '1d8', '1d12', 4, 15, 'blade', 1, {}],
    ['broad_sword', 'Broad Sword', '2d4', '1d6+1', 4, 10, 'blade', 1, {}],
    ['bastard_sword', 'Bastard Sword', '2d4', '2d8', 10, 25, 'blade', 2, {}],
    ['two_handed_sword', 'Two-Handed Sword', '1d10', '3d6', 15, 50, 'blade', 2, {}],
    ['scimitar', 'Scimitar', '1d8', '1d8', 4, 15, 'blade', 1, {}],
    ['hand_axe', 'Hand Axe', '1d6', '1d4', 5, 1, 'axe', 1, { thrown: 3, small: true }],
    ['battle_axe', 'Battle Axe', '1d8', '1d8', 7, 5, 'axe', 1, {}],
    ['mace', 'Mace', '1d6+1', '1d6', 10, 8, 'blunt', 1, {}],
    ['morning_star', 'Morning Star', '2d4', '1d6+1', 12, 10, 'blunt', 1, {}],
    ['flail', 'Flail', '1d6+1', '2d4', 15, 15, 'blunt', 1, {}],
    ['war_hammer', 'War Hammer', '1d4+1', '1d4', 6, 2, 'blunt', 1, {}],
    ['club', 'Club', '1d6', '1d3', 3, 1, 'blunt', 1, {}],
    ['quarterstaff', 'Quarterstaff', '1d6', '1d6', 4, 1, 'blunt', 2, {}],
    ['spear', 'Spear', '1d6', '1d8', 5, 8, 'pole', 1, { thrown: 3 }],
    ['halberd', 'Halberd', '1d10', '2d6', 15, 10, 'pole', 2, {}],
    ['trident', 'Trident', '1d6+1', '3d4', 5, 15, 'pole', 1, {}],
    ['javelin', 'Javelins', '1d6', '1d6', 2, 1, 'missile', 1, { thrown: 6, stack: true }],
    ['sling', 'Sling', '1d4+1', '1d6+1', 1, 1, 'missile', 1, { ammo: 'bullet', range: 12, rof: 1 }],
    ['short_bow', 'Short Bow', '1d6', '1d6', 2, 30, 'missile', 2, { ammo: 'arrow', range: 15, rof: 2 }],
    ['long_bow', 'Long Bow', '1d6', '1d6', 3, 75, 'missile', 2, { ammo: 'arrow', range: 21, rof: 2 }],
    ['light_crossbow', 'Light Crossbow', '1d4+1', '1d6+1', 7, 35, 'missile', 2, { ammo: 'quarrel', range: 18, rof: 1 }]
  ];
  WEAPONS.forEach(function (w) {
    var o = { id: w[0], name: w[1], type: 'weapon', slot: 'weapon', base: w[0], dmg: [w[2], w[3]], weight: w[4], value: w[5], kind: w[6], hands: w[7], plus: 0 };
    for (var k in w[8]) o[k] = w[8][k];
    if (o.ammo) o.missile = true;
    add(o);
  });
  add({ id: 'arrow', name: 'Arrows', type: 'ammo', slot: 'ammo', ammo: 'arrow', dmg: ['1d6', '1d6'], weight: 0.1, value: 0.15, stack: true, plus: 0 });
  add({ id: 'quarrel', name: 'Quarrels', type: 'ammo', slot: 'ammo', ammo: 'quarrel', dmg: ['1d4+1', '1d6+1'], weight: 0.1, value: 0.1, stack: true, plus: 0 });
  add({ id: 'bullet', name: 'Sling Bullets', type: 'ammo', slot: 'ammo', ammo: 'bullet', dmg: ['1d4+1', '1d6+1'], weight: 0.1, value: 0.05, stack: true, plus: 0 });

  // magic weapon variants: base id -> max plus
  var MAGIC_W = { dagger: 3, short_sword: 3, long_sword: 5, broad_sword: 2, bastard_sword: 2, two_handed_sword: 3, scimitar: 3, hand_axe: 2, battle_axe: 3, mace: 4, morning_star: 2, flail: 3, war_hammer: 3, quarterstaff: 3, spear: 3, halberd: 2, trident: 2, sling: 1, short_bow: 2, long_bow: 3, light_crossbow: 2, dart: 3, javelin: 2 };
  var PLUS_VALUE = [0, 400, 1500, 4000, 9000, 18000];
  Object.keys(MAGIC_W).forEach(function (b) {
    var base = D.items[b];
    for (var p = 1; p <= MAGIC_W[b]; p++) {
      var o = JSON.parse(JSON.stringify(base));
      o.id = b + '_' + p; o.name = base.name + ' +' + p; o.plus = p; o.magic = true;
      o.value = base.value + PLUS_VALUE[p] * (base.stack ? 0.02 : 1);
      add(o);
    }
  });
  [['arrow', 3], ['quarrel', 2], ['bullet', 1]].forEach(function (a) {
    var base = D.items[a[0]];
    for (var p = 1; p <= a[1]; p++) {
      var o = JSON.parse(JSON.stringify(base));
      o.id = a[0] + '_' + p; o.name = base.name + ' +' + p; o.plus = p; o.magic = true; o.value = 20 * p * p;
      add(o);
    }
  });
  function named(id, base, plus, name, extra, value) {
    var b = D.items[base], o = JSON.parse(JSON.stringify(b));
    o.id = id; o.name = name; o.plus = plus; o.magic = true; o.value = value; o.named = true;
    for (var k in extra) o[k] = extra[k];
    add(o);
  }
  named('flamebrand', 'long_sword', 1, 'Flamebrand', { vs: { undead: 2, regen: 2 }, elDmg: { el: 'fire', dice: '1d6' }, desc: 'A long sword wreathed in dancing flame. +1, +3 against undead and regenerating creatures; burns for an extra 1d6.' }, 12000);
  named('frostbite', 'long_sword', 3, 'Frostbite', { vs: { fire: 3 }, resist: 'fire', desc: 'A blade rimed with ice. +3, +6 against fire-dwelling creatures, and wards its bearer from flame.' }, 16000);
  named('soulreaver', 'long_sword', 2, 'Soulreaver', { drainHit: true, desc: 'A black blade that drinks life: +2, and a natural 20 drains a level from the foe.' }, 18000);
  named('sacred_defender', 'long_sword', 5, 'Sacred Defender', { only: ['paladin'], save: 2, vs: { evil: 2 }, mr: 25, desc: 'The holiest of blades. +5 in a paladin\'s hands, +7 against evil, with +2 to saves and 25% magic resistance.' }, 50000);
  named('wyrmbane', 'long_sword', 2, 'Wyrmbane', { vs: { dragon: 2 }, mult: { dragon: 3 }, desc: 'A sword forged to slay dragons: +2, +4 and triple damage against them.' }, 15000);
  named('giantbane', 'two_handed_sword', 2, 'Giantbane', { vs: { giant: 2 }, mult: { giant: 2 }, desc: 'A massive blade notched by giant-bone: +2, and double damage against giants.' }, 14000);
  named('stormhammer', 'war_hammer', 3, 'Stormhammer', { only: ['fighter', 'paladin', 'ranger', 'cleric'], thrown: 4, returns: true, vs: { giant: 2 }, elDmg: { el: 'elec', dice: '1d6' }, desc: 'A hammer that returns to its wielder when thrown, crackling with lightning. +3.' }, 20000);
  named('disruptor', 'mace', 1, 'Mace of Disruption', { vs: { undead: 2 }, disrupt: true, desc: 'A mace that blasts undead to ash: +1, and undead struck must save or be destroyed.' }, 17500);
  named('keen_scimitar', 'scimitar', 3, 'Keen Scimitar', { critRange: 18, desc: 'A razor-sharp blade: +3, and rolls of 18-20 deal double damage.' }, 12000);
  named('silver_dagger', 'dagger', 0, 'Silvered Dagger', { silver: true, magic: false, desc: 'A dagger edged with silver. It can wound creatures that shrug off common steel.' }, 30);
  named('silver_mace', 'mace', 0, 'Silvered Mace', { silver: true, magic: false, desc: 'A mace with a silver-shod head, favoured by priests who hunt lycanthropes.' }, 60);
  named('silver_sword', 'long_sword', 0, 'Silvered Long Sword', { silver: true, magic: false, desc: 'A long sword with a silver-alloy edge.' }, 90);
  add({ id: 'silver_arrow', name: 'Silver Arrows', type: 'ammo', slot: 'ammo', ammo: 'arrow', dmg: ['1d6', '1d6'], weight: 0.1, value: 2, stack: true, plus: 0, silver: true });
  add({ id: 'silver_bullet', name: 'Silver Sling Bullets', type: 'ammo', slot: 'ammo', ammo: 'bullet', dmg: ['1d4+1', '1d6+1'], weight: 0.1, value: 1, stack: true, plus: 0, silver: true });
  named('javelin_lightning', 'javelin', 2, 'Javelins of Lightning', { elDmg: { el: 'elec', dice: '4d6' }, desc: 'Each throw bursts into lightning for an extra 4d6.' }, 3000);

  /* ---------- armour ---------- */
  var ARMOUR = [
    ['padded', 'Padded Armour', 8, 10, 4], ['leather', 'Leather Armour', 8, 15, 5], ['studded', 'Studded Leather', 7, 25, 20],
    ['ring_mail', 'Ring Mail', 7, 25, 100], ['hide', 'Hide Armour', 6, 30, 15], ['scale', 'Scale Mail', 6, 40, 120],
    ['chain', 'Chain Mail', 5, 40, 75], ['splint', 'Splint Mail', 4, 40, 80], ['banded', 'Banded Mail', 4, 35, 200],
    ['plate', 'Plate Mail', 3, 50, 600], ['field_plate', 'Field Plate', 2, 60, 2000], ['full_plate', 'Full Plate', 1, 70, 4000],
    ['elven_chain', 'Elven Chain', 5, 15, 5000]
  ];
  ARMOUR.forEach(function (a) { add({ id: a[0], name: a[1], type: 'armor', slot: 'armor', ac: a[2], weight: a[3], value: a[4], plus: 0, base: a[0] }); });
  add({ id: 'shield', name: 'Shield', type: 'shield', slot: 'shield', ac: 1, weight: 10, value: 10, plus: 0, base: 'shield' });
  var MAGIC_A = { leather: 2, studded: 1, ring_mail: 1, scale: 1, chain: 3, banded: 2, splint: 1, plate: 5, elven_chain: 3, shield: 5 };
  Object.keys(MAGIC_A).forEach(function (b) {
    var base = D.items[b];
    for (var p = 1; p <= MAGIC_A[b]; p++) {
      var o = JSON.parse(JSON.stringify(base));
      o.id = b + '_' + p; o.name = base.name + ' +' + p; o.plus = p; o.magic = true;
      o.value = base.value + PLUS_VALUE[p] * 1.2;
      add(o);
    }
  });

  /* ---------- potions ---------- */
  var POTIONS = [
    ['potion_healing', 'Potion of Healing', 150, { fx: 'heal', dice: '2d4+2' }, 'Restores 2d4+2 hit points.'],
    ['potion_extra_healing', 'Potion of Extra-Healing', 400, { fx: 'heal', dice: '6d4' }, 'Restores 6d4 hit points.'],
    ['potion_full_healing', 'Potion of Supreme Healing', 1500, { fx: 'heal', dice: 'full' }, 'Restores all hit points.'],
    ['potion_antidote', 'Antidote', 200, { fx: 'cure', cures: ['poisoned'] }, 'Neutralizes poison.'],
    ['potion_clarity', 'Elixir of Clarity', 300, { fx: 'cure', cures: ['blind', 'held', 'paralyzed', 'confused', 'afraid', 'web'] }, 'Clears the mind and frees the limbs.'],
    ['potion_vitality', 'Potion of Vitality', 350, { fx: 'cure', cures: ['diseased', 'weak'], heal: '1d8' }, 'Cures disease and weakness.'],
    ['potion_hill_giant', 'Potion of Hill Giant Strength', 400, { fx: 'buff', combat: true, buff: { id: 'giantstr', strSet: 19 } }, 'Strength of a hill giant (19) for one battle.'],
    ['potion_stone_giant', 'Potion of Stone Giant Strength', 600, { fx: 'buff', combat: true, buff: { id: 'giantstr', strSet: 20 } }, 'Strength of a stone giant (20) for one battle.'],
    ['potion_fire_giant', 'Potion of Fire Giant Strength', 900, { fx: 'buff', combat: true, buff: { id: 'giantstr', strSet: 22 } }, 'Strength of a fire giant (22) for one battle.'],
    ['potion_storm_giant', 'Potion of Storm Giant Strength', 1400, { fx: 'buff', combat: true, buff: { id: 'giantstr', strSet: 24 } }, 'Strength of a storm giant (24) for one battle.'],
    ['potion_speed', 'Potion of Speed', 500, { fx: 'buff', combat: true, buff: { id: 'haste', haste: true, ac: -1 } }, 'Hastes the drinker for one battle.'],
    ['potion_invisibility', 'Potion of Invisibility', 250, { fx: 'buff', combat: true, buff: { id: 'invis', invis: true } }, 'The drinker turns invisible.'],
    ['potion_heroism', 'Potion of Heroism', 300, { fx: 'buff', combat: true, buff: { id: 'hero', hit: 2, save: 1, fearless: true }, heal: '2d6' }, '+2 to hit, +1 to saves, fearless.'],
    ['potion_fire_res', 'Potion of Fire Resistance', 250, { fx: 'buff', combat: true, buff: { id: 'rfire', resist: 'fire' } }, 'Halves fire damage for one battle.'],
    ['potion_frost_ward', 'Potion of Frost Ward', 250, { fx: 'buff', combat: true, buff: { id: 'rcold', resist: 'cold' } }, 'Halves cold damage for one battle.'],
    ['potion_invulnerability', 'Potion of Invulnerability', 1000, { fx: 'buff', combat: true, buff: { id: 'invuln', ac: -2, save: 2 } }, 'AC 2 better and +2 to all saves for one battle.'],
    ['potion_restoration', 'Draught of Renewal', 3000, { fx: 'restore' }, 'Restores one level lost to energy drain.']
  ];
  POTIONS.forEach(function (p) { add({ id: p[0], name: p[1], type: 'potion', value: p[2], use: p[3], weight: 0.5, desc: p[4], magic: true }); });

  /* ---------- scrolls (one per spell) ---------- */
  Rules.SPELL_LIST.forEach(function (sp) {
    add({ id: 'scroll_' + sp.id, name: 'Scroll of ' + sp.name, type: 'scroll', spell: sp.id, scls: sp.cls, value: 100 + sp.lvl * sp.lvl * 150, weight: 0.1, magic: true, desc: (sp.cls === 'wiz' ? 'Arcane' : 'Divine') + ' scroll (level ' + sp.lvl + '). ' + sp.desc });
  });
  add({ id: 'scroll_ward_undead', name: 'Scroll of Ward against Undead', type: 'scroll', value: 1500, weight: 0.1, magic: true, use: { fx: 'buff', combat: true, party: true, buff: { id: 'wardund', vsType: 'undead', vsAc: -4 } }, desc: 'Any may read it: undead suffer -4 to hit the party for one battle.' });
  add({ id: 'scroll_ward_fire', name: 'Scroll of Ward against Fire', type: 'scroll', value: 1500, weight: 0.1, magic: true, use: { fx: 'buff', combat: true, party: true, buff: { id: 'rfire', resist: 'fire' } }, desc: 'Any may read it: the party resists fire for one battle.' });
  add({ id: 'scroll_ward_drain', name: 'Scroll of Ward against Draining', type: 'scroll', value: 2500, weight: 0.1, magic: true, use: { fx: 'buff', combat: true, party: true, buff: { id: 'warddrain', noDrain: true } }, desc: 'Any may read it: life-draining touches cannot steal levels for one battle.' });
  add({ id: 'scroll_ward_magic', name: 'Scroll of Ward against Magic', type: 'scroll', value: 4000, weight: 0.1, magic: true, use: { fx: 'buff', combat: true, party: true, buff: { id: 'wardmag', save: 4 } }, desc: 'Any may read it: +4 to every saving throw for one battle.' });

  /* ---------- wands, staves, rods ---------- */
  var WANDS = [
    ['wand_mm', 'Wand of Magic Missiles', 'magic_missile', 5, 20, 3000, 'mage'],
    ['wand_fire', 'Wand of Fire', 'fireball', 6, 12, 6000, 'mage'],
    ['wand_lightning', 'Wand of Lightning', 'lightning_bolt', 6, 12, 6000, 'mage'],
    ['wand_frost', 'Wand of Frost', 'cone_of_cold', 6, 10, 7500, 'mage'],
    ['wand_paralysis', 'Wand of Paralysis', 'hold_monster', 8, 10, 7000, 'mage'],
    ['wand_fear', 'Wand of Fear', 'fear', 6, 15, 3000, 'mage'],
    ['wand_slow', 'Wand of Slowness', 'slow', 6, 15, 4000, 'mage'],
    ['wand_web', 'Wand of Webs', 'web', 6, 15, 2500, 'mage'],
    ['wand_vapours', 'Wand of Noxious Vapours', 'stinking_cloud', 6, 15, 3500, 'mage'],
    ['staff_healing', 'Staff of Healing', 'cure_serious', 8, 20, 9000, 'cleric'],
    ['rod_thunder', 'Rod of Thunder', 'call_lightning', 10, 12, 8000, 'cleric'],
    ['staff_fireseeds', 'Staff of Embers', 'fire_seeds', 12, 10, 10000, 'cleric']
  ];
  WANDS.forEach(function (w) { add({ id: w[0], name: w[1], type: 'wand', spell: w[2], clvl: w[3], charges: w[4], value: w[5], weight: 1, magic: true, only: w[6] === 'mage' ? ['mage'] : ['cleric', 'paladin'], desc: 'Casts ' + Rules.SPELLS[w[2]].name + ' at caster level ' + w[3] + '. ' + w[4] + ' charges when found.' }); });
  named('staff_striking', 'quarterstaff', 2, 'Staff of Striking', { only: ['mage', 'cleric'], elDmg: { el: 'magic', dice: '2d6' }, desc: 'A staff that hammers foes with force: +2, and an extra 2d6 damage.' }, 6000);
  named('staff_power', 'quarterstaff', 2, 'Staff of Power', { only: ['mage'], save: 2, ac: 2, uses: ['fireball', 'lightning_bolt', 'cone_of_cold', 'ice_storm'], clvl: 10, charges: 25, desc: 'A rune-carved staff: +2, AC and saves 2 better, and casts fireball, lightning, ice storm or cone of cold.' }, 30000);
  named('staff_magi', 'quarterstaff', 2, 'Staff of the Archmage', { only: ['mage'], save: 2, ac: 2, mr: 25, uses: ['fireball', 'lightning_bolt', 'cone_of_cold', 'invisibility', 'web', 'dispel_magic'], clvl: 15, charges: 30, desc: 'The greatest of staves: +2, AC and saves 2 better, 25% magic resistance, and many spells.' }, 60000);
  named('rod_smiting', 'mace', 3, 'Rod of Smiting', { only: ['fighter', 'paladin', 'ranger', 'cleric'], vs: { construct: 3 }, mult: { construct: 2 }, desc: 'An iron rod that strikes as a mace +3, shattering golems and constructs.' }, 15000);

  /* ---------- rings ---------- */
  var RINGS = [
    ['ring_prot1', 'Ring of Protection +1', 2000, { ac: 1, save: 1 }],
    ['ring_prot2', 'Ring of Protection +2', 5000, { ac: 2, save: 2 }],
    ['ring_prot3', 'Ring of Protection +3', 9000, { ac: 3, save: 3 }],
    ['ring_fire', 'Ring of Fire Resistance', 4000, { resist: 'fire' }],
    ['ring_warmth', 'Ring of Warmth', 3000, { resist: 'cold' }],
    ['ring_free', 'Ring of Free Action', 6000, { free: true }],
    ['ring_regen', 'Ring of Regeneration', 25000, { regen: 1 }],
    ['ring_invis', 'Ring of Invisibility', 7500, { invisUse: true }],
    ['ring_wizardry', 'Ring of Wizardry', 20000, { wizardry: true, only: ['mage'] }],
    ['ring_spellward', 'Ring of Spell Warding', 15000, { saveSpell: 3 }],
    ['ring_mindshield', 'Ring of Mind Shielding', 8000, { mindImmune: true }],
    ['ring_lifeward', 'Ring of Life Warding', 12000, { noDrain: true }]
  ];
  RINGS.forEach(function (r) { var o = { id: r[0], name: r[1], type: 'ring', slot: 'ring', value: r[2], weight: 0, magic: true, fx: r[3] }; if (r[3].only) o.only = r[3].only; add(o); });

  /* ---------- miscellaneous magic ---------- */
  var MISC = [
    ['bracers_6', 'Bracers of Defence AC 6', 'bracers', 3000, { acSet: 6 }], ['bracers_5', 'Bracers of Defence AC 5', 'bracers', 5000, { acSet: 5 }],
    ['bracers_4', 'Bracers of Defence AC 4', 'bracers', 7500, { acSet: 4 }], ['bracers_3', 'Bracers of Defence AC 3', 'bracers', 10000, { acSet: 3 }],
    ['bracers_2', 'Bracers of Defence AC 2', 'bracers', 15000, { acSet: 2 }],
    ['cloak_prot1', 'Cloak of Protection +1', 'cloak', 2500, { ac: 1, save: 1 }], ['cloak_prot2', 'Cloak of Protection +2', 'cloak', 5000, { ac: 2, save: 2 }],
    ['cloak_prot3', 'Cloak of Protection +3', 'cloak', 9000, { ac: 3, save: 3 }],
    ['cloak_shifting', 'Cloak of Shifting', 'cloak', 12000, { ac: 2, save: 2, shifting: true }],
    ['cloak_elvenkind', 'Cloak of the Greenwood', 'cloak', 4000, { hs: 30 }],
    ['boots_elvenkind', 'Boots of Soft Treading', 'boots', 3500, { ms: 30 }],
    ['boots_speed', 'Boots of Swiftness', 'boots', 12000, { haste: true }],
    ['gauntlets_ogre', 'Gauntlets of Ogre Might', 'gloves', 9000, { strSet: 18, strEx: 100 }],
    ['belt_hill', 'Belt of Hill Giant Might', 'belt', 12000, { strSet: 19 }], ['belt_frost', 'Belt of Frost Giant Might', 'belt', 18000, { strSet: 21 }],
    ['belt_fire', 'Belt of Fire Giant Might', 'belt', 22000, { strSet: 22 }], ['belt_storm', 'Belt of Storm Giant Might', 'belt', 35000, { strSet: 24 }],
    ['amulet_health', 'Amulet of Health', 'neck', 5000, { diseaseImmune: true }],
    ['amulet_poison', 'Amulet of Proof against Poison', 'neck', 7500, { poisonImmune: true }],
    ['amulet_vigour', 'Amulet of Vigour', 'neck', 10000, { regen: 1, hpBonus: 5 }],
    ['scarab_protection', 'Scarab of Warding', 'neck', 15000, { save: 2, mr: 10, noDrain: true }],
    ['robe_archmage', 'Robe of the Archmage', 'robe', 40000, { acSet: 5, save: 1, mr: 5, only: ['mage'] }],
    ['lens_seeing', 'Lens of True Sight', 'neck', 6000, { search: 0.3 }],
    ['bag_holding', 'Bag of Holding', 'belt', 5000, { carry: 250 }],
    ['sun_talisman', 'Talisman of the Dawn', 'neck', 9000, { turnBonus: 2, only: ['cleric', 'paladin'] }],
    ['helm_valor', 'Helm of Valour', 'helm', 7000, { ac: 1, fearless: true }],
    ['helm_brilliance', 'Helm of Radiance', 'helm', 30000, { ac: 1, resist: 'fire', turnBonus: 1, vs: { undead: 1 } }]
  ];
  MISC.forEach(function (m) { var o = { id: m[0], name: m[1], type: 'misc', slot: m[2], value: m[3], weight: 1, magic: true, fx: m[4] }; if (m[4].only) o.only = m[4].only; add(o); });
  add({ id: 'necklace_missiles', name: 'Necklace of Fire Beads', type: 'wand', spell: 'fireball', clvl: 7, charges: 7, value: 6000, weight: 0.5, magic: true, desc: 'Each bead hurled bursts as a fireball (7d6). Anyone may use it.' });
  add({ id: 'horn_blasting', name: 'Horn of Shattering', type: 'wand', spell: 'shadow_blast', clvl: 8, charges: 8, value: 5000, weight: 2, magic: true, desc: 'A war-horn whose blast deals 8d4 to a small area. Anyone may sound it.' });
  [['manual_str', 'Manual of Mighty Exercise', 'str'], ['manual_dex', 'Manual of Quickness', 'dex'], ['manual_con', 'Manual of Bodily Health', 'con'],
    ['tome_int', 'Tome of Clear Thought', 'int'], ['tome_wis', 'Tome of Understanding', 'wis'], ['tome_cha', 'Libram of Presence', 'cha']].forEach(function (t) {
    add({ id: t[0], name: t[1], type: 'book', value: 25000, weight: 3, magic: true, use: { fx: 'ability', ab: t[2] }, desc: 'Studying this book for a week permanently raises ' + Rules.ABIL_NAMES[t[2]] + ' by one. It crumbles afterwards.' });
  });

  /* ---------- treasure goods ---------- */
  add({ id: 'gem', name: 'Gem', type: 'gem', value: 10, weight: 0, stackable: false, desc: 'A precious stone. Sell it in town.' });
  add({ id: 'jewel', name: 'Jewellery', type: 'jewel', value: 100, weight: 0.5, desc: 'A piece of jewellery. Sell it in town.' });
  add({ id: 'holy_water', name: 'Flask of Holy Water', type: 'potion', value: 25, weight: 1, use: { fx: 'throwdmg', dice: '2d4', vs: 'undead' }, desc: 'Thrown at undead in battle it burns for 2d4.' });
  add({ id: 'oil_flask', name: 'Flask of Oil', type: 'potion', value: 2, weight: 1, use: { fx: 'throwdmg', dice: '2d6' }, desc: 'Lit and thrown in battle, it burns a foe for 2d6.' });
  add({ id: 'iron_rations', name: 'Trail Rations', type: 'gear', value: 5, weight: 1, desc: 'A week of dried food. Purely for flavour.' });

  /* ---------- helpers ---------- */
  D.item = function (id) { return D.items[id]; };
  D.makeItem = function (id, o) {
    var it = D.items[id];
    if (!it) throw new Error('Unknown item ' + id);
    var inst = { id: id };
    if (it.stack) inst.q = (o && o.q) || (it.type === 'ammo' ? 20 : it.id.indexOf('dart') === 0 ? 10 : it.id.indexOf('javelin') === 0 ? 3 : 1);
    if (it.charges) inst.c = (o && o.c) || it.charges;
    if (o) { if (o.v) inst.v = o.v; if (o.n) inst.n = o.n; if (o.q) inst.q = o.q; }
    return inst;
  };
  D.itemName = function (inst) {
    var it = D.items[inst.id];
    if (!it) return '??';
    var n = inst.n || it.name;
    if (it.stack && inst.q != null) n = n + ' (' + inst.q + ')';
    if (inst.c != null) n = n + ' [' + inst.c + ']';
    return n;
  };
  D.value = function (inst) {
    var it = D.items[inst.id];
    if (inst.v) return inst.v;
    if (it.stack) return Math.max(0, it.value * (inst.q || 1));
    if (it.charges && inst.c != null) return Math.round(it.value * (0.3 + 0.7 * inst.c / it.charges));
    return it.value;
  };
  D.weight = function (inst) {
    var it = D.items[inst.id];
    return (it.weight || 0) * (it.stack ? (inst.q || 1) : 1);
  };

  /* ---------- shop stock by level band ---------- */
  D.BANDS = [null, { name: 'Novice', min: 1, max: 4 }, { name: 'Journeyman', min: 5, max: 8 }, { name: 'Veteran', min: 9, max: 12 }, { name: 'Champion', min: 13, max: 16 }, { name: 'Legend', min: 17, max: 20 }];
  D.shopStock = function (kind, band) {
    var out = [];
    band = Math.max(1, Math.min(5, band || 1));
    if (kind === 'smith') {
      WEAPONS.forEach(function (w) { out.push(w[0]); });
      out.push('arrow', 'quarrel', 'bullet');
      ARMOUR.forEach(function (a) { if (a[0] !== 'elven_chain' && (a[4] <= 600 || band >= 2)) out.push(a[0]); });
      out.push('shield');
      if (band >= 2) ['long_sword_1', 'mace_1', 'dagger_1', 'short_sword_1', 'battle_axe_1', 'long_bow_1', 'arrow_1', 'chain_1', 'leather_1', 'shield_1', 'quarterstaff_1', 'sling_1', 'bullet_1'].forEach(function (i) { out.push(i); });
      if (band >= 3) ['long_sword_2', 'mace_2', 'two_handed_sword_2', 'plate_1', 'banded_1', 'shield_2', 'arrow_2', 'quarrel_1', 'elven_chain', 'flail_2', 'war_hammer_2', 'dagger_2'].forEach(function (i) { out.push(i); });
      if (band >= 4) ['long_sword_3', 'mace_3', 'plate_2', 'chain_2', 'shield_3', 'arrow_3', 'long_bow_2', 'elven_chain_1', 'two_handed_sword_3', 'quarterstaff_3', 'sling_1'].forEach(function (i) { out.push(i); });
      if (band >= 5) ['long_sword_4', 'mace_4', 'plate_3', 'shield_4', 'elven_chain_2', 'long_bow_3', 'chain_3'].forEach(function (i) { out.push(i); });
    } else if (kind === 'magic') {
      out.push('potion_healing', 'holy_water', 'oil_flask', 'potion_antidote');
      var maxL = band * 2 - 1;
      if (band >= 2) out.push('potion_extra_healing', 'potion_clarity', 'potion_vitality', 'potion_heroism', 'potion_fire_res', 'potion_invisibility');
      if (band >= 3) out.push('potion_speed', 'potion_hill_giant', 'potion_frost_ward', 'wand_mm', 'wand_web', 'scroll_ward_undead', 'ring_prot1', 'cloak_prot1');
      if (band >= 4) out.push('potion_full_healing', 'potion_stone_giant', 'potion_invulnerability', 'wand_fire', 'wand_lightning', 'staff_healing', 'scroll_ward_drain', 'ring_prot2', 'bracers_4', 'scroll_ward_fire');
      if (band >= 5) out.push('potion_restoration', 'wand_frost', 'scroll_ward_magic', 'ring_free', 'cloak_prot2', 'bracers_3');
      Rules.SPELL_LIST.forEach(function (sp) {
        if (sp.lvl <= Math.min(maxL, sp.cls === 'wiz' ? 9 : 7) && sp.lvl <= band + 1) out.push('scroll_' + sp.id);
      });
    } else if (kind === 'trader') {
      out.push('dagger', 'short_sword', 'club', 'quarterstaff', 'spear', 'sling', 'short_bow', 'arrow', 'bullet', 'dart', 'leather', 'shield', 'potion_healing', 'oil_flask', 'iron_rations', 'holy_water');
      if (band >= 2) out.push('potion_extra_healing', 'chain', 'long_sword', 'mace');
    }
    return out.filter(function (id) { return !!D.items[id]; });
  };

  /* ---------- temple services ---------- */
  D.TEMPLE = [
    { id: 'cure_light', name: 'Cure Light Wounds', cost: 10, kind: 'heal', dice: '1d8' },
    { id: 'cure_serious', name: 'Cure Serious Wounds', cost: 50, kind: 'heal', dice: '2d8+1' },
    { id: 'cure_critical', name: 'Cure Critical Wounds', cost: 150, kind: 'heal', dice: '3d8+3' },
    { id: 'heal', name: 'Heal', cost: 600, kind: 'heal', dice: 'full', band: 2 },
    { id: 'neutralize', name: 'Neutralize Poison', cost: 100, kind: 'cure', cures: ['poisoned'] },
    { id: 'cure_disease', name: 'Cure Disease', cost: 100, kind: 'cure', cures: ['diseased'] },
    { id: 'remove_paralysis', name: 'Remove Paralysis', cost: 100, kind: 'cure', cures: ['paralyzed', 'held'] },
    { id: 'cure_blind', name: 'Cure Blindness', cost: 100, kind: 'cure', cures: ['blind'] },
    { id: 'remove_curse', name: 'Remove Curse', cost: 150, kind: 'cure', cures: ['cursed', 'weak'] },
    { id: 'stone', name: 'Stone to Flesh', cost: 1000, kind: 'stone' },
    { id: 'raise', name: 'Raise Dead', cost: 2500, kind: 'raise' },
    { id: 'restoration', name: 'Restoration', cost: 5000, kind: 'restore' }
  ];

  /* ---------- names and ready-made company ---------- */
  D.NAMES = {
    m: ['Aldric', 'Bram', 'Corwen', 'Dunstan', 'Edric', 'Faramond', 'Garrick', 'Hal', 'Ivo', 'Jory', 'Kestrel', 'Lorcan', 'Merrow', 'Niall', 'Osric', 'Perrin', 'Quill', 'Roderic', 'Stellan', 'Tobin', 'Ulric', 'Varn', 'Wendel', 'Yorick', 'Thane', 'Brisk', 'Hollis', 'Fenn', 'Galen', 'Orrin'],
    f: ['Aveline', 'Brynn', 'Cressida', 'Della', 'Elowen', 'Fianna', 'Gwyneth', 'Hesper', 'Isolde', 'Jessamy', 'Kerra', 'Linnet', 'Maren', 'Nessa', 'Orla', 'Perrine', 'Rowan', 'Sabine', 'Tamsin', 'Una', 'Verity', 'Wren', 'Yseult', 'Zara', 'Marigold', 'Tilda', 'Briar', 'Sorrel', 'Ione', 'Petra']
  };
  D.PREGENS = [
    { name: 'Sir Aldric', race: 'human', cls: 'paladin', gender: 'm', align: 'LG', ab: { str: 17, dex: 12, con: 15, int: 10, wis: 14, cha: 17 }, kit: ['long_sword', 'chain', 'shield'], color: 0 },
    { name: 'Brynn Ironhand', race: 'dwarf', cls: 'fighter', gender: 'f', align: 'LN', ab: { str: 18, strEx: 63, dex: 13, con: 17, int: 9, wis: 11, cha: 8 }, spec: 'battle_axe', kit: ['battle_axe', 'scale', 'shield', 'hand_axe'], color: 1 },
    { name: 'Faelar', race: 'elf', cls: 'ranger', gender: 'm', align: 'CG', ab: { str: 15, dex: 17, con: 14, int: 13, wis: 14, cha: 11 }, kit: ['long_sword', 'short_sword', 'long_bow', 'arrow', 'arrow', 'studded'], color: 2 },
    { name: 'Elowen', race: 'human', cls: 'cleric', gender: 'f', align: 'NG', ab: { str: 13, dex: 10, con: 14, int: 11, wis: 17, cha: 13 }, kit: ['mace', 'chain', 'shield', 'sling', 'bullet'], color: 3 },
    { name: 'Tobin Quickfoot', race: 'halfling', cls: 'thief', gender: 'm', align: 'N', ab: { str: 11, dex: 18, con: 13, int: 12, wis: 9, cha: 12 }, kit: ['short_sword', 'leather', 'sling', 'bullet', 'dagger'], color: 4 },
    { name: 'Maren the Grey', race: 'halfelf', cls: 'mage', gender: 'f', align: 'N', ab: { str: 8, dex: 15, con: 12, int: 17, wis: 12, cha: 10 }, kit: ['quarterstaff', 'dart'], book: ['magic_missile', 'sleep', 'shield', 'burning_hands'], color: 5 }
  ];

  D.STARTING_GOLD = 600;

  /* ---------- equipment rules ---------- */
  var WARRIORS = { fighter: 1, paladin: 1, ranger: 1 };
  D.canUse = function (pc, it) {
    if (!it) return { ok: false, why: 'Unknown item.' };
    if (it.only && it.only.indexOf(pc.cls) < 0) return { ok: false, why: 'Only usable by ' + it.only.map(function (c) { return Rules.CLASSES[c].name.toLowerCase() + 's'; }).join(' and ') + '.' };
    if (it.type === 'weapon') {
      var list = Rules.CLASS_WEAPONS[pc.cls];
      if (list && list.indexOf(it.base) < 0) return { ok: false, why: Rules.CLASSES[pc.cls].name + 's cannot use that weapon.' };
    }
    if (it.type === 'armor') {
      var al = Rules.CLASS_ARMOR[pc.cls];
      if (al && al.indexOf(it.base) < 0) return { ok: false, why: Rules.CLASSES[pc.cls].name + 's cannot wear that armour.' };
    }
    if (it.type === 'shield' && (pc.cls === 'mage' || pc.cls === 'thief')) return { ok: false, why: Rules.CLASSES[pc.cls].name + 's cannot use shields.' };
    if (it.slot === 'robe' && pc.cls !== 'mage') return { ok: false, why: 'Only mages can wear the robe.' };
    return { ok: true };
  };
  D.equippable = function (it) { return !!it.slot && it.type !== 'ammo'; };
  D.slotItems = function (pc, slot) { return pc.inv.filter(function (i) { var it = D.items[i.id]; return i.eq && it && it.slot === slot; }); };
  D.weapon = function (pc) { for (var i = 0; i < pc.inv.length; i++) { var x = pc.inv[i]; if (x.eq && !x.off && D.items[x.id] && D.items[x.id].slot === 'weapon') return x; } return null; };
  D.offhand = function (pc) { for (var i = 0; i < pc.inv.length; i++) { var x = pc.inv[i]; if (x.eq && x.off) return x; } return null; };
  D.equip = function (pc, inst) {
    var it = D.items[inst.id];
    if (!it || !D.equippable(it)) return 'That cannot be equipped.';
    if (inst.eq) { inst.eq = false; inst.off = false; return null; }
    var cu = D.canUse(pc, it);
    if (!cu.ok) return cu.why;
    var unequip = function (pred) { pc.inv.forEach(function (o) { if (o !== inst && o.eq && pred(o, D.items[o.id])) { o.eq = false; o.off = false; } }); };
    if (it.slot === 'weapon') {
      var main = D.weapon(pc), mainIt = main && D.items[main.id];
      var shield = D.slotItems(pc, 'shield')[0];
      // rangers may wield a second one-handed melee weapon in the off hand
      if (pc.cls === 'ranger' && main && !it.missile && it.hands === 1 && mainIt && !mainIt.missile && mainIt.hands === 1 && !shield) {
        unequip(function (o) { return o.off; });
        inst.eq = true; inst.off = true; return null;
      }
      unequip(function (o, oi) { return oi.slot === 'weapon'; });
      if (it.hands === 2) unequip(function (o, oi) { return oi.slot === 'shield'; });
    } else if (it.slot === 'shield') {
      var w = D.weapon(pc);
      if (w && D.items[w.id].hands === 2) return 'You need a free hand for a shield.';
      unequip(function (o, oi) { return oi.slot === 'shield' || o.off; });
    } else if (it.slot === 'ring') {
      var rings = D.slotItems(pc, 'ring');
      if (rings.length >= 2) { rings[0].eq = false; }
    } else if (it.slot === 'armor' || it.slot === 'robe') {
      unequip(function (o, oi) { return oi.slot === 'armor' || oi.slot === 'robe'; });
    } else {
      unequip(function (o, oi) { return oi.slot === it.slot; });
    }
    inst.eq = true;
    return null;
  };
  D.ammoFor = function (pc, wpnIt) {
    if (!wpnIt || !wpnIt.ammo) return null;
    var best = null;
    pc.inv.forEach(function (i) { var it = D.items[i.id]; if (it && it.type === 'ammo' && it.ammo === wpnIt.ammo && (i.q || 0) > 0 && (!best || it.plus > D.items[best.id].plus || (it.silver && !D.items[best.id].silver && it.plus >= D.items[best.id].plus))) best = i; });
    return best;
  };

  /* ---------- derived statistics ---------- */
  D.derive = function (pc, extra) {
    extra = extra || {};
    var o = { fx: {}, resist: [], immune: {} };
    var eqs = pc.inv.filter(function (i) { return i.eq; });
    var armor = null, shield = null, robe = null, wpn = null, off = null;
    var acBonus = 0, saveBonus = 0, saveSpell = 0, acSet = 99, strSet = 0, strExSet = 0, mr = 0, regen = 0;
    var ms = 0, hs = 0, carryBonus = 0, search = 0, turnBonus = 0, hpBonus = 0;
    eqs.forEach(function (i) {
      var it = D.items[i.id]; if (!it) return;
      if (it.slot === 'armor') armor = it;
      else if (it.slot === 'shield') shield = it;
      else if (it.slot === 'robe') robe = it;
      else if (it.slot === 'weapon') { if (i.off) off = i; else wpn = i; }
      var f = it.fx || {};
      if (it.save) saveBonus += it.save;
      if (it.ac && it.type === 'weapon') acBonus += it.ac;
      if (it.mr) mr = Math.max(mr, it.mr);
      if (it.resist) o.resist.push(it.resist);
      if (f.ac) acBonus += f.ac;
      if (f.save) saveBonus += f.save;
      if (f.saveSpell) saveSpell += f.saveSpell;
      if (f.acSet) acSet = Math.min(acSet, f.acSet);
      if (f.strSet && f.strSet >= strSet) { if (f.strSet > strSet) strExSet = 0; strSet = f.strSet; if (f.strEx) strExSet = Math.max(strExSet, f.strEx); }
      if (f.mr) mr = Math.max(mr, f.mr);
      if (f.regen) regen += f.regen;
      if (f.resist) o.resist.push(f.resist);
      if (f.free) o.immune.hold = o.immune.web = o.immune.slow = o.immune.paralysis = true;
      if (f.poisonImmune) o.immune.poison = true;
      if (f.diseaseImmune) o.immune.disease = true;
      if (f.mindImmune) o.immune.charm = o.immune.sleep = o.immune.fear = true;
      if (f.noDrain) o.immune.drain = true;
      if (f.fearless) o.immune.fear = true;
      if (f.haste) o.fx.haste = true;
      if (f.shifting) o.fx.shifting = true;
      if (f.invisUse) o.fx.invisUse = true;
      if (f.wizardry) o.fx.wizardry = true;
      if (f.ms) ms += f.ms; if (f.hs) hs += f.hs;
      if (f.carry) carryBonus += f.carry;
      if (f.search) search += f.search;
      if (f.turnBonus) turnBonus += f.turnBonus;
      if (f.hpBonus) hpBonus += f.hpBonus;
      if (it.vs) o.vsItem = it.vs;
    });
    if (extra.strSet && extra.strSet > strSet) { strSet = extra.strSet; strExSet = 0; }
    var str = pc.ab.str, strEx = pc.ab.strEx || 0;
    if (strSet && (strSet > str || (strSet === 18 && str === 18 && strExSet > strEx))) { str = strSet; strEx = strExSet; }
    o.str = str; o.strEx = strEx;
    var st = Rules.strTable(str, strEx), dx = Rules.dexTable(pc.ab.dex);
    o.strHit = st.hit; o.strDmg = st.dmg;
    // armour class
    var base = armor ? armor.ac - (armor.plus || 0) : 10;
    if (!armor && acSet < base) base = acSet;
    if (robe && robe.fx && robe.fx.acSet && robe.fx.acSet < base && !armor) base = robe.fx.acSet;
    var ac = base + dx.ac - acBonus;
    if (shield) ac -= 1 + (shield.plus || 0);
    o.ac = ac; o.acRear = base - acBonus;
    o.armor = armor; o.shield = shield;
    // weapon
    var wIt = wpn ? D.items[wpn.id] : null;
    o.weapon = wpn; o.weaponIt = wIt; o.offhand = off; o.offIt = off ? D.items[off.id] : null;
    o.thac0 = Rules.thac0(pc.cls, pc.lvl);
    var spec = pc.cls === 'fighter' && pc.spec && wIt && (wIt.base === pc.spec);
    o.spec = !!spec;
    var race = Rules.RACES[pc.race], raceBonus = (race.bonusWeapons && wIt && race.bonusWeapons.indexOf(wIt.base) >= 0) ? 1 : 0;
    var missile = !!(wIt && wIt.missile);
    o.missile = missile;
    o.ammo = missile ? D.ammoFor(pc, wIt) : null;
    var ammoIt = o.ammo ? D.items[o.ammo.id] : null;
    if (missile) {
      o.hit = dx.missile + (wIt.plus || 0) + (ammoIt ? ammoIt.plus : 0) + (spec ? 1 : 0) + raceBonus;
      o.dmgDice = ammoIt ? ammoIt.dmg : wIt.dmg;
      o.dmgBonus = (ammoIt ? ammoIt.plus : 0) + (spec ? 2 : 0) + (wIt.base === 'sling' ? 0 : 0);
      o.range = wIt.range;
      o.rate = (wIt.rof || 1) * 2;
    } else {
      o.hit = st.hit + (wIt ? wIt.plus : 0) + (spec ? 1 : 0) + raceBonus;
      o.dmgDice = wIt ? wIt.dmg : ['1d2', '1d2'];
      o.dmgBonus = st.dmg + (wIt ? wIt.plus : 0) + (spec ? 2 : 0);
      o.range = 1;
      o.rate = Rules.meleeRate(pc);
      if (off) o.rate += 2;
      if (pc.cls === 'paladin') { o.holy = true; }
    }
    o.thrown = !!(wIt && wIt.thrown);
    o.missileHitThrown = dx.missile + (wIt ? wIt.plus : 0) + raceBonus + (spec ? 1 : 0);
    o.magicPlus = wIt ? (wIt.plus || 0) + (ammoIt ? ammoIt.plus : 0) : 0;
    o.silver = !!((wIt && wIt.silver) || (ammoIt && ammoIt.silver));
    o.dex = dx;
    // movement and encumbrance
    var weight = 0;
    pc.inv.forEach(function (i) { weight += D.weight(i); });
    var carry = st.carry + carryBonus;
    var mf = weight <= carry ? 1 : weight <= carry * 1.5 ? 0.75 : weight <= carry * 2 ? 0.5 : 0.34;
    o.weight = Math.round(weight); o.carry = carry; o.enc = mf === 1 ? 'Unencumbered' : mf === 0.75 ? 'Light' : mf === 0.5 ? 'Heavy' : 'Severe';
    o.move = Math.max(1, Math.round(Rules.baseMove(pc) * mf));
    o.cmove = Math.max(1, Math.round(o.move / 2));
    // saving throws (lower is better)
    var group = Rules.CLASSES[pc.cls].group;
    var sv = Rules.baseSaves(group, pc.lvl);
    var bonus = [saveBonus, saveBonus, saveBonus, saveBonus, saveBonus + saveSpell];
    if (pc.cls === 'paladin') bonus = bonus.map(function (b) { return b + 2; });
    if (race.saveCon) { var cb = Math.floor(pc.ab.con / 3.5); bonus[0] += cb; bonus[1] += cb; bonus[4] += cb; }
    o.saves = sv.map(function (v, i) { return Math.max(2, v - bonus[i]); });
    o.magDef = Rules.wisTable(pc.ab.wis).magDef;
    o.mr = mr; o.regen = regen;
    o.thief = Rules.thiefSkills(pc);
    if (o.thief) { o.thief.ms = Math.min(99, o.thief.ms + ms); o.thief.hs = Math.min(99, o.thief.hs + hs); }
    else if (ms || hs) o.thief = null;
    o.msBonus = ms; o.hsBonus = hs;
    o.search = search; o.turnBonus = turnBonus; o.hpBonus = hpBonus;
    var tmp = { cls: pc.cls, lvl: pc.lvl, ab: pc.ab, ringWizardry: o.fx.wizardry };
    o.slots = Rules.spellSlots(tmp);
    return o;
  };

  return D;
})();
