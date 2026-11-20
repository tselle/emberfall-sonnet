// Loads the game's data files into a Node VM context (no DOM needed).
const fs = require('fs'), vm = require('vm'), path = require('path');
module.exports = function load(files) {
  const root = path.join(__dirname, '..', 'js');
  const ctx = { console, Math, JSON, Date, Object, Array, String, Number, Error, Uint8Array, Uint32Array, Float32Array, Infinity, isNaN, parseInt, parseFloat };
  vm.createContext(ctx);
  (files || ['rules', 'data', 'modules', 'monsters', 'wilds', 'treasure', 'adventures']).forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  });
  return ctx;
};
