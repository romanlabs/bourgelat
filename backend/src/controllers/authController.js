const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const sequelize = require('../config/database')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RefreshToken = require('../models/RefreshToken')
const Suscripcion = require('../models/Suscripcion')
const { appConfig } = require('../config/app')
const { crearSuscripcionEsencial } = require('../config/planes')
const {
  setAuthCookies,
  clearAuthCookies,
  obtenerRefreshTokenRequest,
} = require('../config/cookies')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { obtenerSuscripcionActivaClinica } = require('../services/suscripcionService')
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const generarAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

const generarRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  })

const calcularFechaExpiracionRefresh = () => {
  const expiracion = new Date()
  expiracion.setMilliseconds(
    expiracion.getMilliseconds() + appConfig.cookies.refreshMaxAgeMs
  )
  return expiracion
}

const estaTemporalmenteBloqueado = (usuario) =>
  Boolean(
    usuario?.bloqueadoHasta &&
      new Date(usuario.bloqueadoHasta).getTime() > Date.now()
  )

const limpiarTexto = (valor) => {
  if (typeof valor !== 'string') return valor ?? null
  const limpio = valor.trim()
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

const esTelefonoColombianoValido = (valor) => /^3\d{9}$/.test(valor)

const registrarIntentoFallido = async (usuario) => {
  const intentosFallidos = (usuario.intentosFallidos || 0) + 1
  const data = { intentosFallidos }

  if (intentosFallidos >= appConfig.auth.maxIntentosFallidos) {
    const bloqueadoHasta = new Date()
    bloqueadoHasta.setMinutes(
      bloqueadoHasta.getMinutes() + appConfig.auth.minutosBloqueo
    )

    data.bloqueadoHasta = bloqueadoHasta
    data.intentosFallidos = 0
  }

  await usuario.update(data)
}

const limpiarEstadoAccesoUsuario = async (usuario) => {
  await usuario.update({
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: new Date(),
  })
}

const guardarRefreshToken = async ({
  token,
  clinicaId,
  usuarioId,
  ip,
  userAgent,
  transaction,
}) => {
  await RefreshToken.create(
    {
      token,
      expiracion: calcularFechaExpiracionRefresh(),
      clinicaId: clinicaId || null,
      usuarioId: usuarioId || null,
      ip,
      userAgent,
    },
    { transaction }
  )
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
    logo: clinica.logo,
    activo: clinica.activo,
  }
}

const serializarUsuario = (usuario) => {
  if (!usuario) return null

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    rolesAdicionales: usuario.rolesAdicionales || [],
    clinicaId: usuario.clinicaId,
    telefono: usuario.telefono,
    activo: usuario.activo,
  }
}

const obtenerSuscripcionSesion = async (clinicaId) => {
  if (!clinicaId) return null

  const { suscripcion } = await obtenerSuscripcionActivaClinica(clinicaId)
  return suscripcion
}

const responderErrorInterno = (res, mensaje = 'Error interno del servidor') =>
  res.status(500).json({ message: mensaje })

const registro = async (req, res) => {
  try {
    const {
      nombre,
      nombreAdministrador,
      email,
      emailClinica,
      password,
      telefono,
      direccion,
      ciudad,
      departamento,
      nit,
      razonSocial,
      nombreComercial,
      tipoPersona,
      digitoVerificacion,
      codigoPostal,
      municipioId,
      tipoDocumentoFacturacionId,
      organizacionJuridicaId,
      tributoId,
    } = req.body

    if (
      !nombre ||
      !nombreAdministrador ||
      !email ||
      !emailClinica ||
      !telefono ||
      !ciudad ||
      !departamento ||
      !password
    ) {
      return res.status(400).json({
        message:
          'Nombre de la clinica, responsable, correos, telefono, ciudad, departamento y password son obligatorios',
      })
    }

    if (!passwordFuerteRegex.test(password)) {
      return res.status(400).json({
        message:
          'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial',
      })
    }

    const nombreClinica = limpiarTexto(nombre)
    const nombreUsuarioAdmin = limpiarTexto(nombreAdministrador)
    const emailAdministrador = normalizarEmail(email)
    const emailContactoClinica = normalizarEmail(emailClinica)
    const telefonoNormalizado = normalizarTelefonoColombiano(telefono)
    const direccionNormalizada = limpiarTexto(direccion)
    const ciudadNormalizada = limpiarTexto(ciudad)
    const departamentoNormalizado = limpiarTexto(departamento)
    const nitNormalizado = limpiarTexto(nit)

    if (
      !nombreClinica ||
      !nombreUsuarioAdmin ||
      !emailAdministrador ||
      !emailContactoClinica ||
      !telefonoNormalizado ||
      !ciudadNormalizada ||
      !departamentoNormalizado
    ) {
      return res.status(400).json({
        message:
          'Nombre de la clinica, responsable, correos, telefono, ciudad y departamento son obligatorios',
      })
    }

    if (!esTelefonoColombianoValido(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El telefono debe ser un celular colombiano valido de 10 digitos',
      })
    }

    const [clinicaPorEmail, usuarioPorEmail, clinicaPorNit] = await Promise.all([
      Clinica.findOne({ where: { email: emailContactoClinica } }),
      Usuario.findOne({ where: { email: emailAdministrador } }),
      nitNormalizado
        ? Clinica.findOne({ where: { nit: nitNormalizado } })
        : Promise.resolve(null),
    ])

    if (clinicaPorEmail) {
      return res.status(400).json({
        message: 'El email de la clinica ya esta registrado',
      })
    }

    if (usuarioPorEmail) {
      return res.status(400).json({
        message: 'El email del administrador ya esta registrado',
      })
    }

    if (clinicaPorNit) {
      return res.status(400).json({
        message: 'El NIT ya esta registrado para otra clinica',
      })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const resultado = await sequelize.transaction(async (transaction) => {
      const clinica = await Clinica.create(
        {
          nombre: nombreClinica,
          email: emailContactoClinica,
          // Se mantiene mientras Clinica siga exigiendo password en el modelo.
          // El acceso real al sistema se hace con Usuario.
          password: passwordHash,
          telefono: telefonoNormalizado,
          direccion: direccionNormalizada,
          ciudad: ciudadNormalizada,
          departamento: departamentoNormalizado,
          nit: nitNormalizado,
          razonSocial: limpiarTexto(razonSocial),
          nombreComercial: limpiarTexto(nombreComercial) || nombreClinica,
          tipoPersona: tipoPersona || 'persona_juridica',
          digitoVerificacion: limpiarTexto(digitoVerificacion),
          codigoPostal: limpiarTexto(codigoPostal),
          municipioId: municipioId || null,
          tipoDocumentoFacturacionId: tipoDocumentoFacturacionId || null,
          organizacionJuridicaId: limpiarTexto(organizacionJuridicaId),
          tributoId: limpiarTexto(tributoId),
        },
        { transaction }
      )

      const usuarioAdmin = await Usuario.create(
        {
          nombre: nombreUsuarioAdmin,
          email: emailAdministrador,
          password: passwordHash,
          rol: 'admin',
          clinicaId: clinica.id,
          telefono: telefonoNormalizado,
          activo: true,
        },
        { transaction }
      )

      const suscripcion = await Suscripcion.create(crearSuscripcionEsencial(clinica.id), {
        transaction,
      })

      const payload = {
        id: usuarioAdmin.id,
        clinicaId: clinica.id,
        rol: usuarioAdmin.rol,
        rolesAdicionales: usuarioAdmin.rolesAdicionales || [],
      }

      const accessToken = generarAccessToken(payload)
      const refreshToken = generarRefreshToken(payload)

      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: clinica.id,
        usuarioId: usuarioAdmin.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        transaction,
      })

      return {
        clinica,
        usuarioAdmin,
        suscripcion,
        accessToken,
        refreshToken,
      }
    })

    await registrarAuditoria({
      accion: 'REGISTRO_CLINICA',
      entidad: 'Clinica',
      entidadId: resultado.clinica.id,
      descripcion: `Nueva clinica registrada ${resultado.clinica.email}`,
      req,
      resultado: 'exitoso',
    })

    delete resultado.clinica.dataValues.password

    setAuthCookies(res, {
      accessToken: resultado.accessToken,
      refreshToken: resultado.refreshToken,
    })

    res.status(201).json({
      message: 'Clinica registrada exitosamente',
      usuario: serializarUsuario(resultado.usuarioAdmin),
      clinica: serializarClinica(resultado.clinica),
      suscripcion: resultado.suscripcion,
    })
  } catch (error) {
    responderErrorInterno(res, 'Error en servidor')
  }
}

const login = async (req, res) => {
  try {
    const email = normalizarEmail(req.body.email)
    const { password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y password son obligatorios',
      })
    }

    const usuario = await Usuario.findOne({
      where: { email },
      include: [
        {
          model: Clinica,
          attributes: [
            'id',
            'nombre',
            'email',
            'telefono',
            'direccion',
            'ciudad',
            'departamento',
            'nit',
            'razonSocial',
            'nombreComercial',
            'tipoPersona',
            'logo',
            'activo',
          ],
        },
      ],
    })

    if (!usuario) {
      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        descripcion: `Intento login con email inexistente ${email}`,
        req,
        resultado: 'fallido',
      })

      return res.status(401).json({
        message: 'Credenciales incorrectas',
      })
    }

    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Usuario desactivado',
      })
    }

    if (usuario.clinicaId && usuario.Clinica && !usuario.Clinica.activo) {
      return res.status(403).json({
        message: 'La clinica esta desactivada',
      })
    }

    if (estaTemporalmenteBloqueado(usuario)) {
      return res.status(423).json({
        message: `Usuario bloqueado temporalmente hasta ${new Date(usuario.bloqueadoHasta).toISOString()}`,
      })
    }

    const passwordValido = await bcrypt.compare(password, usuario.password)

    if (!passwordValido) {
      await registrarIntentoFallido(usuario)

      await registrarAuditoria({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Password incorrecta para ${usuario.email}`,
        req,
        resultado: 'fallido',
      })

      return res.status(401).json({
        message: 'Credenciales incorrectas',
      })
    }

    await limpiarEstadoAccesoUsuario(usuario)

    const payload = {
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales || [],
    }

    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: refreshToken,
      clinicaId: usuario.clinicaId,
      usuarioId: usuario.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    await registrarAuditoria({
      accion: 'LOGIN',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Login exitoso ${usuario.email}`,
      req,
      resultado: 'exitoso',
    })

    setAuthCookies(res, { accessToken, refreshToken })
    const suscripcion = await obtenerSuscripcionSesion(usuario.clinicaId)

    res.json({
      message: 'Login exitoso',
      usuario: serializarUsuario(usuario),
      clinica: serializarClinica(usuario.Clinica),
      suscripcion,
    })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const refresh = async (req, res) => {
  try {
    const refreshToken = obtenerRefreshTokenRequest(req)

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token requerido',
      })
    }

    const tokenDB = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        revocado: false,
        expiracion: {
          [Op.gt]: new Date(),
        },
      },
    })

    if (!tokenDB) {
      return res.status(401).json({
        message: 'Refresh token invalido o expirado',
      })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    await tokenDB.update({
      revocado: true,
    })

    const usuario = await Usuario.findOne({
      where: { id: tokenDB.usuarioId || decoded.id },
      include: [
        {
          model: Clinica,
          attributes: ['id', 'activo'],
          required: false,
        },
      ],
    })

    if (!usuario) {
      return res.status(401).json({
        message: 'Sesion invalida, usuario no encontrado',
      })
    }

    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE',
      })
    }

    if (usuario.clinicaId && usuario.Clinica && !usuario.Clinica.activo) {
      return res.status(401).json({
        message: 'La clinica asociada se encuentra inactiva',
        code: 'CLINIC_INACTIVE',
      })
    }

    const payload = {
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales || [],
    }

    const nuevoAccessToken = generarAccessToken(payload)
    const nuevoRefreshToken = generarRefreshToken(payload)

    await guardarRefreshToken({
      token: nuevoRefreshToken,
      clinicaId: tokenDB.clinicaId,
      usuarioId: tokenDB.usuarioId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    setAuthCookies(res, {
      accessToken: nuevoAccessToken,
      refreshToken: nuevoRefreshToken,
    })

    res.json({
      ok: true,
    })
  } catch (error) {
    res.status(401).json({
      message: 'Refresh token invalido',
    })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = obtenerRefreshTokenRequest(req)

    if (refreshToken) {
      await RefreshToken.update(
        { revocado: true },
        { where: { token: refreshToken } }
      )
    }

    clearAuthCookies(res)

    res.json({
      message: 'Sesion cerrada exitosamente',
    })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const logoutAll = async (req, res) => {
  try {
    const usuarioId = req.auth?.usuarioId || req.usuario.id

    await RefreshToken.update(
      { revocado: true },
      { where: { usuarioId, revocado: false } }
    )

    clearAuthCookies(res)

    await registrarAuditoria({
      accion: 'LOGOUT_ALL',
      entidad: 'Usuario',
      entidadId: usuarioId,
      descripcion: 'Cierre de todas las sesiones activas',
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Todas las sesiones fueron cerradas exitosamente',
    })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const me = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.auth?.usuarioId || req.usuario.id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Clinica,
          attributes: [
            'id',
            'nombre',
            'email',
            'telefono',
            'direccion',
            'ciudad',
            'departamento',
            'nit',
            'razonSocial',
            'nombreComercial',
            'tipoPersona',
            'logo',
            'activo',
          ],
        },
      ],
    })

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado',
      })
    }

    const suscripcion = await obtenerSuscripcionSesion(usuario.clinicaId)

    res.json({
      usuario: serializarUsuario(usuario),
      clinica: serializarClinica(usuario.Clinica),
      suscripcion,
    })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

module.exports = {
  registro,
  login,
  refresh,
  logout,
  logoutAll,
  me,
}
