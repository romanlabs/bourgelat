const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario')
const Clinica = require('../models/Clinica')
const { obtenerAccessTokenRequest } = require('../config/cookies')

const esRutaGlobalSuperadmin = (req) => {
  const path = req.originalUrl || ''

  if (path.startsWith('/api/superadmin')) {
    return true
  }

  if (path.startsWith('/api/integraciones/facturacion')) {
    return true
  }

  if (path === '/api/suscripciones' && req.method === 'POST') {
    return true
  }

  if (/^\/api\/suscripciones\/[^/]+\/cancelar/.test(path) && req.method === 'PATCH') {
    return true
  }

  return false
}

const construirContextoAuth = (decoded) => ({
  usuarioId: decoded.id,
  clinicaId: decoded.clinicaId || null,
  rol: decoded.rol,
  rolesAdicionales: decoded.rolesAdicionales || [],
})

const serializarUsuarioAuth = (usuario) => ({
  id: usuario.id,
  clinicaId: usuario.clinicaId || null,
  rol: usuario.rol,
  rolesAdicionales: usuario.rolesAdicionales || [],
  email: usuario.email,
  nombre: usuario.nombre,
  activo: usuario.activo,
})

const verificarToken = async (req, res, next) => {
  const token = obtenerAccessTokenRequest(req)

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token requerido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const usuario = await Usuario.findByPk(decoded.id, {
      include: [
        {
          model: Clinica,
          attributes: ['id', 'activo'],
          required: false,
        },
      ],
    })

    if (!usuario) {
      return res.status(401).json({ message: 'Sesion invalida, usuario no encontrado' })
    }

    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE',
      })
    }

    if (usuario.clinicaId && usuario.Clinica && !usuario.Clinica.activo) {
      return res.status(401).json({
        message: 'La clinica asociada se encuentra inactiva',
        code: 'CLINIC_INACTIVE',
      })
    }

    req.usuario = serializarUsuarioAuth(usuario)
    req.auth = construirContextoAuth({
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales || [],
    })

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      })
    }

    return res.status(401).json({ message: 'Token invalido' })
  }
}

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const { rol, rolesAdicionales = [] } = req.auth || req.usuario
    const { clinicaId = null } = req.auth || req.usuario || {}
    const todosLosRoles = [rol, ...rolesAdicionales]

    const tienePermiso = rolesPermitidos.some((role) => todosLosRoles.includes(role))

    if (!tienePermiso) {
      return res.status(403).json({
        message: 'No tienes permiso para realizar esta accion',
      })
    }

    const esSuperadminGlobal = todosLosRoles.includes('superadmin') && !clinicaId
    const usaRutaGlobalPermitida = esRutaGlobalSuperadmin(req)

    if (esSuperadminGlobal && !usaRutaGlobalPermitida) {
      return res.status(403).json({
        message:
          'La cuenta superadmin solo opera desde rutas globales del software. El backoffice de clinica usa cuentas asociadas a una clinica.',
        code: 'SUPERADMIN_GLOBAL_ONLY',
      })
    }

    next()
  }
}

module.exports = { verificarToken, verificarRol, construirContextoAuth }
