(function (root, factory) {
  const rules = factory();
  if (typeof module === "object" && module.exports) module.exports = rules;
  if (root) root.DungeonMapRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TILE = 16;
  const WALL_EDGE = Object.freeze({ NORTH: 1, EAST: 2, SOUTH: 4, WEST: 8 });
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

  function wallRuleForMask(mask) {
    const north = Boolean(mask & WALL_EDGE.NORTH);
    const east = Boolean(mask & WALL_EDGE.EAST);
    const south = Boolean(mask & WALL_EDGE.SOUTH);
    const west = Boolean(mask & WALL_EDGE.WEST);
    const horizontal = north || south;
    const overlays = [];
    let base = "wall_mid";
    let body = { width: TILE, height: TILE, offsetX: 0, offsetY: 0 };

    if (!horizontal) {
      if (west) base = "wall_outer_mid_left";
      else if (east) base = "wall_outer_mid_right";

      if (west && east) overlays.push({ key: "wall_outer_mid_right" });
      else if (west) body = { width: 4, height: TILE, offsetX: 0, offsetY: 0 };
      else if (east) body = { width: 4, height: TILE, offsetX: TILE - 4, offsetY: 0 };
    } else if (west && !east) {
      base = "wall_edge_left";
    } else if (east && !west) {
      base = "wall_edge_right";
    } else if (west && east) {
      overlays.push({ key: "wall_outer_mid_left" }, { key: "wall_outer_mid_right" });
    }

    const capKey = west && !east
      ? "wall_top_left"
      : east && !west
        ? "wall_top_right"
        : "wall_top_mid";
    if (north) overlays.push({ key: capKey });
    if (south) overlays.push({ key: capKey, flipY: true });

    return { base, overlays, body };
  }

  function buildWallPlan(floorCells, mapWidth, mapHeight) {
    const plan = [];
    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        if (!floorCells.has(cellKey(x, y))) continue;
        const mask = wallMaskAt(floorCells, x, y);
        if (!mask) continue;
        plan.push({ x, y, mask, ...wallRuleForMask(mask) });
      }
    }
    return plan;
  }

  return Object.freeze({
    WALL_EDGE,
    DUNGEON_RECTS,
    buildFloorCells,
    wallMaskAt,
    wallRuleForMask,
    buildWallPlan
  });
});
