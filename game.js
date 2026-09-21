(function () {
  "use strict";

  const TILE = 16;
  const HIGH_WALL_TOP_INSET = 11;
  const DROP_PICKUP_RADIUS = 42;
  const CHEST_DROP_MIN_DISTANCE = 28;
  const CHEST_DROP_MAX_DISTANCE = 38;
  const MAP_W = 64;
  const MAP_H = 48;
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
    ability: document.getElementById("ability-button"),
    abilityTime: document.getElementById("ability-time"),
    minimap: document.getElementById("minimap"),
    minimapPanel: document.getElementById("minimap-panel"),
    minimapZoom: document.getElementById("minimap-zoom"),
    minimapClose: document.getElementById("minimap-close"),
    minimapReopen: document.getElementById("minimap-reopen"),
    bossProgress: document.getElementById("boss-progress"),
    questPanel: document.getElementById("quest-panel"),
    questKicker: document.querySelector(".quest-kicker"),
    lootToast: document.getElementById("loot-toast"),
    smith: document.getElementById("smith-screen"),
    smithClose: document.getElementById("smith-close"),
    smithUpgrade: document.getElementById("smith-upgrade"),
    smithWeapon: document.getElementById("smith-weapon"),
    smithCost: document.getElementById("smith-cost"),
    weaponRank: document.getElementById("weapon-rank"),
    armorRank: document.getElementById("armor-rank")
  };

  const asset = (name) => `assets/frames/${name}.png`;

  const ASSETS = {
    door: Array.from({ length: 8 }, (_, i) => `ash_door_f${i}`),
    torch: Array.from({ length: 4 }, (_, i) => `ash_torch_f${i}`),
    floor: ["floor_1", "floor_2", "floor_3", "floor_4", "floor_5", "floor_6", "floor_7", "floor_8"],
    walls: [
      "wall_banner_red", "wall_banner_blue", "wall_banner_green", "wall_banner_yellow", "wall_hole_1", "wall_hole_2",
      "column", "column_wall", "crate", "skull", "wall_fountain_top_2", "weapon_big_hammer",
      "doors_frame_left", "doors_frame_top", "doors_frame_right", "doors_leaf_closed", "doors_leaf_open",
      "floor_stairs", "floor_ladder", "floor_spikes_anim_f0", "floor_spikes_anim_f1", "floor_spikes_anim_f2", "floor_spikes_anim_f3"
    ],
    playerIdle: [0, 1, 2, 3].map((i) => `knight_m_idle_anim_f${i}`),
    playerRun: [0, 1, 2, 3].map((i) => `knight_m_run_anim_f${i}`),
    playerHit: ["knight_m_hit_anim_f0"],
    scoutIdle: [0, 1, 2, 3].map((i) => `knight_f_idle_anim_f${i}`),
    scoutRun: [0, 1, 2, 3].map((i) => `knight_f_run_anim_f${i}`),
    scoutHit: ["knight_f_hit_anim_f0"],
    ashIdle: [0, 1, 2, 3].map((i) => `knight_ash_v2_idle_anim_f${i}`),
    ashRun: [0, 1, 2, 3].map((i) => `knight_ash_v2_run_anim_f${i}`),
    ashHit: ["knight_ash_v2_hit_anim_f0"],
    smithNpc: [0, 1, 2, 3].map((i) => `doc_idle_anim_f${i}`),
    lavaMid: [0, 1, 2].map((i) => `wall_fountain_mid_red_anim_f${i}`),
    lavaBasin: [0, 1, 2].map((i) => `wall_fountain_basin_red_anim_f${i}`),
    weapons: ["weapon_regular_sword", "weapon_knight_sword", "weapon_red_gem_sword", "weapon_lavish_sword"],
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
    mimic: [0, 1, 2].map((i) => `chest_mimic_open_anim_f${i}`),
    coin: [0, 1, 2, 3].map((i) => `coin_anim_f${i}`),
    items: ["weapon_golden_sword", "flask_big_red", "ui_heart_full", "ui_heart_half", "ui_heart_empty"]
  };

  const ARMOR_SETS = Object.freeze({
    steel: {
      id: "steel",
      name: "Smagās bruņas",
      idle: ASSETS.playerIdle,
      run: ASSETS.playerRun,
      hit: ASSETS.playerHit[0],
      speedMultiplier: 1,
      blockChance: 0.05,
      bonus: "5% bloks"
    },
    scout: {
      id: "scout",
      name: "Vieglās bruņas",
      idle: ASSETS.scoutIdle,
      run: ASSETS.scoutRun,
      hit: ASSETS.scoutHit[0],
      speedMultiplier: 1.1,
      blockChance: 0,
      bonus: "+10% ātrums"
    },
    ash: {
      id: "ash",
      name: "Pelnu bruņas",
      idle: ASSETS.ashIdle,
      run: ASSETS.ashRun,
      hit: ASSETS.ashHit[0],
      speedMultiplier: 0.96,
      blockChance: 0.12,
      bonus: "12% bloks"
    }
  });

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
      const incomingRunSeed = Number(data.runSeed);
      this.runSeed = Number.isFinite(incomingRunSeed)
        ? incomingRunSeed >>> 0
        : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
      this.maxHp = MAX_HP + progression.bonuses().maxHp;
      this.hp = Phaser.Math.Clamp(data.hp == null ? this.maxHp : data.hp, 1, this.maxHp);
      this.gold = data.gold || 0;
      const savedArmor = data.armorId || localStorage.getItem("dungeonOfAshArmor") || "steel";
      this.armorId = ARMOR_SETS[savedArmor] ? savedArmor : "steel";
      this.chestOpened = false;
      this.armorDropSeen = false;
      this.doorOpened = false;
      this.bossDead = false;
      this.kills = 0;
      this.monsterKills = 0;
      this.totalMonsters = 0;
      this.requiredKills = 0;
      this.bossUnlocked = false;
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
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        if (!this.context) this.context = new AudioContextClass();
        if (this.context.state === "suspended") this.context.resume().catch(() => {});
        return true;
      } catch (_error) {
        return false;
      }
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

    step() {
      if (!this.context || !this.enabled || this.context.state !== "running") return;
      const duration = 0.035;
      const frames = Math.floor(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      }
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 0.88 + Math.random() * 0.18;
      filter.type = "lowpass";
      filter.frequency.value = 430;
      gain.gain.setValueAtTime(0.018, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      source.connect(filter).connect(gain).connect(this.context.destination);
      source.start();
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
      this.wardAura = null;
      this.wardMaskGraphics = null;
      this.transitioning = false;
      this.respawning = false;
      this.talentOpen = false;
      this.smithOpen = false;
      this.attackAnimating = false;
      this.minimapNextAt = 0;
      this.minimapZoomed = dom.minimapPanel?.classList.contains("is-zoomed") || false;
      this.stepReadyAt = 0;
      this.visitedCells = new Set();
      this.currentVisibleCells = new Set();
      this.lastFogTile = "";
      this.roomDoors = [];
      this.doorFogCaps = [];
      this.wallTorches = [];
      this.gateAnimating = false;
      this.townExitMarkers = [];
      this.townDirectionArrow = null;
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
        ...ASSETS.floor, ...ASSETS.walls, ...ASSETS.door, ...ASSETS.torch, ...ASSETS.playerIdle, ...ASSETS.playerRun,
        ...ASSETS.playerHit, ...ASSETS.scoutIdle, ...ASSETS.scoutRun, ...ASSETS.scoutHit,
        ...ASSETS.ashIdle, ...ASSETS.ashRun, ...ASSETS.ashHit,
        ...ASSETS.smithNpc, ...ASSETS.lavaMid, ...ASSETS.lavaBasin, ...ASSETS.weapons,
        ...ASSETS.zombie, ...ASSETS.goblinIdle, ...ASSETS.goblinRun,
        ...ASSETS.skeletonIdle, ...ASSETS.skeletonRun, ...ASSETS.impIdle, ...ASSETS.impRun,
        ...ASSETS.townNpc, ...ASSETS.guideNpc, ...ASSETS.orcIdle, ...ASSETS.orcRun,
        ...ASSETS.bossIdle, ...ASSETS.bossRun, ...ASSETS.chest, ...ASSETS.mimic, ...ASSETS.coin, ...ASSETS.items
      ];
      [...new Set(allKeys)].forEach((key) => this.load.image(key, `${key}.png${ASSETS.door.includes(key) ? "?v=63" : ""}`));
    }

    create() {
      this.createAnimations();
      this.createDirectionTextures();
      this.createWardTextures();
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
      this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateWardAura, this);
      if (this.area === "dungeon") this.spawnEncounters();
      else this.state.totalEnemies = 0;
      this.createCollisions();
      this.configureCamera();
      this.createFogOfWar();
      this.updateHud();

      this.showFloorTitle();
      this.ready = true;
      window.__DUNGEON_DEBUG__ = { scene: this, state: this.state };

      const introSeen = localStorage.getItem("dungeonOfAshIntroSeenV1") === "1";
      if (this.running || introSeen) {
        this.running = true;
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
      create("player-steel-idle", ASSETS.playerIdle, 5);
      create("player-steel-run", ASSETS.playerRun, 9);
      create("player-scout-idle", ASSETS.scoutIdle, 5);
      create("player-scout-run", ASSETS.scoutRun, 9);
      create("player-ash-idle", ASSETS.ashIdle, 5);
      create("player-ash-run", ASSETS.ashRun, 9);
      create("smith-npc-idle", ASSETS.smithNpc, 5);
      create("lava-flow", ASSETS.lavaMid, 8);
      create("lava-basin", ASSETS.lavaBasin, 7);
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
      create("ash-door-open", ASSETS.door, 14, 0);
      create("ash-door-close", [...ASSETS.door].reverse(), 14, 0);
      create("ash-torch-burn", ASSETS.torch, 8);
      create("spikes", ["floor_spikes_anim_f0", "floor_spikes_anim_f1", "floor_spikes_anim_f2", "floor_spikes_anim_f3"], 5);
      create("chest-open", ASSETS.chest, 8, 0);
      create("mimic-awaken", ASSETS.mimic, 9, 0);
      create("mimic-run", [ASSETS.mimic[1], ASSETS.mimic[2]], 7);
    }

    createWardTextures() {
      if (this.textures.exists("ward-aura-0")) return;
      for (let frame = 0; frame < 16; frame++) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        // Small, integer-aligned pixel clusters; elliptical ring lies on the floor.
        for (let y = 5; y <= 19; y++) {
          for (let x = 2; x <= 38; x++) {
            const pulse = Math.sin(frame * Math.PI / 8);
            const radius = ((x - 20) / (16 + pulse)) ** 2 + ((y - 12) / (5.5 + pulse * 0.5)) ** 2;
            if (radius > 1.12 || radius < 0.68) continue;
            const bright = (Math.floor((Math.atan2(y - 12, x - 20) + Math.PI) * 4 / Math.PI) + frame) % 4 === 0;
            g.fillStyle(bright ? 0xb6e6c8 : 0x4f9c99, bright ? 0.95 : 0.6);
            g.fillRect(x, y, 1, 1);
          }
        }
        // Four orbiting sparks add motion around the pulsing floor ring.
        for (let spark = 0; spark < 4; spark++) {
          const angle = frame * Math.PI / 8 + spark * Math.PI / 2;
          g.fillStyle(0xb6e6c8, 0.9);
          g.fillRect(Math.round(20 + Math.cos(angle) * 16), Math.round(12 + Math.sin(angle) * 6), 2, 1);
        }
        for (let mote = 0; mote < 4; mote++) {
          const phase = (frame + mote * 2) % 8;
          g.fillStyle(phase < 4 ? 0xb6e6c8 : 0x4f9c99, 1 - phase / 10);
          g.fillRect(7 + mote * 8, 9 - phase, 1, 2);
        }
        g.generateTexture(`ward-aura-${frame}`, 40, 24);
        g.destroy();
      }
    }

    updateWardAura() {
      if (!this.wardAura || !this.player?.active) return;
      const remaining = Math.max(0, this.wardEndsAt - this.time.now);
      this.wardAura.setVisible(remaining > 0);
      if (remaining <= 0) return;
      const elapsed = 6000 - remaining;
      const x = Math.round(this.player.x), y = Math.round(this.player.y - 2);
      const safeScale = this.findWardScale(x, y);
      if (safeScale === 0) { this.wardAura.setVisible(false); return; }
      // Shrink before touching masonry; expand gently when stepping away.
      const scale = Math.min(safeScale, (this.wardAura.scaleX || safeScale) + 0.04);
      this.wardAura.setPosition(x, y).setScale(scale)
        .setDepth(-20)
        .setTexture(`ward-aura-${Math.floor(elapsed / 75) % 16}`)
        .setAlpha(Math.min(1, remaining / 400, (elapsed + 40) / 160));
      this.updateWardMask();
    }

    findWardScale(x, y) {
      // Wall artwork can extend above its collision tile. Test visible bounds,
      // not only tile occupancy, so the floor effect is never sliced by a cap.
      const nearbyWalls = this.walls.getChildren()
        .filter((wall) => wall.active && Math.abs(wall.x - x) < 48 && Math.abs(wall.y - y) < 64)
        .map((wall) => wall.getBounds());
      for (let step = 20; step >= 4; step--) {
        const scale = step / 20;
        const left = x - 20 * scale, right = x + 20 * scale;
        const top = y - 12 * scale, bottom = y + 12 * scale;
        if (nearbyWalls.some((wall) => left < wall.right + 1 && right > wall.left - 1
          && top < wall.bottom + 1 && bottom > wall.top - 1)) continue;
        let fits = true;
        for (let ty = Math.floor(top / TILE); ty <= Math.floor((bottom - 0.01) / TILE); ty++) {
          for (let tx = Math.floor(left / TILE); tx <= Math.floor((right - 0.01) / TILE); tx++) {
            if (!this.hasFloor(tx, ty)) fits = false;
          }
        }
        if (fits) return scale;
      }
      return 0;
    }

    createWardMask() {
      this.wardMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      const mask = this.wardMaskGraphics.createGeometryMask();
      this.wardAura.setMask(mask);
      this.events.once("shutdown", () => {
        mask.destroy();
        this.wardMaskGraphics?.destroy();
        this.wardMaskGraphics = null;
      });
    }

    updateWardMask() {
      if (!this.wardMaskGraphics) return;
      const mask = this.wardMaskGraphics;
      mask.clear().fillStyle(0xffffff, 1);
      const cx = Math.floor(this.player.x / TILE), cy = Math.floor(this.player.y / TILE);
      for (let y = cy - 2; y <= cy + 2; y++) {
        for (let x = cx - 2; x <= cx + 2; x++) {
          if (this.hasFloor(x, y)) mask.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    showFloorTitle() {
      const title = document.getElementById("floor-title");
      title.classList.add("is-hidden");
      if (this.area !== "dungeon") return;
      title.textContent = `${this.state.floor}. STĀVS`;
      void title.offsetWidth;
      title.classList.remove("is-hidden");
      this.cameras.main.fadeIn(350, 8, 6, 10);
      this.time.delayedCall(1800, () => title.classList.add("is-hidden"));
      this.events.once("shutdown", () => title.classList.add("is-hidden"));
    }

    createDirectionTextures() {
      if (this.textures.exists("exit-arrow-0")) return;
      const pixels = [[4,1],[3,2],[4,2],[5,2],[2,3],[3,3],[4,3],[5,3],[6,3],
        [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[3,5],[4,5],[5,5],[3,6],[4,6],[5,6]];
      for (let direction = 0; direction < 8; direction += 1) {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        const angle = direction * Math.PI / 4;
        pixels.forEach(([x,y]) => {
          const px = Math.round(4 + (x-4)*Math.cos(angle) - (y-4)*Math.sin(angle));
          const py = Math.round(4 + (x-4)*Math.sin(angle) + (y-4)*Math.cos(angle));
          graphics.fillStyle(y < 3 ? 0xe7c17a : 0xb98c43, 1);
          graphics.fillRect(px, py, 1, 1);
        });
        graphics.generateTexture(`exit-arrow-${direction}`, 9, 9);
        graphics.destroy();
      }
    }

    buildDungeon() {
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      if (this.area === "town") {
        this.buildTown();
        return;
      }
      this.mapLayout = mapRules.generateDungeonLayout(this.state.floor, this.state.runSeed, MAP_W, MAP_H);
      this.floorCells = this.mapLayout.floorCells;
      this.wallCells = new Set();
      this.wallPlan = [];

      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          if (!this.hasFloor(x, y)) continue;
          const noise = this.hash(x, y, this.mapLayout.seed);
          const key = noise % 13 === 0 ? ASSETS.floor[1 + (noise % (ASSETS.floor.length - 1))] : "floor_1";
          this.floorTiles.add(this.add.image(x * TILE + 8, y * TILE + 8, key, "__BASE").setDepth(-30));
        }
      }

      // Reserve the procedural room doorway before drawing walls. Otherwise
      // the autotiler draws wall pieces behind/alongside the door frame and
      // produces visible black seams on both sides.
      const roomDoorCells = new Set(
        (this.mapLayout.roomDoors || []).flatMap((door) => door.cells.map(({ x, y }) => `${x},${y}`))
      );
      this.buildWallAutotiles(roomDoorCells);
      this.createRoomDoors();
      const activeGate = this.mapLayout.gate;

      const gateWidth = (activeGate.gateRight - activeGate.gateLeft + 1) * TILE;
      this.addGateWallReturns(activeGate, gateWidth);
      this.door = this.props.create(
        activeGate.gateLeft * TILE + gateWidth / 2,
        (activeGate.wallY + 1) * TILE,
        ASSETS.door[0]
      ).setDisplaySize(gateWidth, 40);
      this.door.setOrigin(0.5, 1).setDepth(this.door.y).refreshBody();
      this.door.body.setSize(gateWidth, TILE).setOffset(0, 24);
      this.createDoorFogCap(this.door, Array.from(
        { length: activeGate.gateRight - activeGate.gateLeft + 1 },
        (_, i) => ({ x: activeGate.gateLeft + i, y: activeGate.wallY })
      ));
      this.addWallTorch(activeGate.gateLeft - 2, activeGate.wallY);
      this.addWallTorch(activeGate.gateRight + 2, activeGate.wallY);

      this.chests = this.mapLayout.chests.map(({ x, y }) => this.createChest(x, y));

      const guide = this.mapLayout.guide;
      this.guideNpc = this.add.sprite(guide.x * TILE + 8, guide.y * TILE + 8, ASSETS.guideNpc[0])
        .setOrigin(0.5, 1).setDepth(guide.y * TILE + 8).play("guide-npc-idle");
      const spawn = this.mapLayout.spawn;
      this.respawnPoint = { x: spawn.x * TILE + 8, y: spawn.y * TILE + 8 };

      this.addProceduralWallDecorations();

      [[activeGate.gateLeft - 4, activeGate.wallY], [activeGate.gateRight + 4, activeGate.wallY]].forEach(([x, y]) => {
        if (!this.isFlatWallFace(x, y)) return;
        const columnBaseline = (y + 1) * TILE;
        this.add.image(x * TILE + 8, columnBaseline, "column_wall")
          .setOrigin(0.5, 1).setDepth(columnBaseline - 1);
      });

      this.mapLayout.props.forEach(({ x, y, type }) => {
        if (type === "crate") {
          this.createCrate(x, y);
          return;
        }
        if (type === "column") {
          this.createColumn(x, y);
          return;
        }
        const propY = y * TILE + 8;
        this.props.create(x * TILE + 8, propY, type).setDepth(propY).refreshBody();
      });

      this.mapLayout.skulls.forEach(({ x, y }) => {
        this.add.image(x * TILE + 8, y * TILE + 8, "skull").setDepth(y * TILE + 8);
      });

      this.spikeTraps = this.mapLayout.traps.map(({ x, y }) => (
        this.add.sprite(x * TILE + 8, y * TILE + 8, "floor_spikes_anim_f0").setDepth(-2).play("spikes")
      ));
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
      this.add.image(TOWN.entranceX * TILE, gateBaseline, ASSETS.door[7])
        .setDisplaySize(40, 40).setOrigin(0.5, 1).setDepth(gateBaseline);
      this.addWallTorch(TOWN.gateLeft - 2, TOWN.wallY);
      this.addWallTorch(TOWN.gateRight + 2, TOWN.wallY);

      this.townNpc = this.add.sprite(TOWN.npcX * TILE + 8, TOWN.npcY * TILE + 8, ASSETS.townNpc[0])
        .setOrigin(0.5, 1).setDepth(TOWN.npcY * TILE + 8).play("town-npc-idle");
      this.smithNpc = this.add.sprite(TOWN.smithX * TILE + 8, TOWN.smithY * TILE + 8, ASSETS.smithNpc[0])
        .setOrigin(0.5, 1).setDepth(TOWN.smithY * TILE + 8).play("smith-npc-idle");
      this.respawnPoint = { x: TOWN.spawnX * TILE + 8, y: TOWN.spawnY * TILE + 8 };

      this.townStairs = this.add.image(TOWN.stairsX * TILE + 8, TOWN.stairsY * TILE + 8, "floor_ladder")
        .setDepth(-1);
      this.tweens.add({ targets: this.townStairs, alpha: 0.68, duration: 650, yoyo: true, repeat: -1 });
      this.townDirectionArrow = this.add.image(
        this.respawnPoint.x, this.respawnPoint.y, "exit-arrow-0"
      ).setDisplaySize(12, 12).setOrigin(0.5).setDepth(1000002);


      this.add.image(27 * TILE + 8, 16 * TILE + 8, "wall_fountain_top_2").setDepth(16 * TILE + 8);
      [[27, 7, "wall_banner_blue"], [36, 7, "wall_banner_yellow"]].forEach(([x, y, key]) => {
        this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 8);
      });
      [[16, 21], [47, 21], [16, 36], [47, 36]].forEach(([x, y]) => {
        this.createColumn(x, y);
      });
      [[21, 30], [45, 35], [19, 25]].forEach(([x, y]) => {
        this.createCrate(x, y);
      });

      this.addLavaFall(19, 17);
    }

    createRoomDoors() {
      this.roomDoors = (this.mapLayout.roomDoors || []).map((definition) => {
        const firstCell = definition.cells[0];
        const x = (firstCell.x + 1) * TILE;
        const y = (firstCell.y + 1) * TILE;
        const sprite = this.props.create(x, y, ASSETS.door[0])
          .setDisplaySize(40, 40).setOrigin(0.5, 1)
          .setDepth(y + 1)
          .setData({ roomDoorId: definition.id, opened: false })
          .refreshBody();
        sprite.body.setSize(32, TILE).setOffset(4, 24);
        this.createDoorFogCap(sprite, definition.cells);
        this.addWallTorch(firstCell.x - 1, firstCell.y);
        this.addWallTorch(firstCell.x + 2, firstCell.y);
        return { ...definition, sprite, opened: false, animating: false };
      });
    }

    createDoorFogCap(sprite, cells) {
      // Only the raised part of the door crosses fogged floor tiles. Draw
      // its opaque pixels above fog; transparent gaps still hide the room.
      // Keep the lower collision row in normal depth order for the player.
      const cap = this.add.image(sprite.x, sprite.y, sprite.texture.key)
        .setOrigin(0.5, 1).setDisplaySize(sprite.displayWidth, sprite.displayHeight)
        .setCrop(0, 0, sprite.width, Math.ceil(sprite.height * (1 - TILE / sprite.displayHeight)))
        .setDepth(1000001).setVisible(false);
      sprite.on("animationupdate", () => cap.setTexture(sprite.texture.key));
      this.doorFogCaps.push({ cap, cells });
    }

    doorwayOccupied(sprite) {
      const body = sprite.body;
      return [this.player, ...(this.enemies?.getChildren() || [])].some((actor) => {
        const other = actor?.body;
        return actor?.active && other?.enable
          && other.right > body.x - 2 && other.x < body.right + 2
          && other.bottom > body.y - 2 && other.y < body.bottom + 2;
      });
    }

    openRoomDoor(roomDoor) {
      if (!roomDoor || roomDoor.opened || roomDoor.animating || !roomDoor.sprite?.active) return;
      roomDoor.animating = true;
      roomDoor.sprite.once("animationcomplete", () => {
        roomDoor.opened = true;
        roomDoor.animating = false;
        roomDoor.sprite.setData("opened", true);
        roomDoor.sprite.body.enable = false;
        this.updateFogOfWar(true);
        this.updateHud();
      });
      roomDoor.sprite.play("ash-door-open");
      sound.blip(112, 0.16, "triangle", 0.025);
    }

    closeRoomDoor(roomDoor) {
      if (!roomDoor?.opened || roomDoor.animating || !roomDoor.sprite?.active) return;
      if (this.doorwayOccupied(roomDoor.sprite)) {
        this.showLootToast("DURVJU AILE IR AIZŅEMTA");
        return;
      }
      roomDoor.animating = true;
      roomDoor.sprite.once("animationcomplete", () => {
        // An actor may have stepped into the opening during the animation.
        if (this.doorwayOccupied(roomDoor.sprite)) {
          roomDoor.sprite.once("animationcomplete", () => { roomDoor.animating = false; });
          roomDoor.sprite.play("ash-door-open");
          return;
        }
        roomDoor.opened = false;
        roomDoor.animating = false;
        roomDoor.sprite.setData("opened", false);
        roomDoor.sprite.body.enable = true;
        this.updateFogOfWar(true);
        this.updateHud();
      });
      roomDoor.sprite.play("ash-door-close");
      sound.blip(90, 0.14, "triangle", 0.025);
    }

    addGateWallReturns(gate, gateWidth) {
      const baseline = (gate.wallY + 1) * TILE;
      // The 64px sprite has six transparent pixels on each side.
      // Overlap the stone jamb by one world pixel to avoid fractional seams.
      const inset = Math.ceil(gateWidth * 6 / 64) + 1;
      [[gate.gateLeft * TILE, 0], [(gate.gateRight + 1) * TILE - TILE, TILE - inset]]
        .forEach(([x, cropX]) => {
          this.add.image(x + TILE / 2, baseline, "wall_atlas_high", this.highWallFrame(BOSS_GATE_WALL_FRAME))
            .setOrigin(0.5, 1).setCrop(cropX, 0, inset, 32).setDepth(gate.wallY * TILE + 7);
        });
    }

    isFlatWallFace(x, y) {
      return [-1, 0, 1].every((dx) => this.wallCells.has(`${x + dx},${y}`)
        && this.hasFloor(x + dx, y + 1) && !this.hasFloor(x + dx, y - 1));
    }

    addTorchGlow(x, y, depth) {
      if (!this.textures.exists("torch-warm-glow")) {
        const texture = this.textures.createCanvas("torch-warm-glow", 64, 64);
        const ctx = texture.context;
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, "rgba(255,184,65,0.65)");
        gradient.addColorStop(0.28, "rgba(255,132,28,0.3)");
        gradient.addColorStop(0.65, "rgba(231,89,15,0.09)");
        gradient.addColorStop(1, "rgba(231,89,15,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        texture.refresh();
      }
      const glow = this.add.image(x, y, "torch-warm-glow").setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.65);
      this.tweens.add({ targets: glow, alpha: 0.85, duration: 780, yoyo: true, repeat: -1 });
    }

    createColumn(tileX, tileY) {
      const baseline = (tileY + 1) * TILE;
      const column = this.props.create(tileX * TILE + 8, baseline, "column")
        .setOrigin(0.5, 1).setDepth(baseline + 1).refreshBody();
      // Block all three tiles covered by the column, not only its foot.
      column.body.setSize(TILE, TILE * 3).setOffset(0, 0);
      return column;
    }

    createCrate(tileX, tileY) {
      const baseline = (tileY + 1) * TILE;
      const crate = this.props.create(tileX * TILE + 8, baseline, "crate")
        .setOrigin(0.5, 1).setDepth(baseline).refreshBody();
      crate.body.setSize(12, 10).setOffset(2, 14);
      return crate;
    }

    addWallTorch(tileX, tileY) {
      // Mount only on a continuous front face, away from corners and jambs.
      const safeX = [0, -1, 1, -2, 2, -3, 3].map((dx) => tileX + dx).find((x) => (
        [-1, 0, 1].every((dx) => this.wallCells.has(`${x + dx},${tileY}`)
          && this.hasFloor(x + dx, tileY + 1))
        && !this.hasFloor(x, tileY - 1)
        && !this.wallTorches.some((torch) => torch.getData("cell") === `${x},${tileY}`)
      ));
      if (safeX === undefined) return;
      tileX = safeX;
      if (this.wallTorches.some((torch) => torch.getData("cell") === `${tileX},${tileY}`)) return;
      const torch = this.add.sprite(tileX * TILE + 8, (tileY + 1) * TILE - 2, ASSETS.torch[0])
        .setDisplaySize(18, 18).setOrigin(0.5, 1).setDepth(tileY * TILE + 10)
        .setData("cell", `${tileX},${tileY}`);
      torch.play({ key: "ash-torch-burn", startFrame: (tileX + tileY) % 4 });
      this.addTorchGlow(torch.x, torch.y - 12, tileY * TILE + 9);
      this.wallTorches.push(torch);
    }

    addProceduralWallDecorations() {
      const gate = this.mapLayout.gate;
      const candidates = this.wallPlan
        .filter((rule) => (
          rule.facing === "north"
          && this.isFlatWallFace(rule.x, rule.y)
          && rule.y !== gate.wallY
          && rule.x > 2 && rule.x < MAP_W - 3
          && rule.y > 2 && rule.y < MAP_H - 3
        ))
        .sort((a, b) => (
          this.hash(a.x, a.y, this.mapLayout.seed + 911)
          - this.hash(b.x, b.y, this.mapLayout.seed + 911)
        ));
      const used = this.wallTorches.map((torch) => {
        const [x, y] = torch.getData("cell").split(",").map(Number);
        return { x, y };
      });
      const takeSpaced = (count, spacing) => {
        const picked = [];
        for (const candidate of candidates) {
          if (picked.length >= count) break;
          if (used.some((item) => Math.abs(item.x - candidate.x) + Math.abs(item.y - candidate.y) < spacing)) continue;
          used.push(candidate);
          picked.push(candidate);
        }
        return picked;
      };

      takeSpaced(6, 6).forEach(({ x, y }) => this.addWallTorch(x, y));
      const lavaCount = 2 + (this.mapLayout.seed % 3);
      takeSpaced(lavaCount, 7).forEach(({ x, y }) => this.addLavaFall(x, y));
      const wallArt = [
        "wall_banner_red", "wall_banner_blue", "wall_banner_green", "wall_banner_yellow",
        "wall_hole_1", "wall_hole_2", "wall_hole_1"
      ];
      takeSpaced(wallArt.length, 4).forEach(({ x, y }, index) => {
        const key = wallArt[(index + this.state.floor) % wallArt.length];
        this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 9);
      });
    }

    addLavaFall(tileX, wallY) {
      if (!this.isFlatWallFace(tileX, wallY)) return;
      const x = tileX * TILE + 8;
      const topY = (wallY + 1) * TILE;
      this.add.image(x, topY - 16, "wall_fountain_top_2").setOrigin(0.5, 1).setDepth(topY - 3);
      this.add.sprite(x, topY, ASSETS.lavaMid[0]).setOrigin(0.5, 1).setDepth(topY - 2).play("lava-flow");
      this.add.sprite(x, topY + 11, ASSETS.lavaBasin[0]).setOrigin(0.5, 1).setDepth(topY + 3).play("lava-basin");
      const glow = this.add.circle(x, topY + 2, 21, 0xff4b1f, 0.16)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(topY - 4);
      this.tweens.add({ targets: glow, alpha: { from: 0.09, to: 0.24 }, scale: { from: 0.88, to: 1.15 }, duration: 850, yoyo: true, repeat: -1 });
    }

    createChest(tileX, tileY) {
      const chest = this.props.create(tileX * TILE + 8, tileY * TILE + 8, ASSETS.chest[0]);
      chest.setDepth(chest.y).setData({ opened: false }).refreshBody();
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

    buildWallAutotiles(reservedOpenings = new Set()) {
      this.wallPlan = mapRules.buildWallPlan(this.floorCells, MAP_W, MAP_H, reservedOpenings);
      const activeGate = this.area === "town" ? TOWN : BOSS_CHAMBER;
      this.wallPlan.forEach((rule) => {
        this.wallCells.add(`${rule.x},${rule.y}`);
        this.addWallFloorUnderlay(rule.x, rule.y);
        const roomGateFrameKey = reservedOpenings.has(`${rule.x + 1},${rule.y}`)
          ? "doors_frame_left"
          : reservedOpenings.has(`${rule.x - 1},${rule.y}`) ? "doors_frame_right" : null;
        const gateFrameKey = roomGateFrameKey || (rule.y === activeGate.wallY
          ? rule.x === activeGate.gateLeft - 1
            ? "doors_frame_left"
            : rule.x === activeGate.gateRight + 1
              ? "doors_frame_right"
              : null
          : null);
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
          // The new rectangular sprite contains its own straight stone jambs.
          // Keep adjacent brickwork flush; do not overlay the old curved arch.
          return;
        }
        const isTall = rule.facing !== "side";
        const key = isTall ? "wall_atlas_high" : "wall_atlas_low";
        const frame = isTall ? this.highWallFrame(rule.faceFrame ?? rule.frame) : rule.frame;
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
        : { x: this.respawnPoint?.x || 7 * TILE + 8, y: this.respawnPoint?.y || 23 * TILE + 8 };
      const armor = this.armorConfig();
      this.player = this.physics.add.sprite(spawn.x, spawn.y, armor.idle[0]);
      this.player.setOrigin(0.5, 1).setDepth(this.player.y).play(this.playerAnimation("idle"));
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(10, 9).setOffset(3, 18);

      const weapon = progression.weaponConfig();
      this.carriedWeapon = this.add.image(this.player.x, this.player.y - 11, weapon.texture)
        .setOrigin(0.5, 0.95).setScale(0.74);
      this.applyWeaponVisual();
      this.updateCarriedWeapon();
      this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateCarriedWeapon, this);
    }

    armorConfig() {
      return ARMOR_SETS[this.state.armorId] || ARMOR_SETS.steel;
    }

    playerAnimation(action) {
      return `player-${this.armorConfig().id}-${action}`;
    }

    applyArmorVisual() {
      const armor = this.armorConfig();
      localStorage.setItem("dungeonOfAshArmor", armor.id);
      dom.armorRank.textContent = `${armor.name} · ${armor.bonus}`;
      if (!this.player?.active) return;
      this.player.anims.stop();
      this.player.setTexture(armor.idle[0]);
      this.player.play(this.playerAnimation("idle"));
    }

    applyWeaponVisual() {
      if (!this.carriedWeapon) return;
      const weapon = progression.weaponConfig();
      this.carriedWeapon.setTexture(weapon.texture).clearTint();
      if (weapon.glow) this.carriedWeapon.setTint(weapon.glow);
      dom.weaponRank.textContent = `${weapon.name} · +${weapon.damage}`;
    }



    updateCarriedWeapon() {
      if (!this.carriedWeapon?.active || !this.player?.active || this.attackAnimating) return;

      // Each knight animation frame has its own hand pose. The weapon is synced
      // after the physics step so its handle stays on the hand while moving.
      const facingLeft = Boolean(this.player.flipX);
      const side = facingLeft ? -1 : 1;
      const animationKey = this.player.anims.currentAnim?.key || "";
      const frameIndex = Math.max(0, (this.player.anims.currentFrame?.index || 1) - 1) % 4;
      const runHandPoses = [
        { x: 1, y: -7, angle: 42 },
        { x: 2, y: -8, angle: 48 },
        { x: 1, y: -6, angle: 38 },
        { x: 0, y: -7, angle: 44 }
      ];
      const idleHandPoses = [
        { x: 1, y: -7, angle: 45 },
        { x: 1, y: -8, angle: 42 },
        { x: 1, y: -7, angle: 47 },
        { x: 0, y: -6, angle: 44 }
      ];
      const pose = animationKey.endsWith("-run") ? runHandPoses[frameIndex] : idleHandPoses[frameIndex];

      this.carriedWeapon.setPosition(
        this.player.x - side * pose.x,
        this.player.y + pose.y
      );
      this.carriedWeapon.setAngle(facingLeft ? pose.angle : 360 - pose.angle);
      this.carriedWeapon.setDepth(this.player.depth + 2);
      this.carriedWeapon.setVisible(true);
    }
    spawnEncounters() {
      const scale = 1 + (this.state.floor - 1) * 0.18;
      this.mapLayout.enemies.forEach(({ x, y, type }) => this.spawnEnemy(x, y, type, scale));
      this.mimic = this.spawnEnemy(this.mapLayout.mimic.x, this.mapLayout.mimic.y, "mimic", scale);
      this.boss = this.spawnEnemy(this.mapLayout.boss.x, this.mapLayout.boss.y, "boss", scale);
      this.state.totalEnemies = this.enemies.countActive(true);
      this.state.totalMonsters = this.mapLayout.enemies.length + 1;
      this.state.requiredKills = Math.max(1, Math.ceil(this.state.totalMonsters * 0.8));
    }
    spawnEnemy(tileX, tileY, type, scale) {
      const definitions = {
        zombie: { texture: ASSETS.zombie[0], idle: "zombie-idle", run: "zombie-idle", hp: 2, speed: 31, damage: 1, reward: 2, aggroRadius: 128, patrolRadius: 46 },
        goblin: { texture: ASSETS.goblinIdle[0], idle: "goblin-idle", run: "goblin-run", hp: 2, speed: 46, damage: 1, reward: 3, aggroRadius: 145, patrolRadius: 58 },
        skeleton: { texture: ASSETS.skeletonIdle[0], idle: "skeleton-idle", run: "skeleton-run", hp: 3, speed: 36, damage: 1, reward: 3, aggroRadius: 158, patrolRadius: 52 },
        imp: { texture: ASSETS.impIdle[0], idle: "imp-idle", run: "imp-run", hp: 3, speed: 43, damage: 1, reward: 4, aggroRadius: 170, patrolRadius: 62 },
        orc: { texture: ASSETS.orcIdle[0], idle: "orc-idle", run: "orc-run", hp: 4, speed: 39, damage: 1, reward: 4, aggroRadius: 185, patrolRadius: 54 },
        mimic: { texture: ASSETS.mimic[0], idle: "mimic-run", run: "mimic-run", hp: 5, speed: 52, damage: 1, reward: 7, aggroRadius: 150, patrolRadius: 0 },
        boss: { texture: ASSETS.bossIdle[0], idle: "boss-idle", run: "boss-run", hp: 16, speed: 34, damage: 2, reward: 20, aggroRadius: 390, patrolRadius: 70 }
      };
      const def = definitions[type];
      const originX = tileX * TILE + 8;
      const originY = tileY * TILE + 8;
      const enemy = this.enemies.create(originX, originY, def.texture);
      enemy.setOrigin(0.5, 1).setDepth(enemy.y);
      if (type !== "mimic" && def.idle) enemy.play(def.idle);
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
        dormant: type === "mimic",
        staggerUntil: 0
      });
      if (type === "boss") enemy.body.setSize(22, 20).setOffset(5, 15);
      else if (type === "mimic") enemy.body.setSize(15, 11).setOffset(0, 5);
      else if (type === "orc") enemy.body.setSize(11, 11).setOffset(2, 11);
      else enemy.body.setSize(10, 9).setOffset(3, 7);
      enemy.setCollideWorldBounds(true);
      if (type === "mimic") enemy.body.moves = false;
      if (type !== "mimic") this.createEnemyHealthBar(enemy, type);
      return enemy;
    }

    createEnemyHealthBar(enemy, type) {
      const width = type === "boss" ? 34 : type === "mimic" ? 22 : 18;
      const height = type === "boss" ? 4 : 3;
      const offsetY = type === "boss" ? 42 : type === "orc" ? 29 : type === "mimic" ? 19 : 22;
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
      localStorage.setItem("dungeonOfAshIntroSeenV1", "1");
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
      if (!this.running || this.ended || this.respawning || this.transitioning) return;
      const movement = this.inputSystem.movement(delta);
      const speed = 76 * progression.bonuses().speedMultiplier * this.armorConfig().speedMultiplier;
      this.player.setVelocity(movement.x * speed, movement.y * speed);
      if (movement.lengthSq() > 0 && time >= this.stepReadyAt) {
        sound.step();
        this.stepReadyAt = time + 330;
      }
      if (movement.lengthSq() > 0) {
        this.lastFacing.copy(movement);
        if (Math.abs(movement.x) > 0.1) this.player.setFlipX(movement.x < 0);
        if (!this.attackAnimating && this.player.anims.currentAnim?.key !== this.playerAnimation("run")) this.player.play(this.playerAnimation("run"));
      } else if (!this.attackAnimating && this.player.anims.currentAnim?.key !== this.playerAnimation("idle")) {
        this.player.play(this.playerAnimation("idle"));
      }
      this.player.setDepth(this.player.y);
      this.updateCarriedWeapon();

      if (this.inputSystem.attackPressed() && time >= this.attackReadyAt) this.performAttack(time);
      if (this.inputSystem.abilityPressed()) this.castAshWard(time);
      if (this.area === "dungeon") {
        this.updateAutoStairs();
        if (this.transitioning) return;
        this.updateEnemies(time);
        this.updateAutoChests();
        this.updateAutoDoors();
        this.updateDropPickup();
        this.updateSpikeTrap(time);
      } else {
        this.updateTownEntrance();
      }
      this.updateInteraction();
      if (this.inputSystem.interactPressed()) this.performInteraction();
      this.updateWardHud(time);
      this.updateFogOfWar();
      this.renderMinimap(time);
    }


    createFogOfWar() {
      this.fogGraphics = this.add.graphics().setDepth(1000000);
      if (this.area === "town") {
        this.fogGraphics.setVisible(false);
        for (let y = 0; y < MAP_H; y += 1) {
          for (let x = 0; x < MAP_W; x += 1) {
            const key = `${x},${y}`;
            this.visitedCells.add(key);
            this.currentVisibleCells.add(key);
          }
        }
        return;
      }
      // A shared Canvas-compatible mask limits raised door copies to fogged
      // pixels. Visible actors retain their normal depth inside an open aisle.
      this.doorFogMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
      const doorMask = this.doorFogMaskGraphics.createGeometryMask();
      this.doorFogCaps.forEach(({ cap }) => cap.setMask(doorMask));
      this.events.once("shutdown", () => {
        doorMask.destroy();
        this.doorFogMaskGraphics.destroy();
        this.doorFogMaskGraphics = null;
      });
      this.updateFogOfWar(true);
    }

    updateFogOfWar(force = false) {
      if (this.area === "town" || !this.player?.active || !this.fogGraphics) return;
      const centerX = Math.floor(this.player.x / TILE);
      const centerY = Math.floor(this.player.y / TILE);
      const tileKey = `${centerX},${centerY}`;
      if (!force && tileKey === this.lastFogTile) return;
      this.lastFogTile = tileKey;
      this.currentVisibleCells.clear();

      const revealRadius = 7;
      const closedDoorCells = new Set(
        (this.roomDoors || [])
          .filter((door) => !door.opened)
          .flatMap((door) => door.cells.map(({ x, y }) => `${x},${y}`))
      );
      const reachable = new Set();
      const queue = [[centerX, centerY, 0]];
      const startKey = `${centerX},${centerY}`;
      if (this.floorCells.has(startKey) && !closedDoorCells.has(startKey)) reachable.add(startKey);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [x, y, distance] = queue[cursor];
        if (distance >= revealRadius) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nextX = x + dx;
          const nextY = y + dy;
          const key = `${nextX},${nextY}`;
          if (nextX < 0 || nextY < 0 || nextX >= MAP_W || nextY >= MAP_H) continue;
          if (!this.floorCells.has(key) || closedDoorCells.has(key) || reachable.has(key)) continue;
          reachable.add(key);
          queue.push([nextX, nextY, distance + 1]);
        }
      }
      for (let dy = -revealRadius; dy <= revealRadius; dy += 1) {
        for (let dx = -revealRadius; dx <= revealRadius; dx += 1) {
          if (dx * dx + dy * dy > revealRadius * revealRadius) continue;
          const x = centerX + dx;
          const y = centerY + dy;
          if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
          const key = `${x},${y}`;
          if (reachable.has(key)) {
            this.currentVisibleCells.add(key);
            this.visitedCells.add(key);
            continue;
          }
          if (!this.wallCells.has(key)) continue;
          const nextToFloor = [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .some(([wallDx, wallDy]) => reachable.has(`${x + wallDx},${y + wallDy}`));
          if (nextToFloor) {
            this.currentVisibleCells.add(key);
            this.visitedCells.add(key);
          }
        }
      }

      // Include diagonally touching boundary walls BEFORE expanding their
      // sprite bounds. Otherwise a corner is only discovered by padding a
      // neighbouring wall, and its own upper/lower brick pixels stay fogged.
      reachable.forEach((key) => {
        const [floorX, floorY] = key.split(",").map(Number);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const wallKey = `${floorX + dx},${floorY + dy}`;
            if (!this.wallCells.has(wallKey)) continue;
            this.currentVisibleCells.add(wallKey);
            this.visitedCells.add(wallKey);
          }
        }
      });

      // Show a closed door from the corridor side without revealing the room
      // cells behind it.
      (this.roomDoors || []).forEach((door) => {
        if (door.opened) return;
        const visible = door.cells.some(({ x, y }) => (
          [[1, 0], [-1, 0], [0, 1], [0, -1]]
            .some(([dx, dy]) => reachable.has(`${x + dx},${y + dy}`))
        ));
        if (!visible) return;
        door.cells.forEach(({ x, y }) => {
          const key = `${x},${y}`;
          this.currentVisibleCells.add(key);
          this.visitedCells.add(key);
        });
      });

      // A 32 px wall sprite crosses the neighbouring vertical tiles. Reveal
      // those tiles together so fog never cuts away the wall body and leaves
      // a single floating row of bricks at the edge of the visible circle.
      Array.from(this.currentVisibleCells).forEach((key) => {
        if (!this.wallCells?.has(key)) return;
        const [wallX, wallY] = key.split(",").map(Number);
        for (let paddingY = -1; paddingY <= 1; paddingY += 1) {
          const paddedY = wallY + paddingY;
          if (paddedY < 0 || paddedY >= MAP_H) continue;
          const paddedKey = `${wallX},${paddedY}`;
          this.currentVisibleCells.add(paddedKey);
          this.visitedCells.add(paddedKey);
        }
      });

      (this.doorFogCaps || []).forEach(({ cap, cells }) => {
        cap.setVisible(cells.some(({ x, y }) => this.currentVisibleCells.has(`${x},${y}`)));
      });

      this.fogGraphics.clear();
      this.doorFogMaskGraphics?.clear().fillStyle(0xffffff, 1);
      this.fogGraphics.fillStyle(0x020105, 0.97);
      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          const key = `${x},${y}`;
          if (!this.visitedCells.has(key)) {
            this.fogGraphics.fillRect(x * TILE, y * TILE, TILE, TILE);
            this.doorFogMaskGraphics?.fillRect(x * TILE, y * TILE, TILE, TILE);
          }
        }
      }
      this.fogGraphics.fillStyle(0x08060b, 0.48);
      this.visitedCells.forEach((key) => {
        if (this.currentVisibleCells.has(key)) return;
        const [x, y] = key.split(",").map(Number);
        this.fogGraphics.fillRect(x * TILE, y * TILE, TILE, TILE);
        this.doorFogMaskGraphics?.fillRect(x * TILE, y * TILE, TILE, TILE);
      });
    }

    isWorldTileExplored(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      return this.visitedCells.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
    }

    isWorldTileVisible(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      return this.currentVisibleCells.has(`${Math.floor(x / TILE)},${Math.floor(y / TILE)}`);
    }

    renderMinimap(time) {
      if (!dom.minimap || dom.minimapPanel?.classList.contains("is-hidden") || time < this.minimapNextAt || !this.floorCells) return;
      this.minimapNextAt = time + 140;
      const ctx = dom.minimap.getContext("2d");
      const width = dom.minimap.width;
      const height = dom.minimap.height;
      ctx.clearRect(0, 0, width, height);

      const floorBoundsCells = Array.from(this.floorCells, (entry) => entry.split(",").map(Number));
      const wallBoundsCells = Array.from(this.wallCells || [], (entry) => entry.split(",").map(Number));
      // Walls sit one tile outside the walkable floor. Include them in the
      // bounds so the north/top wall is not clipped off the minimap.
      const boundsCells = floorBoundsCells.concat(wallBoundsCells);
      let minX = Math.min(...boundsCells.map(([x]) => x));
      let maxX = Math.max(...boundsCells.map(([x]) => x));
      let minY = Math.min(...boundsCells.map(([, y]) => y));
      let maxY = Math.max(...boundsCells.map(([, y]) => y));
      if (this.minimapZoomed) {
        const centerX = Math.floor(this.player.x / TILE);
        const centerY = Math.floor(this.player.y / TILE);
        minX = centerX - 11;
        maxX = centerX + 11;
        minY = centerY - 8;
        maxY = centerY + 8;
      }
      const scale = Math.min((width - 8) / (maxX - minX + 1), (height - 8) / (maxY - minY + 1));
      const ox = (width - (maxX - minX + 1) * scale) / 2;
      const oy = (height - (maxY - minY + 1) * scale) / 2;
      const px = (x) => ox + (x - minX) * scale + scale / 2;
      const py = (y) => oy + (y - minY) * scale + scale / 2;

      // Diablo stila karte: tikai jau atklātās sienas, bez grīdas,
      // radījumiem un bez gaišā apļa, kas nodotu redzamības rādiusu.
      this.wallCells?.forEach((entry) => {
        if (!this.visitedCells.has(entry)) return;
        const [x, y] = entry.split(",").map(Number);
        if (x < minX || x > maxX || y < minY || y > maxY) return;
        ctx.fillStyle = "rgba(218, 197, 173, 0.76)";
        ctx.fillRect(
          ox + (x - minX) * scale,
          oy + (y - minY) * scale,
          Math.max(1.25, Math.ceil(scale)),
          Math.max(1.25, Math.ceil(scale))
        );
      });

      const playerTileX = Math.floor(this.player.x / TILE);
      const playerTileY = Math.floor(this.player.y / TILE);
      if (playerTileX < minX || playerTileX > maxX || playerTileY < minY || playerTileY > maxY) return;
      ctx.beginPath();
      ctx.arc(px(playerTileX), py(playerTileY), this.minimapZoomed ? 4.2 : 3.25, 0, Math.PI * 2);
      ctx.fillStyle = "#74efff";
      ctx.fill();
      ctx.strokeStyle = "rgba(230, 255, 255, 0.82)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    toggleMinimap(show) {
      const visible = typeof show === "boolean" ? show : dom.minimapPanel?.classList.contains("is-hidden");
      dom.minimapPanel?.classList.toggle("is-hidden", !visible);
      dom.minimapReopen?.classList.toggle("is-hidden", visible);
      this.minimapNextAt = 0;
      if (visible) this.renderMinimap(this.time.now);
    }

    toggleMinimapZoom() {
      this.minimapZoomed = !this.minimapZoomed;
      dom.minimapPanel?.classList.toggle("is-zoomed", this.minimapZoomed);
      if (dom.minimapZoom) {
        dom.minimapZoom.textContent = this.minimapZoomed ? "−" : "＋";
        dom.minimapZoom.setAttribute("aria-label", this.minimapZoomed ? "Attālināt karti" : "Pietuvināt karti");
      }
      this.minimapNextAt = 0;
      this.renderMinimap(this.time.now);
    }
    castAshWard(time) {
      const bonuses = progression.bonuses();
      if (!bonuses.unlockWard || time < this.wardEndsAt) return;
      this.wardEndsAt = time + 6000;
      this.healPlayer(bonuses.wardHeal);
      if (!this.wardAura) {
        this.wardAura = this.add.image(this.player.x, this.player.y - 2, "ward-aura-0");
        this.createWardMask();
      }
      this.updateWardAura();
      sound.blip(560, 0.24, "sine", 0.04);
      this.updateHud();
    }

    updateWardHud(time) {
      const remaining = Math.max(0, this.wardEndsAt - time);
      dom.buff.classList.add("is-hidden");
      dom.abilityTime.textContent = remaining > 0 ? String(Math.ceil(remaining / 1000)) : "";
      dom.ability.setAttribute("aria-pressed", String(remaining > 0));
      dom.ability.setAttribute("aria-label", remaining > 0 ? `Pelnu vairogs: ${Math.ceil(remaining / 1000)} sekundes` : "Aktivizēt Pelnu vairogu");
      dom.ability.classList.toggle("is-ready", progression.bonuses().unlockWard && remaining <= 0);
      dom.ability.classList.toggle("is-active", remaining > 0);
    }


    performAttack(time) {
      this.attackReadyAt = time + 310;
      this.attackAnimating = true;
      const direction = this.lastFacing.clone().normalize();
      const baseAngle = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x));
      const weaponConfig = progression.weaponConfig();
      this.carriedWeapon?.setVisible(false);
      this.player.anims.stop();
      this.player.setTexture(this.armorConfig().hit);
      this.player.x += direction.x * 2;
      this.player.y += direction.y * 2;

      const weapon = this.add.image(
        this.player.x + direction.x * 13,
        this.player.y - 10 + direction.y * 13,
        weaponConfig.texture
      ).setOrigin(0.15, 0.5).setScale(0.94).setDepth(this.player.depth + 3).setAngle(baseAngle - 72);
      if (weaponConfig.glow) weapon.setTint(weaponConfig.glow);
      this.createAttackFx(direction, baseAngle, weaponConfig);
      this.tweens.add({
        targets: weapon,
        angle: baseAngle + 76,
        duration: 135,
        ease: "Quad.easeOut",
        onComplete: () => weapon.destroy()
      });
      this.time.delayedCall(155, () => {
        if (!this.player?.active) return;
        this.attackAnimating = false;
        this.player.play(this.playerAnimation("idle"));
        this.updateCarriedWeapon();
      });
      sound.blip(210 + weaponConfig.level * 35, 0.08, "sawtooth", 0.026);

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
        this.hitEnemy(enemy, 1 + bonuses.attackDamage + weaponConfig.damage + wardDamage, direction, time);
      });
    }

    createAttackFx(direction, angle, weaponConfig) {
      const color = weaponConfig.glow || 0xe7d7bd;
      const slash = this.add.graphics().setPosition(this.player.x, this.player.y - 9).setDepth(this.player.depth + 2);
      slash.lineStyle(3, color, 0.86);
      slash.beginPath();
      slash.arc(0, 0, 22 + weaponConfig.level * 2, Phaser.Math.DegToRad(angle - 62), Phaser.Math.DegToRad(angle + 62), false);
      slash.strokePath();
      slash.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: slash, alpha: 0, scale: 1.16, duration: 170, onComplete: () => slash.destroy() });
      for (let i = 0; i < 5 + weaponConfig.level; i += 1) {
        const spark = this.add.rectangle(
          this.player.x + direction.x * 21,
          this.player.y - 9 + direction.y * 18,
          2, 2, color, 0.9
        ).setDepth(this.player.depth + 4).setBlendMode(Phaser.BlendModes.ADD);
        const spread = Phaser.Math.FloatBetween(-0.65, 0.65);
        this.tweens.add({
          targets: spark,
          x: spark.x + direction.x * Phaser.Math.Between(8, 18) - direction.y * spread * 14,
          y: spark.y + direction.y * Phaser.Math.Between(8, 18) + direction.x * spread * 14,
          alpha: 0,
          duration: Phaser.Math.Between(120, 230),
          onComplete: () => spark.destroy()
        });
      }
    }

    hitEnemy(enemy, damage, direction, time) {
      if (enemy.getData("type") === "mimic" && enemy.getData("dormant")) this.awakenMimic(enemy, time);
      const hp = enemy.getData("hp") - damage;
      this.showCombatNumber(enemy, Math.min(damage, enemy.getData("hp")), 0xf1d69c);
      enemy.setData("hp", hp);
      enemy.setData("staggerUntil", time + 130);
      enemy.setVelocity(direction.x * 95, direction.y * 95);
      enemy.setTintFill(0xffd2aa);
      this.time.delayedCall(90, () => enemy.active && enemy.clearTint());
      const weapon = progression.weaponConfig();
      for (let i = 0; i < 4 + weapon.level; i += 1) {
        const spark = this.add.circle(enemy.x, enemy.y - 9, Phaser.Math.Between(1, 2), weapon.glow || 0xffd2aa, 0.95)
          .setDepth(enemy.depth + 3).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          x: spark.x + Phaser.Math.Between(-15, 15),
          y: spark.y + Phaser.Math.Between(-17, 7),
          alpha: 0,
          duration: Phaser.Math.Between(150, 260),
          onComplete: () => spark.destroy()
        });
      }
      this.updateEnemyHealthBar(enemy);
      this.cameras.main.shake(48, 0.0011);
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
      if (type !== "boss") {
        this.state.monsterKills += 1;
        if (!this.state.bossUnlocked && this.state.monsterKills >= this.state.requiredKills) {
          this.state.bossUnlocked = true;
          this.showLootToast("80% MONSTRU SAKAUTI · CEĻŠ PIE BOSA ATSLĒGTS");
          sound.blip(720, 0.24, "triangle", 0.045);
        }
      }
      const killHeal = progression.bonuses().healOnKill;
      if (killHeal) this.healPlayer(killHeal);
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

    spawnDrop(x, y, type, value, options = {}) {
      const armor = type === "armor" ? (ARMOR_SETS[value] || ARMOR_SETS.scout) : null;
      const key = type === "coin"
        ? ASSETS.coin[0]
        : type === "potion"
          ? "flask_big_red"
          : armor.idle[0];
      const fromChest = Boolean(options.fromChest);
      const minDistance = fromChest ? CHEST_DROP_MIN_DISTANCE : 8;
      const maxDistance = fromChest ? CHEST_DROP_MAX_DISTANCE : 14;
      const scatterAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const scatterDistance = Phaser.Math.Between(minDistance, maxDistance);
      const targetX = x + Math.cos(scatterAngle) * scatterDistance;
      const targetY = y + Math.sin(scatterAngle) * scatterDistance;
      const drop = this.drops.create(x, y - 3, key)
        .setDepth(targetY + 2)
        .setData({ type, value, collectAt: this.time.now + 430 });
      if (type === "armor") drop.setScale(0.86);
      drop.body.setCircle(type === "coin" ? 4 : 5);
      if (type === "coin") drop.play("coin-spin");
      this.tweens.add({
        targets: drop,
        x: targetX,
        y: targetY,
        duration: 310,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (!drop.active) return;
          this.tweens.add({ targets: drop, y: targetY - 3, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      });
    }

    collectDrop(_player, drop) {
      if (!drop?.active || this.time.now < drop.getData("collectAt")) return;
      const type = drop.getData("type");
      if (type === "coin") {
        this.state.addGold(drop.getData("value"));
        sound.blip(620, 0.07, "square", 0.025);
      } else if (type === "potion") {
        this.healPlayer(drop.getData("value"));
        sound.blip(410, 0.11, "sine", 0.035);
      } else if (type === "armor") {
        const armorId = ARMOR_SETS[drop.getData("value")] ? drop.getData("value") : "scout";
        this.state.armorId = armorId;
        this.applyArmorVisual();
        sound.blip(540, 0.2, "triangle", 0.045);
        this.cameras.main.flash(120, 64, 150, 170, false);
        this.showLootToast(`APRĪKOTS · ${this.armorConfig().name}`, "armor");
      }
      drop.disableBody(true, true);
      this.updateHud();
    }

    updateDropPickup() {
      this.drops.getChildren().forEach((drop) => {
        if (!drop.active || this.time.now < drop.getData("collectAt")) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.x, drop.y) <= DROP_PICKUP_RADIUS) {
          this.collectDrop(this.player, drop);
        }
      });
    }

    healPlayer(amount) {
      const restored = this.state.heal(amount);
      if (restored > 0) this.showCombatNumber(this.player, `+${restored}`, 0x8cce70);
      return restored;
    }

    showCombatNumber(actor, value, color) {
      if (!actor?.active) return;
      const glyphs = {
        "0": ["111","101","101","101","111"], "1": ["010","110","010","010","111"],
        "2": ["111","001","111","100","111"], "3": ["111","001","111","001","111"],
        "4": ["101","101","111","001","001"], "5": ["111","100","111","001","111"],
        "6": ["111","100","111","101","111"], "7": ["111","001","010","010","010"],
        "8": ["111","101","111","101","111"], "9": ["111","101","111","001","111"],
        "+": ["000","010","111","010","000"], "-": ["000","000","111","000","000"]
      };
      const text = String(value);
      const pixels = [];
      [...text].forEach((char, index) => (glyphs[char] || glyphs["0"]).forEach((row, y) => {
        [...row].forEach((bit, x) => { if (bit === "1") pixels.push([index * 4 + x, y]); });
      }));
      this.combatTextSerial = (this.combatTextSerial || 0) + 1;
      const x = Math.round(actor.x - (text.length * 4 - 1) / 2 + (this.combatTextSerial % 3 - 1) * 4);
      const y = Math.round(actor.y - (actor.displayHeight || 24) - 3);
      const number = this.add.graphics({ x, y }).setDepth(999999);
      // One native pixel per stroke: sharp at the same camera scale as sprites.
      number.fillStyle(0x15131a, 0.95);
      pixels.forEach(([px, py]) => number.fillRect(px - 1, py - 1, 3, 3));
      number.fillStyle(color, 1);
      pixels.forEach(([px, py]) => number.fillRect(px, py, 1, 1));
      this.tweens.add({ targets: number, y: y - 14, alpha: 0, duration: 850,
        ease: "Cubic.easeOut", onComplete: () => number.destroy() });
    }

    showLootToast(message, type = "") {
      if (!dom.lootToast) return;
      dom.lootToast.textContent = message;
      dom.lootToast.className = `loot-toast ${type}`.trim();
      this.lootToastTimer?.remove(false);
      this.lootToastTimer = this.time.delayedCall(1750, () => dom.lootToast.classList.add("is-hidden"));
    }

    updateEnemies(time) {
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        const type = enemy.getData("type");
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (type === "mimic" && enemy.getData("dormant")) {
          enemy.body.moves = false;
          enemy.setVelocity(0, 0).setDepth(enemy.y);
          if (distance < 58) this.awakenMimic(enemy, time);
          return;
        }
        if (time < enemy.getData("staggerUntil")) {
          enemy.setDepth(enemy.y);
          this.updateEnemyHealthBar(enemy);
          return;
        }
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

    awakenMimic(enemy, time = this.time.now) {
      if (!enemy?.active || enemy.getData("type") !== "mimic" || !enemy.getData("dormant")) return;
      enemy.setData({
        dormant: false,
        aiState: "chase",
        staggerUntil: time + 300
      });
      enemy.body.moves = true;
      enemy.play("mimic-awaken");
      enemy.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (enemy.active) enemy.play("mimic-run");
      });
      this.createEnemyHealthBar(enemy, "mimic");
      this.showLootToast("MIMIKS! LĀDE UZBRŪK");
      this.cameras.main.shake(120, 0.004);
      sound.blip(94, 0.2, "sawtooth", 0.045);
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
      const blockChance = Math.min(0.75, bonuses.blockChance + this.armorConfig().blockChance);
      if (blockChance && Math.random() < blockChance) {
        sound.blip(710, 0.08, "square", 0.025);
        this.showCombatNumber(this.player, "0", 0xa8bcc0);
        return 0;
      }
      const reduced = this.time.now < this.wardEndsAt ? Math.max(1, Math.ceil(amount * 0.5)) : amount;
      const lost = Math.min(this.state.hp, reduced);
      this.state.damage(reduced);
      if (lost > 0) this.showCombatNumber(this.player, `-${lost}`, 0xee756f);
      return reduced;
    }

    handleEnemyContact(player, enemy) {
      const now = this.time.now;
      if (now < this.hurtReadyAt || !enemy.active) return;
      if (enemy.getData("type") === "mimic" && enemy.getData("dormant")) {
        this.awakenMimic(enemy, now);
        return;
      }
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
      this.nearRoomDoor = null;
      let label = "";
      if (this.area === "town" && this.smithNpc &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.smithNpc.x, this.smithNpc.y) < 42) {
        this.nearInteraction = "smithNpc";
        label = "UZLABOT IEROCI";
      } else if (this.area === "town" && this.townNpc &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.townNpc.x, this.townNpc.y) < 42) {
        this.nearInteraction = "townNpc";
        label = "RUNĀT / BONUSA KOKS";
      } else if (this.area === "town" && this.townStairs &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.townStairs.x, this.townStairs.y) < 34) {
        this.nearInteraction = "townExit";
        label = "IET UZ DUNGEONU";
      } else if (this.area === "dungeon" && this.guideNpc &&
          Phaser.Math.Distance.Between(this.player.x, this.player.y, this.guideNpc.x, this.guideNpc.y) < 42) {
        this.nearInteraction = "guideNpc";
        label = "ATPAKAĻ UZ PILSĒTU";
      } else if (this.area === "dungeon") {
        if (!this.state.doorOpened && !this.gateAnimating && this.door && !this.state.bossUnlocked &&
            Phaser.Math.Distance.Between(this.player.x, this.player.y, this.door.x, this.door.y) < 48) {
          label = `VĒL PAR MAZ · ${Math.floor(this.state.monsterKills / this.state.totalMonsters * 100)}% / 80% · SAKAUJ VĒL ${Math.max(0, this.state.requiredKills - this.state.monsterKills)} MONSTRUS KARTĒ`;
        }
      }
      dom.prompt.disabled = !this.nearInteraction;
      dom.prompt.textContent = label;
      dom.prompt.classList.toggle("is-hidden", !label);
    }

    performInteraction() {
      if (this.nearInteraction === "smithNpc") {
        this.openSmith();
      } else if (this.nearInteraction === "townNpc") {
        this.healPlayer(this.state.maxHp);
        this.updateHud();
        this.openTalentTree();
      } else if (this.nearInteraction === "townExit") {
        this.enterDungeon();
      } else if (this.nearInteraction === "guideNpc") {
        this.returnToTown();

      }
    }
    updateAutoDoors() {
      (this.roomDoors || []).forEach((door) => {
        if (!door.sprite?.active || door.animating) return;
        const distance = Math.hypot(this.player.x - door.sprite.x, this.player.y - (door.sprite.y - TILE / 2));
        if (!door.opened && distance < 36) this.openRoomDoor(door);
        else if (door.opened && distance > 64 && !this.doorwayOccupied(door.sprite)) this.closeRoomDoor(door);
      });
      if (this.state.bossUnlocked && !this.state.doorOpened && !this.gateAnimating && this.door?.active
          && Math.hypot(this.player.x - this.door.x, this.player.y - this.door.y) < 48) this.openDoor();
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
      this.state.chestOpened = true;
      this.spawnDrop(chest.x, chest.y - 7, "coin", Phaser.Math.Between(3, 8), { fromChest: true });
      if (Math.random() < 0.34) this.spawnDrop(chest.x, chest.y - 7, "coin", Phaser.Math.Between(2, 5), { fromChest: true });
      if (Math.random() < 0.58) this.spawnDrop(chest.x, chest.y - 7, "potion", 2, { fromChest: true });
      const unopenedChests = this.chests.filter((candidate) => !candidate.getData("opened")).length;
      if (Math.random() < 0.36 || (!this.state.armorDropSeen && unopenedChests === 0)) {
        const armorId = this.state.armorId === "ash"
          ? Phaser.Utils.Array.GetRandom(["steel", "scout"])
          : "ash";
        this.state.armorDropSeen = true;
        this.spawnDrop(chest.x, chest.y - 7, "armor", armorId, { fromChest: true });
      }
      sound.blip(480, 0.16, "triangle", 0.04);
      this.cameras.main.flash(130, 138, 85, 30, false);
      this.updateHud();
    }

    openDoor() {
      if (!this.state.bossUnlocked || this.state.doorOpened || this.gateAnimating) return;
      this.gateAnimating = true;
      this.door.once("animationcomplete", () => {
        this.state.doorOpened = true;
        this.gateAnimating = false;
        this.door.body.enable = false;
        this.updateObjective();
      });
      this.door.play("ash-door-open");
      sound.blip(112, 0.22, "triangle", 0.04);
    }


    revealStairs() {
      const stairs = this.mapLayout.stairs;
      this.stairs = this.add.image(stairs.x * TILE + 8, stairs.y * TILE + 8, "floor_stairs").setDepth(-1).setAlpha(0);
      this.tweens.add({ targets: this.stairs, alpha: 1, duration: 500 });
    }
    updateAutoStairs() {
      if (this.transitioning || !this.state.bossDead || !this.stairs?.active || this.stairs.alpha < 0.95) return;
      if (Math.hypot(this.player.x - this.stairs.x, this.player.y - this.stairs.y) < 20) this.nextFloor();
    }

    nextFloor() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.player.setVelocity(0, 0);
      dom.prompt.classList.add("is-hidden");
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
          runSeed: this.state.runSeed,
          gold: this.state.gold,
          hp: Math.min(this.state.maxHp, this.state.hp + 2)
        });
      });
    }

    updateTownEntrance() {
      if (!this.townStairs || this.transitioning) return;
      if (this.townDirectionArrow) {
        const insideHouse = this.player.y < (TOWN.wallY + 1) * TILE;
        const targetX = insideHouse ? TOWN.entranceX * TILE : this.townStairs.x;
        const targetY = insideHouse ? (TOWN.wallY + 2) * TILE : this.townStairs.y;
        const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        this.townDirectionArrow
          .setPosition(Math.round(this.player.x + Math.cos(angle) * 20), Math.round(this.player.y + Math.sin(angle) * 20))
          .setTexture(`exit-arrow-${((Math.round((angle + Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8}`)
          .setVisible(Math.hypot(this.townStairs.x - this.player.x, this.townStairs.y - this.player.y) > 24);
      }
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
          runSeed: this.state.runSeed,
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
          runSeed: this.state.runSeed,
          gold: this.state.gold,
          hp: this.state.hp
        });
      });
    }

    updateObjective() {
      dom.questPanel.classList.toggle("is-hidden", this.area === "town");
      if (this.area === "town") return;
      dom.questKicker.textContent = "IZVĒLES UZDEVUMS";
      if (this.state.bossDead) dom.objective.textContent = "Boss sakauts · kāp uz nākamo stāvu";
      else if (!this.state.bossUnlocked) dom.objective.textContent = `Sakauj monstrus · ${this.state.monsterKills}/${this.state.requiredKills}`;
      else if (this.state.doorOpened && this.boss?.active) dom.objective.textContent = `Sakauj stāva bosu · HP ${this.boss.getData("hp")}/${this.boss.getData("maxHp")}`;
      else dom.objective.textContent = "PIEEJ PIE BOSA DURVĪM";
    }

    updateBossProgressUi() {
      if (!dom.bossProgress) return;
      const visible = this.area === "dungeon" && this.state.requiredKills > 0;
      dom.bossProgress.classList.toggle("is-hidden", !visible);
      if (!visible) return;
      const percent = Math.min(100, Math.floor((this.state.monsterKills / this.state.totalMonsters) * 100));
      const completed = Math.min(this.state.requiredKills, this.state.monsterKills);
      const label = this.state.bossDead ? "BOSS SAKAUTS"
        : this.state.bossUnlocked ? "DURVIS GATAVAS · PIEEJ KLĀT"
        : `MONSTRI · ${percent}% / 80%`;
      dom.bossProgress.querySelector(".boss-progress-label").textContent = label;
      const track = dom.bossProgress.querySelector(".boss-progress-track");
      track.setAttribute("aria-valuemax", this.state.requiredKills);
      track.setAttribute("aria-valuenow", completed);
      track.setAttribute("aria-valuetext", `${this.state.monsterKills} no ${this.state.requiredKills} monstriem`);
      track.style.setProperty("--progress", `${completed / this.state.requiredKills * 100}%`);
      dom.bossProgress.classList.toggle("is-ready", this.state.bossUnlocked);
    }


    updateHud() {
      dom.hearts.innerHTML = "";
      // Three hearts represent the whole health pool, including talent bonuses.
      const heartUnits = Math.max(0, Math.min(6, this.state.hp / this.state.maxHp * 6));
      dom.hearts.setAttribute("aria-label", `Dzīvība: ${this.state.hp} / ${this.state.maxHp}`);
      for (let i = 0; i < 3; i += 1) {
        const value = heartUnits - i * 2;
        const key = value >= 2 ? "ui_heart_full" : value > 0 ? "ui_heart_half" : "ui_heart_empty";
        const image = document.createElement("img");
        image.src = asset(key);
        image.alt = "";
        dom.hearts.appendChild(image);
      }
      dom.gold.textContent = String(this.state.gold);
      dom.floor.textContent = this.area === "town" ? "—" : String(this.state.floor);
      dom.area.textContent = this.area === "town" ? "Pilsēta" : "Stāvs";
      dom.xp.style.width = `${Math.min(100, (this.state.kills / Math.max(1, this.state.totalEnemies)) * 100)}%`;
      this.applyWeaponVisual();
      dom.armorRank.textContent = `${this.armorConfig().name} · ${this.armorConfig().bonus}`;
      this.updateObjective();
      this.updateBossProgressUi();
      this.updateProgressionUi();
      if (this.smithOpen) this.updateSmithUi();
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
      if (this.state.maxHp > before) this.healPlayer(this.state.maxHp - before);
      this.updateHud();
    }


    openTalentTree() {
      if (this.talentOpen || this.smithOpen) return;
      this.talentOpen = true;
      this.updateProgressionUi();
      dom.talent.classList.add("active");
      dom.mobile.classList.add("is-hidden");
      dom.prompt.classList.add("is-hidden");
      this.scene.pause();
    }

    openSmith() {
      if (this.smithOpen || this.talentOpen) return;
      this.smithOpen = true;
      this.updateSmithUi();
      dom.smith.classList.add("active");
      dom.mobile.classList.add("is-hidden");
      dom.prompt.classList.add("is-hidden");
      this.scene.pause();
    }

    closeSmith() {
      if (!this.smithOpen) return;
      this.smithOpen = false;
      dom.smith.classList.remove("active");
      if (this.running && !this.ended) this.scene.resume();
      if (TOUCH_DEVICE && this.running) dom.mobile.classList.remove("is-hidden");
    }

    updateSmithUi() {
      const weapon = progression.weaponConfig();
      dom.smithWeapon.textContent = `${weapon.name} (+${weapon.damage} bojājumi)`;
      dom.smithCost.textContent = weapon.cost == null ? "Maksimālais līmenis" : `${weapon.cost} zelta`;
      dom.smithUpgrade.disabled = weapon.cost == null || this.state.gold < weapon.cost;
      dom.smithUpgrade.textContent = weapon.cost == null ? "IEROCIS PILNĪBĀ UZLABOTS" : `KALT PAR ${weapon.cost} ZELTA`;
    }

    upgradeWeapon() {
      const result = progression.upgradeWeapon(this.state.gold);
      if (!result.success) {
        sound.blip(82, 0.12, "square", 0.035);
        this.updateSmithUi();
        return;
      }
      this.state.gold -= result.cost;
      this.applyWeaponVisual();
      this.updateHud();
      this.updateSmithUi();
      const weapon = progression.weaponConfig();
      this.carriedWeapon?.setScale(1.35);
      this.tweens.add({ targets: this.carriedWeapon, scale: 0.74, duration: 380, ease: "Back.easeOut" });
      const flare = this.add.circle(this.player.x, this.player.y - 11, 8, weapon.glow || 0xffc766, 0.8)
        .setDepth(this.player.depth + 4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: flare, scale: 4, alpha: 0, duration: 520, onComplete: () => flare.destroy() });
      sound.blip(720, 0.28, "triangle", 0.05);
      this.cameras.main.flash(180, 215, 126, 45, false);
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
          enemy.body.moves = !enemy.getData("dormant");
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

  // Keep the original UI art. A 48px render target gives its 64px details
  // slightly larger pixels without redrawing the shapes or changing palettes.
  function renderPixelControls() {
    ["joystick-base", "joystick-knob", "attack", "ability"].forEach((name) => {
      const source = new Image();
      source.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 48;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.imageSmoothingEnabled = false;
        context.drawImage(source, 0, 0, 48, 48);
        try {
          document.documentElement.style.setProperty(`--pixel-${name}`, `url("${canvas.toDataURL()}")`);
        } catch (_) {
          // Direct file:// launches can disallow canvas export; keep original art.
        }
      };
      source.src = `assets/ui/${name}.png?v=61`;
    });
  }
  renderPixelControls();

  const game = new Phaser.Game(config);

  function currentScene() {
    return game.scene.getScene("Dungeon");
  }

  function showGameplayUi() {
    dom.start.classList.remove("active");
    dom.pause.classList.remove("active");
    dom.result.classList.remove("active");
    dom.talent.classList.remove("active");
    dom.smith.classList.remove("active");
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
  dom.prompt.addEventListener("click", () => {
    const scene = currentScene();
    if (scene?.running && !scene.ended && !scene.pausedByUser && !scene.talentOpen && !scene.smithOpen && scene.nearInteraction) scene.performInteraction();
  });
  dom.talentButton.addEventListener("click", () => currentScene()?.openTalentTree());
  dom.talentClose.addEventListener("click", () => currentScene()?.closeTalentTree());
  dom.smithClose.addEventListener("click", () => currentScene()?.closeSmith());
  dom.smithUpgrade.addEventListener("click", () => currentScene()?.upgradeWeapon());
  dom.minimapZoom.addEventListener("click", () => currentScene()?.toggleMinimapZoom());
  dom.minimapClose.addEventListener("click", () => currentScene()?.toggleMinimap(false));
  dom.minimapReopen.addEventListener("click", () => currentScene()?.toggleMinimap(true));
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
    if (scene?.smithOpen) scene.closeSmith();
    else if (scene?.talentOpen) scene.closeTalentTree();
    else scene?.togglePause();
  });

  const ensureSound = () => sound.unlock();
  window.addEventListener("pointerdown", ensureSound, { passive: true });
  window.addEventListener("keydown", ensureSound);

  window.addEventListener("blur", () => {
    const scene = currentScene();
    if (scene?.running && !scene.ended && !scene.pausedByUser && !scene.talentOpen && !scene.smithOpen) scene.togglePause(true);
  });
})();
