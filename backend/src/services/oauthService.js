const client = require('openid-client')
const jwt = require('jsonwebtoken')
const { oauthConfig } = require('../config/oauth')

// Cache de configuraciones OIDC descubiertas (una por proveedor)
const configuraciones = new Map()

const obtenerConfiguracion = async (proveedor) => {
  if (configuraciones.has(proveedor)) return configuraciones.get(proveedor)
  const { issuer, clientId, clientSecret } = oauthConfig.proveedores[proveedor]

  // El tenant 'common'/'organizations' de Microsoft devuelve un documento de
  // discovery con issuer = 'https://login.microsoftonline.com/{tenantid}/v2.0'
  // (placeholder literal), que no coincide con la URL solicitada. openid-client
  // v6 ya reconoce este caso (host 'login.microsoftonline.com') de forma nativa:
  // acepta ese documento y, al validar el id_token, calcula el issuer esperado
  // reemplazando '{tenantid}' por el claim 'tid' real del token en lugar de
  // comparar contra la URL de discovery. No hace falta ningun workaround manual
  // aqui: usar discovery() para todos los proveedores preserva esa validacion
  // estricta de issuer por tenant (en vez de solo mover el fallo a mas adelante).
  const config = await client.discovery(new URL(issuer), clientId, clientSecret)

  configuraciones.set(proveedor, config)
  return config
}

const redirectUri = (proveedor) =>
  `${oauthConfig.backendBaseUrl}/api/auth/oauth/${proveedor}/callback`

// Devuelve { url, state, codeVerifier } para iniciar el flujo
const iniciarFlujo = async (proveedor) => {
  const config = await obtenerConfiguracion(proveedor)
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(proveedor),
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return { url: url.href, state, codeVerifier }
}

// Canjea el code y devuelve claims { sub, email, nombre, emailVerificado }
const completarFlujo = async (proveedor, urlCallback, { state, codeVerifier }) => {
  const config = await obtenerConfiguracion(proveedor)
  const tokens = await client.authorizationCodeGrant(config, new URL(urlCallback), {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
  })
  const claims = tokens.claims()
  const email = (claims.email || claims.preferred_username || '').toLowerCase()
  const emailVerificado =
    proveedor === 'google'
      ? claims.email_verified === true
      : claims.email_verified === true || claims.xms_edov === true || claims.xms_edov === 'true'
  return {
    sub: claims.sub,
    email,
    nombre: claims.name || email.split('@')[0],
    emailVerificado,
  }
}

const generarTokenOnboarding = (datos) =>
  jwt.sign({ ...datos, proposito: 'oauth_onboarding' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  })

const verificarTokenOnboarding = (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  if (payload.proposito !== 'oauth_onboarding') {
    throw new Error('Token de onboarding no valido')
  }
  return payload
}

module.exports = { iniciarFlujo, completarFlujo, generarTokenOnboarding, verificarTokenOnboarding }
