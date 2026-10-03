import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

// theme.tokens.cjs es CommonJS porque tailwind.config.cjs lo carga con require.
// El build lo convierte solo, pero el servidor de desarrollo lo sirve tal cual y
// `import tokens from` falla ("does not provide an export named 'default'").
// Este plugin lo expone como modulo ES solo en desarrollo (en el build Rolldown
// trata los .cjs como CommonJS y no admite un export).
const tokensComoModuloES = {
  name: 'bourgelat:theme-tokens-esm',
  apply: 'serve',
  transform(code, id) {
    if (!id.split('?')[0].endsWith('theme.tokens.cjs')) return null
    return { code: code.replace(/module\.exports\s*=/, 'export default'), map: null }
  },
}

export default defineConfig({
  plugins: [
    tokensComoModuloES,
    react(),
    visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
