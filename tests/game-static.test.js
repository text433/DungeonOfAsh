const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "style.css",
  "map-rules.js",
  "game.js",
  "vendor/phaser.min.js",
  "assets/frames/wall_atlas_high_mid.png",
  "assets/frames/wall_atlas_high_mid_alt.png",
  "assets/frames/knight_m_idle_anim_f0.png",
  "assets/frames/wall_mid.png",
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
  "class DungeonScene", "touchVector", "updateJoystick", "buildWallAutotiles", "addHighWallAtlasDetails", "buildWallPlan",
  "createEnemyHealthBar", "triggerSpikeTrap", "performAttack", "openChest", "openDoor", "nextFloor"
]) {
  if (!game.includes(marker)) throw new Error(`Spēles kodā trūkst ${marker}`);
}

if (!html.includes('<script src="map-rules.js"></script>')) throw new Error("HTML neielādē kartes noteikumus");

const floorCells = mapRules.buildFloorCells();
const wallPlan = mapRules.buildWallPlan(floorCells, 80, 56);
if (floorCells.size !== 2059) throw new Error(`Negaidīts grīdas flīžu skaits: ${floorCells.size}`);
if (wallPlan.length !== 734) throw new Error(`Negaidīts sienu flīžu skaits: ${wallPlan.length}`);
if (new Set(wallPlan.map(({ x, y }) => `${x},${y}`)).size !== wallPlan.length) {
  throw new Error("Kartes noteikumi vienā šūnā izveido vairākas sienas");
}
for (const rule of wallPlan) {
  if (!rule.base || !rule.body || !Array.isArray(rule.overlays)) throw new Error(`Nepilnīgs sienas plāns pie ${rule.x},${rule.y}`);
  if (floorCells.has(`${rule.x},${rule.y}`)) throw new Error(`Siena pārklāj grīdu pie ${rule.x},${rule.y}`);
}

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
