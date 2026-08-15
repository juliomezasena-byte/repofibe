import { test, expect } from '@playwright/test';

test.describe('Centro de práctica y rutas profundas', () => {
  test('presenta una ruta única para elegir modalidad', async ({ page }) => {
    await page.goto('/practicar');
    await expect(page.getByRole('heading', { name: '¿Qué quieres practicar hoy?' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ruta guiada/ })).toHaveAttribute('href', '/ejercicios');
    await expect(page.getByRole('link', { name: /Procedimiento del manual/ })).toHaveAttribute('href', '/manuales');
    await expect(page.getByRole('link', { name: /Terminal libre/ })).toHaveAttribute('href', '/simulador/libre');
    await expect(page.getByRole('link', { name: /Tutor de casos/ })).toHaveAttribute('href', '/tutor/libre');
  });

  test('el catálogo de manuales abre un procedimiento profundo', async ({ page }) => {
    await page.goto('/manuales');
    await expect(page.getByRole('heading', { name: 'Elige un procedimiento para practicar' })).toBeVisible();
    await expect(page.locator('.manual-exercise-card')).not.toHaveCount(0);
    await page.locator('.manual-exercise-card').first().click();
    await expect(page).toHaveURL(/\/manuales\/proc-/);
    await expect(page.getByText(/ESTACIÓN MANUAL ACTIVA|Práctica de casos/)).toBeVisible();
  });

  test('un ejercicio profundo carga el escenario elegido', async ({ page }) => {
    await page.goto('/ejercicios/scenario-2');
    await expect(page.getByRole('heading', { name: /Reserva Doble Pasajeros Adultos/ })).toBeVisible();
    await expect(page.getByText('RUTA GUIADA')).toBeVisible();
  });

  test('la terminal libre no muestra el bloqueo de decisión', async ({ page }) => {
    await page.goto('/simulador/libre');
    await expect(page.locator('.cmd-input')).toBeEnabled();
    await expect(page.getByText('PIENSA ANTES DE ESCRIBIR')).not.toBeVisible();
  });

  test('Tutor libre y guiado declaran modos diferentes', async ({ page }) => {
    await page.goto('/tutor/libre');
    await expect(page.locator('[data-tutor-mode="free"]')).toBeVisible();
    await expect(page.getByText('TUTOR LIBRE')).toBeVisible();
    await page.goto('/tutor/guiado');
    await expect(page.locator('[data-tutor-mode="guided"]')).toBeVisible();
    await expect(page.getByText('TUTOR GUIADO')).toBeVisible();
  });

  test('una ruta desconocida ofrece recuperacion', async ({ page }) => {
    await page.goto('/ejercicios/no-existe');
    await expect(page.getByRole('heading', { name: /no existe/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Volver al cat/i })).toHaveAttribute('href', '/ejercicios');
  });
});
