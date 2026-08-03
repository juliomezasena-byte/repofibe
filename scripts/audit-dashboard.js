import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_EMAIL = process.env.AUDIT_EMAIL;
const AUDIT_PASSWORD = process.env.AUDIT_PASSWORD;
const AUDIT_URL = process.env.AUDIT_URL || 'https://simulador-3362613.web.app/';
if (!AUDIT_EMAIL || !AUDIT_PASSWORD) {
  console.error("Faltan AUDIT_EMAIL y/o AUDIT_PASSWORD en el entorno. Ejemplo: AUDIT_EMAIL=... AUDIT_PASSWORD=... node scripts/audit-dashboard.js");
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("Navigating to production...");
  await page.goto(AUDIT_URL);

  console.log("Logging in...");
  await page.fill('input[type="email"]', AUDIT_EMAIL);
  await page.fill('input[type="password"]', AUDIT_PASSWORD);
  await page.click('button:has-text("Iniciar Sesión")');
  
  console.log("Waiting for dashboard...");
  await page.waitForTimeout(5000); // wait for firebase auth and data load
  
  console.log("Taking screenshot...");
  const screenshotPath = path.resolve(__dirname, '..', '.fabrica', 'design-review-simulador.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`Saved screenshot to ${screenshotPath}`);
  await browser.close();
})().catch(console.error);
