const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "style.css",
  "map-rules.js",
  "progression.js",
  "game.js",
  "vendor/phaser.min.js",
  "assets/frames/knight_m_idle_anim_f0.png",
  "assets/frames/atlas_walls_low-16x16.png",
  "assets/frames/atlas_walls_high-16x32.png",
  "assets/frames/big_demon_idle_anim_f0.png",
  "assets/frames/chest_full_open_anim_f0.png",
  "assets/frames/floor_ladder.png",
  "assets/frames/wizzard_m_idle_anim_f0.png",
  "assets/frames/angel_idle_anim_f0.png",
  "assets/frames/doors_frame_left.png",
  "assets/frames/doors_frame_top.png",
  "assets/frames/doors_frame_right.png",
  "assets/frames/knight_m_hit_anim_f0.png",
  "assets/frames/doc_idle_anim_f0.png",
  "assets/frames/wall_fountain_mid_red_anim_f0.png",
  "assets/frames/wall_fountain_basin_red_anim_f0.png",
  "assets/frames/weapon_regular_sword.png",
  "assets/frames/weapon_lavish_sword.png"
];

for (const relative of required) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Trūkst nepieciešamais fails: ${relative}`);
  if (fs.statSync(absolute).size === 0) throw new Error(`Tukšs fails: ${relative}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const mapRules = require(path.join(root, "map-rules.js"));
const { ProgressionSystem } = require(path.join(root, "progression.js"));

for (const id of ["game", "hud", "mobile-controls", "joystick-base", "joystick-knob", "start-button", "result-screen", "talent-screen", "talent-button", "ability-button", "minimap", "smith-screen", "smith-upgrade", "weapon-rank"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`HTML trūkst #${id}`);
}

for (const marker of [
  "class DungeonScene", "touchVector", "updateJoystick", "buildWallAutotiles", "buildWallPlan", "BOSS_CHAMBER",
  "createFloorUnderlayFrames", "addWallFloorUnderlay", "rule.facing", "HIGH_WALL_TOP_INSET", "highWallFrame",
  "startFollow(this.player, false, 1, 1)", "setRoundPixels(false)", "this.moveVector.lerp(target, smoothing)",
  "createEnemyHealthBar", "triggerSpikeTrap", "column_wall",
  "gateFrameKey", "BOSS_GATE_WALL_FRAME", "columnBaseline", "doors_frame_left", "doors_frame_top", "doors_frame_right",
  "performAttack", "openChest", "openDoor", "nextFloor",
  "buildTown", "townStairs", "town-npc-idle", "guide-npc-idle", "updateAutoChests", "respawnAtGuide",
  "updateEnemyPatrol", "updateBossPatrol", "patrolRadius", "aggroRadius", "castAshWard", "openTalentTree",
  "renderMinimap", "openSmith", "upgradeWeapon", "updateCarriedWeapon", "createAttackFx", "addLavaFall",
  "Phaser.Scenes.Events.POST_UPDATE", "runHandPoses", "idleHandPoses",
  "setOrigin(0.5, 0.95).setScale(0.74)", "facingLeft ? pose.angle : 360 - pose.angle",
  "this.carriedWeapon.setDepth(this.player.depth + 2)",
  "lava-flow", "playerHit", "dungeonOfAshIntroSeenV1"
]) {
  if (!game.includes(marker)) throw new Error(`Spēles kodā trūkst ${marker}`);
}
if (!game.includes('rule.facing !== "side"')) throw new Error("Horizontālās sienas neizmanto 16x32 sienu atlasu");
if (game.includes("wallOverlays")) throw new Error("Spēle joprojām slāņo vairākas sienas vienā šūnā");
if (!game.includes('this.add.image(x * TILE + 8, y * TILE + 8, key, "__BASE")')) {
  throw new Error("Grīdas flīzes neizmanto pilno 16x16 tekstūras kadru");
}

if (!game.includes('facing === "south" ? -HIGH_WALL_TOP_INSET')) {
  throw new Error("Apakšējās sienas redzamā mala nav pievilkta pie grīdas");
}
if (!game.includes('facing === "north" ? TILE : HIGH_WALL_TOP_INSET')) {
  throw new Error("Apakšējās sienas sadursme nav saglabāta pareizajā šūnā");
}
if (game.includes("2.65") || game.includes("3.1") || game.includes("3.6")) {
  throw new Error("Kamera joprojām izmanto raustošu daļskaitļa zoom");
}
if (game.includes("startFollow(this.player, true") || game.includes("setRoundPixels(true)")) {
  throw new Error("Kamera joprojām noapaļo kustību un rada redzamus lēcienus");
}
if (!game.includes("fixedStep: false")) throw new Error("Fizika nav piesaistīta ekrāna kadru ritmam");
if (!game.includes("roundPixels: false")) throw new Error("Globālā pikseļu noapaļošana nav izslēgta");
if (!html.includes('<script src="map-rules.js?v=28"></script>')) throw new Error("HTML neielādē jaunākos kartes noteikumus");
if (!html.includes('<script src="progression.js?v=28"></script>')) throw new Error("HTML neielādē progresa sistēmu");
if (!html.includes('<script src="game.js?v=37"></script>')) throw new Error("HTML neielādē jaunāko spēles kodu");

const floorCells = mapRules.buildFloorCells();
const wallPlan = mapRules.buildWallPlan(floorCells, 64, 48);
if (floorCells.size !== 1288) throw new Error(`Negaidīts grīdas flīžu skaits: ${floorCells.size}`);
if (wallPlan.length !== 397) throw new Error(`Negaidīts sienu flīžu skaits: ${wallPlan.length}`);
if (mapRules.MINIMAL_MASK_PATTERNS.filter(Boolean).length !== 47) {
  throw new Error("3x3-minimal atlasā nav visu 47 kaimiņu variantu");
}
if (new Set(wallPlan.map(({ x, y }) => `${x},${y}`)).size !== wallPlan.length) {
  throw new Error("Kartes noteikumi vienā šūnā izveido vairākas sienas");
}
const facingCounts = wallPlan.reduce((counts, rule) => {
  counts[rule.facing] = (counts[rule.facing] || 0) + 1;
  return counts;
}, {});
if (facingCounts.north !== 137 || facingCounts.south !== 120 || facingCounts.side !== 140) {
  throw new Error(`Nepareizi sienu virzieni: ${JSON.stringify(facingCounts)}`);
}

const bossRoom = mapRules.BOSS_CHAMBER;
for (const [x, y] of [[bossRoom.left - 1, bossRoom.wallY], [bossRoom.right + 1, bossRoom.wallY]]) {
  const junction = wallPlan.find((candidate) => candidate.x === x && candidate.y === y);
  if (!junction || junction.facing !== "north") {
    throw new Error(`T-veida sienas savienojums nav pilnā augstumā pie ${x},${y}`);
  }
}

for (let x = bossRoom.left; x <= bossRoom.right; x += 1) {
  const key = `${x},${bossRoom.wallY}`;
  const isGate = x >= bossRoom.gateLeft && x <= bossRoom.gateRight;
  if (isGate && !floorCells.has(key)) throw new Error(`Boss durvju ailē trūkst grīdas pie ${key}`);
  if (!isGate) {
    const wall = wallPlan.find((candidate) => candidate.x === x && candidate.y === bossRoom.wallY);
    if (!wall || wall.facing !== "north") throw new Error(`Boss telpas siena nav pilnā augstumā pie ${key}`);
  }
}
if (!game.includes("BOSS_CHAMBER.entranceX * TILE") || !game.includes("BOSS_CHAMBER.wallY + 1")) {
  throw new Error("Boss durvis nav piesaistītas sienas ailei");
}
if (!game.includes("activeGate.gateLeft - 1") || !game.includes("activeGate.gateRight + 1")) {
  throw new Error("Durvju arkas malas nav piesaistītas blakus sienu flīzēm");
}
if (!game.includes("this.highWallFrame(BOSS_GATE_WALL_FRAME)")) {
  throw new Error("Pie durvju arkas nav saglabāta pilna biezuma ķieģeļu siena");
}
if (!game.includes("const columnBaseline = (y + 2) * TILE")) {
  throw new Error("Boss telpas kolonnas pamatne nav izlīdzināta ar sienas apakšmalu");
}
if (!game.includes("(BOSS_CHAMBER.wallY - 1) * TILE")) {
  throw new Error("Virs durvīm trūkst augšējās arkas daļas");
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
const sampleFacing = (x, y) => samplePlan.find((candidate) => candidate.x === x && candidate.y === y)?.facing;
if (sampleFrame(1, 1) !== 1) throw new Error("Augšējais kreisais stūris nav savienots");
if (sampleFrame(6, 1) !== 3) throw new Error("Augšējais labais stūris nav savienots");
if (sampleFrame(1, 5) !== 25) throw new Error("Apakšējais kreisais stūris nav savienots");
if (sampleFrame(6, 5) !== 27) throw new Error("Apakšējais labais stūris nav savienots");
if (sampleFacing(1, 1) !== "north" || sampleFacing(3, 1) !== "north") {
  throw new Error("Augšējā horizontālā siena nav pilnā augstumā");
}
if (sampleFacing(1, 5) !== "south" || sampleFacing(3, 5) !== "south") {
  throw new Error("Apakšējā horizontālā siena nav pilnā augstumā");
}
if (sampleFacing(1, 3) !== "side" || sampleFacing(6, 3) !== "side") {
  throw new Error("Sānu sienas pārklājas ar 32px horizontālajām sienām");
}

const townFloorCells = mapRules.buildFloorCells(mapRules.TOWN_RECTS);
const townWallPlan = mapRules.buildWallPlan(townFloorCells, 64, 48);
if (townFloorCells.size !== 920 || townWallPlan.length !== 152) {
  throw new Error(`Nepareizs pilsētas plāns: ${townFloorCells.size} grīdas / ${townWallPlan.length} sienas`);
}
for (const x of [mapRules.TOWN.gateLeft, mapRules.TOWN.gateRight]) {
  if (!townFloorCells.has(`${x},${mapRules.TOWN.wallY}`)) throw new Error("Pilsētas durvju aile nav atvērta");
}
for (const x of [mapRules.TOWN.gateLeft - 1, mapRules.TOWN.gateRight + 1]) {
  const wall = townWallPlan.find((item) => item.x === x && item.y === mapRules.TOWN.wallY);
  if (!wall || wall.facing !== "north") throw new Error("Pilsētas durvju sānu siena nav pilnā augstumā");
}

const memoryStorage = {
  value: null,
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; }
};
const progress = new ProgressionSystem(memoryStorage);
if (progress.spend("bloodSip")) throw new Error("Bonusu zars ļauj izlaist priekšnoteikumu");
progress.awardFloorPoint();
if (!progress.spend("ironHeart") || progress.bonuses().maxHp !== 2) throw new Error("Dzīvības zars nedarbojas");
progress.awardFloorPoint();
if (!progress.spend("bloodSip") || progress.bonuses().healOnKill !== 1) throw new Error("Bonusa zara turpinājums nedarbojas");

const weaponStorage = {
  value: null,
  getItem() { return this.value; },
  setItem(_key, value) { this.value = value; }
};
const weaponProgress = new ProgressionSystem(weaponStorage);
if (weaponProgress.weaponConfig().texture !== "weapon_regular_sword") throw new Error("Sākuma zobens nav ielādēts");
if (weaponProgress.upgradeWeapon(19).success) throw new Error("Ieroci var uzlabot bez pietiekama zelta");
const forged = weaponProgress.upgradeWeapon(20);
if (!forged.success || weaponProgress.weaponConfig().damage !== 1) throw new Error("Kalēja uzlabojums nedarbojas");
const restoredWeapon = new ProgressionSystem(weaponStorage);
if (restoredWeapon.weaponConfig().level !== 1) throw new Error("Ieroča līmenis netiek saglabāts");

const collisionCells = new Set(wallPlan.map(({ x, y }) => `${x},${y}`));
const reachable = new Set(["7,23"]);
const queue = [[7, 23]];
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
for (const target of ["7,11", "48,15", "48,11", "29,37", "50,37", "44,35"]) {
  if (!reachable.has(target)) throw new Error(`Kartes noteikumi noslēdz ceļu uz ${target}`);
}

console.log(`Static smoke test passed (${required.length} required files).`);
