const { chromium } = require("playwright");
const server = require("../server.js");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto("http://127.0.0.1:8080", { waitUntil: "networkidle" });
  try {
    await page.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.ready === true, null, { timeout: 10000 });
  } catch (error) {
    throw new Error(`${error.message}\n${errors.join("\n")}`);
  }
  await page.screenshot({ path: "screenshots/01-menu-desktop.png" });
  await page.click("#start-button");
  await page.waitForTimeout(500);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(500);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Space");
  await page.waitForTimeout(350);
  await page.screenshot({ path: "screenshots/02-game-desktop.png" });

  const moved = await page.evaluate(() => window.__DUNGEON_DEBUG__.scene.player.x > 75);
  if (!moved) throw new Error("Player did not move with keyboard input");

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.player.setPosition(scene.chest.x - 20, scene.chest.y);
    scene.updateInteraction();
  });
  await page.evaluate(() => window.__DUNGEON_DEBUG__.scene.performInteraction());
  await page.waitForTimeout(250);
  const chestOpened = await page.evaluate(() => window.__DUNGEON_DEBUG__.state.chestOpened);
  if (!chestOpened) throw new Error("Chest interaction did not set chestOpened");

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.player.setPosition(scene.door.x - 24, scene.door.y);
    scene.updateInteraction();
  });
  await page.evaluate(() => window.__DUNGEON_DEBUG__.scene.performInteraction());
  await page.waitForTimeout(250);
  const doorOpened = await page.evaluate(() => window.__DUNGEON_DEBUG__.state.doorOpened);
  if (!doorOpened) throw new Error("Door interaction did not set doorOpened");

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.hitEnemy(scene.boss, 999, new Phaser.Math.Vector2(1, 0), scene.time.now);
  });
  const bossResult = await page.evaluate(() => ({
    dead: window.__DUNGEON_DEBUG__.state.bossDead,
    stairs: Boolean(window.__DUNGEON_DEBUG__.scene.stairs)
  }));
  if (!bossResult.dead || !bossResult.stairs) throw new Error("Boss defeat did not reveal stairs");

  await page.evaluate(() => {
    const scene = window.__DUNGEON_DEBUG__.scene;
    scene.nearInteraction = "stairs";
    scene.performInteraction();
  });
  await page.waitForTimeout(700);
  const nextFloor = await page.evaluate(() => window.__DUNGEON_DEBUG__.state.floor);
  if (nextFloor !== 2) throw new Error("Stairs did not start floor 2");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "screenshots/03-game-resized.png" });

  const mobileContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  await mobilePage.goto("http://127.0.0.1:8080", { waitUntil: "networkidle" });
  await mobilePage.waitForFunction(() => window.__DUNGEON_DEBUG__?.scene?.ready === true);
  await mobilePage.tap("#start-button");
  await mobilePage.waitForTimeout(350);
  const touchControlsVisible = await mobilePage.locator("#mobile-controls").isVisible();
  if (!touchControlsVisible) throw new Error("Touch controls are not visible on a touch device");
  await mobilePage.screenshot({ path: "screenshots/04-game-mobile-landscape.png" });
  await mobileContext.close();

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("Browser playtest passed: boot, movement, combat, chest, door, boss, floor 2, resize, touch HUD.");
  await browser.close();
  server.close();
})().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
