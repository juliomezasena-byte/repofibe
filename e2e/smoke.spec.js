// Smoke E2E — Fase 1.5 de docs/PLAN_UX.md.
// Verifica que la app arranca, que el terminal responde un comando real
// del manual (SN) y que la pestaña Teoria muestra el quiz.
import { test, expect } from '@playwright/test';

// El bypass de auth para E2E ya no vive en localStorage — se activa por
// VITE_E2E_MOCK_AUTH en tiempo de build (ver playwright.config.js), así
// que no hace falta inyectar nada aquí.
test.describe('smoke', () => {
  test('el terminal responde SN 12 APR MEX SDQ con SCHEDULE NEUTRAL', async ({ page }) => {
    await page.goto('/simulador');

    // La app cargo: el header del emulador muestra AMADEUS.
    await expect(page.getByText('AMADEUS 1A GDS')).toBeVisible();

    const input = page.locator('.cmd-input');
    await input.fill('SN 12 APR MEX SDQ');
    await input.press('Enter');

    await expect(page.getByText('SCHEDULE NEUTRAL')).toBeVisible();
  });

  test('la pestania Teoria muestra el QUIZ RAPIDO', async ({ page }) => {
    await page.goto('/simulador');

    await page.getByText('Teoría').click();

    await expect(page.getByText('QUIZ RÁPIDO')).toBeVisible();
  });
});
