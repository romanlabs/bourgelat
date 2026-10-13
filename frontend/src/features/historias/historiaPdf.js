import { toast } from 'sonner'
import { MARGIN, MUTED, cargarLogo, nombreClinica } from '@/lib/pdfComun'
import {
  ALTO_FIRMA,
  AVISO_RESERVA,
  altoPie,
  crearCompositor,
  dibujarEncabezadoFormal,
  dibujarFirma,
  dibujarPieFormal,
  formatFechaNumerica,
  formatHora,
  lineaImpreso,
} from '@/lib/pdfFormal'
import { CITA_TIPO_LABELS } from '@/features/dashboard/dashboardUtils'
import { HIDRATACION_LABELS, VIA_LABELS } from './historiaConstants'
import {
  SEXO_LABELS,
  TIPO_DOCUMENTO_LABELS,
  calcularEdad,
  capitalizar,
  describirEspecie,
  dibujarMedicamentos,
  formatFechaCorta,
  formatFechaLarga,
  formatNumeroHistoria,
  formatNumero,
  nombreArchivo,
  normalizarMedicamentos,
  parseFecha,
  parseFechaLocal,
  texto,
} from './historiaPdfComun'

// La historia clinica de una consulta, para el archivo de la clinica, una
// remision o cuando el tutor la pide. Sigue el orden de una historia clinica
// humana (Resolucion 1995 de 1999): identificacion, registro de la atencion,
// anexos y firma. Nada queda en blanco: lo que no se lleno dice "No
// registrado", para que no se pueda escribir encima despues. Blanco y negro,
// tamano carta, para imprimir y fotocopiar.

const valorNumerico = (value, unidad) =>
  value === null || value === undefined || value === '' ? '' : `${formatNumero(value)}${unidad}`

const lista = (valor) => (Array.isArray(valor) ? valor.filter((item) => item && typeof item === 'object') : [])

const fechaCorta = (value) => {
  const fecha = parseFechaLocal(value)
  return fecha ? formatFechaCorta(fecha) : ''
}

// Cada antecedente se resume en una linea: nombre y sus datos utiles.
const ANTECEDENTES = [
  ['Alergias', 'alergias', (a) => [texto(a.descripcion) || texto(a.tipo), texto(a.reaccion) && `reacción: ${texto(a.reaccion)}`]],
  ['Enfermedades previas', 'enfermedadesPrevias', (e) => [texto(e.nombre), fechaCorta(e.fechaDiagnostico), e.resuelto ? 'resuelta' : '']],
  ['Cirugías', 'cirugias', (c) => [texto(c.nombre), fechaCorta(c.fecha)]],
  ['Vacunas', 'vacunas', (v) => [texto(v.nombre), fechaCorta(v.fecha)]],
  ['Desparasitaciones', 'desparasitaciones', (d) => [texto(d.producto) || texto(d.tipo), fechaCorta(d.fecha)]],
  ['Condiciones crónicas', 'condicionesCronicas', (c) => [texto(c.nombre), texto(c.tratamientoActual)]],
  ['Medicamentos actuales', 'medicamentosActuales', (m) => [texto(m.nombre), texto(m.dosis), texto(m.frecuencia)]],
]

const describirAntecedentes = (antecedentes) =>
  ANTECEDENTES.map(([etiqueta, campo, describir]) => [
    etiqueta,
    lista(antecedentes?.[campo])
      .map((item) => describir(item).filter(Boolean).join(', '))
      .filter(Boolean)
      .join('; '),
  ])

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

export const buildHistoriaPdf = async ({ historia, clinica, usuario }) => {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'letter', compress: true })
  const lineasPie = [AVISO_RESERVA, lineaImpreso(usuario)]
  const c = crearCompositor(doc, { limiteInferior: altoPie(doc, { lineas: lineasPie }) })

  const mascota = historia?.mascota || {}
  const propietario = historia?.propietario || {}
  const fechaConsulta = parseFecha(historia?.fechaConsulta)
  const fechaApertura = parseFecha(mascota.createdAt)
  const numeroHistoria = formatNumeroHistoria(mascota.numeroHistoria)
  const bloqueadaEn = parseFecha(historia?.bloqueadaEn)

  dibujarEncabezadoFormal(doc, c, {
    clinica,
    logo: await cargarLogo(clinica?.logo),
    titulo: 'HISTORIA CLÍNICA',
    lineasDerecha: [
      numeroHistoria && `N.º ${numeroHistoria}`,
      fechaApertura && `Fecha de apertura: ${formatFechaNumerica(fechaApertura)}`,
    ].filter(Boolean),
  })

  // ── Identificacion del paciente ──
  const edad = fechaConsulta ? calcularEdad(mascota.fechaNacimiento, fechaConsulta) : ''
  const fechaNacimiento = parseFechaLocal(mascota.fechaNacimiento)
  c.titulo('Identificación del paciente', 10)
  c.campos([
    ['Nombre', capitalizar(mascota.nombre)],
    ['Especie', describirEspecie(mascota), 'No registrada'],
    ['Raza', capitalizar(mascota.raza), 'No registrada'],
    ['Sexo', SEXO_LABELS[mascota.sexo]],
    ['Fecha de nacimiento', fechaNacimiento && formatFechaCorta(fechaNacimiento), 'No registrada'],
    ['Edad a la atención', edad, 'No registrada'],
    ['Color', capitalizar(mascota.color)],
    ['Esterilizado', mascota.esterilizado === true ? 'Sí' : mascota.esterilizado === false ? 'No' : ''],
  ])

  // ── Propietario o responsable ──
  const documento = texto(propietario.numeroDocumento)
    ? `${TIPO_DOCUMENTO_LABELS[propietario.tipoDocumento] || texto(propietario.tipoDocumento)} ${texto(propietario.numeroDocumento)}`
    : ''
  c.titulo('Propietario o responsable', 10)
  c.campos([
    ['Nombre', propietario.nombre, 'No registrado', 2],
    ['Tipo y número de documento', documento, 'No registrado', 2],
    ['Dirección', [texto(propietario.direccion), texto(propietario.ciudad)].filter(Boolean).join(', '), 'No registrada', 2],
    ['Teléfono', propietario.telefono],
    ['Correo', propietario.email],
  ])

  // ── Datos de la atencion ──
  const tipoCita = historia?.cita?.tipoCita
  c.titulo('Datos de la atención', 10)
  c.campos([
    ['Fecha y hora', fechaConsulta && `${formatFechaLarga(fechaConsulta)}, ${formatHora(fechaConsulta)}`, 'No registrada', 2],
    ['Tipo de atención', tipoCita ? CITA_TIPO_LABELS[tipoCita] || texto(tipoCita) : 'Consulta'],
    ['Profesional', historia?.veterinario?.nombre],
  ])

  // ── Motivo, enfermedad actual y antecedentes ──
  c.titulo('Motivo de consulta')
  c.parrafo(historia?.motivoConsulta)

  c.titulo('Enfermedad actual (anamnesis)')
  c.parrafo(historia?.anamnesis)

  const antecedentes = describirAntecedentes(mascota.antecedentes)
  const observacionesAntecedentes = texto(mascota.antecedentes?.observacionesGenerales)
  c.titulo('Antecedentes')
  if (antecedentes.some(([, valor]) => valor) || observacionesAntecedentes) {
    // Todas las categorias son femeninas salvo los medicamentos.
    c.campos(
      antecedentes.map(([etiqueta, valor]) => [
        etiqueta,
        valor,
        etiqueta.startsWith('Medicamentos') ? 'No registrados' : 'No registradas',
        2,
      ])
    )
    if (observacionesAntecedentes) {
      c.subtitulo('Observaciones')
      c.parrafo(observacionesAntecedentes)
    }
  } else {
    c.parrafo('', 'No registrados.')
  }

  // ── Examen fisico ──
  // Si no se registro nada, una sola constancia en vez de siete campos vacios.
  const signos = [
    ['Peso', valorNumerico(historia?.peso, ' kg')],
    ['Temperatura', valorNumerico(historia?.temperatura, ' °C'), 'No registrada'],
    ['Frecuencia cardiaca', valorNumerico(historia?.frecuenciaCardiaca, ' lpm'), 'No registrada'],
    ['Frecuencia respiratoria', valorNumerico(historia?.frecuenciaRespiratoria, ' rpm'), 'No registrada'],
    ['Condición corporal', valorNumerico(historia?.condicionCorporal, ' de 5'), 'No registrada'],
    ['Mucosas', capitalizar(historia?.mucosas), 'No registradas'],
    ['Hidratación', HIDRATACION_LABELS[historia?.estadoHidratacion] || texto(historia?.estadoHidratacion), 'No registrada'],
  ]
  const hallazgos = texto(historia?.examenFisicoDetalle)
  c.titulo('Examen físico', 10)
  if (signos.some(([, valor]) => texto(valor)) || hallazgos) {
    c.campos(signos)
    c.subtitulo('Hallazgos')
    c.parrafo(hallazgos, 'No registrados.')
  } else {
    c.parrafo('', 'No registrado.')
  }

  // ── Diagnostico ──
  c.titulo('Diagnóstico', 10)
  c.campos([
    ['Impresión diagnóstica (presuntivo)', historia?.diagnosticoPresuntivo, 'No registrada', 2],
    ['Diagnóstico confirmado', historia?.diagnostico, 'No registrado', 2],
  ])

  // ── Plan y conducta ──
  c.titulo('Plan y conducta')
  c.parrafo(historia?.tratamiento)

  const intrahospitalario = lista(historia?.tratamientoIntrahospitalario).filter((item) => texto(item.nombre))
  if (intrahospitalario.length) {
    c.subtitulo('Tratamiento intrahospitalario')
    for (const item of intrahospitalario) {
      c.fuente('bold', c.cuerpo)
      const nombreLineas = doc.splitTextToSize(texto(item.nombre), c.anchoUtil)
      c.fuente('normal', 9)
      const detalle = describirTratamientoIntrahospitalario(item)
      const detalleLineas = detalle ? doc.splitTextToSize(detalle, c.anchoUtil) : []
      c.reservar((nombreLineas.length + detalleLineas.length) * c.altoCuerpo + 1.5)
      c.fuente('bold', c.cuerpo)
      for (const linea of nombreLineas) {
        doc.text(linea, MARGIN, c.y + 3)
        c.y += c.altoCuerpo
      }
      c.fuente('normal', 9, MUTED)
      for (const linea of detalleLineas) {
        doc.text(linea, MARGIN, c.y + 3)
        c.y += c.altoCuerpo
      }
      c.y += 1.5
    }
  }

  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  c.subtitulo('Medicamentos formulados')
  if (medicamentos.length) {
    c.y = dibujarMedicamentos(doc, { medicamentos, y: c.y - 1, limiteInferior: c.limiteInferior })
  } else {
    c.parrafo('', 'No registrados.')
  }

  // ── Recomendaciones al propietario ──
  const proximaConsulta = parseFechaLocal(historia?.proximaConsulta)
  c.titulo('Recomendaciones al propietario', 10)
  c.campos([
    ['Indicaciones', historia?.indicaciones, 'No registradas', 3],
    ['Próximo control', proximaConsulta && formatFechaCorta(proximaConsulta), 'No registrado', 1],
  ])

  // ── Anexos ──
  // Anexos y firma van juntos: si la firma no cabe, los anexos pasan con ella a
  // la pagina siguiente, para que nunca quede una firma sola en una hoja.
  const examenes = lista(historia?.examenesDelDia)
  c.reservar(7.5 + (examenes.length ? 5 + examenes.length * c.altoCuerpo : c.altoCuerpo) + ALTO_FIRMA)
  c.titulo('Anexos')
  if (examenes.length) {
    c.subtitulo('Exámenes de laboratorio del día de la atención')
    for (const examen of examenes) {
      c.parrafo(
        [texto(examen.tipo), fechaCorta(examen.fecha), texto(examen.laboratorio), texto(examen.archivoNombre)]
          .filter(Boolean)
          .join(' · ')
      )
    }
  } else {
    c.parrafo('', 'Sin exámenes de laboratorio registrados el día de la atención.')
  }

  // ── Firma ──
  // Cierra el documento: va despues de los anexos para que los cubra.
  dibujarFirma(doc, c, {
    nombre: texto(historia?.veterinario?.nombre) || 'Médico veterinario',
    cargo: `Médico veterinario · Tarjeta profesional N.º ${texto(historia?.veterinario?.tarjetaProfesional) || 'no registrada'}`,
    notaDerecha: historia?.bloqueada
      ? [
          bloqueadaEn
            ? // La hora ya termina en punto ("p. m."): no se agrega otro.
              `Firmado y cerrado el ${formatFechaNumerica(bloqueadaEn)} a las ${formatHora(bloqueadaEn)}`.replace(/\.?$/, '.')
            : 'Registro firmado y cerrado.',
          'No admite modificaciones posteriores.',
        ]
      : ['Registro abierto: puede tener', 'cambios posteriores a esta copia.'],
  })

  dibujarPieFormal(doc, c, {
    identificacion: [
      capitalizar(mascota.nombre) || 'Paciente',
      numeroHistoria ? `Historia clínica N.º ${numeroHistoria}` : 'Historia clínica',
      nombreClinica(clinica),
    ].join(' · '),
    lineas: lineasPie,
  })

  return doc
}

export const descargarHistoriaPdf = async ({ historia, clinica, usuario }) => {
  if (!historia) {
    toast.error('No hay historia para imprimir.')
    return
  }

  try {
    const doc = await buildHistoriaPdf({ historia, clinica, usuario })
    doc.save(`Historia-${nombreArchivo(historia)}.pdf`)
  } catch (error) {
    console.error('No se pudo generar el PDF de la historia clínica', error)
    toast.error('No se pudo generar el PDF de la historia clínica.')
  }
}
