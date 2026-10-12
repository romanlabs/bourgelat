import { toast } from 'sonner'
import { LINE, MARGIN, MUTED, TEXT, cargarLogo, nombreClinica } from '@/lib/pdfComun'
import { CITA_TIPO_LABELS } from '@/features/dashboard/dashboardUtils'
import { HIDRATACION_LABELS, VIA_LABELS } from './historiaConstants'
import {
  SEXO_LABELS,
  alturaLinea,
  calcularEdad,
  describirEspecie,
  dibujarMedicamentos,
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

// La historia clinica de una consulta, para el archivo de la clinica, una
// remision o cuando el tutor la pide. Sigue el orden de una historia clinica
// humana (Resolucion 1995 de 1999): identificacion, registro de la atencion,
// anexos y firma. Nada queda en blanco: lo que no se lleno dice "No
// registrado", para que no se pueda escribir encima despues. Blanco y negro,
// tamano carta, para imprimir y fotocopiar.

// El pie ocupa los ultimos 20mm; se deja aire para que nada se le monte.
const LIMITE_INFERIOR = 23
const NEGRO = [17, 17, 17]
const CUERPO = 9.5

const TIPO_DOCUMENTO_LABELS = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PP: 'Pasaporte',
}

const formatHora = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha)

const formatFechaNumerica = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha)

const valorNumerico = (value, unidad) =>
  value === null || value === undefined || value === '' ? '' : `${formatNumero(value)}${unidad}`

// Los campos cortos (nombre, raza, color) van con mayuscula inicial; los textos
// clinicos quedan tal como los escribio el veterinario.
const capitalizar = (value) => {
  const valor = texto(value)
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : ''
}

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
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGIN * 2
  const derecha = pageWidth - MARGIN
  const altoCuerpo = alturaLinea(CUERPO)

  const mascota = historia?.mascota || {}
  const propietario = historia?.propietario || {}
  const fechaConsulta = parseFecha(historia?.fechaConsulta)
  const fechaApertura = parseFecha(mascota.createdAt)

  let y = MARGIN

  const reservar = (alto) => {
    y = saltarSiNoCabe(doc, { y, alto, limiteInferior: LIMITE_INFERIOR })
  }

  const fuente = (estilo, tamano, color = TEXT) => {
    doc.setFont('helvetica', estilo)
    doc.setFontSize(tamano)
    doc.setTextColor(...color)
  }

  // ── Encabezado institucional ──
  const logo = await cargarLogo(clinica?.logo)
  let textoX = MARGIN
  if (logo) {
    const alto = Math.min(16, 28 / logo.ratio)
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, y, alto * logo.ratio, alto)
    textoX = MARGIN + alto * logo.ratio + 4
  }
  const nombre = nombreClinica(clinica)
  fuente('bold', 14, NEGRO)
  doc.text(nombre, textoX, y + 5)
  fuente('normal', 8.5, MUTED)
  const datosClinica = [
    [clinica?.nit && `NIT ${clinica.nit}`, clinica?.direccion].filter(Boolean).join(' · '),
    [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', '),
    [clinica?.telefono && `Tel. ${clinica.telefono}`, clinica?.email].filter(Boolean).join(' · '),
  ].filter(Boolean)
  datosClinica.forEach((linea, n) => doc.text(linea, textoX, y + 9.5 + n * 3.8))

  fuente('bold', 12, NEGRO)
  doc.text('HISTORIA CLÍNICA', derecha, y + 5, { align: 'right', charSpace: 0.6 })
  fuente('normal', 8.5, MUTED)
  if (fechaApertura) {
    doc.text(`Fecha de apertura: ${formatFechaNumerica(fechaApertura)}`, derecha, y + 9.5, { align: 'right' })
  }

  y += Math.max(18, 9.5 + datosClinica.length * 3.8)
  doc.setDrawColor(...NEGRO)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, y, derecha, y)
  doc.setLineWidth(0.2)
  y += 2

  // ── Piezas de composicion ──
  const titulo = (nombreSeccion, altoMinimoContenido = altoCuerpo) => {
    // El titulo no se queda solo al final de una pagina.
    reservar(7.5 + altoMinimoContenido)
    y += 1.5
    fuente('bold', 7.5, NEGRO)
    doc.text(nombreSeccion.toUpperCase(), MARGIN, y + 3, { charSpace: 0.3 })
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, y + 4.6, derecha, y + 4.6)
    y += 6
  }

  // Parrafo libre que se parte entre paginas linea a linea. Vacio, se escribe
  // la constancia en cursiva.
  const parrafo = (valor, vacio = 'No registrado.') => {
    const contenido = texto(valor)
    const estilo = contenido ? 'normal' : 'italic'
    fuente(estilo, CUERPO)
    const lineas = doc.splitTextToSize(contenido || vacio, anchoUtil)
    for (const linea of lineas) {
      reservar(altoCuerpo)
      fuente(estilo, CUERPO, contenido ? TEXT : MUTED)
      doc.text(linea, MARGIN, y + 3)
      y += altoCuerpo
    }
  }

  const subtitulo = (nombreSub) => {
    reservar(5 + altoCuerpo)
    y += 1.5
    fuente('bold', 6.5, MUTED)
    doc.text(nombreSub.toUpperCase(), MARGIN, y + 2.5, { charSpace: 0.2 })
    y += 3.5
  }

  // Campos cortos: etiqueta pequena arriba y valor abajo, en columnas. Cada
  // campo es [etiqueta, valor, constancia si esta vacio, columnas que ocupa].
  const campos = (definiciones, columnas = 4) => {
    const anchoColumna = anchoUtil / columnas
    const filas = []
    let fila = []
    let ocupadas = 0
    for (const campo of definiciones) {
      const span = campo[3] || 1
      if (ocupadas + span > columnas) {
        filas.push(fila)
        fila = []
        ocupadas = 0
      }
      fila.push({ campo, columna: ocupadas, span })
      ocupadas += span
    }
    if (fila.length) filas.push(fila)

    for (const celdas of filas) {
      const medidas = celdas.map(({ campo: [etiqueta, valor, vacio = 'No registrado'], columna, span }) => {
        const contenido = texto(valor)
        fuente(contenido ? 'normal' : 'italic', CUERPO)
        return {
          etiqueta,
          contenido,
          x: MARGIN + columna * anchoColumna,
          lineas: doc.splitTextToSize(contenido || vacio, span * anchoColumna - 4),
        }
      })
      const alto = 2.4 + Math.max(...medidas.map((medida) => medida.lineas.length)) * altoCuerpo + 1
      reservar(alto)
      for (const medida of medidas) {
        fuente('bold', 6.5, MUTED)
        doc.text(medida.etiqueta.toUpperCase(), medida.x, y + 2.1, { charSpace: 0.2 })
        fuente(medida.contenido ? 'normal' : 'italic', CUERPO, medida.contenido ? TEXT : MUTED)
        medida.lineas.forEach((linea, n) => doc.text(linea, medida.x, y + 5.6 + n * altoCuerpo))
      }
      y += alto
    }
  }

  // ── Identificacion del paciente ──
  const edad = fechaConsulta ? calcularEdad(mascota.fechaNacimiento, fechaConsulta) : ''
  const fechaNacimiento = parseFechaLocal(mascota.fechaNacimiento)
  titulo('Identificación del paciente', 10)
  campos([
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
  titulo('Propietario o responsable', 10)
  campos([
    ['Nombre', propietario.nombre, 'No registrado', 2],
    ['Tipo y número de documento', documento, 'No registrado', 2],
    ['Dirección', [texto(propietario.direccion), texto(propietario.ciudad)].filter(Boolean).join(', '), 'No registrada', 2],
    ['Teléfono', propietario.telefono],
    ['Correo', propietario.email],
  ])

  // ── Datos de la atencion ──
  const tipoCita = historia?.cita?.tipoCita
  titulo('Datos de la atención', 10)
  campos([
    ['Fecha y hora', fechaConsulta && `${formatFechaLarga(fechaConsulta)}, ${formatHora(fechaConsulta)}`, 'No registrada', 2],
    ['Tipo de atención', tipoCita ? CITA_TIPO_LABELS[tipoCita] || texto(tipoCita) : 'Consulta'],
    ['Profesional', historia?.veterinario?.nombre],
  ])

  // ── Motivo, enfermedad actual y antecedentes ──
  titulo('Motivo de consulta')
  parrafo(historia?.motivoConsulta)

  titulo('Enfermedad actual (anamnesis)')
  parrafo(historia?.anamnesis)

  const antecedentes = describirAntecedentes(mascota.antecedentes)
  const observacionesAntecedentes = texto(mascota.antecedentes?.observacionesGenerales)
  titulo('Antecedentes')
  if (antecedentes.some(([, valor]) => valor) || observacionesAntecedentes) {
    // Todas las categorias son femeninas salvo los medicamentos.
    campos(antecedentes.map(([etiqueta, valor]) => [etiqueta, valor, etiqueta.startsWith('Medicamentos') ? 'No registrados' : 'No registradas', 2]))
    if (observacionesAntecedentes) {
      subtitulo('Observaciones')
      parrafo(observacionesAntecedentes)
    }
  } else {
    parrafo('', 'No registrados.')
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
  titulo('Examen físico', 10)
  if (signos.some(([, valor]) => texto(valor)) || hallazgos) {
    campos(signos)
    subtitulo('Hallazgos')
    parrafo(hallazgos, 'No registrados.')
  } else {
    parrafo('', 'No registrado.')
  }

  // ── Diagnostico ──
  titulo('Diagnóstico', 10)
  campos([
    ['Impresión diagnóstica (presuntivo)', historia?.diagnosticoPresuntivo, 'No registrada', 2],
    ['Diagnóstico confirmado', historia?.diagnostico, 'No registrado', 2],
  ])

  // ── Plan y conducta ──
  titulo('Plan y conducta')
  parrafo(historia?.tratamiento)

  const intrahospitalario = lista(historia?.tratamientoIntrahospitalario).filter((item) => texto(item.nombre))
  if (intrahospitalario.length) {
    subtitulo('Tratamiento intrahospitalario')
    for (const item of intrahospitalario) {
      fuente('bold', CUERPO)
      const nombreLineas = doc.splitTextToSize(texto(item.nombre), anchoUtil)
      fuente('normal', 9)
      const detalle = describirTratamientoIntrahospitalario(item)
      const detalleLineas = detalle ? doc.splitTextToSize(detalle, anchoUtil) : []
      reservar((nombreLineas.length + detalleLineas.length) * altoCuerpo + 1.5)
      fuente('bold', CUERPO)
      for (const linea of nombreLineas) {
        doc.text(linea, MARGIN, y + 3)
        y += altoCuerpo
      }
      fuente('normal', 9, MUTED)
      for (const linea of detalleLineas) {
        doc.text(linea, MARGIN, y + 3)
        y += altoCuerpo
      }
      y += 1.5
    }
  }

  const medicamentos = normalizarMedicamentos(historia?.medicamentos)
  subtitulo('Medicamentos formulados')
  if (medicamentos.length) {
    y = dibujarMedicamentos(doc, { medicamentos, y: y - 1, limiteInferior: LIMITE_INFERIOR })
  } else {
    parrafo('', 'No registrados.')
  }

  // ── Recomendaciones al propietario ──
  const proximaConsulta = parseFechaLocal(historia?.proximaConsulta)
  titulo('Recomendaciones al propietario', 10)
  campos([
    ['Indicaciones', historia?.indicaciones, 'No registradas', 3],
    ['Próximo control', proximaConsulta && formatFechaCorta(proximaConsulta), 'No registrado', 1],
  ])

  // ── Anexos ──
  // Anexos y firma van juntos: si la firma no cabe, los anexos pasan con ella a
  // la pagina siguiente, para que nunca quede una firma sola en una hoja.
  const ALTO_FIRMA = 19
  const examenes = lista(historia?.examenesDelDia)
  reservar(7.5 + (examenes.length ? 5 + examenes.length * altoCuerpo : altoCuerpo) + ALTO_FIRMA)
  titulo('Anexos')
  if (examenes.length) {
    subtitulo('Exámenes de laboratorio del día de la atención')
    for (const examen of examenes) {
      parrafo(
        [texto(examen.tipo), fechaCorta(examen.fecha), texto(examen.laboratorio), texto(examen.archivoNombre)]
          .filter(Boolean)
          .join(' · ')
      )
    }
  } else {
    parrafo('', 'Sin exámenes de laboratorio registrados el día de la atención.')
  }

  // ── Firma ──
  // Cierra el documento: va despues de los anexos para que los cubra.
  reservar(ALTO_FIRMA)
  y += 10
  doc.setDrawColor(...NEGRO)
  doc.line(MARGIN, y, MARGIN + 75, y)
  fuente('bold', CUERPO, NEGRO)
  doc.text(texto(historia?.veterinario?.nombre) || 'Médico veterinario', MARGIN, y + 4.5)
  const tarjeta = texto(historia?.veterinario?.tarjetaProfesional)
  fuente('normal', 8, MUTED)
  doc.text(`Médico veterinario · Tarjeta profesional N.º ${tarjeta || 'no registrada'}`, MARGIN, y + 8.5)
  doc.text(
    historia?.bloqueada
      ? ['Registro firmado y cerrado.', 'No admite modificaciones posteriores.']
      : ['Registro abierto: puede tener', 'cambios posteriores a esta copia.'],
    derecha,
    y + 4.5,
    { align: 'right' }
  )

  // ── Pie en todas las paginas ──
  const ahora = new Date()
  const identificacion = `${capitalizar(mascota.nombre) || 'Paciente'} · Historia clínica · ${nombre}`
  const impreso = `Impreso por ${texto(usuario?.nombre) || 'Bourgelat'} el ${formatFechaNumerica(ahora)} a las ${formatHora(ahora)} con Bourgelat.`
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, pageHeight - 20, derecha, pageHeight - 20)
    fuente('bold', 7, TEXT)
    doc.text(identificacion, MARGIN, pageHeight - 16)
    fuente('normal', 7, MUTED)
    doc.text(
      'Documento reservado. Solo puede darse a conocer al propietario del paciente o por orden de autoridad competente.',
      MARGIN,
      pageHeight - 12.5
    )
    doc.text(impreso, MARGIN, pageHeight - 9)
    doc.text(`Página ${pagina} de ${total}`, derecha, pageHeight - 16, { align: 'right' })
  }

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
    console.error('No se pudo generar el PDF de la historia clinica', error)
    toast.error('No se pudo generar el PDF de la historia clínica.')
  }
}
