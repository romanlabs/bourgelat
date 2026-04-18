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

const construirPayloadClienteFactus = (propietario) => {
  if (!propietario) {
    throw new Error('Se requiere un propietario para construir el cliente de Factus')
  }

  return {
    identification: propietario.numeroDocumento,
    dv: propietario.digitoVerificacion || '',
    company: propietario.razonSocial || '',
    trade_name: propietario.nombreComercial || '',
    names: propietario.nombre,
    address: propietario.direccion || '',
    email: propietario.email || '',
    phone: propietario.telefono || '',
    legal_organization_id: propietario.organizacionJuridicaId || '',
    tribute_id: propietario.tributoId || '',
    identification_document_id: propietario.tipoDocumentoFacturacionId || null,
    municipality_id: propietario.municipioId || null,
  }
}

const construirPayloadEstablecimientoFactus = (clinica) => {
  if (!clinica) {
    throw new Error('Se requiere una clÃ­nica para construir el establecimiento de Factus')
  }

  return {
    name: clinica.nombreComercial || clinica.razonSocial || clinica.nombre,
    address: clinica.direccion || '',
    phone_number: clinica.telefono || '',
    email: clinica.email || '',
    municipality_id: clinica.municipioId || null,
  }
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
    path: '/v1/company',
    token,
  })
}

const obtenerRangosNumeracionFactus = async ({ baseUrl, token }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v1/numbering-ranges',
    token,
  })
}

const obtenerUnidadesMedidaFactus = async ({ baseUrl, token }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v1/measurement-units',
    token,
  })
}

const obtenerTributosProductosFactus = async ({ baseUrl, token }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v1/tributes/products',
    token,
  })
}

const validarFacturaFactus = async ({ baseUrl, token, payload }) => {
  return solicitarFactus({
    baseUrl,
    path: '/v1/bills/validate',
    method: 'POST',
    token,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

module.exports = {
  obtenerBaseUrlFactus,
  obtenerConfiguracionFactusEnv,
  solicitarTokenFactus,
  solicitarFactus,
  obtenerEmpresaFactus,
  obtenerRangosNumeracionFactus,
  obtenerUnidadesMedidaFactus,
  obtenerTributosProductosFactus,
  validarFacturaFactus,
  construirPayloadClienteFactus,
  construirPayloadEstablecimientoFactus,
}
