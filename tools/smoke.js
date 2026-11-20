// Quick smoke test: load the game, check for errors, take screenshots of key screens.
const B = require('./browser');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await B.launch({ width: 1280, height: 800 });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await b.goto(url);
  await b.shot(OUT + '/01-title.png');
  await b.eval(`Game.startNew(UI.pregenParty())`);
  await B.sleep(500);
  await b.shot(OUT + '/02-campaign.png');
  await b.eval(`UI.closeAll(); Game.startAdventure('E0')`);
  await B.sleep(800);
  await b.shot(OUT + '/03-town.png');
  console.log('errors:', JSON.stringify(b.errors, null, 1));
  console.log('logs:', b.logs.slice(-10).join('\n'));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
