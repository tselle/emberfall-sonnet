/* Emberfall — treasure.js
 * First-edition style treasure: lair and individual treasure types A–Z,
 * gems, jewellery and the magic-item tables, mapped onto the item list. */
var Treasure = (function () {
  'use strict';
  var T = {};

  // [chance%, min, max] — coin amounts in thousands for lair types, units for individual types
  T.TYPES = {
    A: { cp: [25, 1, 6], sp: [30, 1, 6], ep: [35, 1, 6], gp: [40, 1, 10], pp: [25, 1, 4], gems: [60, 4, 40], jewel: [50, 3, 30], magic: [30, 3, 'any'] },
    B: { cp: [50, 1, 8], sp: [25, 1, 6], ep: [25, 1, 4], gp: [25, 1, 3], gems: [30, 1, 8], jewel: [20, 1, 4], magic: [10, 1, 'weaponarmor'] },
    C: { cp: [20, 1, 12], sp: [30, 1, 6], ep: [10, 1, 4], gems: [25, 1, 6], jewel: [20, 1, 3], magic: [10, 2, 'any'] },
    D: { cp: [10, 1, 8], sp: [15, 1, 12], ep: [15, 1, 8], gp: [50, 1, 6], gems: [30, 1, 10], jewel: [25, 1, 6], magic: [15, 2, 'any'], potion: [15, 1, 1] },
    E: { cp: [5, 1, 10], sp: [25, 1, 12], ep: [25, 1, 6], gp: [25, 1, 8], gems: [15, 1, 12], jewel: [10, 1, 8], magic: [25, 3, 'any'], scroll: [25, 1, 1] },
    F: { sp: [10, 1, 20], ep: [15, 1, 12], gp: [40, 1, 10], pp: [35, 1, 5], gems: [20, 3, 30], jewel: [10, 1, 10], magic: [30, 3, 'noweapon'], potion: [30, 1, 1], scroll: [30, 1, 1] },
    G: { gp: [50, 10, 40], pp: [50, 1, 20], gems: [30, 5, 20], jewel: [25, 1, 10], magic: [35, 4, 'any'], scroll: [35, 1, 1] },
    H: { cp: [25, 5, 30], sp: [40, 1, 100], ep: [40, 10, 40], gp: [55, 10, 60], pp: [25, 5, 50], gems: [50, 1, 100], jewel: [50, 10, 40], magic: [15, 4, 'any'], potion: [15, 1, 1], scroll: [15, 1, 1] },
    I: { pp: [30, 3, 18], gems: [55, 2, 20], jewel: [50, 1, 12], magic: [15, 1, 'any'] },
    J: { cp: [100, 3, 24], indiv: true },
    K: { sp: [100, 3, 18], indiv: true },
    L: { ep: [100, 2, 12], indiv: true },
    M: { gp: [100, 2, 8], indiv: true },
    N: { pp: [100, 1, 6], indiv: true },
    O: { cp: [25, 1, 4], sp: [20, 1, 3] },
    P: { sp: [30, 1, 6], ep: [25, 1, 2] },
    Q: { gems: [50, 1, 4] },
    R: { gp: [40, 2, 8], pp: [50, 1, 6], gems: [55, 4, 32], jewel: [45, 1, 12] },
    S: { potion: [40, 2, 8] },
    T: { scroll: [50, 1, 4] },
    U: { gems: [90, 10, 80], jewel: [80, 5, 30], magic: [70, 1, 'nopotion'] },
    V: { magic: [85, 2, 'nopotion'] },
    W: { gp: [60, 5, 30], pp: [15, 1, 8], gems: [60, 10, 80], jewel: [50, 5, 40], magic: [55, 1, 'any'] },
    X: { magic: [60, 1, 'misc'], potion: [60, 1, 1] },
    Y: { gp: [70, 2, 12] },
    Z: { cp: [20, 1, 3], sp: [25, 1, 4], ep: [25, 1, 4], gp: [30, 1, 4], pp: [30, 1, 6], gems: [55, 10, 60], jewel: [50, 5, 30], magic: [50, 3, 'noweapon'] }
  };
  T.COIN_GP = { cp: 1 / 200, sp: 1 / 20, ep: 1 / 2, gp: 1, pp: 5 };
  T.COIN_NAMES = { cp: 'copper', sp: 'silver', ep: 'electrum', gp: 'gold', pp: 'platinum' };
  T.BAND_SCALE = [0, 0.04, 0.12, 0.3, 0.6, 1];

  /* ---------- gems ---------- */
  var GEMS = [
    [25, 10, ['azurite', 'banded agate', 'blue quartz', 'eye agate', 'hematite', 'lapis lazuli', 'malachite', 'moss agate', 'obsidian', 'rhodochrosite', 'tiger eye', 'turquoise']],
    [50, 50, ['bloodstone', 'carnelian', 'chalcedony', 'chrysoprase', 'citrine', 'jasper', 'moonstone', 'onyx', 'rock crystal', 'sardonyx', 'smoky quartz', 'zircon']],
    [70, 100, ['amber', 'alexandrite', 'amethyst', 'chrysoberyl', 'coral', 'garnet', 'jade', 'jet', 'pearl', 'spinel', 'tourmaline']],
    [90, 500, ['aquamarine', 'black pearl', 'peridot', 'topaz', 'violet garnet', 'golden pearl']],
    [99, 1000, ['black opal', 'emerald', 'fire opal', 'opal', 'oriental amethyst', 'oriental topaz', 'sapphire', 'star ruby', 'star sapphire']],
    [100, 5000, ['black sapphire', 'diamond', 'jacinth', 'oriental emerald', 'ruby']]
  ];
  var STEPS = [10, 50, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
  T.rollGem = function (rng) {
    var r = rng.int(1, 100), i = 0;
    while (r > GEMS[i][0]) i++;
    var name = rng.pick(GEMS[i][2]), v = GEMS[i][1];
    var step = STEPS.indexOf(v);
    // 1e variation: a 1 in 10 chance to move up a step, repeatedly
    while (rng.int(1, 10) === 1 && step < STEPS.length - 1) step++;
    v = STEPS[step];
    var adj = rng.int(1, 10);
    if (adj === 2) v = v * 2; else if (adj === 3) v = Math.round(v * (1 + rng.int(1, 6) / 10)); else if (adj === 4) v = Math.round(v * (1 - rng.int(1, 4) / 10));
    return Data.makeItem('gem', { v: Math.max(5, v), n: cap(name) });
  };
  var JEWELS = [
    [10, 100, 1000, ['ivory', 'wrought silver'], ['bracelet', 'comb', 'figurine', 'brooch']],
    [20, 200, 1200, ['wrought silver and gold'], ['armband', 'chain', 'goblet', 'clasp']],
    [40, 300, 1800, ['wrought gold'], ['necklace', 'ring', 'bracelet', 'circlet', 'medallion']],
    [50, 500, 3000, ['ivory and gold', 'jade'], ['statuette', 'pendant', 'chalice', 'idol']],
    [70, 1000, 6000, ['jewelled silver', 'jewelled gold'], ['crown', 'sceptre', 'necklace', 'tiara', 'orb']],
    [90, 2000, 8000, ['jewelled gold'], ['diadem', 'girdle', 'torc', 'collar']],
    [100, 2000, 12000, ['jewelled platinum'], ['crown', 'sceptre', 'ring', 'diadem']]
  ];
  T.rollJewel = function (rng) {
    var r = rng.int(1, 100), i = 0;
    while (r > JEWELS[i][0]) i++;
    var j = JEWELS[i], v = Math.round((j[1] + rng() * (j[2] - j[1])) / 10) * 10;
    return Data.makeItem('jewel', { v: v, n: cap(rng.pick(j[3]) + ' ' + rng.pick(j[4])) });
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- magic item tables ---------- */
  var BAND_MAXV = [0, 3000, 9000, 20000, 40000, 1e9];
  var tables = null;
  function buildTables() {
    tables = { potion: [], scroll: [], ring: [], wand: [], misc: [], armor: [], sword: [], weapon: [] };
    var swords = ['short_sword', 'long_sword', 'broad_sword', 'bastard_sword', 'two_handed_sword', 'scimitar'];
    Data.itemList.forEach(function (it) {
      if (!it.magic) return;
      var cat = null;
      if (it.type === 'potion') cat = 'potion';
      else if (it.type === 'scroll') cat = 'scroll';
      else if (it.type === 'ring') cat = 'ring';
      else if (it.type === 'wand' || /^staff_|^rod_/.test(it.id)) cat = 'wand';
      else if (it.type === 'misc' || it.type === 'book') cat = 'misc';
      else if (it.type === 'armor' || it.type === 'shield') cat = 'armor';
      else if (it.type === 'weapon' && swords.indexOf(it.base) >= 0) cat = 'sword';
      else if (it.type === 'weapon' || it.type === 'ammo') cat = 'weapon';
      if (!cat) return;
      var w = 100 / Math.sqrt(Math.max(100, it.value));
      if (it.type === 'scroll' && it.spell) w *= 1.5 / Rules.SPELLS[it.spell].lvl;
      if (it.id === 'potion_healing' || it.id === 'potion_extra_healing') w *= 4;
      tables[cat].push({ id: it.id, w: w, v: it.value, lvl: it.spell ? Rules.SPELLS[it.spell].lvl : 0 });
    });
  }
  T.rollMagicCategory = function (rng, filter) {
    for (var tries = 0; tries < 50; tries++) {
      var r = rng.int(1, 100), c;
      if (r <= 20) c = 'potion'; else if (r <= 35) c = 'scroll'; else if (r <= 40) c = 'ring'; else if (r <= 45) c = 'wand';
      else if (r <= 60) c = 'misc'; else if (r <= 75) c = 'armor'; else if (r <= 86) c = 'sword'; else c = 'weapon';
      if (filter === 'weaponarmor' && ['armor', 'sword', 'weapon'].indexOf(c) < 0) continue;
      if (filter === 'noweapon' && (c === 'sword' || c === 'weapon')) continue;
      if (filter === 'nopotion' && (c === 'potion' || c === 'scroll')) continue;
      if (filter === 'misc' && c !== 'misc') continue;
      return c;
    }
    return 'potion';
  };
  T.rollMagic = function (rng, band, cat) {
    if (!tables) buildTables();
    var maxV = BAND_MAXV[band || 1];
    var maxSpell = Math.min(9, (band || 1) * 2);
    var list = tables[cat].filter(function (e) { return e.v <= maxV && (!e.lvl || e.lvl <= maxSpell); });
    if (!list.length) list = tables[cat].slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 3);
    var e = rng.weighted(list, 'w');
    return Data.makeItem(e.id);
  };

  /* ---------- rolling a treasure type ---------- */
  // letters: "C" or "J,O"; count: number of creatures for individual types
  T.roll = function (letters, rng, band, count, opts) {
    opts = opts || {};
    band = band || 1;
    var scale = opts.scale != null ? opts.scale : T.BAND_SCALE[band];
    var out = { coins: {}, gp: 0, items: [] };
    (letters || '').split(',').forEach(function (L) {
      L = L.trim(); var t = T.TYPES[L];
      if (!t) return;
      if (t.indiv && opts.lairOnly) return;
      if (!t.indiv && opts.indivOnly) return;
      ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(function (c) {
        if (!t[c]) return;
        if (rng.int(1, 100) > t[c][0]) return;
        var n = rng.int(t[c][1], t[c][2]);
        n = t.indiv ? n * Math.max(1, count || 1) : Math.round(n * 1000 * scale);
        if (n > 0) out.coins[c] = (out.coins[c] || 0) + n;
      });
      var gemScale = t.indiv ? 1 : Math.min(1, Math.max(0.15, scale * 2));
      if (t.gems && rng.int(1, 100) <= t.gems[0]) {
        var ng = Math.max(1, Math.round(rng.int(t.gems[1], t.gems[2]) * gemScale));
        for (var i = 0; i < Math.min(ng, 40); i++) out.items.push(T.rollGem(rng));
      }
      if (t.jewel && rng.int(1, 100) <= t.jewel[0]) {
        var nj = Math.max(1, Math.round(rng.int(t.jewel[1], t.jewel[2]) * gemScale));
        for (var j = 0; j < Math.min(nj, 20); j++) out.items.push(T.rollJewel(rng));
      }
      if (t.magic && rng.int(1, 100) <= t.magic[0]) {
        for (var k = 0; k < t.magic[1]; k++) out.items.push(T.rollMagic(rng, band, T.rollMagicCategory(rng, t.magic[2])));
      }
      if (t.potion && rng.int(1, 100) <= t.potion[0]) {
        var np = rng.int(t.potion[1], t.potion[2]);
        for (var p = 0; p < np; p++) out.items.push(T.rollMagic(rng, band, 'potion'));
      }
      if (t.scroll && rng.int(1, 100) <= t.scroll[0]) {
        var ns = rng.int(t.scroll[1], t.scroll[2]);
        for (var s = 0; s < ns; s++) out.items.push(T.rollMagic(rng, band, 'scroll'));
      }
    });
    var gp = 0;
    Object.keys(out.coins).forEach(function (c) { gp += out.coins[c] * T.COIN_GP[c]; });
    out.gp = Math.floor(gp);
    return out;
  };
  T.coinText = function (coins) {
    var parts = [];
    ['pp', 'gp', 'ep', 'sp', 'cp'].forEach(function (c) { if (coins[c]) parts.push(coins[c].toLocaleString() + ' ' + T.COIN_NAMES[c]); });
    return parts.join(', ');
  };
  // a modest guaranteed hoard used for secret alcoves and chests
  T.cache = function (rng, band) {
    var out = { coins: { gp: Math.round((20 + rng.int(0, 60)) * band * band) }, items: [] };
    out.gp = out.coins.gp;
    if (rng() < 0.7) out.items.push(T.rollMagic(rng, band, T.rollMagicCategory(rng, rng() < 0.5 ? 'any' : 'noweapon')));
    if (rng() < 0.5) out.items.push(T.rollGem(rng));
    if (rng() < 0.4) out.items.push(Data.makeItem(band >= 3 ? 'potion_extra_healing' : 'potion_healing'));
    return out;
  };
  T.tables = function () { if (!tables) buildTables(); return tables; };
  return T;
})();
