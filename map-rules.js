(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  if (root) root.DungeonMapRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TILE = 16;
  const WALL_EDGE = Object.freeze({ NORTH: 1, EAST: 2, SOUTH: 4, WEST: 8 });
  const MINIMAL_MASK_PATTERNS = Object.freeze([
    "000010010", "000011010", "000111010", "000110010",
    "110111010", "000111011", "000111110", "011111010",
    "000011011", "010111111", "000111111", "000110110",
    "010010010", "010011010", "010111010", "010110010",
    "010011011", "011111111", "110111111", "010110110",
    "011011011", "011111110", null, "110111110",
    "010010000", "010011000", "010111000", "010110000",
    "011011010", "111111011", "111111110", "110110010",
    "011111011", "111111111", "110111011", "110110110",
    "000010000", "000011000", "000111000", "000110000",
    "010111110", "011111000", "110111000", "010111011",
    "011011000", "111111000", "111111010", "110110000"
  ]);
  const FRAME_BY_MINIMAL_MASK = new Map(
    MINIMAL_MASK_PATTERNS.flatMap((pattern, frame) => pattern ? [[pattern, frame]] : [])
  );
  const DUNGEON_RECTS = Object.freeze([
    [4, 18, 20, 16],
    [4, 8, 18, 7],
    [18, 15, 4, 3],
    [24, 24, 4, 4],
    [28, 13, 24, 21],
    [40, 10, 5, 3],
    [33, 3, 19, 7],
    [52, 23, 7, 4],
    [59, 10, 17, 27],
    [42, 34, 4, 8],
    [34, 42, 20, 10],
    [54, 45, 4, 4],
    [58, 41, 18, 11]
  ].map((rect) => Object.freeze(rect)));

  const cellKey = (x, y) => `${x},${y}`;

  function buildFloorCells(rectangles = DUNGEON_RECTS) {
    const cells = new Set();
    rectangles.forEach(([left, top, width, height]) => {
      for (let y = top; y < top + height; y += 1) {
        for (let x = left; x < left + width; x += 1) cells.add(cellKey(x, y));
      }
    });
    return cells;
  }

  function wallMaskAt(floorCells, x, y) {
    let mask = 0;
    if (!floorCells.has(cellKey(x, y - 1))) mask |= WALL_EDGE.NORTH;
    if (!floorCells.has(cellKey(x + 1, y))) mask |= WALL_EDGE.EAST;
    if (!floorCells.has(cellKey(x, y + 1))) mask |= WALL_EDGE.SOUTH;
    if (!floorCells.has(cellKey(x - 1, y))) mask |= WALL_EDGE.WEST;
    return mask;
  }

  function buildWallCells(floorCells, mapWidth, mapHeight) {
    const walls = new Set();
    floorCells.forEach((key) => {
      const [x, y] = key.split(",").map(Number);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const wallX = x + dx;
          const wallY = y + dy;
          if (wallX < 0 || wallY < 0 || wallX >= mapWidth || wallY >= mapHeight) continue;
          const wallKey = cellKey(wallX, wallY);
          if (!floorCells.has(wallKey)) walls.add(wallKey);
        }
      }
    });
    return walls;
  }

  function minimalWallMaskAt(wallCells, x, y) {
    const has = (dx, dy) => wallCells.has(cellKey(x + dx, y + dy));
    const north = has(0, -1);
    const east = has(1, 0);
    const south = has(0, 1);
    const west = has(-1, 0);

    // Godot 3x3-minimal: a diagonal counts only when both adjoining edges connect.
    return [
      north && west && has(-1, -1), north,
      north && east && has(1, -1), west,
      true, east,
      south && west && has(-1, 1), south,
      south && east && has(1, 1)
    ].map((filled) => filled ? "1" : "0").join("");
  }

  function buildWallPlan(floorCells, mapWidth, mapHeight) {
    const wallCells = buildWallCells(floorCells, mapWidth, mapHeight);
    const plans = [];
    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        if (!wallCells.has(cellKey(x, y))) continue;
        const mask = minimalWallMaskAt(wallCells, x, y);
        const frame = FRAME_BY_MINIMAL_MASK.get(mask);
        if (frame == null) throw new Error(`Nav 3x3-minimal sienas flīzes maskai ${mask}`);
        plans.push({
          x,
          y,
          frame,
          mask,
          body: { width: TILE, height: TILE, offsetX: 0, offsetY: 0 }
        });
      }
    }
    return plans;
  }

  return Object.freeze({
    WALL_EDGE,
    DUNGEON_RECTS,
    MINIMAL_MASK_PATTERNS,
    buildFloorCells,
    buildWallCells,
    wallMaskAt,
    minimalWallMaskAt,
    buildWallPlan
  });
});
