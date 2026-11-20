// Minimal headless-Chrome driver over the DevTools protocol (no npm packages).
// Usage: const B = require('./browser'); const b = await B.launch(); await b.goto(url); ...
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || '/usr/bin/google-chrome';

async function launch(opts = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ef-chrome-'));
  const w = opts.width || 1280, h = opts.height || 800;
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${w},${h}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(150);
    try { const r = await fetch(`http://127.0.0.1:${port}/json`); const list = await r.json(); target = list.find(t => t.type === 'page'); } catch (e) { }
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result); }
    else listeners.forEach(fn => fn(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const errors = [], logs = [];
  listeners.push(msg => {
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled') { const t = msg.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' '); logs.push(msg.params.type + ': ' + t); if (msg.params.type === 'error') errors.push(t); }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  });
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: opts.dpr || 1, mobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const b = {
    send, errors, logs,
    async goto(url) { await send('Page.navigate', { url }); await sleep(opts.loadWait || 1500); },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
      return r.result.value;
    },
    async shot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    async key(key, code) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: code || key, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: code || key });
    },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    async resize(w2, h2, mobile) { await send('Emulation.setDeviceMetricsOverride', { width: w2, height: h2, deviceScaleFactor: 1, mobile: !!mobile, hasTouch: !!mobile }); await sleep(300); },
    async close() { try { ws.close(); } catch (e) { } proc.kill('SIGKILL'); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { } }
  };
  return b;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
module.exports = { launch, sleep };
