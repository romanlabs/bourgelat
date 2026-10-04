// Responder tickets de soporte desde el correo (ver docs/soporte.md).
//
// Recibe el correo crudo que reenvia el Email Worker de Cloudflare, lo valida
// en capas y lo convierte en una respuesta del equipo usando las MISMAS
// funciones que el script (soporteService.agregarMensaje / cambiarEstado):
//   1. firma HMAC del Worker (nadie mas puede llamar el endpoint)
//   2. token del ticket en la direccion (solo viaja en el aviso al equipo)
//   3. remitente en SOPORTE_RESPONDEDORES
//   4. DKIM valido del dominio del remitente (el From solo no prueba nada)

const { simpleParser } = require('mailparser')
const { dkimVerify } = require('mailauth/lib/dkim/verify')
const reglas = require('./soporteCorreoReglas')
const { construirActorSoporte, formatearCodigoTicket } = require('./soporteReglas')
const { ErrorSoporte, agregarMensaje, cambiarEstado } = require('./soporteService')
const logger = require('../utils/logger')

// Un mismo correo puede llegar dos veces (reintentos de Cloudflare): se
// recuerda su Message-ID un rato mas que la vigencia de la firma.
const procesados = new Map()

const yaProcesado = (messageId) => {
  const ahora = Date.now()
  for (const [id, vence] of procesados) {
    if (vence < ahora) procesados.delete(id)
  }
  return Boolean(messageId) && procesados.has(messageId)
}

const rechazo = (mensaje) => new ErrorSoporte('CORREO_RECHAZADO', mensaje)

/**
 * Procesa un correo entrante. `firma`, `marcaTiempo` y `destinatario` llegan
 * en cabeceras puestas por el Worker; `crudo` es el correo tal cual (Buffer).
 * Devuelve { codigo, estado } o lanza ErrorSoporte: NO_AUTORIZADO si la
 * llamada no viene del Worker, CORREO_RECHAZADO si el correo debe rebotar.
 * `resolverDns` solo existe para pruebas (claves DKIM sin DNS real).
 */
const procesarCorreoEntrante = async ({ firma, marcaTiempo, destinatario, crudo }, { resolverDns } = {}) => {
  const config = reglas.configuracionCorreo(process.env)

  if (!config.activo) {
    throw new ErrorSoporte('NO_PERMITIDO', 'Responder por correo no está configurado')
  }

  if (!Buffer.isBuffer(crudo) || !reglas.verificarFirmaEnvio(config.secreto, { firma, marcaTiempo, destinatario, crudo })) {
    throw new ErrorSoporte('NO_AUTORIZADO', 'Firma del envío no válida')
  }

  const numero = reglas.ticketDesdeDestinatario(destinatario, config.buzon, config.secreto)
  if (!numero) {
    throw rechazo('La dirección de respuesta no corresponde a ningún ticket')
  }

  const correo = await simpleParser(crudo)
  const remitente = String(correo.from?.value?.[0]?.address || '').toLowerCase()
  const nombreFirma = config.respondedores.get(remitente)

  if (!nombreFirma) {
    throw rechazo('Este remitente no está autorizado para responder tickets')
  }

  const { results: resultadosDkim } = await dkimVerify(crudo, resolverDns ? { resolver: resolverDns } : {})
  if (!reglas.dkimAlineado(resultadosDkim, remitente)) {
    throw rechazo('El correo no trae una firma DKIM válida del remitente')
  }

  const codigo = formatearCodigoTicket(numero)

  if (yaProcesado(correo.messageId)) {
    return { codigo, duplicado: true }
  }

  const interpretado = reglas.interpretarRespuesta(reglas.limpiarRespuesta(correo.text))
  if (interpretado.error) {
    throw rechazo(interpretado.error)
  }

  const { estado, mensaje } = interpretado
  if (!estado && !mensaje) {
    throw rechazo('La respuesta está vacía (¿quedó todo dentro del texto citado?)')
  }

  const actor = construirActorSoporte({ nombre: nombreFirma })
  const ticket = mensaje
    ? await agregarMensaje(actor, numero, mensaje, { estado: estado || undefined })
    : await cambiarEstado(actor, numero, estado)

  if (correo.messageId) {
    procesados.set(correo.messageId, Date.now() + reglas.VENTANA_FIRMA_MS * 2)
  }

  logger.info({
    contexto: 'soporte',
    mensaje: `Respuesta por correo aplicada en ${codigo} (${nombreFirma}, estado ${ticket.estado})`,
  })

  return { codigo, estado: ticket.estado }
}

module.exports = { procesarCorreoEntrante }
