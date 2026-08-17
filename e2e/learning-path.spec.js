import { test, expect } from '@playwright/test';

test.describe('Ruta guiada de aprendizaje', () => {
  test('la pantalla inicial abre una guía de lecciones, no un mapa técnico', async ({ page }) => {
    await page.goto('/');

    // El menú se rediseñó: la tarjeta es 'Ruta PNR (Lecciones)' con etiqueta
    // 'Simulador PNR' (antes 'Guiado', que se confundía con el Tutor IA).
    await page.getByRole('link', { name: /Ruta PNR/ }).click();
    await expect(page).toHaveURL(/\/ejercicios$/);
    await expect(page.getByText('GUÍA DE APRENDIZAJE')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aprende Amadeus practicando' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Comenzar lección/ })).toBeVisible();
    await expect(page.locator('.lesson-list-item')).toHaveCount(24);
  });

  test('la guía abre la práctica real del escenario seleccionado', async ({ page }) => {
    await page.goto('/guia');

    await page.getByRole('button', { name: /Comenzar lección/ }).click();
    await expect(page).toHaveURL(/\/simulador$/);
    await expect(page.getByText('RUTA GUIADA')).toBeVisible();
  });

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
