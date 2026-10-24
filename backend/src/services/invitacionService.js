const { Op, literal } = require('sequelize')
const { generarTokenEnlace, hashToken, urlFrontend } = require('../utils/enlaceSeguro')

// Invitación de usuarios: el administrador crea la cuenta sin contraseña y la
// persona invitada la define desde un enlace de un solo uso. Abrir el enlace
// prueba que el correo es suyo, así que la cuenta nace verificada.

const VIGENCIA_HORAS = 72
const VENTANA_TOPE_MS = 24 * 60 * 60 * 1000
// Topes de envío en 24 h. El plan gratuito de Brevo (300 correos/día) también
// lo usan los códigos de verificación y la recuperación de clave: las
// invitaciones no deben poder agotarlo.
const MAX_REENVIOS_POR_USUARIO = 3
const MAX_POR_CLINICA = 20
const MAX_GLOBAL = 100
// Una invitación que nadie acepta no debe ocupar el correo para siempre.
const DIAS_PARA_LIMPIAR_PENDIENTES = 14

// ---------- Funciones puras (sin BD) ----------

// Cuenta creada por invitación que aún no definió su contraseña. Otras cuentas
// tampoco tienen contraseña, pero con el correo ya probado: las de Google o
// Microsoft, y las locales cuya clave anuló el login social (pre-hijacking en
// oauthController). Por eso cuenta también emailVerificado.
const estaPendiente = (usuario) =>
  Boolean(usuario) &&
  usuario.proveedorAuth === 'local' &&
  !usuario.password &&
  !usuario.emailVerificado

// Mismo criterio en `where` de Sequelize y en SQL, para los listados.
const wherePendiente = { password: null, proveedorAuth: 'local', emailVerificado: false }

const atributoInvitacionPendiente = () => [
  literal(
    `("Usuario"."password" IS NULL AND "Usuario"."proveedorAuth" = 'local' AND "Usuario"."emailVerificado" = false)`
  ),
  'invitacionPendiente',
]

const calcularExpiracion = (ahora = Date.now()) =>
  new Date(ahora + VIGENCIA_HORAS * 60 * 60 * 1000)

const inicioVentanaTope = (ahora = Date.now()) => new Date(ahora - VENTANA_TOPE_MS)

// Decide si se puede enviar otra invitación con los conteos de las últimas 24 h.
// `porUsuario` es null en una invitación nueva (aún no hay usuario que contar).
const evaluarTopes = ({ porUsuario = null, porClinica, global }) => {
  if (porUsuario !== null && porUsuario >= MAX_REENVIOS_POR_USUARIO) {
    return {
      permitido: false,
      message: `Ya enviaste ${MAX_REENVIOS_POR_USUARIO} invitaciones a esta persona hoy. Intenta de nuevo mañana.`,
    }
  }
  if (porClinica >= MAX_POR_CLINICA) {
    return {
      permitido: false,
      message: `Tu clínica llegó al tope de ${MAX_POR_CLINICA} invitaciones por día. Intenta de nuevo mañana.`,
    }
  }
  if (global >= MAX_GLOBAL) {
    return {
      permitido: false,
      message: 'Hoy no podemos enviar más invitaciones. Intenta de nuevo mañana.',
    }
  }
  return { permitido: true }
}

const urlInvitacion = (token) => `${urlFrontend()}/aceptar-invitacion#token=${token}`

// ---------- Funciones con BD (por token: globales, sinTenant) ----------
// Los modelos se cargan perezosamente para poder probar las puras sin BD.

const modelo = () => require('../models/InvitacionUsuario')

const contarRecientes = (where, ahora = Date.now()) =>
  modelo().count({
    where: { ...where, createdAt: { [Op.gt]: inicioVentanaTope(ahora) } },
    sinTenant: true,
  })

const verificarTopes = async ({ clinicaId, usuarioId = null }) => {
  const [porUsuario, porClinica, global] = await Promise.all([
    usuarioId ? contarRecientes({ usuarioId }) : Promise.resolve(null),
    contarRecientes({ clinicaId }),
    contarRecientes({}),
  ])
  return evaluarTopes({ porUsuario, porClinica, global })
}

// Invalida las invitaciones abiertas del usuario y crea una nueva. Devuelve el
// token en claro solo para enviarlo por correo: nunca se guarda ni se registra.
const emitirInvitacion = async ({ usuario, creadoPorId = null, transaction }) => {
  const InvitacionUsuario = modelo()
  await InvitacionUsuario.update(
    { usado: true },
    { where: { usuarioId: usuario.id, usado: false }, transaction, sinTenant: true }
  )
  const token = generarTokenEnlace()
  await InvitacionUsuario.create(
    {
      tokenHash: hashToken(token),
      expiracion: calcularExpiracion(),
      usuarioId: usuario.id,
      clinicaId: usuario.clinicaId,
      creadoPorId,
    },
    { transaction }
  )
  return token
}

// Invitación vigente (sin usar y sin vencer) para un token, o null.
const buscarVigente = (token, { transaction } = {}) => {
  if (!token || typeof token !== 'string') return Promise.resolve(null)
  return modelo().findOne({
    where: { tokenHash: hashToken(token), usado: false, expiracion: { [Op.gt]: new Date() } },
    transaction,
    sinTenant: true,
  })
}

// Consume la invitación con un UPDATE condicional: entre dos peticiones
// simultáneas con el mismo token, solo una recibe la fila.
const consumirInvitacion = async (token, { transaction } = {}) => {
  if (!token || typeof token !== 'string') return null
  const [filas, actualizadas] = await modelo().update(
    { usado: true },
    {
      where: { tokenHash: hashToken(token), usado: false, expiracion: { [Op.gt]: new Date() } },
      returning: true,
      transaction,
      sinTenant: true,
    }
  )
  return filas === 1 ? actualizadas[0] : null
}

const invalidarInvitaciones = (usuarioId, { transaction } = {}) =>
  modelo().update(
    { usado: true },
    { where: { usuarioId, usado: false }, transaction, sinTenant: true }
  )

const enviarInvitacion = ({ usuario, clinica, token, nombreAdmin }) => {
  const { enviarEmailInvitacion } = require('./emailService')
  return enviarEmailInvitacion({
    para: usuario.email,
    nombre: usuario.nombre,
    nombreClinica: clinica?.nombre || 'tu clínica',
    nombreAdmin,
    urlAceptar: urlInvitacion(token),
    urlFrontend: urlFrontend(),
  })
}

// Borra una cuenta que nunca aceptó su invitación. Una cuenta pendiente no ha
// iniciado sesión, así que solo tiene tokens; si algo más la referencia (por
// ejemplo, una cita que le asignaron por API), se desactiva en vez de borrarse.
const borrarCuentaPendiente = async (usuario, { transaction } = {}) => {
  const sequelize = require('../config/database')
  const Usuario = require('../models/Usuario')
  const PasswordResetToken = require('../models/PasswordResetToken')
  const EmailVerificationToken = require('../models/EmailVerificationToken')
  const RefreshToken = require('../models/RefreshToken')

  try {
    await sequelize.transaction({ transaction }, async (t) => {
      const opciones = { where: { usuarioId: usuario.id }, transaction: t, sinTenant: true }
      await modelo().destroy(opciones)
      await PasswordResetToken.destroy(opciones)
      await EmailVerificationToken.destroy(opciones)
      await RefreshToken.destroy(opciones)
      await Usuario.destroy({ where: { id: usuario.id, clinicaId: usuario.clinicaId }, transaction: t })
    })
    return 'borrada'
  } catch (error) {
    if (error.name !== 'SequelizeForeignKeyConstraintError') throw error
    await invalidarInvitaciones(usuario.id, { transaction })
    await Usuario.update(
      { activo: false },
      { where: { id: usuario.id, clinicaId: usuario.clinicaId }, transaction }
    )
    return 'desactivada'
  }
}

// Cuentas pendientes creadas hace más de N días y sin invitación vigente.
const buscarPendientesAbandonadas = async (ahora = Date.now()) => {
  const Usuario = require('../models/Usuario')
  const limite = new Date(ahora - DIAS_PARA_LIMPIAR_PENDIENTES * 24 * 60 * 60 * 1000)
  const candidatos = await Usuario.findAll({
    where: { ...wherePendiente, createdAt: { [Op.lt]: limite } },
    attributes: ['id', 'clinicaId', 'email'],
    sinTenant: true,
  })
  if (candidatos.length === 0) return []

  const conVigente = await modelo().findAll({
    where: {
      usuarioId: { [Op.in]: candidatos.map((u) => u.id) },
      usado: false,
      expiracion: { [Op.gt]: new Date(ahora) },
    },
    attributes: ['usuarioId'],
    sinTenant: true,
  })
  const vigentes = new Set(conVigente.map((fila) => fila.usuarioId))
  return candidatos.filter((usuario) => !vigentes.has(usuario.id))
}

module.exports = {
  VIGENCIA_HORAS,
  VENTANA_TOPE_MS,
  MAX_REENVIOS_POR_USUARIO,
  MAX_POR_CLINICA,
  MAX_GLOBAL,
  DIAS_PARA_LIMPIAR_PENDIENTES,
  estaPendiente,
  wherePendiente,
  atributoInvitacionPendiente,
  calcularExpiracion,
  inicioVentanaTope,
  evaluarTopes,
  urlInvitacion,
  verificarTopes,
  emitirInvitacion,
  buscarVigente,
  consumirInvitacion,
  invalidarInvitaciones,
  enviarInvitacion,
  borrarCuentaPendiente,
  buscarPendientesAbandonadas,
}
