(function () {
  "use strict";

  const TILE = 16;
  const MAP_W = 48;
  const MAP_H = 32;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const MAX_HP = 6;
  const TOUCH_DEVICE = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

  const dom = {
    hud: document.getElementById("hud"),
    hearts: document.getElementById("hearts"),
    xp: document.getElementById("xp-fill"),
    gold: document.getElementById("gold"),
    floor: document.getElementById("floor"),
    objective: document.getElementById("objective"),
    prompt: document.getElementById("prompt"),
    mobile: document.getElementById("mobile-controls"),
    start: document.getElementById("start-screen"),
    pause: document.getElementById("pause-screen"),
    result: document.getElementById("result-screen"),
    resultKicker: document.getElementById("result-kicker"),
    resultTitle: document.getElementById("result-title"),
    resultCopy: document.getElementById("result-copy")
  };

  const asset = (name) => `assets/frames/${name}.png`;

  const ASSETS = {
    floor: ["floor_1", "floor_2", "floor_3", "floor_4", "floor_5", "floor_6", "floor_7", "floor_8"],
    walls: [
      "wall_mid", "wall_top_mid", "wall_left", "wall_right", "wall_top_left", "wall_top_right",
      "wall_banner_red", "wall_banner_blue", "wall_banner_green", "wall_hole_1", "wall_hole_2",
      "column", "column_wall", "crate", "skull", "doors_leaf_closed", "doors_leaf_open",
      "floor_stairs", "floor_spikes_anim_f0", "floor_spikes_anim_f1", "floor_spikes_anim_f2", "floor_spikes_anim_f3"
    ],
    playerIdle: [0, 1, 2, 3].map((i) => `knight_m_idle_anim_f${i}`),
    playerRun: [0, 1, 2, 3].map((i) => `knight_m_run_anim_f${i}`),
    zombie: ["zombie_anim_f1", "zombie_anim_f2", "zombie_anim_f3", "zombie_anim_f10"],
    orcIdle: [0, 1, 2, 3].map((i) => `orc_warrior_idle_anim_f${i}`),
    orcRun: [0, 1, 2, 3].map((i) => `orc_warrior_run_anim_f${i}`),
    bossIdle: [0, 1, 2, 3].map((i) => `big_demon_idle_anim_f${i}`),
    bossRun: [0, 1, 2, 3].map((i) => `big_demon_run_anim_f${i}`),
    chest: [0, 1, 2].map((i) => `chest_full_open_anim_f${i}`),
    coin: [0, 1, 2, 3].map((i) => `coin_anim_f${i}`),
    items: ["weapon_golden_sword", "flask_big_red", "ui_heart_full", "ui_heart_half", "ui_heart_empty"]
  };

  class RunState {
    constructor(data = {}) {
      this.floor = data.level || 1;
      this.hp = Phaser.Math.Clamp(data.hp == null ? MAX_HP : data.hp, 1, MAX_HP);
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
      this.hp = Math.min(MAX_HP, this.hp + amount);
      return this.hp - before;
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
      this.touch = new Set();
      this.pulses = new Set();
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = scene.input.keyboard.addKeys("W,A,S,D,SPACE,E");
      this.bindTouch();
    }

    bindTouch() {
      document.querySelectorAll("[data-action]").forEach((button) => {
        const action = button.dataset.action;
        const down = (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          button.classList.add("pressed");
          if (action === "attack" || action === "interact") this.pulses.add(action);
          else this.touch.add(action);
        };
        const up = (event) => {
          event.preventDefault();
          button.classList.remove("pressed");
          this.touch.delete(action);
        };
        button.addEventListener("pointerdown", down);
        button.addEventListener("pointerup", up);
        button.addEventListener("pointercancel", up);
        button.addEventListener("pointerleave", up);
      });
    }

    movement() {
      let x = 0;
      let y = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown || this.touch.has("left")) x -= 1;
      if (this.cursors.right.isDown || this.keys.D.isDown || this.touch.has("right")) x += 1;
      if (this.cursors.up.isDown || this.keys.W.isDown || this.touch.has("up")) y -= 1;
      if (this.cursors.down.isDown || this.keys.S.isDown || this.touch.has("down")) y += 1;
      const vector = new Phaser.Math.Vector2(x, y);
      return vector.lengthSq() > 0 ? vector.normalize() : vector;
    }

    attackPressed() {
      if (this.pulses.delete("attack")) return true;
      return Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    }

    interactPressed() {
      if (this.pulses.delete("interact")) return true;
      return Phaser.Input.Keyboard.JustDown(this.keys.E);
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
      this.state = new RunState(data);
      this.running = Boolean(data.autoStart);
      this.ended = false;
      this.pausedByUser = false;
      this.lastFacing = new Phaser.Math.Vector2(1, 0);
      this.attackReadyAt = 0;
      this.hurtReadyAt = 0;
    }

    preload() {
      this.load.setPath("assets/frames/");
      const allKeys = [
        ...ASSETS.floor, ...ASSETS.walls, ...ASSETS.playerIdle, ...ASSETS.playerRun,
        ...ASSETS.zombie, ...ASSETS.orcIdle, ...ASSETS.orcRun, ...ASSETS.bossIdle,
        ...ASSETS.bossRun, ...ASSETS.chest, ...ASSETS.coin, ...ASSETS.items
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
      this.fx = this.add.group();

      this.buildDungeon();
      this.createPlayer();
      this.spawnEncounters();
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
      for (let y = 0; y < MAP_H; y += 1) {
        for (let x = 0; x < MAP_W; x += 1) {
          const noise = this.hash(x, y, this.state.floor);
          const key = ASSETS.floor[noise % ASSETS.floor.length];
          const tile = this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(-20);
          if (noise % 17 === 0) tile.setTint(0x948184);
          else if (noise % 11 === 0) tile.setTint(0x7f7379);
          this.floorTiles.add(tile);
        }
      }

      for (let x = 0; x < MAP_W; x += 1) {
        this.addWall(x, 0, x === 0 ? "wall_top_left" : x === MAP_W - 1 ? "wall_top_right" : "wall_top_mid");
        this.addWall(x, MAP_H - 1, "wall_mid");
      }
      for (let y = 1; y < MAP_H - 1; y += 1) {
        this.addWall(0, y, "wall_left");
        this.addWall(MAP_W - 1, y, "wall_right");
      }

      for (let x = 6; x <= 25; x += 1) {
        if (x !== 15 && x !== 16) this.addWall(x, 10, "wall_mid");
      }
      for (let x = 4; x <= 28; x += 1) {
        if (x !== 20 && x !== 21) this.addWall(x, 22, "wall_mid");
      }
      for (let y = 11; y <= 21; y += 1) {
        if (y !== 16 && y !== 17) this.addWall(12, y, "wall_mid");
      }
      for (let y = 1; y < MAP_H - 1; y += 1) {
        if (y < 15 || y > 16) this.addWall(32, y, "wall_mid");
      }

      this.door = this.props.create(32 * TILE + 8, 16 * TILE, "doors_leaf_closed");
      this.door.setDepth(this.door.y + 8).refreshBody();
      this.door.body.setSize(14, 30).setOffset(9, 1);

      this.chest = this.props.create(26 * TILE + 8, 17 * TILE + 8, ASSETS.chest[0]);
      this.chest.setDepth(this.chest.y).refreshBody();
      this.chest.body.setSize(15, 11).setOffset(0, 5);

      const decorative = [
        [4, 1, "wall_banner_red"], [18, 1, "wall_banner_blue"], [38, 1, "wall_banner_red"],
        [8, 9, "column_wall"], [23, 9, "column_wall"], [34, 8, "column_wall"], [45, 8, "column_wall"],
        [6, 20, "crate"], [27, 20, "crate"], [4, 29, "skull"], [29, 27, "wall_hole_2"]
      ];
      decorative.forEach(([x, y, key]) => {
        const image = this.add.image(x * TILE + 8, y * TILE + 8, key).setDepth(y * TILE + 8);
        if (key === "crate") {
          const bodyProp = this.props.create(image.x, image.y, key).setDepth(image.depth);
          bodyProp.refreshBody();
          image.destroy();
        }
      });

      this.spikes = this.add.sprite(18 * TILE + 8, 18 * TILE + 8, "floor_spikes_anim_f0").setDepth(-2).play("spikes");
      this.stairs = null;
    }

    addWall(x, y, key) {
      const wall = this.walls.create(x * TILE + 8, y * TILE + 8, key);
      wall.setDepth(y * TILE + 8).refreshBody();
      wall.body.setSize(16, 16);
      return wall;
    }

    createPlayer() {
      this.player = this.physics.add.sprite(4 * TILE + 8, 4 * TILE + 8, ASSETS.playerIdle[0]);
      this.player.setOrigin(0.5, 1).setDepth(this.player.y).play("player-idle");
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(10, 9).setOffset(3, 18);
    }

    spawnEncounters() {
      const scale = 1 + (this.state.floor - 1) * 0.18;
      const positions = [
        [9, 5, "zombie"], [19, 5, "zombie"], [28, 7, "orc"],
        [7, 15, "zombie"], [18, 16, "orc"], [27, 19, "zombie"],
        [7, 27, "orc"], [24, 27, "zombie"]
      ];
      if (this.state.floor >= 2) positions.push([16, 26, "orc"], [27, 14, "orc"]);
      positions.forEach(([x, y, type]) => this.spawnEnemy(x, y, type, scale));
      this.boss = this.spawnEnemy(41, 16, "boss", scale);
      this.state.totalEnemies = this.enemies.countActive(true);
    }

    spawnEnemy(tileX, tileY, type, scale) {
      const definitions = {
        zombie: { texture: ASSETS.zombie[0], idle: "zombie-idle", run: "zombie-idle", hp: 2, speed: 31, damage: 1, reward: 2, radius: 150 },
        orc: { texture: ASSETS.orcIdle[0], idle: "orc-idle", run: "orc-run", hp: 4, speed: 39, damage: 1, reward: 4, radius: 185 },
        boss: { texture: ASSETS.bossIdle[0], idle: "boss-idle", run: "boss-run", hp: 16, speed: 34, damage: 2, reward: 20, radius: 390 }
      };
      const def = definitions[type];
      const enemy = this.enemies.create(tileX * TILE + 8, tileY * TILE + 8, def.texture);
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
        radius: def.radius,
        staggerUntil: 0
      });
      if (type === "boss") enemy.body.setSize(22, 20).setOffset(5, 15);
      else if (type === "orc") enemy.body.setSize(11, 11).setOffset(2, 11);
      else enemy.body.setSize(10, 9).setOffset(3, 7);
      enemy.setCollideWorldBounds(true);
      return enemy;
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
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cameras.main.setRoundPixels(true);
      this.cameras.main.setBackgroundColor(0x09080b);
      this.updateZoom();
      this.scale.on("resize", () => this.updateZoom());
    }

    updateZoom() {
      const width = this.scale.width || window.innerWidth;
      const height = this.scale.height || window.innerHeight;
      let zoom = 3;
      if (TOUCH_DEVICE) zoom = width < height ? 2.65 : 3.1;
      if (width > 1500) zoom = 3.6;
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

    update(time) {
      if (!this.running || this.ended) return;
      const movement = this.inputSystem.movement();
      const speed = 76;
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
      this.updateEnemies(time);
      this.updateInteraction();
      if (this.inputSystem.interactPressed()) this.performInteraction();
      this.updateSpikeTrap(time);
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

      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) return;
        const toEnemy = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - (this.player.y - 8));
        const distance = toEnemy.length();
        if (distance > (enemy.getData("type") === "boss" ? 39 : 32)) return;
        const facing = toEnemy.normalize().dot(direction);
        if (facing < -0.05) return;
        this.hitEnemy(enemy, 1, direction, time);
      });
    }

    hitEnemy(enemy, damage, direction, time) {
      const hp = enemy.getData("hp") - damage;
      enemy.setData("hp", hp);
      enemy.setData("staggerUntil", time + 130);
      enemy.setVelocity(direction.x * 95, direction.y * 95);
      enemy.setTintFill(0xffd2aa);
      this.time.delayedCall(90, () => enemy.active && enemy.clearTint());
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
      enemy.disableBody(true, true);
      this.state.kills += 1;
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
          return;
        }
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const type = enemy.getData("type");
        const canChase = distance < enemy.getData("radius") && (type !== "boss" || this.state.doorOpened);
        if (canChase && distance > 18) {
          const direction = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y).normalize();
          enemy.setVelocity(direction.x * enemy.getData("speed"), direction.y * enemy.getData("speed"));
          enemy.setFlipX(direction.x < 0);
          if (enemy.anims.currentAnim?.key !== enemy.getData("run")) enemy.play(enemy.getData("run"));
        } else {
          enemy.setVelocity(0, 0);
          if (enemy.anims.currentAnim?.key !== enemy.getData("idle")) enemy.play(enemy.getData("idle"));
        }
        enemy.setDepth(enemy.y);
      });
    }

    handleEnemyContact(player, enemy) {
      const now = this.time.now;
      if (now < this.hurtReadyAt || !enemy.active) return;
      this.hurtReadyAt = now + 850;
      const remaining = this.state.damage(enemy.getData("damage"));
      const knockback = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y).normalize();
      player.setVelocity(knockback.x * 170, knockback.y * 170);
      player.setTintFill(0xff5b52);
      this.time.delayedCall(110, () => player.clearTint());
      this.cameras.main.shake(150, 0.006);
      this.cameras.main.flash(100, 110, 15, 15, false);
      sound.blip(72, 0.15, "sawtooth", 0.04);
      this.updateHud();
      if (remaining <= 0) this.endRun(false);
    }

    updateSpikeTrap(time) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.spikes.x, this.spikes.y) > 11) return;
      if (this.spikes.anims.currentFrame?.index >= 3 && time >= this.hurtReadyAt) {
        this.hurtReadyAt = time + 850;
        this.state.damage(1);
        this.player.setTintFill(0xff5b52);
        this.time.delayedCall(100, () => this.player.clearTint());
        this.updateHud();
        if (this.state.hp <= 0) this.endRun(false);
      }
    }

    updateInteraction() {
      this.nearInteraction = null;
      let label = "";
      if (!this.state.chestOpened && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.chest.x, this.chest.y) < 38) {
        this.nearInteraction = "chest";
        label = "E · ATVER LĀDI";
      } else if (!this.state.doorOpened && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.door.x, this.door.y) < 48) {
        this.nearInteraction = "door";
        label = this.state.hasKey ? "E · ATSLĒGT DURVIS" : "NEPIECIEŠAMA ATSLĒGA";
      } else if (this.stairs && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.stairs.x, this.stairs.y) < 34) {
        this.nearInteraction = "stairs";
        label = "E · NĀKAMAIS STĀVS";
      }
      dom.prompt.textContent = label;
      dom.prompt.classList.toggle("is-hidden", !label);
    }

    performInteraction() {
      if (this.nearInteraction === "chest") this.openChest();
      else if (this.nearInteraction === "door" && this.state.hasKey) this.openDoor();
      else if (this.nearInteraction === "door") sound.blip(86, 0.12, "square", 0.03);
      else if (this.nearInteraction === "stairs") this.nextFloor();
    }

    openChest() {
      this.state.chestOpened = true;
      this.state.hasKey = true;
      this.chest.play("chest-open");
      this.state.addGold(5);
      this.state.heal(2);
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
      this.stairs = this.add.image(42 * TILE + 8, 16 * TILE + 8, "floor_stairs").setDepth(-1).setAlpha(0);
      this.tweens.add({ targets: this.stairs, alpha: 1, duration: 500 });
    }

    nextFloor() {
      const next = this.state.floor + 1;
      this.state.saveBestFloor();
      sound.blip(760, 0.2, "sine", 0.04);
      this.cameras.main.fadeOut(350, 8, 6, 10);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.restart({ autoStart: true, level: next, gold: this.state.gold, hp: Math.min(MAX_HP, this.state.hp + 2) });
      });
    }

    updateObjective() {
      if (this.state.bossDead) dom.objective.textContent = "Ieej kāpnēs uz nākamo stāvu";
      else if (this.state.doorOpened && this.boss?.active) dom.objective.textContent = `Pelnu Dēmons · HP ${this.boss.getData("hp")}/${this.boss.getData("maxHp")}`;
      else if (this.state.doorOpened) dom.objective.textContent = "Sakauj Pelnu Dēmonu";
      else if (this.state.hasKey) dom.objective.textContent = "Atver dēmona zāles durvis";
      else dom.objective.textContent = "Atrodi lādi ar atslēgu";
    }

    updateHud() {
      dom.hearts.innerHTML = "";
      for (let i = 0; i < MAX_HP / 2; i += 1) {
        const value = this.state.hp - i * 2;
        const key = value >= 2 ? "ui_heart_full" : value === 1 ? "ui_heart_half" : "ui_heart_empty";
        const image = document.createElement("img");
        image.src = asset(key);
        image.alt = "";
        dom.hearts.appendChild(image);
      }
      dom.gold.textContent = String(this.state.gold);
      dom.floor.textContent = String(this.state.floor);
      dom.xp.style.width = `${Math.min(100, (this.state.kills / Math.max(1, this.state.totalEnemies)) * 100)}%`;
      this.updateObjective();
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
    roundPixels: true,
    antialias: false,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false }
    },
    loader: { imageLoadType: "HTMLImageElement" },
    render: { pixelArt: true, antialias: false, powerPreference: "high-performance" },
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
    dom.hud.classList.remove("is-hidden");
    if (TOUCH_DEVICE) dom.mobile.classList.remove("is-hidden");
  }

  function restart(level = 1, keepGold = false) {
    const scene = currentScene();
    const gold = keepGold && scene?.state ? scene.state.gold : 0;
    dom.result.classList.remove("active");
    dom.pause.classList.remove("active");
    dom.prompt.classList.add("is-hidden");
    scene.scene.restart({ autoStart: true, level, gold, hp: MAX_HP });
    showGameplayUi();
    sound.unlock();
  }

  document.getElementById("start-button").addEventListener("click", () => currentScene().beginRun());
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
    currentScene()?.togglePause();
  });

  window.addEventListener("blur", () => {
    const scene = currentScene();
    if (scene?.running && !scene.ended && !scene.pausedByUser) scene.togglePause(true);
  });
})();
