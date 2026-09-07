const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "style.css",
  "game.js",
  "vendor/phaser.min.js",
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

for (const id of ["game", "hud", "mobile-controls", "joystick-base", "joystick-knob", "start-button", "result-screen"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`HTML trūkst #${id}`);
}

for (const marker of [
  "class DungeonScene", "touchVector", "updateJoystick", "drawDungeonWalls",
  "createEnemyHealthBar", "triggerSpikeTrap", "performAttack", "openChest", "openDoor", "nextFloor"
]) {
  if (!game.includes(marker)) throw new Error(`Spēles kodā trūkst ${marker}`);
}

console.log(`Static smoke test passed (${required.length} required files).`);
