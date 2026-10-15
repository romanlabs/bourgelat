const crypto = require('crypto')
const { Op } = require('sequelize')

const VENCIMIENTO_MINUTOS = 10
const MAX_INTENTOS = 5
const ESPERA_REENVIO_SEGUNDOS = 60

// ---------- Funciones puras (sin BD) ----------

const generarCodigo = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0')

const claveHmac = () =>
  crypto
    .createHash('sha256')
    .update(`bourgelat:codigo-verificacion-email:${process.env.JWT_SECRET || ''}`)
    .digest()

const hashCodigo = (codigo) =>
  crypto.createHmac('sha256', claveHmac()).update(String(codigo)).digest('hex')

const compararCodigo = (codigo, hashGuardado) => {
  if (typeof hashGuardado !== 'string' || !/^\d{6}$/.test(String(codigo ?? ''))) return false
  const a = Buffer.from(hashCodigo(codigo), 'hex')
  const b = Buffer.from(hashGuardado, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const calcularExpiracion = (ahora = Date.now()) =>
  new Date(ahora + VENCIMIENTO_MINUTOS * 60 * 1000)

const estaVencido = (expiracion, ahora = Date.now()) =>
  new Date(expiracion).getTime() <= ahora

const intentosAgotados = (intentos) => intentos >= MAX_INTENTOS

const segundosParaReenviar = (creadoEn, ahora = Date.now()) => {
  if (!creadoEn) return 0
  const transcurrido = (ahora - new Date(creadoEn).getTime()) / 1000
  return Math.max(0, Math.ceil(ESPERA_REENVIO_SEGUNDOS - transcurrido))
}

// ---------- Funciones con BD (globales: sinTenant) ----------
// El modelo se carga perezosamente para poder probar las puras sin BD.

const modelo = () => require('../models/CodigoVerificacionEmail')

// Crea un código nuevo e invalida los anteriores. Devuelve el código en claro
// solo para enviarlo por correo.
const crearCodigo = async (usuarioId, { transaction } = {}) => {
  const CodigoVerificacionEmail = modelo()
  await CodigoVerificacionEmail.update(
    { usado: true },
    { where: { usuarioId, usado: false }, transaction, sinTenant: true }
  )
  const codigo = generarCodigo()
  await CodigoVerificacionEmail.create(
    { usuarioId, codigoHash: hashCodigo(codigo), expiracion: calcularExpiracion() },
    { transaction, sinTenant: true }
  )
  return codigo
}

// Segundos que faltan para poder pedir otro código (0 = ya se puede).
const esperaRestante = async (usuarioId) => {
  const ultimo = await modelo().findOne({
    where: { usuarioId },
    order: [['createdAt', 'DESC']],
    sinTenant: true,
  })
  return segundosParaReenviar(ultimo?.createdAt)
}

// Valida un código contra el último activo del usuario. Cuenta el intento y,
// al llegar al máximo, lo invalida. No consume el código si es correcto:
// eso lo hace quien llama dentro de su transacción.
const validarCodigo = async (usuarioId, codigo) => {
  const registro = await modelo().findOne({
    where: { usuarioId, usado: false, expiracion: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
    sinTenant: true,
  })
  if (!registro || intentosAgotados(registro.intentos)) return { valido: false, registro: null }

  if (compararCodigo(codigo, registro.codigoHash)) return { valido: true, registro }

  const intentos = registro.intentos + 1
  await registro.update(
    { intentos, usado: intentosAgotados(intentos) },
    { sinTenant: true }
  )
  return { valido: false, registro: null }
}

module.exports = {
  VENCIMIENTO_MINUTOS,
  MAX_INTENTOS,
  ESPERA_REENVIO_SEGUNDOS,
  generarCodigo,
  hashCodigo,
  compararCodigo,
  calcularExpiracion,
  estaVencido,
  intentosAgotados,
  segundosParaReenviar,
  crearCodigo,
  esperaRestante,
  validarCodigo,
}
