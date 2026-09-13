const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "style.css",
  "map-rules.js",
  "game.js",
  "vendor/phaser.min.js",
  "assets/frames/knight_m_idle_anim_f0.png",
  "assets/frames/atlas_walls_low-16x16.png",
  "assets/frames/big_demon_idle_anim_f0.png",
  "assets/frames/chest_full_open_anim_f0.png"
];

for (const relative of required) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Trūkst nepieciešamais fails: ${relative}`);
  if (fs.statSync(absolute).size === 0) throw new Error(`Tukšs fails: ${relative}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const mapRules = require(path.join(root, "map-rules.js"));

for (const id of ["game", "hud", "mobile-controls", "joystick-base", "joystick-knob", "start-button", "result-screen"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`HTML trūkst #${id}`);
}

for (const marker of [
  "class DungeonScene", "touchVector", "updateJoystick", "buildWallAutotiles", "buildWallPlan",
  "createFloorUnderlayFrames", "addWallFloorUnderlay", "createEnemyHealthBar", "triggerSpikeTrap",
  "performAttack", "openChest", "openDoor", "nextFloor"
]) {
  if (!game.includes(marker)) throw new Error(`Spēles kodā trūkst ${marker}`);
}
if (game.includes("wall_atlas_high")) throw new Error("Spēle joprojām zīmē otru sienas slāni");
if (game.includes("wallOverlays")) throw new Error("Spēle joprojām slāņo vairākas sienas vienā šūnā");
if (!game.includes('this.add.image(x * TILE + 8, y * TILE + 8, key, "__BASE")')) {
  throw new Error("Grīdas flīzes neizmanto pilno 16x16 tekstūras kadru");
}

if (!html.includes('<script src="map-rules.js?v=17"></script>')) throw new Error("HTML neielādē jaunākos kartes noteikumus");
if (!html.includes('<script src="game.js?v=17"></script>')) throw new Error("HTML neielādē jaunāko spēles kodu");

const floorCells = mapRules.buildFloorCells();
const wallPlan = mapRules.buildWallPlan(floorCells, 80, 56);
if (floorCells.size !== 2059) throw new Error(`Negaidīts grīdas flīžu skaits: ${floorCells.size}`);
if (wallPlan.length !== 482) throw new Error(`Negaidīts sienu flīžu skaits: ${wallPlan.length}`);
if (mapRules.MINIMAL_MASK_PATTERNS.filter(Boolean).length !== 47) {
  throw new Error("3x3-minimal atlasā nav visu 47 kaimiņu variantu");
}
if (new Set(wallPlan.map(({ x, y }) => `${x},${y}`)).size !== wallPlan.length) {
  throw new Error("Kartes noteikumi vienā šūnā izveido vairākas sienas");
}
for (const rule of wallPlan) {
  if (!Number.isInteger(rule.frame) || rule.frame < 0 || rule.frame > 47 || rule.frame === 22 || !rule.body) {
    throw new Error(`Nepilnīgs 3x3-minimal sienas plāns pie ${rule.x},${rule.y}`);
  }
  if (mapRules.MINIMAL_MASK_PATTERNS[rule.frame] !== rule.mask) {
    throw new Error(`Sienas maskai ${rule.mask} izvēlēta nepareiza flīze ${rule.frame}`);
  }
  if (floorCells.has(`${rule.x},${rule.y}`)) throw new Error(`Siena pārklāj grīdu pie ${rule.x},${rule.y}`);
  let touchesFloor = false;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if ((dx !== 0 || dy !== 0) && floorCells.has(`${rule.x + dx},${rule.y + dy}`)) touchesFloor = true;
    }
  }
  if (!touchesFloor) throw new Error(`Siena pie ${rule.x},${rule.y} nav savienota ar grīdas apakšslāni`);
}

const sampleFloor = mapRules.buildFloorCells([[2, 2, 4, 3]]);
const samplePlan = mapRules.buildWallPlan(sampleFloor, 10, 10);
const sampleWalls = new Set(samplePlan.map(({ x, y }) => `${x},${y}`));
for (let x = 2; x < 6; x += 1) {
  if (!sampleWalls.has(`${x},5`)) throw new Error(`Trūkst apakšējā siena pie ${x},5`);
  if (sampleWalls.has(`${x},6`)) throw new Error(`Apakšējā siena ir uzzīmēta divreiz pie ${x},6`);
  if (!sampleWalls.has(`${x},1`)) throw new Error(`Trūkst augšējā siena pie ${x},1`);
  if (sampleWalls.has(`${x},0`)) throw new Error(`Augšējā siena ir uzzīmēta divreiz pie ${x},0`);
}
for (let y = 2; y < 5; y += 1) {
  if (!sampleWalls.has(`1,${y}`)) throw new Error(`Trūkst kreisā sānu siena pie 1,${y}`);
  if (!sampleWalls.has(`6,${y}`)) throw new Error(`Trūkst labā sānu siena pie 6,${y}`);
}
const sampleFrame = (x, y) => samplePlan.find((candidate) => candidate.x === x && candidate.y === y)?.frame;
if (sampleFrame(1, 1) !== 1) throw new Error("Augšējais kreisais stūris nav savienots");
if (sampleFrame(6, 1) !== 3) throw new Error("Augšējais labais stūris nav savienots");
if (sampleFrame(1, 5) !== 25) throw new Error("Apakšējais kreisais stūris nav savienots");
if (sampleFrame(6, 5) !== 27) throw new Error("Apakšējais labais stūris nav savienots");

const collisionCells = new Set(wallPlan.map(({ x, y }) => `${x},${y}`));
const reachable = new Set(["8,25"]);
const queue = [[8, 25]];
while (queue.length) {
  const [x, y] = queue.shift();
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
    const key = `${x + dx},${y + dy}`;
    if (floorCells.has(key) && !collisionCells.has(key) && !reachable.has(key)) {
      reachable.add(key);
      queue.push([x + dx, y + dy]);
    }
  });
}
for (const target of ["11,11", "58,24", "69,23", "40,47", "55,46"]) {
  if (!reachable.has(target)) throw new Error(`Kartes noteikumi noslēdz ceļu uz ${target}`);
}

console.log(`Static smoke test passed (${required.length} required files).`);
