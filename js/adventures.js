/* Emberfall — adventures.js
 * Four hand-written adventures (E0–E3) and fifty seeded, generated
 * adventures (ten per level band). Generation is deterministic: every
 * feature draws on its own named RNG stream, so adding later streams
 * (wilderness, secrets, traps) never shifts earlier content. */
var Adventures = (function () {
  'use strict';
  var A = {};

  function qi(id, name, value, desc) { Data.addItem({ id: id, name: name, type: 'quest', value: value || 0, weight: 0.5, desc: desc }); }
  qi('smuggler_map', 'Smugglers\' Map', 0, 'A crude oilskin map marking a cave on the riverbank: "the Cove".');
  qi('brew_ledger', 'Brewmaster\'s Ledger', 0, 'Old Tamsin Brewer\'s ledger of recipes and debts.');
  qi('rat_crown', 'Crown of the Rat King', 400, 'A gaudy crown of gold wire, gnawed at the rim.');
  qi('lantern_codex', 'The Lantern Codex', 0, 'A brass-bound tome of dwarven lore whose pages glow faintly.');
  qi('warden_core', 'Warden\'s Heart-Stone', 600, 'The glowing crystal that animated the Hollow Warden.');
  qi('sunstone', 'The Sunstone', 0, 'A fist-sized amber gem warm with holy light.');
  qi('barrow_key', 'Barrow Key', 0, 'A heavy key of black iron, taken from the gnoll warchief.');
  qi('iron_crown', 'The Iron Crown', 2000, 'The rusted crown of the Iron King. Even dead, it feels cold.');
  qi('moon_tear', 'The Moon\'s Tear', 0, 'A teardrop pearl that glows like the full moon.');
  qi('witch_crown', 'Crown of Black Glass', 5000, 'The Witch-Queen\'s crown, a circlet of volcanic glass.');

  var TOWN_SHOPS = function (n) { return n; };

  /* =====================================================================
   * E0 — The Cellars of Thornwick (levels 1–2)
   * ===================================================================== */
  Modules.register({
    id: 'E0', name: 'The Cellars of Thornwick', band: 1, levels: '1–2', hand: true, size: 'small',
    blurb: 'Something gnaws beneath the market town of Thornwick. Grain vanishes, a brewer\'s boy has gone missing, and the rats grow bolder by the night.',
    start: { map: 'town', x: 1, y: 5, dir: 1 },
    giver: 'Reeve Marla Dunmore',
    intro: 'The Reeve of Thornwick, a broad, tired woman with ink-stained fingers, waves you to a bench. "Adventurers? Thank the Dawn-Mother. Something lives in the old brewery cellars — rats the size of dogs, and worse. People whisper of a Rat King. I can pay, if you can clear them out."',
    quests: [
      { id: 'q_e0_main', title: 'The Rat King', main: true, text: 'Descend into the cellars beneath the old brewery and destroy the creature the townsfolk call the Rat King.', goal: { flag: 'e0_ratking' }, reward: { gp: 300, xp: 2000 } },
      { id: 'q_e0_pip', title: 'The Missing Apprentice', text: 'Pip, the brewer\'s apprentice, vanished in the cellars a week ago. Find him and bring him home.', goal: { flag: 'e0_pip' }, reward: { gp: 150, xp: 800 } },
      { id: 'q_e0_ledger', title: 'The Brewmaster\'s Ledger', text: 'Old Tamsin Brewer\'s ledger was stolen along with the casks. Recover it.', goal: { item: 'brew_ledger' }, reward: { gp: 100, xp: 600 } },
      { id: 'q_e0_kobolds', title: 'The Kobold Warren', text: 'Kobolds have been seen carrying sacks through the smugglers\' tunnels. Slay their chieftain.', goal: { flag: 'e0_kobolds' }, reward: { gp: 150, xp: 1000 } }
    ],
    rumours: [
      'They say the old brewery was built over a dwarf-made cistern, older than the town itself.',
      'Smugglers used to run brandy up from the river through tunnels under the cellars.',
      'Wenna at the apothecary sells silver-edged daggers — "for the rats", she says, and winks.',
      'Old Hobb swears he saw a rat walking on two legs, wearing a crown.',
      'The wolves have been bold this year. A den lies up in the northern hills.',
      'Pilgrims leave offerings at the Standing Stones beyond the river. They say the old gods still listen.'
    ],
    wander: [{ g: [['rat_giant', 5]] }, { g: [['kobold', 4]] }, { g: [['centipede', 3]] }],
    maps: {
      town: {
        id: 'town', name: 'Thornwick', type: 'town', theme: 'town', down: 'd1', grid: [
          'WWWWWWWWWWWWWWWWWWWW',
          'W%%%%.%%%%%.%%%%T.TW',
          'W%%%%.%%%%%.%%%%...W',
          'W%i%%.%%t%%.%%a%.T.W',
          'W..................W',
          'X..................W',
          'W.%h%%.%%p%%.%%m%..W',
          'W.%%%%.%%%%%.%%%%..W',
          'W.%%%%.%%%%%.%%%%..W',
          'W..................W',
          'W.TT.%%g%%.%%%%%.T.W',
          'W....%%%%%.%%%%%...W',
          'W.T..%%%%%.%%%%%.T.W',
          'W....%%%%%.%%%%%...W',
          'W.T......>.........W',
          'WWWWWWWWWWWWWWWWWWWW'],
        keys: {
          i: { t: 'shop', shop: 'inn', name: 'The Gilded Tankard' },
          t: { t: 'shop', shop: 'temple', name: 'Shrine of the Dawn-Mother' },
          a: { t: 'shop', shop: 'magic', name: 'Wenna\'s Apothecary', extra: ['silver_dagger', 'silver_bullet', 'silver_arrow'] },
          h: { t: 'shop', shop: 'hall', name: 'Moot Hall' },
          p: { t: 'shop', shop: 'tavern', name: 'The Crooked Lantern' },
          m: { t: 'shop', shop: 'smith', name: 'Hobb the Smith', extra: ['silver_dagger', 'silver_mace', 'silver_arrow', 'silver_bullet'] },
          g: { t: 'shop', shop: 'train', name: 'Hall of Arms' }
        },
        downText: 'A cellar hatch beside the old brewery leads down into darkness.'
      },
      d1: {
        id: 'd1', name: 'Brewery Cellars', type: 'dungeon', theme: 'wood', dl: 1, up: 'town', down: 'd2', grid: [
          '####################',
          '#<....#.....#......#',
          '#.....+..a..#..b...#',
          '#.....#.....+......#',
          '###+###.....#......#',
          '#.....###+######+###',
          '#..d..#........#...#',
          '#.....#..c.....#.f.#',
          '#.....+........#...#',
          '###+###.1......#+###',
          '#.....######+###...#',
          '#..g..#........2...#',
          '#.....S...h....#...#',
          '##S####........#.j.#',
          '#e....#.....3..+.>.#',
          '####################'],
        keys: {
          a: { t: 'mon', g: [['rat_giant', 6]], mode: 'guard' },
          b: { t: 'mon', g: [['centipede', 4]], mode: 'ambush' },
          c: { t: 'mon', g: [['kobold', 5]], mode: 'hunt', tt: 'J' },
          d: { t: 'chest', gp: 25, items: ['potion_healing', 'dagger'] },
          e: { t: 'chest', gp: 60, items: ['scroll_spark_bolt', 'potion_healing', 'silver_dagger'] },
          f: { t: 'event', title: 'Smugglers\' Cache', text: 'Behind a stack of rotten casks lies an oilskin packet. Inside is a crude map marked "Cove — tunnels to the cellars". Someone has been bringing goods in from the river.', flag: 'e0_cove', give: ['smuggler_map'] },
          g: { t: 'mon', g: [['rat_swarm', 2], ['rat_giant', 3]], mode: 'guard', gp: 15 },
          h: { t: 'sign', text: 'Fresh claw-marks score the wall. Someone has scratched: "THE KING BELOW SEES ALL".' },
          j: { t: 'mon', g: [['kobold', 4], ['kobold_shaman', 1]], mode: 'guard', tt: 'J,O' },
          '1': { t: 'trap', trap: 'pit' }, '2': { t: 'trap', trap: 'darts' }, '3': { t: 'trap', trap: 'pit' }
        }
      },
      d2: {
        id: 'd2', name: 'Smugglers\' Tunnels', type: 'dungeon', theme: 'cave', dl: 2, up: 'd1', down: 'd3', grid: [
          '######################',
          '#<...#.......#.......#',
          '#....+...a...+...b...#',
          '#....#.......#.......#',
          '##.###########.#####+#',
          '#...#..........#.....#',
          '#.1.+....c.....S..e..#',
          '#...#..........#.....#',
          '#.#######+######.....#',
          '#.#.....#.#....#######',
          '#.#..d..#.#.2....f...#',
          '#.#.....+.#....#.....#',
          '#.############+#.....#',
          '#......#.....#.###+###',
          '#..g...+..h..#.#.....#',
          '#......#.....S.#..k..#',
          '#X.....#..3..#.#...>.#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['kobold', 6]], mode: 'guard', tt: 'J' },
          b: { t: 'mon', g: [['spider_large', 3]], mode: 'ambush' },
          c: { t: 'mon', g: [['kobold_chief', 1], ['kobold', 4], ['kobold_shaman', 1]], mode: 'guard', tt: 'J,O,Q', flag: 'e0_kobolds', name: 'the kobold chieftain\'s court' },
          d: { t: 'event', title: 'The Ledger', text: 'Wrapped in sacking on a crate of stolen brandy is a fat, leather-bound ledger stamped "T. BREWER". The smugglers must have meant to sell it back.', give: ['brew_ledger'] },
          e: { t: 'chest', gp: 80, items: ['potion_healing', 'short_sword_1'] },
          f: { t: 'mon', g: [['rat_giant', 5], ['wererat', 1]], mode: 'hunt' },
          g: { t: 'mon', g: [['bandit', 4]], mode: 'guard', tt: 'M', talk: 'Four smugglers look up from their dice. "You\'re not the Rat King\'s lot," one growls. "Turn around, or we\'ll feed you to them."' },
          h: { t: 'chest', gp: 40, items: ['potion_healing', 'scroll_cure_light'] },
          k: { t: 'mon', g: [['wererat', 2], ['rat_giant', 4]], mode: 'guard' },
          '1': { t: 'trap', trap: 'spear' }, '2': { t: 'trap', trap: 'darts' }, '3': { t: 'trap', trap: 'pit' }
        }
      },
      d3: {
        id: 'd3', name: 'The Old Cistern', type: 'dungeon', theme: 'stone', dl: 2, up: 'd2', grid: [
          '####################',
          '#<..#.....#........#',
          '#...+..a..#..1..b..#',
          '#...#.....+........#',
          '#.###########.######',
          '#.#....#....#.#....#',
          '#.#.c..+.2..#.S.e..#',
          '#.#....#....#.#....#',
          '#.######+####.######',
          '#......#.#....#....#',
          '#..d...#.#.f..+.g..#',
          '#......S.#....#....#',
          '###+######.##+######',
          '#.....#.......3....#',
          '#..h..+...k........#',
          '####################'],
        keys: {
          a: { t: 'mon', g: [['rat_giant', 6]], mode: 'guard' },
          b: { t: 'mon', g: [['wererat', 2]], mode: 'hunt', tt: 'C' },
          c: { t: 'mon', g: [['rat_swarm', 3]], mode: 'guard', gp: 30 },
          d: { t: 'event', title: 'The Grain Hoard', text: 'Sacks of grain stamped with Thornwick\'s granary mark are piled to the ceiling. The Rat King meant to starve the town.', xp: 60 },
          e: { t: 'chest', gp: 120, items: ['silver_dagger', 'potion_healing', 'ring_prot1'] },
          f: { t: 'mon', g: [['wererat', 2], ['xvart', 4]], mode: 'guard', tt: 'K' },
          g: { t: 'chest', gp: 60, items: ['scroll_cure_light', 'potion_healing', 'silver_bullet'] },
          h: { t: 'event', title: 'A Prisoner', text: 'A thin boy in a brewer\'s apron is chained to a pipe. "Please! The rat-men caught me in the cellars!" You break his chains and he scampers for the stairs, promising to tell the Reeve.', flag: 'e0_pip' },
          k: { t: 'mon', g: [['rat_king', 1], ['wererat', 2], ['rat_giant', 4]], mode: 'guard', boss: true, flag: 'e0_ratking', tt: 'C', gp: 200, items: ['rat_crown', 'potion_extra_healing'], talk: 'On a throne of gnawed casks sits a swollen rat-man in a crown of gold wire. "More meat for my children," it hisses. "Thornwick will starve, and the rats will inherit it!"' },
          '1': { t: 'trap', trap: 'darts' }, '2': { t: 'trap', trap: 'pit' }, '3': { t: 'trap', trap: 'gas' }
        }
      }
    },
    wild: {
      name: 'The Thornwick Vale', grid: [
        '^^^^hhhhhffffffff~ffffff',
        '^^^hhhh..ffff....~..ffff',
        '^^hhhh..hf.......~....ff',
        '^hhh............f~......',
        'hh...............~......',
        'h................~...=..',
        'h.....ff.........~...=..',
        '....ffff.........~...=..',
        '....fff......====b====..',
        '...==========....~......',
        '..f=fffff........~......',
        '...=.fff.........~...f..',
        '...=.............~..fff.',
        '...=.............~.fffff',
        '...=ww...........~..f.ff',
        '..w.www..........~~.....',
        '.wwwwww...........~~....',
        'wwwwww............~~~...'],
      sites: [
        { kind: 'town', name: 'Thornwick', x: 13, y: 9, map: 'town', entry: { x: 1, y: 5, dir: 1 } },
        { kind: 'dungeon', name: 'Smugglers\' Cove', x: 3, y: 15, map: 'd2', entry: { x: 2, y: 16, dir: 1 }, lock: 'e0_cove', lockText: 'Rocks and brambles hide the riverbank. You find no way in — perhaps someone knows where to look.' },
        { kind: 'hamlet', name: 'Millbrook', x: 21, y: 5 },
        { kind: 'healer', name: 'Herb-Wife Agna\'s Cottage', x: 6, y: 3 },
        { kind: 'holy', name: 'The Standing Stones', x: 20, y: 13, xp: 100 },
        { kind: 'lair', name: 'Wolf Den', x: 9, y: 2, fight: [['wolf', 5]], gp: 40, items: ['potion_healing'] },
        { kind: 'camp', name: 'Old Watchtower', x: 8, y: 12 }
      ],
      encounters: [
        { terrain: '.', g: [['bandit', 4]], w: 3 }, { terrain: '.', g: [['wolf', 3]], w: 2 },
        { terrain: 'f', g: [['wolf', 4]], w: 3 }, { terrain: 'f', g: [['spider_large', 3]], w: 2 },
        { terrain: 'h', g: [['goblin', 6]], w: 3 }, { terrain: 'h', g: [['kobold', 7]], w: 2 },
        { terrain: 'w', g: [['frog_giant', 4]], w: 3 }, { terrain: 'w', g: [['centipede', 5]], w: 2 },
        { terrain: '=', g: [['bandit', 3]], w: 3 }, { terrain: '^', g: [['goblin', 5]], w: 2 }
      ]
    }
  });

  /* =====================================================================
   * E1 — The Hollow Vaults (levels 1–3)
   * ===================================================================== */
  Modules.register({
    id: 'E1', name: 'The Hollow Vaults', band: 1, levels: '1–3', hand: true, size: 'medium',
    blurb: 'Miners in the hills above Greywater broke into sealed dwarven vaults — and something woke. Now a renegade wizard claims the vaults and their ancient guardian.',
    start: { map: 'town', x: 1, y: 8, dir: 1 },
    giver: 'Archivist Benedek',
    intro: 'Archivist Benedek peers at you over half-moon spectacles amid towers of books. "The Hollow Vaults were sealed by the dwarves four centuries ago. Now a wizard called Mordane has taken them, and the miners who found them are missing. Worse — he seeks the Lantern Codex. It must not stay in his hands."',
    quests: [
      { id: 'q_e1_main', title: 'The Renegade of the Vaults', main: true, text: 'Find the wizard Mordane in the Deep Vault and end his schemes.', goal: { flag: 'e1_mordane' }, reward: { gp: 500, xp: 3000 } },
      { id: 'q_e1_miners', title: 'Free the Miners', text: 'Greywater\'s miners were taken by goblins in the mine workings. Free them.', goal: { flag: 'e1_miners' }, reward: { gp: 150, xp: 1000 } },
      { id: 'q_e1_codex', title: 'The Lantern Codex', text: 'Recover the Lantern Codex from the Upper Vaults and bring it to the Library.', goal: { item: 'lantern_codex' }, reward: { gp: 300, xp: 1200 } },
      { id: 'q_e1_warden', title: 'Still the Warden', text: 'The Hollow Warden, a guardian construct, has woken. Destroy it before it walks out of the hill.', goal: { flag: 'e1_warden' }, reward: { gp: 300, xp: 2000 } }
    ],
    rumours: [
      'The miners found a door carved with a lantern before they vanished.',
      'There\'s an old ventilation shaft on the east slope of Hollow Hill. The miners would know where.',
      'Mordane was expelled from the college at Aldersgate for raising the dead.',
      'Spiders as big as dogs have nested in the thicket south of the river.',
      'The dwarves built a guardian of brass and stone to keep their vaults. Hammers and maces serve best against such things.',
      'Pilgrims say the Dwarf-King\'s Cairn on the northern heights blesses those who honour it.'
    ],
    wander: [{ g: [['goblin', 5]] }, { g: [['skeleton', 4]] }, { g: [['rat_giant', 5]] }, { g: [['hobgoblin', 3]] }],
    maps: {
      town: {
        id: 'town', name: 'Greywater', type: 'town', theme: 'town', grid: [
          'WWWWWWWWWWWWWWWWWWWW',
          'W..T..%%%%%.%%%%%..W',
          'W.....%%%%%.%%%%%..W',
          'W.T...%%t%%.%%i%%.TW',
          'W..................W',
          'W.%%a%%.%%m%.%%h%%.W',
          'W.%%%%%.%%%%.%%%%%.W',
          'W.%%%%%.%%%%.%%%%%.W',
          'X..................W',
          'W.%%%%.%%%%%.%%%%%.W',
          'W.%%%%.%%%%%.%%%%%.W',
          'W.%%g%.%%p%%.%%%%%.W',
          'W..................W',
          'W.T..T..T..T..T....W',
          'W..................W',
          'WWWWWWWWWWWWWWWWWWWW'],
        keys: {
          t: { t: 'shop', shop: 'temple', name: 'Chapel of the Tide-Father' },
          i: { t: 'shop', shop: 'inn', name: 'The River Rest' },
          a: { t: 'shop', shop: 'magic', name: 'Sigil & Scroll' },
          m: { t: 'shop', shop: 'smith', name: 'Greywater Forge' },
          h: { t: 'shop', shop: 'hall', name: 'The Lantern Library' },
          g: { t: 'shop', shop: 'train', name: 'Guild of Arms' },
          p: { t: 'shop', shop: 'tavern', name: 'The Ferryman\'s Rest' }
        }
      },
      d1: {
        id: 'd1', name: 'The Mine Workings', type: 'dungeon', theme: 'cave', dl: 1, up: 'wild', down: 'd2', grid: [
          '######################',
          '#<...#........#......#',
          '#....+...a....+..b...#',
          '#....#........#......#',
          '#.####.######.####.###',
          '#.#....#....#.#......#',
          '#.#.1..+.c..#.S...e..#',
          '#.#....#....#.#......#',
          '#.#########+#.########',
          '#...#.......#........#',
          '###.#.d.....+..2..f..#',
          '#...#.......#........#',
          '#.###.#######+######.#',
          '#...S.#.....#......#.#',
          '#.g.#.#..h..#..k...#.#',
          '#...#.+..3..+......+.#',
          '#...#.#.....#..>...#.#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['goblin', 6]], mode: 'guard', tt: 'K' },
          b: { t: 'mon', g: [['rat_giant', 5]], mode: 'ambush' },
          c: { t: 'mon', g: [['hobgoblin', 3], ['goblin', 3]], mode: 'hunt', tt: 'J' },
          e: { t: 'chest', gp: 80, items: ['potion_healing', 'shield_1'] },
          d: { t: 'mon', g: [['goblin_boss', 1], ['goblin', 5]], mode: 'guard', tt: 'C' },
          f: { t: 'event', title: 'The Miners', text: 'Six haggard miners are chained to an ore cart. "Bless you! The goblins kept us digging for their master below. There\'s an old shaft on the hillside to the east — it drops straight into the Upper Vaults. We\'ll find our own way home."', flag: 'e1_miners', xp: 100 },
          g: { t: 'chest', gp: 50, items: ['scroll_burning_hands', 'potion_healing'] },
          h: { t: 'mon', g: [['hobgoblin_captain', 1], ['hobgoblin', 4]], mode: 'guard', tt: 'J,D' },
          k: { t: 'mon', g: [['goblin_shaman', 1], ['goblin', 4]], mode: 'guard', tt: 'K' },
          '1': { t: 'trap', trap: 'pit' }, '2': { t: 'trap', trap: 'block' }, '3': { t: 'trap', trap: 'darts' }
        }
      },
      d2: {
        id: 'd2', name: 'The Upper Vaults', type: 'dungeon', theme: 'brass', dl: 2, up: 'd1', down: 'd3', grid: [
          '######################',
          '#<..#.......#........#',
          '#...+...a...#...1....#',
          '#...#.......+........#',
          '#...#####.###.####.###',
          '##+##...#.#.....#....#',
          '#...#.b.#.#..c..S..e.#',
          '#...+...+.#.....#....#',
          '#.d.#####.###+########',
          '#...#.....#.......#..#',
          '#####.2...#...f...+..#',
          '#X..+.....#.......#.g#',
          '###.#######+#######..#',
          '#.......#.....#....#.#',
          '#..h....S..k..#.3..+.#',
          '#.......#.....+....#.#',
          '#.......#..>..#..m.#.#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['skeleton', 6]], mode: 'guard' },
          b: { t: 'mon', g: [['animated_armor', 2]], mode: 'guard', gp: 40 },
          c: { t: 'mon', g: [['zombie', 5]], mode: 'hunt' },
          e: { t: 'chest', gp: 150, items: ['long_sword_1', 'scroll_web'] },
          d: { t: 'chest', gp: 60, items: ['potion_healing', 'potion_healing'] },
          f: { t: 'mon', g: [['gnoll', 4]], mode: 'guard', tt: 'L,M', talk: 'Gnolls in Mordane\'s livery bar the way. "The master pays us to kill thieves," one cackles.' },
          g: { t: 'event', title: 'The Lantern Codex', text: 'On a stone lectern lies a heavy book bound in brass, its pages glowing with a soft golden light: the Lantern Codex.', give: ['lantern_codex'] },
          h: { t: 'mon', g: [['skeleton', 5], ['wolf_skel', 2]], mode: 'guard' },
          k: { t: 'mon', g: [['hobgoblin_warlock', 1], ['hobgoblin', 3]], mode: 'guard', tt: 'J' },
          m: { t: 'chest', gp: 90, items: ['scroll_sleep', 'potion_extra_healing'] },
          '1': { t: 'trap', trap: 'blade' }, '2': { t: 'trap', trap: 'fire' }, '3': { t: 'trap', trap: 'spear' }
        }
      },
      d3: {
        id: 'd3', name: 'The Deep Vault', type: 'dungeon', theme: 'brass', dl: 3, up: 'd2', grid: [
          '######################',
          '#<..#..........#.....#',
          '#...+....a.....+..b..#',
          '#...#..........#.....#',
          '##.####+#####.####S###',
          '#.....#.....#.#.....e#',
          '#..1..#..c..#.#......#',
          '#.....+.....#.#......#',
          '###.######+##.########',
          '#.....#.........#....#',
          '#..d..S....2....+..f.#',
          '#.....#.........#....#',
          '#.#########+######.###',
          '#.#.....#.......#....#',
          '#.+..g..+...w...+.3..#',
          '#.#.....#.......#....#',
          '#.#.....#...k...#..h.#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['gnoll', 5]], mode: 'guard', tt: 'L' },
          b: { t: 'mon', g: [['apprentice', 2], ['gnoll', 2]], mode: 'guard', tt: 'L' },
          c: { t: 'mon', g: [['hobgoblin_captain', 1], ['hobgoblin', 4]], mode: 'hunt' },
          e: { t: 'chest', gp: 200, items: ['ring_prot1', 'scroll_lightning_bolt'] },
          d: { t: 'mon', g: [['skeleton', 6]], mode: 'guard' },
          f: { t: 'chest', gp: 120, items: ['potion_extra_healing', 'mace_1'] },
          g: { t: 'mon', g: [['vault_warden', 1]], mode: 'guard', flag: 'e1_warden', items: ['warden_core'], talk: 'A figure of brass and grey stone stands motionless in the dark. As you approach, blue light kindles in its eyes. "INTRUDERS. THE VAULT IS SEALED."' },
          w: { t: 'mon', g: [['hollow_mage', 1], ['apprentice', 2], ['gnoll', 3]], mode: 'guard', boss: true, flag: 'e1_mordane', tt: 'C', gp: 300, items: ['wand_mm', 'cloak_prot1'], talk: 'A gaunt man in a robe stitched with silver lanterns turns from a glowing map. "The Codex was mine by right of discovery," Mordane snarls. "Kill them!"' },
          k: { t: 'event', title: 'Mordane\'s Papers', text: 'Among Mordane\'s papers is a letter sealed with a crown of black iron: "The Iron King stirs in the eastern barrows. Bring me the Codex, and you shall serve at his right hand."', flag: 'e1_letter' },
          h: { t: 'chest', gp: 100, items: ['potion_healing', 'scroll_cure_serious'] },
          '1': { t: 'trap', trap: 'darts' }, '2': { t: 'trap', trap: 'gas' }, '3': { t: 'trap', trap: 'blade' }
        }
      }
    },
    wild: {
      name: 'Greywater Vale', grid: [
        '^^^^^hhhhhhh^^^^^^^^^^^^',
        '^^hhh.......hh^^^^hh^^^^',
        'hh.......ff....h^hhhhh^^',
        'h......ffff....hhhhhhhh^',
        'h..........=....hhhhhhhh',
        'h..........=======hhhhhh',
        'ff.........=......hhhhhh',
        'fff........=.......hhhhh',
        'ff.........=........hhhh',
        'f......=====........hhhh',
        'ff.........=............',
        '~~~~~~~~~~~b~~~~~~~~~~~~',
        '...........=.......ffff.',
        '..ww.......=......ffffff',
        '.wwww......=......ffffff',
        'wwwww...........ffffffff',
        'wwww...hh.......ffffffff',
        'www...hhhh.....fffffffff'],
      sites: [
        { kind: 'town', name: 'Greywater', x: 6, y: 9, map: 'town', entry: { x: 1, y: 8, dir: 1 } },
        { kind: 'dungeon', name: 'Hollow Hill', x: 18, y: 5, map: 'd1', entry: { x: 1, y: 1, dir: 2 } },
        { kind: 'dungeon', name: 'The Collapsed Shaft', x: 20, y: 8, map: 'd2', entry: { x: 2, y: 11, dir: 1 }, lock: 'e1_miners', lockText: 'You search the eastern slope but find only scree and gorse. Someone who knew the mine might know of a way in.' },
        { kind: 'hamlet', name: 'Tollbridge', x: 11, y: 14 },
        { kind: 'healer', name: 'Sister Maud\'s Infirmary', x: 3, y: 4 },
        { kind: 'holy', name: 'The Dwarf-King\'s Cairn', x: 15, y: 2, xp: 150 },
        { kind: 'camp', name: 'Shepherd\'s Hut', x: 10, y: 4 },
        { kind: 'lair', name: 'The Spider Thicket', x: 19, y: 14, fight: [['spider_large', 5], ['spider_huge', 1]], gp: 80, items: ['potion_antidote', 'scroll_cure_light'] }
      ],
      encounters: [
        { terrain: '.', g: [['bandit', 5]], w: 3 }, { terrain: '.', g: [['goblin', 7]], w: 2 },
        { terrain: 'f', g: [['spider_large', 4]], w: 2 }, { terrain: 'f', g: [['wolf', 4]], w: 3 },
        { terrain: 'h', g: [['hobgoblin', 4]], w: 3 }, { terrain: 'h', g: [['orc', 5]], w: 2 },
        { terrain: 'w', g: [['lizard_man', 3]], w: 2 }, { terrain: 'w', g: [['frog_giant', 5]], w: 2 },
        { terrain: '^', g: [['ogre', 1], ['goblin', 4]], w: 2 }, { terrain: '=', g: [['bandit', 4]], w: 3 }
      ]
    }
  });

  /* =====================================================================
   * E2 — Barrow of the Iron King (levels 3–5)
   * ===================================================================== */
  Modules.register({
    id: 'E2', name: 'Barrow of the Iron King', band: 2, levels: '3–5', hand: true, size: 'medium',
    blurb: 'On the Barrow Downs the dead are walking. The Iron King, a tyrant buried three hundred years ago, has risen with his knights to reclaim the March.',
    start: { map: 'town', x: 18, y: 8, dir: 3 },
    giver: 'Lady Isolde Varn',
    intro: 'Lady Isolde Varn, Warden of the March, stands armoured before a map of the Downs. "Three villages emptied in a month. The dead walk out of the Iron King\'s barrow every night. The gnolls have the barrow key — they have been looting the outer tombs. Take it from them, go in, and put the Iron King back in his grave."',
    quests: [
      { id: 'q_e2_main', title: 'The Iron King', main: true, text: 'Descend into the barrow and destroy the Iron King on his throne.', goal: { flag: 'e2_ironking' }, reward: { gp: 1000, xp: 8000 } },
      { id: 'q_e2_gnolls', title: 'The Gnoll Warband', text: 'A gnoll warband camps on the northern downs. Defeat their warchief and take the barrow key.', goal: { flag: 'e2_barrowkey' }, reward: { gp: 300, xp: 2000 } },
      { id: 'q_e2_sunstone', title: 'The Sunstone', text: 'The holy Sunstone of St. Aldhelm was buried with the barrow\'s first victims. Recover it for the chapel.', goal: { item: 'sunstone' }, reward: { gp: 500, xp: 3000 } },
      { id: 'q_e2_rest', title: 'Rest for the Fallen', text: 'The Iron King\'s knights were bound to him by an oath. Find their shades in the Hall of Knights and release them.', goal: { flag: 'e2_rest' }, reward: { gp: 400, xp: 3000 } }
    ],
    rumours: [
      'The Iron King\'s touch steals a man\'s years. Bring holy water, and silver or enchanted steel.',
      'The gnolls on the northern downs have a key of black iron. They boast of it.',
      'St. Aldhelm\'s chapel stands across the river. Pray there before you face the dead.',
      'Worgs have been seen near the old den in the western hills.',
      'They say the Iron King made a pact with a witch in the fens to the south.',
      'The Grey Sisters at the abbey can cure the wasting that ghoul claws bring.'
    ],
    wander: [{ g: [['skeleton', 6]] }, { g: [['zombie', 5]] }, { g: [['ghoul', 3]] }, { g: [['shadow', 2]] }],
    maps: {
      town: {
        id: 'town', name: 'Kestrel\'s Rest', type: 'town', theme: 'town', grid: [
          'WWWWWWWWWWWWWWWWWWWW',
          'W%%%%%.%%%%%%.%%%%%W',
          'W%%%%%.%%%%%%.%%%%%W',
          'W%%i%%.%%%h%%.%%t%%W',
          'W..................W',
          'W.%m%..TT..TT..%a%.W',
          'W.%%%..........%%%.W',
          'W.%%%..........%%%.W',
          'W.....TT....TT.....X',
          'W.%%%..........%%%.W',
          'W.%%%..........%%%.W',
          'W.%g%..TT..TT..%p%.W',
          'W..................W',
          'W.%%%%%%.%%%%%%%%%.W',
          'W.%%%%%%.%%%%%%%%%.W',
          'WWWWWWWWWWWWWWWWWWWW'],
        keys: {
          i: { t: 'shop', shop: 'inn', name: 'The Kestrel\'s Perch' },
          h: { t: 'shop', shop: 'hall', name: 'Warden\'s Keep' },
          t: { t: 'shop', shop: 'temple', name: 'House of the Morning Star' },
          m: { t: 'shop', shop: 'smith', name: 'Varn Armoury', extra: ['silver_sword', 'silver_mace', 'silver_arrow', 'silver_dagger'] },
          a: { t: 'shop', shop: 'magic', name: 'The Sage\'s Tower', extra: ['holy_water', 'scroll_ward_undead'] },
          g: { t: 'shop', shop: 'train', name: 'Barracks of the March' },
          p: { t: 'shop', shop: 'tavern', name: 'The Broken Shield' }
        }
      },
      d1: {
        id: 'd1', name: 'The Barrow Halls', type: 'dungeon', theme: 'crypt', dl: 3, up: 'wild', down: 'd2', grid: [
          '######################',
          '#<.......#....#......#',
          '#........+....+...a..#',
          '#..1.....#....#......#',
          '#####+####.##.####+###',
          '#...#....#.##.#......#',
          '#.b.+....#.##.+...c..#',
          '#...#.d..#.##.#......#',
          '#####....S....########',
          '#....#...#.2.........#',
          '#.e..+...#...#####+###',
          '#....#####.###.....#.#',
          '###+##.....#...f...S.#',
          '#....#..g..#.......#k#',
          '#.h..+.....+...3...###',
          '#....#..n..#.......#.#',
          '#....#..>..#.......+.#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['skeleton', 8]], mode: 'guard' },
          b: { t: 'chest', gp: 150, items: ['potion_extra_healing', 'scroll_ward_undead'] },
          c: { t: 'mon', g: [['zombie', 6]], mode: 'hunt' },
          d: { t: 'mon', g: [['ghoul', 3]], mode: 'guard', tt: 'B' },
          e: { t: 'mon', g: [['ghoul', 4]], mode: 'ambush' },
          f: { t: 'mon', g: [['zombie_ogre', 1], ['zombie', 4]], mode: 'guard' },
          g: { t: 'event', title: 'The Sunstone', text: 'Set into a cracked altar is a fist-sized amber gem glowing with warm light — the Sunstone of St. Aldhelm, lost when the barrow was sealed.', give: ['sunstone'] },
          n: { t: 'mon', g: [['ghoul', 3], ['skeleton', 3]], mode: 'guard' },
          h: { t: 'chest', gp: 100, items: ['mace_1', 'holy_water', 'holy_water'] },
          k: { t: 'chest', gp: 250, items: ['cloak_prot1', 'potion_healing'] },
          '1': { t: 'trap', trap: 'spear' }, '2': { t: 'trap', trap: 'block' }, '3': { t: 'trap', trap: 'gas' }
        }
      },
      d2: {
        id: 'd2', name: 'The Hall of Knights', type: 'dungeon', theme: 'crypt', dl: 4, up: 'd1', down: 'd3', grid: [
          '######################',
          '#<..#.......#........#',
          '#...+...a...+....b...#',
          '#...#.......#........#',
          '#.###.#####.#####+####',
          '#.#...#...#.#........#',
          '#.#.c.+.1.#.#..d.....#',
          '#.#...#...#.S........#',
          '#.#####+###.##########',
          '#.....#...#.#........#',
          '#..e..#.f.+.+....g...#',
          '#.....#...#.#........#',
          '##+######.#.#####.####',
          '#......S..#.#........#',
          '#..h...#..#.+..2..k..#',
          '#......#3.#.#........#',
          '#......#..+.#.....>..#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['barrow_knight', 2], ['skeleton', 4]], mode: 'guard', tt: 'B' },
          b: { t: 'mon', g: [['shadow', 3]], mode: 'ambush' },
          c: { t: 'chest', gp: 200, items: ['potion_extra_healing', 'scroll_cure_serious'] },
          d: { t: 'mon', g: [['wight', 2], ['zombie', 4]], mode: 'hunt' },
          e: { t: 'event', title: 'The Kneeling Shades', text: 'Ghostly knights kneel around a tarnished shield bearing a kestrel. A voice whispers: "We swore to the Iron King and were damned with him. Will you speak the words of release?"', choices: [{ label: 'Pray for them', text: 'You speak the old words. The shades bow their heads and fade into silver light, their oath broken at last.', flag: 'e2_rest', xp: 400 }, { label: 'Leave them', text: 'You leave the shades to their endless vigil.', keep: true }] },
          f: { t: 'mon', g: [['ghast', 2], ['ghoul', 3]], mode: 'guard', tt: 'B' },
          g: { t: 'mon', g: [['barrow_knight', 2], ['wight', 2]], mode: 'guard', tt: 'B' },
          h: { t: 'chest', gp: 300, items: ['long_sword_2', 'shield_1'] },
          k: { t: 'mon', g: [['shadow', 2], ['wight', 3]], mode: 'guard' },
          '1': { t: 'trap', trap: 'blade' }, '2': { t: 'trap', trap: 'fire' }, '3': { t: 'trap', trap: 'pit' }
        },
        downText: 'A broad stair descends to a great iron door.'
      },
      d3: {
        id: 'd3', name: 'The Iron Throne', type: 'dungeon', theme: 'crypt', dl: 5, up: 'd2', grid: [
          '######################',
          '#<..#.......#........#',
          '#...+...a...+...1....#',
          '#...#.......#........#',
          '#.#####.#######.######',
          '#.#.....#.....#.#....#',
          '#.#..b..#..c..#.S..e.#',
          '#.+.....+.....+.#....#',
          '#.#####.#######.######',
          '#.....#.#.....#.#....#',
          '#..d..S.#.....#.+..f.#',
          '#.....#.#..2..#.#....#',
          '#######.###+###.##+###',
          '#.......#.....#......#',
          '#...g...+..k..+...3..#',
          '#.......#.....#......#',
          '#.......#..h..#......#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['wight', 3], ['skeleton', 4]], mode: 'guard' },
          b: { t: 'mon', g: [['barrow_knight', 2], ['ghast', 2]], mode: 'hunt', tt: 'B' },
          c: { t: 'mon', g: [['wraith', 2]], mode: 'guard', tt: 'E' },
          e: { t: 'chest', gp: 400, items: ['plate_1', 'potion_extra_healing'] },
          d: { t: 'chest', gp: 250, items: ['scroll_raise_dead', 'potion_extra_healing'] },
          f: { t: 'mon', g: [['mummy', 1], ['zombie', 4]], mode: 'guard', tt: 'D' },
          g: { t: 'mon', g: [['barrow_knight', 3]], mode: 'guard' },
          k: { t: 'mon', g: [['iron_king', 1], ['barrow_knight', 2], ['wight', 2]], mode: 'guard', boss: true, flag: 'e2_ironking', gp: 800, items: ['iron_crown', 'long_sword_2'], talk: 'On a throne of black iron sits a figure in rusted plate, a crown fused to its skull. Its voice is the grinding of a millstone: "The March is mine. It was always mine. Kneel, and serve me in death."' },
          h: { t: 'event', title: 'The War-Chest', text: 'Behind the throne lies the Iron King\'s war-chest and a cracked tablet: "Ravenmoor\'s queen promised me eternity. Let her keep her promises to the worms."', gp: 600, give: ['bracers_5'], flag: 'e2_throne' },
          '1': { t: 'trap', trap: 'darts' }, '2': { t: 'trap', trap: 'block' }, '3': { t: 'trap', trap: 'spear' }
        }
      }
    },
    wild: {
      name: 'The Barrow Downs', grid: [
        'hhhhhhhhhhhhhhh~hhhhhhhhhh',
        'hh....hhh.....h~h......hhh',
        'h.......h.....h~h.......hh',
        'h.......h......~.......h.h',
        'h..............~.........h',
        'h..............~.........h',
        '...ff..........~.....hhh..',
        '..ffff.........~....hhhhh.',
        '.fff..=========b====hhhh..',
        '..f..=.........~...=h.....',
        '.....=.........~..........',
        '.....=.........~.....ff...',
        '.....=.........~....ffff..',
        '.....======....~f.ffffff..',
        'ww.............~.ffffff...',
        'www............~~..ffff...',
        'wwww............~~........',
        'wwwww............~~.......'],
      sites: [
        { kind: 'town', name: 'Kestrel\'s Rest', x: 5, y: 8, map: 'town', entry: { x: 18, y: 8, dir: 3 } },
        { kind: 'dungeon', name: 'Barrow of the Iron King', x: 20, y: 9, map: 'd1', entry: { x: 1, y: 1, dir: 1 }, lock: 'e2_barrowkey', lockText: 'A great door of black iron seals the barrow mound. It is locked fast. The gnolls are said to have the key.' },
        { kind: 'lair', name: 'Gnoll Warband', x: 13, y: 3, fight: [['gnoll_chief', 1], ['gnoll', 7], ['gnoll_shaman', 1]], flag: 'e2_barrowkey', gp: 300, items: ['barrow_key', 'potion_healing'] },
        { kind: 'hamlet', name: 'Fennick\'s Ford', x: 10, y: 14 },
        { kind: 'healer', name: 'Abbey of the Grey Sisters', x: 3, y: 14 },
        { kind: 'holy', name: 'Chapel of St. Aldhelm', x: 16, y: 13, xp: 400 },
        { kind: 'camp', name: 'Old Watchfire', x: 22, y: 3 },
        { kind: 'lair', name: 'Worg Den', x: 8, y: 2, fight: [['worg', 4]], gp: 150, items: ['potion_extra_healing'] }
      ],
      encounters: [
        { terrain: '.', g: [['gnoll', 5]], w: 3 }, { terrain: '.', g: [['skeleton', 8]], w: 2 },
        { terrain: 'f', g: [['worg', 3]], w: 3 }, { terrain: 'f', g: [['bugbear', 3]], w: 2 },
        { terrain: 'h', g: [['ogre', 2]], w: 2 }, { terrain: 'h', g: [['ghoul', 4]], w: 3 },
        { terrain: 'w', g: [['zombie', 6]], w: 3 }, { terrain: 'w', g: [['lizard_man', 5]], w: 2 },
        { terrain: '=', g: [['brigand', 6]], w: 3 }, { terrain: '^', g: [['hill_giant', 1]], w: 1 }
      ]
    }
  });

  /* =====================================================================
   * E3 — The Witch-Queen of Ravenmoor (levels 5–7)
   * ===================================================================== */
  Modules.register({
    id: 'E3', name: 'The Witch-Queen of Ravenmoor', band: 2, levels: '5–7', hand: true, size: 'large',
    blurb: 'From a spire of black glass above the fens, the Witch-Queen Morwenna rules Ravenmoor through fear, sorcery and a dragon of frost and shadow.',
    start: { map: 'town', x: 18, y: 7, dir: 3 },
    giver: 'Elder Rowan Ashby',
    intro: 'Elder Rowan Ashby, white-bearded and leaning on a blackthorn staff, speaks low so the shutters will not hear. "Brackenford is the last free village in Ravenmoor. Her raven knights take our young folk to the tower and they do not come back. The tower is sealed by Mother Sedge\'s magic — the old hag in the fen holds its key. Break her, then break the Queen."',
    quests: [
      { id: 'q_e3_main', title: 'The Witch-Queen', main: true, text: 'Climb the Black Glass Spire and destroy the Witch-Queen Morwenna.', goal: { flag: 'e3_witch' }, reward: { gp: 2500, xp: 16000 } },
      { id: 'q_e3_sedge', title: 'Mother Sedge', text: 'The fen hag Mother Sedge holds the magic that seals the tower. Destroy her in her hut in the southern fens.', goal: { flag: 'e3_sedge' }, reward: { gp: 600, xp: 5000 } },
      { id: 'q_e3_moon', title: 'The Moon\'s Tear', text: 'The Moonwell has been dark since the lizard folk stole the Moon\'s Tear. Recover it from the Fen Caves.', goal: { item: 'moon_tear' }, reward: { gp: 800, xp: 5000 } },
      { id: 'q_e3_drake', title: 'Shadowwing', text: 'The Queen\'s dragon, Shadowwing, nests in the tower undercroft. Slay it.', goal: { flag: 'e3_drake' }, reward: { gp: 1500, xp: 10000 } }
    ],
    rumours: [
      'Trolls hold the old bridge on the east road. Fire is the only thing that keeps them down.',
      'Mother Sedge can turn herself invisible. Some say she can only be found by smell.',
      'The Moonwell sisters heal any who come in peace.',
      'Shadowwing breathes a frost that freezes blood. Wards against cold would serve you well.',
      'The Witch-Queen was once a healer in Brackenford. Grief turned her.',
      'Lizard men in the Fen Caves worship a pearl they stole from the Moonwell.'
    ],
    wander: [{ g: [['lizard_man', 5]] }, { g: [['ogre', 2]] }, { g: [['troll', 1]] }, { g: [['gargoyle', 3]] }],
    maps: {
      town: {
        id: 'town', name: 'Brackenford', type: 'town', theme: 'town', grid: [
          'WWWWWWWWWWWWWWWWWWWW',
          'WTT.%%%%%%..%%%%%.TW',
          'WT..%%%%%%..%%%%%..W',
          'W...%%i%%%..%%h%%..W',
          'W..................W',
          'W.%t%%..%%m%..%%a%.W',
          'W.%%%%..%%%%..%%%%.W',
          'W......T......T....X',
          'W.%%%%..%%%%..%%%%.W',
          'W.%g%%..%%p%..%%%%.W',
          'W..................W',
          'W.T..T...T...T..T..W',
          'W..................W',
          'W~~~~~~~~~~~~~~~~~~W',
          'WWWWWWWWWWWWWWWWWWWW'],
        keys: {
          i: { t: 'shop', shop: 'inn', name: 'The Heron\'s Rest' },
          h: { t: 'shop', shop: 'hall', name: 'Free Folk\'s Hall' },
          t: { t: 'shop', shop: 'temple', name: 'Shrine of the Green Lady' },
          m: { t: 'shop', shop: 'smith', name: 'Ashby\'s Forge' },
          a: { t: 'shop', shop: 'magic', name: 'The Hedge-Witch\'s Larder', extra: ['potion_frost_ward', 'potion_fire_res', 'oil_flask'] },
          g: { t: 'shop', shop: 'train', name: 'The Fen Wardens' },
          p: { t: 'shop', shop: 'tavern', name: 'The Muddy Boot' }
        }
      },
      d1: {
        id: 'd1', name: 'The Fen Caves', type: 'dungeon', theme: 'cave', dl: 5, grid: [
          '######################',
          '#X..##.......###.....#',
          '#....+...a....+..b...#',
          '##..##.......###.....#',
          '###.####.###.#####.###',
          '#.....#...#......#...#',
          '#..1..+.c.#..d...+.e.#',
          '#.....#...S......#...#',
          '##.####.###########.##',
          '#...#.....#.....#....#',
          '#.f.+..2..+..g..S.h..#',
          '#...#.....#.....#....#',
          '#.######.#####.###.###',
          '#......#.....#.......#',
          '#..k...+..3..+...m...#',
          '#......#.....#.......#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['lizard_man', 6]], mode: 'guard', tt: 'D' },
          b: { t: 'mon', g: [['frog_giant', 6], ['frog_poison', 3]], mode: 'ambush' },
          c: { t: 'mon', g: [['snake_viper', 3]], mode: 'guard' },
          d: { t: 'mon', g: [['troll', 1], ['lizard_man', 4]], mode: 'hunt' },
          e: { t: 'chest', gp: 300, items: ['potion_extra_healing', 'scroll_cure_critical'] },
          f: { t: 'chest', gp: 200, items: ['ring_fire', 'potion_antidote'] },
          g: { t: 'mon', g: [['lizard_king', 1], ['lizard_man', 4]], mode: 'guard', tt: 'Q,S', talk: 'A huge lizard-man in a cloak of heron feathers rises from a throne of driftwood. "Warm-bloods," it hisses. "The pearl is ours. The pearl sings to us."' },
          h: { t: 'event', title: 'The Moon\'s Tear', text: 'In a pool lit by a shaft of pale light rests a teardrop pearl as big as a hen\'s egg — the Moon\'s Tear, stolen from the Moonwell long ago.', give: ['moon_tear'] },
          k: { t: 'mon', g: [['troll', 2]], mode: 'guard', tt: 'D' },
          m: { t: 'mon', g: [['crocodile_giant', 1], ['crocodile', 2]], mode: 'ambush' },
          '1': { t: 'trap', trap: 'pit' }, '2': { t: 'trap', trap: 'gas' }, '3': { t: 'trap', trap: 'spear' }
        }
      },
      d2: {
        id: 'd2', name: 'The Tower Undercroft', type: 'dungeon', theme: 'tower', dl: 6, down: 'd3', grid: [
          '######################',
          '#......#.....#.......#',
          '#..a...+..X..+...b...#',
          '#......#.....#.......#',
          '###+######.######+####',
          '#.....#.......#......#',
          '#..c..S...1...+..d...#',
          '#.....#.......#......#',
          '#.#########+########.#',
          '#.#....#.......#.....#',
          '#.+..e.+...f...+..g..#',
          '#.#....#.......#.....#',
          '#.####.####+####S#####',
          '#......#.......#.....#',
          '#..2...+...h...#..k..#',
          '#......#.....3.#.....#',
          '#......#...>...#.....#',
          '######################'],
        keys: {
          a: { t: 'mon', g: [['ogre', 3]], mode: 'guard', tt: 'M' },
          b: { t: 'mon', g: [['raven_knight', 2], ['bugbear', 2]], mode: 'guard', tt: 'M' },
          c: { t: 'chest', gp: 400, items: ['potion_extra_healing', 'scroll_dispel_magic'] },
          d: { t: 'mon', g: [['gargoyle', 4]], mode: 'hunt' },
          e: { t: 'mon', g: [['ogre_mage', 1], ['ogre', 2]], mode: 'guard', tt: 'G' },
          f: { t: 'mon', g: [['raven_knight', 3]], mode: 'guard', tt: 'M' },
          g: { t: 'event', title: 'The Cages', text: 'Cages line the walls, crowded with villagers taken from Brackenford. You smash the locks and they flee for home, blessing your names.', flag: 'e3_prisoners', xp: 500 },
          h: { t: 'mon', g: [['ravenmoor_drake', 1]], mode: 'guard', flag: 'e3_drake', tt: 'H', items: ['potion_frost_ward'], talk: 'A black dragon uncoils from the darkness, frost smoking from its jaws. "The Queen said you would come," Shadowwing purrs. "She did not say you would be so small."' },
          k: { t: 'chest', gp: 800, items: ['cloak_prot2', 'wand_lightning'] },
          '1': { t: 'trap', trap: 'fire' }, '2': { t: 'trap', trap: 'blade' }, '3': { t: 'trap', trap: 'block' }
        },
        downText: 'A spiral stair of black glass climbs into the spire.'
      },
      d3: {
        id: 'd3', name: 'The Black Glass Spire', type: 'dungeon', theme: 'tower', dl: 7, up: 'd2', grid: [
          '####################',
          '#<...#........#....#',
          '#....+...a....+..b.#',
          '#....#........#....#',
          '#.####.######.####.#',
          '#.#....#....#....#.#',
          '#.#.1..S..c.+..2.#.#',
          '#.#....#....#....#.#',
          '#.######+#####+###.#',
          '#.#....#.....#....S#',
          '#.+..d.+..e..+..f..#',
          '#.#....#.....#.....#',
          '#.##.#####+#####.###',
          '#.....#.......#....#',
          '#..g..+...w...+..3.#',
          '####################'],
        keys: {
          a: { t: 'mon', g: [['raven_knight', 2], ['gargoyle', 2]], mode: 'guard' },
          b: { t: 'chest', gp: 600, items: ['potion_extra_healing', 'scroll_heal'] },
          c: { t: 'mon', g: [['ogre_mage', 2]], mode: 'guard', tt: 'G' },
          d: { t: 'chest', gp: 500, items: ['ring_prot2', 'scroll_cone_of_cold'] },
          e: { t: 'mon', g: [['warlock', 1], ['raven_knight', 3]], mode: 'guard', tt: 'L' },
          f: { t: 'mon', g: [['wraith', 3]], mode: 'hunt' },
          g: { t: 'chest', gp: 400, items: ['potion_speed', 'potion_extra_healing'] },
          w: { t: 'mon', g: [['witch_queen', 1], ['raven_knight', 2], ['gargoyle', 2]], mode: 'guard', boss: true, flag: 'e3_witch', gp: 2000, items: ['witch_crown', 'staff_power'], talk: 'The Witch-Queen turns from a window of black glass. She is younger than you expected, and her eyes are terribly sad. "Brackenford let my children die of fever and called it the will of the gods. Now I am the will of the gods." Green fire gathers in her hands.' },
          '1': { t: 'trap', trap: 'darts' }, '2': { t: 'trap', trap: 'fire' }, '3': { t: 'trap', trap: 'gas' }
        }
      }
    },
    wild: {
      name: 'Ravenmoor', grid: [
        'hhhhhhhhhhhhhhhhh~hhhhhhhh',
        'h...hhh..........~...^^^^h',
        'h...........ff...~..^^^^^h',
        'h...........fff..~...^^^.h',
        'hww.........fff..~..==..^h',
        'hwww........ff...~..=....h',
        'hwwww............~..=....h',
        'hwww.............~..=...wh',
        'hww..........w...~..=..wwh',
        'hw...............~..=.wwwh',
        'hww....==========b===wwwwh',
        'hwww...=.........~...wwwwh',
        'hwwww..=.........~...wwwwh',
        'hwwww..=.........~....w..h',
        'hwww...=..www....~.......h',
        'hww....=========.~.......h',
        'hwwwwww.....wwww.~.......h',
        'hwwwwwwww...wwww.~.......h',
        'hwwwwwwwwwwwwww..~.......h',
        'hhhhhhhhhhhhhhhhh~hhhhhhhh'],
      sites: [
        { kind: 'town', name: 'Brackenford', x: 6, y: 10, map: 'town', entry: { x: 18, y: 7, dir: 3 } },
        { kind: 'dungeon', name: 'The Fen Caves', x: 16, y: 15, map: 'd1', entry: { x: 2, y: 1, dir: 2 } },
        { kind: 'dungeon', name: 'The Black Glass Tower', x: 20, y: 4, map: 'd2', entry: { x: 10, y: 3, dir: 2 }, lock: 'e3_sedge', lockText: 'The tower door is a seamless slab of black glass. Green runes crawl across it — Mother Sedge\'s seal. While she lives, it will not open.' },
        { kind: 'lair', name: 'Mother Sedge\'s Hut', x: 12, y: 17, fight: [['bog_hag', 1], ['troll', 2]], flag: 'e3_sedge', gp: 500, items: ['scroll_remove_curse', 'potion_extra_healing'] },
        { kind: 'lair', name: 'Troll Bridge', x: 18, y: 10, fight: [['troll', 3]], gp: 400, items: ['potion_fire_res'] },
        { kind: 'hamlet', name: 'Coldwater', x: 4, y: 3 },
        { kind: 'healer', name: 'The Moonwell Sisters', x: 9, y: 6 },
        { kind: 'holy', name: 'The Moonwell', x: 14, y: 8, xp: 600 },
        { kind: 'camp', name: 'Wardens\' Lodge', x: 22, y: 13 }
      ],
      encounters: [
        { terrain: '.', g: [['raven_knight', 2], ['brigand', 4]], w: 3 }, { terrain: '.', g: [['worg', 4]], w: 2 },
        { terrain: 'f', g: [['ogre', 3]], w: 3 }, { terrain: 'f', g: [['werewolf', 2]], w: 2 },
        { terrain: 'h', g: [['ogre', 2], ['bugbear', 3]], w: 3 }, { terrain: 'h', g: [['hill_giant', 1]], w: 2 },
        { terrain: 'w', g: [['lizard_man', 6]], w: 3 }, { terrain: 'w', g: [['troll', 1], ['lizard_man', 3]], w: 2 },
        { terrain: '=', g: [['raven_knight', 3]], w: 2 }, { terrain: '^', g: [['gargoyle', 3]], w: 2 }
      ]
    }
  });

  /* =====================================================================
   * Generated adventures — 10 per band, 5 bands
   * ===================================================================== */
  var SIZES = {
    small: { levels: 2, w: 24, h: 18, wild: [26, 18], mult: 1 },
    medium: { levels: 3, w: 26, h: 20, wild: [30, 20], mult: 1.5 },
    large: { levels: 4, w: 30, h: 22, wild: [34, 24], mult: 2.2 },
    huge: { levels: 6, w: 32, h: 24, wild: [40, 28], mult: 3.5 }
  };
  var BAND_SIZES = ['small', 'small', 'small', 'small', 'medium', 'medium', 'medium', 'large', 'large', 'huge'];
  var THEMES = [
    { name: 'goblin', types: ['goblinoid'], dungeon: ['Warren', 'Burrows', 'Stronghold', 'Caves'], tex: 'cave' },
    { name: 'undead', types: ['undead'], dungeon: ['Crypt', 'Tombs', 'Catacombs', 'Barrow', 'Mausoleum'], tex: 'crypt' },
    { name: 'giant', types: ['giant', 'goblinoid'], dungeon: ['Hall', 'Steading', 'Delve', 'Hold'], tex: 'stone' },
    { name: 'beast', types: ['beast', 'insect', 'lycanthrope'], dungeon: ['Lair', 'Den', 'Hive', 'Grotto'], tex: 'cave' },
    { name: 'deep', types: ['aberration', 'ooze', 'plant', 'insect'], dungeon: ['Depths', 'Underways', 'Abyss', 'Sinkhole'], tex: 'cave' },
    { name: 'fiend', types: ['fiend', 'undead', 'humanoid'], dungeon: ['Temple', 'Sanctum', 'Pit', 'Shrine'], tex: 'tower' },
    { name: 'reptile', types: ['reptile', 'dragon', 'goblinoid'], dungeon: ['Mire', 'Sunken Temple', 'Ziggurat', 'Nest'], tex: 'stone' },
    { name: 'bandit', types: ['humanoid', 'goblinoid'], dungeon: ['Fortress', 'Keep', 'Hideout', 'Ruins'], tex: 'stone' },
    { name: 'arcane', types: ['construct', 'elemental', 'humanoid'], dungeon: ['Tower', 'Laboratory', 'Vaults', 'Observatory'], tex: 'brass' }
  ];
  var ADJ = ['Ashen', 'Black', 'Broken', 'Crimson', 'Drowned', 'Ember', 'Forgotten', 'Frozen', 'Gloaming', 'Hollow', 'Iron', 'Lost', 'Moonless', 'Ruined', 'Shattered', 'Silent', 'Sunken', 'Thorned', 'Twisted', 'Weeping', 'Withered', 'Smouldering', 'Pale', 'Howling', 'Gilded'];
  var NAME_A = ['Vor', 'Mal', 'Kesh', 'Thul', 'Ard', 'Zor', 'Bel', 'Grim', 'Hal', 'Ost', 'Ul', 'Dra', 'Sar', 'Mor', 'Nym', 'Cal', 'Ith', 'Rav', 'Tor', 'Vel'];
  var NAME_B = ['gath', 'dris', 'kar', 'mire', 'oth', 'vane', 'thas', 'dun', 'rak', 'ion', 'mor', 'eth', 'ul', 'asch', 'yr', 'enn', 'grim', 'ox', 'ast', 'ira'];
  var EPITHETS = ['the Cruel', 'the Pale', 'the Hungry', 'the Undying', 'the Cursed', 'Blackheart', 'the Burned', 'the Faceless', 'the Patient', 'Bonegrinder', 'the Mad', 'the Ravenous', 'Ironhide', 'the Shrouded', 'the Ancient'];
  var GIVER_TITLES = ['Mayor', 'Reeve', 'Abbess', 'Captain', 'Magistrate', 'Lord', 'Lady', 'Elder', 'Guildmaster', 'High Priest'];
  var RELICS = ['Chalice', 'Reliquary', 'Banner', 'Idol', 'Seal', 'Censer', 'Orb', 'Codex', 'Circlet', 'Horn', 'Mirror', 'Sceptre'];

  function properName(rng) { return rng.pick(NAME_A) + rng.pick(NAME_B); }

  function makeGenerated(band, idx) {
    var id = 'G' + band + '-' + (idx < 9 ? '0' : '') + (idx + 1);
    var size = BAND_SIZES[idx], sz = SIZES[size];
    var meta = Modules.stream(id, 'meta');
    var theme = THEMES[meta.int(0, THEMES.length - 1)];
    var place = properName(meta);
    var dname = meta.pick(theme.dungeon);
    var name = (meta() < 0.5 ? 'The ' + meta.pick(ADJ) + ' ' + dname + ' of ' + place : 'The ' + dname + ' of the ' + meta.pick(ADJ) + ' ' + meta.pick(['King', 'Queen', 'Prince', 'Lord', 'Witch', 'Wyrm', 'Saint', 'Oracle', 'Hound', 'Tyrant']));
    var townName = Wilds.placeName(meta);
    var giver = meta.pick(GIVER_TITLES) + ' ' + meta.pick(Data.NAMES.m.concat(Data.NAMES.f));
    var relicName = 'The ' + meta.pick(ADJ) + ' ' + meta.pick(RELICS);
    var relicId = 'relic_' + id.replace('-', '_');
    Data.addItem({ id: relicId, name: relicName, type: 'quest', value: 0, weight: 1, desc: 'A sacred relic stolen from ' + townName + '.' });
    var bossName = properName(meta) + ' ' + meta.pick(EPITHETS);
    var ltName = properName(meta) + ' ' + meta.pick(EPITHETS);
    var minL = (band - 1) * 4 + 1, maxL = band * 4;
    var gpMul = band * band * sz.mult;
    var adv = {
      id: id, name: name, band: band, levels: minL + '–' + maxL, size: size, generated: true, theme: theme.name,
      blurb: 'A ' + size + ' adventure for characters of level ' + minL + ' to ' + maxL + '. ' + giver + ' of ' + townName + ' seeks heroes to face ' + bossName + ' in the ' + dname.toLowerCase() + ' of ' + place + '.',
      giver: giver,
      intro: giver + ' greets you gravely. "' + bossName + ' has made the ' + dname.toLowerCase() + ' of ' + place + ' a den of horrors, and ' + townName + ' lives in fear. They have stolen ' + relicName.toLowerCase() + ' from our shrine, and their lieutenant, ' + ltName + ', raids our roads. Will you help us?"',
      quests: [
        { id: 'q_' + id + '_main', title: 'Slay ' + bossName, main: true, text: 'Find ' + bossName + ' in the deepest level of the ' + dname.toLowerCase() + ' and destroy them.', goal: { flag: id + '_boss' }, reward: { gp: Math.round(300 * gpMul), xp: Math.round(2500 * gpMul) } },
        { id: 'q_' + id + '_relic', title: 'Recover ' + relicName, text: 'Bring ' + relicName.toLowerCase() + ' back to ' + townName + '.', goal: { item: relicId }, reward: { gp: Math.round(150 * gpMul), xp: Math.round(1000 * gpMul) } },
        { id: 'q_' + id + '_lt', title: 'The Lieutenant', text: 'Defeat ' + ltName + ', who leads the raids from the upper halls.', goal: { flag: id + '_lt' }, reward: { gp: Math.round(120 * gpMul), xp: Math.round(800 * gpMul) } }
      ],
      rumours: [],
      start: { map: 'town', x: 1, y: 8, dir: 1 },
      maps: {}, wild: null, wander: [],
      _gen: { theme: theme, place: place, dname: dname, townName: townName, relicId: relicId, bossName: bossName, ltName: ltName, sz: sz },
      build: function () { buildGenerated(this); }
    };
    if (sz.levels >= 4) adv.quests.push({ id: 'q_' + id + '_rescue', title: 'The Captives', text: 'Folk from ' + townName + ' are held captive somewhere in the ' + dname.toLowerCase() + '. Free them.', goal: { flag: id + '_rescue' }, reward: { gp: Math.round(100 * gpMul), xp: Math.round(700 * gpMul) } });
    var rr = Modules.stream(id, 'rumours');
    adv.rumours = [
      bossName + ' is said to lair in the deepest part of the ' + dname.toLowerCase() + '.',
      ltName + ' commands the upper levels and hoards stolen goods.',
      'The ' + dname.toLowerCase() + ' is riddled with hidden alcoves. Search the walls.',
      'Traps guard the halls of ' + place + '. A good thief is worth their weight in gold.',
      rr.pick(['Travellers report strange lights on the hills at night.', 'A hermit near the forest knows healing herbs.', 'The old shrines in the wilds still grant blessings to the faithful.', 'Merchants have stopped using the north road.']),
      'Some say ' + relicName.toLowerCase() + ' was carried below by ' + bossName + '\'s servants.'
    ];
    Modules.register(adv);
  }

  /* ---------- dungeon level generator ---------- */
  function genLevel(adv, li, nLevels, W, H) {
    var g = adv._gen, id = adv.id;
    var rng = Modules.stream(id, 'layout' + li);
    var grid = [], x, y, i;
    for (y = 0; y < H; y++) { grid.push([]); for (x = 0; x < W; x++) grid[y].push('#'); }
    var rooms = [];
    for (var tries = 0; tries < 400 && rooms.length < 14; tries++) {
      var rw = rng.int(3, 7), rh = rng.int(3, 5);
      var rx = rng.int(1, W - rw - 1), ry = rng.int(1, H - rh - 1);
      var ok = true;
      for (i = 0; i < rooms.length; i++) {
        var o = rooms[i];
        if (rx - 2 < o.x + o.w && rx + rw + 2 > o.x && ry - 2 < o.y + o.h && ry + rh + 2 > o.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }
    rooms.forEach(function (r) { for (var yy = r.y; yy < r.y + r.h; yy++) for (var xx = r.x; xx < r.x + r.w; xx++) grid[yy][xx] = '.'; });
    // minimum spanning tree over room centres plus a few loops
    var inTree = [0], edges = [];
    while (inTree.length < rooms.length) {
      var best = null;
      for (var a = 0; a < inTree.length; a++) for (var b = 0; b < rooms.length; b++) {
        if (inTree.indexOf(b) >= 0) continue;
        var ra = rooms[inTree[a]], rb = rooms[b], d = Math.abs(ra.cx - rb.cx) + Math.abs(ra.cy - rb.cy);
        if (!best || d < best[2]) best = [inTree[a], b, d];
      }
      edges.push(best); inTree.push(best[1]);
    }
    var extra = Math.max(1, Math.floor(rooms.length / 4));
    for (i = 0; i < extra; i++) { var e1 = rng.int(0, rooms.length - 1), e2 = rng.int(0, rooms.length - 1); if (e1 !== e2) edges.push([e1, e2, 0]); }
    var corridor = {};
    edges.forEach(function (e) {
      var r1 = rooms[e[0]], r2 = rooms[e[1]], cx = r1.cx, cy = r1.cy;
      var horizFirst = rng() < 0.5;
      var carve = function (xx, yy) { if (grid[yy][xx] === '#') { grid[yy][xx] = '.'; corridor[yy * W + xx] = 1; } };
      if (horizFirst) {
        while (cx !== r2.cx) { cx += cx < r2.cx ? 1 : -1; carve(cx, cy); }
        while (cy !== r2.cy) { cy += cy < r2.cy ? 1 : -1; carve(cx, cy); }
      } else {
        while (cy !== r2.cy) { cy += cy < r2.cy ? 1 : -1; carve(cx, cy); }
        while (cx !== r2.cx) { cx += cx < r2.cx ? 1 : -1; carve(cx, cy); }
      }
    });
    // doors where corridors meet a room edge
    var roomAt = function (xx, yy) { for (var k = 0; k < rooms.length; k++) { var r = rooms[k]; if (xx >= r.x && xx < r.x + r.w && yy >= r.y && yy < r.y + r.h) return k; } return -1; };
    var doorRng = Modules.stream(id, 'doors' + li);
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      if (!corridor[y * W + x]) continue;
      var ns = grid[y - 1][x] !== '#' && grid[y + 1][x] !== '#' && grid[y][x - 1] === '#' && grid[y][x + 1] === '#';
      var ew = grid[y][x - 1] !== '#' && grid[y][x + 1] !== '#' && grid[y - 1][x] === '#' && grid[y + 1][x] === '#';
      if (!ns && !ew) continue;
      var touchesRoom = ns ? (roomAt(x, y - 1) >= 0 || roomAt(x, y + 1) >= 0) : (roomAt(x - 1, y) >= 0 || roomAt(x + 1, y) >= 0);
      if (!touchesRoom) continue;
      // avoid doors next to other doors
      if (grid[y - 1][x] === '+' || grid[y + 1][x] === '+' || grid[y][x - 1] === '+' || grid[y][x + 1] === '+') continue;
      if (doorRng() < 0.7) grid[y][x] = doorRng() < 0.12 ? '=' : '+';
    }
    // stairs: up in the first room, down in the farthest room
    var first = rooms[0];
    var dist = function (r) { return Math.abs(r.cx - first.cx) + Math.abs(r.cy - first.cy); };
    var far = rooms.slice(1).sort(function (p, q) { return dist(q) - dist(p); })[0] || rooms[0];
    grid[first.cy][first.cx] = '<';
    var isLast = li === nLevels - 1;
    if (!isLast) grid[far.cy][far.cx] = '>';
    var feats = [];
    var used = {};
    used[first.cy * W + first.cx] = 1; used[far.cy * W + far.cx] = 1;
    // a wilderness exit on the second level of large adventures
    var exitAt = null;
    if (li === 1 && nLevels >= 4) {
      var er = rooms[1] || first;
      var ex = er.x, ey = er.y + er.h - 1;
      if (!used[ey * W + ex] && grid[ey][ex] === '.') { grid[ey][ex] = 'X'; used[ey * W + ex] = 1; exitAt = { x: ex, y: ey }; }
    }
    var freeCellIn = function (r, frng) {
      for (var t = 0; t < 30; t++) {
        var fx = frng.int(r.x, r.x + r.w - 1), fy = frng.int(r.y, r.y + r.h - 1);
        if (grid[fy][fx] === '.' && !used[fy * W + fx]) { used[fy * W + fx] = 1; return { x: fx, y: fy }; }
      }
      return null;
    };
    // monsters
    var mrng = Modules.stream(id, 'monsters' + li);
    var dl = (adv.band - 1) * 4 + 1 + Math.floor(li * 4 / nLevels);
    var pool = monsterPool(adv.band, dl, g.theme.types);
    var groupRooms = rooms.slice(1);
    mrng.shuffle(groupRooms);
    var nGroups = Math.min(groupRooms.length, 4 + Math.floor(rooms.length * 0.5));
    for (i = 0; i < nGroups; i++) {
      var room = groupRooms[i], cell = freeCellIn(room, mrng);
      if (!cell) continue;
      var m = mrng.pick(pool);
      var grp = [[m.id, Wilds.groupSize(m, adv.band, mrng)]];
      if (mrng() < 0.35) { var m2 = mrng.pick(pool); if (m2.id !== m.id) grp.push([m2.id, Math.max(1, Math.round(Wilds.groupSize(m2, adv.band, mrng) / 2))]); grp[0][1] = Math.max(1, Math.round(grp[0][1] * 0.6)); }
      var mode = m.ambush ? 'ambush' : mrng() < 0.65 ? 'guard' : 'hunt';
      feats.push({ t: 'mon', x: cell.x, y: cell.y, g: grp, mode: mode, tt: mrng() < 0.4 ? (m.tt || 'C') : '' });
    }
    // lieutenant on level 0 (or 1), relic on a middle level, boss on the last
    var qrng = Modules.stream(id, 'quests' + li);
    var strong = pool.slice().sort(function (p, q) { return Monsters.power(q) - Monsters.power(p); });
    if (li === (nLevels >= 3 ? 1 : 0)) {
      var lc = freeCellNear(grid, W, H, far, used);
      var lm = strong[Math.min(strong.length - 1, qrng.int(0, 2))];
      if (lc) feats.push({ t: 'mon', x: lc.x, y: lc.y, g: [[lm.id, 1, { name: g.ltName, hpMul: 1.6 }], [qrng.pick(pool).id, Math.max(2, Wilds.groupSize(lm, adv.band, qrng) - 1)]], mode: 'guard', flag: id + '_lt', tt: lm.tt || 'C', name: g.ltName, talk: g.ltName + ' sneers at you. "' + g.townName + ' sends children now? Kill them."' });
    }
    if (li === Math.floor((nLevels - 1) / 2)) {
      var rrm = rooms[qrng.int(1, rooms.length - 1)] || first, rc = freeCellIn(rrm, qrng);
      if (rc) feats.push({ t: 'event', x: rc.x, y: rc.y, title: 'A Stolen Relic', text: 'Among heaps of plunder you find ' + Data.items[g.relicId].name.toLowerCase() + ', the relic stolen from ' + g.townName + '.', give: [g.relicId] });
    }
    if (nLevels >= 4 && li === nLevels - 2) {
      var prm = rooms[qrng.int(1, rooms.length - 1)] || first, pc = freeCellIn(prm, qrng);
      if (pc) feats.push({ t: 'event', x: pc.x, y: pc.y, title: 'Captives', text: 'Chained in the dark are villagers from ' + g.townName + '. You free them and point them toward the surface.', flag: id + '_rescue', xp: 50 * adv.band * adv.band });
    }
    if (isLast) {
      var bc = freeCellNear(grid, W, H, far, used) || { x: far.cx, y: far.cy };
      var bm = bossMonster(adv.band, g.theme.types, qrng);
      var guards = [];
      var gm = qrng.pick(pool); guards.push([gm.id, Math.max(2, Wilds.groupSize(gm, adv.band, qrng))]);
      feats.push({ t: 'mon', x: bc.x, y: bc.y, g: [[bm.id, 1, { name: g.bossName, hpMul: 2 }]].concat(guards), mode: 'guard', boss: true, flag: id + '_boss', tt: bm.tt || 'H', name: g.bossName, gp: Math.round(100 * adv.band * adv.band * g.sz.mult), talk: g.bossName + ' rises to face you. "So ' + g.townName + ' found a little courage at last. It will not save them."' });
      used[bc.y * W + bc.x] = 1;
    }
    // chests in rooms
    var trng = Modules.stream(id, 'treasure' + li);
    for (i = 0; i < Math.max(1, Math.floor(rooms.length / 4)); i++) {
      var cr = rooms[trng.int(1, rooms.length - 1)] || first, cc = freeCellIn(cr, trng);
      if (cc) { var cache = Treasure.cache(trng, adv.band); feats.push({ t: 'chest', x: cc.x, y: cc.y, gp: cache.gp, items: cache.items }); }
    }
    // flavour signs
    var srng = Modules.stream(id, 'signs' + li);
    if (srng() < 0.6) {
      var sr = rooms[srng.int(0, rooms.length - 1)], sc = freeCellIn(sr, srng);
      if (sc) feats.push({ t: 'sign', x: sc.x, y: sc.y, text: srng.pick(['Old bones lie scattered here, gnawed clean.', 'Crude glyphs on the wall warn of "the master below".', 'A cold draught whistles from cracks in the stonework.', 'Someone has carved a tally of days into the wall — hundreds of them.', 'A rusted helm sits atop a spear, a grim warning.', 'The air here smells of smoke and old blood.', 'Water drips steadily from the ceiling into a black pool.']) });
    }
    // secret doors and alcoves (separate stream so layouts never shift)
    var secRng = Modules.stream(id, 'secrets' + li);
    var nSec = secRng.int(1, 3), placed = 0;
    var cand = [];
    for (y = 2; y < H - 2; y++) for (x = 2; x < W - 2; x++) if (grid[y][x] === '#') cand.push([x, y]);
    secRng.shuffle(cand);
    for (i = 0; i < cand.length && placed < nSec; i++) {
      var sx = cand[i][0], sy = cand[i][1];
      for (var dd = 0; dd < 4 && placed < nSec; dd++) {
        var fxx = sx - Modules.DX[dd], fyy = sy - Modules.DY[dd];
        if (grid[fyy][fxx] !== '.' || used[fyy * W + fxx]) continue;
        var a1x = sx + Modules.DX[dd], a1y = sy + Modules.DY[dd];
        var a2x = a1x + Modules.DX[dd], a2y = a1y + Modules.DY[dd];
        var deep = secRng() < 0.5;
        var cells = deep ? [[a1x, a1y], [a2x, a2y]] : [[a1x, a1y]];
        var good = cells.every(function (c) { return c[0] > 0 && c[1] > 0 && c[0] < W - 1 && c[1] < H - 1 && grid[c[1]][c[0]] === '#'; });
        if (!good) continue;
        // alcove must be isolated: every neighbour except the secret door and its own cells is wall
        var iso = cells.every(function (c) {
          for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
            var nx = c[0] + ox, ny = c[1] + oy;
            if (nx === sx && ny === sy) continue;
            if (cells.some(function (q) { return q[0] === nx && q[1] === ny; })) continue;
            if (grid[ny] === undefined || grid[ny][nx] === undefined) return false;
            if (grid[ny][nx] !== '#') return false;
          }
          return true;
        });
        // the secret door's sides must be wall (so it reads as a wall)
        var sides = dd % 2 === 0 ? [grid[sy][sx - 1], grid[sy][sx + 1]] : [grid[sy - 1][sx], grid[sy + 1][sx]];
        if (!iso || sides[0] !== '#' || sides[1] !== '#') continue;
        grid[sy][sx] = 'S';
        cells.forEach(function (c) { grid[c[1]][c[0]] = '.'; });
        var last = cells[cells.length - 1];
        var hoard = Treasure.cache(secRng, adv.band);
        feats.push({ t: 'chest', x: last[0], y: last[1], gp: hoard.gp, items: hoard.items, hidden: true });
        used[last[1] * W + last[0]] = 1; used[sy * W + sx] = 1;
        placed++;
      }
    }
    // traps
    var trapRng = Modules.stream(id, 'traps' + li);
    var nTraps = trapRng.int(2, 3), tp = 0, floorCells = [];
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) if (grid[y][x] === '.' && !used[y * W + x]) floorCells.push([x, y]);
    trapRng.shuffle(floorCells);
    for (i = 0; i < floorCells.length && tp < nTraps; i++) {
      var tx = floorCells[i][0], ty = floorCells[i][1];
      // keep traps off cells right beside the arrival stairs
      if (Math.abs(tx - first.cx) + Math.abs(ty - first.cy) < 3) continue;
      feats.push({ t: 'trap', x: tx, y: ty, trap: trapRng.pick(Rules.TRAP_ORDER) });
      used[ty * W + tx] = 1; tp++;
    }
    return {
      def: {
        id: 'd' + (li + 1), name: (li === 0 ? 'The Upper ' : li === nLevels - 1 ? 'The Deepest ' : 'Level ' + (li + 1) + ' of the ') + g.dname,
        type: 'dungeon', theme: g.theme.tex, dl: dl, up: li === 0 ? 'wild' : 'd' + li, down: isLast ? undefined : 'd' + (li + 2),
        grid: grid.map(function (r) { return r.join(''); }), feats: feats
      },
      first: first, exitAt: exitAt
    };
  }
  function freeCellNear(grid, W, H, room, used) {
    for (var r = 0; r < 4; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      var x = room.cx + dx, y = room.cy + dy;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (grid[y][x] === '.' && !used[y * W + x]) { used[y * W + x] = 1; return { x: x, y: y }; }
    }
    return null;
  }
  function monsterPool(band, dl, types) {
    var lo = Math.max(0.5, dl * 0.45), hi = Math.max(2, dl * 1.05 + 1);
    var all = Monsters.list.filter(function (m) { return !Monsters.isUnique(m) && Monsters.inDungeon(m) && m.al.indexOf('G') < 0; });
    var pick = all.filter(function (m) { var p = Monsters.power(m); return p >= lo && p <= hi && types.indexOf(m.type) >= 0; });
    if (pick.length < 4) pick = pick.concat(all.filter(function (m) { var p = Monsters.power(m); return p >= lo && p <= hi; }));
    return pick;
  }
  function bossMonster(band, types, rng) {
    var hi = band * 4 + 3, lo = band * 4 - 2;
    var all = Monsters.list.filter(function (m) { return !Monsters.isUnique(m) && Monsters.inDungeon(m) && m.al.indexOf('G') < 0 && m.type !== 'ooze' && m.type !== 'plant'; });
    var pick = all.filter(function (m) { var p = Monsters.power(m); return p >= lo && p <= hi && types.indexOf(m.type) >= 0; });
    if (!pick.length) pick = all.filter(function (m) { var p = Monsters.power(m); return p >= lo && p <= hi; });
    return rng.pick(pick);
  }

  /* ---------- town generator ---------- */
  var SHOP_LIST = ['inn', 'temple', 'smith', 'magic', 'train', 'hall', 'tavern'];
  var SHOP_NAMES = {
    inn: ['The Sleeping Fox', 'The Golden Goose', 'The Wayfarer\'s Rest', 'The Lamplighter', 'The Red Hart', 'The Three Crowns'],
    temple: ['Temple of the Dawn', 'Shrine of the Healer', 'Chapel of Mercy', 'House of the Sun', 'Sanctuary of Light'],
    smith: ['The Anvil', 'Steel & Sons', 'The Hammer and Tongs', 'Ironworks', 'The Forge'],
    magic: ['The Arcane Emporium', 'The Silver Phial', 'Scrolls and Simples', 'The Wizard\'s Window', 'Potions & Powders'],
    train: ['Hall of Heroes', 'The Proving Grounds', 'Guild of Arms', 'The Training Yard'],
    hall: ['Town Hall', 'The Council House', 'The Guildhall', 'The Manor'],
    tavern: ['The Drunken Dragon', 'The Rusty Nail', 'The Thirsty Troll', 'The Laughing Bard', 'The Black Cat']
  };
  function genTown(adv) {
    var rng = Modules.stream(adv.id, 'town');
    var W = 22, H = 14, grid = [], x, y;
    for (y = 0; y < H; y++) { grid.push([]); for (x = 0; x < W; x++) grid[y].push((x === 0 || y === 0 || x === W - 1 || y === H - 1) ? 'W' : '.'); }
    // three bands of building blocks: rows 1-3 (door row 3), 5-7 (door row 5), 9-11 (door row 11)
    var bands = [[1, 3, 3], [5, 7, 5], [9, 11, 11]];
    var blocks = [];
    bands.forEach(function (b) {
      x = 2;
      while (x < W - 3) {
        var bw = rng.int(3, 5);
        if (x + bw > W - 2) break;
        for (y = b[0]; y <= b[1]; y++) for (var xx = x; xx < x + bw; xx++) grid[y][xx] = '%';
        blocks.push({ x: x, w: bw, doorRow: b[2] });
        x += bw + 1;
      }
    });
    rng.shuffle(blocks);
    var feats = [];
    SHOP_LIST.forEach(function (s, i) {
      var b = blocks[i]; if (!b) return;
      var dx = rng.int(b.x, b.x + b.w - 1);
      feats.push({ t: 'shop', shop: s, x: dx, y: b.doorRow, name: rng.pick(SHOP_NAMES[s]) });
    });
    grid[8][0] = 'X';
    // a few trees along the lower street, never blocking a door or cutting off a stretch of street
    var trees = [];
    for (var t = 0; t < 4; t++) {
      var tx = rng.int(2, W - 3);
      if (grid[12][tx] !== '.' || grid[11][tx] !== '%') continue;
      if (feats.some(function (f) { return f.x === tx && f.y === 11; })) continue;
      if (trees.some(function (o) { return Math.abs(o - tx) < 6; })) continue;
      grid[12][tx] = 'T'; trees.push(tx);
    }
    return { id: 'town', name: adv._gen.townName, type: 'town', theme: 'town', grid: grid.map(function (r) { return r.join(''); }), feats: feats };
  }

  function buildGenerated(adv) {
    if (adv.built) return;
    adv.built = true;
    var g = adv._gen, sz = g.sz;
    adv.maps.town = genTown(adv);
    var firsts = [], exitAt = null;
    for (var li = 0; li < sz.levels; li++) {
      var res = genLevel(adv, li, sz.levels, sz.w, sz.h);
      adv.maps[res.def.id] = res.def;
      firsts.push(res.first);
      if (res.exitAt) exitAt = res.exitAt;
    }
    var dungeons = [{ name: g.dname + ' of ' + g.place, map: 'd1', entry: { x: firsts[0].cx, y: firsts[0].cy, dir: 1 } }];
    if (exitAt) {
      dungeons.push({ name: 'Back Way into the ' + g.dname, map: 'd2', entry: { x: exitAt.x, y: exitAt.y, dir: 0 }, lock: adv.id + '_lt', lockText: 'Collapsed rubble blocks the way. Those who know ' + g.ltName + '\'s raiders say there is a path through — once their leader is dead.' });
    }
    var wildSize = sz.wild;
    var wild = Wilds.generate(adv.id, { w: wildSize[0], h: wildSize[1], band: adv.band, town: { name: g.townName, map: 'town', entry: { x: 1, y: 8, dir: 1 } }, dungeons: dungeons, lairs: sz.levels >= 4 ? 3 : 2 });
    wild.name = 'The Wilds of ' + g.townName;
    wild.encounters = Wilds.buildEncounters(adv.id, adv.band);
    adv.wild = wild;
    var wr = Modules.stream(adv.id, 'wander');
    var pool = monsterPool(adv.band, (adv.band - 1) * 4 + 2, g.theme.types);
    adv.wander = [];
    for (var i = 0; i < 4; i++) { var m = wr.pick(pool); adv.wander.push({ g: [[m.id, Wilds.groupSize(m, adv.band, wr)]] }); }
  }

  for (var band = 1; band <= 5; band++) for (var i = 0; i < 10; i++) makeGenerated(band, i);

  A.bands = function () {
    var out = {};
    Modules.list.forEach(function (a) { (out[a.band] = out[a.band] || []).push(a); });
    return out;
  };
  return A;
})();
