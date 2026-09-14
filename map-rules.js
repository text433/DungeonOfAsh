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
  const BOSS_CHAMBER = Object.freeze({
    left: 40,
    right: 56,
    top: 7,
    bottom: 14,
    wallY: 15,
    gateLeft: 47,
    gateRight: 48,
    entranceX: 48
  });
  const TOWN = Object.freeze({
    plazaLeft: 14,
    plazaRight: 49,
    plazaTop: 18,
    plazaBottom: 39,
    houseLeft: 25,
    houseRight: 38,
    houseTop: 8,
    houseBottom: 16,
    wallY: 17,
    gateLeft: 31,
    gateRight: 32,
    entranceX: 32,
    npcX: 32,
    npcY: 12,
    smithX: 19,
    smithY: 27,
    stairsX: 43,
    stairsY: 29,
    spawnX: 32,
    spawnY: 24
  });
  const TOWN_RECTS = Object.freeze([
    Object.freeze([14, 18, 36, 22]),
    Object.freeze([25, 8, 14, 9]),
    Object.freeze([31, 17, 2, 1])
  ]);
  const DUNGEON_RECTS = Object.freeze([
    [3, 18, 13, 11],
    [3, 8, 13, 7],
    [9, 15, 3, 3],
    [16, 22, 4, 3],
    [20, 15, 15, 14],
    [25, 11, 4, 4],
    [20, 5, 15, 6],
    [35, 20, 5, 3],
    // Compact boss chamber: its two gate cells are the only opening in the
    // full-height divider wall, preserving a clean arch with no black seams.
    [40, 7, 17, 8],
    [47, 15, 2, 1],
    [40, 16, 17, 13],
    [27, 29, 4, 5],
    [22, 34, 15, 9],
    [37, 37, 4, 3],
    [41, 32, 16, 11]
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

  function wallFacing(floorCells, x, y) {
    const northFloor = floorCells.has(cellKey(x, y - 1));
    const southFloor = floorCells.has(cellKey(x, y + 1));
    const westFloor = floorCells.has(cellKey(x - 1, y));
    const eastFloor = floorCells.has(cellKey(x + 1, y));

    // The town house has the same full-height doorway wall rule as the boss
    // chamber. This keeps the arch, side columns and floor on one baseline.
    const townLayout = floorCells.has(cellKey(TOWN.plazaLeft, TOWN.plazaBottom))
      && floorCells.has(cellKey(TOWN.houseRight, TOWN.houseTop));
    if (
      townLayout &&
      y === TOWN.wallY &&
      x >= TOWN.plazaLeft && x <= TOWN.plazaRight &&
      (northFloor || southFloor)
    ) return "north";

    // The internal boss-room divider is a front-facing 32 px wall. Without
    // this structural rule, floor on both sides would incorrectly select a
    // thin side-wall tile.
    if (
      y === BOSS_CHAMBER.wallY &&
      x >= BOSS_CHAMBER.left && x <= BOSS_CHAMBER.right &&
      (northFloor || southFloor)
    ) return "north";

    if (southFloor && !northFloor) return "north";
    if (northFloor && !southFloor) return "south";

    // The diagonal-only corner cells belong to the horizontal wall run.
    // Direct left/right floor contact always remains a 16x16 side wall.
    if (!westFloor && !eastFloor) {
      const southCorner = floorCells.has(cellKey(x - 1, y + 1)) || floorCells.has(cellKey(x + 1, y + 1));
      const northCorner = floorCells.has(cellKey(x - 1, y - 1)) || floorCells.has(cellKey(x + 1, y - 1));
      // A vertical wall meeting a horizontal run is a tall T-junction. Using
      // the low side-wall atlas here leaves its upper half one tile too low.
      if (southCorner && northCorner) return "north";
      if (southCorner && !northCorner) return "north";
      if (northCorner && !southCorner) return "south";
    }

    return "side";
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
          facing: wallFacing(floorCells, x, y),
          body: { width: TILE, height: TILE, offsetX: 0, offsetY: 0 }
        });
      }
    }
    return plans;
  }

  return Object.freeze({
    WALL_EDGE,
    BOSS_CHAMBER,
    TOWN,
    TOWN_RECTS,
    DUNGEON_RECTS,
    MINIMAL_MASK_PATTERNS,
    buildFloorCells,
    buildWallCells,
    wallMaskAt,
    minimalWallMaskAt,
    wallFacing,
    buildWallPlan
  });
});
