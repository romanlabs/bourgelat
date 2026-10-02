#!/usr/bin/env node
// Control de la identidad «Papel y pulso»: falla si aparece un color suelto en
// src/ en vez de un token. Ver la sección de paleta en CLAUDE.md.
//
//   npm run lint:colores
//
// Detecta:
//   - paletas crudas de Tailwind  → bg-red-50, text-slate-700, border-emerald-200…
//   - hex escritos a mano         → bg-[#10263a], '#b07645', color="#0f766e"
// Usar en su lugar: bg-danger-soft, text-muted-foreground, bg-primary, brand…
// Para gráficas: chartColors de @/lib/theme. Para páginas públicas fijas:
// escalas papel-*, tinta-*, caramel-*, clinical-*.
//
// Excepción puntual: agregar `lint-colores-ignorar` en un comentario de la
// misma línea, con el motivo.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

// Archivos que pueden tener colores propios, con el motivo.
const EXENTOS = [
  ['components/landing/', 'landing: pendiente de pasar sus hex a variables'],
  ['pages/LandingPage.jsx', 'landing'],
  ['pages/PlanesPage.jsx', 'página pública de planes, con estilo de landing'],
  ['features/auth/BotonesSociales.jsx', 'colores oficiales de los logos de Google y Microsoft'],
  ['features/finanzas/reciboTermico.js', 'recibo para impresora térmica: blanco y negro'],
  ['lib/pdfComun.js', 'PDF generado: no usa el CSS de la app'],
  ['components/shared/ECGHeartbeatCanvas.jsx', 'canvas sin uso, pinta con hex'],
  ['test/', 'pruebas'],
]

const FAMILIAS =
  'red|rose|pink|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|slate|gray|zinc|neutral|stone'
const UTILIDADES =
  'bg|text|border|ring|ring-offset|divide|outline|decoration|fill|stroke|from|via|to|placeholder|accent|caret|shadow'
const PALETA_CRUDA = new RegExp(String.raw`(?<![\w-])(?:${UTILIDADES})-(?:${FAMILIAS})-\d{2,3}(?:\/[\d.]+)?(?![\w-])`, 'g')
// '#abc', "#aabbcc", [#aabbcc], `#aabbcc80`… sin atrapar anclas como "#faq".
const HEX = /(?<=["'`\[(,\s])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?=["'`\]),;\s_])/g
const IGNORAR = 'lint-colores-ignorar'

const relativo = (ruta) => relative(SRC, ruta).split(sep).join('/')
const exento = (rel) => EXENTOS.some(([prefijo]) => rel === prefijo || rel.startsWith(prefijo))

function* archivos(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) yield* archivos(ruta)
    else if (/\.(jsx?|tsx?)$/.test(entrada.name) && !/\.test\.[jt]sx?$/.test(entrada.name)) yield ruta
  }
}

const hallazgos = []
for (const ruta of archivos(SRC)) {
  const rel = relativo(ruta)
  if (exento(rel)) continue
  readFileSync(ruta, 'utf8')
    .split('\n')
    .forEach((linea, i) => {
      if (linea.includes(IGNORAR)) return
      for (const re of [PALETA_CRUDA, HEX]) {
        for (const m of linea.matchAll(re)) hallazgos.push(`${rel}:${i + 1}  ${m[0]}`)
      }
    })
}

if (hallazgos.length) {
  console.error(`✖ ${hallazgos.length} colores sueltos (usar tokens; ver "Paleta" en CLAUDE.md):\n`)
  for (const h of hallazgos) console.error('  ' + h)
  console.error(`\nSi es una excepción justificada, agregar un comentario "${IGNORAR}: <motivo>" en esa línea.`)
  process.exit(1)
}
console.log('✔ Sin colores sueltos fuera de los archivos exentos.')
