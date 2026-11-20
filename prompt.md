Build "Emberfall: The Emberwild Saga", a party-based fantasy RPG that runs entirely in the browser. It should feel like a late-1980s "gold box" computer RPG (first-person exploration, an overland map, turn-based tactical combat) using second-edition tabletop rules. The setting, characters, adventures, text and art must all be original; do not copy any existing game's names, characters, maps or look.

## Hard constraints

- Plain JavaScript loaded with ordinary <script> tags from one index.html, plus one stylesheet. No framework, bundler, package manager or build step. Open index.html and it plays.
- No image or sound files. All textures, sprites, portraits, figures and maps are drawn by code at start-up.
- Everything is relative-pathed so the folder works when served from a subdirectory (e.g. http://host/project1/) as well as a site root.
- Saves go in localStorage (several slots plus an autosave).
- Must run smoothly on an old tablet (7th-gen iPad, Safari 16+) as well as desktop Chrome, Edge, Firefox and Safari. Support touch, and phone and tablet layouts in both orientations.
- Separate files by concern, loaded in this order: rules, data, modules, monsters, wilds, treasure, adventures, figures, view3d, ui, combat, overland, campaign, journal, map, bestiary, navpad, watch, game.

## Rules (rules.js)

- Six ability scores, six races (human, dwarf, elf, gnome, half-elf, halfling) and six classes (fighter, paladin, ranger, mage, cleric, thief), with alignments and race/class limits.
- THAC0 and descending armour class, five saving-throw categories, hit dice and class experience tables, advancement to level 20. A prime-requisite XP bonus applies. Training at the hall costs 100 gp per level.
- Fighters can specialize in a weapon. Rangers and paladins should be competitive with a specialized fighter. Paladins turn undead as a cleric two levels lower.
- Thief skills, including find/remove traps, plus backstab.
- Movement: demi-humans move about 15% slower than humans, not half speed.
- Spell memorization and spell slots by level. Mages learn spells from scrolls into a spellbook. Grey out the "Learn" button on a scroll for a spell already in the book.
- About 75 wizard spells (levels 1–9) and priest spells (levels 1–7), limited to ones that fit the combat rules. Area spells such as Stinking Cloud should have their proper range and effect.
- Floor traps: single-target (pit, darts, blade, spear) and whole-party (falling block, fire, gas) with saving throws for half damage. Damage scales with dungeon level.

## World and content

- An item list of about 300 items: weapons, armour, potions, scrolls, wands and other magic items. Implement the full first-edition-style treasure tables (gems, jewellery, magic items, treasure types) so high-level adventures get fitting loot. Stock shops by level band.
- About 330 monsters: every basic monster from a classic monster manual, written in my own words, with special abilities (poison, paralysis, level drain, regeneration, breath, undead types for turning, weapon resistances).
- Four hand-written adventures that can be played alone or in order with the same company:
  E0 The Cellars of Thornwick (levels 1–2), E1 The Hollow Vaults (1–3), E2 Barrow of the Iron King (3–5), E3 The Witch-Queen of Ravenmoor (5–7). Each has a home town, several dungeon levels, a commission giver with main and side quests, and a final enemy.
- Fifty generated adventures (ten per level band, five bands up to level 20; in each band 4 small, 3 medium, 2 large, 1 huge). Generate them from a deterministic seeded RNG so they are identical on every load. Use separate RNG streams for features added later so existing content never shifts.
- Every adventure has a wilderness map. Every dungeon level has 1–3 secret doors (usually hiding an alcove with treasure) and 2–3 traps, and a validator checks that everything is reachable.
- Quest completion pays gold and experience, but quest experience is a quarter of the listed figure. Holy sites give a small separate experience award.

## Exploration (view3d.js, game.js, watch.js)

- First-person textured raycast view of towns and dungeons on a square grid. Moves are smooth, with no hitching when turning, sidestepping or bumping a wall. Add a minimap under the view.
- Doors, locked doors, secret doors (found by searching; dwarves and thieves are better at it), stairs, event squares, shops, temples, inns and training halls with distinct town building facades.
- Monsters stand on their own squares, notice you by line of sight, and guard their treasure. You can't walk around a group the game knows is there. Thieves can creep up; parties can listen at doors; a few monsters lie in ambush.
- Dropped items stay on the ground as loot.
- Searching also finds adjacent traps, which then show on the map. A thief can try to disarm them. Unfound traps spring when stepped on.
- Camping, with "rest until healed": healers cast their healing spells and re-memorize between rests.

## Overland (overland.js, wilds.js)

- A terrain grid (grass, road, bridge, forest, hills, fen, mountains, river). Terrain, time of day and fatigue affect travel speed and encounters.
- Sites to visit: the home town, dungeon entrances (some locked until a quest is done), hamlets where you can rest and trade, healers, holy sites, monster lairs and safe camps.
- Encounter tables and rumours per map, plus friendly travellers.

## Combat (combat.js)

- Turn-based on an isometric field: initiative, movement, melee and missile attacks, spells with areas and ranges, backstab, turning undead, morale and fleeing, and an auto-fight option. Experience is split among survivors.

## Interface (ui.js and others)

- Character creation, or a ready-made company to start at once. A party of up to six.
- Character sheets that show every attribute, including weapon specialization, saves, thief skills and spells.
- A quest journal of commissions and dated notes, a bestiary that fills in as you meet and fight creatures, a full-page map, and an in-game How to Play page.
- Keyboard controls (WASD/arrows to move and turn, Q/E sidestep, F search, R camp, M map, J journal, B bestiary, 1–6 character sheets, Esc menu) plus an icon command bar and an optional on-screen movement pad for touch.
- A campaign screen for moving a company between adventures.

## How to work

Build in phases, and get each phase playable before moving on:
1. Rules, party creation, one town and one dungeon level in the 3D view, saving.
2. Combat.
3. The full first adventure, overland travel, shops, the journal and the map.
4. The other three hand-written adventures and the campaign screen.
5. The full monster list, the spells to level 20, and the treasure tables.
6. The generated adventures, then wilderness maps, secret doors and traps for every one.
7. Touch controls, phone and tablet layouts, and performance tuning for old iPads.

After each phase, check content with Node validators that load the data files (every referenced monster and item exists, every map is reachable, every exit lands on a valid square). Also play-test the game in headless Chrome. Write a README and add an MIT licence.
