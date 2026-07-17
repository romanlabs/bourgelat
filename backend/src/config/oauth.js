const parseBool = (valor, porDefecto = false) => {
  if (valor === undefined || valor === '') return porDefecto
  return String(valor).toLowerCase() === 'true'
}

const oauthConfig = {
  enabled: parseBool(process.env.OAUTH_ENABLED, false),
  // URL del frontend a la que se redirige tras el callback (sin slash final)
  frontendUrl: (process.env.OAUTH_FRONTEND_URL || process.env.FRONTEND_URLS?.split(',')[0] || '').replace(/\/$/, ''),
  // Base publica del backend para construir redirect_uri (ej: http://localhost:3000)
  backendBaseUrl: (process.env.OAUTH_BACKEND_BASE_URL || '').replace(/\/$/, ''),
  proveedores: {
    google: {
      issuer: 'https://accounts.google.com',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    microsoft: {
      // MS_TENANT: 'common' (cualquier cuenta), 'consumers' o un tenant especifico
      issuer: `https://login.microsoftonline.com/${process.env.MS_TENANT || 'common'}/v2.0`,
      clientId: process.env.MS_CLIENT_ID || '',
      clientSecret: process.env.MS_CLIENT_SECRET || '',
    },
  },
}

const proveedorSoportado = (nombre) =>
  Object.prototype.hasOwnProperty.call(oauthConfig.proveedores, nombre)

module.exports = { oauthConfig, proveedorSoportado }
