/* Emberfall — journal.js
 * The quest journal: commissions with their status and rewards, and dated
 * notes of everything notable the company has seen and done. */
var Journal = (function () {
  'use strict';
  var J = {};
  J.goalMet = function (q) {
    if (!q.goal) return false;
    if (q.goal.flag) return Game.flag(q.goal.flag);
    if (q.goal.item) return !!Game.questItemHolder(q.goal.item);
    return false;
  };
  J.reward = function (q) {
    var a = Game.advState();
    if (a.quests[q.id] === 'rewarded') return;
    if (q.goal.item) { var h = Game.questItemHolder(q.goal.item); if (h) h.pc.inv.splice(h.idx, 1); }
    a.quests[q.id] = 'rewarded';
    Game.S.gold += q.reward.gp;
    var each = Math.floor(q.reward.xp / 4);
    Game.living().forEach(function (pc) { Rules.addXp(pc, each); });
    UI.log('Commission complete: ' + q.title + '! The party receives ' + UI.fmt(q.reward.gp) + ' gp, and each survivor ' + UI.fmt(each) + ' experience.', 'good');
    Game.note('Completed the commission "' + q.title + '". Reward: ' + q.reward.gp + ' gp.');
    Game.checkTraining();
    if (q.main) {
      Game.note('The main quest of "' + Game.adv.name + '" is complete!');
      UI.alert('Victory!', 'With "' + q.title + '" fulfilled, ' + Game.adv.giver + ' declares the company heroes of the land. Your deeds will be sung for years.\n\nYou may stay and finish other commissions, or use the Campaign screen (press P, or the menu) to travel to a new adventure.');
    }
    UI.updateAll();
    Game.autosave();
  };
  J.onFlag = function (f) {
    var adv = Game.adv; if (!adv) return;
    adv.quests.forEach(function (q) { if (q.goal && q.goal.flag === f) UI.log('Objective complete: ' + q.title + '. Report to ' + adv.giver + '.', 'warn'); });
  };
  J.onItem = function (id) {
    var adv = Game.adv; if (!adv) return;
    adv.quests.forEach(function (q) { if (q.goal && q.goal.item === id) UI.log('You have found what you sought for "' + q.title + '". Return it to ' + adv.giver + '.', 'warn'); });
  };
  var tab = 'quests';
  J.open = function () {
    var h = UI.modal({ title: 'Journal', cls: 'wide', html: '' });
    var render = function () {
      h.body.innerHTML = '';
      var tabs = UI.el('div', 'tabs');
      [['quests', 'Commissions'], ['notes', 'Notes'], ['all', 'All Adventures']].forEach(function (t) { var b = UI.el('button', 'btn' + (tab === t[0] ? ' sel' : ''), t[1]); b.onclick = function () { tab = t[0]; render(); }; tabs.appendChild(b); });
      h.body.appendChild(tabs);
      var adv = Game.adv, a = Game.advState();
      if (tab === 'quests') {
        h.body.appendChild(UI.el('p', 'small', adv.name + ' — commissions from ' + adv.giver + '.'));
        var list = UI.el('div', 'list');
        adv.quests.forEach(function (q) {
          var st = a.quests[q.id], met = J.goalMet(q);
          var tag = st === 'rewarded' ? '<span class="pill done">completed</span>' : !st ? '<span class="pill">not yet accepted</span>' : met ? '<span class="pill done">report to ' + UI.esc(adv.giver) + '</span>' : '<span class="pill">in progress</span>';
          list.appendChild(UI.el('div', 'row', '<div class="grow"><b class="' + (q.main ? 'gold' : '') + '">' + UI.esc(q.title) + '</b> ' + (q.main ? '<span class="pill main">main</span>' : '') + ' ' + tag + '<br><span class="small">' + UI.esc(q.text) + ' Reward: ' + UI.fmt(q.reward.gp) + ' gp, ' + UI.fmt(q.reward.xp) + ' experience (a quarter to each survivor).</span></div>'));
        });
        h.body.appendChild(list);
      } else {
        var notes = Game.S.journal.filter(function (n) { return tab === 'all' || n.adv === Game.S.adv; }).slice().reverse();
        var tbl = '<table class="t"><tr><th>When</th><th>Note</th></tr>';
        notes.forEach(function (n) { tbl += '<tr><td class="dim" style="white-space:nowrap">' + Game.timeText(n.t) + (tab === 'all' && n.adv ? '<br>' + UI.esc(n.adv) : '') + '</td><td>' + UI.esc(n.text) + '</td></tr>'; });
        tbl += '</table>';
        h.body.appendChild(UI.el('div', '', notes.length ? tbl : '<p class="dim">No notes yet.</p>'));
      }
    };
    render();
  };
  return J;
})();
