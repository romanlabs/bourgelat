// Clave de idempotencia del abono (cabecera Idempotency-Key).
//
// Si la red se cae después de que el backend guardó el abono, la pantalla
// muestra error y la persona vuelve a cobrar. Con la misma clave, el
// middleware de idempotencia repite la respuesta guardada en vez de registrar
// otro abono, que además sumaría otra vez al efectivo del turno. Cambiar el
// monto, el método o la cuenta es otro cobro, y por eso lleva otra clave.
import { generarUuid } from './claveIdempotenciaVenta'

export const crearGestorClaveAbono = (generar = generarUuid) => {
  let firma = null
  let clave = null
  return {
    obtener({ monto, metodoPago, cuentaRecaudoId }) {
      const firmaActual = JSON.stringify([Number(monto), metodoPago, cuentaRecaudoId || null])
      if (firmaActual !== firma) {
        firma = firmaActual
        clave = generar()
      }
      return clave
    },
    reiniciar() {
      firma = null
      clave = null
    },
  }
}
