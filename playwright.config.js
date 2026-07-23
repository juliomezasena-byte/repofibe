// Playwright config — Fase 1.5 de docs/PLAN_UX.md (bootstrap del runner E2E).
// Nota webServer: `vite preview` sirve el contenido de dist/, NO el codigo
// fuente, asi que el comando encadena `npm run build` antes del preview.
// Playwright lanza webServer.command con shell:true, por lo que `&&` funciona
// tanto en cmd.exe (Windows) como en sh (CI/Linux).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120000, // el build de vite corre dentro de este presupuesto
  },
});
