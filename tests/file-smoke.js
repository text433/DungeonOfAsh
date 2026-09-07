const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const messages = [];
  page.on("console", (message) => messages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  await page.goto(`file://${path.resolve(__dirname, "..", "index.html")}`);
  await page.waitForTimeout(5000);
  const ready = await page.evaluate(() => Boolean(window.__DUNGEON_DEBUG__?.scene?.ready));
  console.log(JSON.stringify({ ready, messages }, null, 2));
  await browser.close();
  process.exit(ready ? 0 : 1);
})();
