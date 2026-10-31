// A qué cuenta de la clínica entró un cobro por transferencia. La comparten la
// venta y el abono. Sin cuentas configuradas todo sigue como antes (null).

// La elegida si sigue activa; si la clínica tiene una sola, esa.
export const cuentaDelCobro = ({ metodoPago, cuentaRecaudoId, cuentas = [] }) => {
  if (metodoPago !== 'transferencia') return null
  if (cuentaRecaudoId && cuentas.some((cuenta) => cuenta.id === cuentaRecaudoId)) return cuentaRecaudoId
  return cuentas.length === 1 ? cuentas[0].id : null
}

// Con varias cuentas hay que elegir una: es el dato que la clínica cuadra con
// la app de cada banco.
export const MENSAJE_FALTA_CUENTA = 'Elige a qué cuenta entró la transferencia'

export const faltaCuenta = ({ metodoPago, cuentaRecaudoId, cuentas = [] }) =>
  metodoPago === 'transferencia' && cuentas.length > 1 && !cuentaDelCobro({ metodoPago, cuentaRecaudoId, cuentas })
