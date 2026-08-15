// Playwright config — Fase 1.5 de docs/PLAN_UX.md (bootstrap del runner E2E).
// Nota webServer: `vite preview` sirve el contenido de dist/, NO el codigo
// fuente, asi que el comando encadena `npm run build` antes del preview.
// Playwright lanza webServer.command con shell:true, por lo que `&&` funciona
// tanto en cmd.exe (Windows) como en sh (CI/Linux).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Margen para el arranque en frio (el webServer compila antes de servir):
  // sin esto, el primer test puede agotar el timeout por defecto de 30s
  // mientras el build todavia corre.
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:4173',
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  ...(process.env.E2E_EXTERNAL_SERVER ? {} : { webServer: {
    // scripts/e2e-server.js fuerza VITE_E2E_MOCK_AUTH vía child_process.spawn
    // (env real de Node, no sintaxis de shell) — webServer.env de Playwright
    // no propagaba de forma confiable a través del "&&" en este entorno.
    //
    // Ese build compila a dist-e2e/, NO a dist/. Es lo que impide que el
    // bypass de auth llegue a producción: `firebase deploy` sube dist/, y los
    // tests ya no pueden escribir ahí. Antes sí podían, y un deploy hecho
    // justo después de los tests publicó el build con el login desactivado.
    command: 'node scripts/e2e-server.js',
    url: 'http://localhost:4173',
    // Cada corrida debe arrancar el build/preview que corresponde al commit
    // actual. Reutilizar un preview viejo deja pruebas colgadas después de una
    // interrupción y puede ocultar cambios del simulador.
    reuseExistingServer: false,
    timeout: 120000, // el build de vite corre dentro de este presupuesto
    gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 },
  }}),
});
