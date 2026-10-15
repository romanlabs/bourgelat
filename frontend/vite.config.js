import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import { RUTAS_PUBLICAS, urlCanonica } from './src/content/seo.js'

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

const escaparAtributo = (valor) =>
  valor.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Reemplaza un valor del <head> y falla si la etiqueta no está: así un cambio
// en index.html no deja las páginas con el head de la landing sin avisar.
const reemplazar = (html, patron, valor, etiqueta) => {
  if (!patron.test(html)) throw new Error(`[seo-estatico] no encontré ${etiqueta} en index.html`)
  return html.replace(patron, (_, antes, despues) => `${antes}${escaparAtributo(valor)}${despues}`)
}

const meta = (atributo, clave) => new RegExp(`(<meta ${atributo}="${clave}" content=")[^"]*(")`)

const headParaRuta = (html, ruta, { title, description }) => {
  const url = urlCanonica(ruta)
  let salida = reemplazar(html, /(<title>)[^<]*(<\/title>)/, title, '<title>')
  salida = reemplazar(salida, /(<link rel="canonical" href=")[^"]*(")/, url, 'canonical')
  salida = reemplazar(salida, meta('name', 'description'), description, 'description')
  salida = reemplazar(salida, meta('property', 'og:url'), url, 'og:url')
  salida = reemplazar(salida, meta('property', 'og:title'), title, 'og:title')
  salida = reemplazar(salida, meta('property', 'og:description'), description, 'og:description')
  salida = reemplazar(salida, meta('name', 'twitter:url'), url, 'twitter:url')
  salida = reemplazar(salida, meta('name', 'twitter:title'), title, 'twitter:title')
  salida = reemplazar(salida, meta('name', 'twitter:description'), description, 'twitter:description')
  return salida
}

const sitemap = (fecha) => {
  const urls = Object.entries(RUTAS_PUBLICAS).map(([ruta, { changefreq, priority }]) => [
    '  <url>',
    `    <loc>${urlCanonica(ruta)}</loc>`,
    `    <lastmod>${fecha}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n'))
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

// SPA servida por Render: sin esto todas las rutas entregan el mismo <head> que
// la landing. Escribe dist/<ruta>/index.html con title, description y canonical
// propios (render.yaml los enruta) y genera el sitemap con la fecha del build.
const seoEstatico = () => {
  let outDir
  return {
    name: 'bourgelat:seo-estatico',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const plantilla = await readFile(path.join(outDir, 'index.html'), 'utf8')

      for (const [ruta, datos] of Object.entries(RUTAS_PUBLICAS)) {
        const destino = ruta === '/'
          ? path.join(outDir, 'index.html')
          : path.join(outDir, ruta.slice(1), 'index.html')
        await mkdir(path.dirname(destino), { recursive: true })
        await writeFile(destino, headParaRuta(plantilla, ruta, datos))
      }

      const hoy = new Date().toISOString().slice(0, 10)
      await writeFile(path.join(outDir, 'sitemap.xml'), sitemap(hoy))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    tokensComoModuloES,
    react(),
    seoEstatico(),
    // Solo con `npm run analyze`: en un build normal stats.html quedaba publicado.
    mode === 'analyze' && visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
