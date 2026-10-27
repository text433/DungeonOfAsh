const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const assets = vm.runInNewContext(source.slice(source.indexOf('  const ASSETS ='), source.indexOf('  const ARMOR_SETS')).replace('const ASSETS =', 'globalThis.assets =') + ';assets');
const manifest = require('../assets/art-v78/manifest.json');
function png(key) {
  assert(manifest[key], `Missing replacement texture: ${key}`);
  const data = fs.readFileSync(path.join(root, manifest[key]));
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), hash: createHash('sha256').update(data).digest('hex') };
}
for (const key of Object.values(assets).flat()) png(key);
for (const theme of ['moss', 'ember']) for (let i = 1; i <= 8; i++) {
  const image = png(`${theme}_floor_${i}`);
  assert.equal(image.width, 16); assert.equal(image.height, 16);
}
for (const id of ['frost', 'rune', 'ember', 'wraith', 'spider', 'golem']) {
  const run = Array.from({ length: 4 }, (_, i) => png(`${id}_run_f${i}`));
  assert(new Set(run.map(f => f.hash)).size >= 3, `${id} needs distinct movement frames`);
}
const maps = require('../map-rules.js');
const seen = new Set();
for (let floor = 1; floor <= 3; floor++) for (let seed = 1; seed <= 12; seed++) {
  const layout = maps.generateDungeonLayout(floor, seed);
  assert.equal(layout.theme, ['crypt', 'moss', 'ember'][floor - 1]);
  layout.enemies.forEach(e => seen.add(e.type));
}
for (const id of ['spider', 'wraith', 'golem']) assert(seen.has(id), `${id} never spawns`);
const { ProgressionSystem } = require('../progression.js');
let saved = null;
const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
const progress = new ProgressionSystem(storage);
for (let i = 0; i < 6; i++) assert(progress.upgradeWeapon(10000).success);
assert.equal(progress.weaponConfig().texture, 'weapon_runeblade');
assert.equal(new ProgressionSystem(storage).weaponConfig().level, 6);
assert.equal(progress.upgradeWeapon(10000).success, false);
saved = JSON.stringify({ weaponLevel: 5.5 });
assert.equal(new ProgressionSystem(storage).weaponConfig().level, 5);
console.log('Art pack: all live textures exist, 3 themed floors, distinct new animations, enemy spawning and 7 saved weapon stages.');
