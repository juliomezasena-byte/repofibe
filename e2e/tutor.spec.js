import { test, expect } from '@playwright/test';

/**
 * El bucle completo del tutor, con el worker mockeado.
 *
 * Lo que se comprueba no es solo que "funcione": es que el alumno VEA
 * en qué sistema está, de dónde sale el comando, y que un paso sin
 * documentar NO le dé un comando inventado.
 */

/** Respuestas del worker, en el orden en que las va pidiendo el panel. */
function mockearTutor(page, respuestas) {
  let i = 0;
  return page.route('**/tutor/paso', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(respuestas[Math.min(i++, respuestas.length - 1)])
    })
  );
}

test('el árbol pregunta antes de decidir y luego guía paso a paso', async ({ page }) => {
  await mockearTutor(page, [
    // 1 · el árbol necesita saber si voló algo
    {
      decision: {
        procedimientoId: null,
        camino: [],
        siguientePregunta: {
          id: 'volado',
          texto: '¿El pasajero ya ha volado algún tramo?',
          opciones: [
            { valor: true, texto: 'Sí, ya voló alguno' },
            { valor: false, texto: 'No, ninguno' }
          ],
          porQueImporta: 'Si voló algo, el TST hay que montarlo a mano.'
        },
        avisos: [],
        advertencias: []
      }
    },
    // 2 · ya decidió: primer paso
    {
      procedimientoId: 'generar-split',
      titulo: 'Separar pasajeros (SPLIT)',
      decision: {
        procedimientoId: 'generar-split',
        camino: [{ pregunta: '¿Ha volado algún segmento?', respuesta: 'No', comoLoSe: 'Leído del billete: TODOS los cupones dicen OPEN FOR USE' }],
        siguientePregunta: null,
        avisos: [],
        advertencias: []
      },
      paso: { n: 1, sistema: 'amadeus', proceso: 'Seleccionar pasajero a separar', comando: 'SP 1', confianza: 'verbatim' },
      veredicto: null,
      avisos: [],
      explicacion: 'Marca al pasajero que se va a separar del expediente.',
      diagnostico: null
    },
    // 3 · comando correcto → avanza
    {
      procedimientoId: 'generar-split',
      titulo: 'Separar pasajeros (SPLIT)',
      paso: { n: 2, sistema: 'amadeus', proceso: 'Crear nuevo PNR', comando: 'EF', confianza: 'verbatim' },
      veredicto: { correcto: true },
      avisos: [],
      explicacion: 'Genera el expediente nuevo.',
      diagnostico: null
    }
  ]);

  await page.goto('/tutor');

  // Arranque: elige la intención
  await page.getByRole('button', { name: /cambiar un vuelo/i }).click();

  // El árbol PREGUNTA en vez de adivinar
  await expect(page.getByText(/¿el pasajero ya ha volado algún tramo\?/i)).toBeVisible();
  await expect(page.getByText(/el tst hay que montarlo a mano/i)).toBeVisible();
  await page.getByRole('button', { name: /no, ninguno/i }).click();

  // Ya hay paso: se ve el sistema, el comando y de dónde sale
  await expect(page.getByText('Separar pasajeros (SPLIT)')).toBeVisible();
  await expect(page.getByText('Amadeus', { exact: true })).toBeVisible();
  await expect(page.getByText('del manual')).toBeVisible();
  await expect(page.getByText('SP 1', { exact: true })).toBeVisible();

  // Y el camino explica CÓMO lo sabe
  await expect(page.getByText(/todos los cupones dicen open for use/i)).toBeVisible();

  // Escribe el comando correcto
  await page.getByLabel('Comando para el tutor').fill('SP 1');
  await page.getByRole('button', { name: /comprobar/i }).click();

  await expect(page.getByText(/correcto/i)).toBeVisible();
  await expect(page.getByText('EF', { exact: true })).toBeVisible();
});

test('un paso sin documentar NO da comando inventado', async ({ page }) => {
  await mockearTutor(page, [
    {
      procedimientoId: 'reembolso-ibex-no-pcc',
      titulo: 'Reembolso Iberia Express 060 por NO PCC',
      paso: {
        n: 4,
        sistema: 'resiber',
        proceso: 'Enviar comprobante por correo',
        comando: null,
        confianza: 'hueco',
        nota: 'No está en el material. Confírmalo con el instructor.'
      },
      veredicto: null,
      avisos: ['Este paso no está documentado. No lo inventes: pregunta.'],
      explicacion: 'No está en el material. Confírmalo con el instructor.',
      diagnostico: null
    }
  ]);

  await page.goto('/tutor');
  await page.getByRole('button', { name: /devuelvan el dinero/i }).click();

  await expect(page.getByText('sin documentar')).toBeVisible();
  await expect(page.getByText(/no te lo inventes/i)).toBeVisible();
  // Y no aparece ninguna caja de comando que copiar
  await expect(page.locator('.tut-comando')).toHaveCount(0);
});

test('pegar el billete se confirma en pantalla y ahorra la pregunta', async ({ page }) => {
  const peticiones = [];
  let i = 0;
  const respuestas = [
    // 1 · arranque: el árbol pregunta si ha volado
    {
      decision: {
        procedimientoId: null, camino: [],
        siguientePregunta: {
          id: 'volado', texto: '¿El pasajero ya ha volado algún tramo?',
          opciones: [{ valor: true, texto: 'Sí, ya voló alguno' }, { valor: false, texto: 'No, ninguno' }],
          porQueImporta: 'Si voló algo, el TST hay que montarlo a mano.'
        },
        avisos: [], advertencias: []
      }
    },
    // 2 · tras pegar el billete: ya no pregunta, y dice lo que leyó
    {
      procedimientoId: 'cambio-manual-sin-segmento-volado',
      titulo: 'Cambio manual, sin segmento volado (#3121)',
      lectura: {
        tipo: 'billete',
        billete: { familia: 'OPTIMA', placa: '075', doi: '29SEP25', algunSegmentoVolado: false }
      },
      decision: {
        procedimientoId: 'cambio-manual-sin-segmento-volado',
        camino: [{ pregunta: '¿Ha volado algún segmento?', respuesta: 'No', comoLoSe: 'Leído del billete: TODOS los cupones dicen OPEN FOR USE' }],
        siguientePregunta: null, avisos: [], advertencias: []
      },
      paso: { n: 1, sistema: 'amadeus', proceso: 'Abrir el PNR', comando: 'RT KFQQV', confianza: 'verbatim' },
      veredicto: null, avisos: [], explicacion: 'Empieza por abrir el expediente.', diagnostico: null
    }
  ];

  await page.route('**/tutor/paso', async (route) => {
    peticiones.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(respuestas[Math.min(i++, respuestas.length - 1)])
    });
  });

  await page.goto('/tutor');
  await page.getByRole('button', { name: /cambiar un vuelo/i }).click();
  await expect(page.getByText(/¿el pasajero ya ha volado algún tramo\?/i)).toBeVisible();

  // La caja de pegar está a mano sin que nadie la pida
  await page.getByRole('button', { name: /pegar una pantalla/i }).click();
  await page.getByLabel(/pega aquí la salida del terminal/i).fill('►DTR:TN 0752527441266·');
  await page.getByRole('button', { name: /^leerla$/i }).click();

  // Se ve QUÉ leyó: sin esto, pegar parecía no hacer nada
  await expect(page.locator('.tut-leido')).toContainText(/OPTIMA/);
  await expect(page.locator('.tut-leido')).toContainText(/nada volado/);
  await expect(page.getByText('RT KFQQV', { exact: true })).toBeVisible();

  // Y la pantalla viaja al worker para que el árbol no la olvide
  expect(peticiones[1].caso.pantallas).toEqual(['►DTR:TN 0752527441266·']);
});

test('avisa del salto entre Amadeus y Resiber', async ({ page }) => {
  await mockearTutor(page, [
    {
      procedimientoId: 'mascota-en-bodega-avih',
      titulo: 'Mascota en bodega (AVIH)',
      paso: { n: 4, sistema: 'amadeus', proceso: 'Documentar la información', comando: 'RM10APR26PAX AVDO', confianza: 'verbatim' },
      veredicto: null,
      saltoDeSistema: { de: 'resiber', a: 'amadeus' },
      avisos: ['Cambias de RESIBER a AMADEUS. Comparten pantalla: teclea ":" para alternar.'],
      explicacion: 'Deja constancia en el PNR.',
      diagnostico: null
    }
  ]);

  await page.goto('/tutor');
  await page.getByRole('button', { name: /añadir un servicio/i }).click();

  await expect(page.locator(`.tut-salto`)).toContainText(/cambias de/i);
  await expect(page.locator(`.tut-aviso`).first()).toContainText(/teclea ":" para alternar/i);
});
