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
import { CITA_TIPO_LABELS } from '@/features/dashboard/dashboardUtils'
import { HIDRATACION_LABELS, VIA_LABELS } from './historiaConstants'
import {
  SEXO_LABELS,
  alturaLinea,
  calcularEdad,
  describirEspecie,
  dibujarCajasPacienteTutor,
  dibujarMedicamentos,
  dibujarProximoControl,
  dibujarTituloSeccion,
  formatFechaCorta,
  formatFechaLarga,
  formatNumero,
  nombreArchivo,
  normalizarMedicamentos,
  parseFecha,
  parseFechaLocal,
  saltarSiNoCabe,
  texto,
} from './historiaPdfComun'

// La historia clinica completa de una consulta, para el archivo de la clinica,
// una remision o cuando el tutor la pide. A diferencia de la formula, lleva
// anamnesis, examen fisico y diagnostico. Carta, como cualquier documento
// clinico. Las secciones vacias no se imprimen.

// El pie ocupa los ultimos 14mm; se deja aire para que nada se le monte.
const LIMITE_INFERIOR = 20

const formatHora = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha)

const valorNumerico = (value, unidad) =>
  value === null || value === undefined || value === '' ? null : `${formatNumero(value)}${unidad}`

const describirTratamientoIntrahospitalario = (item) => {
  const aplicado = parseFecha(item.aplicadoEn)
  return [
    texto(item.cantidad) && [formatNumero(item.cantidad), texto(item.unidadBase)].filter(Boolean).join(' '),
    texto(item.via) && `Vía: ${VIA_LABELS[item.via] || texto(item.via)}`,
    aplicado && `Aplicado: ${formatFechaCorta(aplicado)}, ${formatHora(aplicado)}`,
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export const buildHistoriaPdf = async ({ historia, clinica }) => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGIN * 2
  const altoCuerpo = alturaLinea(9.5)

  const logo = await cargarLogo(clinica?.logo)
  let y = dibujarEncabezado(doc, { clinica, logo }) + 2

  const reservar = (alto) => {
    y = saltarSiNoCabe(doc, { y, alto, limiteInferior: LIMITE_INFERIOR })
  }

  const titulo = (nombre, altoMinimoContenido = altoCuerpo) => {
    // El titulo no se queda solo al final de una pagina.
    reservar(8 + altoMinimoContenido)
    dibujarTituloSeccion(doc, nombre, { y, pageWidth })
    y += 8
  }

  // Parrafo de texto libre que puede partirse entre paginas linea a linea.
  const parrafo = (valor) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const lineas = doc.splitTextToSize(valor, anchoUtil)
    for (const linea of lineas) {
      reservar(altoCuerpo)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(...TEXT)
      doc.text(linea, MARGIN, y + 3)
      y += altoCuerpo
    }
    return lineas.length
  }

  const seccionTexto = (nombre, valor) => {
    const contenido = texto(valor)
    if (!contenido) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    const lineas = doc.splitTextToSize(contenido, anchoUtil).length
    titulo(nombre, Math.min(lineas, 3) * altoCuerpo)
    parrafo(contenido)
    y += 5
  }

  // Rejilla de datos cortos (etiqueta arriba, valor abajo), de a `columnas`
  // por fila. Cada fila se mueve entera si no cabe.
  const rejilla = (datos, columnas = 4) => {
    const anchoCelda = anchoUtil / columnas
    for (let inicio = 0; inicio < datos.length; inicio += columnas) {
      const fila = datos.slice(inicio, inicio + columnas).map(([etiqueta, valor]) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        return { etiqueta, lineas: doc.splitTextToSize(valor, anchoCelda - 4) }
      })
      const alto = 5 + Math.max(...fila.map((celda) => celda.lineas.length)) * altoCuerpo + 2
      reservar(alto)
      fila.forEach((celda, indice) => {
        const x = MARGIN + indice * anchoCelda
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        doc.text(celda.etiqueta.toUpperCase(), x, y + 3)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(...TEXT)
        celda.lineas.forEach((linea, n) => doc.text(linea, x, y + 7.5 + n * altoCuerpo))
      })
      y += alto
    }
  }

  // ── Franja del documento ──
  const fechaConsulta = parseFecha(historia?.fechaConsulta)
  doc.setFillColor(...BRAND)
  doc.rect(MARGIN, y, anchoUtil, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('HISTORIA CLÍNICA VETERINARIA', MARGIN + 3, y + 5.4)
  if (fechaConsulta) {
    doc.setFont('helvetica', 'normal')
    doc.text(formatFechaCorta(fechaConsulta), pageWidth - MARGIN - 3, y + 5.4, { align: 'right' })
  }
  y += 12

  // ── Paciente y tutor ──
  const mascota = historia?.mascota || {}
  const propietario = historia?.propietario || {}
  const edad = calcularEdad(mascota.fechaNacimiento, fechaConsulta || new Date())

  y = dibujarCajasPacienteTutor(doc, {
    y,
    anchoUtil,
    paciente: {
      titulo: texto(mascota.nombre) || 'Paciente',
      lineas: [
        [describirEspecie(mascota), texto(mascota.raza), SEXO_LABELS[mascota.sexo]].filter(Boolean).join(' · '),
        edad && `Edad a la consulta: ${edad}`,
      ].filter(Boolean),
    },
    tutor: {
      titulo: texto(propietario.nombre) || 'Sin tutor registrado',
      lineas: [
        texto(propietario.telefono) && `Tel. ${texto(propietario.telefono)}`,
        texto(propietario.email),
      ].filter(Boolean),
    },
  })
  y += 7

  // ── Datos de la consulta ──
  const tipoCita = historia?.cita?.tipoCita
  const datosConsulta = [
    fechaConsulta && ['Fecha', `${formatFechaLarga(fechaConsulta)}, ${formatHora(fechaConsulta)}`],
    texto(historia?.veterinario?.nombre) && ['Médico veterinario', texto(historia.veterinario.nombre)],
    tipoCita && ['Tipo de cita', CITA_TIPO_LABELS[tipoCita] || texto(tipoCita)],
    ['Estado', historia?.bloqueada ? 'Bloqueada' :'Abierta (editable)'],
  ].filter(Boolean)
  titulo('DATOS DE LA CONSULTA', 12)
  rejilla(datosConsulta, 2)
  y += 3

  // ── Motivo y anamnesis ──
  seccionTexto('MOTIVO DE CONSULTA', historia?.motivoConsulta)
  seccionTexto('ANAMNESIS', historia?.anamnesis)

  // ── Examen fisico ──
  const signos = [
    ['Peso', valorNumerico(historia?.peso, ' kg')],
    ['Temperatura', valorNumerico(historia?.temperatura, ' °C')],
    ['Frec. cardiaca', valorNumerico(historia?.frecuenciaCardiaca, ' lpm')],
    ['Frec. respiratoria', valorNumerico(historia?.frecuenciaRespiratoria, ' rpm')],
    ['Condición corporal', valorNumerico(historia?.condicionCorporal, ' / 5')],
    ['Mucosas', texto(historia?.mucosas) || null],
    [
      'Hidratación',
      HIDRATACION_LABELS[historia?.estadoHidratacion] || texto(historia?.estadoHidratacion) || null,
    ],
  ].filter(([, valor]) => valor)
  const detalleExamen = texto(historia?.examenFisicoDetalle)
  if (signos.length || detalleExamen) {
    titulo('EXAMEN FÍSICO', 12)
    if (signos.length) {
      rejilla(signos)
      y += 2
    }
    if (detalleExamen) parrafo(detalleExamen)
    y += 5
  }

  // ── Diagnostico y tratamiento ──
  seccionTexto('DIAGNÓSTICO', historia?.diagnostico)
  seccionTexto('DIAGNÓSTICO PRESUNTIVO', historia?.diagnosticoPresuntivo)
  seccionTexto('TRATAMIENTO', historia?.tratamiento)

  // ── Tratamiento intrahospitalario ──
  const intrahospitalario = (
    Array.isArray(historia?.tratamientoIntrahospitalario) ? historia.tratamientoIntrahospitalario : []
  ).filter((item) => item && typeof item === 'object' && texto(item.nombre))
  if (intrahospitalario.length) {
    titulo('TRATAMIENTO INTRAHOSPITALARIO', 10)
    for (const item of intrahospitalario) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      const nombreLineas = doc.splitTextToSize(texto(item.nombre), anchoUtil)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const detalle = describirTratamientoIntrahospitalario(item)
      const detalleLineas = detalle ? doc.splitTextToSize(detalle, anchoUtil) : []
      reservar((nombreLineas.length + detalleLineas.length) * altoCuerpo + 2)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...TEXT)
      for (const linea of nombreLineas) {
        doc.text(linea, MARGIN, y + 3)
        y += altoCuerpo
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      for (const linea of detalleLineas) {
        doc.text(linea, MARGIN, y + 3)
        y += altoCuerpo
      }
      y += 2
    }
    y += 3
  }

  // ── Plan farmacologico ──
  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  if (medicamentos.length) {
    titulo('PLAN FARMACOLÓGICO', 12)
    y = dibujarMedicamentos(doc, { medicamentos, y, limiteInferior: LIMITE_INFERIOR })
    y += 5
  }

  // ── Indicaciones y proximo control ──
  seccionTexto('INDICACIONES', historia?.indicaciones)

  const proximaConsulta = parseFechaLocal(historia?.proximaConsulta)
  if (proximaConsulta) {
    reservar(12)
    y = dibujarProximoControl(doc, { fecha: proximaConsulta, y })
  }

  // ── Firma ──
  const veterinario = texto(historia?.veterinario?.nombre)
  if (veterinario) {
    reservar(26)
    const anchoFirma = 70
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, y + 16, MARGIN + anchoFirma, y + 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT)
    doc.text(veterinario, MARGIN, y + 21)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('Médico veterinario', MARGIN, y + 25)
  }

  dibujarPie(doc, { clinica, pageWidth, pageHeight })

  return doc
}

export const descargarHistoriaPdf = async ({ historia, clinica }) => {
  if (!historia) {
    toast.error('No hay historia para imprimir.')
    return
  }

  try {
    const doc = await buildHistoriaPdf({ historia, clinica })
    doc.save(`Historia-${nombreArchivo(historia)}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la historia clinica', error)
    toast.error('No se pudo generar el PDF de la historia clínica.')
  }
}
