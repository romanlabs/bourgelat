import { toast } from 'sonner'
import {
  BRAND,
  LINE,
  MARGIN,
  MUTED,
  TEXT,
  cargarLogo,
  dibujarEncabezado,
  dibujarPie,
} from '@/lib/pdfComun'
import { VIA_LABELS } from './historiaConstants'

// Lo que el tutor se lleva a casa: el plan farmacologico de la consulta con la
// posologia de cada medicamento, las indicaciones generales y el proximo
// control. Media carta, como una formula medica tradicional, para imprimirla o
// mandarla por WhatsApp. El diagnostico no va: se queda en la historia clinica.

const MEDIA_CARTA = [139.7, 215.9]
// El pie ocupa los ultimos 14mm; se deja aire para que nada se le monte.
const LIMITE_INFERIOR = 20
const FONDO_SUAVE = [248, 250, 252]
const FONDO_CONTROL = [236, 244, 250]

const ESPECIE_LABELS = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  conejo: 'Conejo',
  reptil: 'Reptil',
  otro: 'Otro',
}

const SEXO_LABELS = { macho: 'Macho', hembra: 'Hembra' }

// Alto de linea en mm para un tamano de fuente en puntos.
const alturaLinea = (fontSize) => fontSize * 0.3528 * 1.25

const texto = (value) => String(value ?? '').trim()

// Las historias antiguas guardaban cada medicamento como texto plano.
const normalizarMedicamentos = (medicamentos) =>
  (Array.isArray(medicamentos) ? medicamentos : [])
    .map((item) => (typeof item === 'string' ? { nombre: item } : item))
    .filter((item) => item && typeof item === 'object' && texto(item.nombre))

export const tienePlanFarmacologico = (historia) =>
  normalizarMedicamentos(historia?.medicamentos).length > 0 || texto(historia?.indicaciones).length > 0

// `proximaConsulta` y `fechaNacimiento` son DATEONLY: new Date('AAAA-MM-DD') los
// leeria en UTC y en Colombia mostraria el dia anterior.
const parseFechaLocal = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const parseFecha = (value) => {
  const fecha = value ? new Date(value) : null
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null
}

const formatFechaLarga = (fecha) => {
  const valor = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}

const formatFechaCorta = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)

const formatNumero = (value) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value))

// Edad a la fecha de la consulta, que es la que importa para la dosis.
const calcularEdad = (fechaNacimiento, referencia) => {
  const nacimiento = parseFechaLocal(fechaNacimiento)
  if (!nacimiento) return ''
  let meses =
    (referencia.getFullYear() - nacimiento.getFullYear()) * 12 +
    (referencia.getMonth() - nacimiento.getMonth())
  if (referencia.getDate() < nacimiento.getDate()) meses -= 1
  if (meses < 0) return ''
  if (meses < 1) return 'Menos de 1 mes'
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const anios = Math.floor(meses / 12)
  return `${anios} ${anios === 1 ? 'año' : 'años'}`
}

const describirPosologia = (item) =>
  [
    texto(item.dosis) && `Dosis: ${texto(item.dosis)}`,
    texto(item.via) && `Vía: ${VIA_LABELS[item.via] || texto(item.via)}`,
    texto(item.frecuencia),
    texto(item.duracion) && `Durante ${texto(item.duracion)}`,
    texto(item.cantidad) &&
      `Cantidad: ${Number.isFinite(Number(item.cantidad)) ? formatNumero(item.cantidad) : texto(item.cantidad)}`,
  ]
    .filter(Boolean)
    .join('  ·  ')

const nombreArchivo = (historia) => {
  const mascota = String(historia?.mascota?.nombre || 'paciente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
  const fecha = parseFecha(historia?.fechaConsulta)
  if (!fecha) return mascota
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${mascota}-${fecha.getFullYear()}-${mes}-${dia}`
}

// Las cajas de paciente y tutor van lado a lado; se miden antes de dibujar
// para que ambas queden del mismo alto aunque una envuelva mas lineas.
const medirCaja = (doc, { etiqueta, titulo, lineas, ancho }) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const tituloLineas = doc.splitTextToSize(titulo, ancho - 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const detalle = lineas.flatMap((linea) => doc.splitTextToSize(linea, ancho - 6))
  const ultimaLinea =
    10 + (tituloLineas.length - 1) * 4.4 + (detalle.length ? 4.4 + (detalle.length - 1) * 3.6 : 0)
  return { etiqueta, tituloLineas, detalle, alto: ultimaLinea + 3.5 }
}

const dibujarCaja = (doc, caja, { x, y, ancho, alto }) => {
  doc.setDrawColor(...LINE)
  doc.setFillColor(...FONDO_SUAVE)
  doc.rect(x, y, ancho, alto, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(caja.etiqueta, x + 3, y + 5)

  let cursor = y + 10
  doc.setFontSize(10)
  doc.setTextColor(...TEXT)
  for (const linea of caja.tituloLineas) {
    doc.text(linea, x + 3, cursor)
    cursor += 4.4
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  for (const linea of caja.detalle) {
    doc.text(linea, x + 3, cursor)
    cursor += 3.6
  }
}

const dibujarTituloSeccion = (doc, titulo, { y, pageWidth }) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(titulo, MARGIN, y + 3)
  doc.setDrawColor(...LINE)
  doc.line(MARGIN, y + 4.8, pageWidth - MARGIN, y + 4.8)
}

export const buildFormulaPdf = async ({ historia, clinica }) => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: MEDIA_CARTA, compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGIN * 2
  const altoCuerpo = alturaLinea(9)

  const logo = await cargarLogo(clinica?.logo)
  let y = dibujarEncabezado(doc, { clinica, logo }) + 2

  // Si el siguiente bloque no cabe, pasa entero a una pagina nueva en vez de
  // partirse o montarse sobre el pie.
  const reservar = (alto) => {
    if (y + alto > pageHeight - LIMITE_INFERIOR) {
      doc.addPage()
      y = MARGIN
    }
  }

  // ── Franja del documento ──
  const fechaConsulta = parseFecha(historia?.fechaConsulta)
  doc.setFillColor(...BRAND)
  doc.rect(MARGIN, y, anchoUtil, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('FÓRMULA MÉDICA VETERINARIA', MARGIN + 3, y + 5.4)
  if (fechaConsulta) {
    doc.setFont('helvetica', 'normal')
    doc.text(formatFechaCorta(fechaConsulta), pageWidth - MARGIN - 3, y + 5.4, { align: 'right' })
  }
  y += 12

  // ── Paciente y tutor ──
  const mascota = historia?.mascota || {}
  const propietario = historia?.propietario || {}
  const especie =
    mascota.especie === 'otro' && texto(mascota.especieDetalle)
      ? texto(mascota.especieDetalle)
      : ESPECIE_LABELS[mascota.especie] || texto(mascota.especie)
  const edad = calcularEdad(mascota.fechaNacimiento, fechaConsulta || new Date())

  const separacion = 4
  const anchoCaja = (anchoUtil - separacion) / 2
  const cajaPaciente = medirCaja(doc, {
    etiqueta: 'PACIENTE',
    titulo: texto(mascota.nombre) || 'Paciente',
    lineas: [
      [especie, texto(mascota.raza), SEXO_LABELS[mascota.sexo]].filter(Boolean).join(' · '),
      [edad && `Edad: ${edad}`, historia?.peso ? `Peso: ${formatNumero(historia.peso)} kg` : null]
        .filter(Boolean)
        .join(' · '),
    ].filter(Boolean),
    ancho: anchoCaja,
  })
  const cajaTutor = medirCaja(doc, {
    etiqueta: 'TUTOR',
    titulo: texto(propietario.nombre) || 'Sin tutor registrado',
    lineas: [texto(propietario.telefono) && `Tel. ${texto(propietario.telefono)}`].filter(Boolean),
    ancho: anchoCaja,
  })
  const altoCajas = Math.max(cajaPaciente.alto, cajaTutor.alto)
  dibujarCaja(doc, cajaPaciente, { x: MARGIN, y, ancho: anchoCaja, alto: altoCajas })
  dibujarCaja(doc, cajaTutor, { x: MARGIN + anchoCaja + separacion, y, ancho: anchoCaja, alto: altoCajas })
  y += altoCajas + 7

  // ── Medicamentos ──
  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  if (medicamentos.length) {
    const altoNombre = alturaLinea(10.5)
    const sangria = 7
    const anchoTexto = anchoUtil - sangria

    reservar(20)
    dibujarTituloSeccion(doc, 'MEDICAMENTOS', { y, pageWidth })
    y += 8

    medicamentos.forEach((item, indice) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      const titulo = texto(item.concentracion)
        ? `${texto(item.nombre)} (${texto(item.concentracion)})`
        : texto(item.nombre)
      const nombreLineas = doc.splitTextToSize(titulo, anchoTexto)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const posologia = describirPosologia(item)
      const posologiaLineas = posologia ? doc.splitTextToSize(posologia, anchoTexto) : []

      doc.setFont('helvetica', 'italic')
      const instrucciones = texto(item.indicacion || item.instrucciones)
      const instruccionesLineas = instrucciones ? doc.splitTextToSize(instrucciones, anchoTexto) : []

      reservar(
        4 + nombreLineas.length * altoNombre + (posologiaLineas.length + instruccionesLineas.length) * altoCuerpo + 3
      )

      let cursor = y + 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...BRAND)
      doc.text(`${indice + 1}.`, MARGIN, cursor)
      doc.setTextColor(...TEXT)
      for (const linea of nombreLineas) {
        doc.text(linea, MARGIN + sangria, cursor)
        cursor += altoNombre
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      for (const linea of posologiaLineas) {
        doc.text(linea, MARGIN + sangria, cursor)
        cursor += altoCuerpo
      }

      doc.setFont('helvetica', 'italic')
      doc.setTextColor(...MUTED)
      for (const linea of instruccionesLineas) {
        doc.text(linea, MARGIN + sangria, cursor)
        cursor += altoCuerpo
      }

      y = cursor
      if (indice < medicamentos.length - 1) {
        doc.setDrawColor(...LINE)
        doc.line(MARGIN + sangria, y - 1, pageWidth - MARGIN, y - 1)
        y += 1
      }
    })

    y += 4
  }

  // ── Indicaciones generales ──
  const indicaciones = texto(historia?.indicaciones)
  if (indicaciones) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lineas = doc.splitTextToSize(indicaciones, anchoUtil)

    // El titulo no se queda solo al final de una pagina.
    reservar(8 + Math.min(lineas.length, 3) * altoCuerpo)
    dibujarTituloSeccion(doc, 'INDICACIONES GENERALES', { y, pageWidth })
    y += 8

    for (const linea of lineas) {
      reservar(altoCuerpo)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...TEXT)
      doc.text(linea, MARGIN, y + 3)
      y += altoCuerpo
    }

    y += 4
  }

  // ── Proximo control ──
  const proximaConsulta = parseFechaLocal(historia?.proximaConsulta)
  if (proximaConsulta) {
    reservar(12)
    doc.setDrawColor(...BRAND)
    doc.setFillColor(...FONDO_CONTROL)
    doc.setLineWidth(0.4)
    doc.rect(MARGIN, y, anchoUtil, 10, 'FD')
    doc.setLineWidth(0.2)

    const etiqueta = 'Próximo control: '
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND)
    doc.text(etiqueta, MARGIN + 3, y + 6.3)
    const anchoEtiqueta = doc.getTextWidth(etiqueta)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT)
    doc.text(formatFechaLarga(proximaConsulta), MARGIN + 3 + anchoEtiqueta, y + 6.3)

    y += 14
  }

  // ── Profesional ──
  if (texto(historia?.veterinario?.nombre)) {
    reservar(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(`Médico veterinario: ${texto(historia.veterinario.nombre)}`, MARGIN, y + 3)
  }

  dibujarPie(doc, { clinica, pageWidth, pageHeight })

  return doc
}

export const descargarFormulaPdf = async ({ historia, clinica }) => {
  if (!historia) {
    toast.error('No hay historia para imprimir.')
    return
  }

  if (!tienePlanFarmacologico(historia)) {
    toast.error('Esta historia no tiene plan farmacológico para imprimir.')
    return
  }

  try {
    const doc = await buildFormulaPdf({ historia, clinica })
    doc.save(`Formula-${nombreArchivo(historia)}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la formula', error)
    toast.error('No se pudo generar el PDF de la fórmula.')
  }
}
