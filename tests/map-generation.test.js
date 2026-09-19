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

function connectedWalkableCount(layout, blocked) {
  const startKey = cellKey(layout.spawn.x, layout.spawn.y);
  if (blocked.has(startKey)) return 0;
  const visited = new Set([startKey]);
  const queue = [[layout.spawn.x, layout.spawn.y]];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, y + dy];
      const key = cellKey(next[0], next[1]);
      if (!layout.floorCells.has(key) || blocked.has(key) || visited.has(key)) continue;
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
    layout.spawn, layout.guide, layout.boss, layout.stairs, layout.mimic,
    ...layout.chests, ...layout.traps, ...layout.props, ...layout.skulls, ...layout.enemies
  ];
  content.forEach(({ x, y }) => {
    assert(Number.isInteger(x) && Number.isInteger(y), `Objekts nav uz režģa stāvā ${floor}`);
    assert(layout.floorCells.has(cellKey(x, y)), `Objekts atrodas ārpus grīdas pie ${x},${y}`);
  });
  assert(new Set(content.map(({ x, y }) => cellKey(x, y))).size === content.length, `Stāvā ${floor} objekti pārklājas`);
  assert(layout.chests.length >= 3 && layout.chests.length <= 5, `Nepareizs lāžu skaits stāvā ${floor}`);
  assert(layout.mimic && layout.floorCells.has(cellKey(layout.mimic.x, layout.mimic.y)), `Stāvā ${floor} trūkst mimika lādes`);
  // Only existing upper-wall entrances qualify; four doors was the old all-sides rule.
  assert(layout.roomDoors.length > 0, `Stāvā ${floor} trūkst telpu durvju`);
  layout.roomDoors.forEach((door) => {
    const room = layout.rooms.find((candidate) => candidate.label === door.room);
    assert(door.side === "north", `Stāvā ${floor} telpas durvis nav augšējā sienā`);
    assert(door.cells.length === 2, `Stāvā ${floor} durvju aile nav divas flīzes plata`);
    assert(door.cells.every(({ y }) => y === room.top - 1), `Stāvā ${floor} durvis nav telpas augšējā sienā`);
    assert(!layout.floorCells.has(cellKey(door.cells[0].x - 1, room.top - 1))
      && !layout.floorCells.has(cellKey(door.cells[1].x + 1, room.top - 1)), `Stāvā ${floor} durvju sānos ir šķirba`);
  });
  const doorCells = layout.roomDoors.flatMap(({ cells }) => cells);
  const openings = new Set(doorCells.map(({ x, y }) => cellKey(x, y)));
  const doorWallPlan = mapRules.buildWallPlan(layout.floorCells, MAP_W, MAP_H, openings);
  assert(doorWallPlan.every(({ x, y }) => !openings.has(cellKey(x, y))), `Stāvā ${floor} sienas bloķē durvis`);
  const doorWalls = new Map(doorWallPlan.map((wall) => [cellKey(wall.x, wall.y), wall]));
  layout.roomDoors.forEach(({ cells }) => {
    const left = doorWalls.get(cellKey(cells[0].x - 1, cells[0].y));
    const right = doorWalls.get(cellKey(cells[1].x + 1, cells[1].y));
    assert(left && right, `Stāvā ${floor} trūkst durvju sānu sienas`);
    assert(left.mask[5] === "1" && right.mask[3] === "1", `Stāvā ${floor} siena nesavienojas ar durvju rāmi`);
  });
  assert(new Set(doorCells.map(({ x, y }) => cellKey(x, y))).size === doorCells.length, `Stāvā ${floor} telpu durvis pārklājas`);
  doorCells.forEach(({ x, y }) => assert(layout.floorCells.has(cellKey(x, y)), `Stāvā ${floor} telpas durvis nav uz grīdas`));
  const contentKeys = new Set(content.map(({ x, y }) => cellKey(x, y)));
  doorCells.forEach(({ x, y }) => assert(!contentKeys.has(cellKey(x, y)), `Stāvā ${floor} objekts pārklāj telpas durvis`));
  assert(layout.enemies.length >= 20 && layout.enemies.length <= 30, `Nepareizs monstru skaits stāvā ${floor}`);

  const solidObjects = [...layout.chests, layout.mimic, ...layout.props];
  for (let i = 0; i < solidObjects.length; i += 1) {
    for (let j = i + 1; j < solidObjects.length; j += 1) {
      const distance = Math.max(
        Math.abs(solidObjects[i].x - solidObjects[j].x),
        Math.abs(solidObjects[i].y - solidObjects[j].y)
      );
      assert(distance >= 2, `Stāvā ${floor} divi cietie objekti aizsprosto eju`);
    }
  }
  const chestLikeObjects = [...layout.chests, layout.mimic];
  for (let i = 0; i < chestLikeObjects.length; i += 1) {
    for (let j = i + 1; j < chestLikeObjects.length; j += 1) {
      const distance = Math.max(
        Math.abs(chestLikeObjects[i].x - chestLikeObjects[j].x),
        Math.abs(chestLikeObjects[i].y - chestLikeObjects[j].y)
      );
      assert(distance >= 3, `Stāvā ${floor} divas lādes atrodas pārāk tuvu`);
    }
  }
  const wideClearanceObjects = [...chestLikeObjects, ...layout.props.filter(({ type }) => type === "column")];
  wideClearanceObjects.forEach((wideObject) => {
    solidObjects.forEach((solidObject) => {
      if (wideObject === solidObject) return;
      const distance = Math.max(
        Math.abs(wideObject.x - solidObject.x),
        Math.abs(wideObject.y - solidObject.y)
      );
      assert(distance >= 3, `Stāvā ${floor} kolonna vai lāde atrodas pārāk tuvu citam šķērslim`);
    });
  });
  const blocked = new Set(solidObjects.map(({ x, y }) => cellKey(x, y)));
  assert(
    connectedWalkableCount(layout, blocked) === layout.floorCells.size - blocked.size,
    `Stāvā ${floor} kastes vai dekorācijas sadala karti nepieejamās daļās`
  );

  const bossRoom = mapRules.BOSS_CHAMBER;
  assert(bossRoom.gateRight - bossRoom.gateLeft + 1 >= 3, "Bosa vārtu ailei jābūt vismaz trīs flīzes platai");
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
