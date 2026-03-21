const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RefreshToken = require('../models/RefreshToken')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

// ── Helpers ────────────────────────────────────────────────

const generarAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })
}

const generarRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
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
    userAgent,
  })
}

// ── Registro ───────────────────────────────────────────────

const registro = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion, ciudad, departamento, nit } = req.body

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y password son obligatorios' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'La password debe tener mínimo 8 caracteres' })
    }

    const clinicaExiste = await Clinica.findOne({ where: { email } })
    if (clinicaExiste) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const clinica = await Clinica.create({
      nombre, email, password: passwordHash,
      telefono, direccion, ciudad, departamento, nit,
    })

    const payload = { id: clinica.id, email: clinica.email, rol: 'admin' }
    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: clinica.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    // ── Auditoría registro ─────────────────────────────────
    await registrarAuditoria({
      accion: 'REGISTRO_CLINICA',
      entidad: 'Clinica',
      entidadId: clinica.id,
      descripcion: `Nueva clínica registrada: ${clinica.email}`,
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Clínica registrada exitosamente',
      accessToken,
      refreshToken,
      clinica: {
        id: clinica.id,
        nombre: clinica.nombre,
        email: clinica.email,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// ── Login ──────────────────────────────────────────────────

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios' })
    }

    const clinica = await Clinica.findOne({ where: { email } })
    if (!clinica) {
      // ── Auditoría login fallido — email no existe ──────────
      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Clinica',
        descripcion: `Intento de login con email no registrado: ${email}`,
        req,
        resultado: 'fallido',
      })
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    if (!clinica.activo) {
      return res.status(401).json({ message: 'Cuenta desactivada, contacta a soporte' })
    }

    if (clinica.bloqueadoHasta && clinica.bloqueadoHasta > new Date()) {
      const minutos = Math.ceil((clinica.bloqueadoHasta - new Date()) / 60000)
      return res.status(401).json({
        message: `Cuenta bloqueada. Intenta de nuevo en ${minutos} minutos`,
      })
    }

    const passwordValido = await bcrypt.compare(password, clinica.password)

    if (!passwordValido) {
      const intentos = (clinica.intentosFallidos || 0) + 1
      const actualizacion = { intentosFallidos: intentos }

      if (intentos >= 5) {
        actualizacion.bloqueadoHasta = new Date(Date.now() + 30 * 60 * 1000)
        actualizacion.intentosFallidos = 0
        await clinica.update(actualizacion)

        // ── Auditoría cuenta bloqueada ─────────────────────
        await registrarAuditoria({
          accion: 'CUENTA_BLOQUEADA',
          entidad: 'Clinica',
          entidadId: clinica.id,
          descripcion: `Cuenta bloqueada por 30 minutos después de 5 intentos fallidos`,
          req,
          resultado: 'fallido',
        })

        return res.status(401).json({
          message: 'Demasiados intentos fallidos. Cuenta bloqueada por 30 minutos',
        })
      }

      await clinica.update(actualizacion)

      // ── Auditoría intento fallido ──────────────────────────
      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Clinica',
        entidadId: clinica.id,
        descripcion: `Intento fallido para ${email}. Intentos: ${intentos}/5`,
        req,
        resultado: 'fallido',
      })

      return res.status(401).json({
        message: `Credenciales incorrectas. Intentos restantes: ${5 - intentos}`,
      })
    }

    await clinica.update({
      intentosFallidos: 0,
      bloqueadoHasta: null,
      ultimoAcceso: new Date(),
    })

    const payload = { id: clinica.id, email: clinica.email, rol: 'admin' }
    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: clinica.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    // ── Auditoría login exitoso ────────────────────────────
    await registrarAuditoria({
      accion: 'LOGIN',
      entidad: 'Clinica',
      entidadId: clinica.id,
      descripcion: `Login exitoso para ${clinica.email}`,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Login exitoso',
      accessToken,
      refreshToken,
      clinica: {
        id: clinica.id,
        nombre: clinica.nombre,
        email: clinica.email,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// ── Refresh ────────────────────────────────────────────────

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token requerido' })
    }

    const tokenDB = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        revocado: false,
        expiracion: { [Op.gt]: new Date() },
      },
    })

    if (!tokenDB) {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    await tokenDB.update({ revocado: true })

    const payload = { id: decoded.id, email: decoded.email, rol: decoded.rol }
    const nuevoAccessToken = generarAccessToken(payload)
    const nuevoRefreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: nuevoRefreshToken,
      clinicaId: tokenDB.clinicaId,
      usuarioId: tokenDB.usuarioId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.json({
      accessToken: nuevoAccessToken,
      refreshToken: nuevoRefreshToken,
    })
  } catch (error) {
    res.status(401).json({ message: 'Refresh token inválido' })
  }
}

// ── Logout ─────────────────────────────────────────────────

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      await RefreshToken.update(
        { revocado: true },
        { where: { token: refreshToken } }
      )
    }

    // ── Auditoría logout ───────────────────────────────────
    await registrarAuditoria({
      accion: 'LOGOUT',
      entidad: 'Clinica',
      descripcion: 'Sesión cerrada',
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Sesión cerrada exitosamente' })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = { registro, login, refresh, logout }