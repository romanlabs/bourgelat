import { toast } from 'sonner'
import { formaDePago, formatCurrency } from '@/features/dashboard/dashboardUtils'
import { LINE, MARGIN, MUTED, TEXT, cargarLogo, nombreClinica } from '@/lib/pdfComun'
import {
  NEGRO,
  altoPie,
  crearCompositor,
  dibujarEncabezadoFormal,
  dibujarPieFormal,
  lineaImpreso,
  texto,
} from '@/lib/pdfFormal'
import { TIPO_DOCUMENTO_LABELS } from '@/features/historias/historiaPdfComun'
import { formatDateTime } from './reciboTermico'
import { documentoVenta, esFacturaElectronica } from './documentoVenta'

// Segundo formato de salida de una venta, al lado de la tirilla termica de 80mm:
// una factura tamano carta como archivo PDF descargable, pensada para entregarle
// al cliente o enviarsela por correo/WhatsApp. La tirilla sigue siendo la del
// mostrador; esta es la copia presentable, con el mismo estilo formal de la
// historia clinica y la formula: blanco y negro, sin cajas de color.

// Intl mete un espacio duro entre el simbolo y el numero; en las fuentes base de
// jsPDF ese caracter no siempre cae en un glifo util, asi que lo normalizamos.
const money = (value) => formatCurrency(value).replace(/\u00a0/g, ' ')

const formatCantidad = (value) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value || 0))

const dibujarSelloAnulada = (doc, { pageWidth, pageHeight }) => {
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.12 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(72)
  doc.setTextColor(...NEGRO)
  doc.text('ANULADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 30 })
  doc.restoreGraphicsState()
}

// Subtotal, descuento, impuesto y total alineados a la derecha; el total en
// negrita sobre una linea negra.
const dibujarTotales = (doc, c, factura) => {
  const descuento = Number(factura?.descuento || 0)
  const impuesto = Number(factura?.impuesto || 0)
  const saldo = Number(factura?.saldoPendiente || 0)

  const filas = [
    ['Subtotal', money(factura?.subtotal || 0), false],
    descuento > 0 ? ['Descuento', `-${money(descuento)}`, false] : null,
    impuesto > 0 ? ['Impuesto', money(impuesto), false] : null,
    ['Total', money(factura?.total || 0), true],
    factura?.estado === 'parcial' && saldo > 0 ? ['Saldo pendiente', money(saldo), false] : null,
  ].filter(Boolean)

  const ancho = 72
  const x = c.derecha - ancho
  c.reservar(filas.length * 5.5 + 4)

  for (const [etiqueta, valor, destacado] of filas) {
    if (destacado) {
      c.y += 2.5
      doc.setDrawColor(...NEGRO)
      doc.setLineWidth(0.5)
      doc.line(x, c.y, c.derecha, c.y)
      doc.setLineWidth(0.2)
      c.y += 5.5
      c.fuente('bold', 11, NEGRO)
      doc.text(etiqueta.toUpperCase(), x, c.y)
    } else {
      c.y += 5.5
      c.fuente('normal', 9.5, TEXT)
      doc.text(etiqueta, x, c.y)
    }
    doc.text(valor, c.derecha, c.y, { align: 'right' })
  }
  c.y += 3
}

/**
 * Arma el documento completo. Se exporta aparte de la descarga para poder
 * reusarlo mas adelante (previsualizar, adjuntar a un correo) sin duplicar el
 * layout.
 */
export const buildFacturaPdf = async ({ factura, clinica, usuario }) => {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const tipo = documentoVenta(factura)
  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  const lineasPie = [lineaImpreso(usuario)]
  const c = crearCompositor(doc, { limiteInferior: altoPie(doc, { lineas: lineasPie }) })

  dibujarEncabezadoFormal(doc, c, {
    clinica,
    logo: await cargarLogo(clinica?.logo),
    titulo: tipo.titulo,
    lineasDerecha: [
      `N.º ${texto(factura?.numero) || '-'}`,
      formatDateTime(factura?.createdAt || factura?.fecha),
    ],
  })

  // ── Cliente ──
  // Venta de mostrador: `propietarioId` es opcional, no hay tutor asociado.
  const propietario = factura?.propietario
  const documento = texto(propietario?.numeroDocumento)
    ? `${TIPO_DOCUMENTO_LABELS[propietario.tipoDocumento] || texto(propietario.tipoDocumento)} ${texto(propietario.numeroDocumento)}`
    : ''
  c.titulo('Cliente', 10)
  if (propietario) {
    c.campos([
      ['Nombre', propietario.nombre, 'No registrado', 2],
      ['Documento', documento, 'No registrado', 2],
      ['Teléfono', propietario.telefono],
      ['Correo', propietario.email],
      ['Dirección', [texto(propietario.direccion), texto(propietario.ciudad)].filter(Boolean).join(', '), 'No registrada', 2],
    ])
  } else {
    // Venta de mostrador: basta con el nombre, sin una fila de constancias.
    c.campos([['Nombre', 'Consumidor final', '', 4]])
  }

  // ── Detalle ──
  c.titulo('Detalle de la venta', 10)
  const items = factura?.items || []
  autoTable(doc, {
    startY: c.y,
    margin: { left: MARGIN, right: MARGIN, bottom: c.limiteInferior },
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
      : [[{ content: 'Sin ítems registrados.', colSpan: 6, styles: { halign: 'center', fontStyle: 'italic' } }]],
    theme: 'plain',
    // Solo lineas horizontales finas, como un formulario impreso.
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      textColor: TEXT,
      lineColor: LINE,
      lineWidth: { bottom: 0.2 },
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 7,
      textColor: MUTED,
      lineColor: NEGRO,
      lineWidth: { bottom: 0.4 },
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 27, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 29, halign: 'right' },
    },
    didParseCell: ({ section, column, cell }) => {
      // Los encabezados de las columnas de valores se alinean con sus cifras.
      if (section === 'head' && column.index >= 2) cell.styles.halign = 'right'
      if (section === 'head' && column.index === 0) cell.styles.halign = 'center'
    },
  })
  c.y = (doc.lastAutoTable?.finalY ?? c.y) + 2

  // ── Totales y datos de pago ──
  dibujarTotales(doc, c, factura)

  c.titulo('Datos del pago', 10)
  c.campos([
    ['Forma de pago', formaDePago(factura), 'No registrada', 2],
    ['Atendido por', factura?.usuario?.nombre, 'No registrado', 2],
  ])

  if (texto(factura?.observaciones)) {
    c.titulo('Observaciones')
    c.parrafo(factura.observaciones)
  }

  if (esFacturaElectronica(factura)) {
    c.titulo('Código único de factura electrónica (CUFE)')
    c.fuente('normal', 8, MUTED)
    const lineas = doc.splitTextToSize(factura.cufe, c.anchoUtil)
    c.reservar(lineas.length * 3.6)
    doc.text(lineas, MARGIN, c.y + 3)
    c.y += lineas.length * 3.6
  }

  if (factura?.estado === 'anulada') {
    for (let pagina = 1; pagina <= doc.getNumberOfPages(); pagina += 1) {
      doc.setPage(pagina)
      dibujarSelloAnulada(doc, { pageWidth: c.pageWidth, pageHeight: c.pageHeight })
    }
  }

  dibujarPieFormal(doc, c, {
    identificacion: `${tipo.nombre} N.º ${texto(factura?.numero) || '-'} · ${nombreClinica(clinica)}`,
    lineas: lineasPie,
  })

  return doc
}

export const descargarFacturaPdf = async ({ factura, clinica, usuario }) => {
  if (!factura) {
    toast.error('No hay factura para descargar.')
    return
  }

  try {
    const doc = await buildFacturaPdf({ factura, clinica, usuario })
    // El numero puede traer prefijo y separadores del rango DIAN.
    const nombre = String(factura.numero || 'venta').replace(/[^\w.-]+/g, '-')
    doc.save(`${documentoVenta(factura).archivo}-${nombre}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la factura', error)
    toast.error('No se pudo generar el PDF de la factura.')
  }
}
