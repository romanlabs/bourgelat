const bcrypt = require('bcryptjs')

// Hash de una clave que nadie tiene: con un email inexistente se compara contra
// él para que la respuesta tarde lo mismo y no delate qué correos existen.
let hashFicticio = null
const compararConHashFicticio = async (password) => {
  if (!hashFicticio) hashFicticio = await bcrypt.hash('bourgelat-cuenta-inexistente', 12)
  await bcrypt.compare(String(password || ''), hashFicticio)
}
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')

const sequelize = require('../config/database')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RefreshToken = require('../models/RefreshToken')
const PasswordResetToken = require('../models/PasswordResetToken')
const EmailVerificationToken = require('../models/EmailVerificationToken')
const Suscripcion = require('../models/Suscripcion')
const { appConfig } = require('../config/app')
const { crearSuscripcionPrueba } = require('../config/planes')
const {
  setAuthCookies,
  clearAuthCookies,
  obtenerRefreshTokenRequest,
} = require('../config/cookies')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { obtenerSuscripcionActivaClinica } = require('../services/suscripcionService')
const {
  generarAccessToken,
  generarRefreshToken,
  guardarRefreshToken,
  huellaRefreshToken,
} = require('../services/sesionService')
const { limpiarTexto, normalizarEmail, normalizarTelefonoColombiano } = require('../utils/normalizar')
const {
  enviarEmailRecuperacionPassword,
  enviarEmailVerificacion,
  enviarEmailCodigoVerificacion,
} = require('../services/emailService')
const {
  crearCodigo,
  esperaRestante,
  validarCodigo,
  consumirCodigo,
  puedeCrearOtroCodigo,
} = require('../services/codigoVerificacionService')
const {
  setCookiePendiente,
  clearCookiePendiente,
  obtenerUsuarioPendienteRequest,
} = require('../services/verificacionPendienteService')
const logger = require('../utils/logger')
const { registrarAceptacionesRegistro } = require('../services/aceptacionLegalService')
const { validarCorreoRegistro } = require('../services/correoRegistroService')
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const estaTemporalmenteBloqueado = (usuario) =>
  Boolean(
    usuario?.bloqueadoHasta &&
      new Date(usuario.bloqueadoHasta).getTime() > Date.now()
  )

const esTelefonoColombianoValido = (valor) => /^3\d{9}$/.test(valor)

const registrarIntentoFallido = async (usuario) => {
  // Incremento atomico en SQL (SET intentosFallidos = intentosFallidos + 1)
  // para que rafagas concurrentes de login no se pisen el contador y
  // permitan saltarse el bloqueo. reload() trae el valor real ya aplicado.
  await usuario.increment('intentosFallidos')
  // reload() dispara un findOne interno sin propagar el `sinTenant` que uso
  // la consulta original — hay que repetirlo aqui o el tenantGuard lo bloquea.
  await usuario.reload({ sinTenant: true })

  if (usuario.intentosFallidos >= appConfig.auth.maxIntentosFallidos) {
    const bloqueadoHasta = new Date()
    bloqueadoHasta.setMinutes(
      bloqueadoHasta.getMinutes() + appConfig.auth.minutosBloqueo
    )

    await usuario.update({
      bloqueadoHasta,
      intentosFallidos: 0,
    })
  }
}

const limpiarEstadoAccesoUsuario = async (usuario) => {
  await usuario.update({
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ultimoAcceso: new Date(),
  })
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
    foto: usuario.foto,
    cargo: usuario.cargo,
    tarjetaProfesional: usuario.tarjetaProfesional,
    proveedorAuth: usuario.proveedorAuth,
    emailVerificado: usuario.emailVerificado,
    onboarding: usuario.onboarding ?? null,
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

const MENSAJE_CODIGO_ENVIADO = 'Te enviamos un código de 6 dígitos a tu correo.'
const MENSAJE_TOPE_CODIGOS =
  'Ya te enviamos varios códigos. Revisa tu correo (también spam) o inténtalo mañana.'

// Crea un codigo nuevo y lo envia. Nunca lanza: un fallo de correo solo se registra.
const enviarCodigoAlUsuario = async (usuario) => {
  try {
    const codigo = await crearCodigo(usuario.id)
    await enviarEmailCodigoVerificacion({
      para: usuario.email,
      nombre: usuario.nombre || usuario.email.split('@')[0],
      codigo,
      urlFrontend: urlFrontend(),
    })
    return true
  } catch (error) {
    logger.error({ contexto: 'verificacion-codigo', mensaje: `No se pudo enviar el codigo: ${error.message}` })
    return false
  }
}

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

    if (!nombre || !nombreAdministrador || !email || !password) {
      return res.status(400).json({
        message: 'Nombre de la clinica, responsable, email y password son obligatorios',
      })
    }

    if (!passwordFuerteRegex.test(password)) {
      return res.status(400).json({
        message:
          'La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y carácter especial',
      })
    }

    const nombreClinica = limpiarTexto(nombre)
    const nombreUsuarioAdmin = limpiarTexto(nombreAdministrador)
    const emailAdministrador = normalizarEmail(email)
    const emailContactoClinica = normalizarEmail(emailClinica) || emailAdministrador
    const telefonoNormalizado = normalizarTelefonoColombiano(telefono)
    const direccionNormalizada = limpiarTexto(direccion)
    const ciudadNormalizada = limpiarTexto(ciudad)
    const departamentoNormalizado = limpiarTexto(departamento)
    const nitNormalizado = limpiarTexto(nit)

    if (!nombreClinica || !nombreUsuarioAdmin || !emailAdministrador) {
      return res.status(400).json({
        message: 'Nombre de la clinica, responsable y email son obligatorios',
      })
    }

    if (telefonoNormalizado && !esTelefonoColombianoValido(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El teléfono debe ser un celular colombiano válido de 10 dígitos',
      })
    }

    // Correo desechable o de un dominio sin MX: no recibiría el código de verificación.
    for (const correo of new Set([emailAdministrador, emailContactoClinica])) {
      const validacion = await validarCorreoRegistro(correo)
      if (!validacion.ok) return res.status(400).json({ message: validacion.mensaje })
    }

    const [clinicaPorEmail, usuarioPorEmail, clinicaPorNit] = await Promise.all([
      Clinica.findOne({ where: { email: emailContactoClinica } }),
      Usuario.findOne({ where: { email: emailAdministrador }, sinTenant: true }),
      nitNormalizado
        ? Clinica.findOne({ where: { nit: nitNormalizado } })
        : Promise.resolve(null),
    ])

    if (clinicaPorEmail) {
      return res.status(400).json({
        message: 'El email de la clínica ya está registrado',
      })
    }

    if (usuarioPorEmail) {
      return res.status(400).json({
        message: 'El email del administrador ya está registrado',
      })
    }

    if (clinicaPorNit) {
      return res.status(400).json({
        message: 'El NIT ya está registrado para otra clínica',
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
          telefono: telefonoNormalizado || null,
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
          emailVerificado: false,
          requiereVerificacionCodigo: true,
        },
        { transaction }
      )

      const suscripcion = await Suscripcion.create(crearSuscripcionPrueba(clinica.id), {
        transaction,
      })

      await registrarAceptacionesRegistro({
        usuarioId: usuarioAdmin.id,
        clinicaId: clinica.id,
        aceptaComunicaciones: req.body.aceptaComunicaciones,
        origen: 'registro',
        req,
        transaction,
      })

      return { clinica, usuarioAdmin, suscripcion }
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

    // Si el envio falla no se rompe el registro: el usuario puede reenviar el codigo.
    await enviarCodigoAlUsuario(resultado.usuarioAdmin)

    setCookiePendiente(res, resultado.usuarioAdmin.id)
    res.status(201).json({
      requiereVerificacion: true,
      email: resultado.usuarioAdmin.email,
      message: MENSAJE_CODIGO_ENVIADO,
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
      sinTenant: true,
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
      await compararConHashFicticio(password)
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

    if (estaTemporalmenteBloqueado(usuario)) {
      return res.status(423).json({
        message: 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
      })
    }

    if (!usuario.password) {
      const proveedorNombre = usuario.proveedorAuth === 'microsoft' ? 'Microsoft' : 'Google'
      return res.status(400).json({
        message: `Esta cuenta usa inicio de sesion con ${proveedorNombre}. Usa el boton "Continuar con ${proveedorNombre}"`,
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

    // El estado de la cuenta solo se revela a quien ya demostró tener la clave.
    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Tu usuario está desactivado. Pide al administrador de la clínica que lo active.',
      })
    }

    if (usuario.clinicaId && usuario.Clinica && !usuario.Clinica.activo) {
      return res.status(403).json({
        message: 'La clínica está desactivada. Escríbenos a soporte@bourgelat.co.',
      })
    }

    // Cuenta nueva sin verificar: la contrasena es correcta (no cuenta como
    // intento fallido) pero no se abre sesion hasta confirmar el codigo.
    if (usuario.requiereVerificacionCodigo && !usuario.emailVerificado) {
      if (usuario.intentosFallidos > 0) await usuario.update({ intentosFallidos: 0 })
      let message = MENSAJE_CODIGO_ENVIADO
      if ((await esperaRestante(usuario.id)) === 0) {
        if (await puedeCrearOtroCodigo(usuario.id)) await enviarCodigoAlUsuario(usuario)
        else message = MENSAJE_TOPE_CODIGOS
      }
      // Solo tras la clave correcta: habilita verificar/reenviar el codigo.
      setCookiePendiente(res, usuario.id)
      return res.status(403).json({
        requiereVerificacion: true,
        email: usuario.email,
        message,
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

    // Rotacion atomica: el UPDATE condicionado a revocado:false garantiza que
    // solo UNA peticion concurrente con la misma cookie consiga canjear el
    // token. Las demas afectan 0 filas y se rechazan, cerrando la race condition
    // de doble canje.
    const [filasRotadas] = await RefreshToken.update(
      { revocado: true },
      {
        where: {
          token: huellaRefreshToken(refreshToken),
          revocado: false,
          expiracion: { [Op.gt]: new Date() },
        },
        sinTenant: true,
      }
    )

    if (filasRotadas !== 1) {
      // El token no esta activo. Si existe pero ya fue rotado/revocado, es una
      // reutilizacion: senal canonica de robo (la victima y el atacante tienen
      // la misma cadena). Revocamos toda la familia de sesiones del usuario.
      const tokenReutilizado = await RefreshToken.findOne({
        where: { token: huellaRefreshToken(refreshToken) },
        sinTenant: true,
      })

      if (tokenReutilizado) {
        await RefreshToken.update(
          { revocado: true },
          { where: { usuarioId: tokenReutilizado.usuarioId, revocado: false }, sinTenant: true }
        )

        await registrarAuditoria({
          accion: 'REFRESH_TOKEN_REUSE',
          entidad: 'Usuario',
          entidadId: tokenReutilizado.usuarioId,
          descripcion: 'Reutilizacion de refresh token detectada; sesiones revocadas',
          req,
          resultado: 'fallido',
        })
      }

      return res.status(401).json({
        message: 'Refresh token invalido o expirado',
      })
    }

    const tokenDB = await RefreshToken.findOne({
      where: { token: huellaRefreshToken(refreshToken) },
      sinTenant: true,
    })

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const usuario = await Usuario.findOne({
      where: { id: tokenDB.usuarioId || decoded.id },
      sinTenant: true,
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
        { where: { token: huellaRefreshToken(refreshToken) }, sinTenant: true }
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
      { where: { usuarioId, revocado: false }, sinTenant: true }
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
      sinTenant: true,
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

const RESET_TOKEN_MINUTOS = 30
const VERIFICATION_TOKEN_HORAS = 24

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

const urlFrontend = () =>
  (
    process.env.OAUTH_FRONTEND_URL ||
    process.env.FRONTEND_URLS?.split(',')[0] ||
    process.env.FRONTEND_URL ||
    ''
  ).replace(/\/$/, '')

// Siempre responde 200 con el mismo mensaje, exista o no la cuenta:
// no revelar qué correos están registrados (user enumeration).
const forgotPassword = async (req, res) => {
  const mensajeGenerico =
    'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'

  try {
    const email = normalizarEmail(req.body.email)
    const usuario = await Usuario.findOne({ where: { email }, sinTenant: true })

    // Cuentas OAuth (password null) no tienen contraseña que restablecer;
    // se responde igual para no filtrar el método de autenticación.
    if (!usuario || !usuario.activo || !usuario.password) {
      return res.json({ message: mensajeGenerico })
    }

    // Invalida solicitudes anteriores pendientes del mismo usuario
    await PasswordResetToken.update(
      { usado: true },
      { where: { usuarioId: usuario.id, usado: false }, sinTenant: true }
    )

    const token = crypto.randomBytes(32).toString('base64url')
    const expiracion = new Date(Date.now() + RESET_TOKEN_MINUTOS * 60 * 1000)

    await PasswordResetToken.create(
      { tokenHash: hashToken(token), expiracion, usuarioId: usuario.id },
      { sinTenant: true }
    )

    await enviarEmailRecuperacionPassword({
      para: usuario.email,
      nombre: usuario.nombre || usuario.email.split('@')[0],
      urlReset: `${urlFrontend()}/restablecer-password#token=${token}`,
    })

    await registrarAuditoria({
      accion: 'PASSWORD_RESET_SOLICITADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Solicitud de restablecimiento para ${usuario.email}`,
      req,
    })

    return res.json({ message: mensajeGenerico })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    const registro = await PasswordResetToken.findOne({
      where: {
        tokenHash: hashToken(token),
        usado: false,
        expiracion: { [Op.gt]: new Date() },
      },
      sinTenant: true,
    })

    if (!registro) {
      return res.status(401).json({
        message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      })
    }

    const usuario = await Usuario.findOne({
      where: { id: registro.usuarioId },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    await sequelize.transaction(async (transaction) => {
      await usuario.update(
        { password: passwordHash, intentosFallidos: 0, bloqueadoHasta: null },
        { transaction }
      )
      await registro.update({ usado: true }, { transaction, sinTenant: true })
      // Cierra todas las sesiones abiertas: si alguien robó la cuenta,
      // el cambio de contraseña lo expulsa.
      await RefreshToken.update(
        { revocado: true },
        { where: { usuarioId: usuario.id, revocado: false }, transaction, sinTenant: true }
      )
    })

    await registrarAuditoria({
      accion: 'PASSWORD_RESET_COMPLETADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Contrasena restablecida para ${usuario.email}`,
      req,
    })

    return res.json({ message: 'Contrasena actualizada. Ya puedes iniciar sesion.' })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const verificarEmail = async (req, res) => {
  try {
    const { token } = req.body

    const registro = await EmailVerificationToken.findOne({
      where: {
        tokenHash: hashToken(token),
        usado: false,
        expiracion: { [Op.gt]: new Date() },
      },
      sinTenant: true,
    })

    if (!registro) {
      return res.status(401).json({
        message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      })
    }

    const usuario = await Usuario.findOne({
      where: { id: registro.usuarioId },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
      })
    }

    if (!usuario.emailVerificado) {
      await sequelize.transaction(async (transaction) => {
        await usuario.update({ emailVerificado: true }, { transaction })
        await registro.update({ usado: true }, { transaction, sinTenant: true })
      })

      await registrarAuditoria({
        accion: 'EMAIL_VERIFICADO',
        entidad: 'Usuario',
        entidadId: usuario.id,
        descripcion: `Correo verificado para ${usuario.email}`,
        req,
        resultado: 'exitoso',
      })
    } else {
      await registro.update({ usado: true }, { sinTenant: true })
    }

    return res.json({ message: 'Correo verificado correctamente.' })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

// Mismo patron anti-enumeración de forgotPassword: siempre responde el mismo
// mensaje genérico, exista o no la cuenta, ya esté verificada o sea OAuth.
const reenviarVerificacion = async (req, res) => {
  const mensajeGenerico =
    'Si el correo está registrado y aún no ha sido verificado, recibirás un nuevo enlace.'

  try {
    const email = normalizarEmail(req.body.email)
    const usuario = await Usuario.findOne({ where: { email }, sinTenant: true })

    if (
      !usuario ||
      !usuario.activo ||
      usuario.emailVerificado ||
      usuario.proveedorAuth !== 'local'
    ) {
      return res.json({ message: mensajeGenerico })
    }

    await EmailVerificationToken.update(
      { usado: true },
      { where: { usuarioId: usuario.id, usado: false }, sinTenant: true }
    )

    const token = crypto.randomBytes(32).toString('base64url')
    const expiracion = new Date(Date.now() + VERIFICATION_TOKEN_HORAS * 60 * 60 * 1000)

    await EmailVerificationToken.create(
      { tokenHash: hashToken(token), expiracion, usuarioId: usuario.id },
      { sinTenant: true }
    )

    await enviarEmailVerificacion({
      para: usuario.email,
      nombre: usuario.nombre || usuario.email.split('@')[0],
      urlVerificacion: `${urlFrontend()}/verificar-email#token=${token}`,
      urlFrontend: urlFrontend(),
    })

    return res.json({ message: mensajeGenerico })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

// Cambio de contraseña estando autenticado: exige la actual y revoca las
// demás sesiones (si alguien robó la cuenta, el cambio lo expulsa).
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body

    const usuario = await Usuario.findOne({
      where: { id: req.usuario.id },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    if (!usuario.password) {
      const proveedorNombre = usuario.proveedorAuth === 'microsoft' ? 'Microsoft' : 'Google'
      return res.status(400).json({
        message: `Tu acceso es gestionado por ${proveedorNombre}; no tienes contrasena en Bourgelat`,
      })
    }

    if (usuario.proveedorAuth === 'local' && !usuario.emailVerificado) {
      return res.status(403).json({
        message: 'Verifica tu correo antes de cambiar la contrasena',
        code: 'EMAIL_NOT_VERIFIED',
      })
    }

    const passwordValido = await bcrypt.compare(passwordActual, usuario.password)
    if (!passwordValido) {
      return res.status(400).json({ message: 'La contrasena actual no es correcta' })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(passwordNueva, salt)
    const refreshTokenActual = obtenerRefreshTokenRequest(req)

    await sequelize.transaction(async (transaction) => {
      await usuario.update({ password: passwordHash }, { transaction })
      // Revoca todas las sesiones excepto la actual
      await RefreshToken.update(
        { revocado: true },
        {
          where: {
            usuarioId: usuario.id,
            revocado: false,
            ...(refreshTokenActual ? { token: { [Op.ne]: huellaRefreshToken(refreshTokenActual) } } : {}),
          },
          transaction,
          sinTenant: true,
        }
      )
    })

    await registrarAuditoria({
      accion: 'PASSWORD_CAMBIADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Contrasena cambiada por ${usuario.email} desde el perfil`,
      req,
      resultado: 'exitoso',
    })

    return res.json({ message: 'Contrasena actualizada' })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

const MENSAJE_CODIGO_INVALIDO = 'Código incorrecto o vencido.'

// Solo responde a quien tiene la cookie de pendiente (emitida al registrarse o
// tras un login con la clave correcta): el codigo no basta por si solo. El
// email del body se ignora; manda el `sub` de la cookie.
const verificarCodigo = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioPendienteRequest(req)
    if (!usuarioId) return res.status(400).json({ message: MENSAJE_CODIGO_INVALIDO })

    const { codigo } = req.body
    const usuario = await Usuario.findOne({
      where: { id: usuarioId },
      sinTenant: true,
      include: [{ model: Clinica }],
    })

    if (!usuario || !usuario.requiereVerificacionCodigo || usuario.emailVerificado) {
      return res.status(400).json({ message: MENSAJE_CODIGO_INVALIDO })
    }

    // Mismos chequeos de estado que el login.
    if (estaTemporalmenteBloqueado(usuario)) {
      return res.status(423).json({
        message: 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
      })
    }
    if (!usuario.activo) {
      return res.status(401).json({
        message: 'Tu usuario está desactivado. Pide al administrador de la clínica que lo active.',
      })
    }
    if (usuario.clinicaId && usuario.Clinica && !usuario.Clinica.activo) {
      return res.status(403).json({
        message: 'La clínica está desactivada. Escríbenos a soporte@bourgelat.co.',
      })
    }

    const { valido, registro } = await validarCodigo(usuario.id, codigo)
    if (!valido) {
      return res.status(400).json({ message: MENSAJE_CODIGO_INVALIDO })
    }

    const payload = {
      id: usuario.id,
      clinicaId: usuario.clinicaId,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales || [],
    }
    const accessToken = generarAccessToken(payload)
    const refreshToken = generarRefreshToken(payload)

    const consumido = await sequelize.transaction(async (transaction) => {
      if (!(await consumirCodigo(registro.id, { transaction }))) return false
      await usuario.update(
        {
          emailVerificado: true,
          requiereVerificacionCodigo: false,
          intentosFallidos: 0,
          ultimoAcceso: new Date(),
        },
        { transaction }
      )
      await guardarRefreshToken({
        token: refreshToken,
        clinicaId: usuario.clinicaId,
        usuarioId: usuario.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        transaction,
      })
      return true
    })
    if (!consumido) return res.status(400).json({ message: MENSAJE_CODIGO_INVALIDO })

    // El req no trae auth: clinica y usuario explicitos para que la clinica lo
    // vea en /auditoria. Misma accion que la verificacion por enlace.
    await registrarAuditoria({
      accion: 'EMAIL_VERIFICADO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Correo verificado por codigo para ${usuario.email}`,
      req,
      clinicaId: usuario.clinicaId || null,
      usuarioId: usuario.id,
      resultado: 'exitoso',
    })

    clearCookiePendiente(res)
    setAuthCookies(res, { accessToken, refreshToken })
    const suscripcion = await obtenerSuscripcionSesion(usuario.clinicaId)

    return res.json({
      usuario: serializarUsuario(usuario),
      clinica: serializarClinica(usuario.Clinica),
      suscripcion,
    })
  } catch (error) {
    responderErrorInterno(res, 'Error servidor')
  }
}

// Respuesta generica siempre: no revela si la cuenta existe ni su estado.
// Exige la cookie de pendiente y no espera el envio SMTP, para que cuentas
// pendientes y no pendientes respondan igual de rapido.
const reenviarCodigo = async (req, res) => {
  const respuesta = { message: 'Si la cuenta está pendiente, te enviamos un código nuevo.' }
  try {
    const usuarioId = obtenerUsuarioPendienteRequest(req)
    if (!usuarioId) return res.json(respuesta)

    const usuario = await Usuario.findOne({ where: { id: usuarioId }, sinTenant: true })

    if (
      usuario &&
      usuario.activo &&
      usuario.requiereVerificacionCodigo &&
      !usuario.emailVerificado &&
      !estaTemporalmenteBloqueado(usuario) &&
      (await esperaRestante(usuario.id)) === 0 &&
      (await puedeCrearOtroCodigo(usuario.id))
    ) {
      enviarCodigoAlUsuario(usuario).catch((error) => {
        logger.error({
          contexto: 'verificacion-codigo',
          mensaje: `reenviarCodigo (envio): ${error.message}`,
        })
      })
    }
  } catch (error) {
    logger.error({ contexto: 'verificacion-codigo', mensaje: `reenviarCodigo: ${error.message}` })
  }
  return res.json(respuesta)
}

module.exports = {
  verificarCodigo,
  reenviarCodigo,
  registro,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  verificarEmail,
  reenviarVerificacion,
  cambiarPassword,
}
