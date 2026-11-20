/* Emberfall: The Emberwild Saga — rules.js
 * Second-edition style tabletop rules: abilities, races, classes, THAC0,
 * saving throws, experience, thief skills, spells, turning and traps.
 * Pure data and functions; no DOM access so Node validators can load it. */
var Rules = (function () {
  'use strict';
  var R = {};

  /* ---------- dice ---------- */
  R.rng = Math.random;
  R.d = function (n, rng) { return 1 + Math.floor((rng || R.rng)() * n); };
  R.roll = function (spec, rng) {
    if (typeof spec === 'number') return spec;
    if (!spec) return 0;
    var total = 0, s = String(spec).replace(/\s+/g, '');
    var parts = s.match(/[+-]?[^+-]+/g) || [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], sign = 1;
      if (p[0] === '-') { sign = -1; p = p.slice(1); } else if (p[0] === '+') p = p.slice(1);
      var m = p.match(/^(\d*)d(\d+)(?:x(\d+))?$/);
      if (m) {
        var n = m[1] === '' ? 1 : +m[1], sides = +m[2], sub = 0;
        for (var k = 0; k < n; k++) sub += R.d(sides, rng);
        if (m[3]) sub *= +m[3];
        total += sign * sub;
      } else total += sign * (+p || 0);
    }
    return total;
  };
  R.avg = function (spec) {
    if (typeof spec === 'number') return spec;
    var total = 0, parts = String(spec).replace(/\s+/g, '').match(/[+-]?[^+-]+/g) || [];
    parts.forEach(function (p) {
      var sign = 1;
      if (p[0] === '-') { sign = -1; p = p.slice(1); } else if (p[0] === '+') p = p.slice(1);
      var m = p.match(/^(\d*)d(\d+)(?:x(\d+))?$/);
      if (m) total += sign * (m[1] === '' ? 1 : +m[1]) * (+m[2] + 1) / 2 * (m[3] ? +m[3] : 1);
      else total += sign * (+p || 0);
    });
    return total;
  };
  R.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------- abilities ---------- */
  R.ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  R.ABIL_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

  // strength: [hit, dmg, weight allowance lb, bend bars/open doors %]
  R.strTable = function (str, ex) {
    if (str <= 3) return { hit: -3, dmg: -1, carry: 5, door: 2 };
    if (str <= 5) return { hit: -2, dmg: -1, carry: 10, door: 3 };
    if (str <= 7) return { hit: -1, dmg: 0, carry: 20, door: 4 };
    if (str <= 9) return { hit: 0, dmg: 0, carry: 35, door: 5 };
    if (str <= 11) return { hit: 0, dmg: 0, carry: 40, door: 6 };
    if (str <= 13) return { hit: 0, dmg: 0, carry: 45, door: 7 };
    if (str <= 15) return { hit: 0, dmg: 0, carry: 55, door: 8 };
    if (str === 16) return { hit: 0, dmg: 1, carry: 70, door: 9 };
    if (str === 17) return { hit: 1, dmg: 1, carry: 85, door: 10 };
    if (str === 18) {
      if (!ex) return { hit: 1, dmg: 2, carry: 110, door: 11 };
      if (ex <= 50) return { hit: 1, dmg: 3, carry: 135, door: 12 };
      if (ex <= 75) return { hit: 2, dmg: 3, carry: 160, door: 13 };
      if (ex <= 90) return { hit: 2, dmg: 4, carry: 185, door: 14 };
      if (ex <= 99) return { hit: 2, dmg: 5, carry: 235, door: 15 };
      return { hit: 3, dmg: 6, carry: 335, door: 16 };
    }
    var big = { 19: [3, 7, 485], 20: [3, 8, 535], 21: [4, 9, 635], 22: [4, 10, 785], 23: [5, 11, 935], 24: [6, 12, 1235], 25: [7, 14, 1535] };
    var b = big[Math.min(25, str)];
    return { hit: b[0], dmg: b[1], carry: b[2], door: 18 };
  };
  R.strText = function (str, ex) { return str === 18 && ex ? '18/' + (ex >= 100 ? '00' : (ex < 10 ? '0' + ex : ex)) : '' + str; };
  // dexterity: reaction/missile adj, defensive adj
  R.dexTable = function (dex) {
    var t = { 3: [-3, 4], 4: [-2, 3], 5: [-1, 2], 6: [0, 1], 15: [0, -1], 16: [1, -2], 17: [2, -3], 18: [2, -4], 19: [3, -4], 20: [3, -4], 21: [4, -5], 22: [4, -5], 23: [4, -5], 24: [5, -6], 25: [5, -6] };
    var v = t[dex] || [0, 0];
    return { missile: v[0], react: v[0], ac: v[1] };
  };
  R.conTable = function (con, warrior) {
    var hp = 0;
    if (con <= 3) hp = -2; else if (con <= 6) hp = -1; else if (con <= 14) hp = 0;
    else if (con === 15) hp = 1; else if (con === 16) hp = 2;
    else if (con === 17) hp = warrior ? 3 : 2; else if (con === 18) hp = warrior ? 4 : 2; else hp = warrior ? 5 : 2;
    var shock = [0, 0, 0, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88, 90, 95, 97, 99, 99, 99];
    var surv = [0, 0, 0, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 94, 96, 98, 100, 100, 100];
    return { hp: hp, shock: shock[Math.min(20, con)], survive: surv[Math.min(20, con)] };
  };
  R.intTable = function (int) {
    if (int <= 8) return { maxLvl: 0, learn: 0 };
    var t = { 9: [4, 35], 10: [5, 40], 11: [5, 45], 12: [6, 50], 13: [6, 55], 14: [7, 60], 15: [7, 65], 16: [8, 70], 17: [8, 75], 18: [9, 85] };
    var v = t[int] || [9, 95];
    return { maxLvl: v[0], learn: v[1] };
  };
  R.wisTable = function (wis) {
    var mag = wis <= 3 ? -3 : wis === 4 ? -2 : wis <= 7 ? -1 : wis <= 14 ? 0 : wis - 14;
    if (mag > 4) mag = 4;
    var bonus = [0, 0, 0, 0, 0, 0, 0];
    if (wis >= 13) bonus[0] += 1; if (wis >= 14) bonus[0] += 1;
    if (wis >= 15) bonus[1] += 1; if (wis >= 16) bonus[1] += 1;
    if (wis >= 17) bonus[2] += 1; if (wis >= 18) bonus[3] += 1;
    if (wis >= 19) { bonus[0] += 1; bonus[3] += 1; }
    var fail = wis <= 8 ? 30 : wis === 9 ? 20 : wis === 10 ? 15 : wis === 11 ? 10 : wis === 12 ? 5 : 0;
    return { magDef: mag, bonus: bonus, fail: fail };
  };
  R.chaTable = function (cha) {
    // price multiplier for shops
    var t = { 3: 1.3, 4: 1.25, 5: 1.2, 6: 1.15, 7: 1.1, 8: 1.05, 13: 0.97, 14: 0.95, 15: 0.92, 16: 0.9, 17: 0.85, 18: 0.8 };
    return { price: t[cha] || (cha > 18 ? 0.75 : 1) };
  };

  /* ---------- alignments ---------- */
  R.ALIGNS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE'];
  R.ALIGN_NAMES = { LG: 'Lawful Good', NG: 'Neutral Good', CG: 'Chaotic Good', LN: 'Lawful Neutral', N: 'True Neutral', CN: 'Chaotic Neutral', LE: 'Lawful Evil', NE: 'Neutral Evil', CE: 'Chaotic Evil' };
  R.PLAYER_ALIGNS = ['LG', 'NG', 'CG', 'LN', 'N', 'CN'];

  /* ---------- races ---------- */
  R.RACES = {
    human: { name: 'Human', adj: {}, min: {}, max: {}, classes: { fighter: 20, paladin: 20, ranger: 20, mage: 20, cleric: 20, thief: 20 }, move: 12, infra: 0, search: 1 / 6, listen: 15, desc: 'Adaptable and ambitious, humans may follow any calling and rise without limit.' },
    dwarf: { name: 'Dwarf', adj: { con: 1, cha: -1 }, min: { str: 8, con: 11 }, max: { dex: 17, cha: 17 }, classes: { fighter: 15, cleric: 10, thief: 12 }, move: 10, infra: 60, search: 1 / 3, listen: 15, saveCon: true, thief: { pp: 0, ol: 10, rt: 15, ms: 0, hs: 0, hn: 0, cw: -10, rl: -5 }, desc: 'Stout folk of the deep halls. Hardy against magic and poison, and keen-eyed for hidden stonework.' },
    elf: { name: 'Elf', adj: { dex: 1, con: -1 }, min: { dex: 6, con: 7, int: 8, cha: 8 }, max: {}, classes: { fighter: 12, ranger: 15, mage: 15, cleric: 12, thief: 12 }, move: 10, infra: 60, search: 1 / 3, listen: 20, sleepRes: 90, bonusWeapons: ['long_sword', 'short_sword', 'short_bow', 'long_bow'], thief: { pp: 5, ol: -5, rt: 0, ms: 5, hs: 10, hn: 5, cw: 0, rl: 0 }, desc: 'Long-lived wardens of the old forests. Resistant to sleep and charm; deadly with sword and bow.' },
    gnome: { name: 'Gnome', adj: { int: 1, wis: -1 }, min: { str: 6, con: 8, int: 6 }, max: {}, classes: { fighter: 11, cleric: 9, thief: 13 }, move: 10, infra: 60, search: 1 / 4, listen: 20, saveCon: true, thief: { pp: 0, ol: 5, rt: 10, ms: 5, hs: 5, hn: 10, cw: -15, rl: 0 }, desc: 'Clever burrow-dwellers with a gift for tinkering. Resist magic like their dwarven cousins.' },
    halfelf: { name: 'Half-Elf', adj: {}, min: { dex: 6, con: 6, int: 4 }, max: {}, classes: { fighter: 14, ranger: 16, mage: 12, cleric: 14, thief: 12 }, move: 10, infra: 60, search: 1 / 4, listen: 15, sleepRes: 30, thief: { pp: 10, ol: 0, rt: 0, ms: 0, hs: 5, hn: 0, cw: 0, rl: 0 }, desc: 'Children of two peoples, welcome in both. Partly resistant to sleep and charm.' },
    halfling: { name: 'Halfling', adj: { dex: 1, str: -1 }, min: { str: 7, dex: 7, con: 10, int: 6 }, max: { str: 17 }, classes: { fighter: 9, cleric: 8, thief: 15 }, move: 10, infra: 30, search: 1 / 6, listen: 20, saveCon: true, bonusWeapons: ['sling', 'dart', 'dagger', 'hand_axe', 'javelin'], thief: { pp: 5, ol: 5, rt: 5, ms: 10, hs: 15, hn: 5, cw: -15, rl: -5 }, desc: 'Small, cheerful and quick. Superb with sling and thrown weapons and hard to catch unawares.' }
  };
  R.RACE_ORDER = ['human', 'dwarf', 'elf', 'gnome', 'halfelf', 'halfling'];

  /* ---------- classes ---------- */
  R.CLASSES = {
    fighter: { name: 'Fighter', group: 'warrior', hd: 10, hdMax: 9, hpAfter: 3, req: { str: 9 }, prime: ['str'], align: null, xp: [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 750000], xpStep: 250000, desc: 'Masters of arms. Only fighters may specialize in a weapon, gaining extra attacks and damage.' },
    paladin: { name: 'Paladin', group: 'warrior', hd: 10, hdMax: 9, hpAfter: 3, req: { str: 12, con: 9, wis: 13, cha: 17 }, prime: ['str', 'cha'], align: ['LG'], races: ['human'], xp: [0, 2250, 4500, 9000, 18000, 36000, 75000, 150000, 300000, 600000, 900000], xpStep: 300000, desc: 'Holy knights. Strike often and hard against evil, heal by touch, turn undead and resist all magic.' },
    ranger: { name: 'Ranger', group: 'warrior', hd: 10, hdMax: 9, hpAfter: 3, req: { str: 13, dex: 13, con: 14, wis: 14 }, prime: ['str', 'dex', 'wis'], align: ['LG', 'NG', 'CG'], xp: [0, 2250, 4500, 9000, 18000, 36000, 75000, 150000, 300000, 600000, 900000], xpStep: 300000, desc: 'Wilderness hunters. Fight with two weapons and are deadly against giant-kin and goblin-kin.' },
    mage: { name: 'Mage', group: 'wizard', hd: 4, hdMax: 10, hpAfter: 1, req: { int: 9 }, prime: ['int'], align: null, xp: [0, 2500, 5000, 10000, 20000, 40000, 60000, 90000, 135000, 250000, 375000, 750000, 1125000, 1500000, 1875000, 2250000, 2625000, 3000000, 3375000, 3750000], xpStep: 375000, desc: 'Scholars of arcane power. Frail in body but wield the mightiest spells, learned from scrolls.' },
    cleric: { name: 'Cleric', group: 'priest', hd: 8, hdMax: 9, hpAfter: 2, req: { wis: 9 }, prime: ['wis'], align: null, xp: [0, 1500, 3000, 6000, 13000, 27500, 55000, 110000, 225000, 450000, 675000], xpStep: 225000, desc: 'Servants of the gods. Heal, protect and turn undead; wield only blunt weapons.' },
    thief: { name: 'Thief', group: 'rogue', hd: 6, hdMax: 10, hpAfter: 2, req: { dex: 9 }, prime: ['dex'], align: ['NG', 'CG', 'LN', 'N', 'CN'], xp: [0, 1250, 2500, 5000, 10000, 20000, 40000, 70000, 110000, 160000, 220000], xpStep: 220000, desc: 'Nimble and sly. Pick locks, find and disarm traps, move unseen and backstab for great damage.' }
  };
  R.CLASS_ORDER = ['fighter', 'paladin', 'ranger', 'mage', 'cleric', 'thief'];
  R.MAX_LEVEL = 20;

  R.xpFor = function (cls, lvl) {
    var c = R.CLASSES[cls];
    if (lvl <= 1) return 0;
    if (lvl - 1 < c.xp.length) return c.xp[lvl - 1];
    return c.xp[c.xp.length - 1] + (lvl - c.xp.length) * c.xpStep;
  };
  R.levelForXp = function (cls, xp) {
    var l = 1;
    while (l < R.MAX_LEVEL && xp >= R.xpFor(cls, l + 1)) l++;
    return l;
  };
  R.primeBonus = function (pc) {
    var c = R.CLASSES[pc.cls];
    for (var i = 0; i < c.prime.length; i++) if (pc.ab[c.prime[i]] < 16) return 0;
    return 0.1;
  };
  R.raceMaxLevel = function (race, cls) {
    var r = R.RACES[race];
    return r.classes[cls] || 0;
  };
  R.allowedClasses = function (race) {
    return R.CLASS_ORDER.filter(function (c) {
      var cd = R.CLASSES[c];
      if (cd.races && cd.races.indexOf(race) < 0) return false;
      return !!R.RACES[race].classes[c];
    });
  };
  R.allowedAligns = function (cls) { return (R.CLASSES[cls].align || R.PLAYER_ALIGNS).slice(); };
  R.meetsReq = function (cls, ab) {
    var req = R.CLASSES[cls].req;
    for (var k in req) if ((ab[k] || 0) < req[k]) return false;
    return true;
  };

  /* ---------- THAC0 and saves ---------- */
  R.thac0 = function (cls, lvl) {
    var g = R.CLASSES[cls].group;
    if (g === 'warrior') return Math.max(1, 21 - lvl);
    if (g === 'priest') return 20 - Math.floor((lvl - 1) / 3) * 2;
    if (g === 'rogue') return 20 - Math.floor((lvl - 1) / 2);
    return 20 - Math.floor((lvl - 1) / 3);
  };
  R.SAVE_NAMES = ['Paralysis, Poison, Death', 'Rod, Staff, Wand', 'Petrification, Polymorph', 'Breath Weapon', 'Spell'];
  R.SAVE_SHORT = ['PPD', 'RSW', 'P/P', 'BRE', 'SPL'];
  R.SAVE_IDX = { ppd: 0, rsw: 1, pp: 2, bw: 3, sp: 4 };
  var SAVES = {
    warrior: [[0, [16, 18, 17, 20, 19]], [1, [14, 16, 15, 17, 17]], [3, [13, 15, 14, 16, 16]], [5, [11, 13, 12, 13, 14]], [7, [10, 12, 11, 12, 13]], [9, [8, 10, 9, 9, 11]], [11, [7, 9, 8, 8, 10]], [13, [5, 7, 6, 5, 8]], [15, [4, 6, 5, 4, 7]], [17, [3, 5, 4, 4, 6]]],
    priest: [[1, [10, 14, 13, 16, 15]], [4, [9, 13, 12, 15, 14]], [7, [7, 11, 10, 13, 12]], [10, [6, 10, 9, 12, 11]], [13, [5, 9, 8, 11, 10]], [16, [4, 8, 7, 10, 9]], [19, [2, 6, 5, 8, 7]]],
    rogue: [[1, [13, 14, 12, 16, 15]], [5, [12, 12, 11, 15, 13]], [9, [11, 10, 10, 14, 11]], [13, [10, 8, 9, 13, 9]], [17, [9, 6, 8, 12, 7]], [21, [8, 4, 7, 11, 5]]],
    wizard: [[1, [14, 11, 13, 15, 12]], [6, [13, 9, 11, 13, 10]], [11, [11, 7, 9, 11, 8]], [16, [10, 5, 7, 9, 6]], [21, [8, 3, 5, 7, 4]]]
  };
  R.baseSaves = function (group, lvl) {
    var t = SAVES[group], row = t[0][1];
    for (var i = 0; i < t.length; i++) if (lvl >= t[i][0]) row = t[i][1];
    return row.slice();
  };

  /* ---------- attacks per round ---------- */
  // returned as attacks per two rounds (2 = 1/1, 3 = 3/2, 4 = 2/1, 5 = 5/2)
  R.meleeRate = function (pc) {
    var g = R.CLASSES[pc.cls].group, l = pc.lvl;
    if (g !== 'warrior') return 2;
    // specialists, and paladins (holy fervour), strike more often
    if ((pc.cls === 'fighter' && pc.spec) || pc.cls === 'paladin') return l >= 13 ? 5 : l >= 7 ? 4 : 3;
    return l >= 13 ? 4 : l >= 7 ? 3 : 2;
  };
  R.rateText = function (r) { return r === 2 ? '1' : r === 3 ? '3/2' : r === 4 ? '2' : r === 5 ? '5/2' : r === 6 ? '3' : (r / 2) + ''; };

  /* ---------- thief skills ---------- */
  R.THIEF_SKILLS = ['pp', 'ol', 'rt', 'ms', 'hs', 'hn', 'cw', 'rl'];
  R.THIEF_NAMES = { pp: 'Pick Pockets', ol: 'Open Locks', rt: 'Find/Remove Traps', ms: 'Move Silently', hs: 'Hide in Shadows', hn: 'Hear Noise', cw: 'Climb Walls', rl: 'Read Languages' };
  R.THIEF_BASE = { pp: 15, ol: 10, rt: 5, ms: 10, hs: 5, hn: 15, cw: 60, rl: 0 };
  // priority used when auto-allocating discretionary points
  var THIEF_PRIO = ['rt', 'ol', 'ms', 'hs', 'hn', 'pp', 'cw', 'rl'];
  R.thiefPoints = function (lvl) { return 60 + 30 * (lvl - 1); };
  R.allocThief = function (pc) {
    var pts = {}, total = R.thiefPoints(pc.lvl), i, k;
    R.THIEF_SKILLS.forEach(function (s) { pts[s] = 0; });
    // cap 30 per skill per level-up batch, max 95 total skill
    var base = R.thiefSkillsRaw(pc, pts);
    var guard = 0;
    while (total > 0 && guard++ < 1000) {
      var spent = false;
      for (i = 0; i < THIEF_PRIO.length && total > 0; i++) {
        k = THIEF_PRIO[i];
        var weightCap = { rt: 0.9, ol: 0.85, ms: 0.85, hs: 0.8, hn: 0.6, pp: 0.5, cw: 0.97, rl: 0.6 }[k] * 100;
        if (base[k] + pts[k] < weightCap) { var add = Math.min(5, total); pts[k] += add; total -= add; spent = true; }
      }
      if (!spent) break;
    }
    if (total > 0) pts.cw += total;
    pc.thief = pts;
  };
  R.thiefSkillsRaw = function (pc, pts) {
    var r = R.RACES[pc.race].thief || {}, dex = pc.ab.dex, out = {};
    var dexAdj = {
      9: { pp: -15, ol: -10, rt: -10, ms: -20, hs: -10 }, 10: { pp: -10, ol: -5, rt: -10, ms: -15, hs: -5 }, 11: { pp: -5, ol: 0, rt: -5, ms: -10, hs: 0 },
      12: { ms: -5 }, 16: { ol: 5 }, 17: { pp: 5, ol: 10, ms: 5, hs: 5 }, 18: { pp: 10, ol: 15, rt: 5, ms: 10, hs: 10 }, 19: { pp: 15, ol: 20, rt: 10, ms: 15, hs: 15 }
    }[Math.min(19, Math.max(9, dex))] || {};
    R.THIEF_SKILLS.forEach(function (s) {
      out[s] = R.THIEF_BASE[s] + (r[s] || 0) + (dexAdj[s] || 0) + ((pts && pts[s]) || 0);
    });
    return out;
  };
  R.thiefSkills = function (pc) {
    if (pc.cls !== 'thief') return null;
    var raw = R.thiefSkillsRaw(pc, pc.thief || {});
    R.THIEF_SKILLS.forEach(function (s) { raw[s] = R.clamp(raw[s], 1, 95); if (s === 'cw') raw[s] = R.clamp(raw[s], 1, 99); });
    return raw;
  };
  R.backstabMult = function (lvl) { return lvl >= 13 ? 5 : lvl >= 9 ? 4 : lvl >= 5 ? 3 : 2; };

  /* ---------- spell slots ---------- */
  var WIZ_SLOTS = [
    [1], [2], [2, 1], [3, 2], [4, 2, 1], [4, 2, 2], [4, 3, 2, 1], [4, 3, 3, 2], [4, 3, 3, 2, 1], [4, 4, 3, 2, 2],
    [4, 4, 4, 3, 3], [4, 4, 4, 4, 4, 1], [5, 5, 5, 4, 4, 2], [5, 5, 5, 4, 4, 2, 1], [5, 5, 5, 5, 5, 2, 1], [5, 5, 5, 5, 5, 3, 2, 1],
    [5, 5, 5, 5, 5, 3, 3, 2], [5, 5, 5, 5, 5, 3, 3, 2, 1], [5, 5, 5, 5, 5, 3, 3, 3, 1], [5, 5, 5, 5, 5, 4, 3, 3, 2]];
  var PRI_SLOTS = [
    [1], [2], [2, 1], [3, 2], [3, 3, 1], [3, 3, 2], [3, 3, 2, 1], [3, 3, 3, 2], [4, 4, 3, 2, 1], [4, 4, 3, 3, 2],
    [5, 4, 4, 3, 2, 1], [6, 5, 5, 3, 2, 2], [6, 6, 6, 4, 2, 2], [6, 6, 6, 5, 3, 2, 1], [6, 6, 6, 6, 4, 2, 1], [7, 7, 7, 6, 4, 3, 1],
    [7, 7, 7, 7, 5, 3, 2], [8, 8, 8, 8, 6, 4, 2], [9, 9, 8, 8, 6, 4, 2], [9, 9, 9, 8, 7, 5, 2]];
  var PAL_SLOTS = { 9: [1], 10: [2], 11: [2, 1], 12: [2, 2], 13: [2, 2, 1], 14: [3, 2, 1], 15: [3, 2, 1, 1], 16: [3, 3, 1, 1], 17: [3, 3, 2, 1], 18: [3, 3, 3, 1], 19: [3, 3, 3, 2], 20: [3, 3, 3, 3] };
  var RAN_SLOTS = { 8: [1], 9: [2], 10: [2, 1], 11: [2, 2], 12: [2, 2, 1], 13: [3, 2, 1], 14: [3, 2, 2], 15: [3, 3, 2], 16: [3, 3, 3], 17: [3, 3, 3], 18: [3, 3, 3], 19: [3, 3, 3], 20: [3, 3, 3] };
  R.casterType = function (cls) { return cls === 'mage' ? 'wiz' : (cls === 'cleric' || cls === 'paladin' || cls === 'ranger') ? 'pri' : null; };
  R.spellSlots = function (pc) {
    var l = pc.lvl, s = [];
    if (pc.cls === 'mage') {
      s = (WIZ_SLOTS[l - 1] || []).slice();
      var maxL = R.intTable(pc.ab.int).maxLvl;
      s = s.slice(0, maxL);
      if (pc.ringWizardry) { if (s[0]) s[0] *= 2; if (s[1]) s[1] *= 2; }
    } else if (pc.cls === 'cleric') {
      s = (PRI_SLOTS[l - 1] || []).slice();
      var b = R.wisTable(pc.ab.wis).bonus;
      for (var i = 0; i < s.length; i++) s[i] += b[i] || 0;
    } else if (pc.cls === 'paladin') s = (PAL_SLOTS[l] || []).slice();
    else if (pc.cls === 'ranger') s = (RAN_SLOTS[l] || []).slice();
    return s;
  };

  /* ---------- hit points ---------- */
  R.hpRoll = function (pc, newLvl, rng) {
    var c = R.CLASSES[pc.cls];
    var warrior = c.group === 'warrior';
    if (newLvl > c.hdMax) return c.hpAfter;
    var roll = newLvl === 1 ? c.hd : R.d(c.hd, rng);
    if (pc.cls === 'paladin' || pc.cls === 'ranger') roll = Math.max(roll, Math.ceil(c.hd / 2)); // holy/hardy vigour
    return Math.max(1, roll + R.conTable(pc.ab.con, warrior).hp);
  };

  /* ---------- weapon proficiency by class ---------- */
  R.CLASS_WEAPONS = {
    mage: ['dagger', 'dart', 'sling', 'quarterstaff'],
    cleric: ['club', 'mace', 'flail', 'war_hammer', 'morning_star', 'quarterstaff', 'sling'],
    thief: ['club', 'dagger', 'dart', 'short_bow', 'sling', 'broad_sword', 'long_sword', 'short_sword', 'quarterstaff', 'scimitar', 'light_crossbow', 'hand_axe']
  };
  R.CLASS_ARMOR = {
    mage: [], cleric: null, thief: ['leather', 'padded', 'studded', 'elven_chain']
  };

  /* ---------- turning undead ---------- */
  // rows: undead type index 0..12, columns: effective level 1..14+
  // values: number needed on d20, 0 = impossible, -1 = turned, -2 = destroyed, -3 = destroyed (more)
  var T = -1, D = -2, X = -3, N = 0;
  R.UNDEAD_TYPES = ['Skeleton', 'Zombie', 'Ghoul', 'Shadow', 'Wight', 'Ghast', 'Wraith', 'Mummy', 'Spectre', 'Vampire', 'Ghost', 'Lich', 'Special'];
  R.TURN = [
    [10, 7, 4, T, T, D, D, X, X, X, X, X, X, X],
    [13, 10, 7, 4, T, T, D, D, X, X, X, X, X, X],
    [16, 13, 10, 7, 4, T, T, D, D, X, X, X, X, X],
    [19, 16, 13, 10, 7, 4, T, T, D, D, D, X, X, X],
    [20, 19, 16, 13, 10, 7, 4, T, T, D, D, D, D, X],
    [N, 20, 19, 16, 13, 10, 7, 4, T, T, T, D, D, D],
    [N, N, 20, 19, 16, 13, 10, 7, 4, T, T, T, T, D],
    [N, N, N, 20, 19, 16, 13, 10, 7, 4, 4, T, T, T],
    [N, N, N, N, 20, 19, 16, 13, 10, 7, 7, 4, 4, T],
    [N, N, N, N, N, 20, 19, 16, 13, 10, 10, 7, 7, 4],
    [N, N, N, N, N, N, 20, 19, 16, 13, 13, 10, 10, 7],
    [N, N, N, N, N, N, N, 20, 19, 16, 16, 13, 13, 10],
    [N, N, N, N, N, N, N, N, 20, 19, 19, 16, 16, 13]
  ];
  R.turnLevel = function (pc) {
    if (pc.cls === 'cleric') return pc.lvl;
    if (pc.cls === 'paladin') return pc.lvl - 2;
    return 0;
  };
  R.turnValue = function (effLvl, undeadIdx) {
    if (effLvl < 1) return 0;
    var col = Math.min(14, effLvl) - 1;
    return R.TURN[Math.min(12, undeadIdx)][col];
  };

  /* ---------- traps ---------- */
  R.TRAPS = {
    pit: { name: 'pit trap', party: false, dice: 1, die: 6, perLvl: 0.6, save: 'bw', text: 'The floor gives way into a spiked pit!' },
    darts: { name: 'dart trap', party: false, dice: 1, die: 4, perLvl: 0.8, save: 'bw', poison: 0.1, text: 'Darts hiss from holes in the walls!' },
    blade: { name: 'scything blade', party: false, dice: 2, die: 4, perLvl: 0.6, save: 'bw', text: 'A blade scythes out of a slot in the wall!' },
    spear: { name: 'spear trap', party: false, dice: 1, die: 8, perLvl: 0.6, save: 'bw', text: 'A spear lunges up from the floor!' },
    block: { name: 'falling block', party: true, dice: 1, die: 6, perLvl: 0.5, save: 'bw', text: 'Stone blocks crash down from the ceiling!' },
    fire: { name: 'fire jet', party: true, dice: 1, die: 6, perLvl: 0.6, save: 'bw', text: 'Gouts of flame roar out of the floor!' },
    gas: { name: 'poison gas', party: true, dice: 1, die: 4, perLvl: 0.6, save: 'ppd', text: 'A choking green gas billows up!' }
  };
  R.TRAP_ORDER = ['pit', 'darts', 'blade', 'spear', 'block', 'fire', 'gas'];
  R.trapDamageSpec = function (trap, dl) {
    var t = R.TRAPS[trap];
    var n = Math.min(12, t.dice + Math.floor(Math.max(0, dl - 1) * t.perLvl));
    return n + 'd' + t.die;
  };

  /* ---------- monster tables ---------- */
  R.monThac0 = function (hd) {
    if (hd < 1) return 20;
    return Math.max(1, 19 - 2 * Math.floor((Math.floor(hd) - 1) / 2));
  };
  R.monSaves = function (hd) { return R.baseSaves('warrior', Math.max(0, Math.min(17, Math.ceil(hd)))); };
  var MXP = [7, 15, 35, 65, 120, 175, 270, 420, 650, 975, 1400, 2000, 3000, 4000, 5000, 6000, 7000];
  var MXP_HP = [1, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35];
  var MXP_SP = [2, 4, 8, 15, 25, 40, 75, 125, 175, 275, 400, 600, 700, 850, 1000, 1150, 1300];
  R.monXp = function (hd, hp, specials) {
    var i = Math.min(16, Math.max(0, Math.floor(hd)));
    var base = hd > 16 ? 7000 + (Math.floor(hd) - 16) * 1000 : MXP[i];
    var hpx = (hd > 16 ? 35 : MXP_HP[i]) * hp;
    var sp = (hd > 16 ? 1300 + (hd - 16) * 150 : MXP_SP[i]) * (specials || 0);
    return Math.round(base + hpx + sp);
  };

  /* ---------- spells ---------- */
  // range and area are in combat squares (one square ~ 10 feet)
  R.SPELLS = {};
  R.SPELL_LIST = [];
  function S(id, name, cls, lvl, o) {
    o.id = id; o.name = name; o.cls = cls; o.lvl = lvl;
    if (o.range === undefined) o.range = 0;
    if (!o.area) o.area = { k: 'one' };
    if (!o.aim) o.aim = o.area.k === 'self' ? 'self' : 'foe';
    if (o.combat === undefined) o.combat = true;
    R.SPELLS[id] = o; R.SPELL_LIST.push(o);
  }
  var lv = function (f) { return f; };
  /* --- Wizard level 1 --- */
  S('magic_missile', 'Magic Missile', 'wiz', 1, { range: 8, fx: 'missiles', desc: 'Darts of force that never miss: one 1d4+1 dart, plus one more for every two levels beyond 1st (max 5).' });
  S('sleep', 'Sleep', 'wiz', 1, { range: 9, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'sleep', hd: '2d4', hdMax: 4, dur: function (l) { return 5 * l; }, desc: 'Puts 2d4 hit dice of creatures (4+1 HD or less) into magical slumber. No save.' });
  S('burning_hands', 'Burning Hands', 'wiz', 1, { range: 1, area: { k: 'cone', l: 2 }, fx: 'dmg', dmg: function (l) { return '1d3+' + Math.min(20, 2 * l); }, save: 'half', st: 'sp', el: 'fire', desc: 'A fan of flame before the caster: 1d3 +2 per level fire damage, save for half.' });
  S('shocking_grasp', 'Shocking Grasp', 'wiz', 1, { range: 1, fx: 'dmg', dmg: function (l) { return '1d8+' + Math.min(20, l); }, touch: true, el: 'elec', desc: 'A touch that discharges 1d8 +1 per level electrical damage.' });
  S('chill_touch', 'Chill Touch', 'wiz', 1, { range: 1, fx: 'dmg', dmg: function (l) { return '1d4+' + Math.floor(l / 2); }, touch: true, save: 'neg', st: 'ppd', el: 'cold', extra: { cond: 'weak', dur: 3 }, desc: 'A deathly touch: 1d4 damage and lost strength. Undead are unaffected.' });
  S('shield', 'Shield', 'wiz', 1, { area: { k: 'self' }, fx: 'buff', buff: { id: 'shield', ac: -4, noMissile: true }, dur: function (l) { return 5 * l; }, desc: 'An invisible barrier that improves the caster\'s AC by 4 and stops magic missiles.' });
  S('mage_armor', 'Mage Armour', 'wiz', 1, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'magearmor', acSet: 6 }, dur: function () { return 999; }, desc: 'Grants an unarmoured ally armour class 6 for the rest of the battle.' });
  S('charm_person', 'Charm Person', 'wiz', 1, { range: 4, fx: 'charm', personOnly: true, save: 'neg', st: 'sp', desc: 'A humanoid of man-size or smaller who fails to save fights for the party.' });
  S('enlarge', 'Enlarge', 'wiz', 1, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'enlarge', dmg: 2, hit: 1 }, dur: function (l) { return 5 * l; }, desc: 'The target grows half again in size: +1 to hit and +2 damage.' });
  S('color_spray', 'Colour Spray', 'wiz', 1, { range: 1, area: { k: 'cone', l: 2 }, fx: 'colorspray', desc: 'A fan of clashing colours. Creatures of fewer hit dice than the caster\'s level are stunned or knocked out.' });
  S('armor_sigil', 'Warding Sigil', 'wiz', 1, { area: { k: 'self' }, fx: 'buff', buff: { id: 'sigil', save: 2, ac: -1 }, dur: function (l) { return 3 + l; }, desc: 'A glowing rune: +1 AC and +2 on saving throws for a few rounds.' });
  S('spark_bolt', 'Spark Bolt', 'wiz', 1, { range: 6, fx: 'dmg', dmg: function (l) { return Math.min(4, 1 + Math.floor(l / 3)) + 'd6'; }, save: 'half', st: 'sp', el: 'elec', desc: 'A crackling bolt of lightning: 1d6 per three levels (max 4d6), save for half.' });
  /* --- Wizard level 2 --- */
  S('stinking_cloud', 'Stinking Cloud', 'wiz', 2, { range: 9, area: { k: 'box', s: 2 }, aim: 'square', fx: 'cloud', cloud: 'stinking', dur: function (l) { return l; }, save: 'neg', st: 'ppd', desc: 'A 20-foot cube of nauseating vapour, range 30 yards. Those who fail a save vs poison reel helplessly for 1d4+1 rounds. Lasts 1 round per level.' });
  S('web', 'Web', 'wiz', 2, { range: 15, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'web', dur: function (l) { return 2 + Math.floor(l / 2); }, save: 'neg', st: 'ppd', desc: 'Sticky strands fill a 30-foot area, entangling those who fail to save.' });
  S('invisibility', 'Invisibility', 'wiz', 2, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'invis', invis: true }, dur: function () { return 999; }, desc: 'The target vanishes from sight: attackers suffer -4 to hit until the target attacks.' });
  S('mirror_image', 'Mirror Image', 'wiz', 2, { area: { k: 'self' }, fx: 'mirror', desc: '1d4 illusory doubles (+1 per 3 levels) absorb attacks aimed at the caster.' });
  S('ray_enfeeble', 'Ray of Enfeeblement', 'wiz', 2, { range: 6, fx: 'cond', cond: 'weak', dur: function (l) { return l; }, save: 'neg', st: 'sp', desc: 'A dim ray saps strength: -2 to hit and damage.' });
  S('acid_arrow', 'Acid Arrow', 'wiz', 2, { range: 18, fx: 'dmg', dmg: function (l) { return '2d4'; }, el: 'acid', dot: function (l) { return { dice: '2d4', rounds: 1 + Math.floor(l / 3) }; }, missileAttack: true, desc: 'A magical arrow of acid: 2d4 damage, and 2d4 more each round for one round per three levels.' });
  S('blindness', 'Blindness', 'wiz', 2, { range: 9, fx: 'cond', cond: 'blind', dur: function () { return 99; }, save: 'neg', st: 'sp', desc: 'Strikes a creature blind (-4 to hit, +4 to be hit) unless it saves.' });
  S('knock', 'Knock', 'wiz', 2, { combat: false, camp: 'knock', desc: 'Opens a locked or stuck door the caster faces.' });
  S('strength', 'Strength', 'wiz', 2, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'strength', dmg: 2, hit: 1 }, dur: function (l) { return 10 * l; }, desc: 'Grants supernatural strength: +1 to hit and +2 damage in melee.' });
  S('scare', 'Scare', 'wiz', 2, { range: 9, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'afraid', hdMax: 5, dur: function (l) { return 2 + Math.floor(l / 2); }, save: 'neg', st: 'sp', desc: 'Creatures of under 6 HD in the area flee in terror unless they save.' });
  S('flame_sphere', 'Flaming Sphere', 'wiz', 2, { range: 3, fx: 'dmg', dmg: function () { return '2d4'; }, save: 'neg', st: 'rsw', el: 'fire', desc: 'A rolling ball of fire burns one foe for 2d4 unless it dodges (save).' });
  /* --- Wizard level 3 --- */
  S('fireball', 'Fireball', 'wiz', 3, { range: function (l) { return Math.min(30, 3 + l * 3); }, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dmg', dmg: function (l) { return Math.min(10, l) + 'd6'; }, save: 'half', st: 'sp', el: 'fire', desc: 'A blast of flame filling a 20-foot radius: 1d6 per level (max 10d6), save for half.' });
  S('lightning_bolt', 'Lightning Bolt', 'wiz', 3, { range: 4, area: { k: 'line', l: 8 }, fx: 'dmg', dmg: function (l) { return Math.min(10, l) + 'd6'; }, save: 'half', st: 'sp', el: 'elec', desc: 'A stroke of lightning 80 feet long: 1d6 per level (max 10d6) to all in the line, save for half.' });
  S('hold_person', 'Hold Person', 'wiz', 3, { range: 12, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'held', personOnly: true, maxTargets: 4, dur: function (l) { return 2 * l; }, save: 'neg', st: 'sp', desc: 'Paralyses up to four humanoids in the area who fail to save.' });
  S('haste', 'Haste', 'wiz', 3, { range: 6, area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'haste', haste: true, ac: -1 }, dur: function (l) { return 3 + l; }, desc: 'Allies within range move and attack twice as fast.' });
  S('slow', 'Slow', 'wiz', 3, { range: 9, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'cond', cond: 'slow', dur: function (l) { return 3 + l; }, save: 'neg', st: 'sp', desc: 'Creatures in a 40-foot area act at half speed unless they save.' });
  S('dispel_magic', 'Dispel Magic', 'wiz', 3, { range: 12, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dispel', desc: 'Strips magical effects from all creatures in the area.' });
  S('prot_missiles', 'Protection from Normal Missiles', 'wiz', 3, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'pnm', noArrows: true }, dur: function () { return 999; }, desc: 'Non-magical arrows, bolts and stones cannot harm the target.' });
  S('vampiric_touch', 'Vampiric Touch', 'wiz', 3, { range: 1, touch: true, fx: 'drain', dmg: function (l) { return Math.min(6, Math.floor(l / 2)) + 'd6'; }, desc: 'A touch that drains 1d6 per two levels from the target and adds it to the caster\'s hit points.' });
  S('flame_arrow', 'Flame Arrow', 'wiz', 3, { range: 12, fx: 'dmg', dmg: function (l) { return (Math.max(1, Math.floor(l / 5)) * 5) + 'd6'; }, save: 'half', st: 'sp', el: 'fire', desc: 'Fiery bolts strike one foe: 5d6 per five levels, save for half.' });
  /* --- Wizard level 4 --- */
  S('ice_storm', 'Ice Storm', 'wiz', 4, { range: 9, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dmg', dmg: function () { return '3d10'; }, el: 'cold', desc: 'Great hailstones batter a 40-foot area for 3d10 damage. No save.' });
  S('fire_shield', 'Fire Shield', 'wiz', 4, { area: { k: 'self' }, fx: 'buff', buff: { id: 'fireshield', retaliate: 2, resist: 'cold' }, dur: function (l) { return 2 + l; }, desc: 'Flames sheathe the caster. Melee attackers take back double the damage they deal.' });
  S('minor_globe', 'Minor Globe of Invulnerability', 'wiz', 4, { area: { k: 'self' }, fx: 'buff', buff: { id: 'globe', blockLvl: 3 }, dur: function (l) { return l; }, desc: 'A shimmering sphere that turns aside spells of 3rd level or lower.' });
  S('fear', 'Fear', 'wiz', 4, { range: 6, area: { k: 'cone', l: 6 }, fx: 'cond', cond: 'afraid', dur: function (l) { return l; }, save: 'neg', st: 'sp', desc: 'A cone of terror: those who fail to save flee in panic.' });
  S('confusion', 'Confusion', 'wiz', 4, { range: 12, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'cond', cond: 'confused', dur: function (l) { return 2 + l; }, save: 'neg', st: 'sp', desc: 'Creatures in the area wander, babble or attack at random unless they save.' });
  S('charm_monster', 'Charm Monster', 'wiz', 4, { range: 6, fx: 'charm', save: 'neg', st: 'sp', desc: 'Any living creature that fails to save turns to fight for the party.' });
  S('stoneskin', 'Stoneskin', 'wiz', 4, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'stoneskin', skin: true }, dur: function () { return 999; }, desc: 'Skin as hard as granite: absorbs 1d4 +1 per two levels attacks completely.' });
  S('improved_invis', 'Improved Invisibility', 'wiz', 4, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'iminvis', invis: true, keep: true }, dur: function (l) { return 4 + l; }, desc: 'The target stays invisible even while attacking.' });
  S('enervation', 'Enervation', 'wiz', 4, { range: 6, fx: 'energy', levels: function (l) { return Math.min(4, Math.floor(l / 4)); }, save: 'neg', st: 'sp', desc: 'A black ray that drains one level per four caster levels unless the target saves.' });
  /* --- Wizard level 5 --- */
  S('cone_of_cold', 'Cone of Cold', 'wiz', 5, { range: 1, area: { k: 'cone', l: function (l) { return Math.min(10, Math.ceil(l / 2)); } }, fx: 'dmg', dmg: function (l) { return Math.min(15, l) + 'd4+' + Math.min(15, l); }, save: 'half', st: 'sp', el: 'cold', desc: 'A cone of numbing cold: 1d4+1 per level, save for half.' });
  S('cloudkill', 'Cloudkill', 'wiz', 5, { range: 4, area: { k: 'box', s: 3 }, aim: 'square', fx: 'cloud', cloud: 'kill', dur: function (l) { return l; }, desc: 'A poisonous cloud slays creatures under 5 HD outright and burns stronger ones each round.' });
  S('hold_monster', 'Hold Monster', 'wiz', 5, { range: 6, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'held', maxTargets: 4, dur: function (l) { return l; }, save: 'neg', st: 'sp', desc: 'Paralyses up to four creatures of any kind that fail to save.' });
  S('feeblemind', 'Feeblemind', 'wiz', 5, { range: 12, fx: 'feeble', save: 'neg', st: 'sp', desc: 'Reduces a spellcaster to idiocy — it can no longer cast spells.' });
  S('chaos', 'Chaos', 'wiz', 5, { range: 6, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'cond', cond: 'confused', dur: function (l) { return l; }, save: 'neg', st: 'sp', saveMod: -2, desc: 'Like confusion but harder to resist (-2 to saves).' });
  S('shadow_blast', 'Shadow Blast', 'wiz', 5, { range: 9, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'dmg', dmg: function (l) { return Math.min(12, l) + 'd4'; }, save: 'half', st: 'sp', el: 'magic', desc: 'A burst of solid shadow: 1d4 per level, save for half.' });
  /* --- Wizard level 6 --- */
  S('disintegrate', 'Disintegrate', 'wiz', 6, { range: 6, fx: 'disintegrate', save: 'neg', st: 'sp', desc: 'A thin green ray reduces a creature to dust unless it saves.' });
  S('death_spell', 'Death Spell', 'wiz', 6, { range: 12, area: { k: 'burst', r: 3 }, aim: 'square', fx: 'deathspell', desc: 'Snuffs out creatures of fewer than 9 HD in a large area. No save.' });
  S('globe_invuln', 'Globe of Invulnerability', 'wiz', 6, { area: { k: 'self' }, fx: 'buff', buff: { id: 'globe', blockLvl: 4 }, dur: function (l) { return l; }, desc: 'Turns aside spells of 4th level or lower.' });
  S('chain_lightning', 'Chain Lightning', 'wiz', 6, { range: 12, fx: 'chain', dmg: function (l) { return Math.min(12, l) + 'd6'; }, save: 'half', st: 'sp', el: 'elec', desc: 'A bolt that leaps from foe to foe, losing 1d6 at each jump.' });
  S('flesh_to_stone', 'Flesh to Stone', 'wiz', 6, { range: 9, fx: 'stone', save: 'neg', st: 'pp', desc: 'Turns a creature to stone unless it saves vs petrification.' });
  S('mass_haste', 'Quickening', 'wiz', 6, { area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'haste', haste: true, ac: -2, hit: 1 }, dur: function (l) { return 4 + l; }, desc: 'The whole party is hastened, gaining +1 to hit and AC 2 better.' });
  /* --- Wizard level 7 --- */
  S('delayed_fireball', 'Delayed Blast Fireball', 'wiz', 7, { range: 12, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dmg', dmg: function (l) { return Math.min(15, l) + 'd6+' + Math.min(15, l); }, save: 'half', st: 'sp', el: 'fire', desc: 'A more potent fireball: 1d6+1 per level, save for half.' });
  S('finger_death', 'Finger of Death', 'wiz', 7, { range: 6, fx: 'death', save: 'neg', st: 'ppd', failDmg: '2d8+1', desc: 'Slays a creature outright unless it saves vs death, which still deals 2d8+1.' });
  S('pw_stun', 'Power Word, Stun', 'wiz', 7, { range: 6, fx: 'pwstun', desc: 'A creature with 90 or fewer hit points is stunned for several rounds.' });
  S('mass_invis', 'Mass Invisibility', 'wiz', 7, { area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'invis', invis: true }, dur: function () { return 999; }, desc: 'The whole party turns invisible.' });
  S('prismatic_spray', 'Prismatic Spray', 'wiz', 7, { range: 1, area: { k: 'cone', l: 7 }, fx: 'prismatic', desc: 'Seven-hued rays strike each creature in a broad cone with random dire effects.' });
  /* --- Wizard level 8 --- */
  S('incendiary_cloud', 'Incendiary Cloud', 'wiz', 8, { range: 6, area: { k: 'box', s: 3 }, aim: 'square', fx: 'cloud', cloud: 'fire', dur: function () { return 4; }, desc: 'A billowing cloud of burning embers that sears everything within it every round.' });
  S('mass_charm', 'Mass Charm', 'wiz', 8, { range: 6, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'charm', save: 'neg', st: 'sp', saveMod: -2, desc: 'Charms all creatures in the area who fail to save (at -2).' });
  S('pw_blind', 'Power Word, Blind', 'wiz', 8, { range: 6, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'cond', cond: 'blind', dur: function () { return 99; }, desc: 'All creatures in the area are struck blind. No save.' });
  S('withering', 'Withering', 'wiz', 8, { range: 9, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dmg', dmg: function (l) { return Math.min(20, l) + 'd8'; }, save: 'half', st: 'sp', el: 'magic', noUndead: true, desc: 'Draws the water from living bodies: 1d8 per level, save for half. No effect on undead.' });
  /* --- Wizard level 9 --- */
  S('meteor_swarm', 'Meteor Swarm', 'wiz', 9, { range: 12, area: { k: 'burst', r: 3 }, aim: 'square', fx: 'dmg', dmg: function () { return '16d6'; }, save: 'half', st: 'sp', el: 'fire', desc: 'Four blazing meteors explode over a wide area: 16d6 fire damage, save for half.' });
  S('pw_kill', 'Power Word, Kill', 'wiz', 9, { range: 6, fx: 'pwkill', desc: 'A single word slays one creature of 60 or fewer hit points. No save.' });
  S('energy_drain', 'Energy Drain', 'wiz', 9, { range: 1, touch: true, fx: 'energy', levels: function () { return 2; }, desc: 'A touch that drains two life levels. No save.' });
  S('time_stop', 'Time Stop', 'wiz', 9, { area: { k: 'self' }, fx: 'timestop', desc: 'The caster steps outside time and acts three more times before anyone else.' });

  /* --- Priest level 1 --- */
  S('cure_light', 'Cure Light Wounds', 'pri', 1, { range: 1, aim: 'ally', fx: 'heal', heal: '1d8', camp: 'heal', desc: 'Heals 1d8 hit points by touch.' });
  S('cause_light', 'Cause Light Wounds', 'pri', 1, { range: 1, touch: true, fx: 'dmg', dmg: function () { return '1d8'; }, el: 'magic', desc: 'A harmful touch dealing 1d8 damage.' });
  S('bless', 'Bless', 'pri', 1, { range: 6, area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'bless', hit: 1, morale: 1 }, dur: function () { return 6; }, desc: 'Allies gain +1 to hit for six rounds.' });
  S('curse', 'Curse', 'pri', 1, { range: 6, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'cond', cond: 'cursed', dur: function () { return 6; }, desc: 'Enemies in the area suffer -1 to hit for six rounds.' });
  S('prot_evil', 'Protection from Evil', 'pri', 1, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'pfe', vsEvil: 2 }, dur: function (l) { return 3 * l; }, desc: 'Evil creatures suffer -2 to hit the target, who gains +2 to saves against them.' });
  S('command', 'Command', 'pri', 1, { range: 3, fx: 'cond', cond: 'stun', dur: function () { return 1; }, hdMax: 12, desc: 'A single word ("Halt!") makes a creature lose its next round. No save, but fails against 13+ HD.' });
  S('remove_fear', 'Remove Fear', 'pri', 1, { range: 1, aim: 'ally', fx: 'cure', cures: ['afraid'], buff: { id: 'brave', save: 1 }, desc: 'Banishes fear from an ally.' });
  S('sanctuary', 'Sanctuary', 'pri', 1, { area: { k: 'self' }, fx: 'buff', buff: { id: 'sanct', sanct: true }, dur: function (l) { return 2 + l; }, desc: 'Foes must save to attack the caster until the caster attacks.' });
  S('magic_stone', 'Magical Stone', 'pri', 1, { range: 6, fx: 'missiles', count: function () { return 3; }, die: '1d4', missileAttack: true, desc: 'Three enchanted pebbles fly at foes for 1d4 each (2d4 against undead).' });
  S('shillelagh', 'Shillelagh', 'pri', 1, { area: { k: 'self' }, fx: 'buff', buff: { id: 'shill', hit: 1, dmg: 2 }, dur: function (l) { return 4 + l; }, desc: 'The caster\'s weapon is enchanted for +1 to hit and +2 damage.' });
  /* --- Priest level 2 --- */
  S('hold_person_p', 'Hold Person', 'pri', 2, { range: 12, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'held', personOnly: true, maxTargets: 3, dur: function (l) { return 2 * l; }, save: 'neg', st: 'sp', desc: 'Paralyses up to three humanoids who fail to save.' });
  S('silence', 'Silence, 15-foot Radius', 'pri', 2, { range: 12, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'cond', cond: 'silenced', dur: function (l) { return 2 * l; }, save: 'neg', st: 'sp', desc: 'Magical silence stops spellcasting by those who fail to save.' });
  S('spiritual_hammer', 'Spiritual Hammer', 'pri', 2, { range: 6, fx: 'dmg', dmg: function (l) { return '1d4+' + (1 + Math.floor(l / 6)); }, missileAttack: true, el: 'magic', repeat: 3, desc: 'A hammer of force strikes a foe three times for 1d4+1 each.' });
  S('find_traps', 'Find Traps', 'pri', 2, { combat: false, camp: 'findtraps', desc: 'Reveals all traps within six squares.' });
  S('chant', 'Chant', 'pri', 2, { area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'chant', hit: 1, dmg: 1, save: 1 }, dur: function () { return 5; }, desc: 'Allies gain +1 to hit, damage and saves while the priest chants.' });
  S('aid', 'Aid', 'pri', 2, { range: 1, aim: 'ally', fx: 'heal', heal: '1d8', buff: { id: 'aid', hit: 1, save: 1 }, dur: function (l) { return l + 1; }, desc: '+1 to hit and saves and 1d8 hit points.' });
  S('barkskin', 'Barkskin', 'pri', 2, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'bark', ac: -2, save: 1 }, dur: function (l) { return 4 + l; }, desc: 'Skin toughens like bark: AC 2 better and +1 to saves.' });
  S('resist_fire', 'Resist Fire', 'pri', 2, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'rfire', resist: 'fire' }, dur: function () { return 999; }, desc: 'Halves fire damage and grants +3 to saves against it.' });
  S('slow_poison', 'Slow Poison', 'pri', 2, { range: 1, aim: 'ally', fx: 'cure', cures: ['poisoned'], camp: 'cure', desc: 'Halts the effects of poison.' });
  /* --- Priest level 3 --- */
  S('prayer', 'Prayer', 'pri', 3, { area: { k: 'party' }, aim: 'ally', fx: 'prayer', dur: function (l) { return l; }, desc: 'Allies gain +1 to hit, damage and saves; enemies suffer -1.' });
  S('cure_disease', 'Cure Disease', 'pri', 3, { range: 1, aim: 'ally', fx: 'cure', cures: ['diseased'], camp: 'cure', desc: 'Cures any disease.' });
  S('remove_paralysis', 'Remove Paralysis', 'pri', 3, { range: 6, aim: 'ally', area: { k: 'burst', r: 1 }, fx: 'cure', cures: ['held', 'paralyzed', 'web', 'slow'], camp: 'cure', desc: 'Frees allies from paralysis and holding.' });
  S('dispel_magic_p', 'Dispel Magic', 'pri', 3, { range: 6, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'dispel', desc: 'Strips magical effects from all creatures in the area.' });
  S('cure_blindness', 'Cure Blindness', 'pri', 3, { range: 1, aim: 'ally', fx: 'cure', cures: ['blind'], camp: 'cure', desc: 'Restores sight.' });
  S('remove_curse', 'Remove Curse', 'pri', 3, { range: 1, aim: 'ally', fx: 'cure', cures: ['cursed', 'weak'], camp: 'cure', desc: 'Lifts curses and enfeeblement.' });
  S('magical_vestment', 'Magical Vestment', 'pri', 3, { area: { k: 'self' }, fx: 'buff', buff: { id: 'vest', acSet: 5, acSetLvl: true }, dur: function () { return 999; }, desc: 'The priest\'s robes become armour of AC 5, one better per three levels above 5th.' });
  S('call_lightning', 'Call Lightning', 'pri', 3, { range: 12, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'dmg', dmg: function (l) { return Math.min(10, 2 + Math.floor(l / 2)) + 'd8'; }, save: 'half', st: 'sp', el: 'elec', desc: 'A bolt from the heavens: 2d8 +1d8 per two levels, save for half.' });
  /* --- Priest level 4 --- */
  S('cure_serious', 'Cure Serious Wounds', 'pri', 4, { range: 1, aim: 'ally', fx: 'heal', heal: '2d8+1', camp: 'heal', desc: 'Heals 2d8+1 hit points.' });
  S('cause_serious', 'Cause Serious Wounds', 'pri', 4, { range: 1, touch: true, fx: 'dmg', dmg: function () { return '2d8+1'; }, el: 'magic', desc: 'A harmful touch dealing 2d8+1.' });
  S('neutralize_poison', 'Neutralize Poison', 'pri', 4, { range: 1, aim: 'ally', fx: 'cure', cures: ['poisoned'], camp: 'cure', desc: 'Purges all poison.' });
  S('prot_evil_10', 'Protection from Evil, 10-foot Radius', 'pri', 4, { area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'pfe', vsEvil: 2 }, dur: function (l) { return 3 * l; }, desc: 'Protection from evil for the whole party.' });
  S('free_action', 'Free Action', 'pri', 4, { range: 1, aim: 'ally', fx: 'buff', buff: { id: 'free', free: true }, cures: ['held', 'web', 'slow'], dur: function () { return 999; }, desc: 'Immunity to paralysis, webs and slowing.' });
  S('cloak_bravery', 'Cloak of Bravery', 'pri', 4, { area: { k: 'party' }, aim: 'ally', fx: 'buff', buff: { id: 'brave', fearless: true, save: 1 }, cures: ['afraid'], dur: function () { return 999; }, desc: 'Allies become immune to fear.' });
  /* --- Priest level 5 --- */
  S('cure_critical', 'Cure Critical Wounds', 'pri', 5, { range: 1, aim: 'ally', fx: 'heal', heal: '3d8+3', camp: 'heal', desc: 'Heals 3d8+3 hit points.' });
  S('flame_strike', 'Flame Strike', 'pri', 5, { range: 6, area: { k: 'burst', r: 0 }, aim: 'square', fx: 'dmg', dmg: function () { return '6d8'; }, save: 'half', st: 'sp', el: 'fire', desc: 'A column of holy fire: 6d8 damage, save for half.' });
  S('raise_dead', 'Raise Dead', 'pri', 5, { range: 1, aim: 'dead', fx: 'raise', camp: 'raise', desc: 'Returns a dead companion to life with 1 hit point (survival roll by Constitution).' });
  S('dispel_evil', 'Dispel Evil', 'pri', 5, { range: 1, touch: true, fx: 'dispelevil', desc: 'Banishes an evil undead or extraplanar creature unless it saves.' });
  S('slay_living', 'Slay Living', 'pri', 5, { range: 1, touch: true, fx: 'death', save: 'neg', st: 'ppd', failDmg: '3d6+9', noUndead: true, desc: 'A touch of death. On a successful save the target takes 3d6+9.' });
  S('insect_plague', 'Insect Plague', 'pri', 5, { range: 12, area: { k: 'box', s: 3 }, aim: 'square', fx: 'cloud', cloud: 'insects', dur: function (l) { return Math.min(10, l); }, desc: 'A swarm of biting insects: creatures under 3 HD flee, all take 1 point per round and cannot cast.' });
  /* --- Priest level 6 --- */
  S('heal', 'Heal', 'pri', 6, { range: 1, aim: 'ally', fx: 'heal', heal: 'full', cures: ['blind', 'diseased', 'confused', 'afraid', 'weak'], camp: 'heal', desc: 'Restores all hit points but 1d4 and cures most afflictions.' });
  S('harm', 'Harm', 'pri', 6, { range: 1, touch: true, fx: 'harm', desc: 'A touch that leaves the target with only 1d4 hit points.' });
  S('blade_barrier', 'Blade Barrier', 'pri', 6, { range: 9, area: { k: 'box', s: 3 }, aim: 'square', fx: 'cloud', cloud: 'blades', dur: function (l) { return Math.min(10, Math.floor(l / 2)); }, desc: 'A whirling wall of blades deals 8d8 to anything within or entering it.' });
  S('fire_seeds', 'Fire Seeds', 'pri', 6, { range: 12, area: { k: 'burst', r: 1 }, aim: 'square', fx: 'dmg', dmg: function () { return '4d8'; }, save: 'half', st: 'sp', el: 'fire', desc: 'Hurled acorns burst into flame: 4d8 in a small area, save for half.' });
  /* --- Priest level 7 --- */
  S('restoration', 'Restoration', 'pri', 7, { range: 1, aim: 'ally', fx: 'restore', camp: 'restore', desc: 'Restores levels lost to energy drain.' });
  S('resurrection', 'Resurrection', 'pri', 7, { range: 1, aim: 'dead', fx: 'raise', full: true, camp: 'raise', desc: 'Returns a dead companion to life with full hit points.' });
  S('holy_word', 'Holy Word', 'pri', 7, { area: { k: 'foes' }, fx: 'holyword', desc: 'A word of power: weak foes die, stronger ones are stunned or deafened. Evil creatures only.' });
  S('fire_storm', 'Fire Storm', 'pri', 7, { range: 15, area: { k: 'burst', r: 3 }, aim: 'square', fx: 'dmg', dmg: function (l) { return '2d8+' + l; }, save: 'half', st: 'sp', el: 'fire', foesOnly: true, desc: 'A storm of flame engulfs every foe in a wide area: 2d8 + level, save for half.' });
  S('sunray', 'Sunray', 'pri', 7, { range: 9, area: { k: 'burst', r: 2 }, aim: 'square', fx: 'sunray', desc: 'A blinding beam of sunlight. Undead take 8d6, others are blinded.' });

  R.spellsOf = function (cls, lvl) {
    return R.SPELL_LIST.filter(function (s) { return s.cls === cls && (!lvl || s.lvl === lvl); });
  };
  R.spellRange = function (sp, lvl) { return typeof sp.range === 'function' ? sp.range(lvl) : sp.range; };

  /* ---------- character creation ---------- */
  R.rollAbilities = function (rng) {
    var ab = {};
    R.ABILS.forEach(function (a) {
      var r = [R.d(6, rng), R.d(6, rng), R.d(6, rng), R.d(6, rng)].sort(function (x, y) { return y - x; });
      ab[a] = r[0] + r[1] + r[2];
    });
    ab.strEx = 0;
    return ab;
  };
  R.applyRace = function (ab, race) {
    var r = R.RACES[race], out = {};
    R.ABILS.forEach(function (a) {
      var v = ab[a] + (r.adj[a] || 0);
      v = Math.max(r.min[a] || 3, Math.min(r.max[a] || 18, v));
      out[a] = R.clamp(v, 3, 18);
    });
    out.strEx = ab.strEx || 0;
    return out;
  };

  R.newCharacter = function (o, rng) {
    var pc = {
      id: 'pc' + Math.floor((rng || Math.random)() * 1e9).toString(36),
      name: o.name || 'Nameless', race: o.race, cls: o.cls, gender: o.gender || 'm', align: o.align || 'N',
      portrait: o.portrait != null ? o.portrait : Math.floor((rng || Math.random)() * 100000),
      ab: {}, lvl: 1, xp: 0, hp: 0, hpMax: 0, hpRolls: [], spec: o.spec || null,
      inv: [], book: [], mem: [], status: {}, thief: null, drained: 0, learnFail: {}, layDay: -1, color: o.color || 0
    };
    R.ABILS.forEach(function (a) { pc.ab[a] = o.ab[a]; });
    pc.ab.strEx = (pc.ab.str === 18 && R.CLASSES[pc.cls].group === 'warrior') ? (o.ab.strEx || R.d(100, rng)) : 0;
    var hp = R.hpRoll(pc, 1, rng);
    if (pc.cls === 'mage' || pc.cls === 'thief') hp = Math.max(hp, 4);
    pc.hpRolls.push(hp); pc.hpMax = hp; pc.hp = hp;
    if (pc.cls === 'thief') R.allocThief(pc);
    return pc;
  };

  // apply a level gain (after training); returns description
  R.gainLevel = function (pc, rng) {
    var max = R.raceMaxLevel(pc.race, pc.cls);
    if (pc.lvl >= Math.min(max, R.MAX_LEVEL)) return null;
    pc.lvl++;
    var hp = R.hpRoll(pc, pc.lvl, rng);
    pc.hpRolls.push(hp); pc.hpMax += hp; pc.hp += hp;
    if (pc.cls === 'thief') R.allocThief(pc);
    return { hp: hp, lvl: pc.lvl };
  };
  R.loseLevel = function (pc) {
    if (pc.lvl <= 1) { pc.xp = 0; pc.hpMax = Math.max(1, pc.hpMax - 2); pc.hp = Math.min(pc.hp, pc.hpMax); return; }
    var hp = pc.hpRolls.pop() || 1;
    pc.lvl--; pc.hpMax = Math.max(1, pc.hpMax - hp); pc.hp = Math.min(pc.hp, pc.hpMax);
    pc.xp = Math.floor((R.xpFor(pc.cls, pc.lvl) + R.xpFor(pc.cls, pc.lvl + 1)) / 2);
    pc.drained = (pc.drained || 0) + 1;
    if (pc.cls === 'thief') R.allocThief(pc);
  };
  R.canTrain = function (pc) {
    var max = Math.min(R.raceMaxLevel(pc.race, pc.cls), R.MAX_LEVEL);
    return pc.lvl < max && pc.xp >= R.xpFor(pc.cls, pc.lvl + 1);
  };
  R.trainCost = function (pc) { return 100 * (pc.lvl + 1); };
  // xp gain respecting the gold-box cap: cannot exceed 1 below the level after next
  R.addXp = function (pc, amt) {
    if (pc.status.dead || pc.status.stone) return 0;
    var gain = Math.floor(amt * (1 + R.primeBonus(pc)));
    var cap = R.xpFor(pc.cls, Math.min(R.MAX_LEVEL, pc.lvl + 2)) - 1;
    if (pc.lvl >= R.MAX_LEVEL - 1) cap = Infinity;
    var before = pc.xp;
    pc.xp = Math.min(cap, pc.xp + gain);
    return pc.xp - before;
  };

  /* ---------- movement and encumbrance ---------- */
  R.baseMove = function (pc) { return R.RACES[pc.race].move; };

  return R;
})();
