// Reglas de estado de la emisión electrónica (DIAN vía el proveedor). Lógica
// pura para poder probarla: el controlador decide con estas funciones qué
// estado deja la factura y qué responde al navegador.
//
// Estados: 'enviada' significa que la factura está reservada para envío o que
// se envió sin confirmación. Mientras esté así no se puede reemitir ni anular,
// porque podría existir ya ante la DIAN.

// Estados desde los que se puede (re)emitir.
const ESTADOS_EMITIBLES = ['no_aplica', 'pendiente', 'error', 'rechazada']

const MENSAJE_SIN_CONFIRMACION =
  'No recibimos confirmación de la DIAN. La factura quedó en revisión: no la reenvíes ni la anules hasta confirmar con soporte si fue aceptada.'
const MENSAJE_FALLO_PROVEEDOR =
  'No pudimos enviar la factura a la DIAN. Intenta de nuevo en unos minutos; si sigue fallando, contacta a soporte.'
const MENSAJE_RECHAZO = 'La DIAN rechazó la factura. Revisa los datos del cliente y de la venta e intenta de nuevo.'
const MENSAJE_RESPUESTA_INCOMPLETA =
  'La DIAN respondió sin el CUFE de la factura. Quedó en revisión: no la reenvíes hasta confirmar con soporte.'

/**
 * Qué hacer cuando falla una emisión ya reservada (estado 'enviada').
 * - etapa 'antes_de_enviar': falló antes de mandar la factura (p. ej. el
 *   token del proveedor). Es seguro reintentar → 'error'.
 * - etapa 'envio' con respuesta HTTP del proveedor: la rechazó → 'rechazada'
 *   (422) o 'error' (otro código). Se puede reintentar.
 * - etapa 'envio' sin respuesta (corte o tiempo agotado): no se sabe si la
 *   DIAN la recibió → se deja 'enviada' (bloqueada).
 * Nunca se reenvía al navegador el código del proveedor (un 401 suyo
 * cerraría la sesión del usuario).
 */
const resolverFalloEmision = ({ etapa, error }) => {
  const statusProveedor = Number(error?.status) || null

  if (etapa === 'envio' && !statusProveedor) {
    return { estadoElectronico: 'enviada', httpStatus: 504, mensaje: MENSAJE_SIN_CONFIRMACION }
  }

  if (etapa === 'envio' && statusProveedor === 422) {
    return { estadoElectronico: 'rechazada', httpStatus: 422, mensaje: MENSAJE_RECHAZO }
  }

  return { estadoElectronico: 'error', httpStatus: 502, mensaje: MENSAJE_FALLO_PROVEEDOR }
}

// La DIAN solo aceptó la factura si la respuesta trae CUFE y número.
const respuestaValidacionCompleta = (bill) =>
  Boolean(bill && String(bill.cufe || '').trim() && String(bill.number || '').trim())

// El rango de numeración debe ser uno de los sincronizados de la clínica y
// estar vigente: antes se aceptaba cualquier entero del body y se podía
// consumir un rango ajeno, de otro documento o vencido.
const validarRangoNumeracion = (rangos, rangoId) => {
  if (!Array.isArray(rangos) || rangos.length === 0) {
    return { ok: false, mensaje: 'Sincroniza la facturación electrónica de la clínica antes de emitir: no hay rangos de numeración cargados.' }
  }
  const rango = rangos.find((r) => String(r?.id) === String(rangoId))
  if (!rango) {
    return { ok: false, mensaje: 'El rango de numeración elegido no pertenece a la clínica. Sincroniza y elige uno de la lista.' }
  }
  const inactivo = rango.is_active === false || rango.is_active === 0 || rango.is_active === '0'
  const vencido = rango.is_expired === true || rango.is_expired === 1 || rango.is_expired === '1'
  if (inactivo || vencido) {
    return { ok: false, mensaje: 'El rango de numeración elegido está inactivo o vencido. Elige otro en la configuración.' }
  }
  return { ok: true }
}

module.exports = {
  validarRangoNumeracion,
  ESTADOS_EMITIBLES,
  MENSAJE_RESPUESTA_INCOMPLETA,
  resolverFalloEmision,
  respuestaValidacionCompleta,
}
