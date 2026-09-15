const mapRules = require("../map-rules.js");

const MAP_W = 64;
const MAP_H = 48;
const cellKey = (x, y) => `${x},${y}`;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const signature = (layout) => Array.from(layout.floorCells).sort().join("|");

function connectedCellCount(layout) {
  const startKey = cellKey(layout.spawn.x, layout.spawn.y);
  const visited = new Set([startKey]);
  const queue = [[layout.spawn.x, layout.spawn.y]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, y + dy];
      const key = cellKey(next[0], next[1]);
      if (!layout.floorCells.has(key) || visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return visited.size;
}

function validateLayout(layout, floor, runSeed) {
  assert(layout.level === floor, `Nepareizs stāvs sēklai ${runSeed}`);
  assert(layout.floorCells.size >= 620 && layout.floorCells.size <= 850, `Nesamērīgs kartes izmērs: ${layout.floorCells.size}`);
  assert(connectedCellCount(layout) === layout.floorCells.size, `Stāvs ${floor} nav pilnībā savienots`);
  assert(layout.rooms.filter((room) => room.label !== "boss").every((room) => room.width <= 11 && room.height <= 8), `Stāvā ${floor} ir pārāk liela istaba`);

  const content = [
    layout.spawn, layout.guide, layout.boss, layout.stairs,
    ...layout.chests, ...layout.traps, ...layout.props, ...layout.skulls, ...layout.enemies
  ];
  content.forEach(({ x, y }) => {
    assert(Number.isInteger(x) && Number.isInteger(y), `Objekts nav uz režģa stāvā ${floor}`);
    assert(layout.floorCells.has(cellKey(x, y)), `Objekts atrodas ārpus grīdas pie ${x},${y}`);
  });
  assert(new Set(content.map(({ x, y }) => cellKey(x, y))).size === content.length, `Stāvā ${floor} objekti pārklājas`);
  assert(layout.chests.length >= 3 && layout.chests.length <= 5, `Nepareizs lāžu skaits stāvā ${floor}`);
  assert(layout.enemies.length >= 20 && layout.enemies.length <= 30, `Nepareizs monstru skaits stāvā ${floor}`);

  const bossRoom = mapRules.BOSS_CHAMBER;
  for (let x = bossRoom.left; x <= bossRoom.right; x += 1) {
    const isGate = x >= bossRoom.gateLeft && x <= bossRoom.gateRight;
    assert(layout.floorCells.has(cellKey(x, bossRoom.wallY)) === isGate, `Boss sienā ir nepareiza aile pie ${x},${bossRoom.wallY}`);
  }

  const wallPlan = mapRules.buildWallPlan(layout.floorCells, MAP_W, MAP_H);
  assert(new Set(wallPlan.map(({ x, y }) => cellKey(x, y))).size === wallPlan.length, `Stāvā ${floor} siena uzzīmēta divreiz`);
  const wallByCell = new Map(wallPlan.map((rule) => [cellKey(rule.x, rule.y), rule]));
  wallPlan.forEach((rule) => {
    assert(mapRules.MINIMAL_MASK_PATTERNS[rule.frame] === rule.mask, `Stāvā ${floor} sienai izvēlēta nepareiza flīze`);
    assert(!layout.floorCells.has(cellKey(rule.x, rule.y)), `Stāvā ${floor} siena pārklāj grīdu`);
    const right = wallByCell.get(cellKey(rule.x + 1, rule.y));
    assert(!right || right.facing === rule.facing, `Stāvā ${floor} vienā sienas posmā atšķiras augstumi`);
  });
}

const seeds = [1, 77, 123456, 0xffffffff];
seeds.forEach((runSeed) => {
  const floorSignatures = new Set();
  for (let floor = 1; floor <= 20; floor += 1) {
    const layout = mapRules.generateDungeonLayout(floor, runSeed, MAP_W, MAP_H);
    validateLayout(layout, floor, runSeed);
    floorSignatures.add(signature(layout));
  }
  assert(floorSignatures.size === 20, `Sēklai ${runSeed} atkārtojas stāvu kartes`);
});

const first = mapRules.generateDungeonLayout(5, 20260915, MAP_W, MAP_H);
const repeat = mapRules.generateDungeonLayout(5, 20260915, MAP_W, MAP_H);
const otherRun = mapRules.generateDungeonLayout(5, 20260916, MAP_W, MAP_H);
assert(signature(first) === signature(repeat), "Viena sēkla nedod atkārtojamu karti");
assert(signature(first) !== signature(otherRun), "Dažādas spēles sēklas dod vienādu karti");

console.log("Procedural map test passed: 80 unique connected floors, compact rooms, valid walls and placements.");
