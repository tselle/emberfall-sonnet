/* Emberfall — campaign.js
 * The campaign screen: move the company between the four hand-written
 * adventures and the fifty generated ones. Each adventure remembers its own
 * progress, so a company can come and go. */
var Campaign = (function () {
  'use strict';
  var C = {};
  function esc(s) { return UI.esc(s); }
  C.status = function (adv) {
    var a = Game.S.advs[adv.id];
    if (!a || !a.started) return 'new';
    var main = adv.quests.filter(function (q) { return q.main; })[0];
    if (main && a.quests[main.id] === 'rewarded') return 'done';
    return 'started';
  };
  C.partyLevel = function () {
    var l = Game.living();
    if (!l.length) return 1;
    return Math.round(l.reduce(function (s, p) { return s + p.lvl; }, 0) / l.length);
  };
  C.open = function (first) {
    var lvl = C.partyLevel();
    var band = Math.min(5, Math.max(1, Math.ceil(lvl / 4)));
    var showBand = band;
    var h = UI.modal({ title: 'The Emberwild — Choose an Adventure', cls: 'wide', html: '', close: !first });
    var render = function () {
      h.body.innerHTML = '';
      h.body.appendChild(UI.el('p', '', 'Your company (average level ' + lvl + ') may travel to any adventure. Four tales of the Emberwild are told by hand; fifty more are woven by the loom of fate. ' + (Game.S.adv ? 'Progress in each adventure is kept if you leave and return.' : '')));
      var tabs = UI.el('div', 'tabs');
      [['hand', 'The Emberwild Saga'], [1, 'Levels 1–4'], [2, 'Levels 5–8'], [3, 'Levels 9–12'], [4, 'Levels 13–16'], [5, 'Levels 17–20']].forEach(function (t) {
        var b = UI.el('button', 'btn' + (showBand === t[0] ? ' sel' : ''), t[1]);
        b.onclick = function () { showBand = t[0]; render(); };
        tabs.appendChild(b);
      });
      h.body.appendChild(tabs);
      var list = UI.el('div', 'list');
      Modules.list.filter(function (a) { return showBand === 'hand' ? a.hand : (!a.hand && a.band === showBand); }).forEach(function (adv) {
        var st = C.status(adv), cur = Game.S.adv === adv.id;
        var row = UI.el('div', 'row');
        var tag = st === 'done' ? '<span class="pill done">completed</span>' : st === 'started' ? '<span class="pill">in progress</span>' : '';
        if (cur) tag += ' <span class="pill main">you are here</span>';
        row.appendChild(UI.el('div', 'grow', '<b class="gold">' + esc(adv.id) + ' — ' + esc(adv.name) + '</b> ' + tag + '<br><span class="small">Levels ' + adv.levels + ' · ' + cap(adv.size) + ' · ' + esc(adv.blurb) + '</span>'));
        var b = UI.el('button', 'btn' + (cur ? '' : ' primary'), cur ? 'Here' : st === 'new' ? 'Begin' : 'Return');
        b.disabled = cur;
        b.onclick = function () {
          var go = function () { h.close(true); Game.startAdventure(adv.id); };
          var minL = parseInt(adv.levels, 10);
          if (lvl + 2 < minL) UI.confirm('A Dangerous Road', 'This adventure is meant for characters of level ' + adv.levels + '. Your company averages level ' + lvl + '. Go anyway?', go);
          else go();
        };
        row.appendChild(b);
        list.appendChild(row);
      });
      h.body.appendChild(list);
      if (showBand === 'hand') h.body.appendChild(UI.el('p', 'small', 'Suggested order: E0 → E1 → E2 → E3, then the generated adventures of the Veteran band and beyond.'));
    };
    if (!Game.S.adv) showBand = 'hand';
    render();
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  return C;
})();
