const IntegracionFacturacion = require('../models/IntegracionFacturacion')
const { descifrarTexto } = require('./crypto')
const { obtenerBaseUrlFactus, obtenerConfiguracionFactusEnv } = require('../services/factusService')

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

// Las credenciales del servidor (FACTUS_*) solo sirven en desarrollo o si se
// habilitan a propósito con FACTUS_CREDENCIALES_COMPARTIDAS=true. En producción
// cada clínica factura con su propia cuenta: antes una clínica sin integración
// heredaba las del servidor y emitía con el NIT y el rango de la plataforma.
const permiteCredencialesEntorno = (env = process.env) =>
  env.NODE_ENV !== 'production' || env.FACTUS_CREDENCIALES_COMPARTIDAS === 'true'

const resolverConfiguracionFactus = (integracion, env = process.env) => {
  const configuracionLocal = obtenerConfiguracionFactusEnv()
  const usarEntorno = permiteCredencialesEntorno(env)
  const local = usarEntorno ? configuracionLocal : null
  const credencialesIntegracion = obtenerCredencialesIntegracion(integracion)
  const usaCredencialesIntegracion = Boolean(
    credencialesIntegracion.clientId &&
    credencialesIntegracion.clientSecret &&
    credencialesIntegracion.username &&
    credencialesIntegracion.password
  )

  // Nunca se mezclan: o las cuatro de la clínica o las cuatro del entorno.
  let credenciales = { clientId: '', clientSecret: '', username: '', password: '' }
  let fuente = 'ninguna'
  if (usaCredencialesIntegracion) {
    credenciales = credencialesIntegracion
    fuente = 'integracion'
  } else if (local?.credencialesCompletas) {
    credenciales = {
      clientId: local.clientId,
      clientSecret: local.clientSecret,
      username: local.username,
      password: local.password,
    }
    fuente = 'env'
  }

  const credencialesCompletas = fuente !== 'ninguna'
  const baseUrl = obtenerBaseUrlFactus({
    baseUrl: integracion?.baseUrl || local?.baseUrl,
    ambiente: integracion?.ambiente || local?.ambiente,
  })

  return {
    configuracionLocal,
    configuracionEfectiva: {
      proveedor: 'factus',
      ambiente: integracion?.ambiente || local?.ambiente || 'sandbox',
      activa: integracion?.activa ?? local?.activa ?? false,
      baseUrl,
      rangoNumeracionId: integracion?.rangoNumeracionId ?? local?.rangoNumeracionId ?? null,
      documentoCodigo: integracion?.documentoCodigo || local?.documentoCodigo || '01',
      formaPagoCodigo: integracion?.formaPagoCodigo || local?.formaPagoCodigo || '1',
      metodoPagoCodigo: integracion?.metodoPagoCodigo || local?.metodoPagoCodigo || '10',
      enviarEmail: integracion?.enviarEmail ?? local?.enviarEmail ?? false,
      configuracionAdicional: integracion?.configuracionAdicional || {},
      ...credenciales,
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
  permiteCredencialesEntorno,
  serializarIntegracionFactus,
  serializarConfiguracionLocalFactus,
  resolverConfiguracionFactus,
  obtenerContextoFactusPorClinica,
}
