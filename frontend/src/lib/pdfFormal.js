import { LINE, MARGIN, MUTED, TEXT, nombreClinica } from '@/lib/pdfComun'

// Piezas del estilo formal que comparten la historia clinica, la formula y la
// factura: blanco y negro, encabezado institucional, secciones con una linea
// fina, campos con la etiqueta pequena arriba, firma y pie con la
// identificacion del documento en cada hoja. Nada queda en blanco: un campo
// vacio se escribe con su constancia ("No registrado").

export const NEGRO = [17, 17, 17]

// Alto de linea en mm para un tamano de fuente en puntos.
export const alturaLinea = (fontSize) => fontSize * 0.3528 * 1.25

export const texto = (value) => String(value ?? '').trim()

// Si el siguiente bloque no cabe, pasa entero a una pagina nueva en vez de
// partirse o montarse sobre el pie. Devuelve la `y` donde dibujar.
export const saltarSiNoCabe = (doc, { y, alto, limiteInferior }) => {
  if (y + alto > doc.internal.pageSize.getHeight() - limiteInferior) {
    doc.addPage()
    return MARGIN
  }
  return y
}

export const formatHora = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(fecha)

export const formatFechaNumerica = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha)

export const lineaImpreso = (usuario) => {
  const ahora = new Date()
  return `Impreso por ${texto(usuario?.nombre) || 'Bourgelat'} el ${formatFechaNumerica(ahora)} a las ${formatHora(ahora)} con Bourgelat.`
}

export const AVISO_RESERVA =
  'Documento reservado. Solo puede darse a conocer al propietario del paciente o por orden de autoridad competente.'

/**
 * Lleva la `y` del documento y sabe dibujar las piezas del cuerpo. Todas
 * mueven el bloque entero a la pagina siguiente si no cabe, y los titulos
 * nunca quedan solos al final de una hoja.
 */
export const crearCompositor = (doc, { limiteInferior, cuerpo = 9.5 }) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGIN * 2
  const altoCuerpo = alturaLinea(cuerpo)

  const c = {
    y: MARGIN,
    pageWidth,
    pageHeight,
    anchoUtil,
    derecha: pageWidth - MARGIN,
    altoCuerpo,
    cuerpo,
    limiteInferior,
  }

  c.reservar = (alto) => {
    c.y = saltarSiNoCabe(doc, { y: c.y, alto, limiteInferior })
  }

  c.fuente = (estilo, tamano, color = TEXT) => {
    doc.setFont('helvetica', estilo)
    doc.setFontSize(tamano)
    doc.setTextColor(...color)
  }

  c.titulo = (nombre, altoMinimoContenido = altoCuerpo) => {
    c.reservar(7.5 + altoMinimoContenido)
    c.y += 1.5
    c.fuente('bold', 7.5, NEGRO)
    doc.text(nombre.toUpperCase(), MARGIN, c.y + 3, { charSpace: 0.3 })
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, c.y + 4.6, c.derecha, c.y + 4.6)
    c.y += 6
  }

  c.subtitulo = (nombre) => {
    c.reservar(5 + altoCuerpo)
    c.y += 1.5
    c.fuente('bold', 6.5, MUTED)
    doc.text(nombre.toUpperCase(), MARGIN, c.y + 2.5, { charSpace: 0.2 })
    c.y += 3.5
  }

  // Parrafo libre que se parte entre paginas linea a linea. Vacio, se escribe
  // la constancia en cursiva.
  c.parrafo = (valor, vacio = 'No registrado.') => {
    const contenido = texto(valor)
    const estilo = contenido ? 'normal' : 'italic'
    c.fuente(estilo, cuerpo)
    const lineas = doc.splitTextToSize(contenido || vacio, anchoUtil)
    for (const linea of lineas) {
      c.reservar(altoCuerpo)
      c.fuente(estilo, cuerpo, contenido ? TEXT : MUTED)
      doc.text(linea, MARGIN, c.y + 3)
      c.y += altoCuerpo
    }
  }

  // Campos cortos: etiqueta pequena arriba y valor abajo, en columnas. Cada
  // campo es [etiqueta, valor, constancia si esta vacio, columnas que ocupa].
  c.campos = (definiciones, columnas = 4) => {
    const anchoColumna = anchoUtil / columnas
    const filas = []
    let fila = []
    let ocupadas = 0
    for (const campo of definiciones) {
      const span = Math.min(campo[3] || 1, columnas)
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
        c.fuente(contenido ? 'normal' : 'italic', cuerpo)
        return {
          etiqueta,
          contenido,
          x: MARGIN + columna * anchoColumna,
          lineas: doc.splitTextToSize(contenido || vacio, span * anchoColumna - 4),
        }
      })
      const alto = 2.4 + Math.max(...medidas.map((medida) => medida.lineas.length)) * altoCuerpo + 1
      c.reservar(alto)
      for (const medida of medidas) {
        c.fuente('bold', 6.5, MUTED)
        doc.text(medida.etiqueta.toUpperCase(), medida.x, c.y + 2.1, { charSpace: 0.2 })
        c.fuente(medida.contenido ? 'normal' : 'italic', cuerpo, medida.contenido ? TEXT : MUTED)
        medida.lineas.forEach((linea, n) => doc.text(linea, medida.x, c.y + 5.6 + n * altoCuerpo))
      }
      c.y += alto
    }
  }

  return c
}

/**
 * Encabezado institucional: logo (si la clinica lo subio), nombre y datos a la
 * izquierda; titulo del documento y sus datos a la derecha; una sola linea
 * negra debajo. Los datos de la clinica se parten para no chocar con el titulo
 * en media carta.
 */
export const dibujarEncabezadoFormal = (doc, c, { clinica, logo, titulo, lineasDerecha = [] }) => {
  const y = c.y
  const espaciado = 0.6
  c.fuente('bold', 12, NEGRO)
  // jsPDF no cuenta el espaciado entre letras al alinear a la derecha: se mide
  // el titulo completo y se dibuja desde su borde izquierdo.
  const anchoTitulo = doc.getTextWidth(titulo) + espaciado * (titulo.length - 1)
  c.fuente('normal', 8.5, MUTED)
  const anchoDerecha = Math.max(anchoTitulo, ...lineasDerecha.map((linea) => doc.getTextWidth(linea)))

  let textoX = MARGIN
  if (logo) {
    const alto = Math.min(16, 28 / logo.ratio)
    doc.addImage(logo.dataUrl, 'PNG', MARGIN, y, alto * logo.ratio, alto)
    textoX = MARGIN + alto * logo.ratio + 4
  }
  const anchoIzquierda = c.derecha - anchoDerecha - 6 - textoX

  c.fuente('bold', 14, NEGRO)
  const nombreLineas = doc.splitTextToSize(nombreClinica(clinica), anchoIzquierda)
  nombreLineas.forEach((linea, n) => doc.text(linea, textoX, y + 5 + n * 5.5))
  let cursor = y + 5 + (nombreLineas.length - 1) * 5.5 + 4.5

  c.fuente('normal', 8.5, MUTED)
  const datos = [
    [clinica?.nit && `NIT ${clinica.nit}`, clinica?.direccion].filter(Boolean).join(' · '),
    [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', '),
    [clinica?.telefono && `Tel. ${clinica.telefono}`, clinica?.email].filter(Boolean).join(' · '),
  ]
    .filter(Boolean)
    .flatMap((linea) => doc.splitTextToSize(linea, anchoIzquierda))
  for (const linea of datos) {
    doc.text(linea, textoX, cursor)
    cursor += 3.8
  }

  c.fuente('bold', 12, NEGRO)
  doc.text(titulo, c.derecha - anchoTitulo, y + 5, { charSpace: espaciado })
  c.fuente('normal', 8.5, MUTED)
  lineasDerecha.forEach((linea, n) => doc.text(linea, c.derecha, y + 9.5 + n * 3.8, { align: 'right' }))

  c.y = Math.max(cursor - 1, y + 9.5 + lineasDerecha.length * 3.8, y + 18)
  doc.setDrawColor(...NEGRO)
  doc.setLineWidth(0.5)
  doc.line(MARGIN, c.y, c.derecha, c.y)
  doc.setLineWidth(0.2)
  c.y += 2
}

// Alto que ocupa la firma (espacio para firmar, nombre y cargo).
export const ALTO_FIRMA = 19

/**
 * Firma: linea, nombre y cargo a la izquierda; una nota corta a la derecha
 * (estado del registro). Reserva su alto completo.
 */
export const dibujarFirma = (doc, c, { nombre, cargo, notaDerecha = [] }) => {
  c.reservar(ALTO_FIRMA)
  c.y += 10
  doc.setDrawColor(...NEGRO)
  doc.line(MARGIN, c.y, MARGIN + Math.min(75, c.anchoUtil * 0.55), c.y)
  c.fuente('bold', c.cuerpo, NEGRO)
  doc.text(nombre, MARGIN, c.y + 4.5)
  c.fuente('normal', 8, MUTED)
  const anchoCargo = notaDerecha.length ? c.anchoUtil * 0.55 : c.anchoUtil
  doc.text(doc.splitTextToSize(cargo, anchoCargo), MARGIN, c.y + 8.5)
  if (notaDerecha.length) doc.text(notaDerecha, c.derecha, c.y + 4.5, { align: 'right' })
  c.y += 9
}

// Lineas del pie ya partidas al ancho de la hoja.
const partirPie = (doc, anchoUtil, lineas) => {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  return lineas.flatMap((linea) => doc.splitTextToSize(linea, anchoUtil))
}

/**
 * Espacio que hay que dejar libre al final de cada hoja para el pie. Se usa
 * como `limiteInferior` del compositor.
 */
export const altoPie = (doc, { lineas = [] }) => {
  const anchoUtil = doc.internal.pageSize.getWidth() - MARGIN * 2
  return 16 + partirPie(doc, anchoUtil, lineas).length * 3.5
}

/**
 * Pie de todas las paginas: identificacion del documento en negrita, lineas de
 * apoyo (aviso de reserva, quien imprimio) y la paginacion. Se dibuja al final,
 * cuando ya se sabe cuantas paginas hay.
 */
export const dibujarPieFormal = (doc, c, { identificacion, lineas = [] }) => {
  const total = doc.getNumberOfPages()
  const apoyo = partirPie(doc, c.anchoUtil, lineas)
  const inicio = c.pageHeight - 9 - apoyo.length * 3.5

  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    doc.setDrawColor(...LINE)
    doc.line(MARGIN, inicio - 4, c.derecha, inicio - 4)
    c.fuente('bold', 7, TEXT)
    doc.text(doc.splitTextToSize(identificacion, c.anchoUtil - 22)[0], MARGIN, inicio)
    c.fuente('normal', 7, MUTED)
    doc.text(`Página ${pagina} de ${total}`, c.derecha, inicio, { align: 'right' })
    apoyo.forEach((linea, n) => doc.text(linea, MARGIN, inicio + 3.5 + n * 3.5))
  }
}
