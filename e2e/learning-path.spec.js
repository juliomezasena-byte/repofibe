import { test, expect } from '@playwright/test';

test.describe('Ruta guiada de aprendizaje', () => {
  test('muestra la misión diaria y los 24 nodos sin ocultar el selector libre', async ({ page }) => {
    await page.goto('/simulador');

    await expect(page.getByText('RUTA GUIADA')).toBeVisible();
    await expect(page.getByText('Misión de hoy')).toBeVisible();
    await expect(page.locator('.learning-path-count')).toHaveText('0/24');
    await expect(page.locator('.learning-node')).toHaveCount(24);
    await expect(page.locator('.scenario-select')).toBeVisible();
  });

  test('la ruta selecciona un escenario sin imponer bloqueo', async ({ page }) => {
    await page.goto('/simulador');

    await page.locator('.learning-node').nth(1).click();
    await expect(page.locator('.scenario-select')).toHaveValue('scenario-2');
    await expect(page.locator('.learning-node.current')).toHaveCount(1);
  });
});
