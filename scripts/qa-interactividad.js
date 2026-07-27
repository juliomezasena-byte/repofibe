import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navegando al simulador...');
  await page.goto('http://localhost:5173');

  // Esperar a que cargue el Dashboard
  await page.waitForSelector('.app-header');
  console.log('App (Dashboard) cargada.');

  // Flujo 1: Probar botón de volumen y persistencia
  console.log('Probando botón de Volumen (Opt-in)...');
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('debug-ui.html', html);
  
  const volBtn = page.locator('button[title="Activar Sonido"], button[title="Silenciar"]').first();
  await volBtn.waitFor({ state: 'visible', timeout: 5000 });
  
  let isMuted = await page.evaluate(() => JSON.parse(window.localStorage.getItem('amadeus_sfx_muted')));
  console.log(`Estado inicial de mute en localStorage: ${isMuted}`);
  if (isMuted !== true && isMuted !== null) throw new Error("Debe empezar muteado por defecto (true o null).");

  await volBtn.click();
  await page.waitForTimeout(100);
  isMuted = await page.evaluate(() => JSON.parse(window.localStorage.getItem('amadeus_sfx_muted')));
  console.log(`Estado tras hacer clic: ${isMuted}`);
  if (isMuted !== false) throw new Error("No se desmuteó al hacer clic.");
  console.log('Flujo 1 OK.');

  // Flujo 2: Probar Shake de Error
  console.log('Probando Terminal Shake...');
  await page.fill('.cmd-input', 'INVALIDCOMMAND');
  await page.keyboard.press('Enter');
  
  // Esperamos que el div interno reciba la clase
  const innerTerminal = page.locator('.terminal-inner.terminal-shake');
  await innerTerminal.waitFor({ state: 'attached', timeout: 2000 });
  console.log('Clase terminal-shake detectada correctamente.');
  console.log('Flujo 2 OK.');

  // Flujo 3: Probar Confeti de primera vez
  console.log('Probando recompensa (Confeti lazy load)...');
  // Usamos el chip-btn para autocompletar la mision
  const chips = await page.locator('.work-chip.pending').all();
  for (let chip of chips) {
    await chip.click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
  }

  // Esperar a que se escriba en localStorage
  await page.waitForFunction(() => {
    const val = JSON.parse(window.localStorage.getItem('amadeus_confetti_shown') || '{}');
    return Object.keys(val).length > 0;
  }, { timeout: 3000 });
  console.log('Confeti localStorage guardado exitosamente.');
  console.log('Flujo 3 OK.');

  await browser.close();
  console.log('QA COMPLETO: Todos los flujos interactivos pasaron. Cero regresiones.');
})().catch(err => {
  console.error('QA FALLÓ:', err);
  process.exit(1);
});
