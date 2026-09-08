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

  const FULL_FACE_KEYS = new Set(["wall_mid", "wall_left", "wall_right"]);

  function paintWallLayer(plans, floorCells, mapWidth, mapHeight, x, y, key, flipY = false) {
    if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight || floorCells.has(cellKey(x, y))) return;

    const planKey = cellKey(x, y);
    const plan = plans.get(planKey) || { x, y, base: null, overlays: [] };
    const layer = { key, flipY };
    const sameLayer = (candidate) => candidate && candidate.key === key && candidate.flipY === flipY;

    if (FULL_FACE_KEYS.has(key)) {
      if (plan.base && FULL_FACE_KEYS.has(plan.base.key)) {
        if (plan.base.key !== key) plan.base = { key: "wall_mid", flipY: false };
        plans.set(planKey, plan);
        return;
      }
      if (plan.base && !plan.overlays.some(sameLayer)) plan.overlays.push(plan.base);
      plan.base = layer;
      plans.set(planKey, plan);
      return;
    }

    if (!plan.base) plan.base = layer;
    else if (!sameLayer(plan.base) && !plan.overlays.some(sameLayer)) plan.overlays.push(layer);
    plans.set(planKey, plan);
  }

  function paintHorizontalRuns(plans, floorCells, mapWidth, mapHeight, row, direction) {
    const edge = direction < 0 ? WALL_EDGE.NORTH : WALL_EDGE.SOUTH;
    let x = 0;
    while (x < mapWidth) {
      if (!floorCells.has(cellKey(x, row)) || !(wallMaskAt(floorCells, x, row) & edge)) {
        x += 1;
        continue;
      }

      const start = x;
      while (
        x + 1 < mapWidth
        && floorCells.has(cellKey(x + 1, row))
        && wallMaskAt(floorCells, x + 1, row) & edge
      ) x += 1;
      const end = x;
      const capY = direction < 0 ? row - 2 : row + 1;
      const faceY = row - 1;

      for (let column = start; column <= end; column += 1) {
        const capKey = start === end
          ? "wall_top_mid"
          : column === start
            ? "wall_top_left"
            : column === end
              ? "wall_top_right"
              : "wall_top_mid";
        const faceKey = start === end
          ? "wall_mid"
          : column === start
            ? "wall_left"
            : column === end
              ? "wall_right"
              : "wall_mid";

        if (direction < 0) {
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, column, capY, capKey);
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, column, faceY, faceKey);
        } else {
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, column, capY, faceKey);
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, column, capY, capKey, true);
        }
      }

      if (direction < 0) {
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, start - 1, capY, "wall_outer_top_left");
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, start - 1, faceY, "wall_outer_front_left");
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, end + 1, capY, "wall_outer_top_right");
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, end + 1, faceY, "wall_outer_front_right");
      } else {
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, start - 1, capY, "wall_outer_front_left");
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, start - 1, capY, "wall_outer_top_left", true);
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, end + 1, capY, "wall_outer_front_right");
        paintWallLayer(plans, floorCells, mapWidth, mapHeight, end + 1, capY, "wall_outer_top_right", true);
      }
      x += 1;
    }
  }

  function buildWallPlan(floorCells, mapWidth, mapHeight) {
    const plans = new Map();
    for (let y = 0; y < mapHeight; y += 1) {
      paintHorizontalRuns(plans, floorCells, mapWidth, mapHeight, y, -1);
      paintHorizontalRuns(plans, floorCells, mapWidth, mapHeight, y, 1);
    }

    for (let y = 0; y < mapHeight; y += 1) {
      for (let x = 0; x < mapWidth; x += 1) {
        if (!floorCells.has(cellKey(x, y))) continue;
        const mask = wallMaskAt(floorCells, x, y);
        if (mask & WALL_EDGE.WEST) {
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, x - 1, y, "wall_outer_mid_left");
        }
        if (mask & WALL_EDGE.EAST) {
          paintWallLayer(plans, floorCells, mapWidth, mapHeight, x + 1, y, "wall_outer_mid_right");
        }
      }
    }

    return [...plans.values()].map(({ x, y, base, overlays }) => ({
      x,
      y,
      base: base.key,
      baseFlipY: base.flipY,
      overlays,
      body: { width: TILE, height: TILE, offsetX: 0, offsetY: 0 }
    }));
  }

  return Object.freeze({
    WALL_EDGE,
    DUNGEON_RECTS,
    buildFloorCells,
    wallMaskAt,
    buildWallPlan
  });
});
