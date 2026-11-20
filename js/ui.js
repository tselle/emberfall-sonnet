/* Emberfall — ui.js
 * Screens, modal dialogs, the party roster, character creation and sheets,
 * shops, temples, inns, training halls, commissions, loot, camping and menus. */
var UI = (function () {
  'use strict';
  var U = {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  U.esc = esc;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  U.el = el;
  function fmt(n) { return Math.floor(n).toLocaleString(); }
  U.fmt = fmt;

  /* ---------- icons (inline SVG drawn in code) ---------- */
  var ICONS = {
    search: '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14.5 14.5 L21 21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    camp: '<path d="M3 20 L12 4 L21 20 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 20 L12 14 L14.5 20" fill="currentColor"/>',
    map: '<path d="M2 5 L8 3 L16 6 L22 4 L22 19 L16 21 L8 18 L2 20 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3 V18 M16 6 V21" stroke="currentColor" stroke-width="1.5"/>',
    journal: '<rect x="5" y="3" width="14" height="18" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8 H16 M8 12 H16 M8 16 H13" stroke="currentColor" stroke-width="1.5"/>',
    beast: '<path d="M12 3 C6 3 4 8 5 12 L7 15 L7 19 L10 19 L10 17 L14 17 L14 19 L17 19 L17 15 L19 12 C20 8 18 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><circle cx="15" cy="10" r="1.6" fill="currentColor"/>',
    sneak: '<ellipse cx="9" cy="15" rx="3" ry="5" fill="currentColor"/><ellipse cx="16" cy="9" rx="2.6" ry="4.4" fill="currentColor"/><circle cx="6" cy="8" r="1.3" fill="currentColor"/><circle cx="19" cy="17" r="1.3" fill="currentColor"/>',
    listen: '<path d="M7 9 C7 4 17 4 17 10 C17 14 13 14 13 18 C13 21 9 21 9 18" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M10 10 C10 8 14 8 14 10" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    cast: '<path d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z" fill="none" stroke="currentColor" stroke-width="2"/>',
    party: '<circle cx="8" cy="8" r="3" fill="currentColor"/><circle cx="16" cy="8" r="3" fill="currentColor"/><path d="M2 20 C2 13 14 13 14 20 M10 20 C10 13 22 13 22 20" fill="none" stroke="currentColor" stroke-width="2"/>',
    menu: '<path d="M4 6 H20 M4 12 H20 M4 18 H20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    enter: '<rect x="6" y="3" width="12" height="18" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/>',
    flag: '<path d="M5 21 V3 M5 4 H18 L15 8 L18 12 H5" fill="none" stroke="currentColor" stroke-width="2"/>',
    help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5 C9.5 6 14.5 6 14.5 9.5 C14.5 12 12 12 12 14.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17.5" r="1.3" fill="currentColor"/>',
    pad: '<path d="M12 3 L15 7 H9 Z M12 21 L9 17 H15 Z M3 12 L7 9 V15 Z M21 12 L17 15 V9 Z" fill="currentColor"/>',
    up: '<path d="M12 4 L20 14 H15 V20 H9 V14 H4 Z" fill="currentColor"/>',
    down: '<path d="M12 20 L4 10 H9 V4 H15 V10 H20 Z" fill="currentColor"/>',
    left: '<path d="M4 12 C4 6 10 4 15 6 L15 3 L21 8 L15 13 L15 10 C11 8 7 9 7 12 Z" fill="currentColor"/>',
    right: '<path d="M20 12 C20 6 14 4 9 6 L9 3 L3 8 L9 13 L9 10 C13 8 17 9 17 12 Z" fill="currentColor"/>',
    sl: '<path d="M3 12 L10 6 V10 H21 V14 H10 V18 Z" fill="currentColor"/>',
    sr: '<path d="M21 12 L14 6 V10 H3 V14 H14 V18 Z" fill="currentColor"/>'
  };
  U.icon = function (name) { return '<svg viewBox="0 0 24 24">' + (ICONS[name] || '') + '</svg>'; };

  /* ---------- screens ---------- */
  U.show = function (id) {
    ['loading', 'title', 'game', 'combat'].forEach(function (s) { $(s).classList.toggle('active', s === id); });
    if (id === 'game') setTimeout(function () { U.layout(); Game.redraw(); }, 0);
  };
  U.layout = function () {
    var wrap = $('viewwrap'); if (!wrap) return;
    var w = wrap.clientWidth - 4, h = wrap.clientHeight - 4;
    if (w <= 0 || h <= 0) return;
    var vw = View3D.setAspect(w / h);
    var s = Math.min(w / vw, h / 200);
    var v = $('view'); v.style.width = Math.floor(vw * s) + 'px'; v.style.height = Math.floor(200 * s) + 'px';
    Overland.resize(w, h);
  };

  /* ---------- message log and toast ---------- */
  U.log = function (text, cls) {
    var log = $('log'); if (!log) return;
    String(text).split('\n').forEach(function (t) {
      var d = el('div', 'm ' + (cls || ''), esc(t));
      log.appendChild(d);
    });
    while (log.childNodes.length > 120) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  };
  var toastTimer = null;
  U.toast = function (text) {
    var t = $('toast'); t.textContent = text; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  };

  /* ---------- modals ---------- */
  var stack = [];
  U.hasModal = function () { return stack.length > 0; };
  // o: { title, html | node, buttons:[{label,fn,key,cls,disabled,keep}], cls, close:true, onClose }
  U.modal = function (o) {
    var back = el('div', 'mback'), m = el('div', 'modal ' + (o.cls || ''));
    var head = el('div', 'mt', '<span>' + esc(o.title || '') + '</span>');
    if (o.close !== false) { var x = el('span', 'x', '&times;'); x.onclick = function () { h.close(); }; head.appendChild(x); }
    var body = el('div', 'mb'), foot = el('div', 'mf');
    if (o.node) body.appendChild(o.node); else body.innerHTML = o.html || '';
    m.appendChild(head); m.appendChild(body);
    var h = { el: m, body: body, foot: foot, opts: o, closed: false };
    h.close = function (silent) {
      if (h.closed) return; h.closed = true;
      back.remove(); stack.splice(stack.indexOf(h), 1);
      if (!silent && o.onClose) o.onClose();
    };
    h.setButtons = function (btns) {
      foot.innerHTML = ''; h.btns = btns || [];
      h.btns.forEach(function (b, i) {
        var bt = el('button', 'btn ' + (b.cls || ''), (b.key ? '<span class="key">' + esc(b.key) + '</span>' : '') + esc(b.label));
        bt.disabled = !!b.disabled;
        bt.onclick = function () { if (!b.keep) h.close(true); b.fn && b.fn(h); };
        foot.appendChild(bt);
      });
      if (h.btns.length) m.appendChild(foot); else if (foot.parentNode) foot.remove();
    };
    h.setButtons(o.buttons);
    back.appendChild(m);
    back.addEventListener('click', function (e) { if (e.target === back && o.close !== false && o.backClose !== false) h.close(); });
    $('modals').appendChild(back);
    stack.push(h);
    return h;
  };
  U.top = function () { return stack[stack.length - 1]; };
  U.closeAll = function () { while (stack.length) stack[stack.length - 1].close(true); };
  U.modalKey = function (ev) {
    var h = U.top(); if (!h) return;
    if (ev.key === 'Escape') { ev.preventDefault(); if (h.opts.close !== false) h.close(); else if (h.btns && h.btns.length === 1) { h.close(true); h.btns[0].fn && h.btns[0].fn(h); } return; }
    if (h.opts.onKey && h.opts.onKey(ev, h)) return;
    var btns = h.btns || [];
    if (ev.key === 'Enter' && btns.length) {
      var def = btns.filter(function (b) { return b.cls && b.cls.indexOf('primary') >= 0 && !b.disabled; })[0] || (btns.length === 1 ? btns[0] : null);
      if (def) { ev.preventDefault(); if (!def.keep) h.close(true); def.fn && def.fn(h); }
      return;
    }
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.key && b.key.toLowerCase() === ev.key.toLowerCase() && !b.disabled) { ev.preventDefault(); if (!b.keep) h.close(true); b.fn && b.fn(h); return; }
    }
  };
  U.alert = function (title, text, cb) {
    return U.modal({ title: title || 'Notice', cls: 'narrow', html: '<p class="story">' + esc(text).replace(/\n/g, '<br>') + '</p>', buttons: [{ label: 'Continue', key: 'Enter', fn: function () { cb && cb(); } }], onClose: function () { cb && cb(); } });
  };
  U.confirm = function (title, text, yes, no) {
    return U.modal({ title: title, cls: 'narrow', html: '<p>' + esc(text) + '</p>', buttons: [{ label: 'Yes', key: 'Y', cls: 'primary', fn: function () { yes && yes(); } }, { label: 'No', key: 'N', fn: function () { no && no(); } }], onClose: function () { no && no(); } });
  };
  U.choice = function (title, text, opts, cls) {
    var list = el('div', 'menu');
    var p = el('p', 'story', esc(text).replace(/\n/g, '<br>'));
    var wrap = el('div'); wrap.appendChild(p); wrap.appendChild(list);
    var h = U.modal({ title: title, cls: cls || 'narrow', node: wrap, close: false });
    opts.forEach(function (o, i) {
      var b = el('button', 'btn' + (i === 0 ? ' primary' : ''), '<span class="key">' + (i + 1) + '</span>' + esc(o.label));
      b.disabled = !!o.disabled;
      b.onclick = function () { h.close(true); o.fn && o.fn(); };
      list.appendChild(b);
    });
    h.opts.onKey = function (ev) { var n = +ev.key; if (n >= 1 && n <= opts.length && !opts[n - 1].disabled) { h.close(true); opts[n - 1].fn && opts[n - 1].fn(); return true; } return false; };
    return h;
  };

  /* ---------- command bar ---------- */
  var CMDS = [
    { id: 'search', icon: 'search', label: 'Search', key: 'F', fn: function () { Game.search(); } },
    { id: 'listen', icon: 'listen', label: 'Listen', key: 'L', fn: function () { Game.listen(); } },
    { id: 'sneak', icon: 'sneak', label: 'Sneak', key: 'X', fn: function () { Game.toggleSneak(); } },
    { id: 'enter', icon: 'enter', label: 'Enter', key: '↵', fn: function () { Overland.enterSite(); }, wild: true },
    { id: 'camp', icon: 'camp', label: 'Camp', key: 'R', fn: function () { U.camp(); } },
    { id: 'cast', icon: 'cast', label: 'Cast', key: 'C', fn: function () { U.castMenu(); } },
    { id: 'map', icon: 'map', label: 'Map', key: 'M', fn: function () { MapView.open(); } },
    { id: 'journal', icon: 'journal', label: 'Journal', key: 'J', fn: function () { Journal.open(); } },
    { id: 'beast', icon: 'beast', label: 'Bestiary', key: 'B', fn: function () { Bestiary.open(); } },
    { id: 'pad', icon: 'pad', label: 'Pad', key: '', fn: function () { NavPad.toggle(); } },
    { id: 'menu', icon: 'menu', label: 'Menu', key: 'Esc', fn: function () { U.menu(); } }
  ];
  U.updateCmdbar = function () {
    var bar = $('cmdbar'); bar.innerHTML = '';
    var wild = Game.mode === 'wild';
    CMDS.forEach(function (c) {
      if (c.wild && !wild) return;
      if (wild && (c.id === 'listen' || c.id === 'sneak' || c.id === 'search')) return;
      var b = el('div', 'cmd' + ((c.id === 'sneak' && Game.S && Game.S.sneak) || (c.id === 'pad' && Game.S && Game.S.opts.navpad) ? ' on' : ''), U.icon(c.icon) + '<span class="lbl">' + esc(c.label) + (c.key ? ' <span class="k">' + esc(c.key) + '</span>' : '') + '</span>');
      b.onclick = function () { if (!U.hasModal() && (Game.mode === 'explore' || Game.mode === 'wild')) c.fn(); };
      bar.appendChild(b);
    });
  };

  /* ---------- roster and status ---------- */
  U.statusText = function (pc) {
    var s = pc.status;
    if (s.dead) return ['DEAD', 'bad'];
    if (s.stone) return ['STONE', 'bad'];
    if (pc.hp <= 0) return [pc.hp < 0 ? 'DYING' : 'DOWN', 'bad'];
    if (s.poisoned) return ['POISONED', 'bad'];
    if (s.paralyzed) return ['PARALYSED', 'bad'];
    if (s.diseased) return ['DISEASED', 'warn'];
    if (s.blind) return ['BLIND', 'warn'];
    if (Rules.canTrain(pc)) return ['TRAIN', 'warn'];
    return ['', ''];
  };
  U.renderRoster = function () {
    var r = $('roster'); r.innerHTML = '';
    if (!Game.S) return;
    Game.party().forEach(function (pc, i) {
      var d = Data.derive(pc), st = U.statusText(pc);
      var row = el('div', 'pc');
      var por = Figures.portrait(pc, 48);
      var c = el('canvas'); c.width = por.width; c.height = por.height; c.getContext('2d').drawImage(por, 0, 0);
      if (pc.status.dead || pc.status.stone) { var cx = c.getContext('2d'); cx.fillStyle = pc.status.stone ? 'rgba(160,160,160,0.7)' : 'rgba(0,0,0,0.6)'; cx.fillRect(0, 0, c.width, c.height); }
      row.appendChild(c);
      var pct = Math.max(0, pc.hp / pc.hpMax);
      var col = pct > 0.5 ? 'var(--hp-ok)' : pct > 0.25 ? 'var(--hp-low)' : 'var(--hp-crit)';
      var info = el('div', 'info',
        '<div class="nm">' + (i + 1) + '. ' + esc(pc.name) + '</div>' +
        '<div class="sub">' + Rules.RACES[pc.race].name + ' ' + Rules.CLASSES[pc.cls].name + ' ' + pc.lvl + '</div>' +
        '<div class="bars"><span>HP <b style="color:' + col + '">' + pc.hp + '</b>/' + pc.hpMax + '</span><span>AC <b>' + d.ac + '</b></span><span class="st ' + st[1] + '">' + st[0] + '</span></div>' +
        '<div class="hpbar"><div style="width:' + Math.round(pct * 100) + '%;background:' + col + '"></div></div>');
      row.appendChild(info);
      row.onclick = function () { if (Game.mode === 'explore' || Game.mode === 'wild') U.sheet(i); };
      r.appendChild(row);
    });
  };
  U.updateStatus = function () {
    var s = $('status'); if (!Game.S) return;
    var where = Game.whereText();
    var adv = Game.adv ? Game.adv.name : '';
    var extra = '';
    if (Game.mode === 'wild') extra = '<br>Terrain: <b>' + Overland.terrainName() + '</b> · Fatigue ' + Math.round(Game.S.fatigue) + 'h';
    else if (Game.map) extra = '<br>Facing <b>' + Modules.DIR_NAMES[Game.pos.dir] + '</b>' + (Game.S.sneak ? ' · <span class="cyan">Sneaking</span>' : '');
    s.innerHTML = '<b>' + esc(where) + '</b> <span class="dim">(' + esc(adv) + ')</span><br>' + Game.timeText() + ' · Gold <b>' + fmt(Game.S.gold) + '</b>' + extra;
    $('viewtitle').textContent = where;
  };
  U.updateCompass = function () {
    var c = $('compass');
    c.textContent = Game.mode === 'explore' ? 'NESW'[Game.pos.dir] : '';
    U.updateStatus();
  };
  U.updateAll = function () { U.renderRoster(); U.updateStatus(); U.updateCompass(); U.updateCmdbar(); };

  /* ---------- title screen ---------- */
  function titleArt() {
    var c = $('titleart'), ctx = c.getContext('2d'), w = c.width, h = c.height;
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0420'); g.addColorStop(0.55, '#5a1a30'); g.addColorStop(0.75, '#d06020'); g.addColorStop(1, '#201008');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var r = Modules.rng('title');
    for (var i = 0; i < 90; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.6) + ')'; ctx.fillRect(r() * w, r() * h * 0.45, 1.5, 1.5); }
    ctx.fillStyle = '#ffd080'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.66, 40, 0, 7); ctx.fill();
    var layers = [['#3a1420', 0.62, 60], ['#24101a', 0.72, 40], ['#120810', 0.84, 26]];
    layers.forEach(function (L, li) {
      ctx.fillStyle = L[0]; ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += 8) ctx.lineTo(x, h * L[1] - Math.abs(Math.sin(x / (90 + li * 30) + li) * L[2]) - r() * 6);
      ctx.lineTo(w, h); ctx.fill();
    });
    // a ruined tower with a burning window
    ctx.fillStyle = '#080408'; ctx.fillRect(w * 0.18, h * 0.3, 34, h * 0.6); ctx.beginPath(); ctx.moveTo(w * 0.18 - 6, h * 0.3); ctx.lineTo(w * 0.18 + 17, h * 0.18); ctx.lineTo(w * 0.18 + 40, h * 0.3); ctx.fill();
    ctx.fillStyle = '#ff9020'; ctx.fillRect(w * 0.18 + 13, h * 0.4, 8, 12);
    // embers rising
    for (var e = 0; e < 70; e++) { ctx.fillStyle = 'rgba(255,' + (100 + r() * 120 | 0) + ',20,' + (0.4 + r() * 0.6) + ')'; ctx.fillRect(r() * w, h * 0.5 + r() * h * 0.5, 2, 2); }
    // a little adventuring party on the ridge
    var px = w * 0.45, py = h * 0.8;
    for (var p = 0; p < 6; p++) { ctx.fillStyle = '#000'; ctx.fillRect(px + p * 12, py - 14 - (p % 2) * 2, 5, 14); ctx.beginPath(); ctx.arc(px + p * 12 + 2.5, py - 17 - (p % 2) * 2, 3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 6, py - 12); ctx.lineTo(px + 10, py - 26); ctx.stroke();
  }
  U.title = function () {
    Game.mode = 'title';
    U.closeAll();
    U.show('title');
    titleArt();
    var m = $('titlemenu'); m.innerHTML = '';
    var add = function (label, fn, cls, dis) { var b = el('button', 'btn ' + (cls || ''), esc(label)); b.disabled = !!dis; b.onclick = fn; m.appendChild(b); };
    if (Game.hasSave()) add('Continue', function () { var s = Game.saveMeta('auto') ? 'auto' : null; if (!s) { U.loadMenu(); return; } Game.load(s); }, 'primary');
    add('New Company', function () { U.partyCreate(); }, Game.hasSave() ? '' : 'primary');
    add('Quick Start (Ready-made Company)', function () { Game.startNew(U.pregenParty()); });
    add('Load Game', function () { U.loadMenu(); }, '', !Game.hasSave());
    add('How to Play', function () { U.howToPlay(); });
  };

  /* ---------- character creation ---------- */
  U.KITS = {
    fighter: ['long_sword', 'ring_mail', 'shield', 'spear'], paladin: ['long_sword', 'chain', 'shield'], ranger: ['long_sword', 'short_sword', 'short_bow', 'arrow', 'studded'],
    mage: ['quarterstaff', 'dart'], cleric: ['mace', 'ring_mail', 'shield', 'sling', 'bullet'], thief: ['short_sword', 'leather', 'sling', 'bullet', 'dagger']
  };
  U.equipKit = function (pc, kit) {
    kit.forEach(function (id) {
      var inst = Data.makeItem(id);
      Game.addToInv(pc, inst);
    });
    // equip what we can: weapon first, then armour, shield
    pc.inv.forEach(function (inst) {
      var it = Data.items[inst.id];
      if (!Data.equippable(it)) return;
      if (it.slot === 'weapon' && Data.weapon(pc) && !(pc.cls === 'ranger' && !it.missile && it.hands === 1)) return;
      if (it.slot === 'weapon' && it.missile && Data.weapon(pc)) return;
      Data.equip(pc, inst);
    });
  };
  U.pregenParty = function () {
    return Data.PREGENS.map(function (p) {
      var pc = Rules.newCharacter({ name: p.name, race: p.race, cls: p.cls, gender: p.gender, align: p.align, ab: p.ab, spec: p.spec, color: p.color, portrait: Modules.hash(p.name) % 100000 });
      if (p.book) pc.book = p.book.slice();
      U.equipKit(pc, p.kit);
      return pc;
    });
  };
  U.partyCreate = function () {
    var roster = [];
    var draw = function (h) {
      var wrap = el('div');
      wrap.appendChild(el('p', '', 'Build a company of up to six adventurers. A balanced party has fighters to hold the line, a cleric to heal, a mage for spells and a thief for locks and traps.'));
      var list = el('div', 'list');
      if (!roster.length) list.appendChild(el('p', 'dim', 'No adventurers yet.'));
      roster.forEach(function (pc, i) {
        var row = el('div', 'row');
        var c = el('canvas'); var por = Figures.portrait(pc, 40); c.width = por.width; c.height = por.height; c.style.width = '34px'; c.getContext('2d').drawImage(por, 0, 0);
        row.appendChild(c);
        row.appendChild(el('div', 'grow', '<b>' + esc(pc.name) + '</b> — ' + Rules.RACES[pc.race].name + ' ' + Rules.CLASSES[pc.cls].name + ' (' + pc.align + ') · HP ' + pc.hpMax + '<br><span class="small">STR ' + Rules.strText(pc.ab.str, pc.ab.strEx) + ' DEX ' + pc.ab.dex + ' CON ' + pc.ab.con + ' INT ' + pc.ab.int + ' WIS ' + pc.ab.wis + ' CHA ' + pc.ab.cha + '</span>'));
        var del = el('button', 'btn danger', 'Remove'); del.onclick = function () { roster.splice(i, 1); h.body.innerHTML = ''; h.body.appendChild(draw(h)); h.setButtons(buttons(h)); };
        row.appendChild(del);
        list.appendChild(row);
      });
      wrap.appendChild(list);
      return wrap;
    };
    var buttons = function (h) {
      return [
        { label: 'Create Character', key: 'C', keep: true, disabled: roster.length >= 6, fn: function () { U.createChar(function (pc) { if (pc) roster.push(pc); h.body.innerHTML = ''; h.body.appendChild(draw(h)); h.setButtons(buttons(h)); }); } },
        { label: 'Ready-made Company', key: 'R', keep: true, fn: function () { roster = U.pregenParty(); h.body.innerHTML = ''; h.body.appendChild(draw(h)); h.setButtons(buttons(h)); } },
        { label: 'Begin', key: 'B', cls: 'primary', disabled: !roster.length, fn: function () { Game.startNew(roster); } }
      ];
    };
    var h = U.modal({ title: 'Form a Company', cls: 'wide', html: '', onClose: function () { if (Game.mode === 'title') U.title(); } });
    h.body.appendChild(draw(h)); h.setButtons(buttons(h));
  };
  U.createChar = function (done) {
    var rng = Math.random;
    var st = { name: '', gender: rng() < 0.5 ? 'm' : 'f', race: 'human', cls: 'fighter', align: 'NG', raw: Rules.rollAbilities(), mods: {}, portrait: Math.floor(rng() * 100000), spec: 'long_sword' };
    st.name = Data.NAMES[st.gender][Math.floor(rng() * 30)];
    var finalAb = function () {
      var ab = Rules.applyRace(st.raw, st.race);
      var r = Rules.RACES[st.race];
      Rules.ABILS.forEach(function (a) {
        var lo = r.min[a] || 3, hi = r.max[a] || 18;
        var v = Rules.clamp(ab[a] + (st.mods[a] || 0), lo, hi);
        st.mods[a] = v - ab[a];  // keep adjustments within the racial limits
        ab[a] = v;
      });
      return ab;
    };
    var h = U.modal({ title: 'Create a Character', cls: 'wide', html: '', onClose: function () { done(null); } });
    var render = function () {
      var ab = finalAb();
      var classes = Rules.allowedClasses(st.race);
      if (classes.indexOf(st.cls) < 0) st.cls = classes[0];
      var aligns = Rules.allowedAligns(st.cls);
      if (aligns.indexOf(st.align) < 0) st.align = aligns[0];
      var w = el('div');
      var top = el('div', 'cols');
      var left = el('div');
      left.innerHTML = '<label class="dim">Name</label>';
      var inp = el('input'); inp.type = 'text'; inp.maxLength = 18; inp.value = st.name; inp.oninput = function () { st.name = inp.value; };
      left.appendChild(inp);
      var gen = el('div', 'tabs'); gen.style.marginTop = '6px';
      [['m', 'Male'], ['f', 'Female']].forEach(function (g) { var b = el('button', 'btn' + (st.gender === g[0] ? ' sel' : ''), g[1]); b.onclick = function () { st.gender = g[0]; render(); }; gen.appendChild(b); });
      left.appendChild(gen);
      left.appendChild(el('div', 'dim', 'Portrait'));
      var pors = el('div', 'portraits');
      for (var i = 0; i < 6; i++) (function (seed) {
        var fake = { race: st.race, gender: st.gender, cls: st.cls, portrait: seed };
        var por = Figures.portrait(fake, 56), c = el('canvas' + '');
        c.width = por.width; c.height = por.height; c.getContext('2d').drawImage(por, 0, 0);
        if (seed === st.portrait) c.className = 'sel';
        c.onclick = function () { st.portrait = seed; render(); };
        pors.appendChild(c);
      })(i === 0 ? st.portrait : (st.portrait * 7 + i * 7919) % 100000);
      left.appendChild(pors);
      top.appendChild(left);
      var right = el('div');
      right.appendChild(el('div', 'dim', 'Race'));
      var rg = el('div', 'choicegrid');
      Rules.RACE_ORDER.forEach(function (r) { var b = el('button', 'btn' + (st.race === r ? ' sel' : ''), Rules.RACES[r].name); b.onclick = function () { st.race = r; render(); }; rg.appendChild(b); });
      right.appendChild(rg);
      right.appendChild(el('p', 'small', esc(Rules.RACES[st.race].desc) + ' Move ' + Rules.RACES[st.race].move + '.'));
      right.appendChild(el('div', 'dim', 'Class'));
      var cg = el('div', 'choicegrid');
      Rules.CLASS_ORDER.forEach(function (c) {
        var allowed = classes.indexOf(c) >= 0, meets = Rules.meetsReq(c, ab);
        var b = el('button', 'btn' + (st.cls === c ? ' sel' : ''), Rules.CLASSES[c].name + (allowed && !meets ? ' *' : ''));
        b.disabled = !allowed;
        b.title = allowed ? (meets ? '' : 'Ability scores too low') : 'Not open to this race';
        b.onclick = function () { st.cls = c; render(); };
        cg.appendChild(b);
      });
      right.appendChild(cg);
      var cd = Rules.CLASSES[st.cls];
      var reqTxt = Object.keys(cd.req).map(function (k) { return k.toUpperCase() + ' ' + cd.req[k]; }).join(', ');
      right.appendChild(el('p', 'small', esc(cd.desc) + ' Requires ' + reqTxt + '. Hit die d' + cd.hd + '. Max level for ' + Rules.RACES[st.race].name.toLowerCase() + 's: ' + Math.min(20, Rules.raceMaxLevel(st.race, st.cls)) + '.'));
      right.appendChild(el('div', 'dim', 'Alignment'));
      var ag = el('div', 'choicegrid');
      aligns.forEach(function (a) { var b = el('button', 'btn' + (st.align === a ? ' sel' : ''), Rules.ALIGN_NAMES[a]); b.onclick = function () { st.align = a; render(); }; ag.appendChild(b); });
      right.appendChild(ag);
      top.appendChild(right);
      w.appendChild(top);
      // abilities
      w.appendChild(el('h3', '', 'Ability Scores'));
      var abg = el('div', 'abil');
      Rules.ABILS.forEach(function (a) {
        var d = el('div');
        var val = a === 'str' && ab.str === 18 && cd.group === 'warrior' ? '18/**' : ab[a];
        d.innerHTML = '<span>' + Rules.ABIL_NAMES[a] + '</span><b>' + val + '</b>';
        var minus = el('button', 'btn', '−'), plus = el('button', 'btn', '+');
        minus.style.minHeight = plus.style.minHeight = '26px'; minus.style.padding = plus.style.padding = '0 8px';
        minus.onclick = function () { st.mods[a] = (st.mods[a] || 0) - 1; render(); };
        plus.onclick = function () { st.mods[a] = (st.mods[a] || 0) + 1; render(); };
        d.appendChild(minus); d.appendChild(plus);
        abg.appendChild(d);
      });
      w.appendChild(abg);
      var roll = el('button', 'btn', 'Roll Again'); roll.onclick = function () { st.raw = Rules.rollAbilities(); st.mods = {}; render(); };
      w.appendChild(roll);
      var meets = Rules.meetsReq(st.cls, ab);
      w.appendChild(el('span', meets ? 'green' : 'red', meets ? ' Scores meet the class requirements.' : ' Scores do not meet ' + cd.name + ' requirements (' + reqTxt + ').'));
      if (st.cls === 'fighter') {
        w.appendChild(el('h3', '', 'Weapon Specialization'));
        var sel = el('div', 'choicegrid');
        ['long_sword', 'broad_sword', 'bastard_sword', 'two_handed_sword', 'battle_axe', 'mace', 'morning_star', 'flail', 'war_hammer', 'spear', 'halberd', 'long_bow', 'short_bow', 'light_crossbow', 'scimitar', 'short_sword', 'dagger'].forEach(function (wid) {
          var b = el('button', 'btn' + (st.spec === wid ? ' sel' : ''), Data.items[wid].name); b.onclick = function () { st.spec = wid; render(); }; sel.appendChild(b);
        });
        w.appendChild(sel);
        w.appendChild(el('p', 'small', 'Specialists gain +1 to hit, +2 damage and extra attacks with their chosen weapon.'));
      }
      h.body.innerHTML = ''; h.body.appendChild(w);
      h.setButtons([
        { label: 'Cancel', fn: function () { done(null); } },
        { label: 'Create', cls: 'primary', disabled: !meets, fn: function () {
          var fab = finalAb();
          if (st.cls === 'fighter' || st.cls === 'paladin' || st.cls === 'ranger') { if (fab.str === 18) fab.strEx = Rules.d(100); }
          var pc = Rules.newCharacter({ name: (st.name || 'Nameless').trim(), race: st.race, cls: st.cls, gender: st.gender, align: st.align, ab: fab, spec: st.cls === 'fighter' ? st.spec : null, portrait: st.portrait });
          var kit = U.KITS[st.cls].slice();
          if (st.cls === 'fighter' && st.spec) { kit[0] = st.spec; if (Data.items[st.spec].ammo) kit.push(Data.items[st.spec].ammo === 'arrow' ? 'arrow' : 'quarrel'); if (Data.items[st.spec].hands === 2) kit = kit.filter(function (k) { return k !== 'shield'; }); }
          U.equipKit(pc, kit);
          if (pc.cls === 'mage') {
            var pool = Rules.spellsOf('wiz', 1).map(function (s) { return s.id; }).filter(function (id) { return ['knock'].indexOf(id) < 0; });
            pc.book = ['magic_missile'];
            while (pc.book.length < 4) { var sp = pool[Math.floor(Math.random() * pool.length)]; if (pc.book.indexOf(sp) < 0) pc.book.push(sp); }
          }
          pc.color = Math.floor(Math.random() * 6);
          done(pc);
        } }
      ]);
    };
    render();
  };

  /* ---------- character sheet ---------- */
  var sheetTab = 'stats';
  U.sheet = function (i, tab) {
    if (tab) sheetTab = tab;
    var party = Game.party(), pc = party[i];
    if (!pc) return;
    var h = U.modal({ title: pc.name, cls: 'wide', html: '' });
    var render = function () {
      pc = party[i];
      h.el.querySelector('.mt span').textContent = (i + 1) + '. ' + pc.name;
      h.body.innerHTML = '';
      var tabs = el('div', 'tabs');
      [['stats', 'Statistics'], ['items', 'Items'], ['spells', 'Spells']].forEach(function (t) {
        var b = el('button', 'btn' + (sheetTab === t[0] ? ' sel' : ''), t[1]);
        b.onclick = function () { sheetTab = t[0]; render(); };
        tabs.appendChild(b);
      });
      var nav = el('span'); nav.style.marginLeft = 'auto';
      var prev = el('button', 'btn', '◀'), next = el('button', 'btn', '▶');
      prev.onclick = function () { i = (i + party.length - 1) % party.length; render(); };
      next.onclick = function () { i = (i + 1) % party.length; render(); };
      nav.appendChild(prev); nav.appendChild(next); tabs.appendChild(nav);
      h.body.appendChild(tabs);
      if (sheetTab === 'stats') h.body.appendChild(statsView(pc));
      else if (sheetTab === 'items') h.body.appendChild(itemsView(pc, render));
      else h.body.appendChild(spellsView(pc, render));
      U.renderRoster();
    };
    h.opts.onKey = function (ev) {
      if (ev.key === 'ArrowRight') { i = (i + 1) % party.length; render(); return true; }
      if (ev.key === 'ArrowLeft') { i = (i + party.length - 1) % party.length; render(); return true; }
      if (ev.key >= '1' && ev.key <= '6' && party[+ev.key - 1]) { i = +ev.key - 1; render(); return true; }
      if (ev.key === 'Tab') { ev.preventDefault(); sheetTab = sheetTab === 'stats' ? 'items' : sheetTab === 'items' ? 'spells' : 'stats'; render(); return true; }
      return false;
    };
    render();
    return h;
  };
  function statsView(pc) {
    var d = Data.derive(pc), w = el('div');
    var head = el('div', 'sheethead');
    var por = Figures.portrait(pc, 72), c = el('canvas'); c.width = por.width; c.height = por.height; c.getContext('2d').drawImage(por, 0, 0);
    head.appendChild(c);
    var next = pc.lvl < 20 ? Rules.xpFor(pc.cls, pc.lvl + 1) : null;
    var st = U.statusText(pc);
    head.appendChild(el('div', '', '<div class="gold" style="font-size:18px;font-weight:bold">' + esc(pc.name) + '</div>' +
      '<div>' + (pc.gender === 'f' ? 'Female' : 'Male') + ' ' + Rules.RACES[pc.race].name + ' ' + Rules.CLASSES[pc.cls].name + ', level ' + pc.lvl + '</div>' +
      '<div class="dim">' + Rules.ALIGN_NAMES[pc.align] + '</div>' +
      '<div>Experience <b>' + fmt(pc.xp) + '</b>' + (next ? ' / ' + fmt(next) + ' for level ' + (pc.lvl + 1) : '') + (Rules.primeBonus(pc) ? ' <span class="green">(+10% prime bonus)</span>' : '') + '</div>' +
      (st[0] ? '<div class="' + (st[1] === 'bad' ? 'red' : 'gold') + '"><b>' + st[0] + '</b></div>' : '') +
      (pc.drained ? '<div class="red">Drained of ' + pc.drained + ' level(s)</div>' : '')));
    w.appendChild(head);
    var abg = el('div', 'abil');
    Rules.ABILS.forEach(function (a) {
      var v = a === 'str' ? Rules.strText(d.str, d.strEx) : pc.ab[a];
      var boosted = a === 'str' && (d.str !== pc.ab.str || d.strEx !== (pc.ab.strEx || 0));
      abg.appendChild(el('div', '', '<span>' + Rules.ABIL_NAMES[a] + '</span><b' + (boosted ? ' class="cyan"' : '') + '>' + v + '</b>'));
    });
    w.appendChild(abg);
    var cols = el('div', 'cols');
    var wIt = d.weaponIt;
    var dmgTxt = d.dmgDice[0] + (d.dmgBonus ? (d.dmgBonus > 0 ? '+' : '') + d.dmgBonus : '') + ' / ' + d.dmgDice[1] + (d.dmgBonus ? (d.dmgBonus > 0 ? '+' : '') + d.dmgBonus : '');
    var c1 = el('div', 'kv',
      kv('Hit points', pc.hp + ' / ' + pc.hpMax) + kv('Armour class', d.ac + ' <span class="dim">(rear ' + d.acRear + ')</span>') +
      kv('THAC0', d.thac0 + ' <span class="dim">(' + (d.hit >= 0 ? '+' : '') + d.hit + ' to hit)</span>') +
      kv('Weapon', (wIt ? esc(wIt.name) : 'Bare hands') + (d.offIt ? ' &amp; ' + esc(d.offIt.name) : '') + (d.spec ? ' <span class="gold">[specialized]</span>' : '')) +
      kv('Damage', dmgTxt + ' <span class="dim">(S-M / L)</span>') + kv('Attacks / round', Rules.rateText(d.rate)) +
      (d.missile ? kv('Ammunition', d.ammo ? esc(Data.itemName(d.ammo)) : '<span class="red">none</span>') : '') +
      kv('Movement', d.move + ' <span class="dim">(' + d.cmove + ' squares in battle)</span>') +
      kv('Carried', d.weight + ' / ' + d.carry + ' lb <span class="dim">' + d.enc + '</span>') +
      (pc.spec ? kv('Specialization', esc(Data.items[pc.spec] ? Data.items[pc.spec].name : pc.spec)) : '') +
      (d.mr ? kv('Magic resistance', d.mr + '%') : '') +
      (d.resist.length ? kv('Resists', d.resist.join(', ')) : ''));
    cols.appendChild(c1);
    var c2 = el('div');
    var sv = '<table class="t"><tr><th>Saving throw</th><th class="r">Needs</th></tr>';
    Rules.SAVE_NAMES.forEach(function (n, i) { sv += '<tr><td>' + n + '</td><td class="r"><b>' + d.saves[i] + '</b></td></tr>'; });
    sv += '</table>';
    c2.innerHTML = sv;
    if (d.thief) {
      var th = '<table class="t" style="margin-top:6px"><tr><th>Thief skill</th><th class="r">%</th></tr>';
      Rules.THIEF_SKILLS.forEach(function (s) { th += '<tr><td>' + Rules.THIEF_NAMES[s] + '</td><td class="r">' + d.thief[s] + '</td></tr>'; });
      th += '<tr><td>Backstab</td><td class="r">×' + Rules.backstabMult(pc.lvl) + '</td></tr></table>';
      c2.innerHTML += th;
    }
    var extras = [];
    if (pc.cls === 'paladin') extras.push('Holy fervour: attacks as often as a weapon specialist', 'Lay on hands: heals ' + 2 * pc.lvl + ' hp once a day', (pc.lvl >= 3 ? 'Turns undead as a level ' + (pc.lvl - 2) + ' cleric' : 'Turns undead from level 3 (as a cleric two levels lower)'), 'Holy fury: +1 to hit and +2 damage against evil', 'Aura: evil creatures suffer -2 to hit', '+2 on all saving throws');
    if (pc.cls === 'ranger') extras.push('Fights with a weapon in each hand without penalty', '+4 to hit against giant-kin and goblin-kin', 'Hard to surprise in the wild');
    if (pc.cls === 'cleric') extras.push('Turns undead as a level ' + pc.lvl + ' cleric');
    if (pc.cls === 'fighter') extras.push('May specialize in a weapon for extra attacks and damage');
    if (pc.cls === 'mage') extras.push('Learns spells from scrolls (' + Rules.intTable(pc.ab.int).learn + '% chance), max spell level ' + Rules.intTable(pc.ab.int).maxLvl);
    if (extras.length) c2.innerHTML += '<div style="margin-top:6px" class="small">' + extras.map(esc).join('<br>') + '</div>';
    cols.appendChild(c2);
    w.appendChild(cols);
    if (Rules.canTrain(pc)) w.appendChild(el('p', 'gold', pc.name + ' has enough experience for level ' + (pc.lvl + 1) + '. Visit a training hall (' + fmt(Rules.trainCost(pc)) + ' gp).'));
    return w;
  }
  function kv(k, v) { return '<div class="k">' + k + '</div><div class="v">' + v + '</div>'; }
  U.itemDesc = function (inst, pc) {
    var it = Data.items[inst.id], parts = [];
    if (!it) return '';
    if (it.type === 'weapon') parts.push('Damage ' + it.dmg[0] + ' / ' + it.dmg[1] + (it.plus ? ' (+' + it.plus + ')' : '') + (it.hands === 2 ? ', two-handed' : '') + (it.missile ? ', missile (range ' + it.range + ')' : it.thrown ? ', can be thrown' : ''));
    if (it.type === 'ammo') parts.push('Ammunition, damage ' + it.dmg[0] + (it.plus ? ' (+' + it.plus + ')' : '') + (it.silver ? ', silver' : ''));
    if (it.type === 'armor') parts.push('Armour class ' + (it.ac - (it.plus || 0)));
    if (it.type === 'shield') parts.push('Improves AC by ' + (1 + (it.plus || 0)));
    if (it.fx) { var f = it.fx; if (f.ac) parts.push('AC +' + f.ac); if (f.save) parts.push('+' + f.save + ' to saves'); if (f.acSet) parts.push('Grants AC ' + f.acSet); if (f.strSet) parts.push('Strength ' + (f.strEx ? '18/00' : f.strSet)); }
    if (it.charges) parts.push((inst.c != null ? inst.c : it.charges) + ' charges');
    parts.push('Value ' + fmt(Data.value(inst)) + ' gp, weight ' + (it.weight || 0) + ' lb');
    var desc = it.desc ? '<div class="story">' + esc(it.desc) + '</div>' : '';
    var use = '';
    if (pc && Data.equippable(it)) { var cu = Data.canUse(pc, it); if (!cu.ok) use = '<div class="red">' + esc(cu.why) + '</div>'; }
    return '<div><b class="gold">' + esc(Data.itemName(inst)) + '</b></div><div class="small">' + parts.join(' · ') + '</div>' + desc + use;
  };
  function itemsView(pc, rerender) {
    var w = el('div');
    var d = Data.derive(pc);
    w.appendChild(el('div', 'small', 'Carrying ' + d.weight + ' / ' + d.carry + ' lb (' + d.enc + '). Party gold: <b class="gold">' + fmt(Game.S.gold) + '</b>'));
    var tbl = el('table', 't');
    tbl.innerHTML = '<tr><th></th><th>Item</th><th class="r">Wt</th></tr>';
    var detail = el('div', 'frame'); detail.style.padding = '8px'; detail.style.marginTop = '8px';
    detail.innerHTML = '<span class="dim">Select an item.</span>';
    var selIdx = -1;
    pc.inv.forEach(function (inst, idx) {
      var it = Data.items[inst.id]; if (!it) return;
      var tr = el('tr', 'click');
      var slot = inst.eq ? (inst.off ? 'Off' : it.slot === 'weapon' ? 'Wpn' : it.slot === 'armor' ? 'Arm' : it.slot === 'shield' ? 'Shd' : 'Eq') : '';
      var cu = Data.equippable(it) ? Data.canUse(pc, it).ok : true;
      tr.innerHTML = '<td class="eq">' + slot + '</td><td' + (cu ? '' : ' class="red"') + '>' + esc(Data.itemName(inst)) + '</td><td class="r dim">' + Math.round(Data.weight(inst) * 10) / 10 + '</td>';
      tr.onclick = function () { selIdx = idx; Array.prototype.forEach.call(tbl.querySelectorAll('tr'), function (r) { r.classList.remove('sel'); }); tr.classList.add('sel'); showDetail(); };
      tbl.appendChild(tr);
    });
    if (!pc.inv.length) w.appendChild(el('p', 'dim', 'Carrying nothing.'));
    w.appendChild(tbl);
    w.appendChild(detail);
    function showDetail() {
      var inst = pc.inv[selIdx]; if (!inst) return;
      var it = Data.items[inst.id];
      detail.innerHTML = U.itemDesc(inst, pc);
      var acts = el('div'); acts.style.marginTop = '6px';
      var add = function (label, fn, dis) { var b = el('button', 'btn', label); b.disabled = !!dis; b.onclick = fn; acts.appendChild(b); };
      if (Data.equippable(it)) add(inst.eq ? 'Unequip' : 'Equip', function () { var err = Data.equip(pc, inst); if (err) U.toast(err); rerender(); }, !inst.eq && !Data.canUse(pc, it).ok);
      if (it.type === 'potion' || (it.type === 'scroll' && it.use) || it.type === 'book') {
        var combatOnly = it.use && (it.use.combat || it.use.fx === 'throwdmg');
        add(it.type === 'book' ? 'Study' : it.type === 'scroll' ? 'Read' : 'Drink', function () { U.useItem(pc, selIdx, rerender); }, combatOnly);
      }
      if (it.type === 'scroll' && it.spell) {
        var sp = Rules.SPELLS[it.spell];
        if (it.scls === 'wiz' && pc.cls === 'mage') {
          var known = pc.book.indexOf(it.spell) >= 0, maxL = Rules.intTable(pc.ab.int).maxLvl;
          var failed = pc.learnFail[it.spell] === pc.lvl;
          var why = known ? 'Already in spellbook' : sp.lvl > maxL ? 'Too complex for this mind' : failed ? 'Failed until next level' : '';
          add('Learn' + (why ? ' (' + why + ')' : ' (' + Rules.intTable(pc.ab.int).learn + '%)'), function () { U.learnScroll(pc, selIdx, rerender); }, !!why);
        }
        var canCast = (it.scls === 'wiz' && pc.cls === 'mage') || (it.scls === 'pri' && (pc.cls === 'cleric' || pc.cls === 'paladin' || pc.cls === 'ranger'));
        if (canCast && sp.camp) add('Cast from scroll', function () { U.castCamp(pc, it.spell, function () { pc.inv.splice(selIdx, 1); }, rerender); });
      }
      if (it.type === 'wand' && it.spell && Rules.SPELLS[it.spell].camp) add('Use', function () { U.castCamp(pc, it.spell, function () { inst.c = (inst.c || 1) - 1; if (inst.c <= 0) pc.inv.splice(selIdx, 1); }, rerender); });
      add('Give…', function () { U.giveItem(pc, selIdx, rerender); });
      if (Game.mode === 'explore') add('Drop', function () {
        if (Data.items[inst.id].type === 'quest') { U.toast('You had better keep that.'); return; }
        pc.inv.splice(selIdx, 1); inst.eq = false; Game.dropHere([inst]); rerender();
      });
      detail.appendChild(acts);
    }
    return w;
  }
  U.giveItem = function (pc, idx, rerender) {
    var inst = pc.inv[idx];
    var opts = Game.party().filter(function (p) { return p !== pc && Game.alive(p); }).map(function (p) {
      return { label: p.name, fn: function () { pc.inv.splice(idx, 1); inst.eq = false; inst.off = false; Game.addToInv(p, inst); rerender(); } };
    });
    opts.push({ label: 'Cancel', fn: function () { } });
    U.choice('Give ' + Data.itemName(inst), 'Give it to whom?', opts);
  };
  U.useItem = function (pc, idx, rerender) {
    var inst = pc.inv[idx], it = Data.items[inst.id], u = it.use || {};
    var consume = function () { if (it.stack && inst.q > 1) inst.q--; else pc.inv.splice(idx, 1); };
    if (u.fx === 'ability') {
      consume(); pc.ab[u.ab] = Math.min(19, pc.ab[u.ab] + 1); Game.passTime(7 * 1440);
      U.log(pc.name + ' studies the ' + it.name + ' for a week. ' + Rules.ABIL_NAMES[u.ab] + ' rises to ' + pc.ab[u.ab] + '!', 'good');
      rerender(); return;
    }
    var pickTarget = function (fn) {
      var opts = Game.party().map(function (p) { return { label: p.name + ' (' + p.hp + '/' + p.hpMax + ')', fn: function () { fn(p); }, disabled: p.status.dead || p.status.stone }; });
      opts.push({ label: 'Cancel', fn: function () { } });
      U.choice(it.name, 'Who will drink it?', opts);
    };
    pickTarget(function (t) {
      consume();
      if (u.fx === 'heal') { var amt = u.dice === 'full' ? t.hpMax : Rules.roll(u.dice); t.hp = Math.min(t.hpMax, Math.max(t.hp, 0) + amt); U.log(t.name + ' is healed.', 'good'); }
      if (u.fx === 'cure') { (u.cures || []).forEach(function (s) { delete t.status[s]; }); if (u.heal) t.hp = Math.min(t.hpMax, t.hp + Rules.roll(u.heal)); if (t.hp < 1 && !t.status.dead) t.hp = 1; U.log(t.name + ' feels much better.', 'good'); }
      if (u.fx === 'restore') { if (t.drained) { t.drained--; t.xp = Rules.xpFor(t.cls, t.lvl + 1); Rules.gainLevel(t); U.log(t.name + ' regains a lost level!', 'good'); } else U.log('Nothing happens.', 'dim'); }
      rerender(); U.renderRoster();
    });
  };
  U.learnScroll = function (pc, idx, rerender) {
    var inst = pc.inv[idx], it = Data.items[inst.id];
    var chance = Rules.intTable(pc.ab.int).learn;
    if (Rules.d(100) <= chance) {
      pc.book.push(it.spell); pc.inv.splice(idx, 1);
      U.log(pc.name + ' copies ' + Rules.SPELLS[it.spell].name + ' into the spellbook. The scroll crumbles.', 'good');
    } else {
      pc.learnFail[it.spell] = pc.lvl;
      U.log(pc.name + ' cannot grasp the spell. (Try again after gaining a level.)', 'warn');
    }
    rerender();
  };
  function spellsView(pc, rerender) {
    var w = el('div'), ct = Rules.casterType(pc.cls);
    if (!ct) { w.appendChild(el('p', 'dim', Rules.CLASSES[pc.cls].name + 's do not cast spells.')); return w; }
    var d = Data.derive(pc), slots = d.slots;
    if (!slots.length) { w.appendChild(el('p', 'dim', pc.cls === 'paladin' ? 'Paladins gain priest spells at level 9.' : pc.cls === 'ranger' ? 'Rangers gain priest spells at level 8.' : 'No spells yet.')); }
    else {
      w.appendChild(el('div', '', 'Spell slots: ' + slots.map(function (n, i) { return '<b>' + n + '</b> of level ' + (i + 1); }).join(', ')));
      var tbl = '<table class="t"><tr><th>Memorized</th><th>Lvl</th><th class="r">Status</th></tr>';
      (pc.mem || []).forEach(function (m) { var sp = Rules.SPELLS[m.id]; tbl += '<tr><td>' + esc(sp.name) + '</td><td>' + sp.lvl + '</td><td class="r ' + (m.used ? 'dim' : 'green') + '">' + (m.used ? 'cast' : 'ready') + '</td></tr>'; });
      tbl += '</table>';
      w.appendChild(el('div', '', tbl));
      var b = el('button', 'btn', 'Choose spells to memorize…'); b.onclick = function () { U.memorize(pc, rerender); };
      w.appendChild(b);
    }
    if (ct === 'wiz') {
      w.appendChild(el('h3', '', 'Spellbook'));
      var book = pc.book.slice().sort(function (a, b) { return Rules.SPELLS[a].lvl - Rules.SPELLS[b].lvl || Rules.SPELLS[a].name.localeCompare(Rules.SPELLS[b].name); });
      var list = el('div', 'list');
      book.forEach(function (id) { var sp = Rules.SPELLS[id]; list.appendChild(el('div', 'row', '<span class="gold">' + sp.lvl + '</span><div class="grow"><b>' + esc(sp.name) + '</b><br><span class="small">' + esc(sp.desc) + '</span></div>')); });
      w.appendChild(list);
    }
    return w;
  }
  U.memorize = function (pc, done) {
    var ct = Rules.casterType(pc.cls), slots = Data.derive(pc).slots;
    var plan = (pc.memPlan || []).slice();
    var h = U.modal({ title: 'Memorize — ' + pc.name, cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      h.body.appendChild(el('p', 'small', 'Choose which spells fill your slots. New choices are committed to memory after the next full rest.'));
      slots.forEach(function (n, li) {
        var lvl = li + 1;
        var known = ct === 'wiz' ? pc.book.filter(function (id) { return Rules.SPELLS[id].lvl === lvl; }) : Rules.spellsOf('pri', lvl).map(function (s) { return s.id; });
        var cnt = plan.filter(function (id) { return Rules.SPELLS[id].lvl === lvl; }).length;
        h.body.appendChild(el('h3', '', 'Level ' + lvl + ' — ' + cnt + ' / ' + n));
        var list = el('div', 'list');
        known.forEach(function (id) {
          var sp = Rules.SPELLS[id], have = plan.filter(function (x) { return x === id; }).length;
          var row = el('div', 'row', '<div class="grow"><b>' + esc(sp.name) + '</b> <span class="small">' + esc(sp.desc) + '</span></div><b class="gold" style="min-width:20px;text-align:center">' + have + '</b>');
          var minus = el('button', 'btn', '−'), plus = el('button', 'btn', '+');
          minus.disabled = !have; plus.disabled = cnt >= n;
          minus.onclick = function () { plan.splice(plan.indexOf(id), 1); render(); };
          plus.onclick = function () { plan.push(id); render(); };
          row.appendChild(minus); row.appendChild(plus);
          list.appendChild(row);
        });
        if (!known.length) list.appendChild(el('p', 'dim', 'No spells of this level known.'));
        h.body.appendChild(list);
      });
      h.setButtons([{ label: 'Done', cls: 'primary', fn: function () { pc.memPlan = plan; if (done) done(); } }]);
    };
    render();
  };

  /* ---------- casting outside combat ---------- */
  U.castMenu = function () {
    if (!(Game.mode === 'explore' || Game.mode === 'wild')) return;
    var casters = Game.ableParty().filter(function (pc) { return (pc.mem || []).some(function (m) { return !m.used && Rules.SPELLS[m.id].camp; }); });
    var lay = Game.ableParty().filter(function (pc) { return pc.cls === 'paladin' && pc.layDay !== Math.floor(Game.S.time / 1440); });
    if (!casters.length && !lay.length) { U.toast('No one has a spell that can be cast now.'); return; }
    var opts = casters.map(function (pc) { return { label: pc.name, fn: function () { U.castList(pc); } }; });
    lay.forEach(function (pc) { opts.push({ label: pc.name + ': Lay on Hands (' + 2 * pc.lvl + ' hp)', fn: function () { U.layOnHands(pc); } }); });
    opts.push({ label: 'Cancel', fn: function () { } });
    U.choice('Cast a Spell', 'Who will cast?', opts);
  };
  U.layOnHands = function (pc) {
    var opts = Game.party().filter(function (p) { return Game.alive(p) && p.hp < p.hpMax; }).map(function (t) { return { label: t.name + ' (' + t.hp + '/' + t.hpMax + ')', fn: function () { pc.layDay = Math.floor(Game.S.time / 1440); t.hp = Math.min(t.hpMax, Math.max(0, t.hp) + 2 * pc.lvl); U.log(pc.name + ' lays hands on ' + t.name + '.', 'good'); U.renderRoster(); } }; });
    if (!opts.length) { U.toast('No one is wounded.'); return; }
    opts.push({ label: 'Cancel', fn: function () { } });
    U.choice('Lay on Hands', 'Heal whom?', opts);
  };
  U.castList = function (pc) {
    var seen = {}, opts = [];
    pc.mem.forEach(function (m) {
      var sp = Rules.SPELLS[m.id];
      if (m.used || !sp.camp || seen[m.id]) return;
      seen[m.id] = 1;
      var n = pc.mem.filter(function (x) { return x.id === m.id && !x.used; }).length;
      opts.push({ label: sp.name + ' (' + n + ')', fn: function () { U.castCamp(pc, m.id, function () { Game.useSpellSlot(pc, m.id); }, function () { }); } });
    });
    opts.push({ label: 'Cancel', fn: function () { } });
    U.choice(pc.name + ' casts…', 'Choose a spell.', opts);
  };
  // camp spells: heal, cure, raise, restore, knock, findtraps
  U.castCamp = function (pc, spellId, consume, after) {
    var sp = Rules.SPELLS[spellId], kind = sp.camp;
    var targets = function (filter, fn) {
      var list = Game.party().filter(filter);
      if (!list.length) { U.toast('No one needs that.'); return; }
      var opts = list.map(function (t) { return { label: t.name + ' (' + t.hp + '/' + t.hpMax + ') ' + U.statusText(t)[0], fn: function () { fn(t); } }; });
      opts.push({ label: 'Cancel', fn: function () { } });
      U.choice(sp.name, 'Cast on whom?', opts);
    };
    if (kind === 'heal') targets(function (t) { return Game.alive(t) && (t.hp < t.hpMax); }, function (t) {
      consume(); var amt = sp.heal === 'full' ? t.hpMax : Rules.roll(sp.heal);
      t.hp = Math.min(t.hpMax, Math.max(0, t.hp) + amt);
      (sp.cures || []).forEach(function (s) { delete t.status[s]; });
      U.log(pc.name + ' casts ' + sp.name + ' on ' + t.name + '.', 'good'); U.renderRoster(); after();
    });
    else if (kind === 'cure') targets(function (t) { return Game.alive(t) && (sp.cures || []).some(function (s) { return t.status[s]; }); }, function (t) {
      consume(); sp.cures.forEach(function (s) { delete t.status[s]; }); if (t.hp < 1) t.hp = 1;
      U.log(pc.name + ' casts ' + sp.name + ' on ' + t.name + '.', 'good'); U.renderRoster(); after();
    });
    else if (kind === 'raise') targets(function (t) { return t.status.dead; }, function (t) {
      consume();
      var ok = sp.full || Rules.d(100) <= Rules.conTable(t.ab.con).survive;
      if (ok) { delete t.status.dead; t.hp = sp.full ? t.hpMax : 1; if (!sp.full) t.ab.con = Math.max(3, t.ab.con - 1); U.log(t.name + ' returns to life!', 'good'); }
      else U.log(t.name + '\'s spirit does not return.', 'bad');
      U.renderRoster(); after();
    });
    else if (kind === 'restore') targets(function (t) { return t.drained > 0; }, function (t) {
      consume(); t.drained = 0; while (t.lvl < Rules.levelForXp(t.cls, t.xp + 1) && t.lvl < 20) Rules.gainLevel(t);
      U.log(t.name + '\'s lost vitality is restored.', 'good'); U.renderRoster(); after();
    });
    else if (kind === 'knock') {
      if (Game.mode !== 'explore' || !Game.unlockAhead()) { U.toast('Face a locked door to cast Knock.'); return; }
      consume(); U.log(pc.name + ' casts Knock. The lock springs open.', 'good'); after();
    } else if (kind === 'findtraps') {
      if (Game.mode !== 'explore') { U.toast('There are no traps out here.'); return; }
      consume(); var n = 0, map = Game.map;
      Object.keys(map.feat).forEach(function (k) { var f = map.feat[k]; if (f.t === 'trap' && !Game.ms.traps[k] && Math.abs(f.x - Game.pos.x) + Math.abs(f.y - Game.pos.y) <= 6) { Game.ms.traps[k] = 'found'; n++; } });
      U.log(pc.name + ' casts Find Traps. ' + (n ? n + ' trap(s) glow red.' : 'No traps are revealed.'), n ? 'warn' : 'dim'); Game.redraw(); after();
    }
  };

  /* ---------- loot ---------- */
  U.loot = function (title, gp, items, done) {
    if (gp) { Game.S.gold += gp; U.log('The party takes ' + fmt(gp) + ' gold.', 'good'); }
    items = items.slice();
    if (!items.length) { if (gp) U.alert(title, 'You find ' + fmt(gp) + ' gold pieces.', function () { done([]); }); else done([]); return; }
    var target = 'auto';
    var h = U.modal({ title: title, cls: 'wide', html: '', onClose: function () { done(items); } });
    var render = function () {
      h.body.innerHTML = '';
      if (gp) h.body.appendChild(el('p', 'gold', 'You find ' + fmt(gp) + ' gold pieces.'));
      var who = el('div', 'tabs');
      who.appendChild(el('span', 'dim', 'Give to: '));
      [{ id: 'auto', name: 'Whoever can carry it' }].concat(Game.living()).forEach(function (p) {
        var b = el('button', 'btn' + (target === (p.id === 'auto' ? 'auto' : p) ? ' sel' : ''), esc(p.name));
        b.onclick = function () { target = p.id === 'auto' ? 'auto' : p; render(); };
        who.appendChild(b);
      });
      h.body.appendChild(who);
      var list = el('div', 'list');
      items.forEach(function (inst, i) {
        var row = el('div', 'row');
        row.appendChild(el('div', 'grow', U.itemDesc(inst, target === 'auto' ? null : target)));
        var b = el('button', 'btn', 'Take'); b.onclick = function () { take(i); render(); };
        row.appendChild(b);
        list.appendChild(row);
      });
      if (!items.length) list.appendChild(el('p', 'dim', 'Nothing left.'));
      h.body.appendChild(list);
      h.setButtons([{ label: 'Take All', key: 'A', cls: 'primary', keep: true, disabled: !items.length, fn: function () { while (items.length) take(0); render(); } }, { label: items.length ? 'Leave the rest' : 'Done', key: 'Enter', fn: function () { done(items); } }]);
    };
    var take = function (i) {
      var inst = items[i];
      if (target === 'auto') { var who = Game.giveItem(inst); if (who) U.log(who.name + ' takes ' + Data.itemName(inst) + '.', 'dim'); }
      else Game.addToInv(target, inst);
      items.splice(i, 1);
      if (Data.items[inst.id] && Data.items[inst.id].type === 'quest') Journal.onItem(inst.id);
    };
    render();
  };

  /* ---------- events ---------- */
  U.event = function (f, done) {
    if (f.choices) {
      U.choice(f.title || 'Something Happens', f.text, f.choices.map(function (ch) {
        return { label: ch.label, fn: function () { if (ch.text) U.alert(f.title, ch.text, function () { done(ch); }); else done(ch); } };
      }), 'narrow');
    } else U.alert(f.title || 'Something Happens', f.text, function () { done(null); });
  };

  /* ---------- buildings in town ---------- */
  U.building = function (f) {
    if (!f) return;
    var band = Game.adv.band;
    if (f.shop === 'smith' || f.shop === 'magic' || f.shop === 'trader') U.shop(f.name, f.shop, band, f.extra);
    else if (f.shop === 'temple') U.temple(f.name, band);
    else if (f.shop === 'inn') U.inn(f.name, band);
    else if (f.shop === 'tavern') U.tavern(f.name);
    else if (f.shop === 'train') U.train(f.name);
    else if (f.shop === 'hall') U.hall(f.name);
    else U.alert(f.name || 'A House', 'The door is barred. No one answers your knock.');
  };
  function priceMul() {
    var best = 0; Game.living().forEach(function (p) { best = Math.max(best, p.ab.cha); });
    return Rules.chaTable(best).price;
  }
  U.shop = function (name, kind, band, extra) {
    var stock = Data.shopStock(kind, band).concat(extra || []);
    stock = stock.filter(function (id, i) { return stock.indexOf(id) === i; });
    var tab = 'buy', who = Game.living()[0], mul = priceMul();
    var h = U.modal({ title: name, cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      var tabs = el('div', 'tabs');
      [['buy', 'Buy'], ['sell', 'Sell']].forEach(function (t) { var b = el('button', 'btn' + (tab === t[0] ? ' sel' : ''), t[1]); b.onclick = function () { tab = t[0]; render(); }; tabs.appendChild(b); });
      tabs.appendChild(el('span', 'gold', '&nbsp; Party gold: ' + fmt(Game.S.gold)));
      h.body.appendChild(tabs);
      var whoRow = el('div', 'tabs');
      whoRow.appendChild(el('span', 'dim', tab === 'buy' ? 'For: ' : 'From: '));
      Game.living().forEach(function (p) { var b = el('button', 'btn' + (who === p ? ' sel' : ''), esc(p.name)); b.onclick = function () { who = p; render(); }; whoRow.appendChild(b); });
      h.body.appendChild(whoRow);
      var tbl = el('table', 't');
      if (tab === 'buy') {
        tbl.innerHTML = '<tr><th>Item</th><th class="r">Price</th><th></th></tr>';
        stock.forEach(function (id) {
          var it = Data.items[id], inst = Data.makeItem(id), price = Math.max(1, Math.round(Data.value(inst) * mul));
          var cu = Data.equippable(it) ? Data.canUse(who, it) : { ok: true };
          var tr = el('tr');
          tr.innerHTML = '<td' + (cu.ok ? '' : ' class="dim"') + '>' + esc(Data.itemName(inst)) + (it.type === 'scroll' && it.spell && who.cls === 'mage' && who.book.indexOf(it.spell) >= 0 ? ' <span class="dim">(known)</span>' : '') + '</td><td class="r">' + fmt(price) + '</td>';
          var td = el('td', 'r'), b = el('button', 'btn', 'Buy'); b.disabled = Game.S.gold < price;
          b.onclick = function () { Game.S.gold -= price; Game.addToInv(who, inst); U.log(who.name + ' buys ' + Data.itemName(inst) + '.', 'dim'); render(); U.updateStatus(); };
          var info = el('button', 'btn', '?'); info.onclick = function () { U.alert(it.name, (it.desc || '') + '\n' + U.itemDesc(inst, who).replace(/<[^>]+>/g, ' ')); };
          td.appendChild(info); td.appendChild(b); tr.appendChild(td);
          tbl.appendChild(tr);
        });
      } else {
        tbl.innerHTML = '<tr><th>Item</th><th class="r">Offer</th><th></th></tr>';
        who.inv.forEach(function (inst, idx) {
          var it = Data.items[inst.id];
          var offer = it.type === 'gem' || it.type === 'jewel' ? Data.value(inst) : Math.floor(Data.value(inst) / 2);
          var tr = el('tr');
          tr.innerHTML = '<td>' + (inst.eq ? '<span class="eq">E</span> ' : '') + esc(Data.itemName(inst)) + '</td><td class="r">' + (offer ? fmt(offer) : '—') + '</td>';
          var td = el('td', 'r'), b = el('button', 'btn', 'Sell'); b.disabled = !offer || it.type === 'quest';
          b.onclick = function () { who.inv.splice(idx, 1); Game.S.gold += offer; U.log(who.name + ' sells ' + Data.itemName(inst) + ' for ' + fmt(offer) + ' gp.', 'dim'); render(); U.updateStatus(); U.renderRoster(); };
          td.appendChild(b); tr.appendChild(td); tbl.appendChild(tr);
        });
        if (!who.inv.length) h.body.appendChild(el('p', 'dim', who.name + ' has nothing to sell.'));
        var gems = el('button', 'btn', 'Sell all gems & jewellery (party)');
        gems.onclick = function () { var tot = 0; Game.party().forEach(function (p) { p.inv = p.inv.filter(function (i) { var t = Data.items[i.id].type; if (t === 'gem' || t === 'jewel') { tot += Data.value(i); return false; } return true; }); }); Game.S.gold += tot; U.log('Sold gems and jewellery for ' + fmt(tot) + ' gp.', 'good'); render(); U.updateStatus(); };
        h.body.appendChild(gems);
      }
      h.body.appendChild(tbl);
      h.setButtons([{ label: 'Leave', key: 'Enter', fn: function () { } }]);
    };
    render();
  };
  U.temple = function (name, band) {
    var mul = priceMul(), h = U.modal({ title: name, cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      h.body.appendChild(el('p', 'story', 'Incense drifts beneath a vaulted roof. A priest in pale robes offers the temple\'s services — for a donation. Party gold: ' + fmt(Game.S.gold) + '.'));
      var tbl = el('table', 't');
      tbl.innerHTML = '<tr><th>Companion</th><th>Condition</th><th>Service</th></tr>';
      Game.party().forEach(function (pc) {
        var tr = el('tr'), st = U.statusText(pc);
        tr.innerHTML = '<td>' + esc(pc.name) + '</td><td>' + pc.hp + '/' + pc.hpMax + ' <span class="' + st[1] + '">' + st[0] + '</span></td>';
        var td = el('td');
        Data.TEMPLE.forEach(function (s) {
          if (s.band && band < s.band) return;
          var need = s.kind === 'heal' ? (Game.alive(pc) && pc.hp < pc.hpMax) : s.kind === 'cure' ? s.cures.some(function (c) { return pc.status[c]; }) : s.kind === 'stone' ? pc.status.stone : s.kind === 'raise' ? pc.status.dead : s.kind === 'restore' ? pc.drained > 0 : false;
          if (!need) return;
          var cost = Math.round(s.cost * mul * (s.kind === 'raise' || s.kind === 'restore' ? Math.max(1, pc.lvl / 2) : 1));
          var b = el('button', 'btn', esc(s.name) + ' (' + fmt(cost) + ')'); b.disabled = Game.S.gold < cost;
          b.onclick = function () {
            Game.S.gold -= cost;
            if (s.kind === 'heal') pc.hp = s.dice === 'full' ? pc.hpMax : Math.min(pc.hpMax, Math.max(0, pc.hp) + Rules.roll(s.dice));
            if (s.kind === 'cure') { s.cures.forEach(function (c) { delete pc.status[c]; }); if (pc.hp < 1) pc.hp = 1; }
            if (s.kind === 'stone') { delete pc.status.stone; pc.hp = Math.max(1, pc.hp); }
            if (s.kind === 'raise') { delete pc.status.dead; pc.hp = 1; pc.ab.con = Math.max(3, pc.ab.con - 1); U.log(pc.name + ' lives again! (Constitution falls to ' + pc.ab.con + '.)', 'good'); }
            if (s.kind === 'restore') { pc.drained = 0; while (pc.lvl < Rules.levelForXp(pc.cls, pc.xp + 1) && pc.lvl < 20) Rules.gainLevel(pc); pc.xp = Math.max(pc.xp, Rules.xpFor(pc.cls, pc.lvl)); }
            render(); U.renderRoster(); U.updateStatus();
          };
          td.appendChild(b);
        });
        if (!td.childNodes.length) td.innerHTML = '<span class="dim">—</span>';
        tr.appendChild(td); tbl.appendChild(tr);
      });
      h.body.appendChild(tbl);
      var wounded = Game.party().filter(function (p) { return Game.alive(p) && p.hp < p.hpMax; });
      var tot = 0; wounded.forEach(function (p) { tot += Math.ceil((p.hpMax - Math.max(0, p.hp)) / 8) * Math.round(30 * mul); });
      var all = el('button', 'btn primary', 'Heal everyone (' + fmt(tot) + ' gp)'); all.disabled = !wounded.length || Game.S.gold < tot;
      all.onclick = function () { Game.S.gold -= tot; wounded.forEach(function (p) { p.hp = p.hpMax; }); render(); U.renderRoster(); U.updateStatus(); };
      h.body.appendChild(all);
      h.setButtons([{ label: 'Leave', key: 'Enter', fn: function () { } }]);
    };
    render();
  };
  U.inn = function (name, band) {
    var n = Game.living().length, cost = Math.max(1, Math.round(n * 2 * band * priceMul()));
    U.choice(name, 'The innkeeper wipes the bar. "A hot meal, a soft bed and a locked door — ' + cost + ' gold a night for the lot of you."', [
      { label: 'Rest the night (' + cost + ' gp)', disabled: Game.S.gold < cost, fn: function () {
        Game.S.gold -= cost; Game.rest(8, true); Game.party().forEach(function (p) { if (Game.alive(p) && p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + p.lvl); });
        U.log('The party rests at ' + name + '. Spells are restored.', 'good'); U.updateAll(); Game.autosave();
      } },
      { label: 'Stay until healed (' + cost + ' gp a night)', disabled: Game.S.gold < cost, fn: function () {
        var nights = 0, logs = [];
        while (nights < 30 && Game.S.gold >= cost && Game.living().some(function (p) { return p.hp < p.hpMax; })) {
          logs = logs.concat(Game.castHealing());
          if (!Game.living().some(function (p) { return p.hp < p.hpMax; })) break;
          Game.S.gold -= cost; Game.rest(8, true); Game.party().forEach(function (p) { if (Game.alive(p) && p.hp > 0) p.hp = Math.min(p.hpMax, p.hp + p.lvl); }); Game.passTime(16 * 60); nights++;
        }
        Game.party().forEach(function (p) { if (Game.alive(p) && p.hp > 0) Game.rememorize(p); });
        U.log('The party stays ' + nights + ' night(s) at ' + name + '.', 'good'); U.updateAll(); Game.autosave();
      } },
      { label: 'Leave', fn: function () { } }
    ]);
  };
  U.tavern = function (name) {
    var rumours = Game.adv.rumours || [];
    U.choice(name, 'The common room is loud with talk and song. A round of drinks might loosen a few tongues.', [
      { label: 'Buy a round (5 gp)', disabled: Game.S.gold < 5, fn: function () {
        Game.S.gold -= 5; Game.passTime(30);
        var r = rumours[Math.floor(Math.random() * rumours.length)] || 'Nobody has anything interesting to say.';
        Game.note('Rumour heard at ' + name + ': ' + r);
        U.alert('A Rumour', '"' + r + '"', function () { U.updateStatus(); });
      } },
      { label: 'Leave', fn: function () { } }
    ]);
  };
  U.train = function (name) {
    var h = U.modal({ title: name, cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      h.body.appendChild(el('p', 'story', 'Veteran masters drill recruits in the yard. Training for a new level costs 100 gp per level being trained for. Party gold: ' + fmt(Game.S.gold) + '.'));
      var list = el('div', 'list');
      Game.party().forEach(function (pc) {
        var row = el('div', 'row');
        var can = Rules.canTrain(pc), cost = Rules.trainCost(pc), max = Math.min(20, Rules.raceMaxLevel(pc.race, pc.cls));
        var next = pc.lvl < max ? Rules.xpFor(pc.cls, pc.lvl + 1) : null;
        row.appendChild(el('div', 'grow', '<b>' + esc(pc.name) + '</b> — ' + Rules.CLASSES[pc.cls].name + ' ' + pc.lvl + '<br><span class="small">XP ' + fmt(pc.xp) + (next ? ' / ' + fmt(next) : ' (maximum level for ' + Rules.RACES[pc.race].name.toLowerCase() + 's)') + '</span>'));
        var b = el('button', 'btn' + (can ? ' primary' : ''), can ? 'Train (' + fmt(cost) + ' gp)' : 'Not ready');
        b.disabled = !can || Game.S.gold < cost || !Game.alive(pc);
        b.onclick = function () {
          Game.S.gold -= cost;
          var res = Rules.gainLevel(pc);
          pc._trainNoted = false;
          U.log(pc.name + ' reaches level ' + pc.lvl + '! (+' + res.hp + ' hp)', 'good');
          Game.note(pc.name + ' trained to level ' + pc.lvl + '.');
          if (Rules.casterType(pc.cls)) Game.autoMemorize(pc);
          if (pc.cls === 'mage') U.newSpellChoice(pc, render); else render();
          U.renderRoster(); U.updateStatus();
        };
        row.appendChild(b);
        list.appendChild(row);
      });
      h.body.appendChild(list);
      h.setButtons([{ label: 'Leave', key: 'Enter', fn: function () { } }]);
    };
    render();
  };
  U.newSpellChoice = function (pc, after) {
    var slots = Data.derive(pc).slots, maxL = slots.length;
    var pool = Rules.SPELL_LIST.filter(function (s) { return s.cls === 'wiz' && s.lvl <= maxL && pc.book.indexOf(s.id) < 0; });
    if (!pool.length) { after(); return; }
    pool.sort(function (a, b) { return b.lvl - a.lvl; });
    var opts = pool.slice(0, 12).map(function (s) { return { label: 'Level ' + s.lvl + ': ' + s.name, fn: function () { pc.book.push(s.id); U.log(pc.name + ' adds ' + s.name + ' to the spellbook.', 'good'); Game.autoMemorize(pc); after(); } }; });
    U.choice('A New Spell', pc.name + '\'s studies bear fruit. Choose a spell to inscribe in the spellbook.', opts, 'wide');
  };
  U.hall = function (name) {
    var adv = Game.adv, a = Game.advState();
    var h = U.modal({ title: name, cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      h.body.appendChild(el('p', 'story', esc(adv.intro || (adv.giver + ' greets you.'))));
      var list = el('div', 'list');
      adv.quests.forEach(function (q) {
        var st = a.quests[q.id] || 'new';
        var met = Journal.goalMet(q);
        var row = el('div', 'row');
        var tag = st === 'rewarded' ? '<span class="pill done">completed</span>' : st === 'active' ? (met ? '<span class="pill done">ready to report</span>' : '<span class="pill">accepted</span>') : '<span class="pill">offered</span>';
        row.appendChild(el('div', 'grow', '<b class="' + (q.main ? 'gold' : '') + '">' + esc(q.title) + '</b> ' + (q.main ? '<span class="pill main">main</span>' : '') + ' ' + tag + '<br><span class="small">' + esc(q.text) + '<br>Reward: ' + fmt(q.reward.gp) + ' gp and ' + fmt(q.reward.xp) + ' experience</span>'));
        if (st === 'new') { var b = el('button', 'btn primary', 'Accept'); b.onclick = function () { a.quests[q.id] = 'active'; Game.note('Accepted the commission "' + q.title + '" from ' + adv.giver + '.'); render(); }; row.appendChild(b); }
        else if (st === 'active' && met) {
          var r = el('button', 'btn primary', 'Report'); r.onclick = function () { Journal.reward(q); render(); };
          row.appendChild(r);
        }
        list.appendChild(row);
      });
      h.body.appendChild(list);
      h.setButtons([{ label: 'Accept all', disabled: !adv.quests.some(function (q) { return !a.quests[q.id]; }), keep: true, fn: function () { adv.quests.forEach(function (q) { if (!a.quests[q.id]) { a.quests[q.id] = 'active'; Game.note('Accepted the commission "' + q.title + '".'); } }); render(); } }, { label: 'Leave', key: 'Enter', fn: function () { } }]);
    };
    render();
  };
  U.hamlet = function (site) {
    U.choice(site.name, 'A handful of cottages, a well and a small inn. The folk here are wary but welcoming.', [
      { label: 'Stay at the inn', fn: function () { U.inn('The ' + site.name + ' Inn', Game.adv.band); } },
      { label: 'Trade with the villagers', fn: function () { U.shop(site.name + ' Trading Post', 'trader', Game.adv.band); } },
      { label: 'Ask about the area', fn: function () { var r = Game.adv.rumours; var t = r[Math.floor(Math.random() * r.length)]; Game.note('Rumour heard at ' + site.name + ': ' + t); U.alert(site.name, '"' + t + '"'); } },
      { label: 'Leave', fn: function () { } }
    ]);
  };

  /* ---------- camping ---------- */
  U.camp = function () {
    if (!Game.S || !(Game.mode === 'explore' || Game.mode === 'wild')) return;
    if (!Game.canCamp()) { U.toast('You cannot camp in town. Find an inn.'); return; }
    var safe = Game.mode === 'wild' ? Overland.safeHere() : false;
    var hpLine = Game.party().map(function (p) { return p.name + ' ' + p.hp + '/' + p.hpMax; }).join(' · ');
    U.choice('Camp', (safe ? 'This is a safe place to rest. ' : 'Resting here may attract wandering monsters. ') + '\n' + hpLine, [
      { label: 'Rest for the night (8 hours)', fn: function () {
        var intr = Game.rest(8, safe, function (wasInterrupted) { if (!wasInterrupted) { U.log('The party rests for 8 hours. Spells are recovered.', 'good'); U.updateAll(); Game.autosave(); } });
        U.updateAll();
      } },
      { label: 'Rest until healed', fn: function () {
        Game.restUntilHealed(safe, function (logs, days, intr) {
          logs.slice(-6).forEach(function (l) { U.log(l, 'good'); });
          if (!intr) U.log('After ' + days + ' day(s) of rest the party is ' + (Game.living().some(function (p) { return p.hp < p.hpMax; }) ? 'as well as it will get here.' : 'fully healed.'), 'good');
          U.updateAll(); if (!intr) Game.autosave();
        });
      } },
      { label: 'Healers cast cures now', fn: function () { var l = Game.castHealing(); if (!l.length) U.log('No healing spells to spare, or no one needs them.', 'dim'); l.forEach(function (x) { U.log(x, 'good'); }); U.updateAll(); } },
      { label: 'Choose spells to memorize', fn: function () {
        var casters = Game.party().filter(function (p) { return Rules.casterType(p.cls) && Data.derive(p).slots.length; });
        if (!casters.length) { U.toast('No spellcasters.'); return; }
        U.choice('Memorize', 'Whose spells?', casters.map(function (p) { return { label: p.name, fn: function () { U.memorize(p); } }; }).concat([{ label: 'Cancel', fn: function () { } }]));
      } },
      { label: 'Break camp', fn: function () { } }
    ]);
  };

  /* ---------- menus ---------- */
  U.menu = function () {
    if (!Game.S) return;
    U.choice('Menu', Game.timeText() + ' — ' + Game.whereText(), [
      { label: 'Return to game', fn: function () { } },
      { label: 'Save game', fn: function () { U.saveMenu(); } },
      { label: 'Load game', fn: function () { U.loadMenu(); } },
      { label: 'Party', fn: function () { U.sheet(0); } },
      { label: 'Campaign (change adventure)', fn: function () { Campaign.open(false); } },
      { label: 'Options', fn: function () { U.options(); } },
      { label: 'How to play', fn: function () { U.howToPlay(); } },
      { label: 'Quit to title', fn: function () { U.confirm('Quit', 'Return to the title screen? Unsaved progress since the last autosave will be lost.', function () { U.title(); }); } }
    ]);
  };
  function slotLabel(slot) {
    var m = Game.saveMeta(slot);
    return (slot === 'auto' ? 'Autosave' : 'Slot ' + slot) + ': ' + (m ? m.where + ' — ' + m.time + ' — ' + m.party : 'empty');
  }
  U.saveMenu = function () {
    U.choice('Save Game', 'Choose a slot.', Game.SLOTS.map(function (s) { return { label: slotLabel(s), fn: function () { Game.save(s); } }; }).concat([{ label: 'Cancel', fn: function () { } }]), 'wide');
  };
  U.loadMenu = function () {
    var slots = ['auto'].concat(Game.SLOTS);
    U.choice('Load Game', 'Choose a saved game.', slots.map(function (s) { return { label: slotLabel(s), disabled: !Game.saveMeta(s), fn: function () { Game.load(s); } }; }).concat([{ label: 'Cancel', fn: function () { if (Game.mode === 'title') U.title(); } }]), 'wide');
  };
  U.options = function () {
    var o = Game.S.opts;
    U.choice('Options', 'Movement speed: ' + (o.speed === 2 ? 'fast' : o.speed === 0.6 ? 'slow' : 'normal') + '. On-screen movement pad: ' + (o.navpad ? 'on' : 'off') + '. Autosave: ' + (o.autoSave !== false ? 'on' : 'off') + '.', [
      { label: 'Movement speed: slow', fn: function () { o.speed = 0.6; } },
      { label: 'Movement speed: normal', fn: function () { o.speed = 1; } },
      { label: 'Movement speed: fast', fn: function () { o.speed = 2; } },
      { label: 'Toggle movement pad', fn: function () { NavPad.toggle(); } },
      { label: 'Toggle autosave', fn: function () { o.autoSave = o.autoSave === false; U.toast('Autosave ' + (o.autoSave ? 'on' : 'off')); } },
      { label: 'Done', fn: function () { } }
    ]);
  };
  U.gameOver = function () {
    if (U._over) return;
    U._over = true;
    U.closeAll();
    U.show('game');
    U.modal({ title: 'The Company Has Fallen', cls: 'narrow', close: false, html: '<p class="story">Darkness closes over your company. Their tale ends here — unless the fates allow another telling.</p>', buttons: [
      { label: 'Load a saved game', cls: 'primary', fn: function () { U._over = false; U.loadMenu(); } },
      { label: 'Return to title', fn: function () { U._over = false; U.title(); } }
    ] });
  };
  U.howToPlay = function () {
    var html = '<div class="howto">' +
      '<h3>Your company</h3><p>Lead a party of up to six adventurers. Each has six ability scores, a race, a class and an alignment. Click a portrait (or press <kbd>1</kbd>–<kbd>6</kbd>) for a full character sheet: statistics, saving throws, thief skills, equipment and spells.</p>' +
      '<h3>Exploring</h3><p>Move with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys: forward, turn left, back, turn right. <kbd>Q</kbd> and <kbd>E</kbd> sidestep. Walk into a door to open it. On a tablet or phone, turn on the movement pad from the command bar.</p>' +
      '<p><kbd>F</kbd> searches the squares around you for secret doors and traps — dwarves, elves and thieves are best at it. Found traps show on the map; a thief can try to disarm them. Unfound traps spring when stepped on.</p>' +
      '<p><kbd>L</kbd> listens at the door you face. <kbd>X</kbd> toggles sneaking: slower, but monsters are less likely to notice you, and a party that creeps up on a group strikes first (and thieves backstab).</p>' +
      '<p>Monsters stand watch on their own squares. Those that notice you may come hunting; guards hold their ground and their treasure. A group that has seen you will not let you slip past it.</p>' +
      '<h3>Commands</h3><p><kbd>R</kbd> camp · <kbd>C</kbd> cast a spell · <kbd>M</kbd> map · <kbd>J</kbd> journal · <kbd>B</kbd> bestiary · <kbd>P</kbd> campaign · <kbd>H</kbd> this page · <kbd>Esc</kbd> menu (save, load, options).</p>' +
      '<h3>Towns</h3><p>Walk into a building\'s door to enter it. Inns let you rest safely; temples heal and cure; smiths and apothecaries buy and sell; training halls raise your level (100 gp per level); taverns trade in rumours. The commission giver in each home town offers the adventure\'s main and side quests. Quest experience is paid at a quarter of the listed figure to each surviving member.</p>' +
      '<h3>The wilderness</h3><p>Leave town by its gate to travel the overland map. Terrain, night and fatigue slow you and raise the chance of encounters. Visit dungeons, hamlets, healers, holy sites, monster lairs and safe camps. Press <kbd>Enter</kbd> on a site to visit it again.</p>' +
      '<h3>Combat</h3><p>Battles are fought turn by turn on a tactical field. On each character\'s turn choose Move, Attack, Cast, Turn Undead, Use, Guard, Delay or Flee. Leaving a square next to an enemy invites a free attack. Thieves striking a foe from behind backstab. <b>Auto</b> lets the computer fight for one character, <b>Auto All</b> for the whole party. Experience is split among the survivors.</p>' +
      '<p>Keys in combat: arrows / numpad move · <kbd>A</kbd> attack · <kbd>C</kbd> cast · <kbd>T</kbd> turn undead · <kbd>U</kbd> use item · <kbd>G</kbd> guard · <kbd>D</kbd> delay · <kbd>Space</kbd> end turn · <kbd>Q</kbd> auto this character · <kbd>Tab</kbd> cycle targets · <kbd>Enter</kbd> confirm.</p>' +
      '<h3>Rules</h3><p>To hit, roll a d20 equal to or above THAC0 minus the target\'s armour class. Lower AC is better. Five saving throws protect against paralysis/poison/death, rods/staves/wands, petrification, breath weapons and spells. At 0 hit points a character falls; below 0 they are dying; at -10 they are dead.</p>' +
      '<p>Mages learn spells from scrolls (the Learn button is greyed out for spells already in the book). Priests may pray for any spell of a level they can cast. Spells are recovered by resting; "Rest until healed" lets healers cast their cures between rests.</p>' +
      '<h3>Saving</h3><p>The game autosaves when you change maps and after battles. Use the menu for five save slots. Saves stay in this browser.</p></div>';
    U.modal({ title: 'How to Play', cls: 'wide', html: html, buttons: [{ label: 'Close', key: 'Enter', fn: function () { } }] });
  };

  U.init = function () {
    U.show('title');
  };
  return U;
})();
