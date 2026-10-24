const crypto = require('crypto')

// Tokens de los enlaces que llegan por correo (restablecer clave, verificar
// correo, invitación). En la BD solo se guarda la huella SHA-256: si la tabla
// se filtra, las huellas no sirven para abrir los enlaces.
const generarTokenEnlace = () => crypto.randomBytes(32).toString('base64url')

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex')

// Base de los enlaces de correo: el dominio de la app, sin barra final.
const urlFrontend = () =>
  (
    process.env.OAUTH_FRONTEND_URL ||
    process.env.FRONTEND_URLS?.split(',')[0] ||
    process.env.FRONTEND_URL ||
    ''
  ).replace(/\/$/, '')

module.exports = { generarTokenEnlace, hashToken, urlFrontend }
