# Emberfall: The Emberwild Saga

A party-based fantasy role-playing game that runs entirely in the browser, in the
spirit of the late-1980s "gold box" computer RPGs: first-person exploration of
towns and dungeons, an overland map, and turn-based tactical combat, using rules
modelled on the second edition of the classic tabletop game. The setting,
characters, adventures, text and art are original.

## Playing

Open `index.html` in a browser. That's it — no install, no build, no server.
It also works when served from any folder of a web server (for example
`http://host/project1/`), because every path is relative.

Choose **Quick Start** for a ready-made company of six, or **New Company** to
roll your own. Press **H** in game (or *How to Play* on the title screen) for the
full guide.

| Key | Action |
| --- | --- |
| W / ↑, S / ↓ | Step forward / back |
| A / ←, D / → | Turn left / right |
| Q, E | Sidestep left / right |
| F | Search for secret doors and traps |
| L | Listen at a door |
| X | Sneak (toggle) |
| R | Camp (rest, rest until healed, memorize) |
| C | Cast a spell outside combat |
| M, J, B | Map, journal, bestiary |
| P | Campaign screen (travel between adventures) |
| 1–6 | Character sheets |
| Esc | Menu: save, load, options, help |

On tablets and phones, turn on the movement pad from the command bar, or swipe
on the 3D view. Every command is also on the icon bar.

In combat: arrows/numpad move, **A** attack, **C** cast, **T** turn undead,
**U** use an item, **G** guard, **D** delay, **B** bandage, **F** flee (from the
field's edge), **Q** auto-fight this character, **Space** end turn. Tap or click
squares and enemies directly; drag to pan on small screens.

## What's inside

- **Rules** (`js/rules.js`): six abilities (with exceptional strength), six
  races and six classes with level limits and requirements, alignments,
  THAC0 and descending AC, five saving-throw categories, class XP tables to
  level 20, prime-requisite XP bonus, weapon specialization, paladins (who turn
  undead as a cleric two levels lower) and rangers balanced against specialist
  fighters, thief skills and backstab, demi-humans moving about 15% slower, and
  spell slots by level. 66 wizard spells (levels 1–9) and 48 priest spells
  (levels 1–7). Floor traps that scale with dungeon level.
- **Items** (`js/data.js`): about 350 base items — weapons, armour, potions,
  a scroll for every spell, wands, staves, rods, rings and wondrous items — plus
  quest relics. Shops are stocked by level band.
- **Treasure** (`js/treasure.js`): first-edition-style treasure types A–Z, gem
  and jewellery tables and the magic-item tables, scaled by level band.
- **Monsters** (`js/monsters.js`): around 410 creatures written for the
  Emberwild, with poison, paralysis, level drain, regeneration, breath weapons,
  gaze attacks, undead turning types, weapon resistances, magic resistance and
  spellcasting.
- **Adventures** (`js/adventures.js`): four hand-written adventures that can be
  played alone or in order —
  *E0 The Cellars of Thornwick* (levels 1–2), *E1 The Hollow Vaults* (1–3),
  *E2 Barrow of the Iron King* (3–5) and *E3 The Witch-Queen of Ravenmoor*
  (5–7) — plus fifty generated adventures, ten per level band up to level 20
  (4 small, 3 medium, 2 large and 1 huge in each band). Generation is seeded
  and deterministic; each feature (layout, doors, monsters, treasure, quests,
  wilderness, secret doors, traps…) draws on its own named RNG stream, so
  adding later features never shifts existing content.
- **Exploration** (`js/view3d.js`, `js/game.js`, `js/watch.js`): a textured
  raycaster with smooth movement, a minimap, doors, locked and secret doors,
  stairs, events, shops, temples, inns, training halls and taverns with
  distinct facades, monsters that notice you by line of sight, hunt or guard
  their treasure, ambushes, sneaking, listening, traps, dropped loot and camping
  with "rest until healed".
- **Overland** (`js/overland.js`, `js/wilds.js`): terrain, time of day and
  fatigue affect travel and encounters; towns, dungeon entrances (some locked
  until a quest is done), hamlets, healers, holy sites, lairs and safe camps;
  encounter tables, rumours and friendly travellers.
- **Combat** (`js/combat.js`): an isometric tactical field built from the
  surrounding dungeon, initiative, movement with free attacks, melee and
  missiles, spells with proper ranges and areas (Stinking Cloud is a 20-foot
  cube at 30 yards that lingers), backstab, turning undead, morale and fleeing,
  auto-fight, experience split among survivors.
- **Interface** (`js/ui.js`, `js/journal.js`, `js/map.js`, `js/bestiary.js`,
  `js/campaign.js`, `js/navpad.js`): character creation, sheets, quest journal,
  automap, bestiary, campaign screen and touch controls. Quest experience is
  paid at a quarter of the listed figure to each survivor; holy sites give a
  small separate award; training costs 100 gp per level trained for.
- **Art** (`js/figures.js`): every texture, sprite, portrait, figure and map
  tile is drawn by code at start-up. There are no image or sound files.

Saves live in the browser's `localStorage`: five slots plus an autosave.

## Development and testing

Requires only Node.js (no packages) and, for the browser tests, Google Chrome.

```sh
node tools/validate.js          # content validator
node tools/playtest.js OUTDIR   # headless play-test of the main flows, with screenshots
node tools/playtest2.js OUTDIR  # traps, secrets, locks, events, training, camping...
node tools/stress.js            # renders every map; hundreds of auto-battles; every spell
```

The validator loads the data files in Node and checks that every referenced
monster and item exists, every map is fully reachable (including through
secret and locked doors), every stair, exit and wilderness site lands on a
valid square, every dungeon level has 1–3 secret doors and 2–3 traps, every
quest can be completed, and that generated adventures are identical on every
load.

Scripts load in this order from `index.html`: rules, data, modules, monsters,
wilds, treasure, adventures, figures, view3d, ui, combat, overland, campaign,
journal, map, bestiary, navpad, watch, game.

## Licence

MIT — see `LICENSE`.
