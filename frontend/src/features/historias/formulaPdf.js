import { toast } from 'sonner'
import { cargarLogo, nombreClinica } from '@/lib/pdfComun'
import {
  altoPie,
  crearCompositor,
  dibujarEncabezadoFormal,
  dibujarFirma,
  dibujarPieFormal,
  formatFechaNumerica,
  lineaImpreso,
} from '@/lib/pdfFormal'
import {
  SEXO_LABELS,
  calcularEdad,
  capitalizar,
  describirEspecie,
  dibujarMedicamentos,
  formatFechaCorta,
  formatNumero,
  formatNumeroHistoria,
  nombreArchivo,
  normalizarMedicamentos,
  parseFecha,
  parseFechaLocal,
  texto,
} from './historiaPdfComun'

// Lo que el tutor se lleva a casa: el plan farmacologico de la consulta con la
// posologia de cada medicamento, las indicaciones generales y el proximo
// control. Media carta, como una formula medica tradicional, para imprimirla o
// mandarla por WhatsApp. El diagnostico no va: se queda en la historia clinica.
// Mismo estilo formal de la historia, con la firma del veterinario.

const MEDIA_CARTA = [139.7, 215.9]

export const tienePlanFarmacologico = (historia) =>
  normalizarMedicamentos(historia?.medicamentos).length > 0 || texto(historia?.indicaciones).length > 0

export const buildFormulaPdf = async ({ historia, clinica, usuario }) => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: MEDIA_CARTA, compress: true })
  const lineasPie = [lineaImpreso(usuario)]
  const c = crearCompositor(doc, { limiteInferior: altoPie(doc, { lineas: lineasPie }), cuerpo: 9 })

  const mascota = historia?.mascota || {}
  const propietario = historia?.propietario || {}
  const fechaConsulta = parseFecha(historia?.fechaConsulta)

  dibujarEncabezadoFormal(doc, c, {
    clinica,
    logo: await cargarLogo(clinica?.logo),
    titulo: 'FÓRMULA MÉDICA',
    lineasDerecha: [
      formatNumeroHistoria(mascota.numeroHistoria) && `Historia N.º ${formatNumeroHistoria(mascota.numeroHistoria)}`,
      fechaConsulta && `Fecha: ${formatFechaNumerica(fechaConsulta)}`,
    ].filter(Boolean),
  })

  // ── Paciente y propietario ──
  const edad = calcularEdad(mascota.fechaNacimiento, fechaConsulta || new Date())
  c.titulo('Paciente', 10)
  c.campos(
    [
      ['Nombre', capitalizar(mascota.nombre)],
      ['Especie', describirEspecie(mascota), 'No registrada'],
      ['Raza', capitalizar(mascota.raza), 'No registrada'],
      ['Sexo', SEXO_LABELS[mascota.sexo]],
      ['Edad', edad, 'No registrada'],
      ['Peso', historia?.peso ? `${formatNumero(historia.peso)} kg` : ''],
    ],
    3
  )

  c.titulo('Propietario o responsable', 10)
  c.campos(
    [
      ['Nombre', propietario.nombre, 'No registrado', 2],
      ['Teléfono', propietario.telefono],
    ],
    3
  )

  // ── Medicamentos ──
  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  c.titulo('Medicamentos', 14)
  if (medicamentos.length) {
    c.y = dibujarMedicamentos(doc, { medicamentos, y: c.y - 1, limiteInferior: c.limiteInferior })
  } else {
    c.parrafo('', 'No registrados.')
  }

  // ── Indicaciones y proximo control ──
  c.titulo('Indicaciones generales')
  c.parrafo(historia?.indicaciones, 'No registradas.')

  const proximaConsulta = parseFechaLocal(historia?.proximaConsulta)
  c.titulo('Próximo control', 6)
  c.parrafo(proximaConsulta && formatFechaCorta(proximaConsulta), 'No registrado.')

  // ── Firma ──
  dibujarFirma(doc, c, {
    nombre: texto(historia?.veterinario?.nombre) || 'Médico veterinario',
    cargo: `Médico veterinario · Tarjeta profesional N.º ${texto(historia?.veterinario?.tarjetaProfesional) || 'no registrada'}`,
  })

  dibujarPieFormal(doc, c, {
    identificacion: `${capitalizar(mascota.nombre) || 'Paciente'} · Fórmula médica · ${nombreClinica(clinica)}`,
    lineas: lineasPie,
  })

  return doc
}

export const descargarFormulaPdf = async ({ historia, clinica, usuario }) => {
  if (!historia) {
    toast.error('No hay historia para imprimir.')
    return
  }

  if (!tienePlanFarmacologico(historia)) {
    toast.error('Esta historia no tiene plan farmacológico para imprimir.')
    return
  }

  try {
    const doc = await buildFormulaPdf({ historia, clinica, usuario })
    doc.save(`Formula-${nombreArchivo(historia)}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la fórmula', error)
    toast.error('No se pudo generar el PDF de la fórmula.')
  }
}
