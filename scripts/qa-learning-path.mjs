import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (message) => console.log(`CONSOLE ${message.type()}: ${message.text()}`));
page.on('pageerror', (error) => console.log(`PAGEERROR: ${error.message}`));
await page.goto('http://127.0.0.1:4174/simulador', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
console.log(`BODY: ${(await page.locator('body').innerText()).slice(0, 400)}`);
await page.waitForSelector('.learning-path', { timeout: 15000 });
console.log(JSON.stringify({
  path: await page.locator('.learning-path').isVisible(),
  mission: await page.getByText('Misión de hoy').isVisible(),
  nodes: await page.locator('.learning-node').count(),
  count: await page.locator('.learning-path-count').textContent(),
  selectVisible: await page.locator('.scenario-select').isVisible()
}));
await page.locator('.learning-node').nth(1).click();
console.log(JSON.stringify({
  selected: await page.locator('.scenario-select').inputValue(),
  current: await page.locator('.learning-node.current').count()
}));
await page.screenshot({ path: 'C:/tmp/cryptic-learning-path-mobile.png', fullPage: true });
await browser.close();
