// Convierte capturas PNG a webp para la landing: ancho máximo 1600 px y la
// mejor calidad que quepa en 200 KB. Usa el `sharp` que ya instala el backend.
// Uso: node scripts/capturas-a-webp.mjs <salida> <a.png> [b.png ...]
import { createRequire } from 'node:module'
import { basename, extname, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'

const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const sharp = require('sharp')

const LIMITE = 200 * 1024
const [salida, ...entradas] = process.argv.slice(2)
if (!salida || entradas.length === 0) {
  console.error('Uso: node scripts/capturas-a-webp.mjs <salida> <a.png> [b.png ...]')
  process.exit(1)
}
mkdirSync(salida, { recursive: true })

for (const entrada of entradas) {
  const destino = join(salida, basename(entrada, extname(entrada)) + '.webp')
  let calidad = 86
  let buffer
  do {
    buffer = await sharp(entrada)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: calidad, effort: 6 })
      .toBuffer()
    calidad -= 4
  } while (buffer.length > LIMITE && calidad >= 50)
  writeFileSync(destino, buffer)
  console.log(`${destino}  ${Math.round(buffer.length / 1024)} KB  calidad ${calidad + 4}`)
}
