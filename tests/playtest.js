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
    return scene.area === "town" && scene.player?.active && document.querySelector("#armor-rank")?.textContent.includes("bruņas");
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
      && document.querySelector("#objective")?.textContent.includes("Sakauj stāva bosu")
      && !document.querySelector("#key-status")?.offsetParent;
  });
  if (!dungeonReady) throw new Error("Dungeon enemies or optional boss quest did not initialize");

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    const chest = scene.chests[0];
    const originalRandom = Math.random;
    Math.random = () => 0;
    scene.openChest(chest);
    Math.random = originalRandom;
    scene.player.setPosition(chest.x - 22, chest.y + 14);
  });
  await page.waitForTimeout(330);
  await page.screenshot({ path: "screenshots/03-chest-loot-desktop.png" });

  const dropState = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    return {
      types: scene.drops.getChildren().filter((drop) => drop.active).map((drop) => drop.getData("type")),
      keyBeforePickup: scene.state.hasKey
    };
  });
  for (const type of ["coin", "potion", "key", "armor"]) {
    if (!dropState.types.includes(type)) throw new Error(`Chest did not visibly drop ${type}`);
  }
  if (dropState.keyBeforePickup) throw new Error("Key was granted before its world drop was collected");

  await page.waitForTimeout(180);
  const pickupState = await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.drops.getChildren().filter((drop) => drop.active).forEach((drop) => scene.collectDrop(scene.player, drop));
    return {
      hasKey: scene.state.hasKey,
      armorId: scene.state.armorId,
      armorText: document.querySelector("#armor-rank")?.textContent,
      keyVisible: Boolean(document.querySelector("#key-status")?.offsetParent)
    };
  });
  if (!pickupState.hasKey || pickupState.armorId !== "scout" || !pickupState.keyVisible) {
    throw new Error(`Loot pickup failed: ${JSON.stringify(pickupState)}`);
  }

  await page.click("#minimap-zoom");
  if (!(await page.locator("#minimap-panel").evaluate((node) => node.classList.contains("is-zoomed")))) {
    throw new Error("Minimap zoom did not activate");
  }
  await page.click("#minimap-close");
  if (await page.locator("#minimap-panel").isVisible()) throw new Error("Minimap did not close");
  await page.click("#minimap-reopen");
  if (!(await page.locator("#minimap-panel").isVisible())) throw new Error("Minimap did not reopen");
  await page.screenshot({ path: "screenshots/04-dungeon-hud-desktop.png" });

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
  await mobilePage.screenshot({ path: "screenshots/05-dungeon-mobile-landscape.png" });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Browser playtest passed: armor, physical chest loot, key pickup, optional quest, wall minimap controls and mobile HUD.");
  await context.close();
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
