/* Emberfall — bestiary.js
 * A bestiary that fills in as the company meets, fights and slays creatures:
 * a sighting gives the name and look, a battle reveals armour and attacks,
 * and a kill reveals special abilities and worth. */
var Bestiary = (function () {
  'use strict';
  var B = {};
  function rec(id) { if (!Game.S) return null; var b = Game.S.bestiary; return b[id] || (b[id] = { seen: 0, fought: 0, killed: 0 }); }
  B.see = function (id) { var r = rec(id); if (r && !r.seen) { r.seen = 1; } };
  B.fought = function (id) { var r = rec(id); if (r) { r.seen = 1; r.fought++; } };
  B.killed = function (id) { var r = rec(id); if (r) { r.seen = 1; r.killed++; } };
  var SIZE = { S: 'Small', M: 'Man-sized', L: 'Large', H: 'Huge', G: 'Gargantuan' };
  function specials(m) {
    var s = [];
    if (m.poison) s.push(m.poison === 'save' || m.poison === 'x' ? 'deadly poison' : m.poison === 'para' ? 'paralysing venom' : 'poison');
    if (m.para) s.push('paralysing touch');
    if (m.drain) s.push('drains ' + m.drain + ' level' + (m.drain > 1 ? 's' : ''));
    if (m.regen) s.push('regenerates ' + m.regen + ' hp a round');
    if (m.breath) s.push('breathes ' + m.breath.el + ' (' + m.breath.shape + ')');
    if (m.gaze) s.push('gaze: ' + m.gaze);
    if (m.needMagic) s.push(m.needMagic === 0.5 ? 'harmed only by silver or magic' : 'needs +' + m.needMagic + ' weapons to hit');
    if (m.undead != null) s.push('undead (turns as ' + Rules.UNDEAD_TYPES[m.undead].toLowerCase() + ')');
    if (m.mr) s.push(m.mr + '% magic resistance');
    if (m.imm) s.push('immune to ' + m.imm.join(', '));
    if (m.spells) s.push('casts ' + m.spells.map(function (x) { return Rules.SPELLS[x] ? Rules.SPELLS[x].name : x; }).join(', '));
    if (m.ranged) s.push(m.ranged.kind === 'rock' ? 'hurls boulders' : 'ranged attack');
    ['fear', 'disease', 'weak', 'stone', 'charm', 'ambush', 'fly', 'invis', 'blink', 'acid', 'hug', 'rust'].forEach(function (k) { if (m[k]) s.push({ fear: 'causes fear', disease: 'spreads disease', weak: 'saps strength', stone: 'petrifying touch', charm: 'charms', ambush: 'lies in ambush', fly: 'flies', invis: 'turns invisible', blink: 'blinks about', acid: 'acid', hug: 'crushing hug', rust: 'rusts metal' }[k]); });
    return s;
  }
  B.open = function () {
    if (!Game.S) return;
    var known = Monsters.list.filter(function (m) { return Game.S.bestiary[m.id] && Game.S.bestiary[m.id].seen; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var sel = known[0];
    var h = UI.modal({ title: 'Bestiary — ' + known.length + ' of ' + Monsters.list.length + ' creatures recorded', cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      if (!known.length) { h.body.appendChild(UI.el('p', 'dim', 'The pages are blank. Creatures you meet will be recorded here.')); return; }
      var cols = UI.el('div', 'cols');
      var left = UI.el('div', 'list'); left.style.maxHeight = '60vh'; left.style.overflowY = 'auto'; left.style.flex = '0 1 240px';
      known.forEach(function (m) {
        var r = Game.S.bestiary[m.id];
        var row = UI.el('div', 'row click' + (m === sel ? ' sel' : ''), '<div class="grow">' + UI.esc(m.name) + '</div><span class="small">' + (r.killed ? r.killed + ' slain' : r.fought ? 'fought' : 'seen') + '</span>');
        row.onclick = function () { sel = m; render(); };
        left.appendChild(row);
      });
      cols.appendChild(left);
      var right = UI.el('div');
      if (sel) {
        var r = Game.S.bestiary[sel.id];
        var top = UI.el('div', 'beast');
        var c = document.createElement('canvas'); c.width = 96; c.height = 96;
        var ctx = c.getContext('2d'); ctx.drawImage(Figures.monsterSprite(sel.id).canvas, 0, 0, 96, 96);
        top.appendChild(c);
        var info = '<div class="gold" style="font-size:18px;font-weight:bold">' + UI.esc(sel.name) + '</div><div class="dim">' + SIZE[sel.size] + ' ' + sel.type + '</div><p class="story">' + UI.esc(sel.desc) + '</p>';
        top.appendChild(UI.el('div', '', info));
        right.appendChild(top);
        var kv = '<div class="kv">';
        if (r.fought || r.killed) {
          kv += '<div class="k">Armour class</div><div class="v">' + sel.ac + '</div><div class="k">Hit dice</div><div class="v">' + sel.hdText + '</div><div class="k">Movement</div><div class="v">' + sel.mv + '</div><div class="k">Attacks</div><div class="v">' + sel.att.join(' / ') + '</div><div class="k">Usually found</div><div class="v">' + sel.num + '</div>';
        } else kv += '<div class="k">Combat</div><div class="v dim">Fight one to learn more.</div>';
        if (r.killed) {
          kv += '<div class="k">Alignment</div><div class="v">' + Rules.ALIGN_NAMES[sel.al] + '</div><div class="k">Experience</div><div class="v">' + sel.xp + '</div><div class="k">Treasure</div><div class="v">' + (sel.tt || 'none') + '</div><div class="k">Special</div><div class="v">' + (specials(sel).join('; ') || 'none') + '</div>';
        } else if (r.fought) kv += '<div class="k">Special</div><div class="v dim">Slay one to learn its secrets.</div>';
        kv += '<div class="k">Encounters</div><div class="v">' + (r.fought || 0) + ' fought, ' + (r.killed || 0) + ' slain</div></div>';
        right.appendChild(UI.el('div', '', kv));
      }
      cols.appendChild(right);
      h.body.appendChild(cols);
    };
    render();
  };
  return B;
})();
