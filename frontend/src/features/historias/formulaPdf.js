import { toast } from 'sonner'
import {
  BRAND,
  MARGIN,
  MUTED,
  TEXT,
  cargarLogo,
  dibujarEncabezado,
  dibujarPie,
} from '@/lib/pdfComun'
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
  formatNumero,
  nombreArchivo,
  normalizarMedicamentos,
  parseFecha,
  parseFechaLocal,
  saltarSiNoCabe,
  texto,
} from './historiaPdfComun'

// Lo que el tutor se lleva a casa: el plan farmacologico de la consulta con la
// posologia de cada medicamento, las indicaciones generales y el proximo
// control. Media carta, como una formula medica tradicional, para imprimirla o
// mandarla por WhatsApp. El diagnostico no va: se queda en la historia clinica.

const MEDIA_CARTA = [139.7, 215.9]
// El pie ocupa los ultimos 14mm; se deja aire para que nada se le monte.
const LIMITE_INFERIOR = 20

export const tienePlanFarmacologico = (historia) =>
  normalizarMedicamentos(historia?.medicamentos).length > 0 || texto(historia?.indicaciones).length > 0

export const buildFormulaPdf = async ({ historia, clinica }) => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: MEDIA_CARTA, compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGIN * 2
  const altoCuerpo = alturaLinea(9)

  const logo = await cargarLogo(clinica?.logo)
  let y = dibujarEncabezado(doc, { clinica, logo }) + 2

  const reservar = (alto) => {
    y = saltarSiNoCabe(doc, { y, alto, limiteInferior: LIMITE_INFERIOR })
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
  const edad = calcularEdad(mascota.fechaNacimiento, fechaConsulta || new Date())

  y = dibujarCajasPacienteTutor(doc, {
    y,
    anchoUtil,
    paciente: {
      titulo: texto(mascota.nombre) || 'Paciente',
      lineas: [
        [describirEspecie(mascota), texto(mascota.raza), SEXO_LABELS[mascota.sexo]].filter(Boolean).join(' · '),
        [edad && `Edad: ${edad}`, historia?.peso ? `Peso: ${formatNumero(historia.peso)} kg` : null]
          .filter(Boolean)
          .join(' · '),
      ].filter(Boolean),
    },
    tutor: {
      titulo: texto(propietario.nombre) || 'Sin tutor registrado',
      lineas: [texto(propietario.telefono) && `Tel. ${texto(propietario.telefono)}`].filter(Boolean),
    },
  })
  y += 7

  // ── Medicamentos ──
  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  if (medicamentos.length) {
    reservar(20)
    dibujarTituloSeccion(doc, 'MEDICAMENTOS', { y, pageWidth })
    y += 8
    y = dibujarMedicamentos(doc, { medicamentos, y, limiteInferior: LIMITE_INFERIOR })
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
    y = dibujarProximoControl(doc, { fecha: proximaConsulta, y })
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
