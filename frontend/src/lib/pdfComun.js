// Base compartida por los documentos PDF que se le entregan al cliente
// (historia clinica, formula medica, factura de venta): margen, colores y el
// logo de la clinica. La composicion del estilo formal vive en lib/pdfFormal.

export const MARGIN = 15
export const MUTED = [107, 114, 128]
export const TEXT = [17, 24, 39]
export const LINE = [209, 213, 219]

export const nombreClinica = (clinica) => clinica?.nombreComercial || clinica?.nombre || 'Bourgelat'

/**
 * Hay que pasar el logo por un canvas antes de poder incrustarlo, y leer ese
 * canvas exige que el origen mande cabeceras CORS. Por eso el logo se sube a
 * nuestro propio /uploads, que si las manda. Aun asi es decorativo: si falla
 * (una clinica con la URL externa que se usaba antes, un 404, o ningun logo)
 * el encabezado cae al nombre de la clinica y la descarga sigue su curso.
 */
export const cargarLogo = async (url) => {
  if (!url) return null
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return {
      dataUrl: canvas.toDataURL('image/png'),
      ratio: img.naturalWidth / img.naturalHeight,
    }
  } catch {
    return null
  }
}
