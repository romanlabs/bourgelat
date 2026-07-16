const client = require('openid-client')
const jwt = require('jsonwebtoken')
const { oauthConfig } = require('../config/oauth')

// Cache de configuraciones OIDC descubiertas (una por proveedor)
const configuraciones = new Map()

const obtenerConfiguracion = async (proveedor) => {
  if (configuraciones.has(proveedor)) return configuraciones.get(proveedor)
  const { issuer, clientId, clientSecret } = oauthConfig.proveedores[proveedor]

  let config
  if (proveedor === 'microsoft') {
    // El tenant 'common' de Microsoft devuelve un documento de discovery con
    // issuer = 'https://login.microsoftonline.com/{tenantid}/v2.0' (placeholder
    // literal), que no coincide con la URL solicitada y rompe la validacion
    // estricta de discovery() de openid-client v6. Se obtiene el metadata
    // manualmente y se corrige el issuer antes de construir la Configuration,
    // evitando esa comparacion.
    const respuesta = await fetch(`${issuer}/.well-known/openid-configuration`)
    if (!respuesta.ok) {
      throw new Error(`No se pudo obtener metadata OIDC de microsoft: ${respuesta.status}`)
    }
    const metadata = await respuesta.json()
    metadata.issuer = issuer
    config = new client.Configuration(metadata, clientId, clientSecret)
  } else {
    config = await client.discovery(new URL(issuer), clientId, clientSecret)
  }

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
    proveedor === 'google' ? claims.email_verified === true : Boolean(claims.email)
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
