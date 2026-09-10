import { toast } from 'sonner'
import { PAYMENT_METHOD_LABELS, formatCurrency } from '@/features/dashboard/dashboardUtils'
import { formatDateTime } from './reciboTermico'

// Segundo formato de salida de una venta, al lado de la tirilla termica de 80mm:
// una factura tamano carta como archivo PDF descargable, pensada para entregarle
// al cliente o enviarsela por correo/WhatsApp. La tirilla sigue siendo la del
// mostrador; esta es la copia presentable.

const MARGIN = 15
const BRAND = [8, 32, 51] // #082033, el mismo azul del sidebar
const MUTED = [107, 114, 128]
const TEXT = [17, 24, 39]
const LINE = [209, 213, 219]

// Intl mete un espacio duro entre el simbolo y el numero; en las fuentes base de
// jsPDF ese caracter no siempre cae en un glifo util, asi que lo normalizamos.
const money = (value) => formatCurrency(value).replace(/\u00a0/g, ' ')

const formatCantidad = (value) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value || 0))

/**
 * Hay que pasar el logo por un canvas antes de poder incrustarlo, y leer ese
 * canvas exige que el origen mande cabeceras CORS. Por eso el logo se sube a
 * nuestro propio /uploads, que si las manda. Aun asi es decorativo: si falla
 * (una clinica con la URL externa que se usaba antes, un 404, o ningun logo)
 * el encabezado cae al nombre de la clinica y la descarga sigue su curso.
 */
const cargarLogo = async (url) => {
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

const dibujarEncabezado = (doc, { clinica, logo }) => {
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'
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
  doc.text(nombreClinica, textX, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)

  const lineas = [
    clinica?.razonSocial && clinica.razonSocial !== nombreClinica ? clinica.razonSocial : null,
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

const dibujarBloqueDocumento = (doc, { factura, pageWidth }) => {
  const ancho = 62
  const alto = 24
  const x = pageWidth - MARGIN - ancho
  const y = MARGIN

  doc.setFillColor(...BRAND)
  doc.rect(x, y, ancho, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('FACTURA DE VENTA', x + ancho / 2, y + 5.5, { align: 'center' })

  doc.setDrawColor(...LINE)
  doc.rect(x, y + 8, ancho, alto - 8)

  doc.setFontSize(12)
  doc.setTextColor(...TEXT)
  doc.text(String(factura?.numero || '-'), x + ancho / 2, y + 15, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(formatDateTime(factura?.createdAt || factura?.fecha), x + ancho / 2, y + 20.5, {
    align: 'center',
  })

  return y + alto
}

const dibujarSelloAnulada = (doc, { pageWidth, pageHeight }) => {
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.15 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(72)
  doc.setTextColor(220, 38, 38)
  doc.text('ANULADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 30 })
  doc.restoreGraphicsState()
}

const dibujarDatosCliente = (doc, { factura, pageWidth, y }) => {
  const propietario = factura?.propietario
  const documento = [propietario?.tipoDocumento, propietario?.numeroDocumento]
    .filter(Boolean)
    .join(' ')

  doc.setDrawColor(...LINE)
  doc.setFillColor(248, 250, 252)
  const alto = 22
  doc.rect(MARGIN, y, pageWidth - MARGIN * 2, alto, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('CLIENTE', MARGIN + 4, y + 5.5)

  doc.setFontSize(10)
  doc.setTextColor(...TEXT)
  // Venta de mostrador: `propietarioId` es opcional, no hay tutor asociado.
  doc.text(propietario?.nombre || 'Consumidor final', MARGIN + 4, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  const detalle = [
    documento || null,
    propietario?.telefono || null,
    propietario?.email || null,
    [propietario?.direccion, propietario?.ciudad].filter(Boolean).join(', ') || null,
  ].filter(Boolean)
  if (detalle.length) {
    doc.text(detalle.join('  ·  '), MARGIN + 4, y + 17, {
      maxWidth: pageWidth - MARGIN * 2 - 8,
    })
  }

  return y + alto
}

const dibujarTotales = (doc, { factura, pageWidth, y }) => {
  const descuento = Number(factura?.descuento || 0)
  const impuesto = Number(factura?.impuesto || 0)
  const saldo = Number(factura?.saldoPendiente || 0)

  const filas = [
    ['Subtotal', money(factura?.subtotal || 0), false],
    descuento > 0 ? ['Descuento', `-${money(descuento)}`, false] : null,
    impuesto > 0 ? ['Impuesto', money(impuesto), false] : null,
    ['TOTAL', money(factura?.total || 0), true],
    factura?.estado === 'parcial' && saldo > 0 ? ['Saldo pendiente', money(saldo), false] : null,
  ].filter(Boolean)

  const ancho = 72
  const x = pageWidth - MARGIN - ancho
  let cursor = y

  for (const [label, valor, destacado] of filas) {
    if (destacado) {
      doc.setDrawColor(...BRAND)
      doc.setLineWidth(0.5)
      doc.line(x, cursor, x + ancho, cursor)
      doc.setLineWidth(0.2)
      cursor += 5.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...BRAND)
    } else {
      cursor += 5.5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...TEXT)
    }
    doc.text(label, x, cursor)
    doc.text(valor, x + ancho, cursor, { align: 'right' })
  }

  return cursor
}

const dibujarPie = (doc, { clinica, pageWidth, pageHeight }) => {
  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'
  const total = doc.getNumberOfPages()

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, pageHeight - 14, pageWidth - MARGIN, pageHeight - 14)
    doc.text(`${nombreClinica} · Generado por Bourgelat`, MARGIN, pageHeight - 9)
    doc.text(`Página ${pagina} de ${total}`, pageWidth - MARGIN, pageHeight - 9, { align: 'right' })
  }
}

/**
 * Arma el documento completo. Se exporta aparte de la descarga para poder
 * reusarlo mas adelante (previsualizar, adjuntar a un correo) sin duplicar el
 * layout.
 */
export const buildFacturaPdf = async ({ factura, clinica }) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const logo = await cargarLogo(clinica?.logo)

  const finEncabezado = dibujarEncabezado(doc, { clinica, logo })
  const finDocumento = dibujarBloqueDocumento(doc, { factura, pageWidth })
  let y = Math.max(finEncabezado, finDocumento) + 6

  if (factura?.estado === 'anulada') {
    dibujarSelloAnulada(doc, { pageWidth, pageHeight })
  }

  y = dibujarDatosCliente(doc, { factura, pageWidth, y }) + 6

  const items = factura?.items || []
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 20 },
    head: [['#', 'Descripción', 'Cant.', 'Vr. unitario', 'Descuento', 'Subtotal']],
    body: items.length
      ? items.map((item, indice) => [
          indice + 1,
          item.descripcion || 'Concepto',
          formatCantidad(item.cantidad),
          money(item.precioUnitario || 0),
          Number(item.descuento || 0) > 0 ? `-${money(item.descuento)}` : '-',
          money(item.subtotal || 0),
        ])
      : [[{ content: 'Sin ítems registrados.', colSpan: 6, styles: { halign: 'center' } }]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: TEXT, lineColor: LINE },
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 27, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 29, halign: 'right' },
    },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 4

  // Si los totales no caben bajo la tabla, empiezan pagina nueva en vez de
  // montarse sobre el pie.
  if (y > pageHeight - 60) {
    doc.addPage()
    y = MARGIN
  }

  const finTotales = dibujarTotales(doc, { factura, pageWidth, y })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  let infoY = y + 5.5
  doc.text(
    `Forma de pago: ${PAYMENT_METHOD_LABELS[factura?.metodoPago] || factura?.metodoPago || '-'}`,
    MARGIN,
    infoY
  )
  infoY += 5
  doc.text(`Atendido por: ${factura?.usuario?.nombre || '-'}`, MARGIN, infoY)

  if (factura?.observaciones) {
    infoY += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Observaciones', MARGIN, infoY)
    doc.setFont('helvetica', 'normal')
    infoY += 4.5
    const texto = doc.splitTextToSize(factura.observaciones, pageWidth - MARGIN * 2 - 80)
    doc.text(texto, MARGIN, infoY)
    infoY += texto.length * 4.2
  }

  if (factura?.estadoElectronico === 'validada' && factura?.cufe) {
    let cufeY = Math.max(finTotales, infoY) + 8
    if (cufeY > pageHeight - 30) {
      doc.addPage()
      cufeY = MARGIN
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...TEXT)
    doc.text('CUFE', MARGIN, cufeY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(doc.splitTextToSize(factura.cufe, pageWidth - MARGIN * 2), MARGIN, cufeY + 4)
  }

  dibujarPie(doc, { clinica, pageWidth, pageHeight })

  return doc
}

export const descargarFacturaPdf = async ({ factura, clinica }) => {
  if (!factura) {
    toast.error('No hay factura para descargar.')
    return
  }

  try {
    const doc = await buildFacturaPdf({ factura, clinica })
    // El numero puede traer prefijo y separadores del rango DIAN.
    const nombre = String(factura.numero || 'venta').replace(/[^\w.-]+/g, '-')
    doc.save(`Factura-${nombre}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la factura', error)
    toast.error('No se pudo generar el PDF de la factura.')
  }
}
