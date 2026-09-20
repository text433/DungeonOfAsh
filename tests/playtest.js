const { chromium } = require("playwright");
const server = require("../server.js");

(async () => {
  const launchOptions = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto("http://127.0.0.1:8080", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.ready === true);
  await page.screenshot({ path: "screenshots/01-menu-desktop.png" });
  await page.click("#start-button");
  await page.waitForTimeout(250);

  const townReady = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    return scene.area === "town" && scene.player?.active
      && document.querySelector("#armor-rank")?.textContent.includes("bruņas")
      && scene.townExitMarkers?.length === 3;
  });
  if (!townReady) throw new Error("Town or armor HUD did not initialize");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(350);
  await page.keyboard.up("KeyD");
  await page.screenshot({ path: "screenshots/02-town-desktop.png" });

  await page.evaluate(() => window.__DUNGEON_DEBUG__.scene.enterDungeon());
  await page.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.area === "dungeon");
  await page.waitForTimeout(450);
  const dungeonReady = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    return scene.enemies.countActive(true) > 10
      && document.querySelector("#objective")?.textContent.includes("Sakauj monstrus")
      && document.querySelector("#boss-progress")?.textContent.includes("VAJAG 80%")
      && scene.roomDoors?.length > 0
      && !document.querySelector("#key-status")?.offsetParent;
  });
  if (!dungeonReady) throw new Error("Dungeon enemies or optional boss quest did not initialize");

  const roomDoorState = await page.evaluate(async () => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    const door = scene.roomDoors[0];
    const cell = door.cells[0];
    const inside = {
      x: cell.x + (door.side === "west" ? 1 : door.side === "east" ? -1 : 0),
      y: cell.y + (door.side === "north" ? 1 : door.side === "south" ? -1 : 0)
    };
    const outside = {
      x: cell.x + (door.side === "west" ? -1 : door.side === "east" ? 1 : 0),
      y: cell.y + (door.side === "north" ? -1 : door.side === "south" ? 1 : 0)
    };
    scene.player.setPosition(outside.x * 16 + 8, outside.y * 16 + 8);
    scene.updateFogOfWar(true);
    const hiddenBefore = !scene.currentVisibleCells.has(`${inside.x},${inside.y}`);
    const bodyBefore = door.sprite.body.enable;
    const finished = new Promise((resolve) => door.sprite.once("animationcomplete", resolve));
    scene.openRoomDoor(door);
    await finished;
    scene.updateFogOfWar(true);
    return {
      count: scene.roomDoors.length,
      hiddenBefore,
      bodyBefore,
      opened: door.opened,
      bodyAfter: door.sprite.body.enable,
      visibleAfter: scene.currentVisibleCells.has(`${inside.x},${inside.y}`),
      textureAfter: door.sprite.texture.key
    };
  });
  if (!roomDoorState.count || !roomDoorState.hiddenBefore || !roomDoorState.bodyBefore ||
      !roomDoorState.opened || roomDoorState.bodyAfter || !roomDoorState.visibleAfter ||
      roomDoorState.textureAfter !== "ash_door_f7") {
    throw new Error(`Room door or hidden room test failed: ${JSON.stringify(roomDoorState)}`);
  }

  const bossStatus = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.state.monsterKills = scene.state.requiredKills;
    scene.state.bossUnlocked = true;
    scene.updateHud();
    return {
      objective: document.querySelector("#objective")?.textContent,
      progress: document.querySelector("#boss-progress")?.textContent
    };
  });
  if (!bossStatus.objective?.includes("ATVĒRT BOSA DURVIS") ||
      !bossStatus.progress?.includes("BOSA DURVIS ATVĒRTAS")) {
    throw new Error(`Boss unlock status failed: ${JSON.stringify(bossStatus)}`);
  }

  const dormantMimic = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    return {
      active: scene.mimic?.active,
      type: scene.mimic?.getData("type"),
      dormant: scene.mimic?.getData("dormant"),
      bodyMoves: scene.mimic?.body?.moves,
      texture: scene.mimic?.texture?.key,
      healthBar: Boolean(scene.mimic?.healthBar)
    };
  });
  if (!dormantMimic.active || dormantMimic.type !== "mimic" || !dormantMimic.dormant || dormantMimic.bodyMoves ||
      dormantMimic.texture !== "chest_mimic_open_anim_f0" || dormantMimic.healthBar) {
    throw new Error(`Mimic did not begin disguised as a chest: ${JSON.stringify(dormantMimic)}`);
  }

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.player.setPosition(scene.mimic.x - 50, scene.mimic.y);
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: "screenshots/03-mimic-awaken-desktop.png" });
  await page.waitForTimeout(300);
  const awakeMimic = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    return {
      dormant: scene.mimic.getData("dormant"),
      animation: scene.mimic.anims.currentAnim?.key,
      healthBar: Boolean(scene.mimic.healthBar)
    };
  });
  if (awakeMimic.dormant || !awakeMimic.healthBar || !["mimic-awaken", "mimic-run"].includes(awakeMimic.animation)) {
    throw new Error(`Mimic did not wake and attack: ${JSON.stringify(awakeMimic)}`);
  }

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    const chest = scene.chests[0];
    const originalRandom = Math.random;
    Math.random = () => 0;
    scene.openChest(chest);
    Math.random = originalRandom;
    scene.player.setPosition(chest.x - 48, chest.y + 20);
  });
  await page.waitForTimeout(330);
  await page.screenshot({ path: "screenshots/04-chest-loot-desktop.png" });

  const dropState = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    const chest = scene.chests[0];
    return {
      types: scene.drops.getChildren().filter((drop) => drop.active).map((drop) => drop.getData("type")),
      keyBeforePickup: scene.state.hasKey,
      minScatter: Math.min(...scene.drops.getChildren().filter((drop) => drop.active).map((drop) => (
        Phaser.Math.Distance.Between(chest.x, chest.y - 7, drop.x, drop.y)
      )))
    };
  });
  for (const type of ["coin", "potion", "key", "armor"]) {
    if (!dropState.types.includes(type)) throw new Error(`Chest did not visibly drop ${type}`);
  }
  if (dropState.keyBeforePickup) throw new Error("Key was granted before its world drop was collected");
  if (dropState.minScatter < 20) throw new Error(`Chest loot remained inside the chest: ${dropState.minScatter}`);

  await page.waitForTimeout(180);
  const pickupState = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    const chest = scene.chests[0];
    const activeDrops = scene.drops.getChildren().filter((candidate) => candidate.active);
    const maxScatter = Math.max(...activeDrops.map((drop) => (
      Phaser.Math.Distance.Between(chest.x, chest.y - 7, drop.x, drop.y)
    )));
    scene.player.setPosition(chest.x, chest.y - 7);
    scene.updateDropPickup();
    return {
      hasKey: scene.state.hasKey,
      armorId: scene.state.armorId,
      armorText: document.querySelector("#armor-rank")?.textContent,
      keyVisible: Boolean(document.querySelector("#key-status")?.offsetParent),
      pickupDistance: 0,
      maxScatter,
      activeDrops: scene.drops.getChildren().filter((candidate) => candidate.active).length
    };
  });
  if (!pickupState.hasKey || pickupState.armorId !== "ash" || !pickupState.keyVisible ||
      !pickupState.armorText?.includes("Pelnu bruņas") || pickupState.maxScatter < 28 || pickupState.activeDrops !== 0) {
    throw new Error(`Loot pickup failed: ${JSON.stringify(pickupState)}`);
  }

  const wallFogState = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.updateFogOfWar(true);
    const visibleWallKey = Array.from(scene.currentVisibleCells).find((key) => scene.wallCells.has(key));
    if (!visibleWallKey) return { found: false };
    const [x, y] = visibleWallKey.split(",").map(Number);
    return {
      found: true,
      above: y <= 0 || scene.currentVisibleCells.has(`${x},${y - 1}`),
      below: y >= 47 || scene.currentVisibleCells.has(`${x},${y + 1}`)
    };
  });
  if (!wallFogState.found || !wallFogState.above || !wallFogState.below) {
    throw new Error(`Fog still cuts a tall wall into a floating brick row: ${JSON.stringify(wallFogState)}`);
  }

  await page.click("#minimap-zoom");
  if (!(await page.locator("#minimap-panel").evaluate((node) => node.classList.contains("is-zoomed")))) {
    throw new Error("Minimap zoom did not activate");
  }
  await page.click("#minimap-close");
  if (await page.locator("#minimap-panel").isVisible()) throw new Error("Minimap did not close");
  await page.click("#minimap-reopen");
  if (!(await page.locator("#minimap-panel").isVisible())) throw new Error("Minimap did not reopen");
  await page.screenshot({ path: "screenshots/05-dungeon-hud-desktop.png" });

  const mobileContext = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobilePage.goto("http://127.0.0.1:8080", { waitUntil: "networkidle" });
  await mobilePage.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.ready === true);
  if (await mobilePage.locator("#start-screen").isVisible()) await mobilePage.tap("#start-button");
  await mobilePage.evaluate(() => window.__DUNGEON_DEBUG__.scene.enterDungeon());
  await mobilePage.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.area === "dungeon");
  await mobilePage.waitForTimeout(450);
  if (!(await mobilePage.locator("#joystick-base").isVisible())) throw new Error("Mobile joystick is not visible");
  await mobilePage.screenshot({ path: "screenshots/06-dungeon-mobile-landscape.png" });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Browser playtest passed: mimic ambush, scattered chest loot, radius pickup, complete fog-edge walls, minimap controls and mobile HUD.");
  await context.close();
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
