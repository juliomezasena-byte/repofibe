import { test, expect } from '@playwright/test';

async function waitForScenario(page) {
  await page.goto('/simulador');
  await expect(page.getByRole('heading', { name: /Consulta de Vuelos SN 12 APR MEX SDQ/ })).toBeVisible();
  await expect(page.locator('.decision-card')).toBeVisible();
}

test('la practica obliga a interpretar la salida antes de continuar', async ({ page }) => {
  await waitForScenario(page);

  await page.locator('.decision-card .decision-option').first().click();
  await expect(page.locator('.decision-feedback.ok')).toBeVisible();

  await page.fill('.cmd-input', 'SN 12 APR MEX SDQ');
  await page.locator('.cmd-input').press('Enter');

  await expect(page.locator('.interpretation-card')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Qué acabas de obtener/i })).toBeVisible();
  await page.getByRole('button', { name: /disponibilidad de vuelos/i }).last().click();
  await expect(page.locator('.interpretation-feedback.ok')).toBeVisible();
  await page.getByRole('button', { name: /continuar con el caso/i }).click();
  await expect(page.locator('.interpretation-card')).toHaveCount(0);
});

test('el modo guiado bloquea la terminal y oculta la solucion hasta la decision', async ({ page }) => {
  await waitForScenario(page);

  const input = page.locator('.cmd-input');
  await expect(input).toBeDisabled();
  await expect(page.getByRole('button', { name: '01 SN 12 APR MEX SDQ' })).toHaveCount(0);
  await expect(page.getByText(/responde.*caso/i)).toBeVisible();

  await page.locator('.decision-card .decision-option').first().click();
  await expect(input).toBeEnabled();
  await expect(page.getByRole('button', { name: '01 SN 12 APR MEX SDQ' })).toBeVisible();

  await input.fill('SN 12 APR MEX SDQ\nSS1Y1');
  await input.press('Enter');
  await expect(page.locator('.interpretation-card')).toBeVisible();
  await expect(input).toHaveValue('SS1Y1');
});
