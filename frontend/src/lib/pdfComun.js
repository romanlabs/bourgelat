// Piezas compartidas por los documentos PDF que se le entregan al cliente
// (factura de venta, formula medica): mismos colores, mismo encabezado con el
// logo de la clinica y mismo pie paginado.

export const MARGIN = 15
export const BRAND = [8, 32, 51] // #082033, el mismo azul del sidebar
export const MUTED = [107, 114, 128]
export const TEXT = [17, 24, 39]
export const LINE = [209, 213, 219]

export const nombreClinica = (clinica) => clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'

/**
 * Hay que pasar el logo por un canvas antes de poder incrustarlo, y leer ese
 * canvas exige que el origen mande cabeceras CORS. Por eso el logo se sube a
 * nuestro propio /uploads, que si las manda. Aun asi es decorativo: si falla
 * (una clinica con la URL externa que se usaba antes, un 404, o ningun logo)
 * el encabezado cae al nombre de la clinica y la descarga sigue su curso.
 */
export const cargarLogo = async (url) => {
  if (!url) return null
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return {
      dataUrl: canvas.toDataURL('image/png'),
      ratio: img.naturalWidth / img.naturalHeight,
    }
  } catch {
    return null
  }
}

export const dibujarEncabezado = (doc, { clinica, logo }) => {
  const nombre = nombreClinica(clinica)
  let y = MARGIN
  let textX = MARGIN

  if (logo) {
    const alto = Math.min(18, 30 / logo.ratio)
    const ancho = alto * logo.ratio
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, y, ancho, alto)
    textX = MARGIN + ancho + 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...BRAND)
  doc.text(nombre, textX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)

  const lineas = [
    clinica?.razonSocial && clinica.razonSocial !== nombre ? clinica.razonSocial : null,
    clinica?.nit ? `NIT ${clinica.nit}` : null,
    clinica?.direccion || null,
    [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ') || null,
    [clinica?.telefono, clinica?.email].filter(Boolean).join(' · ') || null,
  ].filter(Boolean)

  let lineaY = y + 10
  for (const linea of lineas) {
    doc.text(linea, textX, lineaY)
    lineaY += 4.2
  }

  return Math.max(lineaY, y + 30)
}

export const dibujarPie = (doc, { clinica, pageWidth, pageHeight }) => {
  const nombre = nombreClinica(clinica)
  const total = doc.getNumberOfPages()

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, pageHeight - 14, pageWidth - MARGIN, pageHeight - 14)
    doc.text(`${nombre} · Generado por Bourgelat`, MARGIN, pageHeight - 9)
    doc.text(`Página ${pagina} de ${total}`, pageWidth - MARGIN, pageHeight - 9, { align: 'right' })
  }
}
