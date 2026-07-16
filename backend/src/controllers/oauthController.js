const Usuario = require('../models/Usuario')
const { oauthConfig, proveedorSoportado } = require('../config/oauth')
const oauthService = require('../services/oauthService')
const { generarAccessToken, generarRefreshToken, guardarRefreshToken } = require('../services/sesionService')
const { setAuthCookies } = require('../config/cookies')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const logger = require('../utils/logger')

const COOKIE_FLUJO = 'bourgelat_oauth_flujo'

const iniciar = async (req, res) => {
  try {
    const { proveedor } = req.params
    if (!oauthConfig.enabled || !proveedorSoportado(proveedor)) {
      return res.status(404).json({ message: 'Proveedor no disponible' })
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
      // Primer login social de un usuario local: vincular proveedor
      if (usuario.proveedorAuth === 'local' && !usuario.proveedorId) {
        await usuario.update({ proveedorAuth: proveedor, proveedorId: perfil.sub })
      }
      setAuthCookies(res, { accessToken, refreshToken })
      await registrarAuditoria({
        accion: 'LOGIN',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Login social ${proveedor} ${perfil.email}`,
        req,
        resultado: 'exitoso',
      })
      return res.redirect(`${oauthConfig.frontendUrl}/dashboard`)
    }

    // Usuario nuevo: token de onboarding en el fragment (no llega a logs de servidor)
    const token = oauthService.generarTokenOnboarding({
      email: perfil.email,
      nombre: perfil.nombre,
      proveedor,
      proveedorId: perfil.sub,
    })
    return res.redirect(`${oauthConfig.frontendUrl}/completar-registro#token=${token}`)
  } catch (error) {
    logger.error({ contexto: 'oauth-callback', mensaje: error.message })
    return irALoginConError()
  }
}

module.exports = { iniciar, callback }
