const jwt = require('jsonwebtoken')
const { obtenerAccessTokenRequest } = require('../config/cookies')

const construirContextoAuth = (decoded) => ({
  usuarioId: decoded.id,
  clinicaId: decoded.clinicaId || null,
  rol: decoded.rol,
  rolesAdicionales: decoded.rolesAdicionales || [],
})

const verificarToken = (req, res, next) => {
  const token = obtenerAccessTokenRequest(req)

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token requerido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = decoded
    req.auth = construirContextoAuth(decoded)
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
      })
    }
    return res.status(401).json({ message: 'Token inválido' })
  }
}

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const { rol, rolesAdicionales = [] } = req.auth || req.usuario
    const todosLosRoles = [rol, ...rolesAdicionales]

    const tienePermiso = rolesPermitidos.some(r => todosLosRoles.includes(r))

    if (!tienePermiso) {
      return res.status(403).json({
        message: 'No tienes permiso para realizar esta acción',
      })
    }

    next()
  }
}

module.exports = { verificarToken, verificarRol, construirContextoAuth }
