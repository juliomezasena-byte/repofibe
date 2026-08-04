import { test, expect } from '@playwright/test';

test('el agente completa una llamada de práctica y ve el feedback', async ({ page }) => {
  await page.route('**/roleplay/turn', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ passengerReply: 'Buenos días, quisiera saber el estado de mi vuelo.' })
    })
  );

  await page.route('**/roleplay/evaluate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        score: 88,
        strengths: ['Saludo correcto'],
        improvements: ['Podría confirmar más datos del pasajero']
      })
    })
  );

  await page.goto('/roleplay');
  await page.getByRole('button', { name: /iniciar llamada/i }).click();

  const textInput = page.getByPlaceholder('Escribe tu respuesta al pasajero');
  await textInput.fill('Iberia, buenos días, ¿en qué puedo ayudarle?');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();

  await expect(page.getByText('Buenos días, quisiera saber el estado de mi vuelo.')).toBeVisible();

  await page.getByRole('button', { name: /finalizar llamada/i }).click();

  await expect(page.getByText('Atención al cliente: 88%')).toBeVisible();
  await expect(page.getByText('Saludo correcto')).toBeVisible();
});
