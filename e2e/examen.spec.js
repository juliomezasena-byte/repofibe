import { test, expect } from '@playwright/test';

// Gate de la Fase 2 (P1 PLAN_UX): el Modo Examen quita todas las ayudas,
// oculta la fila de comandos del keypad y solo entrega resultado al ENTREGAR.
// El bypass de auth para E2E ya no vive en localStorage — se activa por
// VITE_E2E_MOCK_AUTH en tiempo de build (ver playwright.config.js), así
// que no hace falta inyectar nada aquí.
test.describe('Modo Examen', () => {
  test('EXAMEN oculta las ayudas y el keypad de verbos', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Examen' }).click();

    // La fila de comandos del keypad no existe en el DOM.
    await expect(page.locator('.keypad-verbs')).toHaveCount(0);
    // Los símbolos/ENVIAR sí siguen (método de entrada).
    await expect(page.locator('.keypad-actions')).toBeVisible();
    // No se muestran los comandos sugeridos.
    await expect(page.getByText('COMANDOS SUGERIDOS')).toHaveCount(0);
    // El cronómetro es visible.
    await expect(page.locator('.exam-timer')).toBeVisible();
  });

  test('el porcentaje NO se actualiza en vivo durante el examen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Examen' }).click();
    // Ejecutar un comando válido del escenario 1.
    await page.fill('.cmd-input', 'SN 12 APR MEX SDQ');
    await page.press('.cmd-input', 'Enter');
    // No debe aparecer la tarjeta de progreso con porcentaje en vivo.
    await expect(page.getByText('Progreso del Objetivo')).toHaveCount(0);
  });

  test('ENTREGAR muestra score, tiempo y checklist', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Examen' }).click();
    await page.getByRole('button', { name: 'ENTREGAR' }).click();
    await expect(page.getByText('Resultado del Examen')).toBeVisible();
    await expect(page.getByText(/Tiempo:/)).toBeVisible();
    // El checklist completo aparece (al menos un ítem pendiente sin ejecutar nada).
    await expect(page.locator('.checklist-item').first()).toBeVisible();
  });
});
