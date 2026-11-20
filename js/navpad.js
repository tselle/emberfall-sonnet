/* Emberfall — navpad.js
 * An optional on-screen movement pad for touch screens: turn, step and
 * sidestep buttons that repeat while held. */
var NavPad = (function () {
  'use strict';
  var N = {};
  var repeat = null;
  var LAYOUT = [['left', 'left'], ['fwd', 'up'], ['right', 'right'], ['sl', 'sl'], ['back', 'down'], ['sr', 'sr']];
  N.init = function () {
    var pad = document.getElementById('navpad');
    pad.innerHTML = '';
    LAYOUT.forEach(function (b) {
      var btn = document.createElement('button');
      btn.innerHTML = UI.icon(b[1]);
      btn.setAttribute('aria-label', b[0]);
      var start = function (ev) {
        ev.preventDefault();
        stop();
        Game.input(b[0]);
        repeat = setInterval(function () { Game.input(b[0]); }, 260);
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
      btn.addEventListener('pointercancel', stop);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      pad.appendChild(btn);
    });
    // swipes on the 3D view also move the party
    var view = document.getElementById('viewwrap'), sx = 0, sy = 0, st = 0;
    view.addEventListener('touchstart', function (e) { if (e.target.closest('#navpad')) return; var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
    view.addEventListener('touchend', function (e) {
      if (e.target.closest('#navpad') || Game.mode === 'wild') return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 600) return;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) Game.input(dx > 0 ? 'right' : 'left'); else Game.input(dy < 0 ? 'fwd' : 'back');
    }, { passive: true });
  };
  function stop() { if (repeat) { clearInterval(repeat); repeat = null; } }
  N.apply = function () {
    var on = Game.S && Game.S.opts.navpad;
    document.getElementById('navpad').classList.toggle('on', !!on);
  };
  N.toggle = function () {
    if (!Game.S) return;
    Game.S.opts.navpad = !Game.S.opts.navpad;
    N.apply();
    UI.updateCmdbar();
  };
  return N;
})();
