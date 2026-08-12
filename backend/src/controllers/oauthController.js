const Usuario = require('../models/Usuario')
const { oauthConfig, proveedorSoportado } = require('../config/oauth')
const oauthService = require('../services/oauthService')
const { generarAccessToken, generarRefreshToken, guardarRefreshToken } = require('../services/sesionService')
const { setAuthCookies } = require('../config/cookies')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const logger = require('../utils/logger')
const sequelize = require('../config/database')
const Clinica = require('../models/Clinica')
const Suscripcion = require('../models/Suscripcion')
const { crearSuscripcionPrueba } = require('../config/planes')

const COOKIE_FLUJO = 'bourgelat_oauth_flujo'

const iniciar = async (req, res) => {
  try {
    const { proveedor } = req.params
    if (!oauthConfig.enabled || !proveedorSoportado(proveedor)) {
      if (!oauthConfig.frontendUrl) {
        return res.status(404).json({ message: 'Proveedor no disponible' })
      }
      return res.redirect(`${oauthConfig.frontendUrl}/login?error=oauth`)
    }
    const { url, state, codeVerifier } = await oauthService.iniciarFlujo(proveedor)
    // state y verifier viajan en cookie httpOnly firmada de corta vida
    res.cookie(COOKIE_FLUJO, JSON.stringify({ state, codeVerifier, proveedor }), {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      signed: true,
    })
    return res.redirect(url)
  } catch (error) {
    logger.error({ contexto: 'oauth', mensaje: error.message })
    return res.redirect(`${oauthConfig.frontendUrl}/login?error=oauth`)
  }
}

const callback = async (req, res) => {
  const irALoginConError = () => res.redirect(`${oauthConfig.frontendUrl}/login?error=oauth`)
  try {
    const { proveedor } = req.params
    if (!oauthConfig.enabled || !proveedorSoportado(proveedor)) return irALoginConError()

    const crudo = req.signedCookies[COOKIE_FLUJO]
    res.clearCookie(COOKIE_FLUJO)
    if (!crudo) return irALoginConError()
    const flujo = JSON.parse(crudo)
    if (flujo.proveedor !== proveedor) return irALoginConError()

    const urlCompleta = `${oauthConfig.backendBaseUrl}${req.originalUrl}`
    const perfil = await oauthService.completarFlujo(proveedor, urlCompleta, flujo)

    if (!perfil.email || !perfil.emailVerificado) return irALoginConError()

    const usuario = await Usuario.findOne({ where: { email: perfil.email }, sinTenant: true })

    if (usuario) {
      if (!usuario.activo || !usuario.clinicaId) return irALoginConError()
      const payload = {
        id: usuario.id,
        clinicaId: usuario.clinicaId,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales || [],
      }
      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)
      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: usuario.clinicaId,
        usuarioId: usuario.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      setAuthCookies(res, { accessToken, refreshToken })
      await registrarAuditoria({
        accion: 'LOGIN',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Login social ${proveedor} ${perfil.email}`,
        req,
        resultado: 'exitoso',
      })
      return res.redirect(`${oauthConfig.frontendUrl}/oauth/popup-callback?estado=exito`)
    }

    // Usuario nuevo: token de onboarding en el fragment (no llega a logs de servidor)
    const token = oauthService.generarTokenOnboarding({
      email: perfil.email,
      nombre: perfil.nombre,
      proveedor,
      proveedorId: perfil.sub,
    })
    return res.redirect(`${oauthConfig.frontendUrl}/oauth/popup-callback?estado=nuevo#token=${token}`)
  } catch (error) {
    logger.error({ contexto: 'oauth-callback', mensaje: error.message })
    return irALoginConError()
  }
}

const completarRegistro = async (req, res) => {
  try {
    const { token, nombreClinica } = req.body
    if (!token || !nombreClinica || !String(nombreClinica).trim()) {
      return res.status(400).json({ message: 'Token y nombre de la clinica son obligatorios' })
    }

    let datos
    try {
      datos = oauthService.verificarTokenOnboarding(token)
    } catch {
      return res.status(401).json({ message: 'El enlace de registro expiro, intenta de nuevo' })
    }

    const existente = await Usuario.findOne({ where: { email: datos.email }, sinTenant: true })
    if (existente) {
      return res.status(409).json({ message: 'Este correo ya esta registrado, inicia sesion' })
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const clinica = await Clinica.create(
        {
          nombre: String(nombreClinica).trim(),
          email: datos.email,
          password: 'oauth', // Clinica.password sigue NOT NULL; el acceso real es via Usuario
          nombreComercial: String(nombreClinica).trim(),
        },
        { transaction }
      )
      const usuario = await Usuario.create(
        {
          nombre: datos.nombre,
          email: datos.email,
          password: null,
          proveedorAuth: datos.proveedor,
          proveedorId: datos.proveedorId,
          rol: 'admin',
          clinicaId: clinica.id,
          activo: true,
          emailVerificado: true,
        },
        { transaction }
      )
      const suscripcion = await Suscripcion.create(crearSuscripcionPrueba(clinica.id), { transaction })

      const payload = {
        id: usuario.id,
        clinicaId: clinica.id,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales || [],
      }
      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)
      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: clinica.id,
        usuarioId: usuario.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        transaction,
      })
      return { clinica, usuario, suscripcion, accessToken, refreshToken }
    })

    await registrarAuditoria({
      accion: 'REGISTRO_CLINICA',
      entidad: 'Clinica',
      entidadId: resultado.clinica.id,
      descripcion: `Nueva clinica registrada via ${datos.proveedor} ${datos.email}`,
      req,
      resultado: 'exitoso',
    })

    setAuthCookies(res, {
      accessToken: resultado.accessToken,
      refreshToken: resultado.refreshToken,
    })
    delete resultado.clinica.dataValues.password
    delete resultado.usuario.dataValues.password
    return res.status(201).json({
      message: 'Clinica registrada exitosamente',
      usuario: resultado.usuario,
      clinica: resultado.clinica,
      suscripcion: resultado.suscripcion,
    })
  } catch (error) {
    logger.error({ contexto: 'oauth-completar', mensaje: error.message })
    return res.status(500).json({ message: 'Error en servidor' })
  }
}

module.exports = { iniciar, callback, completarRegistro }
