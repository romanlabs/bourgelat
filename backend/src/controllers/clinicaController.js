const { Op } = require('sequelize')
const Clinica = require('../models/Clinica')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

const telefonoColombiaRegex = /^3\d{9}$/

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const limpio = String(valor).trim()
  return limpio || null
}

const normalizarEmail = (valor) => {
  const limpio = limpiarTexto(valor)
  return limpio ? limpio.toLowerCase() : null
}

const normalizarTelefonoColombiano = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null

  const soloNumeros = limpio.replace(/\D/g, '')
  const sinPrefijo =
    soloNumeros.length > 10 && soloNumeros.startsWith('57')
      ? soloNumeros.slice(2)
      : soloNumeros

  return sinPrefijo.slice(0, 10) || null
}

const normalizarNit = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null
  return limpio.replace(/\D/g, '').slice(0, 15) || null
}

const serializarClinica = (clinica) => {
  if (!clinica) return null

  return {
    id: clinica.id,
    nombre: clinica.nombre,
    email: clinica.email,
    telefono: clinica.telefono,
    direccion: clinica.direccion,
    ciudad: clinica.ciudad,
    departamento: clinica.departamento,
    nit: clinica.nit,
    razonSocial: clinica.razonSocial,
    nombreComercial: clinica.nombreComercial,
    tipoPersona: clinica.tipoPersona,
    digitoVerificacion: clinica.digitoVerificacion,
    codigoPostal: clinica.codigoPostal,
    municipioId: clinica.municipioId,
    tipoDocumentoFacturacionId: clinica.tipoDocumentoFacturacionId,
    organizacionJuridicaId: clinica.organizacionJuridicaId,
    tributoId: clinica.tributoId,
    logo: clinica.logo,
    activo: clinica.activo,
    ultimoAcceso: clinica.ultimoAcceso,
  }
}

const calcularPerfilFiscal = (clinica) => {
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

  const camposFaltantes = campos
    .filter(([, valor]) => valor === undefined || valor === null || valor === '')
    .map(([campo]) => campo)

  return {
    listoParaFacturacion: camposFaltantes.length === 0,
    camposFaltantes,
  }
}

const obtenerClinicaActual = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const clinica = await Clinica.findByPk(clinicaId)

    if (!clinica) {
      return res.status(404).json({ message: 'Clinica no encontrada' })
    }

    res.json({
      clinica: serializarClinica(clinica),
      perfilFiscal: calcularPerfilFiscal(clinica),
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const actualizarClinicaActual = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const clinica = await Clinica.findByPk(clinicaId)

    if (!clinica) {
      return res.status(404).json({ message: 'Clinica no encontrada' })
    }

    const datosAnteriores = serializarClinica(clinica)

    const nombre = req.body.nombre === undefined ? undefined : limpiarTexto(req.body.nombre)
    const email = req.body.email === undefined ? undefined : normalizarEmail(req.body.email)
    const telefono =
      req.body.telefono === undefined ? undefined : normalizarTelefonoColombiano(req.body.telefono)
    const direccion =
      req.body.direccion === undefined ? undefined : limpiarTexto(req.body.direccion)
    const ciudad = req.body.ciudad === undefined ? undefined : limpiarTexto(req.body.ciudad)
    const departamento =
      req.body.departamento === undefined ? undefined : limpiarTexto(req.body.departamento)
    const nit = req.body.nit === undefined ? undefined : normalizarNit(req.body.nit)
    const razonSocial =
      req.body.razonSocial === undefined ? undefined : limpiarTexto(req.body.razonSocial)
    const nombreComercial =
      req.body.nombreComercial === undefined ? undefined : limpiarTexto(req.body.nombreComercial)
    const tipoPersona =
      req.body.tipoPersona === undefined ? undefined : limpiarTexto(req.body.tipoPersona)
    const digitoVerificacion =
      req.body.digitoVerificacion === undefined
        ? undefined
        : limpiarTexto(req.body.digitoVerificacion)
    const codigoPostal =
      req.body.codigoPostal === undefined ? undefined : limpiarTexto(req.body.codigoPostal)
    const municipioId =
      req.body.municipioId === undefined || req.body.municipioId === null || req.body.municipioId === ''
        ? undefined
        : Number(req.body.municipioId)
    const tipoDocumentoFacturacionId =
      req.body.tipoDocumentoFacturacionId === undefined ||
      req.body.tipoDocumentoFacturacionId === null ||
      req.body.tipoDocumentoFacturacionId === ''
        ? undefined
        : Number(req.body.tipoDocumentoFacturacionId)
    const organizacionJuridicaId =
      req.body.organizacionJuridicaId === undefined
        ? undefined
        : limpiarTexto(req.body.organizacionJuridicaId)
    const tributoId =
      req.body.tributoId === undefined ? undefined : limpiarTexto(req.body.tributoId)
    const logo = req.body.logo === undefined ? undefined : limpiarTexto(req.body.logo)

    if (telefono !== undefined && telefono && !telefonoColombiaRegex.test(telefono)) {
      return res.status(400).json({
        message: 'El telefono debe ser un celular colombiano valido de 10 digitos',
      })
    }

    if (nombre !== undefined && !nombre) {
      return res.status(400).json({ message: 'El nombre institucional no puede estar vacio' })
    }

    if (email && email !== clinica.email) {
      const emailEnUso = await Clinica.findOne({
        where: {
          email,
          id: { [Op.ne]: clinicaId },
        },
      })

      if (emailEnUso) {
        return res.status(400).json({ message: 'El email institucional ya esta registrado' })
      }
    }

    if (nit && nit !== clinica.nit) {
      const nitEnUso = await Clinica.findOne({
        where: {
          nit,
          id: { [Op.ne]: clinicaId },
        },
      })

      if (nitEnUso) {
        return res.status(400).json({ message: 'El NIT ya esta registrado por otra clinica' })
      }
    }

    const data = {}

    if (nombre !== undefined) data.nombre = nombre
    if (email !== undefined) data.email = email
    if (telefono !== undefined) data.telefono = telefono
    if (direccion !== undefined) data.direccion = direccion
    if (ciudad !== undefined) data.ciudad = ciudad
    if (departamento !== undefined) data.departamento = departamento
    if (nit !== undefined) data.nit = nit
    if (razonSocial !== undefined) data.razonSocial = razonSocial
    if (nombreComercial !== undefined) data.nombreComercial = nombreComercial
    if (tipoPersona !== undefined) data.tipoPersona = tipoPersona
    if (digitoVerificacion !== undefined) data.digitoVerificacion = digitoVerificacion
    if (codigoPostal !== undefined) data.codigoPostal = codigoPostal
    if (municipioId !== undefined) data.municipioId = municipioId || null
    if (tipoDocumentoFacturacionId !== undefined) {
      data.tipoDocumentoFacturacionId = tipoDocumentoFacturacionId || null
    }
    if (organizacionJuridicaId !== undefined) data.organizacionJuridicaId = organizacionJuridicaId
    if (tributoId !== undefined) data.tributoId = tributoId
    if (logo !== undefined) data.logo = logo

    await clinica.update(data)

    await registrarAuditoria({
      accion: 'ACTUALIZAR_CLINICA',
      entidad: 'Clinica',
      entidadId: clinica.id,
      descripcion: 'Datos institucionales y fiscales actualizados desde configuracion',
      datosAnteriores,
      datosNuevos: serializarClinica(clinica),
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Configuracion de la clinica actualizada exitosamente',
      clinica: serializarClinica(clinica),
      perfilFiscal: calcularPerfilFiscal(clinica),
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  obtenerClinicaActual,
  actualizarClinicaActual,
  serializarClinica,
  calcularPerfilFiscal,
}
