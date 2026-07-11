const normalizarBooleano = (valor, valorPorDefecto = false) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto
  }

  if (typeof valor === 'boolean') {
    return valor
  }

  const valorNormalizado = String(valor).trim().toLowerCase()
  return ['1', 'true', 'si', 'yes', 'on'].includes(valorNormalizado)
}

const normalizarEntero = (valor) => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number.parseInt(valor, 10)
  return Number.isNaN(numero) ? null : numero
}

// Solo se permite llamar a hosts oficiales de Factus (o el host configurado por
// env). Evita SSRF: un admin podria guardar baseUrl apuntando a la red interna
// o al endpoint de metadata de la nube y el servidor haria la peticion.
const FACTUS_HOSTS_PERMITIDOS = new Set([
  'api.factus.com.co',
  'api-sandbox.factus.com.co',
])

const obtenerHostFactusEnv = () => {
  try {
    return process.env.FACTUS_BASE_URL ? new URL(process.env.FACTUS_BASE_URL).host : null
  } catch (error) {
    return null
  }
}

const esBaseUrlFactusPermitida = (valor) => {
  let parsed

  try {
    parsed = new URL(String(valor))
  } catch (error) {
    return false
  }

  if (parsed.protocol !== 'https:') return false

  const hostEnv = obtenerHostFactusEnv()
  return FACTUS_HOSTS_PERMITIDOS.has(parsed.host) || (Boolean(hostEnv) && parsed.host === hostEnv)
}

const asegurarBaseUrlFactus = (valor) => {
  if (!esBaseUrlFactusPermitida(valor)) {
    const error = new Error('La baseUrl de Factus no esta permitida')
    error.status = 400
    throw error
  }
}

const obtenerBaseUrlFactus = (integracion) => {
  if (integracion?.baseUrl) return integracion.baseUrl

  if (integracion?.ambiente === 'production') {
    return 'https://api.factus.com.co'
  }

  return 'https://api-sandbox.factus.com.co'
}

const obtenerConfiguracionFactusEnv = () => {
  const ambiente = process.env.FACTUS_AMBIENTE === 'production' ? 'production' : 'sandbox'
  const clientId = process.env.FACTUS_CLIENT_ID || ''
  const clientSecret = process.env.FACTUS_CLIENT_SECRET || ''
  const username = process.env.FACTUS_USERNAME || process.env.FACTUS_EMAIL || ''
  const password = process.env.FACTUS_PASSWORD || ''
  const baseUrl = process.env.FACTUS_BASE_URL || obtenerBaseUrlFactus({ ambiente })

  const hayVariablesFactus = [
    process.env.FACTUS_BASE_URL,
    process.env.FACTUS_CLIENT_ID,
    process.env.FACTUS_CLIENT_SECRET,
    process.env.FACTUS_USERNAME,
    process.env.FACTUS_EMAIL,
    process.env.FACTUS_PASSWORD,
    process.env.FACTUS_RANGO_NUMERACION_ID,
    process.env.FACTUS_DOCUMENTO_CODIGO,
    process.env.FACTUS_FORMA_PAGO_CODIGO,
    process.env.FACTUS_METODO_PAGO_CODIGO,
    process.env.FACTUS_ENVIAR_EMAIL,
  ].some(Boolean)

  if (!hayVariablesFactus) {
    return null
  }

  return {
    proveedor: 'factus',
    ambiente,
    activa: normalizarBooleano(process.env.FACTUS_ACTIVA, true),
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    rangoNumeracionId: normalizarEntero(process.env.FACTUS_RANGO_NUMERACION_ID),
    documentoCodigo: process.env.FACTUS_DOCUMENTO_CODIGO || '01',
    formaPagoCodigo: process.env.FACTUS_FORMA_PAGO_CODIGO || '1',
    metodoPagoCodigo: process.env.FACTUS_METODO_PAGO_CODIGO || '10',
    enviarEmail: normalizarBooleano(process.env.FACTUS_ENVIAR_EMAIL, false),
    credencialesCompletas: Boolean(clientId && clientSecret && username && password),
  }
}

const solicitarTokenFactus = async ({
  baseUrl,
  clientId,
  clientSecret,
  username,
  password,
}) => {
  if (typeof fetch !== 'function') {
    throw new Error('La integraciÃ³n con Factus requiere Node.js 18+ para usar fetch nativo')
  }

  asegurarBaseUrlFactus(baseUrl)

  const payload = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
  })

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: payload.toString(),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'No fue posible autenticarse con Factus')
  }

  return data
}


const crearHeadersFactus = (token, extraHeaders = {}) => ({
  Accept: 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...extraHeaders,
})

const solicitarFactus = async ({
  baseUrl,
  path,
  method = 'GET',
  token,
  headers = {},
  body,
}) => {
  asegurarBaseUrlFactus(baseUrl)

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: crearHeadersFactus(token, headers),
    body,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const mensaje = data?.message || data?.error || data?.errors?.[0]?.message || 'Error consumiendo Factus'
    const error = new Error(mensaje)
    error.status = response.status
    error.payload = data
    throw error
  }

  return data
}

const obtenerEmpresaFactus = async ({ baseUrl, token }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v2/companies',
    token,
  })
}

const obtenerRangosNumeracionFactus = async ({ baseUrl, token }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v2/numbering-ranges',
    token,
  })
}

const validarFacturaFactus = async ({ baseUrl, token, payload }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v2/bills/validate',
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

const descargarPdfFactura = async ({ baseUrl, token, numero }) => {
  return solicitarFactus({
    baseUrl,
    path: `/v2/bills/${encodeURIComponent(numero)}/download-pdf`,
    token,
  })
}

const descargarXmlFactura = async ({ baseUrl, token, numero }) => {
  return solicitarFactus({
    baseUrl,
    path: `/v2/bills/${encodeURIComponent(numero)}/download-xml`,
    token,
  })
}

module.exports = {
  obtenerBaseUrlFactus,
  esBaseUrlFactusPermitida,
  asegurarBaseUrlFactus,
  obtenerConfiguracionFactusEnv,
  solicitarTokenFactus,
  solicitarFactus,
  obtenerEmpresaFactus,
  obtenerRangosNumeracionFactus,
  validarFacturaFactus,
  descargarPdfFactura,
  descargarXmlFactura,
}
