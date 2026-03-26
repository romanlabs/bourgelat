const IntegracionFacturacion = require('../models/IntegracionFacturacion')
const { descifrarTexto } = require('./crypto')
const { obtenerBaseUrlFactus, obtenerConfiguracionFactusEnv } = require('../factusService')

const serializarIntegracionFactus = (integracion) => {
  if (!integracion) return null

  return {
    id: integracion.id,
    proveedor: integracion.proveedor,
    ambiente: integracion.ambiente,
    activa: integracion.activa,
    baseUrl: integracion.baseUrl,
    rangoNumeracionId: integracion.rangoNumeracionId,
    documentoCodigo: integracion.documentoCodigo,
    formaPagoCodigo: integracion.formaPagoCodigo,
    metodoPagoCodigo: integracion.metodoPagoCodigo,
    enviarEmail: integracion.enviarEmail,
    configuracionAdicional: integracion.configuracionAdicional,
    ultimoChequeo: integracion.ultimoChequeo,
    ultimoEstadoChequeo: integracion.ultimoEstadoChequeo,
    ultimoMensajeChequeo: integracion.ultimoMensajeChequeo,
    credencialesCompletas: Boolean(
      integracion.clientIdCifrado &&
      integracion.clientSecretCifrado &&
      integracion.usernameCifrado &&
      integracion.passwordCifrado
    ),
  }
}

const serializarConfiguracionLocalFactus = (configuracionLocal) => {
  if (!configuracionLocal) return null

  return {
    proveedor: configuracionLocal.proveedor,
    ambiente: configuracionLocal.ambiente,
    activa: configuracionLocal.activa,
    baseUrl: configuracionLocal.baseUrl,
    rangoNumeracionId: configuracionLocal.rangoNumeracionId,
    documentoCodigo: configuracionLocal.documentoCodigo,
    formaPagoCodigo: configuracionLocal.formaPagoCodigo,
    metodoPagoCodigo: configuracionLocal.metodoPagoCodigo,
    enviarEmail: configuracionLocal.enviarEmail,
    credencialesCompletas: configuracionLocal.credencialesCompletas,
    fuente: 'env',
  }
}

const obtenerCredencialesIntegracion = (integracion) => {
  if (!integracion) {
    return {
      clientId: '',
      clientSecret: '',
      username: '',
      password: '',
    }
  }

  return {
    clientId: integracion.clientIdCifrado ? descifrarTexto(integracion.clientIdCifrado) : '',
    clientSecret: integracion.clientSecretCifrado ? descifrarTexto(integracion.clientSecretCifrado) : '',
    username: integracion.usernameCifrado ? descifrarTexto(integracion.usernameCifrado) : '',
    password: integracion.passwordCifrado ? descifrarTexto(integracion.passwordCifrado) : '',
  }
}

const resolverConfiguracionFactus = (integracion) => {
  const configuracionLocal = obtenerConfiguracionFactusEnv()
  const credencialesIntegracion = obtenerCredencialesIntegracion(integracion)
  const usaCredencialesIntegracion = Boolean(
    credencialesIntegracion.clientId &&
    credencialesIntegracion.clientSecret &&
    credencialesIntegracion.username &&
    credencialesIntegracion.password
  )

  const clientId = credencialesIntegracion.clientId || configuracionLocal?.clientId || ''
  const clientSecret = credencialesIntegracion.clientSecret || configuracionLocal?.clientSecret || ''
  const username = credencialesIntegracion.username || configuracionLocal?.username || ''
  const password = credencialesIntegracion.password || configuracionLocal?.password || ''

  const credencialesCompletas = Boolean(clientId && clientSecret && username && password)
  const baseUrl = obtenerBaseUrlFactus({
    baseUrl: integracion?.baseUrl || configuracionLocal?.baseUrl,
    ambiente: integracion?.ambiente || configuracionLocal?.ambiente,
  })

  let fuente = 'ninguna'
  if (usaCredencialesIntegracion) {
    fuente = 'integracion'
  } else if (credencialesCompletas && configuracionLocal?.credencialesCompletas) {
    fuente = integracion ? 'mixta' : 'env'
  }

  return {
    configuracionLocal,
    configuracionEfectiva: {
      proveedor: 'factus',
      ambiente: integracion?.ambiente || configuracionLocal?.ambiente || 'sandbox',
      activa: integracion?.activa ?? configuracionLocal?.activa ?? false,
      baseUrl,
      rangoNumeracionId: integracion?.rangoNumeracionId ?? configuracionLocal?.rangoNumeracionId ?? null,
      documentoCodigo: integracion?.documentoCodigo || configuracionLocal?.documentoCodigo || '01',
      formaPagoCodigo: integracion?.formaPagoCodigo || configuracionLocal?.formaPagoCodigo || '1',
      metodoPagoCodigo: integracion?.metodoPagoCodigo || configuracionLocal?.metodoPagoCodigo || '10',
      enviarEmail: integracion?.enviarEmail ?? configuracionLocal?.enviarEmail ?? false,
      configuracionAdicional: integracion?.configuracionAdicional || {},
      clientId,
      clientSecret,
      username,
      password,
      credencialesCompletas,
      fuenteCredenciales: fuente,
    },
  }
}

const obtenerContextoFactusPorClinica = async (clinicaId) => {
  const integracion = await IntegracionFacturacion.findOne({ where: { clinicaId } })
  const { configuracionLocal, configuracionEfectiva } = resolverConfiguracionFactus(integracion)

  return {
    integracion,
    configuracionLocal,
    configuracionEfectiva,
  }
}

module.exports = {
  serializarIntegracionFactus,
  serializarConfiguracionLocalFactus,
  resolverConfiguracionFactus,
  obtenerContextoFactusPorClinica,
}
