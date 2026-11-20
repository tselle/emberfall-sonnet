/* Emberfall — monsters.js
 * About 330 creatures written for the Emberwild. Each line:
 * id, name, type, AC, HD, move, attacks (damage per attack, "/" separated),
 * specials, size, alignment, treasure type, number appearing, figure, description.
 * Specials: poison[:dice|x] para drainN regenN undeadN silver magicN mrN
 * imm:a,b gaze:x breath:el:shape[:dice] spells:list fear disease weak ambush
 * fly rock:dice:range ranged:dice:range nomorale leader stone acid hug web blink invis */
var Monsters = (function () {
  'use strict';
  var X = {};
  X.list = []; X.byId = {};

  function parseHd(hd) {
    if (typeof hd === 'number') return { hd: hd, plus: 0 };
    var m = String(hd).match(/^(\d+(?:\.\d+)?)([+-]\d+)?$/);
    return { hd: +m[1], plus: m[2] ? +m[2] : 0 };
  }
  function parseSpecials(s) {
    var o = { tags: [] };
    if (!s) return o;
    s.split(/\s+/).forEach(function (t) {
      if (!t) return;
      var m;
      if (t === 'poison') o.poison = 'save';
      else if ((m = t.match(/^poison:(.+)$/))) o.poison = m[1];
      else if (t === 'para') o.para = true;
      else if ((m = t.match(/^drain(\d)$/))) o.drain = +m[1];
      else if ((m = t.match(/^regen(\d+)$/))) o.regen = +m[1];
      else if ((m = t.match(/^undead(\d+)$/))) o.undead = +m[1];
      else if (t === 'silver') o.needMagic = 0.5;
      else if ((m = t.match(/^magic(\d)$/))) o.needMagic = +m[1];
      else if ((m = t.match(/^mr(\d+)$/))) o.mr = +m[1];
      else if ((m = t.match(/^ml(\d+)$/))) o.morale = +m[1];
      else if ((m = t.match(/^imm:(.+)$/))) o.imm = m[1].split(',');
      else if ((m = t.match(/^res:(.+)$/))) o.res = m[1].split(',');
      else if ((m = t.match(/^gaze:(.+)$/))) o.gaze = m[1];
      else if ((m = t.match(/^breath:([a-z]+):([a-z]+)(?::(.+))?$/))) o.breath = { el: m[1], shape: m[2], dice: m[3] || null };
      else if ((m = t.match(/^spells:(.+)$/))) o.spells = m[1].split(',');
      else if ((m = t.match(/^(rock|ranged):([^:]+):(\d+)$/))) o.ranged = { dice: m[2], range: +m[3], kind: m[1] };
      else if ((m = t.match(/^hit:([a-z]+):(.+)$/))) o.elHit = { el: m[1], dice: m[2] };
      else o.tags.push(t);
      if (t === 'fear' || t === 'disease' || t === 'weak' || t === 'ambush' || t === 'fly' || t === 'nomorale' || t === 'leader' || t === 'stone' || t === 'acid' || t === 'web' || t === 'blink' || t === 'invis' || t === 'hug' || t === 'rust' || t === 'charm' || t === 'swallow' || t === 'shriek' || t === 'blind' || t === 'stun' || t === 'flee') o[t] = true;
    });
    return o;
  }
  function specialCount(sp) {
    var n = 0;
    ['poison', 'para', 'drain', 'regen', 'needMagic', 'mr', 'gaze', 'breath', 'spells', 'ranged', 'fear', 'disease', 'weak', 'stone', 'acid', 'web', 'blink', 'invis', 'charm', 'swallow', 'elHit', 'imm'].forEach(function (k) { if (sp[k]) n++; });
    return n;
  }
  function M(id, name, type, ac, hd, mv, att, sp, size, al, tt, num, fig, desc) {
    if (X.byId[id]) throw new Error('Duplicate monster ' + id);
    var h = parseHd(hd), s = parseSpecials(sp);
    var m = {
      id: id, name: name, type: type, ac: ac, hdText: String(hd), hd: h.hd, hpPlus: h.plus, mv: mv,
      att: String(att).split('/'), size: size, al: al, tt: tt, num: num, fig: fig, desc: desc
    };
    for (var k in s) m[k] = s[k];
    m.thac0 = Rules.monThac0(h.hd < 1 && h.plus > 0 ? 1 : h.hd);
    if (h.plus >= 3) m.thac0 = Math.max(1, m.thac0 - 1);
    m.avgHp = Math.max(1, Math.round(h.hd * 4.5 + h.plus));
    m.xp = Rules.monXp(h.hd + (h.plus > 0 ? 0.5 : 0), m.avgHp, specialCount(s));
    if (m.morale == null) m.morale = m.nomorale || m.undead != null || type === 'construct' || type === 'ooze' ? 20 : Math.min(19, 8 + Math.floor(h.hd));
    m.evil = al.indexOf('E') >= 0;
    m.person = (type === 'humanoid' || type === 'goblinoid') && (size === 'S' || size === 'M');
    X.byId[id] = m; X.list.push(m);
    return m;
  }
  X.def = M;

  /* ===== Humans and demi-humans ===== */
  M('bandit', 'Bandit', 'humanoid', 8, 1, 12, '1d6', '', 'M', 'NE', 'M', '3d6', 'hum:#7a5a3a:#3a2a1a:s', 'Road-robbers in patched leather who prey on lone travellers.');
  M('bandit_chief', 'Bandit Chief', 'humanoid', 5, 4, 12, '1d8+1', 'leader', 'M', 'NE', 'M,C', '1', 'hum:#5a3a2a:#a03030:s', 'A scarred brigand who rules a gang through fear and loot.');
  M('berserker', 'Berserker', 'humanoid', 7, '1+2', 12, '1d8/1d8', 'imm:fear nomorale', 'M', 'N', 'J', '2d6', 'hum:#8a6040:#c0a060:s', 'Wild-eyed warriors who fight in a frenzy, striking twice.');
  M('brigand', 'Brigand', 'humanoid', 6, 1, 12, '1d8', '', 'M', 'CE', 'M', '2d6', 'hum:#504050:#202020:s', 'Hardened outlaws in mail, better armed than common bandits.');
  M('caveman', 'Caveman', 'humanoid', 8, 2, 12, '2d4', '', 'M', 'N', 'C', '2d8', 'hum:#7a5030:#5a3a20:s', 'Shaggy hunters of the old hills, armed with stone clubs.');
  M('dervish', 'Desert Rider', 'humanoid', 7, 1, 12, '1d8', '', 'M', 'LG', 'J', '2d10', 'hum:#e0d0a0:#4060a0:s', 'Fierce nomads of the sand-wastes, devout and proud.');
  M('nomad', 'Nomad', 'humanoid', 7, 1, 12, '1d6', 'ranged:1d6:12', 'M', 'N', 'J', '2d10', 'hum:#a08060:#604020:b', 'Horse-folk of the plains who shoot from the saddle.');
  M('pirate', 'Pirate', 'humanoid', 7, 1, 12, '1d6', '', 'M', 'CE', 'J', '2d10', 'hum:#4a4a6a:#a02020:s', 'Cutthroats of the river and sea, quick with a cutlass.');
  M('militia', 'Militiaman', 'humanoid', 7, 1, 12, '1d6', '', 'M', 'LN', 'K', '2d6', 'hum:#606a7a:#3050a0:s', 'Town levy armed with spear and shield.');
  M('mercenary', 'Mercenary', 'humanoid', 5, 2, 12, '1d8', '', 'M', 'N', 'K', '2d6', 'hum:#707070:#406040:s', 'Sellswords who follow whoever pays best.');
  M('cultist', 'Cultist', 'humanoid', 8, 1, 12, '1d4', '', 'M', 'CE', 'K', '2d6', 'hum:#401020:#802040:r', 'Robed devotees of dark powers, eager to die for their masters.');
  M('cult_priest', 'Cult Priest', 'humanoid', 5, 5, 12, '1d6+1', 'spells:cause_light,hold_person_p,curse,cause_serious leader', 'M', 'CE', 'K,Q', '1d2', 'hum:#200810:#c02040:r', 'A high priest of forbidden gods, wielding unholy prayers.');
  M('acolyte', 'Dark Acolyte', 'humanoid', 7, 2, 12, '1d6', 'spells:cause_light,curse', 'M', 'NE', 'K', '1d4', 'hum:#302030:#606090:r', 'A novice of a sinister temple.');
  M('apprentice', 'Hedge Wizard', 'humanoid', 9, 2, 12, '1d4', 'spells:magic_missile,sleep,shield', 'M', 'NE', 'L', '1d2', 'hum:#303070:#a0a0e0:r', 'A wizard of modest power who sells spells to the highest bidder.');
  M('warlock', 'Warlock', 'humanoid', 7, 7, 12, '1d4', 'spells:magic_missile,web,lightning_bolt,fireball,fear leader', 'M', 'CE', 'L,Q', '1', 'hum:#200040:#8040c0:r', 'A sorcerer steeped in forbidden lore, wreathed in crackling power.');
  M('archmage_evil', 'Dread Sorcerer', 'humanoid', 4, 12, 12, '1d4', 'spells:fireball,cone_of_cold,chain_lightning,hold_monster,death_spell mr15 leader', 'M', 'NE', 'L,U', '1', 'hum:#100010:#e04040:rk', 'A master of the black arts whose word is death.');
  M('dwarf', 'Dwarf', 'humanoid', 4, 1, 6, '1d8', 'res:poison', 'S', 'LG', 'M,G', '4d10', 'hum:#8a5a30:#a0a0a0:sd', 'Doughty mountain warriors in mail who hate goblins and giants.');
  M('elf', 'Elf', 'humanoid', 5, '1+1', 12, '1d10', 'res:sleep,charm ranged:1d6:15', 'M', 'CG', 'N,G', '2d10', 'hum:#60a060:#c0d080:b', 'Graceful forest folk, wary of strangers and peerless archers.');
  M('gnome', 'Gnome', 'humanoid', 5, 1, 6, '1d6', 'res:poison', 'S', 'NG', 'M,C', '4d10', 'hum:#806040:#d0a040:sd', 'Small, bearded burrow-dwellers fond of gems and jests.');
  M('halfling', 'Halfling', 'humanoid', 7, '1-1', 9, '1d6', 'ranged:1d4:12', 'S', 'LG', 'K', '5d6', 'hum:#90a050:#806030:sd', 'Little folk of quiet hamlets, deadly with a sling.');
  M('drow', 'Shadow Elf', 'humanoid', 4, 2, 12, '1d8', 'mr50 res:sleep,charm spells:blindness', 'M', 'CE', 'N,Q', '2d4', 'hum:#303040:#e0e0f0:s', 'Grey-skinned elves of the underdark, cruel and cunning.');
  M('neanderthal', 'Hill Brute', 'humanoid', 8, 2, 12, '2d4', '', 'M', 'N', 'C', '1d10x10', 'hum:#7a5030:#3a2010:s', 'Heavy-browed primitives who hunt with stone spears.');

  /* ===== Goblin-kin ===== */
  M('kobold', 'Kobold', 'goblinoid', 7, 0.5, 6, '1d4', '', 'S', 'LE', 'J,O', '4d10', 'gob:#a05030:#603020:s', 'Scaly, dog-faced little sneaks who lay traps and fight in swarms.');
  M('kobold_chief', 'Kobold Chieftain', 'goblinoid', 6, 2, 6, '1d6', 'leader', 'S', 'LE', 'J,O,Q', '1', 'gob:#c06030:#d0b030:sk', 'A cunning kobold tyrant in a battered tin crown.');
  M('goblin', 'Goblin', 'goblinoid', 6, '1-1', 6, '1d6', '', 'S', 'LE', 'K,C', '4d10', 'gob:#708030:#504020:s', 'Spiteful yellow-eyed raiders who hate sunlight and love cruelty.');
  M('goblin_boss', 'Goblin Boss', 'goblinoid', 5, 1, 9, '1d8', 'leader', 'S', 'LE', 'K,C', '1d4', 'gob:#809040:#902020:s', 'A larger goblin who keeps the rabble in line with a whip.');
  M('hobgoblin', 'Hobgoblin', 'goblinoid', 5, '1+1', 9, '1d8', '', 'M', 'LE', 'J,D', '4d10', 'hum:#b05030:#504030:s', 'Disciplined, militant goblin-kin who march in ordered ranks.');
  M('hobgoblin_captain', 'Hobgoblin Captain', 'goblinoid', 3, 3, 9, '2d4', 'leader', 'M', 'LE', 'J,D', '1d2', 'hum:#c06040:#202020:s', 'A hobgoblin officer in black plate with a wicked flail.');
  M('orc', 'Orc', 'goblinoid', 6, 1, 9, '1d8', '', 'M', 'LE', 'L,C', '3d10', 'hum:#507040:#504030:s', 'Pig-snouted marauders who live to raid, burn and plunder.');
  M('orc_leader', 'Orc Warleader', 'goblinoid', 4, 3, 9, '1d10', 'leader', 'M', 'LE', 'L,C', '1d2', 'hum:#406030:#a02020:s', 'A hulking orc who earned command by killing his rivals.');
  M('half_orc', 'Half-Orc Thug', 'goblinoid', 6, 2, 12, '1d8', '', 'M', 'NE', 'K', '2d4', 'hum:#708060:#404040:s', 'A brutish thug with a grudge against everyone.');
  M('gnoll', 'Gnoll', 'goblinoid', 5, 2, 9, '2d4', '', 'L', 'CE', 'L,M,D', '2d10', 'hum:#a08040:#604020:s', 'Hyena-headed raiders that cackle as they hunt.');
  M('gnoll_chief', 'Gnoll Packlord', 'goblinoid', 4, 4, 9, '2d6', 'leader', 'L', 'CE', 'L,M,D', '1', 'hum:#906030:#302010:s', 'The largest gnoll of the pack, crowned with bones.');
  M('bugbear', 'Bugbear', 'goblinoid', 5, '3+1', 9, '2d4', 'ambush', 'L', 'CE', 'J,K,L,M,B', '2d4', 'hum:#8a6030:#503010:s', 'Hairy goblin-giants that creep silently and ambush the unwary.');
  M('troglodyte', 'Troglodyte', 'goblinoid', 5, 2, 12, '1d3/1d3/1d4+1', 'fear', 'M', 'CE', 'A', '1d8x10', 'hum:#6a7a6a:#304030:t', 'Reptilian cave-men whose musk sickens all who smell it.');
  M('lizard_man', 'Lizard Man', 'goblinoid', 5, '2+1', 6, '1d2/1d2/1d8', '', 'M', 'N', 'D', '1d10x10', 'hum:#408040:#204020:st', 'Scaled swamp-dwellers who fight with claws, teeth and clubs.');
  M('xvart', 'Blue Goblin', 'goblinoid', 7, '1-1', 6, '1d6', '', 'S', 'CE', 'K', '3d6', 'gob:#4060c0:#202060:s', 'Small blue-skinned raiders who serve wererats.');
  M('norker', 'Tuskling', 'goblinoid', 3, '1+2', 9, '1d3/1d6', '', 'S', 'CE', 'J', '3d10', 'gob:#806050:#403020:s', 'Tusked, thick-hided goblin-kin.');

  /* ===== Giants and giant-kin ===== */
  M('ogre', 'Ogre', 'giant', 5, '4+1', 9, '1d10', '', 'L', 'CE', 'M,B', '2d6', 'big:#a08050:#604020:s', 'Hulking, dim-witted brutes nine feet tall who eat anything.');
  M('ogre_chief', 'Ogre Chieftain', 'giant', 3, 7, 9, '2d8', 'leader', 'L', 'CE', 'M,B', '1', 'big:#907040:#a02020:sk', 'The strongest ogre of the clan, wearing a necklace of skulls.');
  M('ogre_mage', 'Ogre Magus', 'giant', 4, '5+2', 9, '1d12', 'regen1 spells:sleep,invisibility,charm_person,cone_of_cold fly', 'L', 'LE', 'M,G', '1d6', 'big:#4060a0:#e0e0e0:sh', 'A blue-skinned ogre sorcerer that flies, turns invisible and breathes cold.');
  M('troll', 'Troll', 'giant', 4, '6+6', 12, '1d4+4/1d4+4/2d6', 'regen3', 'L', 'CE', 'D', '1d12', 'big:#507030:#304020:c', 'Rubbery green horrors whose wounds close before your eyes.');
  M('troll_ice', 'Ice Troll', 'giant', 8, 2, 9, '1d8/1d8', 'regen2 res:cold', 'L', 'CE', 'Q', '1d6', 'big:#a0c0d0:#6090a0:c', 'A frost-blue troll of the glaciers, vulnerable to fire.');
  M('troll_giant', 'Giant Troll', 'giant', 4, 8, 12, '2d6', 'regen2', 'L', 'CE', 'C', '1d12', 'big:#806030:#403010:c', 'A troll-giant crossbreed with crushing strength.');
  M('troll_two_headed', 'Two-Headed Troll', 'giant', 4, 10, 12, '1d6/1d6/1d10/1d10', 'regen1', 'L', 'CE', 'D', '1d3', 'big:#607030:#405020:cm', 'A hideous troll with two hungry heads.');
  M('ettin', 'Ettin', 'giant', 3, 10, 12, '2d8/3d6', '', 'H', 'CE', 'O', '1d4', 'big:#907050:#504030:sm', 'A two-headed giant, each head as surly as the other.');
  M('hill_giant', 'Hill Giant', 'giant', 4, '8+2', 12, '2d8', 'rock:2d8:20', 'H', 'CE', 'D', '1d10', 'big:#a07040:#704020:s', 'Brutish giants of the uplands who hurl boulders.');
  M('stone_giant', 'Stone Giant', 'giant', 0, '9+3', 12, '3d6', 'rock:3d10:30', 'H', 'N', 'E', '1d10', 'big:#808080:#505050:s', 'Grey-skinned giants of the crags, deadly boulder-throwers.');
  M('frost_giant', 'Frost Giant', 'giant', 4, '10+2', 12, '4d6', 'rock:2d10:20 imm:cold', 'H', 'CE', 'E', '1d8', 'big:#c0d0e0:#4060a0:s', 'White-haired giants of the frozen north.');
  M('fire_giant', 'Fire Giant', 'giant', 3, '11+3', 12, '5d6', 'rock:2d10:20 imm:fire', 'H', 'LE', 'E', '1d8', 'big:#202020:#e04020:s', 'Coal-skinned, flame-haired giants of the volcanoes.');
  M('cloud_giant', 'Cloud Giant', 'giant', 2, '12+7', 15, '6d6', 'rock:3d10:30', 'H', 'N', 'E,Q', '1d6', 'big:#e0e0f0:#80a0e0:s', 'Pale, regal giants who dwell in castles among the clouds.');
  M('storm_giant', 'Storm Giant', 'giant', 1, '15+9', 15, '7d6', 'imm:elec spells:call_lightning', 'H', 'CG', 'E,Q,S', '1d4', 'big:#80c0a0:#4080c0:sk', 'Kingly giants of the sea-cliffs who command lightning.');
  M('titan', 'Titan', 'giant', 2, 20, 21, '7d6/7d6', 'mr40 spells:lightning_bolt,hold_monster', 'H', 'CG', 'E,Q,R', '1', 'big:#f0e0a0:#e0c040:sk', 'A godlike giant of terrible majesty.');
  M('fomorian', 'Misshapen Giant', 'giant', 3, 13, 9, '4d8', '', 'H', 'NE', 'E', '1d2', 'big:#907060:#506040:s', 'A cursed, deformed giant of the deep caves.');
  M('verbeeg', 'Long-Shanks', 'giant', 4, '5+5', 18, '1d8+4', 'rock:2d6:15', 'L', 'N', 'B', '1d6', 'big:#a09070:#605040:s', 'Tall, thin giant-kin who throw spears with deadly accuracy.');
  M('cyclops', 'Cyclops', 'giant', 2, 13, 15, '6d6', 'rock:4d10:20', 'H', 'CE', 'E', '1', 'big:#a08060:#604040:sx', 'A one-eyed giant of the isles.');

  /* ===== Undead ===== */
  M('skeleton', 'Skeleton', 'undead', 7, 1, 12, '1d6', 'undead0 imm:sleep,charm,hold,mind,poison res:edged nomorale', 'M', 'N', '', '3d10', 'skel:#e0e0d0:#606060:s', 'Animated bones bound to obey their creator\'s last command.');
  M('skeleton_warrior', 'Skeletal Champion', 'undead', 2, 9, 12, '1d10+3', 'undead8 mr90 imm:sleep,charm,hold,mind,poison nomorale', 'M', 'NE', 'A', '1d4', 'skel:#d0d0c0:#a08020:sk', 'The bones of a fallen lord, bound by a cursed circlet.');
  M('zombie', 'Zombie', 'undead', 8, 2, 6, '1d8', 'undead1 imm:sleep,charm,hold,mind,poison nomorale', 'M', 'N', '', '3d8', 'hum:#708060:#405040:z', 'Shambling corpses, slow but tireless.');
  M('zombie_ogre', 'Ogre Zombie', 'undead', 6, 6, 9, '4d4', 'undead4 imm:sleep,charm,hold,mind,poison nomorale', 'L', 'N', '', '1d4', 'big:#708060:#405040:z', 'The reanimated corpse of an ogre, reeking and relentless.');
  M('ghoul', 'Ghoul', 'undead', 6, 2, 9, '1d3/1d3/1d6', 'undead2 para imm:sleep,charm,hold,mind', 'M', 'CE', 'B,T', '2d12', 'hum:#90a080:#506040:zc', 'Corpse-eaters whose claws bring creeping paralysis. Elves are immune.');
  M('ghast', 'Ghast', 'undead', 4, 4, 15, '1d4/1d4/1d8', 'undead5 para fear imm:sleep,charm,hold,mind', 'M', 'CE', 'B,Q,R,S,T', '1d6', 'hum:#708070:#304030:zc', 'Greater ghouls wrapped in a stench of the grave. Even elves are not safe.');
  M('shadow', 'Shadow', 'undead', 7, '3+3', 12, '1d4+1', 'undead3 weak magic1 imm:sleep,charm,hold,mind,cold', 'M', 'CE', 'F', '2d10', 'ghost:#202030:#000000:', 'Living darkness that drains strength with its chill touch.');
  M('wight', 'Wight', 'undead', 5, '4+3', 12, '1d4', 'undead4 drain1 silver imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'B', '2d8', 'hum:#a0a0b0:#303040:zr', 'Barrow-dwelling spirits that drain life with every touch.');
  M('wraith', 'Wraith', 'undead', 4, '5+3', 12, '1d6', 'undead6 drain1 silver fly imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'E', '2d8', 'ghost:#303040:#a0a0ff:r', 'A shrouded phantom of malice that drinks the souls of the living.');
  M('mummy', 'Mummy', 'undead', 3, '6+3', 6, '1d12', 'undead7 fear disease magic1 imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'D', '2d4', 'hum:#c0b080:#806040:z', 'A wrapped corpse of an ancient noble. Its touch brings wasting rot.');
  M('spectre', 'Spectre', 'undead', 2, 7, 15, '1d8', 'undead8 drain2 magic1 fly imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'Q,E', '1d6', 'ghost:#8080c0:#ffffff:r', 'A shimmering, hateful ghost that drains two levels at a touch.');
  M('vampire', 'Vampire', 'undead', 1, '8+3', 12, '1d6+4', 'undead9 drain2 regen3 magic1 charm imm:sleep,charm,hold,mind,poison', 'M', 'CE', 'F', '1d4', 'hum:#e0e0e0:#a00020:rk', 'An undead aristocrat that drinks blood and dominates minds.');
  M('ghost', 'Ghost', 'undead', 0, 10, 9, '1d6', 'undead10 fear drain1 magic1 imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'E,S', '1', 'ghost:#c0c0d0:#ffffff:', 'The restless spirit of one who died in anguish.');
  M('banshee', 'Wailing Spirit', 'undead', 0, 7, 12, '1d8', 'undead10 fear magic1 mr50 fly imm:sleep,charm,hold,mind,cold', 'M', 'CE', 'D', '1', 'ghost:#a0c0a0:#e0ffe0:r', 'The ghost of an evil woman whose keening can stop a heart.');
  M('lich', 'Lich', 'undead', 0, 11, 6, '1d10', 'undead11 para fear magic1 spells:fireball,cone_of_cold,hold_monster,death_spell,finger_death imm:sleep,charm,hold,mind,cold,elec,poison', 'M', 'NE', 'A', '1', 'skel:#c0b090:#6020a0:rk', 'A great wizard who has cheated death through dark rites.');
  M('poltergeist', 'Poltergeist', 'undead', 10, 0.5, 6, '1d2', 'undead0 fear invis silver imm:sleep,charm,hold,mind', 'S', 'LE', '', '1d8', 'ghost:#d0d0e0:#a0a0c0:', 'A mischievous spirit that hurls objects to frighten the living.');
  M('crypt_thing', 'Crypt Keeper', 'undead', 3, 6, 12, '1d8', 'undead6 magic1 imm:sleep,charm,hold,mind', 'M', 'N', 'Z', '1', 'skel:#d0c0a0:#402010:r', 'A robed skeleton that guards tombs and scatters intruders.');
  M('heucuva', 'Haunt Monk', 'undead', 3, 2, 9, '1d6', 'undead2 disease silver imm:sleep,charm,hold,mind', 'M', 'CE', '', '2d4', 'skel:#c0c0a0:#604020:r', 'The robed skeleton of a fallen holy man.');
  M('juju_zombie', 'Grave Revenant', 'undead', 6, '3+12', 9, '3d4', 'undead5 magic1 imm:sleep,charm,hold,mind,elec,poison', 'M', 'NE', '', '1d4', 'hum:#605050:#302020:z', 'A fast, cunning zombie risen through life-draining magic.');
  M('wolf_skel', 'Skeletal Hound', 'undead', 7, 2, 15, '1d8', 'undead1 imm:sleep,charm,hold,mind,poison nomorale', 'M', 'N', '', '2d6', 'quad:#e0e0d0:#606060:k', 'The animated bones of a great hound, with empty, burning sockets.');
  M('death_knight', 'Death Knight', 'undead', 0, 9, 12, '1d10+4', 'undead11 fear mr50 spells:fireball,pw_blind imm:sleep,charm,hold,mind,poison', 'M', 'CE', 'H,Z', '1', 'hum:#202020:#e04000:sk', 'A cursed knight of terrible prowess, damned to unlife.');
  M('dracolich', 'Bone Wyrm', 'undead', 0, 14, 12, '1d8/1d8/3d10', 'undead12 breath:cold:cone fear para imm:sleep,charm,hold,mind,cold,poison mr20', 'G', 'CE', 'H', '1', 'dragon:#d0d0b0:#406060:wk', 'The animated skeleton of a dragon, ruled by a malignant will.');

  /* ===== Lycanthropes ===== */
  M('wererat', 'Wererat', 'lycanthrope', 6, 3, 12, '1d8', 'silver disease', 'S', 'LE', 'C', '4d6', 'gob:#806050:#503020:t', 'A sly shapechanger that runs with packs of rats.');
  M('werewolf', 'Werewolf', 'lycanthrope', 5, '4+3', 15, '2d4', 'silver disease', 'M', 'CE', 'B', '3d6', 'quad:#706050:#403020:k', 'A cursed wolf-man of savage hunger.');
  M('wereboar', 'Wereboar', 'lycanthrope', 4, '5+2', 12, '2d6', 'silver disease', 'M', 'N', 'B,S', '2d4', 'quad:#604030:#302010:h', 'A bad-tempered boar-man with savage tusks.');
  M('weretiger', 'Weretiger', 'lycanthrope', 3, '6+2', 12, '1d4/1d4/1d12', 'silver disease', 'M', 'N', 'D,Q', '1d6', 'cat:#d08020:#202020:', 'A striped shapechanger of the southern jungles.');
  M('werebear', 'Werebear', 'lycanthrope', 2, '7+3', 9, '1d3/1d3/2d4', 'silver hug', 'L', 'CG', 'R,T,X', '1d4', 'quad:#604020:#301000:c', 'A noble bear-man, gruff but just.');
  M('jackalwere', 'Jackal-Shifter', 'lycanthrope', 4, 4, 12, '2d4', 'silver gaze:sleep', 'M', 'CE', 'C', '1d4', 'quad:#a08050:#504020:', 'A jackal that walks as a man and lulls victims to sleep with its gaze.');
  M('foxwoman', 'Vixen Shifter', 'lycanthrope', 4, 3, 15, '1d2/1d2/2d4', 'silver charm', 'M', 'CN', 'E', '1d3', 'quad:#e08030:#ffffff:', 'A fox that wears the shape of a beautiful woman.');

  /* ===== Dragons ===== */
  M('dragon_white', 'White Dragon', 'dragon', 3, 6, 12, '1d4/1d4/2d8', 'breath:cold:cone imm:cold fly fear', 'L', 'CE', 'E,O,S', '1d4', 'dragon:#e0f0ff:#80a0c0:w', 'The smallest and most bestial of the evil dragons, breathing frost.');
  M('dragon_black', 'Black Dragon', 'dragon', 3, 7, 12, '1d4/1d4/3d6', 'breath:acid:line imm:acid fly fear', 'L', 'CE', 'H', '1d4', 'dragon:#303030:#60a040:w', 'A cruel swamp-wyrm that spits a line of acid.');
  M('dragon_green', 'Green Dragon', 'dragon', 2, 8, 12, '1d6/1d6/2d10', 'breath:poison:cloud imm:poison fly fear', 'L', 'LE', 'H', '1d4', 'dragon:#40a040:#204020:w', 'A sly forest dragon that breathes poisonous gas.');
  M('dragon_blue', 'Blue Dragon', 'dragon', 2, 9, 9, '1d6/1d6/3d8', 'breath:elec:line imm:elec fly fear', 'L', 'LE', 'H,S', '1d4', 'dragon:#3060c0:#80c0ff:wh', 'A vain desert dragon that breathes a bolt of lightning.');
  M('dragon_red', 'Red Dragon', 'dragon', 1, 10, 9, '1d8/1d8/3d10', 'breath:fire:cone imm:fire fly fear', 'H', 'CE', 'H,S,T', '1d4', 'dragon:#c02010:#f0a020:wh', 'The greediest and most terrible of dragons, breathing a cone of fire.');
  M('dragon_brass', 'Brass Dragon', 'dragon', 2, 7, 12, '1d4/1d4/4d4', 'breath:sleep:cone imm:fire fly', 'L', 'CG', 'H', '1d4', 'dragon:#c0a040:#806020:w', 'A talkative dragon of the dunes whose breath brings sleep.');
  M('dragon_copper', 'Copper Dragon', 'dragon', 1, 8, 9, '1d4/1d4/5d4', 'breath:acid:line imm:acid fly', 'L', 'CG', 'H,S', '1d4', 'dragon:#c06030:#804020:w', 'A playful hill dragon fond of riddles.');
  M('dragon_bronze', 'Bronze Dragon', 'dragon', 0, 9, 9, '1d6/1d6/4d6', 'breath:elec:line imm:elec fly', 'L', 'LG', 'H,S,T', '1d4', 'dragon:#a08030:#60a0a0:wh', 'A noble coastal dragon who aids sailors and fights evil.');
  M('dragon_silver', 'Silver Dragon', 'dragon', -1, 10, 9, '1d6/1d6/5d6', 'breath:cold:cone imm:cold fly', 'H', 'LG', 'H,T', '1d4', 'dragon:#d0d0e0:#8090b0:wh', 'A kindly mountain dragon that often takes human form.');
  M('dragon_gold', 'Gold Dragon', 'dragon', -2, 11, 12, '1d8/1d8/6d6', 'breath:fire:cone imm:fire,poison fly', 'H', 'LG', 'H,R,S,T', '1d3', 'dragon:#f0c030:#a07010:wh', 'The wisest and mightiest of the good dragons.');
  M('dragon_shadow', 'Shadow Dragon', 'dragon', -1, 12, 12, '1d8/1d8/4d8', 'breath:drain:cone imm:cold fly fear', 'H', 'CE', 'H,S,T', '1', 'dragon:#202030:#504070:wh', 'A wyrm of living darkness whose breath steals life.');
  M('dragon_ancient_red', 'Ancient Red Wyrm', 'dragon', -3, 16, 12, '2d6/2d6/4d10', 'breath:fire:cone imm:fire fly fear mr30 spells:fireball,slow,hold_monster', 'G', 'CE', 'H,S,T,U', '1', 'dragon:#a01008:#ffc030:whk', 'A colossal crimson wyrm older than kingdoms.');
  M('dragon_turtle', 'Dragon Turtle', 'dragon', 0, 13, 9, '2d6/2d6/4d8', 'breath:fire:cloud', 'G', 'N', 'B,R,S,T,V', '1', 'dragon:#407060:#a0a060:t', 'A vast armoured sea-beast that breathes scalding steam.');
  M('wyvern', 'Wyvern', 'dragon', 3, '7+7', 6, '2d8/1d6', 'poison:x fly', 'H', 'NE', 'E', '1d6', 'dragon:#706050:#a04030:wt', 'A two-legged dragon-kin with a venomous tail-sting.');
  M('dragonne', 'Lion-Wyrm', 'dragon', 2, 9, 15, '1d8/1d8/3d6', 'fear', 'L', 'N', 'B,S,T', '1', 'cat:#c0a040:#806020:w', 'A brass-scaled cross between a lion and a dragon whose roar deafens.');
  M('pseudo_dragon', 'Sprite-Drake', 'dragon', 2, 2, 6, '1d3', 'poison:para fly mr35', 'S', 'NG', 'Q', '1', 'dragon:#c06040:#e0a080:w', 'A tiny cat-sized dragon with a sleep-venom sting.');
  M('fire_drake', 'Firedrake', 'dragon', 4, 4, 6, '2d4', 'breath:fire:cone:2d8 fly imm:fire', 'M', 'N', 'G', '1d4', 'dragon:#e04020:#f0c040:w', 'A small fiery dragon whose blood bursts into flame.');

  /* ===== Natural animals ===== */
  M('ape', 'Great Ape', 'beast', 6, '4+1', 12, '1d3/1d3/1d6', '', 'L', 'N', '', '1d6', 'hum:#404040:#202020:c', 'Massive grey apes of the hill forests.');
  M('ape_carnivorous', 'Blood Ape', 'beast', 6, 5, 12, '1d4/1d4/1d8', '', 'L', 'N', 'C', '1d4', 'hum:#704030:#402010:c', 'A savage, flesh-eating ape of the deep jungle.');
  M('baboon', 'Baboon', 'beast', 7, '1+1', 12, '1d4', '', 'S', 'N', '', '1d10x10', 'gob:#806040:#c04040:c', 'Noisy, aggressive troupes of dog-faced monkeys.');
  M('badger', 'Badger', 'beast', 4, '1+2', 6, '1d2/1d2/1d3', '', 'S', 'N', '', '1d4', 'quad:#606060:#e0e0e0:', 'A fierce little digger with a bad temper.');
  M('badger_giant', 'Giant Badger', 'beast', 4, 3, 6, '1d3/1d3/1d6', '', 'M', 'N', '', '1d4', 'quad:#505050:#e0e0e0:c', 'A badger the size of a pony, all claws and fury.');
  M('bear_black', 'Black Bear', 'beast', 7, '3+3', 12, '1d3/1d3/1d6', 'hug', 'M', 'N', '', '1d3', 'quad:#202020:#604020:c', 'A forest bear that will fight savagely if cornered.');
  M('bear_brown', 'Brown Bear', 'beast', 6, '5+5', 12, '1d6/1d6/1d8', 'hug', 'L', 'N', '', '1d6', 'quad:#704020:#402010:c', 'A huge bear whose crushing hug can break bones.');
  M('bear_cave', 'Cave Bear', 'beast', 6, '6+6', 12, '1d8/1d8/1d12', 'hug', 'L', 'N', '', '1d2', 'quad:#604030:#302010:c', 'A prehistoric bear of terrible size and appetite.');
  M('boar', 'Wild Boar', 'beast', 7, '3+3', 15, '3d4', '', 'M', 'N', '', '1d12', 'quad:#504030:#c0c0a0:h', 'A tusked wild pig that charges without fear.');
  M('boar_giant', 'Giant Boar', 'beast', 6, 5, 12, '3d6', '', 'L', 'N', '', '2d4', 'quad:#403020:#e0e0c0:h', 'A primeval boar as big as an ox.');
  M('warthog', 'Warthog', 'beast', 7, 3, 12, '2d4/2d4', '', 'S', 'N', '', '1d6', 'quad:#605040:#d0d0b0:h', 'A tough, ugly pig of the savannah.');
  M('buffalo', 'Buffalo', 'beast', 7, 5, 15, '1d8/1d8', '', 'L', 'N', '', '4d6', 'quad:#403020:#c0c0a0:h', 'A massive horned grazer that charges in herds.');
  M('bull', 'Wild Bull', 'beast', 7, 4, 15, '1d6/1d6', '', 'L', 'N', '', '1d20', 'quad:#302010:#e0e0d0:h', 'An ill-tempered horned bull.');
  M('camel', 'Wild Camel', 'beast', 7, 3, 21, '1d4', '', 'L', 'N', '', '1d12', 'quad:#c0a070:#806040:', 'A bad-tempered desert beast that spits and bites.');
  M('cattle', 'Wild Cattle', 'beast', 7, 2, 15, '1d6', '', 'L', 'N', '', '2d10', 'quad:#806040:#e0e0d0:h', 'Long-horned wild cattle that stampede at threats.');
  M('dog_wild', 'Wild Dog', 'beast', 7, '1+1', 15, '1d4', '', 'S', 'N', '', '4d4', 'quad:#a08060:#604020:k', 'Lean, hungry pack dogs.');
  M('dog_war', 'War Dog', 'beast', 6, '2+2', 12, '2d4', '', 'M', 'N', '', '2d4', 'quad:#604030:#a0a0a0:k', 'A mastiff trained to kill, in a spiked collar.');
  M('elephant', 'Elephant', 'beast', 6, 10, 15, '2d8/2d8/2d6/2d6', '', 'H', 'N', '', '1d12', 'quad:#808080:#e0e0d0:h', 'A great grey beast with tusks and trunk.');
  M('mammoth', 'Mammoth', 'beast', 5, 13, 12, '3d6/3d6/2d8', '', 'H', 'N', '', '1d12', 'quad:#604030:#e0d0b0:h', 'A shaggy elephant of the frozen steppes.');
  M('mastodon', 'Mastodon', 'beast', 6, 12, 15, '2d8/2d8/2d6', '', 'H', 'N', '', '1d12', 'quad:#705030:#e0d0b0:h', 'A primeval elephant with straight tusks.');
  M('hippopotamus', 'River Horse', 'beast', 6, 8, 9, '2d6', '', 'L', 'N', '', '1d12', 'quad:#806070:#a08090:', 'A huge, short-tempered river beast with crushing jaws.');
  M('horse_wild', 'Wild Horse', 'beast', 7, 2, 24, '1d3', '', 'L', 'N', '', '5d6', 'quad:#a07040:#302010:', 'Free-roaming horses of the open plain.');
  M('horse_war', 'Warhorse', 'beast', 7, 3, 18, '1d6/1d6/1d3', '', 'L', 'N', '', '1', 'quad:#302020:#a0a0a0:', 'A great destrier trained for battle.');
  M('mule', 'Mule', 'beast', 7, 3, 12, '1d2/1d6', '', 'M', 'N', '', '1', 'quad:#806050:#403020:', 'A stubborn beast of burden that kicks.');
  M('hyena', 'Hyena', 'beast', 7, 3, 12, '2d4', '', 'M', 'N', '', '2d6', 'quad:#a08050:#403020:k', 'A cackling scavenger that hunts in packs.');
  M('hyena_giant', 'Giant Hyena', 'beast', 7, 5, 12, '2d6', '', 'L', 'N', '', '2d6', 'quad:#907040:#302010:k', 'A hyena the size of a horse.');
  M('jackal', 'Jackal', 'beast', 7, 0.5, 12, '1d2', '', 'S', 'N', '', '3d4', 'quad:#c0a060:#604020:k', 'A cowardly little scavenging dog.');
  M('jaguar', 'Jaguar', 'beast', 6, '4+1', 15, '1d3/1d3/1d8', 'ambush', 'L', 'N', '', '1d2', 'cat:#d0a040:#302010:', 'A spotted jungle cat that drops from the trees.');
  M('leopard', 'Leopard', 'beast', 6, '3+2', 12, '1d3/1d3/1d6', 'ambush', 'M', 'N', '', '1d2', 'cat:#e0b040:#302010:', 'A sleek spotted cat that stalks its prey.');
  M('lion', 'Lion', 'beast', 5, '5+2', 12, '1d4/1d4/1d10', '', 'L', 'N', '', '2d4', 'cat:#c09040:#805020:', 'The tawny king of the grasslands.');
  M('lion_mountain', 'Mountain Lion', 'beast', 6, '3+1', 12, '1d3/1d3/1d6', 'ambush', 'M', 'N', '', '1d2', 'cat:#a08060:#604020:', 'A tawny hunter of the crags.');
  M('lion_spotted', 'Cave Lion', 'beast', 6, 6, 12, '1d4/1d4/1d12', '', 'L', 'N', '', '1d8', 'cat:#a07040:#503020:', 'A huge prehistoric lion.');
  M('tiger', 'Tiger', 'beast', 6, '5+5', 12, '1d4/1d4/1d10', 'ambush', 'L', 'N', '', '1d4', 'cat:#e08020:#202020:', 'A great striped hunter.');
  M('sabretooth', 'Sabre-Tooth Tiger', 'beast', 6, '7+2', 12, '1d4/1d4/2d6', '', 'L', 'N', '', '1d2', 'cat:#c09050:#e0e0e0:', 'A prehistoric cat with fangs like daggers.');
  M('lynx_giant', 'Giant Lynx', 'beast', 6, '2+2', 12, '1d2/1d2/1d4', 'ambush', 'M', 'N', '', '1d4', 'cat:#c0b090:#706050:', 'A clever, tufted cat of the northern woods.');
  M('rhino', 'Rhinoceros', 'beast', 6, 8, 12, '2d4', '', 'L', 'N', '', '1d6', 'quad:#808080:#606060:h', 'An armoured horned beast with a short temper.');
  M('rhino_woolly', 'Woolly Rhinoceros', 'beast', 6, 10, 12, '2d6', '', 'L', 'N', '', '1d4', 'quad:#705030:#e0d0b0:h', 'A shaggy rhino of the ice age.');
  M('stag', 'Stag', 'beast', 7, 3, 24, '2d4', '', 'L', 'N', '', '1d4', 'quad:#a07040:#d0b080:h', 'A proud forest stag with sharp antlers.');
  M('stag_giant', 'Elk Lord', 'beast', 7, 5, 21, '4d4', '', 'L', 'N', '', '1d4', 'quad:#906030:#e0c080:h', 'A huge stag with antlers spanning ten feet.');
  M('wolf', 'Wolf', 'beast', 7, '2+2', 18, '1d4+1', '', 'S', 'N', '', '2d10', 'quad:#808080:#404040:k', 'Grey hunters of the forest that run in packs.');
  M('dire_wolf', 'Dire Wolf', 'beast', 6, '3+3', 18, '2d4', '', 'M', 'N', '', '3d4', 'quad:#605040:#302010:k', 'A huge, savage wolf of the wild places.');
  M('worg', 'Warg', 'beast', 6, '4+4', 18, '2d4', '', 'L', 'NE', '', '2d6', 'quad:#403830:#a02020:k', 'An evil, intelligent wolf that serves goblin masters.');
  M('winter_wolf', 'Frost Wolf', 'beast', 5, 6, 18, '2d4', 'breath:cold:cone:6d4 imm:cold', 'L', 'NE', 'B', '2d4', 'quad:#e0f0ff:#80a0c0:k', 'A white wolf of the glaciers that breathes frost.');
  M('wolverine', 'Wolverine', 'beast', 5, 3, 12, '1d4/1d4/2d4', '', 'S', 'N', '', '1', 'quad:#403020:#806040:c', 'A small, ferocious beast that fears nothing.');
  M('wolverine_giant', 'Giant Wolverine', 'beast', 4, '4+4', 15, '1d4/1d4/2d4', 'fear', 'M', 'N', '', '1', 'quad:#302010:#806040:c', 'A wolverine the size of a bear, with a musk that stings the eyes.');
  M('crocodile', 'Crocodile', 'reptile', 5, 3, 6, '2d4/1d12', 'ambush', 'L', 'N', '', '3d8', 'lizard:#506040:#a0a060:t', 'A patient river predator that waits beneath the surface.');
  M('crocodile_giant', 'Giant Crocodile', 'reptile', 4, 7, 6, '3d6/2d10', 'ambush', 'H', 'N', '', '1d4', 'lizard:#405030:#909050:t', 'A crocodile thirty feet long.');
  M('weasel_giant', 'Giant Weasel', 'beast', 6, '3+3', 15, '2d6', 'drain0', 'M', 'N', 'V', '1d6', 'quad:#a07040:#e0d0b0:', 'A long, sinuous predator that drinks the blood of its prey.');
  M('skunk_giant', 'Giant Skunk', 'beast', 7, 5, 12, '1d6', 'blind', 'M', 'N', '', '1', 'quad:#202020:#ffffff:', 'A skunk big as a pony whose spray blinds and sickens.');
  M('porcupine_giant', 'Giant Porcupine', 'beast', 5, 6, 9, '2d4', 'ranged:1d4:3', 'M', 'N', '', '1d2', 'quad:#605040:#c0b090:', 'A huge rodent that flings its quills.');
  M('beaver_giant', 'Giant Beaver', 'beast', 6, 4, 6, '4d4', '', 'M', 'N', '', '1d10x10', 'quad:#704020:#402010:', 'A beaver as large as a man, builders of great dams.');
  M('rat_giant', 'Giant Rat', 'beast', 7, 0.5, 12, '1d3', 'disease', 'S', 'N', 'C', '5d10', 'quad:#605040:#c08080:', 'A filthy cat-sized rat that spreads disease.');
  M('rat_swarm', 'Rat Swarm', 'beast', 8, 1, 12, '1d4', 'disease', 'S', 'N', '', '2d4', 'quad:#504030:#a06060:', 'A writhing tide of verminous rats.');
  M('bat_giant', 'Giant Bat', 'beast', 8, 1, 18, '1d4', 'fly', 'S', 'N', '', '3d6', 'bat:#504040:#a06060:w', 'A bat with a three-foot wingspan.');
  M('bat_mobat', 'Shriekwing', 'beast', 7, 4, 18, '2d4', 'fly fear', 'L', 'N', '', '1d4', 'bat:#403030:#c04040:w', 'A huge bat whose shriek terrifies.');
  M('axe_beak', 'Axe-Beak', 'avian', 6, 3, 18, '1d3/1d3/2d4', '', 'L', 'N', '', '1d6', 'bird:#806030:#e0c060:', 'A fierce, flightless bird with a beak like an axe.');
  M('owl_giant', 'Giant Owl', 'avian', 6, 4, 18, '2d4/2d4/2d4', 'fly ambush', 'M', 'N', '', '1d4', 'bird:#806040:#e0c080:w', 'A silent, wise hunter of the night.');
  M('eagle_giant', 'Giant Eagle', 'avian', 7, 4, 30, '1d6/1d6/2d6', 'fly', 'L', 'N', '', '1d20', 'bird:#604020:#ffffff:w', 'A noble eagle large enough to carry a man.');
  M('hawk_blood', 'Blood Hawk', 'avian', 7, '1+1', 24, '1d4/1d4/1d6', 'fly', 'S', 'N', '', '4d6', 'bird:#a03020:#604020:w', 'An aggressive hawk that hunts men.');
  M('vulture_giant', 'Giant Vulture', 'avian', 7, '2+2', 27, '1d4', 'fly', 'M', 'N', '', '1d6', 'bird:#302020:#c0a0a0:w', 'A carrion bird that follows armies.');
  M('roc', 'Roc', 'avian', 4, 18, 30, '3d6/3d6/4d6', 'fly', 'G', 'N', 'C', '1', 'bird:#806040:#c0a060:w', 'A bird so vast it carries off elephants.');
  M('cockatrice', 'Cockatrice', 'avian', 6, 5, 6, '1d3', 'stone fly', 'S', 'N', 'D', '1d6', 'bird:#c0a040:#40a040:t', 'A hideous rooster-lizard whose touch turns flesh to stone.');
  M('stirge', 'Stirge', 'avian', 8, '1+1', 18, '1d3', 'fly drain0', 'S', 'N', 'D', '3d10', 'bird:#a05050:#603030:w', 'A rust-red bloodsucker with a long probing beak.');
  M('peryton', 'Peryton', 'avian', 7, 4, 21, '4d4', 'fly magic1', 'M', 'CE', 'B', '2d4', 'bird:#406040:#a08060:wh', 'A stag-headed bird of prey that tears out hearts.');
  M('dinosaur_t', 'Tyrant Lizard', 'reptile', 5, 18, 15, '5d8', '', 'G', 'N', '', '1', 'lizard:#607040:#c0a060:t', 'A towering two-legged hunter with jaws like a portcullis.');
  M('dinosaur_tri', 'Three-Horn', 'reptile', 2, 16, 12, '1d8/1d12/1d12', '', 'G', 'N', '', '1d4', 'quad:#708050:#e0d0a0:h', 'A massive frilled beast with three great horns.');
  M('dinosaur_steg', 'Plate-Back', 'reptile', 2, 18, 6, '5d4', '', 'G', 'N', '', '1d4', 'lizard:#607060:#a06040:t', 'A slow, armoured beast with a spiked tail.');
  M('dinosaur_bront', 'Thunder Lizard', 'reptile', 5, 26, 6, '3d6', '', 'G', 'N', '', '1d3', 'lizard:#708070:#a0a080:t', 'A long-necked giant whose step shakes the ground.');
  M('dinosaur_ptera', 'Sky Lizard', 'reptile', 7, '3+3', 15, '2d4', 'fly', 'L', 'N', '', '3d6', 'bird:#806050:#c08040:w', 'A leathery flying reptile with a long beak.');
  M('dinosaur_anky', 'Club-Tail', 'reptile', 0, 9, 6, '3d6', '', 'H', 'N', '', '1d4', 'lizard:#706040:#504030:t', 'A low, armoured beast with a club-like tail.');
  M('titanothere', 'Titanothere', 'beast', 6, 12, 12, '2d8', '', 'H', 'N', '', '1d6', 'quad:#605040:#a09070:h', 'An enormous blunt-horned grazer of ancient plains.');
  M('irish_deer', 'Great Elk', 'beast', 7, 4, 18, '2d4/1d4/1d4', '', 'L', 'N', '', '1d4', 'quad:#906040:#e0c080:h', 'A giant deer of the moors.');

  /* ===== Giant vermin and insects ===== */
  M('ant_giant', 'Giant Ant', 'insect', 3, 2, 18, '1d6', '', 'S', 'N', 'Q', '1d100', 'bug:#402010:#802010:', 'A dog-sized ant that serves its colony with mindless devotion.');
  M('ant_warrior', 'Giant Soldier Ant', 'insect', 3, 3, 18, '2d4', 'poison:3d4', 'S', 'N', 'Q', '1d10', 'bug:#601010:#a02010:', 'A soldier of the ant colony with a venomous sting.');
  M('ant_queen', 'Giant Ant Queen', 'insect', 3, 10, 3, '0', 'nomorale', 'L', 'N', 'Q,S', '1', 'bug:#502010:#c08020:k', 'The bloated queen of a giant ant nest.');
  M('beetle_bombardier', 'Bombardier Beetle', 'insect', 4, '2+2', 9, '2d6', 'acid', 'S', 'N', '', '3d4', 'bug:#a03010:#202020:', 'A beetle that sprays boiling acid from its abdomen.');
  M('beetle_boring', 'Boring Beetle', 'insect', 3, 5, 6, '5d4', '', 'L', 'N', 'C,R,S,T', '3d6', 'bug:#605030:#302010:', 'A huge beetle that tunnels through rotting wood and stone.');
  M('beetle_fire', 'Fire Beetle', 'insect', 4, '1+2', 12, '2d4', '', 'S', 'N', '', '3d4', 'bug:#802010:#ff8020:', 'A beetle with glowing glands, prized for lamp-oil.');
  M('beetle_rhino', 'Rhinoceros Beetle', 'insect', 2, 12, 6, '3d6/2d8', '', 'L', 'N', '', '1d6', 'bug:#304030:#a0a080:h', 'A colossal horned beetle.');
  M('beetle_stag', 'Stag Beetle', 'insect', 3, 7, 6, '4d4/1d10/1d10', '', 'L', 'N', '', '2d6', 'bug:#403020:#806040:h', 'A great beetle with massive pincer-horns.');
  M('beetle_water', 'Water Beetle', 'insect', 3, 4, 3, '3d6', '', 'M', 'N', '', '1d12', 'bug:#204040:#408080:', 'A predatory beetle of deep pools.');
  M('centipede', 'Giant Centipede', 'insect', 9, 0.5, 15, '0', 'poison:1d6', 'S', 'N', '', '2d12', 'worm:#a04020:#e0c040:l', 'A foot-long centipede with a venomous bite.');
  M('centipede_huge', 'Monstrous Centipede', 'insect', 5, 3, 15, '1d6', 'poison:2d6', 'M', 'N', '', '1d6', 'worm:#802010:#e0a030:l', 'A centipede as long as a man.');
  M('scorpion_giant', 'Giant Scorpion', 'insect', 3, '5+5', 15, '1d10/1d10/1d4', 'poison:x', 'L', 'N', 'D', '1d6', 'bug:#403020:#c08030:t', 'A huge scorpion with crushing claws and a deadly sting.');
  M('spider_large', 'Large Spider', 'insect', 8, '1+1', 6, '1', 'poison:2d4 web', 'S', 'N', 'J,N', '2d10', 'bug:#403030:#806060:l', 'A hairy spider the size of a cat.');
  M('spider_huge', 'Huge Spider', 'insect', 6, '2+2', 18, '1d6', 'poison:3d4 ambush', 'M', 'N', 'J,N,Q', '1d12', 'bug:#302020:#a04040:l', 'A wolf-sized hunting spider that leaps on prey.');
  M('spider_giant', 'Giant Spider', 'insect', 4, '4+4', 12, '2d4', 'poison:x web ambush', 'L', 'CE', 'C', '1d8', 'bug:#201010:#c02020:l', 'A spider large as a horse, weaving webs across whole caverns.');
  M('spider_phase', 'Phase Spider', 'insect', 7, '5+5', 15, '1d6', 'poison:x blink', 'L', 'N', 'E', '1d4', 'bug:#4040a0:#a0a0ff:l', 'A spider that flickers between worlds.');
  M('spider_sword', 'Blade Spider', 'insect', 3, '5+5', 15, '1d10/1d6/1d6', 'poison:2d6', 'L', 'N', 'C', '1d3', 'bug:#606060:#c0c0c0:l', 'A spider with legs like sword-blades.');
  M('tick_giant', 'Giant Tick', 'insect', 3, 3, 3, '1d4', 'drain0 disease', 'S', 'N', '', '3d4', 'bug:#604020:#a06040:', 'A bloated tick that drains blood and spreads fever.');
  M('wasp_giant', 'Giant Wasp', 'insect', 4, 4, 21, '2d4/1d4', 'poison:para fly', 'M', 'N', 'Q', '1d20', 'bug:#e0c020:#202020:w', 'A wasp the size of a dog whose sting paralyses.');
  M('hornet_giant', 'Giant Hornet', 'insect', 2, 5, 24, '1d4/1d8', 'poison:2d6 fly', 'M', 'N', '', '1d6', 'bug:#d0a010:#401010:w', 'A furious, buzzing hornet with a burning sting.');
  M('fly_giant', 'Giant Fly', 'insect', 6, 2, 30, '1d8', 'fly disease', 'S', 'N', '', '2d6', 'bug:#204020:#a0a040:w', 'A bristly, buzzing fly drawn to carrion.');
  M('termite_giant', 'Giant Termite', 'insect', 4, 2, 9, '2d4', '', 'S', 'N', '', '5d10', 'bug:#d0b080:#604020:', 'A pale wood-eating termite.');
  M('dragonfly_giant', 'Giant Dragonfly', 'insect', 3, 3, 36, '3d4', 'fly', 'M', 'N', '', '1d6', 'bug:#4080a0:#a0ffff:w', 'A darting predator with glittering wings.');
  M('mantis_giant', 'Giant Mantis', 'insect', 4, 5, 12, '1d8/1d8/1d12', 'ambush', 'L', 'N', '', '1d2', 'bug:#60a040:#a0e060:', 'A green praying mantis that seizes prey in spiked arms.');
  M('slug_giant', 'Giant Slug', 'insect', 8, 12, 6, '1d12', 'acid ranged:4d8:6', 'H', 'N', '', '1', 'worm:#808060:#c0c090:', 'A slug as big as a wagon that spits acid.');
  M('leech_giant', 'Giant Leech', 'insect', 9, 2, 3, '1d4', 'drain0 disease', 'S', 'N', '', '4d4', 'worm:#403030:#806060:', 'A swamp leech the length of an arm.');
  M('rot_grub', 'Rot Grub', 'insect', 9, 0.5, 1, '0', 'disease', 'S', 'N', '', '5d4', 'worm:#e0e0c0:#a0a080:', 'Pale grubs that burrow into flesh.');
  M('crab_giant', 'Giant Crab', 'insect', 3, 3, 9, '2d4/2d4', '', 'L', 'N', '', '2d6', 'bug:#c04020:#e08060:c', 'A crab large enough to snap a man in two.');
  M('crayfish_giant', 'Giant Crayfish', 'insect', 4, '4+4', 6, '2d6/2d6', '', 'L', 'N', '', '1d4', 'bug:#806040:#c06040:c', 'A huge freshwater crayfish of deep rivers.');
  M('frog_giant', 'Giant Frog', 'reptile', 7, 2, 9, '1d6', '', 'S', 'N', '', '5d8', 'lizard:#40a040:#e0e060:', 'A frog as big as a dog with a long sticky tongue.');
  M('frog_killer', 'Killer Frog', 'reptile', 8, '1+4', 9, '1d2/1d2/2d4', '', 'S', 'N', '', '3d6', 'lizard:#608030:#c04040:', 'An aggressive frog with claws and teeth.');
  M('frog_poison', 'Poison Frog', 'reptile', 8, 1, 9, '1d2', 'poison:2d6', 'S', 'N', '', '3d4', 'lizard:#e04020:#202020:', 'A brightly-coloured frog whose bite is venomous.');
  M('toad_giant', 'Giant Toad', 'reptile', 6, '2+4', 6, '2d4', '', 'M', 'N', '', '1d12', 'lizard:#806040:#a09060:', 'A warty toad that hops twelve feet at a bound.');
  M('toad_ice', 'Ice Toad', 'reptile', 4, 5, 9, '3d4', 'imm:cold', 'M', 'N', 'C', '1d6', 'lizard:#c0e0ff:#80a0c0:', 'A pale toad that radiates bitter cold.');
  M('toad_poison', 'Venom Toad', 'reptile', 7, 2, 6, '2d4', 'poison:2d8', 'M', 'N', '', '1d12', 'lizard:#608040:#a0c040:', 'A giant toad with a poisonous bite.');

  /* ===== Reptiles and snakes ===== */
  M('lizard_giant', 'Giant Lizard', 'reptile', 5, 3, 15, '1d8', '', 'M', 'N', '', '2d6', 'lizard:#60a060:#a0c060:t', 'A huge monitor lizard.');
  M('lizard_fire', 'Fire Lizard', 'reptile', 3, 10, 9, '1d8/1d8/2d8', 'breath:fire:cone:2d6 imm:fire', 'G', 'N', 'B,Q,S,T', '1d2', 'lizard:#c04020:#f0a020:t', 'A wingless red reptile often mistaken for a dragon.');
  M('lizard_minotaur', 'Horned Lizard', 'reptile', 5, 8, 6, '2d6/2d6/3d6', 'ambush', 'H', 'N', '', '1d8', 'lizard:#706040:#c0b080:th', 'An enormous horned lizard that lurks among rocks.');
  M('lizard_cave', 'Cave Lizard', 'reptile', 5, 6, 12, '2d6', '', 'L', 'N', 'O', '1d6', 'lizard:#504050:#806080:t', 'A pale lizard that clings to cave ceilings.');
  M('snake_viper', 'Giant Viper', 'reptile', 6, '4+2', 15, '1d3', 'poison:x', 'M', 'N', '', '1d6', 'snake:#806030:#c0a040:', 'A venomous snake ten feet long.');
  M('snake_constrictor', 'Giant Constrictor', 'reptile', 5, '6+1', 9, '1d4/2d4', 'hug', 'L', 'N', '', '1d2', 'snake:#606030:#a0a050:', 'A great serpent that crushes its prey.');
  M('snake_spitting', 'Spitting Cobra', 'reptile', 5, '4+2', 12, '1d3', 'poison:x blind', 'M', 'N', '', '1d6', 'snake:#404030:#c0a060:', 'A cobra that blinds with venom at range.');
  M('snake_sea', 'Sea Serpent', 'reptile', 5, '8+3', 12, '1d6/3d6', 'poison:x', 'L', 'N', '', '1d8', 'snake:#306060:#80c0c0:', 'A venomous serpent of the warm seas.');
  M('snake_amphis', 'Two-Headed Viper', 'reptile', 3, 6, 12, '1d3/1d3', 'poison:x', 'M', 'N', '', '1d3', 'snake:#405030:#a0c060:m', 'A venomous snake with a head at each end.');
  M('snake_pit', 'Pit Viper', 'reptile', 6, 2, 15, '1d4', 'poison:2d6', 'S', 'N', '', '2d4', 'snake:#806040:#402010:', 'A small venomous snake of the rocks.');
  M('basilisk', 'Basilisk', 'reptile', 4, '6+1', 6, '1d10', 'gaze:stone', 'M', 'N', 'F', '1d4', 'lizard:#407040:#e0e040:t', 'An eight-legged reptile whose gaze turns living flesh to stone.');
  M('catoblepas', 'Mire-Beast', 'beast', 7, 6, 6, '1d6', 'gaze:death', 'L', 'N', 'C', '1d3', 'quad:#606040:#403020:', 'A hideous swamp-beast whose rare upward glance kills.');
  M('gorgon', 'Iron Bull', 'beast', 2, 8, 12, '2d6', 'breath:stone:cone', 'L', 'N', 'E', '1d4', 'quad:#606070:#a0a0b0:h', 'A bull with plates of iron, breathing petrifying vapour.');
  M('chimera', 'Chimera', 'beast', 6, 9, 12, '1d3/1d3/1d4/1d4/2d4/3d4', 'breath:fire:cone:3d8 fly', 'L', 'CE', 'F', '1d4', 'cat:#c08040:#802020:wh', 'A three-headed horror: lion, goat and dragon.');
  M('hydra_5', 'Five-Headed Hydra', 'reptile', 5, 5, 9, '1d6/1d6/1d6/1d6/1d6', '', 'G', 'N', 'B', '1', 'dragon:#407040:#a0c060:m', 'A many-headed serpent; each head bites independently.');
  M('hydra_7', 'Seven-Headed Hydra', 'reptile', 5, 7, 9, '1d8/1d8/1d8/1d8/1d8/1d8/1d8', '', 'G', 'N', 'B', '1', 'dragon:#306030:#a0c060:m', 'A huge hydra with seven snapping heads.');
  M('hydra_10', 'Ten-Headed Hydra', 'reptile', 5, 10, 9, '1d10/1d10/1d10/1d10/1d10/1d10', 'regen2', 'G', 'N', 'B', '1', 'dragon:#205020:#80b040:m', 'An ancient hydra whose heads regrow.');
  M('hydra_pyro', 'Fire Hydra', 'reptile', 5, 8, 9, '1d8/1d8/1d8/1d8', 'breath:fire:cone:4d6 imm:fire', 'G', 'N', 'B', '1', 'dragon:#a03020:#f0a040:m', 'A red-scaled hydra whose heads breathe flame.');

  /* ===== Magical beasts ===== */
  M('ankheg', 'Ankheg', 'insect', 2, 5, 12, '3d6', 'acid ranged:8d4:3 ambush', 'L', 'N', 'C', '1d6', 'bug:#806030:#c0a040:', 'A burrowing insect-beast that spits acid from beneath the fields.');
  M('blink_dog', 'Blink Hound', 'beast', 5, 4, 12, '1d6', 'blink', 'M', 'LG', 'C', '4d4', 'quad:#c0a060:#806030:k', 'An intelligent hound that teleports short distances in battle.');
  M('bulette', 'Burrowmaw', 'beast', -2, 9, 14, '4d12/3d6/3d6', 'ambush', 'L', 'N', '', '1d2', 'quad:#607080:#a09060:h', 'An armoured burrowing terror with a crested back and huge jaws.');
  M('displacer', 'Phase Panther', 'beast', 4, 6, 15, '2d4/2d4', 'blink', 'L', 'NE', 'D', '1d4', 'cat:#303050:#6060a0:', 'A six-legged panther that seems to stand where it is not.');
  M('griffon', 'Griffon', 'avian', 3, 7, 30, '1d4/1d4/2d8', 'fly', 'L', 'N', 'C', '2d6', 'cat:#c09040:#806030:w', 'A beast with an eagle\'s head and wings and a lion\'s body.');
  M('hippogriff', 'Hippogriff', 'avian', 5, '3+3', 18, '1d6/1d6/1d10', 'fly', 'L', 'N', 'Q', '2d8', 'quad:#a08060:#ffffff:w', 'A beast with an eagle\'s fore-quarters and a horse\'s hind.');
  M('pegasus', 'Winged Horse', 'avian', 6, 4, 24, '1d8/1d8/1d3', 'fly', 'L', 'CG', '', '1d10', 'quad:#f0f0f0:#c0c0e0:w', 'A noble white horse with great feathered wings.');
  M('unicorn', 'Unicorn', 'beast', 2, '4+4', 24, '1d6/1d6/1d12', 'res:poison,charm mr25', 'L', 'CG', '', '1d6', 'quad:#ffffff:#f0e080:h', 'A shy, fierce guardian of the deep woods with a spiral horn.');
  M('nightmare', 'Hellsteed', 'fiend', -4, '6+6', 15, '2d4/4d4/2d4', 'fly breath:fire:cloud:2d6', 'L', 'NE', '', '1', 'quad:#101010:#ff4000:w', 'A demonic black horse with flaming hooves.');
  M('hell_hound', 'Hell Hound', 'fiend', 4, 5, 12, '1d10', 'breath:fire:cone:5d6 imm:fire', 'M', 'LE', 'C', '2d4', 'quad:#602010:#ff6020:k', 'A rust-red hound from below that breathes fire.');
  M('manticore', 'Manticore', 'beast', 4, '6+3', 12, '1d3/1d3/1d8', 'ranged:1d6:18 fly', 'H', 'LE', 'E', '1d4', 'cat:#a06040:#604040:wt', 'A man-faced lion with bat wings and a tail of iron spikes.');
  M('lamia', 'Lamia', 'beast', 3, 9, 24, '1d4', 'weak spells:charm_person,mirror_image', 'M', 'CE', 'D', '1', 'cat:#c0a060:#e0b0a0:r', 'Half woman, half lion, she lures men to the desert to drain their wits.');
  M('lammasu', 'Lammasu', 'beast', 6, 7, 12, '1d6/1d6', 'fly mr30 spells:cure_serious,prot_evil_10 invis', 'L', 'LG', 'R,S,T', '2d4', 'cat:#e0c060:#ffffff:wk', 'A winged, man-headed lion that protects the innocent.');
  M('shedu', 'Shedu', 'beast', 4, '9+9', 12, '1d6/1d6', 'fly mr25', 'L', 'LG', 'G', '2d4', 'quad:#c0a060:#ffffff:wk', 'A winged, man-headed bull of great wisdom.');
  M('sphinx_andro', 'Lion Sphinx', 'beast', -2, 12, 18, '2d6/2d6', 'fly fear spells:cure_serious,dispel_magic_p,flame_strike', 'L', 'CG', 'U', '1', 'cat:#e0c060:#806030:wk', 'A noble lion with a man\'s face, whose roar shatters stone.');
  M('sphinx_crio', 'Ram Sphinx', 'beast', 0, 10, 12, '3d6', 'fly', 'L', 'N', 'E', '1', 'cat:#d0b060:#806030:wh', 'A winged lion with the head of a ram, greedy and gruff.');
  M('sphinx_gyno', 'Riddle Sphinx', 'beast', -1, 8, 15, '2d4/2d4', 'fly spells:confusion,fear', 'L', 'N', 'R,X', '1', 'cat:#e0b060:#e0b0a0:w', 'A winged lioness with a woman\'s head, fond of riddles.');
  M('sphinx_hieraco', 'Hawk Sphinx', 'beast', 1, 9, 9, '2d4/2d4/1d10', 'fly', 'L', 'CE', '', '1d6', 'cat:#a07040:#604020:w', 'A savage winged lion with a hawk\'s head.');
  M('owlbear', 'Owlbear', 'beast', 5, '5+2', 12, '1d6/1d6/2d6', 'hug', 'L', 'N', 'C', '1d4', 'quad:#806040:#e0c080:c', 'A bear with an owl\'s head and an evil temper, born of a mad wizard\'s meddling.');
  M('leucrotta', 'Leucrotta', 'beast', 4, 6, 18, '3d6', '', 'L', 'CE', 'D', '1d4', 'quad:#a08060:#604020:', 'An ugly beast that mimics human voices to lure prey.');
  M('rust_monster', 'Rust Eater', 'beast', 2, 5, 18, '0', 'rust', 'M', 'N', 'Q', '1d2', 'bug:#a06030:#e0a060:', 'An insect-like beast that devours metal, its antennae turning steel to rust.');
  M('carrion_crawler', 'Carrion Creeper', 'insect', 3, '3+1', 12, '0/0/0/0/0/0/0/0', 'para', 'L', 'N', 'B', '1d6', 'worm:#80a080:#d0d0a0:l', 'A segmented scavenger whose writhing tentacles paralyse.');
  M('umber_hulk', 'Burrow Horror', 'aberration', 2, 8, 6, '3d4/3d4/2d5', 'gaze:confuse', 'L', 'CE', 'G', '1d4', 'big:#403020:#c0a040:cx', 'A beetle-like brute that tunnels through rock; its eyes confuse.');
  M('beholder', 'Gloomgazer', 'aberration', 0, 11, 3, '2d4', 'gaze:death mr20 spells:hold_monster,fear,slow,disintegrate,charm_monster fly', 'L', 'LE', 'I,S,T', '1', 'eye:#806080:#ffe060:x', 'A floating orb of malice with a central eye and writhing eye-stalks.');
  M('eye_floating', 'Drifting Eye', 'aberration', 9, 0.5, 1, '0', 'gaze:para', 'S', 'N', '', '1d12', 'eye:#c0e0ff:#4080c0:', 'A fish-like eye that floats in murky water, paralysing with a glance.');
  M('mind_flayer', 'Mindrender', 'aberration', 5, '8+4', 12, '2', 'mr90 spells:charm_monster,hold_monster stun', 'M', 'LE', 'S,T,X', '1d4', 'hum:#806090:#401040:rt', 'A purple-skinned horror with a tentacled face that feeds on brains.');
  M('neo_otyugh', 'Midden Beast', 'aberration', 3, 6, 6, '1d8/1d8/1d3', 'disease', 'L', 'N', '', '1', 'blob:#706050:#a09060:t', 'A three-legged refuse-eater with grasping tentacles.');
  M('otyugh_neo', 'Greater Midden Beast', 'aberration', 0, 12, 6, '2d6/2d6/1d3', 'disease', 'L', 'N', '', '1', 'blob:#605040:#908050:t', 'A huge, clever refuse-eater.');
  M('roper', 'Cave Tendril', 'aberration', 0, 10, 3, '5d4', 'weak mr80 ambush imm:elec', 'L', 'CE', 'M', '1d3', 'plant:#806050:#c0a080:t', 'A stalagmite-like predator that lashes out with sticky strands.');
  M('lurker', 'Ceiling Lurker', 'aberration', 6, 10, 1, '1d6', 'ambush hug', 'H', 'N', 'C', '1', 'blob:#504040:#806060:', 'A flat, grey creature that drops on prey from cavern ceilings.');
  M('trapper', 'Floor Mimic', 'aberration', 3, 12, 3, '4', 'ambush hug', 'H', 'N', 'G', '1', 'blob:#606060:#808080:', 'A vast flat creature that lies as a stone floor, then folds over prey.');
  M('mimic', 'Mimic', 'aberration', 7, 8, 3, '3d4', 'ambush', 'L', 'N', '', '1', 'blob:#806040:#a08060:', 'A shapechanger that disguises itself as a chest or a door.');
  M('piercer', 'Piercer', 'aberration', 3, 3, 1, '3d6', 'ambush', 'S', 'N', '', '3d6', 'worm:#808070:#a0a090:', 'A stalactite-like creature that drops on those below.');
  M('xorn', 'Stone-Eater', 'elemental', -2, '7+7', 9, '1d3/1d3/1d3/6d4', 'imm:fire,cold res:elec', 'M', 'N', 'O,P,Q', '1d4', 'blob:#706050:#a09070:x', 'A three-armed eater of stone and gems from the earth plane.');
  M('purple_worm', 'Violet Worm', 'beast', 6, 15, 9, '2d12/2d4', 'poison:x swallow', 'G', 'N', 'P,Q,R,S', '1d4', 'worm:#804080:#c080c0:', 'A colossal burrowing worm with a poisoned tail-sting.');
  M('remorhaz', 'Frost Burrower', 'beast', 0, 10, 12, '6d6', 'imm:cold swallow', 'H', 'N', 'F', '1', 'worm:#80a0c0:#ff6020:l', 'A glacier-dwelling centipede-beast whose back glows red-hot.');
  M('slithering_tracker', 'Slithering Tracker', 'ooze', 5, 5, 12, '0', 'para ambush', 'S', 'N', 'C', '1', 'blob:#c0d0e0:#a0b0c0:', 'A transparent ooze that paralyses sleepers and drains them.');
  M('shambling_mound', 'Shambling Mound', 'plant', 0, 8, 6, '2d8/2d8', 'imm:elec res:fire,cold hug', 'L', 'N', 'B,T,X', '1d3', 'plant:#405030:#706040:', 'A heap of rotting vegetation that smothers its prey.');
  M('treant', 'Treant', 'plant', 0, 12, 12, '4d6/4d6', 'res:poison', 'H', 'CG', 'Q,X', '1d20', 'plant:#604020:#40a040:', 'A tree-shepherd of the ancient forests, slow to anger.');
  M('su_monster', 'Swing-Ape', 'beast', 6, '5+5', 9, '1d4/1d4/1d4/1d4/2d4', 'ambush', 'M', 'CE', 'C,Y', '1d10', 'gob:#806060:#a04040:t', 'A tree-dwelling monkey-beast that hangs by its tail and rends prey.');
  M('yeti', 'Yeti', 'beast', 6, 5, 15, '1d6/1d6', 'hug imm:cold fear', 'L', 'N', 'D', '1d6', 'big:#f0f0ff:#a0c0e0:c', 'A white-furred mountain ape whose gaze freezes with fear.');
  M('sasquatch', 'Forest Giant-Ape', 'beast', 6, 4, 15, '1d6/1d6/1d8', 'ambush', 'L', 'N', '', '1d4', 'big:#704020:#402010:c', 'An elusive, shaggy ape-man of the deep woods.');
  M('gargoyle', 'Gargoyle', 'beast', 5, '4+4', 9, '1d3/1d3/1d6/1d4', 'magic1 fly', 'M', 'CE', 'C', '2d8', 'fiend:#707070:#404040:wh', 'A winged, horned stone creature that perches motionless until it strikes.');
  M('harpy', 'Harpy', 'avian', 7, 3, 15, '1d3/1d3/1d6', 'charm fly', 'M', 'CE', 'C', '2d6', 'bird:#806060:#e0b090:w', 'A vile bird-woman whose song lures travellers to their doom.');
  M('medusa', 'Medusa', 'beast', 5, 6, 9, '1d4/1d6', 'gaze:stone poison:x', 'M', 'LE', 'P,Q,X,Y', '1', 'hum:#60a060:#40a040:r', 'A woman with snakes for hair; her gaze turns men to stone.');
  M('minotaur', 'Minotaur', 'beast', 6, '6+3', 12, '2d4/1d4', 'imm:mind', 'L', 'CE', 'C', '1d8', 'big:#604030:#e0e0d0:h', 'A bull-headed giant of the labyrinths who never loses its way.');
  M('centaur', 'Centaur', 'beast', 4, 4, 18, '1d6/1d6', 'ranged:1d6:15', 'L', 'NG', 'M,Q,D', '1d6', 'quad:#a07040:#e0b090:b', 'Half man, half horse, wild and proud.');
  M('satyr', 'Satyr', 'fey', 5, 5, 18, '2d4', 'charm ambush mr50', 'M', 'N', 'I,S,X', '2d4', 'hum:#806040:#c0a080:h', 'A goat-legged reveller whose pipes enchant.');
  M('dryad', 'Dryad', 'fey', 9, 2, 12, '1d4', 'charm mr50', 'M', 'N', 'M,Q', '1d6', 'hum:#60a040:#a0e060:r', 'A tree spirit who enchants those who come too near her oak.');
  M('nymph', 'Nymph', 'fey', 9, 3, 12, '0', 'blind mr50 spells:charm_person', 'M', 'N', 'Q,X', '1d4', 'hum:#a0c0e0:#ffffff:r', 'A beautiful water spirit whose sight can blind.');
  M('nixie', 'Nixie', 'fey', 7, 1, 6, '1d4', 'charm mr25', 'S', 'N', 'C', '2d20', 'gob:#60c0a0:#2080a0:', 'A small green water fey that drags men beneath the waves.');
  M('pixie', 'Pixie', 'fey', 5, 1, 6, '1d4', 'invis fly mr25', 'S', 'N', 'R,S,T', '5d4', 'gob:#a0e0ff:#e0a0ff:w', 'Tiny winged pranksters, invisible at will.');
  M('sprite', 'Sprite', 'fey', 6, 1, 9, '1d4', 'ranged:1d4:9 invis fly', 'S', 'NG', 'C', '1d10x10', 'gob:#c0f0c0:#80c080:wb', 'Fey archers whose arrows bring sleep.');
  M('brownie', 'Brownie', 'fey', 3, 0.5, 12, '1d3', 'mr20', 'S', 'LG', 'O,P,Q', '4d4', 'gob:#806040:#40a040:', 'A tiny helpful household spirit.');
  M('leprechaun', 'Leprechaun', 'fey', 8, 0.5, 15, '0', 'invis mr80', 'S', 'N', 'F', '1d20', 'gob:#40a040:#e0c040:', 'A mischievous little man who steals and teleports away.');
  M('sylph', 'Sylph', 'fey', 9, 3, 12, '0', 'invis fly mr50 spells:magic_missile,web', 'M', 'N', 'Q,X', '1', 'ghost:#e0f0ff:#a0c0ff:w', 'A graceful air spirit.');
  M('will_o_wisp', 'Marsh Light', 'aberration', -8, 9, 18, '2d8', 'hit:elec:2d8 invis imm:mind fly', 'S', 'CE', 'Z', '1d3', 'eye:#e0f0ff:#80c0ff:', 'A drifting light that lures travellers into bogs.');
  M('invisible_stalker', 'Unseen Hunter', 'elemental', 3, 8, 12, '4d4', 'invis mr30 fly', 'L', 'N', '', '1', 'ghost:#e0e0ff:#ffffff:', 'An invisible air-spirit bound to hunt one quarry.');
  M('aerial_servant', 'Air Servant', 'elemental', 3, 16, 24, '8d4', 'invis fly', 'M', 'N', '', '1', 'ghost:#d0e0ff:#ffffff:', 'A powerful air spirit summoned by priests.');
  M('wind_walker', 'Wind Walker', 'elemental', 7, '6+3', 15, '3d6', 'invis fly', 'L', 'N', 'C', '1d3', 'elem:#c0e0ff:#ffffff:', 'A whirlwind spirit of high mountains.');
  M('water_weird', 'Water Weird', 'elemental', 4, '3+3', 12, '0', 'hug imm:fire,poison', 'L', 'CE', 'I,O,P,Y', '1d3', 'elem:#4080c0:#a0e0ff:', 'A malevolent water-spirit that drowns those near its pool.');
  M('salamander', 'Salamander', 'elemental', 5, '7+7', 9, '2d6/1d6', 'hit:fire:1d6 imm:fire,sleep,charm magic1', 'M', 'CE', 'F', '2d5', 'snake:#e04010:#ffc020:s', 'A serpent-tailed fire spirit armed with a burning spear.');
  M('mephit_fire', 'Fire Imp', 'fiend', 5, 3, 12, '1d3/1d3', 'breath:fire:cone:1d8 fly imm:fire', 'S', 'NE', '', '1d4', 'fiend:#e04010:#ffa020:w', 'A small fiery imp from the elemental planes.');
  M('elemental_air', 'Air Elemental', 'elemental', 2, 12, 36, '2d10', 'magic2 fly imm:poison,sleep,charm', 'L', 'N', '', '1', 'elem:#c0e0ff:#ffffff:', 'A living whirlwind of terrible force.');
  M('elemental_earth', 'Earth Elemental', 'elemental', 2, 12, 6, '4d8', 'magic2 imm:poison,sleep,charm', 'H', 'N', '', '1', 'elem:#806040:#a08060:', 'A walking mass of stone and soil.');
  M('elemental_fire', 'Fire Elemental', 'elemental', 2, 12, 12, '3d8', 'magic2 imm:fire,poison,sleep,charm hit:fire:1d6', 'L', 'N', '', '1', 'elem:#ff6020:#ffe040:', 'A towering pillar of living flame.');
  M('elemental_water', 'Water Elemental', 'elemental', 2, 12, 6, '5d6', 'magic2 imm:poison,sleep,charm', 'L', 'N', '', '1', 'elem:#3070c0:#a0d0ff:', 'A surging wave given terrible purpose.');
  M('efreeti', 'Fire Djinn', 'elemental', 2, 10, 9, '3d8', 'imm:fire fly spells:fireball,mirror_image,invisibility', 'L', 'LE', '', '1', 'fiend:#e04020:#202020:hk', 'A proud, cruel genie of the city of brass.');
  M('djinni', 'Air Djinn', 'elemental', 4, '7+3', 9, '2d8', 'fly invis spells:invisibility', 'L', 'CG', '', '1', 'fiend:#80c0ff:#ffffff:k', 'A genie of the winds, capricious but honourable.');
  M('galeb_duhr', 'Boulder-Folk', 'elemental', -2, 8, 6, '3d6', 'imm:elec,fire rock:3d6:10', 'L', 'N', 'Q', '1d4', 'big:#707060:#a0a080:', 'Living boulders who guard mountain passes.');
  M('gas_spore', 'Gas Spore', 'plant', 9, 1, 3, '0', 'ambush', 'L', 'N', '', '1', 'eye:#909060:#c0c080:x', 'A floating fungus that resembles a many-eyed horror and explodes when struck.');
  M('shrieker', 'Shrieker', 'plant', 7, 3, 1, '0', 'shriek', 'M', 'N', '', '2d4', 'plant:#a0a060:#c0c080:', 'A man-sized mushroom that shrieks when light or movement draws near.');
  M('violet_fungus', 'Violet Fungus', 'plant', 7, 3, 1, '1d4/1d4', 'disease', 'M', 'N', '', '1d4', 'plant:#8040a0:#c080e0:', 'A purple fungus whose tendrils rot flesh.');
  M('mold_yellow', 'Yellow Mould', 'plant', 9, 2, 0, '1d6', 'poison:x', 'S', 'N', '', '1d8', 'blob:#c0c020:#e0e060:', 'A patch of mould that bursts into choking spores.');
  M('mold_brown', 'Brown Mould', 'plant', 9, 2, 0, '4d8', 'imm:cold', 'S', 'N', '', '1d4', 'blob:#604020:#806040:', 'A mould that drains heat from living things.');
  M('slime_green', 'Green Slime', 'ooze', 9, 2, 0, '0', 'acid ambush', 'S', 'N', '', '1d4', 'blob:#40c040:#80ff80:', 'A dripping green slime that eats flesh and metal alike.');
  M('ooze_gray', 'Grey Ooze', 'ooze', 8, '3+3', 1, '2d8', 'acid imm:fire,cold', 'M', 'N', '', '1d3', 'blob:#808080:#a0a0a0:', 'A slick, stone-coloured ooze that dissolves metal.');
  M('pudding_black', 'Black Pudding', 'ooze', 6, 10, 3, '3d8', 'acid imm:cold,elec', 'L', 'N', '', '1', 'blob:#202020:#404040:', 'A heaving black mass that devours wood, metal and flesh.');
  M('jelly_ochre', 'Ochre Jelly', 'ooze', 8, 6, 3, '3d4', 'acid imm:elec', 'M', 'N', '', '1', 'blob:#c08020:#e0a040:', 'An amoeba-like jelly that seeps under doors.');
  M('gelatinous_cube', 'Quivering Cube', 'ooze', 8, 4, 6, '2d4', 'para ambush imm:elec,cold,sleep', 'L', 'N', 'V', '1', 'blob:#a0e0c0:#e0fff0:', 'A transparent block of jelly that sweeps corridors clean, paralysing all it touches.');
  M('strangleweed', 'Strangleweed', 'plant', 6, 3, 0, '0', 'hug', 'L', 'N', '', '2d4', 'plant:#408040:#206020:', 'Kelp-like weed that drags swimmers down.');
  M('assassin_vine', 'Hangman Vine', 'plant', 5, 6, 1, '1d8', 'hug ambush', 'L', 'N', 'U', '1', 'plant:#406020:#80a040:', 'A creeping vine that strangles passers-by.');
  M('blood_rose', 'Blood Rose', 'plant', 7, 3, 1, '1d4/1d4', 'drain0', 'M', 'N', '', '1d4', 'plant:#40a040:#e02040:', 'A beautiful rose bush that drinks blood.');

  /* ===== Constructs ===== */
  M('golem_flesh', 'Flesh Golem', 'construct', 9, 9, 8, '2d8/2d8', 'magic1 imm:sleep,charm,hold,mind,poison,cold,fire', 'L', 'N', '', '1', 'big:#c0a090:#806060:z', 'A body stitched from corpses and given life by lightning.');
  M('golem_clay', 'Clay Golem', 'construct', 7, 11, 7, '3d10', 'magic1 imm:sleep,charm,hold,mind,poison,elec', 'L', 'N', '', '1', 'big:#a07050:#804030:', 'A crude giant of clay whose blows leave wounds that resist healing.');
  M('golem_stone', 'Stone Golem', 'construct', 5, 14, 6, '3d8', 'magic2 imm:sleep,charm,hold,mind,poison,fire,cold,elec', 'L', 'N', '', '1', 'big:#808080:#606060:', 'A towering statue of granite brought to life.');
  M('golem_iron', 'Iron Golem', 'construct', 3, 18, 6, '4d10', 'magic3 breath:poison:cloud:5d6 imm:sleep,charm,hold,mind,poison,fire,cold', 'L', 'N', '', '1', 'big:#505060:#a0a0c0:s', 'A colossus of iron that breathes poison gas.');
  M('golem_bone', 'Bone Golem', 'construct', 0, 14, 12, '3d8', 'magic1 fear imm:sleep,charm,hold,mind,poison,cold,fire', 'L', 'N', '', '1', 'skel:#e0e0d0:#606060:', 'A construct of a hundred skeletons fused together.');
  M('animated_armor', 'Animated Armour', 'construct', 2, 4, 9, '1d8', 'imm:sleep,charm,hold,mind,poison nomorale', 'M', 'N', '', '1d4', 'hum:#909090:#505050:s', 'An empty suit of armour that marches and fights.');
  M('homunculus', 'Homunculus', 'construct', 6, 2, 6, '1d3', 'poison:para fly', 'S', 'CE', '', '1', 'fiend:#806050:#404020:w', 'A tiny winged servant made by a wizard from clay and blood.');
  M('caryatid', 'Caryatid Column', 'construct', 5, 5, 6, '2d4', 'magic1 imm:sleep,charm,hold,mind', 'M', 'N', '', '1d4', 'hum:#e0e0d0:#a0a090:s', 'A pillar-statue that steps forth to guard a tomb.');
  M('shield_guardian', 'Warden Construct', 'construct', 0, 15, 9, '4d6', 'regen3 imm:sleep,charm,hold,mind,poison', 'L', 'N', '', '1', 'big:#806040:#c0a060:', 'A bodyguard construct bound to an amulet.');

  /* ===== Fiends ===== */
  M('imp', 'Imp', 'fiend', 2, 2, 6, '1d4', 'poison:x fly invis silver regen1', 'S', 'LE', 'O', '1', 'fiend:#a03020:#202020:wht', 'A tiny winged devil with a venomous tail.');
  M('quasit', 'Quasit', 'fiend', 2, 3, 15, '1d2/1d2/1d4', 'weak invis magic1 regen1', 'S', 'CE', 'Q', '1', 'fiend:#406030:#202010:ht', 'A tiny demon whose claws sap the strength.');
  M('lemure', 'Lemure', 'fiend', 7, 3, 3, '1d3', 'regen1 silver imm:sleep,charm,mind nomorale', 'M', 'LE', '', '2d6', 'blob:#c08080:#a06060:', 'A shapeless blob of tormented flesh from the pits.');
  M('larva', 'Soul Larva', 'fiend', 7, 1, 6, '1d4', 'nomorale', 'S', 'NE', '', '3d6', 'worm:#d0b0a0:#a08070:', 'The bloated soul of an evil mortal in grub form.');
  M('manes', 'Lost Soul', 'fiend', 7, 1, 3, '1d2/1d2/1d4', 'imm:sleep,charm nomorale', 'S', 'CE', '', '2d10', 'gob:#a0a080:#606040:', 'A pitiful, malignant spirit of the abyss.');
  M('devil_barbed', 'Barbed Devil', 'fiend', 0, 8, 12, '2d4/2d4/3d4', 'fear magic1 mr30 imm:fire', 'M', 'LE', 'L', '1d2', 'fiend:#804020:#e0a040:ht', 'A devil covered in razor-sharp barbs.');
  M('devil_bone', 'Bone Devil', 'fiend', -1, 9, 15, '3d4', 'fear poison:weak magic1 mr40 imm:fire,cold', 'L', 'LE', 'O', '1d2', 'fiend:#e0e0c0:#a0a080:t', 'A gaunt, skeletal devil with a scorpion tail.');
  M('devil_horned', 'Horned Devil', 'fiend', -5, '5+5', 9, '1d4/1d4/2d3/1d3', 'fear magic2 mr50 imm:fire', 'L', 'LE', 'I', '1d2', 'fiend:#602010:#202020:wht', 'A winged devil with great horns and a barbed tail.');
  M('devil_ice', 'Ice Devil', 'fiend', -4, 11, 6, '1d4/1d4/2d4/3d4', 'fear magic2 mr55 imm:fire,cold spells:ice_storm,slow', 'L', 'LE', 'Q', '1d2', 'fiend:#a0c0e0:#4060a0:t', 'An insectoid devil of the frozen hells.');
  M('devil_erinyes', 'Fury', 'fiend', 2, '6+6', 6, '2d4', 'fear magic1 mr30 fly charm', 'M', 'LE', 'R', '1d3', 'fiend:#a04040:#202020:wr', 'A winged warrior-maiden of the hells, armed with a dagger and a rope.');
  M('pit_fiend', 'Abyssal Lord', 'fiend', -3, 13, 15, '1d4+1/1d6+1/2d6/2d4', 'fear magic3 mr65 fly regen2 imm:fire spells:fireball,hold_monster', 'L', 'LE', 'J,R', '1', 'fiend:#a01010:#202020:whkt', 'A towering lord of devils with burning wings.');
  M('demon_vrock', 'Vulture Fiend', 'fiend', 0, 8, 12, '1d4/1d4/1d8/1d8/1d6', 'magic1 mr50 fly', 'L', 'CE', 'B', '1d6', 'fiend:#707040:#404020:w', 'A vulture-headed demon that screeches as it dives.');
  M('demon_hezrou', 'Toad Fiend', 'fiend', -2, 9, 6, '1d3/1d3/4d4', 'fear magic1 mr55', 'L', 'CE', 'C', '1d6', 'fiend:#506030:#a0a040:', 'A bloated toad-like demon that spreads fear.');
  M('demon_glabrezu', 'Pincer Fiend', 'fiend', -4, 10, 9, '2d6/2d6/1d3/1d3/1d4+1', 'magic2 mr60 spells:fear,confusion', 'L', 'CE', 'R', '1d6', 'fiend:#804030:#404040:hc', 'A demon with great pincers and a dog\'s head.');
  M('demon_nalfeshnee', 'Boar Fiend', 'fiend', -1, 11, 9, '1d4/1d4/2d4', 'magic2 mr65 fly spells:slow,fear', 'L', 'CE', 'C', '1d4', 'fiend:#604040:#c0a080:wh', 'A grotesque boar-ape demon with feathered wings.');
  M('demon_marilith', 'Serpent Fiend', 'fiend', -7, '7+7', 12, '2d4/1d8/1d8/1d8/1d8/1d8/1d8', 'magic2 mr80 hug', 'L', 'CE', 'N,U', '1', 'snake:#406030:#e0a090:s', 'A six-armed demoness with a serpent\'s tail.');
  M('demon_balor', 'Flame Fiend', 'fiend', -2, 13, 15, '2d6', 'fear magic2 mr75 fly imm:fire hit:fire:3d6', 'L', 'CE', 'F', '1', 'fiend:#300808:#ff4010:whk', 'A towering demon wreathed in flame, armed with whip and blade.');
  M('demon_succubus', 'Temptress', 'fiend', 0, 6, 12, '1d3/1d3', 'drain1 charm magic1 mr70 fly', 'M', 'CE', 'I,Q', '1', 'fiend:#c06080:#200010:w', 'A beautiful winged fiend who steals life with a kiss.');
  M('rakshasa', 'Tiger Lord', 'fiend', -4, 7, 15, '1d3/1d3/2d4', 'magic1 imm:spells1 spells:charm_person,magic_missile,mirror_image', 'M', 'LE', 'F', '1d4', 'cat:#e09020:#402010:r', 'A tiger-headed spirit in silken robes; low magic cannot touch it.');
  M('night_hag', 'Night Hag', 'fiend', 0, 8, 9, '2d6', 'magic1 mr65 spells:magic_missile,ray_enfeeble,sleep', 'M', 'NE', 'Q', '1', 'hum:#404060:#204020:r', 'A hag of the nether planes who rides the dreams of sleepers.');
  M('sea_hag', 'Sea Hag', 'fiend', 7, 3, 15, '1d4', 'gaze:death fear', 'M', 'CE', 'C,Y', '1d4', 'hum:#406050:#80a080:r', 'A horrid hag of the shallows whose glance can kill.');
  M('green_hag', 'Fen Hag', 'fiend', -2, 9, 12, '1d2+6/1d2+6', 'mr35 invis spells:sleep,web', 'M', 'NE', 'X', '1d3', 'hum:#406020:#a0c060:r', 'A hag of the marshes who mimics voices to lure the lost.');
  M('annis', 'Iron-Claw Hag', 'fiend', 0, 7, 15, '1d8+8/1d8+8/2d4', 'hug mr20', 'L', 'CE', 'D,Y', '1d3', 'hum:#406080:#204040:rc', 'A towering blue hag with nails of iron.');

  /* ===== Aquatic ===== */
  M('barracuda', 'Barracuda', 'aquatic', 6, 2, 30, '2d4', '', 'M', 'N', '', '2d6', 'fish:#a0a0b0:#606070:', 'A long silver hunter of warm seas.');
  M('shark', 'Shark', 'aquatic', 6, 5, 24, '2d4', '', 'L', 'N', '', '3d4', 'fish:#808090:#e0e0f0:', 'A grey killer of the deep.');
  M('shark_giant', 'Great Shark', 'aquatic', 5, 12, 18, '4d4', 'swallow', 'H', 'N', '', '1d3', 'fish:#707080:#e0e0f0:', 'A colossal shark that swallows men whole.');
  M('eel_electric', 'Shock Eel', 'aquatic', 9, 2, 12, '1d3', 'hit:elec:3d8', 'S', 'N', '', '1d3', 'snake:#406060:#a0e0ff:', 'An eel that discharges a powerful jolt.');
  M('eel_giant', 'Giant Eel', 'aquatic', 6, 5, 9, '3d6', '', 'L', 'N', '', '1d4', 'snake:#405040:#80a080:', 'A huge eel lurking in rocky crevices.');
  M('eel_weed', 'Weed Eel', 'aquatic', 8, 1, 15, '1d1', 'poison:x', 'S', 'N', 'O,P,R,S', '10d6', 'snake:#406030:#80a060:', 'A tiny eel that hides among sea-weeds; its bite is deadly.');
  M('octopus_giant', 'Giant Octopus', 'aquatic', 7, 8, 12, '1d4/1d4/1d4/1d4/1d4/1d4/2d6', 'hug', 'L', 'N', 'R', '1d3', 'blob:#a04040:#e08080:l', 'A great octopus that drags ships\' crews under.');
  M('squid_giant', 'Giant Squid', 'aquatic', 7, 12, 21, '1d6/1d6/1d6/1d6/1d6/1d6/1d6/1d6/5d4', 'hug', 'G', 'N', 'A', '1', 'blob:#c08080:#e0b0b0:l', 'A monstrous squid of the black depths.');
  M('pike_giant', 'Giant Pike', 'aquatic', 5, 4, 36, '4d4', 'ambush', 'L', 'N', '', '1d8', 'fish:#607040:#a0b080:', 'A huge freshwater fish with rows of teeth.');
  M('lamprey', 'Giant Lamprey', 'aquatic', 6, 5, 9, '1d6', 'drain0', 'M', 'N', '', '1d4', 'snake:#605050:#a08080:', 'A jawless eel-thing that latches on and drinks blood.');
  M('man_o_war', 'Drifting Stinger', 'aquatic', 9, 4, 1, '1d10', 'para', 'M', 'N', '', '1d10', 'blob:#a080e0:#e0c0ff:', 'A floating jellyfish with paralysing tendrils.');
  M('ray_manta', 'Great Ray', 'aquatic', 6, 8, 18, '3d4', 'swallow', 'H', 'N', '', '1', 'fish:#404050:#a0a0b0:', 'A vast ray of the open sea.');
  M('ray_sting', 'Sting Ray', 'aquatic', 7, 1, 9, '1d3', 'para', 'S', 'N', '', '1d3', 'fish:#706050:#a09080:', 'A flat ray with a paralysing tail-spine.');
  M('sea_lion', 'Sea Lion', 'aquatic', 5, 6, 18, '1d6/1d6/2d6', '', 'L', 'N', 'B', '3d4', 'fish:#c09040:#806030:', 'A lion-headed fish that prowls the coast.');
  M('sea_horse_giant', 'Giant Sea Horse', 'aquatic', 7, 3, 21, '1d4', '', 'L', 'N', '', '1d20', 'fish:#c0a060:#e0c080:', 'A sea horse large enough to ride.');
  M('hippocampus', 'Sea Steed', 'aquatic', 5, 4, 24, '1d4', '', 'L', 'CG', '', '2d4', 'quad:#60a0a0:#c0e0e0:t', 'A horse with a fish\'s tail, ridden by tritons.');
  M('whale', 'Whale', 'aquatic', 4, 24, 18, '5d4', '', 'G', 'N', '', '1d8', 'fish:#405060:#a0b0c0:', 'A leviathan of the open ocean.');
  M('dolphin', 'Dolphin', 'aquatic', 5, '2+2', 30, '2d4', '', 'M', 'LG', '', '2d10', 'fish:#8090a0:#e0e0f0:', 'An intelligent, friendly sea mammal.');
  M('turtle_snapping', 'Giant Snapping Turtle', 'aquatic', 0, 10, 3, '6d4', 'ambush', 'L', 'N', '', '1', 'lizard:#405030:#706040:', 'A huge turtle with jaws that can sever a leg.');
  M('turtle_sea', 'Giant Sea Turtle', 'aquatic', 2, 15, 15, '4d4', '', 'H', 'N', '', '1', 'lizard:#406050:#80a080:', 'A vast, ancient turtle of the open sea.');
  M('merman', 'Merfolk', 'aquatic', 7, '1+1', 18, '1d6', '', 'M', 'N', 'C,R', '1d20x10', 'fish:#4080a0:#c0a080:s', 'Fish-tailed folk of the coasts who guard their reefs.');
  M('triton', 'Triton', 'aquatic', 5, 3, 15, '1d6', 'mr90', 'M', 'N', 'M,R', '1d10x10', 'fish:#40a0a0:#e0e0c0:sk', 'Noble sea-folk who ride sea steeds.');
  M('locathah', 'Fish-Man', 'aquatic', 6, 2, 12, '1d6', '', 'M', 'N', 'A', '1d10x10', 'hum:#80a060:#a0c080:s', 'Nomadic fish-people of the shallows.');
  M('sahuagin', 'Deep Raider', 'aquatic', 5, '2+2', 12, '1d2/1d2/1d4/1d4', '', 'M', 'LE', 'N,I,O,P,Q', '1d20x20', 'hum:#307050:#60a080:st', 'Shark-toothed fish-men who raid coastal villages.');
  M('kuo_toa', 'Gulper', 'aquatic', 4, 2, 9, '1d6', 'res:poison,para', 'M', 'NE', 'L,M,N,Q', '2d12', 'hum:#608070:#c0c0a0:s', 'Bulging-eyed fish-men who worship mad gods in sunless caverns.');
  M('morkoth', 'Drowning Horror', 'aquatic', 3, 7, 18, '1d10', 'charm', 'M', 'CE', 'G', '1', 'fish:#404060:#a0a0c0:x', 'A hideous deep-sea creature that hypnotises prey into its lair.');
  M('ixitxachitl', 'Demon Ray', 'aquatic', 6, '1+1', 12, '3d4', 'spells:cause_light,curse', 'S', 'CE', 'P,R,S', '1d10x10', 'fish:#302040:#806080:', 'An evil, priestly ray of the black depths.');

  /* ===== Planar and miscellaneous ===== */
  M('ki_rin', 'Sky Stag', 'beast', -5, 12, 24, '2d4/2d4/3d6', 'fly mr90 spells:cure_critical,call_lightning', 'L', 'LG', 'I,S,T', '1', 'quad:#f0e0a0:#ffffff:wh', 'A golden celestial stag that walks the clouds.');
  M('couatl', 'Feathered Serpent', 'beast', 5, 9, 18, '1d3/2d4', 'poison:x fly invis spells:cure_serious,dispel_magic_p', 'L', 'LG', 'B,I', '1d4', 'snake:#40c080:#e0c040:w', 'A winged serpent of rainbow plumage, a servant of good.');
  M('lammasu_greater', 'Greater Lammasu', 'beast', 4, 9, 12, '2d6/2d6', 'fly mr40 spells:cure_critical,holy_word', 'L', 'LG', 'R,S,T', '1', 'cat:#f0d060:#ffffff:wk', 'A noble winged lion-man of great holiness.');
  M('deva', 'Astral Herald', 'fiend', -5, 12, 15, '3d6/3d6', 'mr45 fly spells:cure_critical,flame_strike,holy_word', 'L', 'LG', '', '1', 'fiend:#f0f0ff:#f0d060:wk', 'A shining winged messenger of the heavens.');
  M('doppelganger', 'Doppelganger', 'aberration', 5, 4, 9, '1d12', 'res:sleep,charm ambush', 'M', 'N', 'E', '3d4', 'hum:#a0a0a0:#606060:', 'A grey shapechanger that takes the form of those it kills.');
  M('cloaker', 'Shroud Stalker', 'aberration', 3, 6, 15, '1d6/1d6/1d4', 'fear ambush fly', 'L', 'CN', 'C', '1d4', 'bat:#202020:#808080:w', 'A ray-like horror that mimics a black cloak and envelops victims.');
  M('dark_creeper', 'Dark Creeper', 'humanoid', 0, '1+1', 9, '1d4', 'invis', 'S', 'CN', 'J,K,L,M', '1d20', 'gob:#202020:#404040:r', 'Small, rag-wrapped folk who snuff out lights and steal.');
  M('grell', 'Sky Brain', 'aberration', 5, 5, 12, '1d4/1d6', 'para fly', 'M', 'NE', 'D', '1', 'eye:#c0a0a0:#806060:l', 'A floating brain with a beak and paralysing tentacles.');
  M('hook_horror', 'Hook Horror', 'beast', 3, 5, 9, '1d8/1d8', '', 'L', 'N', '', '2d6', 'big:#605040:#c0b080:c', 'A vulture-headed underground brute with hooks for hands.');
  M('ettercap', 'Spider-Tender', 'humanoid', 6, 5, 12, '1d3/1d3/1d8', 'poison:x web', 'M', 'NE', 'D', '1d2', 'hum:#504030:#80a040:l', 'A spidery humanoid who herds giant spiders.');
  M('naga_guardian', 'Guardian Naga', 'reptile', 3, 11, 15, '1d6/2d4', 'poison:x ranged:2d6:3 spells:cure_light,bless,hold_person_p', 'L', 'LG', 'H', '1d2', 'snake:#40a040:#e0c040:k', 'A huge serpent with a human face that guards holy places.');
  M('naga_spirit', 'Spirit Naga', 'reptile', 4, 9, 12, '1d3', 'gaze:charm spells:magic_missile,web,fireball,cause_serious', 'L', 'CE', 'B,T,X', '1d3', 'snake:#303030:#e04040:', 'An evil serpent with a human head that charms and casts spells.');
  M('naga_water', 'Water Naga', 'reptile', 5, 7, 12, '1d4', 'poison:x spells:magic_missile,web', 'L', 'N', 'D', '1d4', 'snake:#4080a0:#a0e0e0:', 'A green-scaled serpent of rivers and lakes.');
  M('yuan_ti', 'Serpent-Kin', 'humanoid', 4, 6, 12, '1d10', 'poison:2d6 mr20 spells:charm_person,web', 'M', 'CE', 'E', '2d4', 'hum:#406030:#a0c040:t', 'Snake-blooded humans who worship serpent gods in jungle temples.');
  M('gibbering_mouther', 'Babbling Horror', 'aberration', 1, 4, 3, '1/1/1/1/1/1', 'fear', 'M', 'N', '', '1', 'blob:#c08080:#e0a0a0:x', 'A mass of eyes and mouths that babbles until the mind breaks.');
  M('rust_beast', 'Ironmaw', 'beast', 3, 6, 12, '2d6', 'rust', 'M', 'N', 'Q', '1d2', 'quad:#a06030:#e0a060:', 'A larger relative of the rust eater with savage jaws.');
  M('gorgimera', 'Stone-Breath Chimera', 'beast', 5, 10, 12, '1d3/1d3/2d4/1d6', 'breath:stone:cone fly', 'L', 'N', 'E', '1', 'cat:#a08040:#606070:wh', 'A chimera with a petrifying bull\'s head.');
  M('baku', 'Dream-Eater', 'beast', -2, 12, 12, '2d6/2d6', 'mr60', 'L', 'LG', 'H', '1', 'quad:#c0a080:#806040:h', 'A trunked beast that devours nightmares.');
  M('phoenix', 'Ash-Bird', 'avian', -3, 20, 39, '2d6/2d6/1d12', 'fly imm:fire hit:fire:2d6 mr50', 'L', 'NG', '', '1', 'bird:#ff6010:#ffd040:w', 'A radiant bird of fire reborn from its ashes.');
  M('aurumvorax', 'Golden Gorger', 'beast', 0, 12, 9, '2d4/1d6/1d6', '', 'S', 'N', 'I', '1', 'quad:#e0c040:#a08020:', 'A small golden beast of incredible ferocity.');
  M('shocker', 'Spark Spirit', 'elemental', 5, 4, 15, '1d8', 'hit:elec:1d8 imm:elec', 'S', 'CN', '', '1d4', 'eye:#a0c0ff:#ffffff:', 'A crackling ball of living lightning.');
  M('mud_man', 'Mud-Man', 'elemental', 10, 2, 3, '1d4', 'imm:poison,sleep nomorale', 'S', 'N', '', '1d10', 'blob:#806040:#604020:', 'Animated mud from enchanted pools.');
  M('lich_lesser', 'Bone Magus', 'undead', 2, 8, 9, '1d6', 'undead9 spells:magic_missile,web,fireball,hold_person imm:sleep,charm,hold,mind,cold,poison', 'M', 'NE', 'B', '1', 'skel:#d0c0a0:#4040a0:r', 'A failed lich, still deadly with its stolen spells.');

  /* ===== Notable foes of the Emberwild (adventure bosses) ===== */
  M('rat_king', 'Rat King Skarrow', 'lycanthrope', 5, 5, 12, '1d8/1d4', 'silver disease leader regen1', 'M', 'LE', 'C,Q', '1', 'gob:#806050:#d0b030:tk', 'A swollen wererat crowned with gold, master of the Thornwick cellars.');
  M('vault_warden', 'The Hollow Warden', 'construct', 3, 7, 9, '2d6/2d6', 'magic1 imm:sleep,charm,hold,mind,poison regen1', 'L', 'N', 'C', '1', 'big:#606070:#40c0ff:sk', 'An ancient guardian of brass and stone that wakes when its vaults are plundered.');
  M('hollow_mage', 'Mordane the Hollow', 'humanoid', 6, 6, 12, '1d4', 'spells:magic_missile,sleep,web,stinking_cloud,lightning_bolt leader', 'M', 'NE', 'L,Q', '1', 'hum:#202040:#40c0ff:rk', 'A renegade wizard who has taken the Hollow Vaults for his own.');
  M('iron_king', 'The Iron King', 'undead', 0, 10, 12, '1d10+4/1d6', 'undead8 drain1 fear magic1 imm:sleep,charm,hold,mind,cold,poison leader', 'M', 'LE', 'B,Q', '1', 'skel:#606070:#c0a020:sk', 'A long-dead warlord in rusted crown and black iron, risen to reclaim his realm.');
  M('barrow_knight', 'Barrow Knight', 'undead', 2, 6, 12, '1d10+2', 'undead6 drain1 silver imm:sleep,charm,hold,mind,cold,poison', 'M', 'LE', 'B', '1d4', 'skel:#808090:#404050:s', 'One of the Iron King\'s sworn knights, bound to serve him beyond death.');
  M('witch_queen', 'Morwenna the Witch-Queen', 'humanoid', 2, 12, 12, '1d6+2', 'mr30 spells:fireball,hold_monster,cone_of_cold,confusion,lightning_bolt,disintegrate leader regen1', 'M', 'CE', 'H,U', '1', 'hum:#200830:#40e080:rk', 'The sorceress who rules Ravenmoor from her tower of black glass.');
  M('raven_knight', 'Raven Knight', 'humanoid', 1, 7, 12, '1d10+3', 'leader', 'M', 'LE', 'M,Q', '1d4', 'hum:#202028:#6040a0:s', 'An elite warrior of the Witch-Queen in black-feathered plate.');
  M('bog_hag', 'Mother Sedge', 'fiend', 2, 7, 12, '1d8+4/1d8+4', 'mr25 spells:sleep,web,hold_person_p invis', 'M', 'CE', 'Q,X', '1', 'hum:#405020:#a0c060:rk', 'An ancient fen hag who serves the Witch-Queen.');
  M('ravenmoor_drake', 'Shadowwing', 'dragon', 1, 9, 12, '1d8/1d8/2d10', 'breath:cold:cone fly fear imm:cold', 'L', 'CE', 'H', '1', 'dragon:#303050:#80a0e0:wh', 'The Witch-Queen\'s dragon, a black wyrm of frost and shadow.');
  M('kobold_shaman', 'Kobold Hexer', 'goblinoid', 7, 1, 6, '1d4', 'spells:magic_missile,sleep', 'S', 'LE', 'J', '1d2', 'gob:#a06030:#6060c0:r', 'A kobold that knows a few crude spells.');
  M('goblin_shaman', 'Goblin Shaman', 'goblinoid', 6, 2, 6, '1d4', 'spells:cause_light,curse,hold_person_p', 'S', 'LE', 'K', '1d2', 'gob:#708030:#a040a0:r', 'A goblin priest of a petty, spiteful god.');
  M('orc_shaman', 'Orc Shaman', 'goblinoid', 6, 3, 9, '1d6', 'spells:cause_light,curse,hold_person_p', 'M', 'LE', 'L', '1d2', 'hum:#507040:#a040a0:r', 'An orc witch-doctor who speaks for the war-god.');
  M('gnoll_shaman', 'Gnoll Bone-Speaker', 'goblinoid', 5, 4, 9, '1d6', 'spells:cause_light,curse,hold_person_p,cause_serious', 'L', 'CE', 'L', '1d2', 'hum:#a08040:#a040a0:r', 'A gnoll priest who hears the voices of the dead.');
  M('hobgoblin_warlock', 'Hobgoblin Warcaster', 'goblinoid', 6, 4, 9, '1d6', 'spells:magic_missile,web,flame_sphere', 'M', 'LE', 'L', '1', 'hum:#b05030:#4040c0:r', 'A hobgoblin battle-mage.');
  M('lizard_king', 'Lizard King', 'goblinoid', 3, 8, 12, '5d6', 'leader', 'L', 'CE', 'Q,S', '1', 'hum:#307030:#e0c040:stk', 'A huge, cunning lizard-man who rules his tribe by terror.');
  M('giant_chief', 'Giant Jarl', 'giant', 2, '14+4', 12, '6d6', 'rock:3d10:20 leader', 'H', 'CE', 'E,Q', '1', 'big:#a0b0c0:#a02020:sk', 'A great giant warlord in furs and iron.');
  M('vampire_lord', 'Vampire Lord', 'undead', -1, 12, 15, '1d8+6', 'undead11 drain2 regen4 magic2 charm fear mr20 imm:sleep,charm,hold,mind,poison spells:hold_monster,confusion', 'M', 'CE', 'F,U', '1', 'hum:#f0f0f0:#600010:rk', 'An ancient vampire of terrible power.');
  M('demilich', 'Skull Sovereign', 'undead', -6, 16, 18, '1d10', 'undead12 drain2 magic3 mr50 fly fear imm:sleep,charm,hold,mind,cold,elec,fire,poison spells:pw_kill,finger_death,meteor_swarm', 'S', 'NE', 'Z', '1', 'eye:#e0d0b0:#e04040:x', 'All that remains of an ancient lich: a jewelled skull of horrifying power.');
  M('cult_avatar', 'Avatar of the Ashen God', 'fiend', -4, 18, 15, '3d8/3d8', 'fear magic3 mr60 fly imm:fire regen3 spells:fire_storm,holy_word,flame_strike', 'H', 'CE', 'H,U', '1', 'fiend:#302020:#ff6020:whk', 'A fragment of a dead god, given flesh by mad worship.');

  /* ---------- helpers ---------- */
  X.get = function (id) { return X.byId[id]; };
  // average challenge used by the generator: hit dice, adjusted
  X.power = function (m) { return m.hd + (m.hpPlus > 0 ? 0.5 : 0) + (m.drain ? 2 : 0) + (m.breath ? 2 : 0) + (m.spells ? 1 : 0) + (m.regen ? 1 : 0) + (m.para ? 1 : 0); };
  X.inDungeon = function (m) { return m.type !== 'aquatic' && m.mv > 0 && m.id.indexOf('dinosaur') < 0 && ['whale', 'roc', 'elephant', 'mammoth', 'mastodon', 'titanothere', 'buffalo', 'cattle', 'camel', 'horse_wild', 'horse_war', 'mule', 'stag', 'stag_giant', 'irish_deer', 'dolphin', 'hippopotamus'].indexOf(m.id) < 0; };
  X.outdoors = function (m) { return m.type !== 'aquatic' && m.mv > 0; };
  X.isUnique = function (m) { return ['rat_king', 'vault_warden', 'hollow_mage', 'iron_king', 'witch_queen', 'bog_hag', 'ravenmoor_drake', 'cult_avatar', 'demilich'].indexOf(m.id) >= 0; };
  return X;
})();
