import { test, expect } from '@playwright/test';

// Gate Fase 4 (P3.1): los chips escriben en el input sin ejecutar, y se
// marcan ✔ cuando el comando (normalizado compact) aparece en el historial.
test.describe('Chips de comandos', () => {
  test('tocar un chip escribe el comando en el input, no lo ejecuta', async ({ page }) => {
    await page.goto('/');
    // Nivel 1 es Principiante -> chips con comando completo.
    await page.locator('.work-chip').nth(1).click(); // chip 02 = SS1Y1
    await expect(page.locator('.cmd-input')).toHaveValue('SS1Y1');
    // No se agregó ninguna línea de comando al scroll del terminal.
    await expect(page.locator('.command-line-log')).toHaveCount(0);
  });

  test('un comando equivalente con espacios marca el chip ✔ (compact)', async ({ page }) => {
    await page.goto('/');
    await page.fill('.cmd-input', 'SN 12 APR MEX SDQ');
    await page.press('.cmd-input', 'Enter');
    // El chip 01 (SN 12 APR MEX SDQ) queda done.
    await expect(page.locator('.work-chip').first()).toHaveClass(/done/);
  });
});
