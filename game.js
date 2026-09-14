(function () {
  "use strict";

  const TILE = 16;
  const HIGH_WALL_TOP_INSET = 11;
  const MAP_W = 80;
  const MAP_H = 56;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const MAX_HP = 6;
  const mapRules = window.DungeonMapRules;
  const BOSS_CHAMBER = mapRules.BOSS_CHAMBER;
  const TOWN = mapRules.TOWN;
  const progressionApi = window.DungeonProgression;
  const progression = progressionApi.progression;
  const TALENTS = progressionApi.TALENTS;
  const BOSS_GATE_WALL_FRAME = 38;
  const TOUCH_DEVICE = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  const dom = {
    hud: document.getElementById("hud"),
    hearts: document.getElementById("hearts"),
    xp: document.getElementById("xp-fill"),
    gold: document.getElementById("gold"),
    floor: document.getElementById("floor"),
    area: document.getElementById("area-label"),
    objective: document.getElementById("objective"),
    prompt: document.getElementById("prompt"),
    mobile: document.getElementById("mobile-controls"),
    start: document.getElementById("start-screen"),
    pause: document.getElementById("pause-screen"),
    result: document.getElementById("result-screen"),
    resultKicker: document.getElementById("result-kicker"),
    resultTitle: document.getElementById("result-title"),
    resultCopy: document.getElementById("result-copy"),
    talent: document.getElementById("talent-screen"),
    talentButton: document.getElementById("talent-button"),
    talentClose: document.getElementById("talent-close"),
    talentPoints: document.getElementById("talent-points"),
    talentHudPoints: document.getElementById("talent-hud-points"),
    buff: document.getElementById("buff-chip"),
    ability: document.getElementById("ability-button")
  };

  const asset = (name) => `assets/frames/${name}.png`;

  const ASSETS = {
    floor: ["floor_1", "floor_2", "floor_3", "floor_4", "floor_5", "floor_6", "floor_7", "floor_8"],
    walls: [
      "wall_banner_red", "wall_banner_blue", "wall_banner_green", "wall_banner_yellow", "wall_hole_1", "wall_hole_2",
      "column", "column_wall", "crate", "skull", "wall_fountain_top_2",
      "doors_frame_left", "doors_frame_top", "doors_frame_right", "doors_leaf_closed", "doors_leaf_open",
      "floor_stairs", "floor_ladder", "floor_spikes_anim_f0", "floor_spikes_anim_f1", "floor_spikes_anim_f2", "floor_spikes_anim_f3"
    ],
    playerIdle: [0, 1, 2, 3].map((i) => `knight_m_idle_anim_f${i}`),
    playerRun: [0, 1, 2, 3].map((i) => `knight_m_run_anim_f${i}`),
    zombie: ["zombie_anim_f1", "zombie_anim_f2", "zombie_anim_f3", "zombie_anim_f10"],
    goblinIdle: [0, 1, 2, 3].map((i) => `goblin_idle_anim_f${i}`),
    goblinRun: [0, 1, 2, 3].map((i) => `goblin_run_anim_f${i}`),
    skeletonIdle: [0, 1, 2, 3].map((i) => `skelet_idle_anim_f${i}`),
    skeletonRun: [0, 1, 2, 3].map((i) => `skelet_run_anim_f${i}`),
    impIdle: [0, 1, 2, 3].map((i) => `imp_idle_anim_f${i}`),
    impRun: [0, 1, 2, 3].map((i) => `imp_run_anim_f${i}`),
    townNpc: [0, 1, 2, 3].map((i) => `wizzard_m_idle_anim_f${i}`),
    guideNpc: [0, 1, 2, 3].map((i) => `angel_idle_anim_f${i}`),
    orcIdle: [0, 1, 2, 3].map((i) => `orc_warrior_idle_anim_f${i}`),
    orcRun: [0, 1, 2, 3].map((i) => `orc_warrior_run_anim_f${i}`),
    bossIdle: [0, 1, 2, 3].map((i) => `big_demon_idle_anim_f${i}`),
    bossRun: [0, 1, 2, 3].map((i) => `big_demon_run_anim_f${i}`),
    chest: [0, 1, 2].map((i) => `chest_full_open_anim_f${i}`),
    coin: [0, 1, 2, 3].map((i) => `coin_anim_f${i}`),
    items: ["weapon_golden_sword", "flask_big_red", "ui_heart_full", "ui_heart_half", "ui_heart_empty"]
  };

  const FLOOR_UNDERLAY_PIECES = Object.freeze([
    { name: "north-west", dx: -1, dy: -1, x: 0, y: 0, width: 8, height: 8 },
    { name: "north", dx: 0, dy: -1, x: 0, y: 0, width: 16, height: 8 },
    { name: "north-east", dx: 1, dy: -1, x: 8, y: 0, width: 8, height: 8 },
    { name: "west", dx: -1, dy: 0, x: 0, y: 0, width: 8, height: 16 },
    { name: "east", dx: 1, dy: 0, x: 8, y: 0, width: 8, height: 16 },
    { name: "south-west", dx: -1, dy: 1, x: 0, y: 8, width: 8, height: 8 },
    { name: "south", dx: 0, dy: 1, x: 0, y: 8, width: 16, height: 8 },
    { name: "south-east", dx: 1, dy: 1, x: 8, y: 8, width: 8, height: 8 }
  ]);

  class RunState {
    constructor(data = {}) {
      this.floor = data.level || 1;
      this.maxHp = MAX_HP + progression.bonuses().maxHp;
      this.hp = Phaser.Math.Clamp(data.hp == null ? this.maxHp : data.hp, 1, this.maxHp);
      this.gold = data.gold || 0;
      this.hasKey = false;
      this.chestOpened = false;
      this.doorOpened = false;
      this.bossDead = false;
      this.kills = 0;
      this.totalEnemies = 0;
    }

    damage(amount) {
      this.hp = Math.max(0, this.hp - amount);
      return this.hp;
    }

    heal(amount) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + amount);
      return this.hp - before;
    }

    loseGold(fraction) {
      const lost = Math.min(this.gold, Math.ceil(this.gold * fraction));
      this.gold -= lost;
      return lost;
    }

    addGold(amount) {
      this.gold += amount;
      const lifetime = Number(localStorage.getItem("dungeonOfAshGold") || 0) + amount;
      localStorage.setItem("dungeonOfAshGold", String(lifetime));
    }

    saveBestFloor() {
      const best = Number(localStorage.getItem("dungeonOfAshBestFloor") || 0);
      if (this.floor > best) localStorage.setItem("dungeonOfAshBestFloor", String(this.floor));
    }
  }

  class InputSystem {
    constructor(scene) {
      this.scene = scene;
      this.pulses = new Set();
      this.touchVector = new Phaser.Math.Vector2(0, 0);
      this.moveVector = new Phaser.Math.Vector2(0, 0);
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = scene.input.keyboard.addKeys("W,A,S,D,SPACE,E,Q");
      this.bindTouch();
    }

    bindTouch() {
      document.querySelectorAll("[data-action]").forEach((button) => {
        const action = button.dataset.action;
        const down = (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          button.classList.add("pressed");
          this.pulses.add(action);
        };
        const up = (event) => {
          event.preventDefault();
          button.classList.remove("pressed");
        };
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointercancel", up);
        button.addEventListener("pointerleave", up);
      });

      const zone = document.getElementById("joystick-zone");
      const base = document.getElementById("joystick-base");
      const knob = document.getElementById("joystick-knob");
      let activePointer = null;

      const updateJoystick = (event) => {
        const bounds = base.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const limit = bounds.width * 0.29;
        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;
        const distance = Math.hypot(dx, dy);
        if (distance > limit) {
          dx = (dx / distance) * limit;
          dy = (dy / distance) * limit;
        }
        this.touchVector.set(dx / limit, dy / limit);
        const strength = this.touchVector.length();
        if (strength < 0.16) this.touchVector.set(0, 0);
        else this.touchVector.setLength(Math.min(1, (strength - 0.16) / 0.84));
        knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      };

      const startJoystick = (event) => {
        event.preventDefault();
        activePointer = event.pointerId;
        zone.setPointerCapture?.(event.pointerId);
        zone.classList.add("active");
        updateJoystick(event);
      };

      const moveJoystick = (event) => {
        if (event.pointerId !== activePointer) return;
        event.preventDefault();
        updateJoystick(event);
      };

      const stopJoystick = (event) => {
        if (activePointer !== null && event.pointerId !== activePointer) return;
        activePointer = null;
        this.touchVector.set(0, 0);
        zone.classList.remove("active");
        knob.style.transform = "translate3d(0, 0, 0)";
      };

      zone.addEventListener("pointerdown", startJoystick);
      zone.addEventListener("pointermove", moveJoystick);
      zone.addEventListener("pointerup", stopJoystick);
      zone.addEventListener("pointercancel", stopJoystick);
      zone.addEventListener("lostpointercapture", stopJoystick);
    }

    movement(delta = 16.667) {
      let x = 0;
      let y = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown) y += 1;
      const vector = new Phaser.Math.Vector2(x, y);
      const target = vector.lengthSq() > 0 ? vector.normalize() : this.touchVector;
      const smoothing = 1 - Math.exp(-Math.max(0, delta) / 28);
      this.moveVector.lerp(target, smoothing);
      if (target.lengthSq() === 0 && this.moveVector.lengthSq() < 0.0001) this.moveVector.set(0, 0);
      return this.moveVector.clone();
    }

    attackPressed() {
      if (this.pulses.delete("attack")) return true;
      return Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    }

    interactPressed() {
      if (this.pulses.delete("interact")) return true;
      return Phaser.Input.Keyboard.JustDown(this.keys.E);
    }

    abilityPressed() {
      if (this.pulses.delete("ability")) return true;
      return Phaser.Input.Keyboard.JustDown(this.keys.Q);
    }
  }

  class SoundKit {
    constructor() {
      this.context = null;
      this.enabled = true;
    }

    unlock() {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume();
    }

    blip(frequency, duration = 0.06, type = "square", volume = 0.025) {
      if (!this.context || !this.enabled) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
      gain.gain.setValueAtTime(volume, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    }
  }

  const sound = new SoundKit();

  class DungeonScene extends Phaser.Scene {
    constructor() {
      super("Dungeon");
      this.ready = false;
      this.running = false;
      this.pausedByUser = false;
      this.ended = false;
    }

    init(data) {
      this.startData = data || {};
      this.area = data.area || "town";
      this.state = new RunState(data);
      this.running = Boolean(data.autoStart);
      this.ended = false;
      this.pausedByUser = false;
      this.lastFacing = new Phaser.Math.Vector2(1, 0);
      this.attackReadyAt = 0;
      this.hurtReadyAt = 0;
      this.wardEndsAt = 0;
      this.transitioning = false;
      this.respawning = false;
      this.talentOpen = false;
    }

    preload() {
      this.load.setPath("assets/frames/");
      this.load.spritesheet("wall_atlas_low", "atlas_walls_low-16x16.png", {
        frameWidth: TILE,
        frameHeight: TILE
      });
      this.load.spritesheet("wall_atlas_high", "atlas_walls_high-16x32.png", {
        frameWidth: TILE,
        frameHeight: TILE * 2
      });
      const allKeys = [
        ...ASSETS.floor, ...ASSETS.walls, ...ASSETS.playerIdle, ...ASSETS.playerRun,
        ...ASSETS.zombie, ...ASSETS.goblinIdle, ...ASSETS.goblinRun,
        ...ASSETS.skeletonIdle, ...ASSETS.skeletonRun, ...ASSETS.impIdle, ...ASSETS.impRun,
        ...ASSETS.townNpc, ...ASSETS.guideNpc, ...ASSETS.orcIdle, ...ASSETS.orcRun,
        ...ASSETS.bossIdle, ...ASSETS.bossRun, ...ASSETS.chest, ...ASSETS.coin, ...ASSETS.items
      ];
      [...new Set(allKeys)].forEach((key) => this.load.image(key, `${key}.png`));
    }

    create() {
      this.createAnimations();
      this.inputSystem = new InputSystem(this);
      this.walls = this.physics.add.staticGroup();
      this.props = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group();
      this.drops = this.physics.add.group({ allowGravity: false });
      this.floorTiles = this.add.group();
      this.healthBars = this.add.group();
      this.fx = this.add.group();

      this.createFloorUnderlayFrames();
      this.buildDungeon();
      this.createPlayer();
      if (this.area === "dungeon") this.spawnEncounters();
      else this.state.totalEnemies = 0;
      this.createCollisions();
      this.configureCamera();
      this.updateHud();

      this.ready = true;
      window.__DUNGEON_DEBUG__ = { scene: this, state: this.state };

      if (this.running) {
        showGameplayUi();
      } else {
        this.scene.pause();
      }
    }

    createAnimations() {
      const create = (key, frames, frameRate, repeat = -1) => {
        if (this.anims.exists(key)) return;
        this.anims.create({ key, frames: frames.map((frame) => ({ key: frame })), frameRate, repeat });
      };
      create("player-idle", ASSETS.playerIdle, 5);
      create("player-run", ASSETS.playerRun, 9);
      create("zombie-idle", ASSETS.zombie, 5);
      create("goblin-idle", ASSETS.goblinIdle, 5);
      create("goblin-run", ASSETS.goblinRun, 9);
      create("skeleton-idle", ASSETS.skeletonIdle, 5);
      create("skeleton-run", ASSETS.skeletonRun, 8);
      create("imp-idle", ASSETS.impIdle, 7);
      create("imp-run", ASSETS.impRun, 10);
      create("town-npc-idle", ASSETS.townNpc, 5);
      create("guide-npc-idle", ASSETS.guideNpc, 5);
      create("orc-idle", ASSETS.orcIdle, 5);
      create("orc-run", ASSETS.orcRun, 8);
      create("boss-idle", ASSETS.bossIdle, 5);
      create("boss-run", ASSETS.bossRun, 7);
      create("coin-spin", ASSETS.coin, 9);
      create("spikes", ["floor_spikes_anim_f0", "floor_spikes_anim_f1", "floor_spikes_anim_f2", "floor_spikes_anim_f3"], 5);
      create("chest-open", ASSETS.chest, 8, 0);
    }

    buildDungeon() {
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      if (this.area === "town") {
        this.buildTown();
        return;
      }
      this.floorCells = mapRules.buildFloorCells();
      this.wallCells = new Set();
      this.wallPlan = [];

      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          if (!this.hasFloor(x, y)) continue;
          const noise = this.hash(x, y, this.state.floor);
          const key = noise % 13 === 0 ? ASSETS.floor[1 + (noise % (ASSETS.floor.length - 1))] : "floor_1";
          const tile = this.add.image(x * TILE + 8, y * TILE + 8, key, "__BASE").setDepth(-30);
          this.floorTiles.add(tile);
        }
      }

      this.buildWallAutotiles();

      // The 32 px gate replaces two cells in the boss chamber's front wall.
      // Its baseline matches the adjacent 32 px wall tiles exactly.
      this.door = this.props.create(
        BOSS_CHAMBER.entranceX * TILE,
        (BOSS_CHAMBER.wallY + 1) * TILE,
        "doors_leaf_closed"
      );
      this.door.setOrigin(0.5, 1).setDepth(this.door.y).refreshBody();
      this.door.body.setSize(28, 11).setOffset(2, 21);
      this.doorArch = this.add.image(
        BOSS_CHAMBER.entranceX * TILE,
        (BOSS_CHAMBER.wallY - 1) * TILE,
        "doors_frame_top"
      ).setOrigin(0.5, 1).setDepth(this.door.y - 1);

      this.chests = [
        this.createChest(11, 11, true),
        this.createChest(43, 30, false),
        this.createChest(67, 47, false)
      ];

      this.guideNpc = this.add.sprite(7 * TILE + 8, 21 * TILE + 8, ASSETS.guideNpc[0])
        .setOrigin(0.5, 1).setDepth(21 * TILE + 8).play("guide-npc-idle");
      this.respawnPoint = { x: 8 * TILE + 8, y: 23 * TILE + 8 };

      const wallDecorations = [
        [9, 7, "wall_banner_blue"], [38, 2, "wall_banner_red"],
        [65, 9, "wall_banner_green"], [72, 9, "wall_banner_red"],
        [31, 12, "wall_hole_2"], [61, 9, "wall_hole_1"], [74, 9, "wall_hole_2"]
      ];
      wallDecorations.forEach(([x, y, key]) => {
        this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 8);
      });

      // Tall wall columns frame the boss gate while solid columns give the
      // larger rooms readable structure without blocking their main routes.
      [[64, BOSS_CHAMBER.wallY], [71, BOSS_CHAMBER.wallY]].forEach(([x, y]) => {
        const columnBaseline = (y + 2) * TILE;
        this.add.image(x * TILE + 8, columnBaseline, "column_wall")
          .setOrigin(0.5, 1)
          .setDepth(columnBaseline - 1);
      });

      const solidDecorations = [
        [7, 31, "crate"], [48, 31, "crate"], [69, 34, "crate"],
        [62, 27, "column"], [73, 27, "column"],
        [32, 29, "column"], [48, 29, "column"],
        [37, 49, "column"], [51, 49, "column"]
      ];
      solidDecorations.forEach(([x, y, key]) => {
        const propY = key === "column" ? (y + 1) * TILE : y * TILE + 8;
        const prop = this.props.create(x * TILE + 8, propY, key);
        if (key === "column") {
          prop.setOrigin(0.5, 1).setDepth(propY + 1).refreshBody();
          prop.body.setSize(12, 10).setOffset(2, 38);
        } else {
          prop.setDepth(propY).refreshBody();
        }
      });

      const floorDecorations = [
        [21, 30, "skull"], [61, 22, "skull"], [74, 32, "skull"],
        [36, 24, "skull"], [50, 17, "skull"]
      ];
      floorDecorations.forEach(([x, y, key]) => {
        this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 8);
      });

      this.spikeTraps = [
        [26, 25], [42, 11], [55, 25], [44, 38]
      ].map(([x, y]) => this.add.sprite(x * TILE + 8, y * TILE + 8, "floor_spikes_anim_f0").setDepth(-2).play("spikes"));
      this.spikes = this.spikeTraps[0];
      this.stairs = null;
      this.townStairs = null;
    }

    buildTown() {
      this.floorCells = mapRules.buildFloorCells(mapRules.TOWN_RECTS);
      this.wallCells = new Set();
      this.wallPlan = [];
      this.chests = [];
      this.spikeTraps = [];
      this.stairs = null;
      this.door = null;
      this.boss = null;

      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          if (!this.hasFloor(x, y)) continue;
          const noise = this.hash(x, y, 77);
          const key = noise % 17 === 0 ? ASSETS.floor[1 + (noise % 4)] : "floor_1";
          this.floorTiles.add(this.add.image(x * TILE + 8, y * TILE + 8, key, "__BASE").setDepth(-30));
        }
      }

      this.buildWallAutotiles();

      const gateBaseline = (TOWN.wallY + 1) * TILE;
      this.add.image(TOWN.entranceX * TILE, gateBaseline, "doors_leaf_open")
        .setOrigin(0.5, 1).setDepth(gateBaseline);
      this.add.image(TOWN.entranceX * TILE, (TOWN.wallY - 1) * TILE, "doors_frame_top")
        .setOrigin(0.5, 1).setDepth(gateBaseline - 1);

      this.townNpc = this.add.sprite(TOWN.npcX * TILE + 8, TOWN.npcY * TILE + 8, ASSETS.townNpc[0])
        .setOrigin(0.5, 1).setDepth(TOWN.npcY * TILE + 8).play("town-npc-idle");
      this.respawnPoint = { x: TOWN.spawnX * TILE + 8, y: TOWN.spawnY * TILE + 8 };

      this.townStairs = this.add.image(TOWN.stairsX * TILE + 8, TOWN.stairsY * TILE + 8, "floor_ladder")
        .setDepth(-1);
      this.tweens.add({ targets: this.townStairs, alpha: 0.68, duration: 650, yoyo: true, repeat: -1 });

      this.add.image(26 * TILE + 8, 16 * TILE + 8, "wall_fountain_top_2").setDepth(16 * TILE + 8);
      [[33, 7, "wall_banner_blue"], [42, 7, "wall_banner_yellow"]].forEach(([x, y, key]) => {
        this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 8);
      });
      [[24, 21], [55, 21], [24, 39], [55, 39]].forEach(([x, y]) => {
        const baseline = (y + 1) * TILE;
        const column = this.props.create(x * TILE + 8, baseline, "column");
        column.setOrigin(0.5, 1).setDepth(baseline + 1).refreshBody();
        column.body.setSize(12, 10).setOffset(2, 38);
      });
      [[27, 35], [48, 12], [51, 37]].forEach(([x, y]) => {
        this.props.create(x * TILE + 8, y * TILE + 8, "crate").setDepth(y * TILE + 8).refreshBody();
      });
    }

    createChest(tileX, tileY, hasKey) {
      const chest = this.props.create(tileX * TILE + 8, tileY * TILE + 8, ASSETS.chest[0]);
      chest.setDepth(chest.y).setData({ opened: false, hasKey }).refreshBody();
      chest.body.setSize(15, 11).setOffset(0, 5);
      return chest;
    }

    hasFloor(x, y) {
      return this.floorCells.has(`${x},${y}`);
    }

    createFloorUnderlayFrames() {
      const texture = this.textures.get("floor_1");
      FLOOR_UNDERLAY_PIECES.forEach((piece) => {
        const frameName = `wall-floor-${piece.name}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, piece.x, piece.y, piece.width, piece.height);
        }
      });
    }

    addWallFloorUnderlay(x, y) {
      FLOOR_UNDERLAY_PIECES.forEach((piece) => {
        if (!this.hasFloor(x + piece.dx, y + piece.dy)) return;
        const underlay = this.add.image(
          x * TILE + piece.x,
          y * TILE + piece.y,
          "floor_1",
          `wall-floor-${piece.name}`
        ).setOrigin(0).setDepth(-30);
        this.floorTiles.add(underlay);
      });
    }

    highWallFrame(frame) {
      return Math.floor(frame / 12) * 24 + (frame % 12);
    }

    buildWallAutotiles() {
      this.wallPlan = mapRules.buildWallPlan(this.floorCells, MAP_W, MAP_H);
      const activeGate = this.area === "town" ? TOWN : BOSS_CHAMBER;
      this.wallPlan.forEach((rule) => {
        this.wallCells.add(`${rule.x},${rule.y}`);
        this.addWallFloorUnderlay(rule.x, rule.y);
        const gateFrameKey = rule.y === activeGate.wallY
          ? rule.x === activeGate.gateLeft - 1
            ? "doors_frame_left"
            : rule.x === activeGate.gateRight + 1
              ? "doors_frame_right"
              : null
          : null;
        if (gateFrameKey) {
          // Keep a full-height straight wall under the transparent arch trim.
          // The trim shapes the doorway without making these cells look thin.
          this.addWall(
            rule.x,
            rule.y,
            "wall_atlas_high",
            { width: TILE, height: TILE, offsetX: 0, offsetY: TILE },
            this.highWallFrame(BOSS_GATE_WALL_FRAME),
            "north"
          );
          this.add.image(
            rule.x * TILE + 8,
            (rule.y + 1) * TILE,
            gateFrameKey
          ).setOrigin(0.5, 1).setDepth(rule.y * TILE + 8);
          return;
        }
        const isTall = rule.facing !== "side";
        const key = isTall ? "wall_atlas_high" : "wall_atlas_low";
        const frame = isTall ? this.highWallFrame(rule.frame) : rule.frame;
        const body = isTall
          ? { width: TILE, height: TILE, offsetX: 0, offsetY: rule.facing === "north" ? TILE : HIGH_WALL_TOP_INSET }
          : rule.body;
        this.addWall(rule.x, rule.y, key, body, frame, rule.facing);
      });
    }

    addWall(x, y, key, body = { width: TILE, height: TILE, offsetX: 0, offsetY: 0 }, frame, facing = "side") {
      const isTall = facing !== "side";
      const wallY = y * TILE + (facing === "north" ? TILE : facing === "south" ? -HIGH_WALL_TOP_INSET : 8);
      const wall = this.walls.create(x * TILE + 8, wallY, key, frame);
      if (facing === "north") wall.setOrigin(0.5, 1);
      if (facing === "south") wall.setOrigin(0.5, 0);
      wall.setDepth(y * TILE + (isTall ? 7 : 8)).refreshBody();
      wall.body.setSize(body.width, body.height).setOffset(body.offsetX, body.offsetY);
      return wall;
    }

    createPlayer() {
      const spawn = this.area === "town"
        ? this.respawnPoint
        : { x: this.respawnPoint?.x || 8 * TILE + 8, y: this.respawnPoint?.y || 25 * TILE + 8 };
      this.player = this.physics.add.sprite(spawn.x, spawn.y, ASSETS.playerIdle[0]);
      this.player.setOrigin(0.5, 1).setDepth(this.player.y).play("player-idle");
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(10, 9).setOffset(3, 18);
    }

    spawnEncounters() {
      const scale = 1 + (this.state.floor - 1) * 0.18;
      const positions = [
        [15, 23, "zombie"], [19, 30, "orc"], [9, 12, "goblin"],
        [37, 7, "orc"], [48, 7, "skeleton"], [34, 18, "zombie"],
        [46, 19, "orc"], [38, 29, "goblin"], [48, 30, "orc"],
        [40, 47, "orc"], [49, 48, "skeleton"], [63, 23, "orc"],
        [71, 30, "zombie"], [30, 28, "imp"], [52, 24, "goblin"],
        [61, 30, "skeleton"], [71, 45, "imp"], [64, 46, "goblin"],
        [21, 21, "skeleton"], [35, 45, "zombie"], [55, 46, "imp"], [73, 49, "orc"]
      ];
      if (this.state.floor >= 2) positions.push([70, 35, "orc"], [45, 46, "skeleton"], [31, 25, "goblin"]);
      positions.forEach(([x, y, type]) => this.spawnEnemy(x, y, type, scale));
      this.boss = this.spawnEnemy(68, 15, "boss", scale);
      this.state.totalEnemies = this.enemies.countActive(true);
    }

    spawnEnemy(tileX, tileY, type, scale) {
      const definitions = {
        zombie: { texture: ASSETS.zombie[0], idle: "zombie-idle", run: "zombie-idle", hp: 2, speed: 31, damage: 1, reward: 2, aggroRadius: 128, patrolRadius: 46 },
        goblin: { texture: ASSETS.goblinIdle[0], idle: "goblin-idle", run: "goblin-run", hp: 2, speed: 46, damage: 1, reward: 3, aggroRadius: 145, patrolRadius: 58 },
        skeleton: { texture: ASSETS.skeletonIdle[0], idle: "skeleton-idle", run: "skeleton-run", hp: 3, speed: 36, damage: 1, reward: 3, aggroRadius: 158, patrolRadius: 52 },
        imp: { texture: ASSETS.impIdle[0], idle: "imp-idle", run: "imp-run", hp: 3, speed: 43, damage: 1, reward: 4, aggroRadius: 170, patrolRadius: 62 },
        orc: { texture: ASSETS.orcIdle[0], idle: "orc-idle", run: "orc-run", hp: 4, speed: 39, damage: 1, reward: 4, aggroRadius: 185, patrolRadius: 54 },
        boss: { texture: ASSETS.bossIdle[0], idle: "boss-idle", run: "boss-run", hp: 16, speed: 34, damage: 2, reward: 20, aggroRadius: 390, patrolRadius: 70 }
      };
      const def = definitions[type];
      const originX = tileX * TILE + 8;
      const originY = tileY * TILE + 8;
      const enemy = this.enemies.create(originX, originY, def.texture);
      enemy.setOrigin(0.5, 1).setDepth(enemy.y).play(def.idle);
      enemy.setData({
        type,
        idle: def.idle,
        run: def.run,
        hp: Math.ceil(def.hp * scale),
        maxHp: Math.ceil(def.hp * scale),
        speed: def.speed * Math.min(1.45, scale),
        damage: def.damage,
        reward: Math.ceil(def.reward * scale),
        aggroRadius: def.aggroRadius,
        patrolRadius: def.patrolRadius,
        originX,
        originY,
        wanderX: originX,
        wanderY: originY,
        aiState: "idle",
        decisionAt: this.time.now + Phaser.Math.Between(250, 1300),
        patrolDirection: Math.random() < 0.5 ? -1 : 1,
        staggerUntil: 0
      });
      if (type === "boss") enemy.body.setSize(22, 20).setOffset(5, 15);
      else if (type === "orc") enemy.body.setSize(11, 11).setOffset(2, 11);
      else enemy.body.setSize(10, 9).setOffset(3, 7);
      enemy.setCollideWorldBounds(true);
      this.createEnemyHealthBar(enemy, type);
      return enemy;
    }

    createEnemyHealthBar(enemy, type) {
      const width = type === "boss" ? 34 : 18;
      const height = type === "boss" ? 4 : 3;
      const offsetY = type === "boss" ? 42 : type === "orc" ? 29 : 22;
      const background = this.add.rectangle(enemy.x, enemy.y - offsetY, width + 2, height + 2, 0x120c10, 0.96)
        .setStrokeStyle(1, 0x4d3030, 1);
      const fill = this.add.rectangle(enemy.x - width / 2, enemy.y - offsetY, width, height, 0xc44336, 1)
        .setOrigin(0, 0.5);
      this.healthBars.addMultiple([background, fill]);
      enemy.healthBar = { background, fill, width, offsetY };
      this.updateEnemyHealthBar(enemy);
    }

    updateEnemyHealthBar(enemy) {
      const bar = enemy.healthBar;
      if (!bar) return;
      const ratio = Phaser.Math.Clamp(enemy.getData("hp") / enemy.getData("maxHp"), 0, 1);
      const y = enemy.y - bar.offsetY;
      bar.background.setPosition(enemy.x, y).setDepth(enemy.depth + 20);
      bar.fill.setPosition(enemy.x - bar.width / 2, y).setDepth(enemy.depth + 21);
      bar.fill.displayWidth = Math.max(0.01, bar.width * ratio);
      bar.fill.setFillStyle(ratio > 0.55 ? 0xc44336 : ratio > 0.25 ? 0xd78632 : 0xe34b36, 1);
      bar.fill.setVisible(ratio > 0);
    }

    createCollisions() {
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.player, this.props);
      this.physics.add.collider(this.enemies, this.walls);
      this.physics.add.collider(this.enemies, this.props);
      this.physics.add.collider(this.enemies, this.enemies);
      this.physics.add.overlap(this.player, this.enemies, this.handleEnemyContact, null, this);
      this.physics.add.overlap(this.player, this.drops, this.collectDrop, null, this);
    }

    configureCamera() {
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      // Keep fractional camera scroll so a 1 px world correction does not become
      // a visible 3–4 px jump after zooming the canvas.
      this.cameras.main.startFollow(this.player, false, 1, 1);
      this.cameras.main.setRoundPixels(false);
      this.cameras.main.setBackgroundColor(0x09080b);
      this.updateZoom();
      this.scale.on("resize", () => this.updateZoom());
    }

    updateZoom() {
      const width = this.scale.width || window.innerWidth;
      let zoom = 3;
      if (width > 1500) zoom = 4;
      this.cameras.main.setZoom(zoom);
    }

    beginRun() {
      if (!this.ready) return;
      sound.unlock();
      this.running = true;
      this.pausedByUser = false;
      this.ended = false;
      this.scene.resume();
      showGameplayUi();
      this.updateHud();
    }

    togglePause(force) {
      if (!this.running || this.ended) return;
      const shouldPause = typeof force === "boolean" ? force : !this.pausedByUser;
      this.pausedByUser = shouldPause;
      dom.pause.classList.toggle("active", shouldPause);
      dom.prompt.classList.add("is-hidden");
      if (shouldPause) this.scene.pause();
      else this.scene.resume();
    }

    update(time, delta) {
      if (!this.running || this.ended || this.respawning) return;
      const movement = this.inputSystem.movement(delta);
      const speed = 76 * progression.bonuses().speedMultiplier;
      this.player.setVelocity(movement.x * speed, movement.y * speed);
      if (movement.lengthSq() > 0) {
        this.lastFacing.copy(movement);
        if (Math.abs(movement.x) > 0.1) this.player.setFlipX(movement.x < 0);
        if (this.player.anims.currentAnim?.key !== "player-run") this.player.play("player-run");
      } else if (this.player.anims.currentAnim?.key !== "player-idle") {
        this.player.play("player-idle");
      }
      this.player.setDepth(this.player.y);

      if (this.inputSystem.attackPressed() && time >= this.attackReadyAt) this.performAttack(time);
      if (this.inputSystem.abilityPressed()) this.castAshWard(time);
      if (this.area === "dungeon") {
        this.updateEnemies(time);
        this.updateAutoChests();
        this.updateSpikeTrap(time);
      } else {
        this.updateTownEntrance();
      }
      this.updateInteraction();
      if (this.inputSystem.interactPressed()) this.performInteraction();
      this.updateWardHud(time);
    }

    castAshWard(time) {
      const bonuses = progression.bonuses();
      if (!bonuses.unlockWard || time < this.wardEndsAt) return;
      this.wardEndsAt = time + 6000;
      this.state.heal(bonuses.wardHeal);
      this.player.setTint(0x75ddff);
      this.time.delayedCall(180, () => this.player.active && this.player.clearTint());
      this.cameras.main.flash(100, 65, 145, 190, false);
      sound.blip(560, 0.24, "sine", 0.04);
      this.updateHud();
    }

    updateWardHud(time) {
      const remaining = Math.max(0, this.wardEndsAt - time);
      dom.buff.classList.toggle("is-hidden", remaining <= 0);
      dom.buff.textContent = remaining > 0 ? `PELNU VAIROGS · ${Math.ceil(remaining / 1000)}s` : "";
      dom.ability.classList.toggle("is-ready", progression.bonuses().unlockWard && remaining <= 0);
      dom.ability.classList.toggle("is-active", remaining > 0);
    }

    performAttack(time) {
      this.attackReadyAt = time + 310;
      const direction = this.lastFacing.clone().normalize();
      const baseAngle = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x));
      const weapon = this.add.image(
        this.player.x + direction.x * 13,
        this.player.y - 10 + direction.y * 13,
        "weapon_golden_sword"
      ).setOrigin(0.15, 0.5).setDepth(this.player.depth + 2).setAngle(baseAngle - 65);
      this.tweens.add({
        targets: weapon,
        angle: baseAngle + 72,
        duration: 125,
        ease: "Quad.easeOut",
        onComplete: () => weapon.destroy()
      });
      sound.blip(210, 0.07, "sawtooth", 0.022);

      const bonuses = progression.bonuses();
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        const toEnemy = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - (this.player.y - 8));
        const distance = toEnemy.length();
        const reach = (enemy.getData("type") === "boss" ? 39 : 32) + bonuses.attackRange;
        if (distance > reach) return;
        const facing = toEnemy.normalize().dot(direction);
        if (facing < -0.05) return;
        const wardDamage = time < this.wardEndsAt ? bonuses.wardDamage : 0;
        this.hitEnemy(enemy, 1 + bonuses.attackDamage + wardDamage, direction, time);
      });
    }

    hitEnemy(enemy, damage, direction, time) {
      const hp = enemy.getData("hp") - damage;
      enemy.setData("hp", hp);
      enemy.setData("staggerUntil", time + 130);
      enemy.setVelocity(direction.x * 95, direction.y * 95);
      enemy.setTintFill(0xffd2aa);
      this.time.delayedCall(90, () => enemy.active && enemy.clearTint());
      this.updateEnemyHealthBar(enemy);
      this.cameras.main.shake(55, 0.0014);
      sound.blip(hp <= 0 ? 84 : 128, hp <= 0 ? 0.12 : 0.05, "square", 0.03);
      if (hp <= 0) this.killEnemy(enemy);
      else if (enemy.getData("type") === "boss") this.updateObjective();
    }

    killEnemy(enemy) {
      const type = enemy.getData("type");
      const reward = enemy.getData("reward");
      const x = enemy.x;
      const y = enemy.y - 6;
      enemy.healthBar?.background.destroy();
      enemy.healthBar?.fill.destroy();
      enemy.healthBar = null;
      enemy.disableBody(true, true);
      this.state.kills += 1;
      const killHeal = progression.bonuses().healOnKill;
      if (killHeal) this.state.heal(killHeal);
      this.spawnDrop(x, y, "coin", reward);
      if (type !== "boss" && Math.random() < 0.22) this.spawnDrop(x + 7, y, "potion", 2);
      if (type === "boss") {
        this.state.bossDead = true;
        this.state.saveBestFloor();
        this.revealStairs();
        this.cameras.main.flash(260, 190, 126, 65, false);
      }
      this.updateHud();
      this.updateObjective();
    }

    spawnDrop(x, y, type, value) {
      const key = type === "coin" ? ASSETS.coin[0] : "flask_big_red";
      const drop = this.drops.create(x, y, key).setDepth(y + 2).setData({ type, value });
      drop.body.setCircle(type === "coin" ? 4 : 5);
      if (type === "coin") drop.play("coin-spin");
      this.tweens.add({ targets: drop, y: y - 5, duration: 260, yoyo: true, ease: "Sine.easeOut" });
    }

    collectDrop(_player, drop) {
      const type = drop.getData("type");
      if (type === "coin") {
        this.state.addGold(drop.getData("value"));
        sound.blip(620, 0.07, "square", 0.025);
      } else {
        this.state.heal(drop.getData("value"));
        sound.blip(410, 0.11, "sine", 0.035);
      }
      drop.disableBody(true, true);
      this.updateHud();
    }

    updateEnemies(time) {
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        if (time < enemy.getData("staggerUntil")) {
          enemy.setDepth(enemy.y);
          this.updateEnemyHealthBar(enemy);
          return;
        }
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const type = enemy.getData("type");
        const canChase = distance < enemy.getData("aggroRadius") && (type !== "boss" || this.state.doorOpened);
        if (canChase && distance > 18) {
          const direction = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y).normalize();
          enemy.setVelocity(direction.x * enemy.getData("speed"), direction.y * enemy.getData("speed"));
          enemy.setFlipX(direction.x < 0);
          if (enemy.anims.currentAnim?.key !== enemy.getData("run")) enemy.play(enemy.getData("run"));
        } else if (type === "boss") {
          this.updateBossPatrol(enemy);
        } else {
          this.updateEnemyPatrol(enemy, time);
        }
        enemy.setDepth(enemy.y);
        this.updateEnemyHealthBar(enemy);
      });
    }

    updateEnemyPatrol(enemy, time) {
      if (time >= enemy.getData("decisionAt")) {
        if (Math.random() < 0.44) {
          enemy.setData({ aiState: "idle", decisionAt: time + Phaser.Math.Between(700, 1800) });
        } else {
          const radius = enemy.getData("patrolRadius");
          let targetX = enemy.getData("originX");
          let targetY = enemy.getData("originY");
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(Math.floor(radius * 0.35), radius);
            const candidateX = enemy.getData("originX") + Math.cos(angle) * distance;
            const candidateY = enemy.getData("originY") + Math.sin(angle) * distance;
            if (this.hasFloor(Math.floor(candidateX / TILE), Math.floor(candidateY / TILE))) {
              targetX = candidateX;
              targetY = candidateY;
              break;
            }
          }
          enemy.setData({
            aiState: "wander",
            wanderX: targetX,
            wanderY: targetY,
            decisionAt: time + Phaser.Math.Between(1200, 2600)
          });
        }
      }

      if (enemy.getData("aiState") !== "wander") {
        enemy.setVelocity(0, 0);
        if (enemy.anims.currentAnim?.key !== enemy.getData("idle")) enemy.play(enemy.getData("idle"));
        return;
      }
      const toTarget = new Phaser.Math.Vector2(
        enemy.getData("wanderX") - enemy.x,
        enemy.getData("wanderY") - enemy.y
      );
      if (toTarget.length() < 7) {
        enemy.setData({ aiState: "idle", decisionAt: time + Phaser.Math.Between(500, 1400) });
        enemy.setVelocity(0, 0);
        return;
      }
      toTarget.normalize();
      enemy.setVelocity(toTarget.x * enemy.getData("speed") * 0.58, toTarget.y * enemy.getData("speed") * 0.58);
      enemy.setFlipX(toTarget.x < 0);
      if (enemy.anims.currentAnim?.key !== enemy.getData("run")) enemy.play(enemy.getData("run"));
    }

    updateBossPatrol(enemy) {
      const radius = enemy.getData("patrolRadius");
      let direction = enemy.getData("patrolDirection");
      if (enemy.x <= enemy.getData("originX") - radius) direction = 1;
      if (enemy.x >= enemy.getData("originX") + radius) direction = -1;
      enemy.setData("patrolDirection", direction);
      enemy.setVelocityX(direction * enemy.getData("speed") * 0.62);
      enemy.setVelocityY(0);
      enemy.setFlipX(direction < 0);
      if (enemy.anims.currentAnim?.key !== enemy.getData("run")) enemy.play(enemy.getData("run"));
    }

    applyPlayerDamage(amount) {
      const bonuses = progression.bonuses();
      if (bonuses.blockChance && Math.random() < bonuses.blockChance) {
        sound.blip(710, 0.08, "square", 0.025);
        return 0;
      }
      const reduced = this.time.now < this.wardEndsAt ? Math.max(1, Math.ceil(amount * 0.5)) : amount;
      this.state.damage(reduced);
      return reduced;
    }

    handleEnemyContact(player, enemy) {
      const now = this.time.now;
      if (now < this.hurtReadyAt || !enemy.active) return;
      this.hurtReadyAt = now + 850;
      const dealt = this.applyPlayerDamage(enemy.getData("damage"));
      if (!dealt) return;
      const remaining = this.state.hp;
      const knockback = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y).normalize();
      player.setVelocity(knockback.x * 170, knockback.y * 170);
      player.setTintFill(0xff5b52);
      this.time.delayedCall(110, () => player.clearTint());
      this.cameras.main.shake(150, 0.006);
      this.cameras.main.flash(100, 110, 15, 15, false);
      sound.blip(72, 0.15, "sawtooth", 0.04);
      this.updateHud();
      if (remaining <= 0) this.respawnAtGuide();
    }

    updateSpikeTrap(time) {
      if (time < this.hurtReadyAt) return;
      const trap = this.spikeTraps.find((spike) => (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, spike.x, spike.y) <= 12
        && spike.anims.currentFrame?.index >= 3
      ));
      if (trap) this.triggerSpikeTrap(trap, time);
    }

    triggerSpikeTrap(trap, time) {
      this.hurtReadyAt = time + 850;
      const dealt = this.applyPlayerDamage(1);
      if (!dealt) return;
      const knockback = new Phaser.Math.Vector2(this.player.x - trap.x, this.player.y - trap.y);
      if (knockback.lengthSq() < 0.01) knockback.set(0, 1);
      knockback.normalize();
      this.player.setVelocity(knockback.x * 135, knockback.y * 135);
      this.player.setTintFill(0xff5b52);
      this.time.delayedCall(120, () => this.player.clearTint());
      this.cameras.main.shake(240, 0.014);
      this.cameras.main.flash(90, 120, 12, 12, false);
      sound.blip(58, 0.18, "sawtooth", 0.045);
      this.updateHud();
      if (this.state.hp <= 0) this.respawnAtGuide();
    }

    updateInteraction() {
      this.nearInteraction = null;
      let label = "";
      if (this.area === "town" && this.townNpc &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.townNpc.x, this.townNpc.y) < 42) {
        this.nearInteraction = "townNpc";
        label = "E · RUNĀT / BONUSA KOKS";
      } else if (this.area === "dungeon" && this.guideNpc &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.guideNpc.x, this.guideNpc.y) < 42) {
        this.nearInteraction = "guideNpc";
        label = "E · ATPAKAĻ UZ PILSĒTU";
      } else if (this.area === "dungeon" && !this.state.doorOpened &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.door.x, this.door.y) < 48) {
        this.nearInteraction = "door";
        label = this.state.hasKey ? "E · ATSLĒGT DURVIS" : "NEPIECIEŠAMA ATSLĒGA";
      } else if (this.area === "dungeon" && this.stairs &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.stairs.x, this.stairs.y) < 34) {
        this.nearInteraction = "stairs";
        label = "E · NĀKAMAIS STĀVS";
      }
      dom.prompt.textContent = label;
      dom.prompt.classList.toggle("is-hidden", !label);
    }

    performInteraction() {
      if (this.nearInteraction === "townNpc") {
        this.state.heal(this.state.maxHp);
        this.updateHud();
        this.openTalentTree();
      } else if (this.nearInteraction === "guideNpc") {
        this.returnToTown();
      } else if (this.nearInteraction === "door" && this.state.hasKey) {
        this.openDoor();
      } else if (this.nearInteraction === "door") {
        sound.blip(86, 0.12, "square", 0.03);
      } else if (this.nearInteraction === "stairs") {
        this.nextFloor();
      }
    }

    updateAutoChests() {
      this.chests.forEach((chest) => {
        if (!chest.active || chest.getData("opened")) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y) < 34) this.openChest(chest);
      });
    }

    openChest(chest) {
      if (!chest || chest.getData("opened")) return;
      chest.setData("opened", true);
      chest.play("chest-open");
      if (chest.getData("hasKey")) {
        this.state.hasKey = true;
        this.state.chestOpened = true;
      }
      this.state.addGold(chest.getData("hasKey") ? 5 : 3);
      this.state.heal(chest.getData("hasKey") ? 2 : 1);
      sound.blip(480, 0.16, "triangle", 0.04);
      this.cameras.main.flash(130, 138, 85, 30, false);
      this.updateHud();
      this.updateObjective();
    }

    openDoor() {
      this.state.doorOpened = true;
      this.state.hasKey = false;
      this.door.setTexture("doors_leaf_open");
      this.door.body.enable = false;
      sound.blip(112, 0.22, "triangle", 0.04);
      this.updateObjective();
    }

    revealStairs() {
      this.stairs = this.add.image(72 * TILE + 8, 15 * TILE + 8, "floor_stairs").setDepth(-1).setAlpha(0);
      this.tweens.add({ targets: this.stairs, alpha: 1, duration: 500 });
    }

    nextFloor() {
      if (this.transitioning) return;
      this.transitioning = true;
      const next = this.state.floor + 1;
      progression.awardFloorPoint();
      this.state.saveBestFloor();
      sound.blip(760, 0.2, "sine", 0.04);
      this.cameras.main.fadeOut(350, 8, 6, 10);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({
          autoStart: true,
          area: "dungeon",
          level: next,
          gold: this.state.gold,
          hp: Math.min(this.state.maxHp, this.state.hp + 2)
        });
      });
    }

    updateTownEntrance() {
      if (!this.townStairs || this.transitioning) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.townStairs.x, this.townStairs.y) < 16) {
        this.enterDungeon();
      }
    }

    enterDungeon() {
      if (this.transitioning) return;
      this.transitioning = true;
      sound.blip(340, 0.18, "sine", 0.035);
      this.cameras.main.fadeOut(300, 8, 6, 10);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({
          autoStart: true,
          area: "dungeon",
          level: this.state.floor,
          gold: this.state.gold,
          hp: this.state.hp
        });
      });
    }

    returnToTown() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.cameras.main.fadeOut(300, 8, 6, 10);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({
          autoStart: true,
          area: "town",
          level: this.state.floor,
          gold: this.state.gold,
          hp: this.state.hp
        });
      });
    }

    updateObjective() {
      if (this.area === "town") {
        dom.objective.textContent = "Atrodi trepes uz dungeonu vai runā ar burvi";
        return;
      }
      if (this.state.bossDead) dom.objective.textContent = "Ieej kāpnēs uz nākamo stāvu";
      else if (this.state.doorOpened && this.boss?.active) dom.objective.textContent = `Pelnu Dēmons · HP ${this.boss.getData("hp")}/${this.boss.getData("maxHp")}`;
      else if (this.state.doorOpened) dom.objective.textContent = "Sakauj Pelnu Dēmonu";
      else if (this.state.hasKey) dom.objective.textContent = "Atver dēmona zāles durvis";
      else dom.objective.textContent = "Atrodi lādi ar atslēgu";
    }

    updateHud() {
      dom.hearts.innerHTML = "";
      for (let i = 0; i < Math.ceil(this.state.maxHp / 2); i += 1) {
        const value = this.state.hp - i * 2;
        const key = value >= 2 ? "ui_heart_full" : value === 1 ? "ui_heart_half" : "ui_heart_empty";
        const image = document.createElement("img");
        image.src = asset(key);
        image.alt = "";
        dom.hearts.appendChild(image);
      }
      dom.gold.textContent = String(this.state.gold);
      dom.floor.textContent = this.area === "town" ? "—" : String(this.state.floor);
      dom.area.textContent = this.area === "town" ? "Pilsēta" : "Stāvs";
      dom.xp.style.width = `${Math.min(100, (this.state.kills / Math.max(1, this.state.totalEnemies)) * 100)}%`;
      this.updateObjective();
      this.updateProgressionUi();
    }

    updateProgressionUi() {
      const snapshot = progression.snapshot();
      dom.talentPoints.textContent = String(snapshot.points);
      dom.talentHudPoints.textContent = String(snapshot.points);
      dom.talentHudPoints.classList.toggle("is-hidden", snapshot.points <= 0);
      document.querySelectorAll("[data-talent]").forEach((button) => {
        const id = button.dataset.talent;
        const node = TALENTS[id];
        const level = snapshot.levels[id] || 0;
        button.classList.toggle("unlocked", level >= node.maxLevel);
        button.classList.toggle("available", progression.canSpend(id));
        button.classList.toggle("locked", !progression.canSpend(id) && level < node.maxLevel);
        button.querySelector(".talent-level").textContent = `${level}/${node.maxLevel}`;
      });
      dom.ability.classList.toggle("is-hidden", !progression.bonuses().unlockWard);
      this.updateWardHud(this.time.now);
    }

    applyProgressionBonuses() {
      const before = this.state.maxHp;
      this.state.maxHp = MAX_HP + progression.bonuses().maxHp;
      if (this.state.maxHp > before) this.state.heal(this.state.maxHp - before);
      this.updateHud();
    }

    openTalentTree() {
      if (this.talentOpen) return;
      this.talentOpen = true;
      this.updateProgressionUi();
      dom.talent.classList.add("active");
      dom.mobile.classList.add("is-hidden");
      dom.prompt.classList.add("is-hidden");
      this.scene.pause();
    }

    closeTalentTree() {
      if (!this.talentOpen) return;
      this.talentOpen = false;
      dom.talent.classList.remove("active");
      if (this.running && !this.ended) this.scene.resume();
      if (TOUCH_DEVICE && this.running) dom.mobile.classList.remove("is-hidden");
    }

    respawnAtGuide() {
      if (this.respawning || this.area !== "dungeon") return;
      this.respawning = true;
      const lost = this.state.loseGold(0.15);
      this.state.hp = this.state.maxHp;
      this.player.setVelocity(0, 0);
      this.cameras.main.fadeOut(220, 55, 9, 9);
      this.time.delayedCall(260, () => {
        this.player.setPosition(this.respawnPoint.x, this.respawnPoint.y).clearTint();
        this.enemies.getChildren().forEach((enemy) => {
          if (!enemy.active) return;
          enemy.setPosition(enemy.getData("originX"), enemy.getData("originY"));
          enemy.setVelocity(0, 0);
          enemy.setData({ aiState: "idle", decisionAt: this.time.now + 800 });
        });
        this.hurtReadyAt = this.time.now + 1800;
        this.respawning = false;
        this.cameras.main.fadeIn(260, 8, 6, 10);
        this.updateHud();
        dom.prompt.textContent = lost ? `Sargs tevi izglāba · zaudēts zelts: ${lost}` : "Sargs tevi izglāba";
        dom.prompt.classList.remove("is-hidden");
        this.time.delayedCall(1700, () => dom.prompt.classList.add("is-hidden"));
      });
    }

    endRun(victory) {
      if (this.ended) return;
      this.ended = true;
      this.running = false;
      this.player.setVelocity(0, 0);
      this.state.saveBestFloor();
      dom.prompt.classList.add("is-hidden");
      dom.mobile.classList.add("is-hidden");
      dom.resultKicker.textContent = victory ? "DUNGEONS IZPĒTĪTS" : "KRITI KAUJĀ";
      dom.resultTitle.textContent = victory ? "Tu uzvarēji" : "Pelni tevi aprija";
      dom.resultCopy.textContent = `Sasniegtais stāvs: ${this.state.floor} · Savāktais zelts: ${this.state.gold}`;
      dom.result.classList.add("active");
      this.scene.pause();
    }

    hash(x, y, seed) {
      let value = x * 374761393 + y * 668265263 + seed * 69069;
      value = (value ^ (value >> 13)) * 1274126177;
      return Math.abs(value ^ (value >> 16));
    }
  }

  const config = {
    // Canvas keeps the downloadable game compatible with direct file:// opening.
    type: Phaser.CANVAS,
    parent: "game",
    backgroundColor: "#09080b",
    pixelArt: true,
    roundPixels: false,
    antialias: false,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: "arcade",
      // Follow the display refresh rate instead of moving at fixed 60 Hz. This
      // prevents alternating still/movement frames on 90–120 Hz phones.
      arcade: { gravity: { x: 0, y: 0 }, debug: false, fixedStep: false }
    },
    loader: { imageLoadType: "HTMLImageElement" },
    render: { pixelArt: true, antialias: false, roundPixels: false, powerPreference: "high-performance" },
    scene: [DungeonScene]
  };

  const game = new Phaser.Game(config);

  function currentScene() {
    return game.scene.getScene("Dungeon");
  }

  function showGameplayUi() {
    dom.start.classList.remove("active");
    dom.pause.classList.remove("active");
    dom.result.classList.remove("active");
    dom.talent.classList.remove("active");
    dom.hud.classList.remove("is-hidden");
    if (TOUCH_DEVICE) dom.mobile.classList.remove("is-hidden");
  }

  function restart(level = 1, keepGold = false) {
    const scene = currentScene();
    const gold = keepGold && scene?.state ? scene.state.gold : 0;
    dom.result.classList.remove("active");
    dom.pause.classList.remove("active");
    dom.prompt.classList.add("is-hidden");
    scene.scene.restart({ autoStart: true, area: "town", level, gold, hp: MAX_HP + progression.bonuses().maxHp });
    showGameplayUi();
    sound.unlock();
  }

  document.getElementById("start-button").addEventListener("click", () => currentScene().beginRun());
  dom.talentButton.addEventListener("click", () => currentScene()?.openTalentTree());
  dom.talentClose.addEventListener("click", () => currentScene()?.closeTalentTree());
  document.querySelectorAll("[data-talent]").forEach((button) => {
    button.addEventListener("click", () => {
      const scene = currentScene();
      if (progression.spend(button.dataset.talent)) {
        sound.blip(690, 0.16, "triangle", 0.04);
        scene?.applyProgressionBonuses();
        scene?.updateProgressionUi();
      }
    });
  });
  document.getElementById("pause-button").addEventListener("click", () => currentScene().togglePause());
  document.getElementById("resume-button").addEventListener("click", () => currentScene().togglePause(false));
  document.getElementById("restart-button").addEventListener("click", () => restart(1, false));
  document.getElementById("retry-button").addEventListener("click", () => restart(1, false));
  document.getElementById("fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_error) {
      // Fullscreen is optional and can be blocked by the browser.
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Escape" && event.code !== "KeyP") return;
    event.preventDefault();
    const scene = currentScene();
    if (scene?.talentOpen) scene.closeTalentTree();
    else scene?.togglePause();
  });

  window.addEventListener("blur", () => {
    const scene = currentScene();
    if (scene?.running && !scene.ended && !scene.pausedByUser) scene.togglePause(true);
  });
})();
