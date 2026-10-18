// Clave de idempotencia de la venta del POS.
//
// Se genera al primer intento de cobrar el carrito y se repite en cada
// reintento del mismo carrito: si la red se cayó después de que el backend
// guardó la venta, el reintento recibe esa venta en vez de crear otra (que
// duplicaba el descuento de stock y el efectivo de caja). Se descarta al
// vender con éxito o cuando el carrito se vacía o se reemplaza.

// crypto.randomUUID solo existe en contextos seguros (HTTPS o localhost); el
// respaldo arma un UUID v4 con getRandomValues para abrir la app por IP en la red local.
export const generarUuid = (cryptoApi = globalThis.crypto) => {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const crearGestorClaveVenta = (generar = generarUuid) => {
  let clave = null
  return {
    // Devuelve la clave vigente o crea una si es el primer intento.
    obtener() {
      if (!clave) clave = generar()
      return clave
    },
    reiniciar() {
      clave = null
    },
  }
}
