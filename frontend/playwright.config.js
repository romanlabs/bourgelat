import { defineConfig } from '@playwright/test'

// Los E2E corren contra el build de producción (vite preview), no contra el dev
// server: el dev server no optimiza assets y daría métricas de vitals (LCP)
// irreales. Playwright construye y levanta su propio server en un puerto limpio.
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4317',
    headless: true,
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4317',
    port: 4317,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
