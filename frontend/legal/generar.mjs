// Genera los PDF formales de los documentos legales en public/legal/.
//
//   npm run legal:pdf              versión final (exige todos los datos del art. 13)
//   npm run legal:pdf -- --borrador  borrador marcado como tal en legal/borrador/
//
// Estilo de los PDF formales de Bourgelat (lib/pdfFormal.js): blanco y negro,
// encabezado institucional, títulos con una línea fina y pie con la
// identificación del documento y la página en cada hoja.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import {
  CIUDAD_DOMICILIO,
  DIRECCION_CORRESPONDENCIA,
  VERSIONES_LEGALES,
  formatearVigencia,
} from '../src/content/legal.js'
import { politicaDatos, terminos } from './documentos.js'

const RAIZ = dirname(fileURLToPath(import.meta.url))
const NEGRO = [17, 17, 17]
const GRIS = [100, 100, 100]
const LINEA = [200, 200, 200]
const MARGEN = 22
const CUERPO = 10
const alturaLinea = (puntos) => puntos * 0.3528 * 1.45

const DOCUMENTOS = [
  { clave: 'privacidad', secciones: politicaDatos },
  { clave: 'terminos', secciones: terminos },
]

const borrador = process.argv.includes('--borrador')

const faltantes = [
  !CIUDAD_DOMICILIO && 'ciudad de domicilio (CIUDAD_DOMICILIO)',
  !DIRECCION_CORRESPONDENCIA && 'dirección de correspondencia (DIRECCION_CORRESPONDENCIA)',
  DOCUMENTOS.some(({ clave }) => !VERSIONES_LEGALES[clave].vigencia) && 'fecha de vigencia (VERSIONES_LEGALES.*.vigencia)',
].filter(Boolean)

if (faltantes.length && !borrador) {
  console.error(`Faltan datos en src/content/legal.js: ${faltantes.join(', ')}.`)
  console.error('Complétalos o genera un borrador con: npm run legal:pdf -- --borrador')
  process.exit(1)
}

const datos = {
  ciudad: CIUDAD_DOMICILIO || '[ciudad pendiente]',
  direccion: DIRECCION_CORRESPONDENCIA || '[dirección pendiente]',
}

// "texto con **negrita**" -> palabras con su estilo, para partir líneas a mano.
const palabras = (texto) =>
  texto.split('**').flatMap((trozo, i) =>
    trozo
      .split(/(\s+)/)
      .filter(Boolean)
      .map((t) => ({ t, negrita: i % 2 === 1 }))
  )

function componer(doc, { titulo, version, vigencia }, secciones, paginasToc) {
  const ancho = doc.internal.pageSize.getWidth()
  const alto = doc.internal.pageSize.getHeight()
  const derecha = ancho - MARGEN
  const limite = alto - MARGEN - 8
  const paginasSecciones = []
  let y = MARGEN

  const fuente = (estilo, tamano, color = NEGRO) => {
    doc.setFont('helvetica', estilo)
    doc.setFontSize(tamano)
    doc.setTextColor(...color)
  }
  const nuevaPagina = () => {
    doc.addPage()
    y = MARGEN + 8
  }
  const reservar = (altoBloque) => {
    if (y + altoBloque > limite) nuevaPagina()
  }

  // Texto con negritas, partido en líneas de `anchoMax` desde `x`.
  const textoRico = (texto, x, anchoMax, tamano = CUERPO) => {
    const lineas = [[]]
    let usado = 0
    for (const p of palabras(texto)) {
      fuente(p.negrita ? 'bold' : 'normal', tamano)
      const w = doc.getTextWidth(p.t)
      const esEspacio = /^\s+$/.test(p.t)
      if (!esEspacio && usado + w > anchoMax && lineas.at(-1).length) {
        lineas.push([])
        usado = 0
      }
      if (esEspacio && !lineas.at(-1).length) continue
      lineas.at(-1).push({ ...p, w })
      usado += w
    }
    const altoLinea = alturaLinea(tamano)
    for (const linea of lineas) {
      reservar(altoLinea)
      let cx = x
      for (const p of linea) {
        fuente(p.negrita ? 'bold' : 'normal', tamano)
        doc.text(p.t, cx, y + altoLinea * 0.72)
        cx += p.w
      }
      y += altoLinea
    }
  }

  // Portada e índice
  fuente('bold', 9)
  doc.text('BOURGELAT', MARGEN, y, { charSpace: 0.8 })
  fuente('normal', 8.5, GRIS)
  doc.text('Software para clínicas veterinarias · bourgelat.co', derecha, y, { align: 'right' })
  doc.setDrawColor(...NEGRO)
  doc.setLineWidth(0.4)
  doc.line(MARGEN, y + 3, derecha, y + 3)
  y += 26

  fuente('bold', 22)
  for (const linea of doc.splitTextToSize(titulo, derecha - MARGEN)) {
    doc.text(linea, MARGEN, y)
    y += 9.5
  }
  fuente('normal', 10.5, GRIS)
  doc.text(`Versión ${version} · Vigente desde el ${formatearVigencia(vigencia)}`, MARGEN, y)
  y += 10

  if (borrador) {
    doc.setDrawColor(...NEGRO)
    doc.setLineWidth(0.3)
    doc.rect(MARGEN, y, derecha - MARGEN, 8 + doc.splitTextToSize(`Falta: ${faltantes.join('; ')}.`, derecha - MARGEN - 8).length * 4)
    fuente('bold', 9)
    doc.text('BORRADOR — NO PUBLICADO', MARGEN + 4, y + 5)
    fuente('normal', 8.5)
    const lineasFaltan = doc.splitTextToSize(`Falta: ${faltantes.join('; ')}.`, derecha - MARGEN - 8)
    doc.text(lineasFaltan, MARGEN + 4, y + 9.2)
    y += 18 + (lineasFaltan.length - 1) * 4
  }

  y += 6
  fuente('bold', 8)
  doc.text('CONTENIDO', MARGEN, y, { charSpace: 0.5 })
  doc.setDrawColor(...LINEA)
  doc.setLineWidth(0.2)
  doc.line(MARGEN, y + 2, derecha, y + 2)
  y += 8
  secciones.forEach((s, i) => {
    fuente('normal', 10)
    const etiqueta = `${i + 1}.  ${s.titulo}`
    doc.text(etiqueta, MARGEN, y)
    const pagina = String(paginasToc?.[i] ?? '')
    doc.text(pagina, derecha, y, { align: 'right' })
    const desde = MARGEN + doc.getTextWidth(etiqueta) + 2
    const hasta = derecha - doc.getTextWidth(pagina) - 2
    const punto = doc.getTextWidth('.')
    fuente('normal', 10, LINEA)
    if (hasta > desde) doc.text('.'.repeat(Math.floor((hasta - desde) / punto)), hasta, y, { align: 'right' })
    y += 6.2
  })

  // Cuerpo
  nuevaPagina()
  secciones.forEach((seccion, i) => {
    reservar(14 + alturaLinea(CUERPO) * 2)
    if (y > MARGEN + 9) y += 4
    paginasSecciones.push(doc.getNumberOfPages())
    fuente('bold', 12.5)
    for (const linea of doc.splitTextToSize(`${i + 1}. ${seccion.titulo}`, derecha - MARGEN)) {
      doc.text(linea, MARGEN, y + 4.5)
      y += 6
    }
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, y + 0.5, derecha, y + 0.5)
    y += 4

    for (const bloque of seccion.bloques) {
      if (typeof bloque === 'string') {
        textoRico(bloque, MARGEN, derecha - MARGEN)
        y += 2.2
      } else if (bloque.sub) {
        reservar(6 + alturaLinea(CUERPO) * 2)
        y += 1
        fuente('bold', 10.5)
        doc.text(bloque.sub, MARGEN, y + 3.5)
        y += 5.5
      } else if (bloque.lista) {
        for (const item of bloque.lista) {
          reservar(alturaLinea(CUERPO))
          fuente('normal', CUERPO)
          doc.text('•', MARGEN + 1.5, y + alturaLinea(CUERPO) * 0.72)
          textoRico(item, MARGEN + 6, derecha - MARGEN - 6)
          y += 1.2
        }
        y += 1.6
      } else if (bloque.tabla) {
        autoTable(doc, {
          startY: y,
          margin: { left: MARGEN, right: MARGEN, top: MARGEN + 8, bottom: MARGEN + 8 },
          head: [bloque.tabla.columnas],
          body: bloque.tabla.filas,
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 8.5, textColor: NEGRO, lineColor: LINEA, lineWidth: 0.2, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: NEGRO, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 48, font: 'courier', fontSize: 8 },
            2: { cellWidth: 22 },
          },
        })
        y = doc.lastAutoTable.finalY + 4
      }
    }
  })

  // Encabezado (desde la segunda hoja) y pie en todas
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    if (pagina > 1) {
      fuente('bold', 7.5)
      doc.text('BOURGELAT', MARGEN, MARGEN - 4, { charSpace: 0.6 })
      fuente('normal', 7.5, GRIS)
      doc.text(titulo, derecha, MARGEN - 4, { align: 'right' })
      doc.setDrawColor(...LINEA)
      doc.setLineWidth(0.2)
      doc.line(MARGEN, MARGEN - 2, derecha, MARGEN - 2)
    }
    doc.setDrawColor(...LINEA)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, alto - MARGEN + 2, derecha, alto - MARGEN + 2)
    fuente('normal', 7.5, GRIS)
    doc.text(`${titulo} · Versión ${version}${borrador ? ' · BORRADOR' : ''}`, MARGEN, alto - MARGEN + 6)
    doc.text(`Página ${pagina} de ${total}`, derecha, alto - MARGEN + 6, { align: 'right' })
  }

  return paginasSecciones
}

const nuevoDoc = (meta) => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  doc.setProperties({
    title: `${meta.titulo} — Bourgelat`,
    subject: `Versión ${meta.version}`,
    author: 'Bourgelat',
    creator: 'Bourgelat',
  })
  return doc
}

const destino = borrador ? join(RAIZ, 'borrador') : join(RAIZ, '..', 'public', 'legal')
await mkdir(destino, { recursive: true })

for (const { clave, secciones } of DOCUMENTOS) {
  const meta = {
    ...VERSIONES_LEGALES[clave],
    vigencia: VERSIONES_LEGALES[clave].vigencia || new Date().toISOString().slice(0, 10),
  }
  const contenido = secciones(datos)
  // Dos pasadas: la primera mide en qué página cae cada sección para el índice.
  const paginas = componer(nuevoDoc(meta), meta, contenido)
  const doc = nuevoDoc(meta)
  componer(doc, meta, contenido, paginas)
  const ruta = join(destino, meta.archivo)
  await writeFile(ruta, Buffer.from(doc.output('arraybuffer')))
  console.log(`${borrador ? 'Borrador' : 'PDF'}: ${ruta} (${doc.getNumberOfPages()} páginas)`)
}
