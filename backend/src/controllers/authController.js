const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RefreshToken = require('../models/RefreshToken')

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

const guardarRefreshToken = async ({ token, clinicaId, usuarioId, ip, userAgent }) => {

  const expiracion = new Date()
  expiracion.setDate(expiracion.getDate() + 7)

  await RefreshToken.create({
    token,
    expiracion,
    clinicaId: clinicaId || null,
    usuarioId: usuarioId || null,
    ip,
    userAgent
  })
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
      nit
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
      nit
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
      rol: usuarioAdmin.rol
    }

    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: clinica.id,
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

    res.status(201).json({
      message: 'Clínica registrada exitosamente',
      accessToken,
      refreshToken,
      clinica
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
      where: { email }
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

    const passwordValido = await bcrypt.compare(password, usuario.password)

    if (!passwordValido) {

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

    const payload = {
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol
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

    res.json({
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        clinicaId: usuario.clinicaId
      }
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

    const { refreshToken } = req.body

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
      rol: decoded.rol
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

    const { refreshToken } = req.body

    if (refreshToken) {

      await RefreshToken.update(
        { revocado: true },
        { where: { token: refreshToken } }
      )
    }

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

module.exports = {
  registro,
  login,
  refresh,
  logout
}