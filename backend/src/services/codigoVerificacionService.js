const crypto = require('crypto')
const { Op, literal } = require('sequelize')

const VENCIMIENTO_MINUTOS = 10
const MAX_INTENTOS = 5
const ESPERA_REENVIO_SEGUNDOS = 60
// Tope de códigos creados por cuenta en una ventana de 24 h.
const MAX_CODIGOS_POR_DIA = 5
const VENTANA_TOPE_MS = 24 * 60 * 60 * 1000

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

const topeCodigosAlcanzado = (cantidad) => cantidad >= MAX_CODIGOS_POR_DIA

const inicioVentanaTope = (ahora = Date.now()) => new Date(ahora - VENTANA_TOPE_MS)

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

// Cuántos códigos se crearon para el usuario en las últimas 24 h. La limpieza
// diaria conserva las filas al menos 24 h para que este conteo sea fiable.
const contarCodigosRecientes = async (usuarioId, ahora = Date.now()) =>
  modelo().count({
    where: { usuarioId, createdAt: { [Op.gt]: inicioVentanaTope(ahora) } },
    sinTenant: true,
  })

const puedeCrearOtroCodigo = async (usuarioId) =>
  !topeCodigosAlcanzado(await contarCodigosRecientes(usuarioId))

// Valida un código contra el último activo del usuario. El intento se cuenta
// ANTES de comparar con un UPDATE condicional atómico: solo se compara si esa
// fila se actualizó, así ráfagas concurrentes no pasan de MAX_INTENTOS. Al
// llegar al máximo sin acertar, el código queda invalidado. No consume el
// código si es correcto: eso lo hace quien llama (consumirCodigo).
const validarCodigo = async (usuarioId, codigo) => {
  const CodigoVerificacionEmail = modelo()
  const registro = await CodigoVerificacionEmail.findOne({
    where: { usuarioId, usado: false, expiracion: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
    sinTenant: true,
  })
  if (!registro) return { valido: false, registro: null }

  const [filas, actualizados] = await CodigoVerificacionEmail.update(
    { intentos: literal('"intentos" + 1') },
    {
      where: {
        id: registro.id,
        usado: false,
        intentos: { [Op.lt]: MAX_INTENTOS },
        expiracion: { [Op.gt]: new Date() },
      },
      returning: true,
      sinTenant: true,
    }
  )
  if (filas !== 1) return { valido: false, registro: null }

  const intentos = actualizados?.[0]?.intentos ?? MAX_INTENTOS
  if (compararCodigo(codigo, registro.codigoHash)) return { valido: true, registro }

  if (intentosAgotados(intentos)) {
    await CodigoVerificacionEmail.update(
      { usado: true },
      { where: { id: registro.id }, sinTenant: true }
    )
  }
  return { valido: false, registro: null }
}

// Marca el código como usado solo si nadie lo consumió antes (dos peticiones
// concurrentes con el código correcto: solo una gana).
const consumirCodigo = async (registroId, { transaction } = {}) => {
  const [filas] = await modelo().update(
    { usado: true },
    { where: { id: registroId, usado: false }, transaction, sinTenant: true }
  )
  return filas === 1
}

module.exports = {
  VENCIMIENTO_MINUTOS,
  MAX_INTENTOS,
  ESPERA_REENVIO_SEGUNDOS,
  MAX_CODIGOS_POR_DIA,
  VENTANA_TOPE_MS,
  topeCodigosAlcanzado,
  inicioVentanaTope,
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
  consumirCodigo,
  contarCodigosRecientes,
  puedeCrearOtroCodigo,
}
