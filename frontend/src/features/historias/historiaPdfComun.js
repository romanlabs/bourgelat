import { BRAND, LINE, MARGIN, MUTED, TEXT } from '@/lib/pdfComun'
import { VIA_LABELS } from './historiaConstants'

// Piezas que comparten los PDFs que salen de una historia clinica (formula
// para el tutor, historia completa): formato de datos del paciente, cajas,
// titulos de seccion y el bloque de medicamentos.

export const FONDO_SUAVE = [248, 250, 252]
export const FONDO_CONTROL = [236, 244, 250]

export const ESPECIE_LABELS = {
  perro: 'Perro',
  gato: 'Gato',
  ave: 'Ave',
  conejo: 'Conejo',
  reptil: 'Reptil',
  otro: 'Otro',
}

export const SEXO_LABELS = { macho: 'Macho', hembra: 'Hembra' }

// Alto de linea en mm para un tamano de fuente en puntos.
export const alturaLinea = (fontSize) => fontSize * 0.3528 * 1.25

export const texto = (value) => String(value ?? '').trim()

// Las historias antiguas guardaban cada medicamento como texto plano.
export const normalizarMedicamentos = (medicamentos) =>
  (Array.isArray(medicamentos) ? medicamentos : [])
    .map((item) => (typeof item === 'string' ? { nombre: item } : item))
    .filter((item) => item && typeof item === 'object' && texto(item.nombre))

// `proximaConsulta` y `fechaNacimiento` son DATEONLY: new Date('AAAA-MM-DD') los
// leeria en UTC y en Colombia mostraria el dia anterior.
export const parseFechaLocal = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export const parseFecha = (value) => {
  const fecha = value ? new Date(value) : null
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha : null
}

export const formatFechaLarga = (fecha) => {
  const valor = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
  return valor.charAt(0).toUpperCase() + valor.slice(1)
}

export const formatFechaCorta = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)

export const formatNumero = (value) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(value))

// Edad a la fecha de la consulta, que es la que importa para la dosis.
export const calcularEdad = (fechaNacimiento, referencia) => {
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

export const describirEspecie = (mascota) =>
  mascota?.especie === 'otro' && texto(mascota.especieDetalle)
    ? texto(mascota.especieDetalle)
    : ESPECIE_LABELS[mascota?.especie] || texto(mascota?.especie)

export const describirPosologia = (item) =>
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

export const nombreArchivo = (historia) => {
  const mascota = String(historia?.mascota?.nombre || 'paciente')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
  const fecha = parseFecha(historia?.fechaConsulta)
  if (!fecha) return mascota
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${mascota}-${fecha.getFullYear()}-${mes}-${dia}`
}

// Si el siguiente bloque no cabe, pasa entero a una pagina nueva en vez de
// partirse o montarse sobre el pie. Devuelve la `y` donde dibujar.
export const saltarSiNoCabe = (doc, { y, alto, limiteInferior }) => {
  if (y + alto > doc.internal.pageSize.getHeight() - limiteInferior) {
    doc.addPage()
    return MARGIN
  }
  return y
}

// Las cajas de paciente y tutor van lado a lado; se miden antes de dibujar
// para que ambas queden del mismo alto aunque una envuelva mas lineas.
export const medirCaja = (doc, { etiqueta, titulo, lineas, ancho }) => {
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

export const dibujarCaja = (doc, caja, { x, y, ancho, alto }) => {
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

// Paciente y tutor lado a lado, del mismo alto. Devuelve la `y` siguiente.
export const dibujarCajasPacienteTutor = (doc, { y, anchoUtil, paciente, tutor }) => {
  const separacion = 4
  const ancho = (anchoUtil - separacion) / 2
  const cajaPaciente = medirCaja(doc, { etiqueta: 'PACIENTE', ...paciente, ancho })
  const cajaTutor = medirCaja(doc, { etiqueta: 'TUTOR', ...tutor, ancho })
  const alto = Math.max(cajaPaciente.alto, cajaTutor.alto)
  dibujarCaja(doc, cajaPaciente, { x: MARGIN, y, ancho, alto })
  dibujarCaja(doc, cajaTutor, { x: MARGIN + ancho + separacion, y, ancho, alto })
  return y + alto
}

export const dibujarTituloSeccion = (doc, titulo, { y, pageWidth }) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(titulo, MARGIN, y + 3)
  doc.setDrawColor(...LINE)
  doc.line(MARGIN, y + 4.8, pageWidth - MARGIN, y + 4.8)
}

// Lista numerada de medicamentos con su posologia. Cada medicamento se mueve
// entero a la pagina siguiente si no cabe. Devuelve la `y` siguiente.
export const dibujarMedicamentos = (doc, { medicamentos, y: yInicial, limiteInferior }) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const anchoUtil = pageWidth - MARGIN * 2
  const altoCuerpo = alturaLinea(9)
  const altoNombre = alturaLinea(10.5)
  const sangria = 7
  const anchoTexto = anchoUtil - sangria
  let y = yInicial

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

    y = saltarSiNoCabe(doc, {
      y,
      alto:
        4 + nombreLineas.length * altoNombre + (posologiaLineas.length + instruccionesLineas.length) * altoCuerpo + 3,
      limiteInferior,
    })

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

  return y
}

// Recuadro destacado con la fecha del proximo control. Devuelve la `y` siguiente.
export const dibujarProximoControl = (doc, { fecha, y }) => {
  const anchoUtil = doc.internal.pageSize.getWidth() - MARGIN * 2
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
  doc.text(formatFechaLarga(fecha), MARGIN + 3 + anchoEtiqueta, y + 6.3)

  return y + 14
}
