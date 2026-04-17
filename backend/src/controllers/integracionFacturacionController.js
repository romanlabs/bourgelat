const IntegracionFacturacion = require('../models/IntegracionFacturacion')
const Clinica = require('../models/Clinica')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { cifrarTexto } = require('../config/crypto')
const {
  obtenerEmpresaFactus,
  obtenerRangosNumeracionFactus,
  obtenerUnidadesMedidaFactus,
  obtenerTributosProductosFactus,
  solicitarTokenFactus,
} = require('../services/factusService')
const {
  serializarIntegracionFactus,
  serializarConfiguracionLocalFactus,
  resolverConfiguracionFactus,
} = require('../config/factusConfig')

const calcularCamposFiscalesFaltantes = (clinica) => {
  const campos = [
    ['nit', clinica?.nit],
    ['razonSocial', clinica?.razonSocial || clinica?.nombre],
    ['direccion', clinica?.direccion],
    ['telefono', clinica?.telefono],
    ['email', clinica?.email],
    ['municipioId', clinica?.municipioId],
    ['tipoDocumentoFacturacionId', clinica?.tipoDocumentoFacturacionId],
    ['organizacionJuridicaId', clinica?.organizacionJuridicaId],
    ['tributoId', clinica?.tributoId],
  ]

  return campos.filter(([, valor]) => !valor).map(([campo]) => campo)
}

const obtenerConfiguracionFacturacion = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const [integracion, clinica] = await Promise.all([
      IntegracionFacturacion.findOne({ where: { clinicaId } }),
      Clinica.findByPk(clinicaId),
    ])

    const { configuracionLocal, configuracionEfectiva } = resolverConfiguracionFactus(integracion)

    res.json({
      integracion: serializarIntegracionFactus(integracion),
      configuracionLocal: serializarConfiguracionLocalFactus(configuracionLocal),
      configuracionEfectiva: {
        ambiente: configuracionEfectiva.ambiente,
        baseUrl: configuracionEfectiva.baseUrl,
        credencialesCompletas: configuracionEfectiva.credencialesCompletas,
        fuenteCredenciales: configuracionEfectiva.fuenteCredenciales,
      },
      perfilFiscalClinica: {
        clinicaId,
        camposFaltantes: calcularCamposFiscalesFaltantes(clinica),
      },
    })
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener la configuracion de facturacion',
      error: error.message,
    })
  }
}

const guardarConfiguracionFactus = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const {
      ambiente,
      activa,
      baseUrl,
      clientId,
      clientSecret,
      username,
      email,
      password,
      rangoNumeracionId,
      documentoCodigo,
      formaPagoCodigo,
      metodoPagoCodigo,
      enviarEmail,
      configuracionAdicional = {},
    } = req.body

    const existente = await IntegracionFacturacion.findOne({ where: { clinicaId } })

    const integracion = existente || IntegracionFacturacion.build({
      clinicaId,
      proveedor: 'factus',
    })

    integracion.ambiente = ambiente || integracion.ambiente || 'sandbox'
    if (typeof activa === 'boolean') integracion.activa = activa
    if (baseUrl !== undefined) integracion.baseUrl = baseUrl
    if (rangoNumeracionId !== undefined) integracion.rangoNumeracionId = rangoNumeracionId
    if (documentoCodigo !== undefined) integracion.documentoCodigo = documentoCodigo
    if (formaPagoCodigo !== undefined) integracion.formaPagoCodigo = formaPagoCodigo
    if (metodoPagoCodigo !== undefined) integracion.metodoPagoCodigo = metodoPagoCodigo
    if (typeof enviarEmail === 'boolean') integracion.enviarEmail = enviarEmail
    integracion.configuracionAdicional = {
      ...(integracion.configuracionAdicional || {}),
      ...configuracionAdicional,
    }

    if (clientId) integracion.clientIdCifrado = cifrarTexto(clientId)
    if (clientSecret) integracion.clientSecretCifrado = cifrarTexto(clientSecret)
    if (username || email) integracion.usernameCifrado = cifrarTexto(username || email)
    if (password) integracion.passwordCifrado = cifrarTexto(password)

    await integracion.save()

    await registrarAuditoria({
      accion: 'GUARDAR_CONFIG_FACTUS',
      entidad: 'IntegracionFacturacion',
      entidadId: integracion.id,
      descripcion: `Configuracion de Factus ${existente ? 'actualizada' : 'creada'}`,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Configuracion de Factus guardada exitosamente',
      integracion: serializarIntegracionFactus(integracion),
    })
  } catch (error) {
    res.status(500).json({
      message: 'Error al guardar la configuracion de Factus',
      error: error.message,
    })
  }
}

const sincronizarFactus = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const [integracionExistente, clinica] = await Promise.all([
      IntegracionFacturacion.findOne({ where: { clinicaId } }),
      Clinica.findByPk(clinicaId),
    ])

    const { configuracionLocal, configuracionEfectiva } = resolverConfiguracionFactus(integracionExistente)

    if (!integracionExistente && !configuracionLocal) {
      return res.status(404).json({
        message: 'No hay configuracion de Factus guardada ni variables locales disponibles',
      })
    }

    if (!configuracionEfectiva.credencialesCompletas) {
      return res.status(400).json({
        message: 'Faltan credenciales para sincronizar Factus',
      })
    }

    const tokenFactus = await solicitarTokenFactus({
      baseUrl: configuracionEfectiva.baseUrl,
      clientId: configuracionEfectiva.clientId,
      clientSecret: configuracionEfectiva.clientSecret,
      username: configuracionEfectiva.username,
      password: configuracionEfectiva.password,
    })

    const [empresa, rangos, unidadesMedida, tributosProductos] = await Promise.all([
      obtenerEmpresaFactus({ baseUrl: configuracionEfectiva.baseUrl, token: tokenFactus.access_token }),
      obtenerRangosNumeracionFactus({ baseUrl: configuracionEfectiva.baseUrl, token: tokenFactus.access_token }),
      obtenerUnidadesMedidaFactus({ baseUrl: configuracionEfectiva.baseUrl, token: tokenFactus.access_token }),
      obtenerTributosProductosFactus({ baseUrl: configuracionEfectiva.baseUrl, token: tokenFactus.access_token }),
    ])

    const snapshot = {
      empresa: empresa.data || null,
      rangosNumeracion: rangos.data?.data || [],
      unidadesMedida: unidadesMedida.data || [],
      tributosProductos: tributosProductos.data || [],
      sincronizadoEn: new Date().toISOString(),
      fuenteCredenciales: configuracionEfectiva.fuenteCredenciales,
    }

    const integracion = integracionExistente || await IntegracionFacturacion.create({
      clinicaId,
      proveedor: 'factus',
      ambiente: configuracionEfectiva.ambiente,
      activa: configuracionEfectiva.activa,
      baseUrl: configuracionEfectiva.baseUrl,
      rangoNumeracionId: configuracionEfectiva.rangoNumeracionId,
      documentoCodigo: configuracionEfectiva.documentoCodigo,
      formaPagoCodigo: configuracionEfectiva.formaPagoCodigo,
      metodoPagoCodigo: configuracionEfectiva.metodoPagoCodigo,
      enviarEmail: configuracionEfectiva.enviarEmail,
      configuracionAdicional: {},
    })

    await integracion.update({
      ambiente: configuracionEfectiva.ambiente,
      activa: configuracionEfectiva.activa,
      baseUrl: configuracionEfectiva.baseUrl,
      rangoNumeracionId: configuracionEfectiva.rangoNumeracionId,
      documentoCodigo: configuracionEfectiva.documentoCodigo,
      formaPagoCodigo: configuracionEfectiva.formaPagoCodigo,
      metodoPagoCodigo: configuracionEfectiva.metodoPagoCodigo,
      enviarEmail: configuracionEfectiva.enviarEmail,
      configuracionAdicional: {
        ...(integracion.configuracionAdicional || {}),
        catalogosFactus: snapshot,
      },
      ultimoChequeo: new Date(),
      ultimoEstadoChequeo: 'exitoso',
      ultimoMensajeChequeo: 'Sincronizacion con Factus exitosa',
    })

    if (clinica && empresa.data) {
      const updateClinica = {}

      if (!clinica.nit && empresa.data.nit) updateClinica.nit = empresa.data.nit
      if (!clinica.digitoVerificacion && empresa.data.dv) updateClinica.digitoVerificacion = empresa.data.dv
      if (!clinica.razonSocial && empresa.data.company) updateClinica.razonSocial = empresa.data.company
      if (!clinica.nombreComercial && empresa.data.trade_name) updateClinica.nombreComercial = empresa.data.trade_name
      if (!clinica.telefono && empresa.data.phone) updateClinica.telefono = empresa.data.phone
      if (!clinica.email && empresa.data.email) updateClinica.email = empresa.data.email
      if (!clinica.direccion && empresa.data.address) updateClinica.direccion = empresa.data.address
      if (!clinica.organizacionJuridicaId && empresa.data.legal_organization?.code) {
        updateClinica.organizacionJuridicaId = empresa.data.legal_organization.code
      }

      if (Object.keys(updateClinica).length > 0) {
        await clinica.update(updateClinica)
      }
    }

    await registrarAuditoria({
      accion: 'SINCRONIZAR_FACTUS',
      entidad: 'IntegracionFacturacion',
      entidadId: integracion?.id,
      descripcion: 'Sincronizacion de empresa, rangos y catalogos de Factus',
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Sincronizacion con Factus exitosa',
      integracion: serializarIntegracionFactus(integracion),
      configuracionLocal: serializarConfiguracionLocalFactus(configuracionLocal),
      sincronizacion: {
        empresa: snapshot.empresa,
        totalRangos: snapshot.rangosNumeracion.length,
        totalUnidadesMedida: snapshot.unidadesMedida.length,
        totalTributosProductos: snapshot.tributosProductos.length,
        sincronizadoEn: snapshot.sincronizadoEn,
      },
    })
  } catch (error) {
    res.status(400).json({
      message: 'No fue posible sincronizar Factus',
      error: error.message,
      payload: error.payload || null,
    })
  }
}

const probarConexionFactus = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const integracion = await IntegracionFacturacion.findOne({ where: { clinicaId } })
    const { configuracionLocal, configuracionEfectiva } = resolverConfiguracionFactus(integracion)

    if (!integracion && !configuracionLocal) {
      return res.status(404).json({
        message: 'No hay configuracion de Factus guardada ni variables locales disponibles',
      })
    }

    if (!configuracionEfectiva.credencialesCompletas) {
      return res.status(400).json({
        message: 'Faltan credenciales para probar la conexion con Factus',
      })
    }

    const tokenFactus = await solicitarTokenFactus({
      baseUrl: configuracionEfectiva.baseUrl,
      clientId: configuracionEfectiva.clientId,
      clientSecret: configuracionEfectiva.clientSecret,
      username: configuracionEfectiva.username,
      password: configuracionEfectiva.password,
    })

    if (integracion) {
      await integracion.update({
        ultimoChequeo: new Date(),
        ultimoEstadoChequeo: 'exitoso',
        ultimoMensajeChequeo: 'Autenticacion con Factus exitosa',
      })
    }

    await registrarAuditoria({
      accion: 'PROBAR_CONFIG_FACTUS',
      entidad: 'IntegracionFacturacion',
      entidadId: integracion?.id,
      descripcion: `Prueba de autenticacion con Factus exitosa usando ${configuracionEfectiva.fuenteCredenciales}`,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Conexion con Factus exitosa',
      expiracionToken: tokenFactus.expires_in || null,
      integracion: serializarIntegracionFactus(integracion),
      configuracionLocal: serializarConfiguracionLocalFactus(configuracionLocal),
      fuenteCredenciales: configuracionEfectiva.fuenteCredenciales,
    })
  } catch (error) {
    try {
      const integracion = await IntegracionFacturacion.findOne({ where: { clinicaId: req.usuario.clinicaId } })

      if (integracion) {
        await integracion.update({
          ultimoChequeo: new Date(),
          ultimoEstadoChequeo: 'fallido',
          ultimoMensajeChequeo: error.message,
        })
      }
    } catch {
      // No bloquear la respuesta principal si falla el estado local
    }

    await registrarAuditoria({
      accion: 'PROBAR_CONFIG_FACTUS',
      entidad: 'IntegracionFacturacion',
      descripcion: `Prueba de autenticacion con Factus fallida: ${error.message}`,
      req,
      resultado: 'fallido',
    })

    res.status(400).json({
      message: 'No fue posible autenticarse con Factus',
      error: error.message,
      payload: error.payload || null,
    })
  }
}

module.exports = {
  obtenerConfiguracionFacturacion,
  guardarConfiguracionFactus,
  sincronizarFactus,
  probarConexionFactus,
}
