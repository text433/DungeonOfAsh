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
    gateRight: 49,
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
    [47, 15, 3, 1],
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

  function mixSeed(value) {
    let mixed = value >>> 0;
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
    return (mixed ^ (mixed >>> 16)) >>> 0;
  }

  function createSeededRandom(seed) {
    let state = seed >>> 0;
    const next = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    return Object.freeze({
      next,
      int(min, max) {
        return min + Math.floor(next() * (max - min + 1));
      },
      pick(items) {
        return items[Math.floor(next() * items.length)];
      },
      chance(probability) {
        return next() < probability;
      }
    });
  }

  function makeRoom(centerX, centerY, width, height, label, mapWidth, mapHeight) {
    const left = Math.max(2, Math.min(mapWidth - width - 3, Math.round(centerX - width / 2)));
    const top = Math.max(2, Math.min(mapHeight - height - 3, Math.round(centerY - height / 2)));
    return Object.freeze({
      label,
      left,
      top,
      width,
      height,
      right: left + width - 1,
      bottom: top + height - 1,
      centerX: left + Math.floor(width / 2),
      centerY: top + Math.floor(height / 2)
    });
  }

  function roomRectangle(room) {
    return [room.left, room.top, room.width, room.height];
  }

  function carveCorridor(cells, from, to, random, mapWidth, mapHeight, horizontalFirst = random.chance(0.5)) {
    const add = (x, y) => {
      if (x < 1 || y < 1 || x >= mapWidth - 1 || y >= mapHeight - 1) return;
      cells.add(cellKey(x, y));
    };
    const horizontal = (fromX, toX, y) => {
      for (let x = Math.min(fromX, toX); x <= Math.max(fromX, toX); x += 1) {
        add(x, y);
        add(x, y + 1);
      }
    };
    const vertical = (fromY, toY, x) => {
      for (let y = Math.min(fromY, toY); y <= Math.max(fromY, toY); y += 1) {
        add(x, y);
        add(x + 1, y);
      }
    };

    if (horizontalFirst) {
      horizontal(from.centerX, to.centerX, from.centerY);
      vertical(from.centerY, to.centerY, to.centerX);
    } else {
      vertical(from.centerY, to.centerY, from.centerX);
      horizontal(from.centerX, to.centerX, to.centerY);
    }
  }

  function generateDungeonLayout(floor = 1, runSeed = 1, mapWidth = 64, mapHeight = 48) {
    if (mapWidth < 60 || mapHeight < 44) throw new Error("Procedurālajai kartei vajag vismaz 60x44 flīzes");
    const level = Math.max(1, Math.floor(Number(floor) || 1));
    const seed = mixSeed((Number(runSeed) >>> 0) ^ Math.imul(level, 0x9e3779b1));
    const random = createSeededRandom(seed);
    const sizedRoom = (centerX, centerY, minWidth, maxWidth, minHeight, maxHeight, label) => (
      makeRoom(
        centerX,
        centerY,
        random.int(minWidth, maxWidth),
        random.int(minHeight, maxHeight),
        label,
        mapWidth,
        mapHeight
      )
    );

    // Rooms stay compact and live in separate bands. Random dimensions and
    // corridor turns make every floor different without producing overlaps
    // that are too large to read on a phone.
    const startRoom = sizedRoom(8, random.int(34, 38), 8, 10, 6, 8, "start");
    const lowerMid = sizedRoom(random.int(19, 22), random.int(35, 39), 7, 10, 5, 7, "lower-mid");
    const lowerRight = sizedRoom(random.int(33, 37), random.int(35, 39), 7, 10, 5, 7, "lower-right");
    const midRight = sizedRoom(random.int(37, 41), random.int(25, 29), 7, 10, 5, 7, "mid-right");
    const centerRoom = sizedRoom(random.int(24, 29), random.int(22, 26), 7, 10, 5, 7, "center");
    const leftMid = sizedRoom(random.int(9, 13), random.int(21, 25), 7, 10, 5, 7, "left-mid");
    const upperLeft = sizedRoom(random.int(9, 14), random.int(9, 13), 7, 10, 5, 7, "upper-left");
    const upperMid = sizedRoom(random.int(24, 30), random.int(9, 13), 7, 10, 5, 7, "upper-mid");
    const antechamber = makeRoom(48, 19, 11, 6, "antechamber", mapWidth, mapHeight);
    const bossRoom = Object.freeze({
      label: "boss",
      left: BOSS_CHAMBER.left,
      top: BOSS_CHAMBER.top,
      width: BOSS_CHAMBER.right - BOSS_CHAMBER.left + 1,
      height: BOSS_CHAMBER.bottom - BOSS_CHAMBER.top + 1,
      right: BOSS_CHAMBER.right,
      bottom: BOSS_CHAMBER.bottom,
      centerX: BOSS_CHAMBER.entranceX,
      centerY: 11
    });
    const rooms = [startRoom, lowerMid, lowerRight, midRight, centerRoom, leftMid, upperLeft, upperMid, antechamber, bossRoom];
    const floorCells = buildFloorCells(rooms.map(roomRectangle));

    // A connected main route plus two branches/loops. The boss is reached
    // only through its guarded two-cell gate, never through a random tunnel.
    carveCorridor(floorCells, startRoom, lowerMid, random, mapWidth, mapHeight);
    carveCorridor(floorCells, lowerMid, lowerRight, random, mapWidth, mapHeight);
    carveCorridor(floorCells, lowerRight, midRight, random, mapWidth, mapHeight);
    carveCorridor(floorCells, midRight, antechamber, random, mapWidth, mapHeight, true);
    carveCorridor(floorCells, lowerMid, centerRoom, random, mapWidth, mapHeight);
    carveCorridor(floorCells, centerRoom, leftMid, random, mapWidth, mapHeight);
    carveCorridor(floorCells, leftMid, upperLeft, random, mapWidth, mapHeight);
    carveCorridor(floorCells, centerRoom, upperMid, random, mapWidth, mapHeight);
    if (random.chance(0.7)) carveCorridor(floorCells, upperLeft, upperMid, random, mapWidth, mapHeight);
    if (random.chance(0.55)) carveCorridor(floorCells, centerRoom, midRight, random, mapWidth, mapHeight);
    for (let x = BOSS_CHAMBER.gateLeft; x <= BOSS_CHAMBER.gateRight; x += 1) {
      floorCells.add(cellKey(x, BOSS_CHAMBER.wallY));
    }

    const occupied = new Set();
    const reserve = (point) => {
      occupied.add(cellKey(point.x, point.y));
      return Object.freeze(point);
    };
    const spawn = reserve({ x: startRoom.centerX, y: startRoom.centerY });
    const guide = reserve({ x: startRoom.left + 2, y: startRoom.centerY });
    const boss = reserve({ x: BOSS_CHAMBER.entranceX, y: 11 });
    const stairs = reserve({ x: BOSS_CHAMBER.right - 3, y: 11 });
    reserve({ x: BOSS_CHAMBER.gateLeft, y: BOSS_CHAMBER.wallY });
    reserve({ x: BOSS_CHAMBER.gateRight, y: BOSS_CHAMBER.wallY });

    const combatRooms = [lowerMid, lowerRight, midRight, centerRoom, leftMid, upperLeft, upperMid, antechamber];
    const pointInRoom = (room, margin = 1) => ({
      x: random.int(room.left + margin, room.right - margin),
      y: random.int(room.top + margin, room.bottom - margin)
    });
    const solidCells = new Set();
    const solidPoints = [];
    const floorStaysConnected = (candidateKey) => {
      const blocked = new Set(solidCells);
      blocked.add(candidateKey);
      const startKey = cellKey(spawn.x, spawn.y);
      if (blocked.has(startKey)) return false;
      const visited = new Set([startKey]);
      const queue = [[spawn.x, spawn.y]];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [x, y] = queue[cursor];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextX = x + dx;
          const nextY = y + dy;
          const key = cellKey(nextX, nextY);
          if (!floorCells.has(key) || blocked.has(key) || visited.has(key)) continue;
          visited.add(key);
          queue.push([nextX, nextY]);
        }
      }
      return visited.size === floorCells.size - blocked.size;
    };
    const claimPoint = (pool = combatRooms, margin = 1, options = {}) => {
      const solid = Boolean(options.solid);
      const spacing = Math.max(0, Number(options.spacing) || 0);
      const maxAttempts = solid ? 1200 : 160;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const point = pointInRoom(random.pick(pool), margin);
        const key = cellKey(point.x, point.y);
        if (!floorCells.has(key) || occupied.has(key)) continue;
        if (Math.abs(point.x - spawn.x) + Math.abs(point.y - spawn.y) < 4) continue;
        if (solid && solidPoints.some((other) => {
          const requiredSpacing = Math.max(spacing, other.spacing);
          return Math.max(Math.abs(point.x - other.x), Math.abs(point.y - other.y)) < requiredSpacing;
        })) continue;
        if (solid && !floorStaysConnected(key)) continue;
        occupied.add(key);
        if (solid) {
          solidCells.add(key);
          solidPoints.push({ ...point, spacing });
        }
        return Object.freeze(point);
      }
      if (options.optional) return null;
      throw new Error("Neizdevās atrast brīvu vietu procedurālās kartes objektam");
    };

    const chestCount = Math.min(5, 3 + Math.floor((level - 1) / 3));
    const chests = Array.from({ length: chestCount }, () => Object.freeze({
      ...claimPoint(combatRooms, 2, { solid: true, spacing: 3 }),
      keyChance: Math.min(0.55, 0.39 + level * 0.01)
    }));
    // One extra chest is a mimic. It gets its own reserved floor cell so it
    // never replaces a real loot chest or reduces the chance of finding the key.
    const mimic = claimPoint(combatRooms, 2, { solid: true, spacing: 3 });
    const trapCount = Math.min(7, 4 + Math.floor(level / 2));
    const traps = Array.from({ length: trapCount }, () => claimPoint(combatRooms, 1));
    const props = ["column", "crate", "crate", "crate", "column", "crate", "crate", "crate"]
      .map((type) => {
        const point = claimPoint(combatRooms, 2, {
          solid: true,
          spacing: type === "column" ? 3 : 2,
          optional: true
        });
        return point ? Object.freeze({ ...point, type }) : null;
      })
      .filter(Boolean);
    const skulls = Array.from({ length: 6 }, () => claimPoint(combatRooms, 1));

    const enemyPool = ["zombie", "zombie", "goblin", "goblin", "skeleton", "imp", "orc"];
    if (level >= 3) enemyPool.push("imp", "orc", "skeleton");
    if (level >= 6) enemyPool.push("orc", "orc", "imp");
    const enemyCount = 18 + Math.min(12, level * 2);
    const enemies = Array.from({ length: enemyCount }, () => Object.freeze({
      ...claimPoint(combatRooms, 1),
      type: random.pick(enemyPool)
    }));

    return Object.freeze({
      seed,
      level,
      rooms: Object.freeze(rooms),
      rectangles: Object.freeze(rooms.map((room) => Object.freeze(roomRectangle(room)))),
      floorCells,
      startRoom,
      spawn,
      guide,
      boss,
      stairs,
      chests: Object.freeze(chests),
      mimic,
      traps: Object.freeze(traps),
      props: Object.freeze(props),
      skulls: Object.freeze(skulls),
      enemies: Object.freeze(enemies),
      gate: BOSS_CHAMBER
    });
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

  function normalizeHorizontalWallRuns(plans, floorCells) {
    const rows = new Map();
    plans.forEach((plan) => {
      if (!rows.has(plan.y)) rows.set(plan.y, []);
      rows.get(plan.y).push(plan);
    });

    rows.forEach((row) => {
      row.sort((a, b) => a.x - b.x);
      let start = 0;
      while (start < row.length) {
        let end = start + 1;
        while (end < row.length && row[end].x === row[end - 1].x + 1) end += 1;
        const run = row.slice(start, end);
        const tallParts = run.filter((plan) => plan.facing !== "side");

        // A continuous horizontal wall must use one 32 px baseline. At a
        // procedural T-junction the local neighbour check can otherwise mix
        // north, south and 16 px side tiles in the same visible brick run.
        if (run.length > 1 && tallParts.length > 0) {
          let northScore = 0;
          let southScore = 0;
          run.forEach((plan) => {
            if (plan.facing === "north") northScore += 2;
            if (plan.facing === "south") southScore += 2;
            if (floorCells.has(cellKey(plan.x, plan.y + 1))) northScore += 3;
            if (floorCells.has(cellKey(plan.x, plan.y - 1))) southScore += 3;
          });
          const facing = northScore >= southScore ? "north" : "south";
          run.forEach((plan) => { plan.facing = facing; });
        }
        start = end;
      }
    });
    return plans;
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
    return normalizeHorizontalWallRuns(plans, floorCells);
  }

  return Object.freeze({
    WALL_EDGE,
    BOSS_CHAMBER,
    TOWN,
    TOWN_RECTS,
    DUNGEON_RECTS,
    MINIMAL_MASK_PATTERNS,
    mixSeed,
    createSeededRandom,
    generateDungeonLayout,
    buildFloorCells,
    buildWallCells,
    wallMaskAt,
    minimalWallMaskAt,
    wallFacing,
    buildWallPlan
  });
});
