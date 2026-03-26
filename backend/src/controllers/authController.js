const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RefreshToken = require('../models/RefreshToken')
const { appConfig } = require('../config/app')
const {
  setAuthCookies,
  clearAuthCookies,
  obtenerRefreshTokenRequest,
} = require('../config/cookies')

const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

/* =========================================================
   HELPERS
========================================================= */

const generarAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  })
}

const generarRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  })
}

const calcularFechaExpiracionRefresh = () => {
  const expiracion = new Date()
  expiracion.setMilliseconds(
    expiracion.getMilliseconds() + appConfig.cookies.refreshMaxAgeMs
  )
  return expiracion
}

const estaTemporalmenteBloqueado = (usuario) => {
  return Boolean(
    usuario?.bloqueadoHasta &&
    new Date(usuario.bloqueadoHasta).getTime() > Date.now()
  )
}

const registrarIntentoFallido = async (usuario) => {
  const intentosFallidos = (usuario.intentosFallidos || 0) + 1
  const data = { intentosFallidos }

  if (intentosFallidos >= appConfig.auth.maxIntentosFallidos) {
    const bloqueadoHasta = new Date()
    bloqueadoHasta.setMinutes(
      bloqueadoHasta.getMinutes() + appConfig.auth.minutosBloqueo
    )

    data.bloqueadoHasta = bloqueadoHasta
    data.intentosFallidos = 0
  }

  await usuario.update(data)
}

const limpiarEstadoAccesoUsuario = async (usuario) => {
  await usuario.update({
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: new Date(),
  })
}

const guardarRefreshToken = async ({ token, clinicaId, usuarioId, ip, userAgent }) => {
  await RefreshToken.create({
    token,
    expiracion: calcularFechaExpiracionRefresh(),
    clinicaId: clinicaId || null,
    usuarioId: usuarioId || null,
    ip,
    userAgent
  })
}

const serializarClinica = (clinica) => {
  if (!clinica) return null

  return {
    id: clinica.id,
    nombre: clinica.nombre,
    email: clinica.email,
    telefono: clinica.telefono,
    direccion: clinica.direccion,
    ciudad: clinica.ciudad,
    departamento: clinica.departamento,
    nit: clinica.nit,
    logo: clinica.logo,
    activo: clinica.activo,
  }
}

const serializarUsuario = (usuario) => {
  if (!usuario) return null

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    rolesAdicionales: usuario.rolesAdicionales || [],
    clinicaId: usuario.clinicaId,
    telefono: usuario.telefono,
    activo: usuario.activo,
  }
}

/* =========================================================
   REGISTRO DE CLÍNICA
========================================================= */

const registro = async (req, res) => {

  try {

    const {
      nombre,
      email,
      password,
      telefono,
      direccion,
      ciudad,
      departamento,
      nit,
      razonSocial,
      nombreComercial,
      tipoPersona,
      digitoVerificacion,
      codigoPostal,
      municipioId,
      tipoDocumentoFacturacionId,
      organizacionJuridicaId,
      tributoId
    } = req.body

    if (!nombre || !email || !password) {
      return res.status(400).json({
        message: 'Nombre, email y password son obligatorios'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'La password debe tener mínimo 8 caracteres'
      })
    }

    const clinicaExiste = await Clinica.findOne({
      where: { email }
    })

    if (clinicaExiste) {
      return res.status(400).json({
        message: 'El email ya está registrado'
      })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const clinica = await Clinica.create({
      nombre,
      email,
      password: passwordHash,
      telefono,
      direccion,
      ciudad,
      departamento,
      nit,
      razonSocial,
      nombreComercial,
      tipoPersona: tipoPersona || 'persona_juridica',
      digitoVerificacion,
      codigoPostal,
      municipioId,
      tipoDocumentoFacturacionId,
      organizacionJuridicaId,
      tributoId
    })

    /* CREAR USUARIO ADMIN AUTOMÁTICO */

    const usuarioAdmin = await Usuario.create({
      nombre: nombre,
      email: email,
      password: passwordHash,
      rol: 'admin',
      clinicaId: clinica.id,
      activo: true
    })

    const payload = {
      id: usuarioAdmin.id,
      clinicaId: clinica.id,
      rol: usuarioAdmin.rol,
      rolesAdicionales: usuarioAdmin.rolesAdicionales || []
    }

    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: clinica.id,
      usuarioId: usuarioAdmin.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    await registrarAuditoria({
      accion: 'REGISTRO_CLINICA',
      entidad: 'Clinica',
      entidadId: clinica.id,
      descripcion: `Nueva clínica registrada ${clinica.email}`,
      req,
      resultado: 'exitoso'
    })

    delete clinica.dataValues.password

    setAuthCookies(res, { accessToken, refreshToken })

    res.status(201).json({
      message: 'Clínica registrada exitosamente',
      accessToken,
      refreshToken,
      usuario: serializarUsuario(usuarioAdmin),
      clinica: serializarClinica(clinica)
    })

  } catch (error) {

    res.status(500).json({
      message: 'Error en servidor',
      error: error.message
    })
  }
}

/* =========================================================
   LOGIN POR USUARIO
========================================================= */

const login = async (req, res) => {

  try {

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y password son obligatorios'
      })
    }

    const usuario = await Usuario.findOne({
      where: { email },
      include: [{
        model: Clinica,
        attributes: ['id', 'nombre', 'email', 'telefono', 'direccion', 'ciudad', 'departamento', 'nit', 'logo', 'activo']
      }]
    })

    if (!usuario) {

      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        descripcion: `Intento login con email inexistente ${email}`,
        req,
        resultado: 'fallido'
      })

      return res.status(401).json({
        message: 'Credenciales incorrectas'
      })
    }

    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Usuario desactivado'
      })
    }

    if (estaTemporalmenteBloqueado(usuario)) {
      return res.status(423).json({
        message: `Usuario bloqueado temporalmente hasta ${new Date(usuario.bloqueadoHasta).toISOString()}`
      })
    }

    const passwordValido = await bcrypt.compare(password, usuario.password)

    if (!passwordValido) {
      await registrarIntentoFallido(usuario)

      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Password incorrecta para ${usuario.email}`,
        req,
        resultado: 'fallido'
      })

      return res.status(401).json({
        message: 'Credenciales incorrectas'
      })
    }

    await limpiarEstadoAccesoUsuario(usuario)

    const payload = {
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales || []
    }

    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: usuario.clinicaId,
      usuarioId: usuario.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    await registrarAuditoria({
      accion: 'LOGIN',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Login exitoso ${usuario.email}`,
      req,
      resultado: 'exitoso'
    })

    setAuthCookies(res, { accessToken, refreshToken })

    res.json({
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      usuario: serializarUsuario(usuario),
      clinica: serializarClinica(usuario.Clinica)
    })

  } catch (error) {

    res.status(500).json({
      message: 'Error servidor',
      error: error.message
    })
  }
}

/* =========================================================
   REFRESH TOKEN
========================================================= */

const refresh = async (req, res) => {

  try {

    const refreshToken = obtenerRefreshTokenRequest(req)

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token requerido'
      })
    }

    const tokenDB = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        revocado: false,
        expiracion: {
          [Op.gt]: new Date()
        }
      }
    })

    if (!tokenDB) {
      return res.status(401).json({
        message: 'Refresh token inválido o expirado'
      })
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    )

    await tokenDB.update({
      revocado: true
    })

    const payload = {
      id: decoded.id,
      clinicaId: decoded.clinicaId,
      rol: decoded.rol,
      rolesAdicionales: decoded.rolesAdicionales || []
    }

    const nuevoAccessToken = generarAccessToken(payload)
    const nuevoRefreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: nuevoRefreshToken,
      clinicaId: tokenDB.clinicaId,
      usuarioId: tokenDB.usuarioId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    setAuthCookies(res, {
      accessToken: nuevoAccessToken,
      refreshToken: nuevoRefreshToken
    })

    res.json({
      accessToken: nuevoAccessToken,
      refreshToken: nuevoRefreshToken
    })

  } catch (error) {

    res.status(401).json({
      message: 'Refresh token inválido'
    })
  }
}

/* =========================================================
   LOGOUT
========================================================= */

const logout = async (req, res) => {

  try {

    const refreshToken = obtenerRefreshTokenRequest(req)

    if (refreshToken) {

      await RefreshToken.update(
        { revocado: true },
        { where: { token: refreshToken } }
      )
    }

    clearAuthCookies(res)

    res.json({
      message: 'Sesión cerrada exitosamente'
    })

  } catch (error) {

    res.status(500).json({
      message: 'Error servidor',
      error: error.message
    })
  }
}

const logoutAll = async (req, res) => {

  try {

    await RefreshToken.update(
      { revocado: true },
      { where: { usuarioId: req.auth?.usuarioId || req.usuario.id, revocado: false } }
    )

    clearAuthCookies(res)

    await registrarAuditoria({
      accion: 'LOGOUT_ALL',
      entidad: 'Usuario',
      entidadId: req.auth?.usuarioId || req.usuario.id,
      descripcion: 'Cierre de todas las sesiones activas',
      req,
      resultado: 'exitoso'
    })

    res.json({
      message: 'Todas las sesiones fueron cerradas exitosamente'
    })

  } catch (error) {

    res.status(500).json({
      message: 'Error servidor',
      error: error.message
    })
  }
}

const me = async (req, res) => {

  try {

    const usuario = await Usuario.findOne({
      where: { id: req.auth?.usuarioId || req.usuario.id },
      attributes: { exclude: ['password'] },
      include: [{
        model: Clinica,
        attributes: ['id', 'nombre', 'email', 'telefono', 'direccion', 'ciudad', 'departamento', 'nit', 'logo', 'activo']
      }]
    })

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      usuario: serializarUsuario(usuario),
      clinica: serializarClinica(usuario.Clinica)
    })

  } catch (error) {

    res.status(500).json({
      message: 'Error servidor',
      error: error.message
    })
  }
}

module.exports = {
  registro,
  login,
  refresh,
  logout,
  logoutAll,
  me
}
