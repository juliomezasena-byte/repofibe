import { test, expect } from '@playwright/test';

test.describe('Tutor conversacional', () => {
  test('reiniciar la conversación no lanza una excepción', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/tutor/paso', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          procedimientoId: 'cambio-voluntario-automatico',
          titulo: 'Cambio voluntario automático',
          decision: { intencionActiva: 'cambio', camino: [] },
          paso: { n: 1, sistema: 'amadeus', proceso: 'Buscar disponibilidad', comando: 'AN 11MAR MADBOG', confianza: 'verbatim' },
          terminado: false,
          avisos: [],
          datosCaso: {}
        })
      });
    });

    await page.goto('/tutor/libre');
    await page.getByRole('textbox', { name: 'Escríbele al tutor' }).fill('Quiero cambiar un vuelo');
    await page.getByRole('button', { name: 'Enviar mensaje al tutor' }).click();
    await expect(page.getByRole('button', { name: 'Empezar de nuevo' })).toBeVisible();

    await page.getByRole('button', { name: 'Empezar de nuevo' }).click();
    await expect(page.getByRole('button', { name: 'Empezar de nuevo' })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('conserva los datos extraídos entre turnos', async ({ page }) => {
    const requests = [];
    await page.route('**/tutor/paso', async (route) => {
      requests.push(JSON.parse(route.request().postData() || '{}'));
      const body = requests.length === 1
        ? {
            decision: { intencionActiva: 'emision', siguientePregunta: { id: 'fecha', texto: '¿Qué fecha necesita?' } },
            datosCaso: { origen: 'BOG', destino: 'MAD' },
            pasajerosCaso: null,
            explicacion: 'Entiendo la ruta.'
          }
        : {
            decision: { intencionActiva: 'emision', siguientePregunta: { id: 'clase', texto: '¿Qué clase necesita?' } },
            datosCaso: { origen: 'BOG', destino: 'MAD', fecha: '13MAR' },
            pasajerosCaso: null,
            explicacion: 'La ruta sigue guardada.'
          };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto('/tutor/libre');
    const input = page.getByRole('textbox', { name: 'Escríbele al tutor' });
    await input.fill('Quiero viajar de Bogotá a Madrid');
    await page.getByRole('button', { name: 'Enviar mensaje al tutor' }).click();
    await expect(page.getByText('¿Qué fecha necesita?')).toBeVisible();

    await input.fill('El 13 de marzo');
    await page.getByRole('button', { name: 'Enviar mensaje al tutor' }).click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].caso.datos).toMatchObject({ origen: 'BOG', destino: 'MAD' });
  });

  test('tipifica con tres datos confirmados sin enviar PII ni llamar al servidor', async ({ page }) => {
    let requests = 0;
    await page.route('**/tutor/paso', async (route) => {
      requests += 1;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'no_debe_llamarse' }) });
    });

    await page.goto('/tutor/libre');
    await page.getByRole('button', { name: 'Tipificar caso' }).click();
    await expect(page.getByText(/¿Cuál fue el motivo del contacto?/i)).toBeVisible();

    const input = page.getByRole('textbox', { name: 'Escríbele al tutor' });
    const enviar = page.getByRole('button', { name: 'Enviar mensaje al tutor' });

    await input.fill('Nombre: Ana Pérez; PNR: ABC123; solicitó cambiar la fecha del vuelo.');
    await enviar.click();
    await expect(page.getByText(/¿Qué gestión realizaste?/i)).toBeVisible();

    await input.fill('Se revisaron las condiciones y se ofreció una nueva fecha.');
    await enviar.click();
    await expect(page.getByText(/¿Cuál fue el resultado final?/i)).toBeVisible();

    await input.fill('La alternativa quedó pendiente de pago.');
    await enviar.click();

    const salida = page.locator('.tut-burbuja-coach').last();
    await expect(salida).toContainText('TIPIFICACIÓN DEL CASO');
    await expect(salida).toContainText('La alternativa quedó pendiente de pago.');
    await expect(salida).not.toContainText('Ana Pérez');
    await expect(salida).not.toContainText('ABC123');
    expect(requests).toBe(0);
  });
});
