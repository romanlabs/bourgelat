import { LINE, MARGIN, MUTED, TEXT } from '@/lib/pdfComun'
import { NEGRO, alturaLinea, saltarSiNoCabe, texto } from '@/lib/pdfFormal'
import { VIA_LABELS } from './historiaConstants'
import { ESPECIE_LABELS } from '@/lib/especies'

// Piezas que comparten los PDFs que salen de una historia clinica (historia
// completa y formula para el tutor): formato de los datos del paciente y el
// bloque de medicamentos. Lo de composicion vive en lib/pdfFormal.

export { alturaLinea, saltarSiNoCabe, texto }

export const SEXO_LABELS = { macho: 'Macho', hembra: 'Hembra' }

export const TIPO_DOCUMENTO_LABELS = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PP: 'Pasaporte',
}

// Los campos cortos (nombre, raza, color) van con mayuscula inicial; los textos
// clinicos quedan tal como los escribio el veterinario.
export const capitalizar = (value) => {
  const valor = texto(value)
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : ''
}

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
    doc.setTextColor(...NEGRO)
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

