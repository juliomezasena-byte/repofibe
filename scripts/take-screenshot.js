import { chromium } from 'playwright';
import path from 'path';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);
  const screenshotPath = path.resolve('.fabrica/restored_ui.png');
  await page.screenshot({ path: screenshotPath });
  console.log('RESTORED_SCREENSHOT_SUCCESS:', screenshotPath);
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
