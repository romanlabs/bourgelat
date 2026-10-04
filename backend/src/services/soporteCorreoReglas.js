// Reglas puras de "responder un ticket desde el correo".
//
// El aviso al equipo lleva un Reply-To por ticket (`respuestas+t42.<token>@...`).
// Al contestar desde Gmail, Cloudflare Email Routing entrega el correo a un
// Email Worker (cloudflare/soporte-correo-worker) que lo firma y lo reenvia
// crudo a POST /api/soporte-equipo/correo. Aqui vive todo lo que se puede
// probar sin red ni base de datos: tokens, firma del Worker, remitentes
// autorizados, limpieza del texto citado y palabras clave de estado.
// Tests: soporteCorreoReglas.test.js.

const crypto = require('crypto')

// Margen para el reloj del Worker y para reintentos de Cloudflare.
const VENTANA_FIRMA_MS = 5 * 60 * 1000
const LARGO_TOKEN = 16

const PALABRAS_CLAVE = {
  resuelto: 'resuelto',
  'en-progreso': 'en_progreso',
  cerrado: 'cerrado',
}

const hmacHex = (secreto, contenido) => crypto.createHmac('sha256', secreto).update(contenido).digest('hex')

const igualesSeguro = (a, b) => {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

const partirBuzon = (buzon) => String(buzon).trim().toLowerCase().split('@')

/** Token que prueba que quien escribe recibio el aviso de ESE ticket. */
const tokenTicket = (secreto, numero) => hmacHex(secreto, `ticket:${numero}`).slice(0, LARGO_TOKEN)

/** `respuestas@bourgelat.co` + 42 → `respuestas+t42.<token>@bourgelat.co` */
const direccionRespuesta = (buzon, secreto, numero) => {
  const [local, dominio] = partirBuzon(buzon)
  return `${local}+t${numero}.${tokenTicket(secreto, numero)}@${dominio}`
}

/**
 * Devuelve el numero de ticket si el destinatario es una direccion de
 * respuesta valida del buzon configurado; null en cualquier otro caso.
 */
const ticketDesdeDestinatario = (destinatario, buzon, secreto) => {
  const [localBuzon, dominioBuzon] = partirBuzon(buzon)
  const coincidencia = String(destinatario)
    .trim()
    .toLowerCase()
    .match(/^([^+@]+)\+t(\d{1,9})\.([0-9a-f]+)@(.+)$/)

  if (!coincidencia) return null

  const [, local, numeroTexto, token, dominio] = coincidencia
  if (local !== localBuzon || dominio !== dominioBuzon) return null

  const numero = Number(numeroTexto)
  return igualesSeguro(token, tokenTicket(secreto, numero)) ? numero : null
}

/** Firma que pone el Worker: cubre la hora, el destinatario y el correo completo. */
const firmarEnvio = (secreto, { marcaTiempo, destinatario, crudo }) =>
  crypto
    .createHmac('sha256', secreto)
    .update(`${marcaTiempo}\n${String(destinatario).toLowerCase()}\n`)
    .update(crudo)
    .digest('hex')

const verificarFirmaEnvio = (secreto, { firma, marcaTiempo, destinatario, crudo }, ahora = Date.now()) => {
  const instante = Number(marcaTiempo)
  if (!firma || !Number.isFinite(instante) || Math.abs(ahora - instante) > VENTANA_FIRMA_MS) {
    return false
  }

  return igualesSeguro(firma, firmarEnvio(secreto, { marcaTiempo, destinatario, crudo }))
}

/** `a@x.com=Roman, b@y.com=Sergio` → Map(email → firma) */
const parsearRespondedores = (valor) => {
  const respondedores = new Map()

  String(valor || '')
    .split(',')
    .map((par) => par.trim())
    .filter(Boolean)
    .forEach((par) => {
      const [email, ...resto] = par.split('=')
      const firma = resto.join('=').trim()
      if (email?.includes('@') && firma) respondedores.set(email.trim().toLowerCase(), firma)
    })

  return respondedores
}

/**
 * Configuracion desde las variables de entorno. La funcion queda apagada (sin
 * Reply-To y el endpoint rechaza todo) si falta cualquiera de las tres.
 */
const configuracionCorreo = (env = {}) => {
  const buzon = String(env.SOPORTE_CORREO_RESPUESTAS || '').trim().toLowerCase()
  const secreto = String(env.SOPORTE_CORREO_SECRETO || '')
  const respondedores = parsearRespondedores(env.SOPORTE_RESPONDEDORES)

  return {
    activo: /^[^@\s+]+@[^@\s]+$/.test(buzon) && secreto.length >= 32 && respondedores.size > 0,
    buzon,
    secreto,
    respondedores,
  }
}

/** Reply-To del aviso al equipo, o null si la funcion esta apagada. */
const direccionRespuestaTicket = (env, numero) => {
  const config = configuracionCorreo(env)
  return config.activo ? direccionRespuesta(config.buzon, config.secreto, numero) : null
}

/**
 * El From de un correo se falsifica facilmente: solo cuenta si ademas hay una
 * firma DKIM valida del mismo dominio del remitente.
 */
const dkimAlineado = (resultadosDkim, emailRemitente) => {
  const dominio = String(emailRemitente || '').split('@')[1]?.toLowerCase()
  if (!dominio) return false

  return (resultadosDkim || []).some(
    (r) => r?.status?.result === 'pass' && String(r.signingDomain || '').toLowerCase() === dominio
  )
}

// "El jue, 2 oct 2026 a las 10:00, Bourgelat <x@y.co> escribió:" / "On ... wrote:".
// Gmail a veces parte esa linea en dos, por eso se mira tambien la siguiente.
const FIN_ATRIBUCION = /(escribi[oó]|wrote):\s*$/i
const esAtribucion = (linea, siguiente = '') =>
  /^(El|On)\s/i.test(linea.trim()) && (FIN_ATRIBUCION.test(linea) || FIN_ATRIBUCION.test(siguiente))

const esCorteDelHilo = (linea, siguiente) => {
  const recortada = linea.trim()
  return (
    recortada.startsWith('>') ||
    recortada === '--' ||
    /^-{2,}\s*(Mensaje|Forwarded|Original)/i.test(recortada) ||
    esAtribucion(linea, siguiente)
  )
}

/** Deja solo lo que escribio quien responde: sin el hilo citado ni la firma. */
const limpiarRespuesta = (texto) => {
  const lineas = String(texto || '').replace(/\r\n?/g, '\n').split('\n')
  const corte = lineas.findIndex((linea, i) => esCorteDelHilo(linea, lineas[i + 1]))
  return (corte === -1 ? lineas : lineas.slice(0, corte)).join('\n').trim()
}

/**
 * Lee la palabra clave de la primera linea. Devuelve { estado, mensaje } o
 * { error } si la primera linea parece una palabra clave pero no se reconoce
 * (mejor rebotar que publicarle "#reslto" a la clinica).
 */
const interpretarRespuesta = (texto) => {
  const limpio = String(texto || '').trim()
  const [primera = '', ...resto] = limpio.split('\n')
  const coincidencia = primera.trim().match(/^#([a-z_-]+)$/i)

  if (!coincidencia) {
    return { estado: null, mensaje: limpio }
  }

  const estado = PALABRAS_CLAVE[coincidencia[1].toLowerCase().replace(/_/g, '-')]

  if (!estado) {
    const validas = Object.keys(PALABRAS_CLAVE).map((p) => `#${p}`).join(', ')
    return { error: `Palabra clave desconocida: #${coincidencia[1]}. Usa ${validas}.` }
  }

  return { estado, mensaje: resto.join('\n').trim() }
}

module.exports = {
  VENTANA_FIRMA_MS,
  PALABRAS_CLAVE,
  tokenTicket,
  direccionRespuesta,
  ticketDesdeDestinatario,
  firmarEnvio,
  verificarFirmaEnvio,
  parsearRespondedores,
  configuracionCorreo,
  direccionRespuestaTicket,
  dkimAlineado,
  limpiarRespuesta,
  interpretarRespuesta,
}
