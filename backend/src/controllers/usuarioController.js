const { Op } = require('sequelize')
const Usuario = require('../models/Usuario')
const Clinica = require('../models/Clinica')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { ejecutarConCupo } = require('../services/suscripcionService')
const invitacionService = require('../services/invitacionService')
const logger = require('../utils/logger')

const cupoUsuariosActivos = (clinicaId) => ({
  clinicaId,
  campoLimite: 'limiteUsuarios',
  modelo: Usuario,
  where: { clinicaId, activo: true },
})

const respuestaLimiteUsuarios = (cupo) => ({
  message: `Tu plan ${cupo.nombrePlan} permite hasta ${cupo.limite} usuarios activos. Desactiva uno o cambia de plan para continuar.`,
  code: 'PLAN_LIMIT_REACHED',
  plan: cupo.suscripcion.plan,
  recurso: 'usuarios',
  limite: cupo.limite,
  usoActual: cupo.usoActual,
})

const telefonoColombiaRegex = /^3\d{9}$/
const ROLES_VALIDOS = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

const { normalizarTexto, normalizarEmail, normalizarTelefonoColombiano: normalizarTelefono } = require('../utils/normalizar')

const normalizarRolesAdicionales = (rolesAdicionales, rolPrincipal) => {
  if (!Array.isArray(rolesAdicionales)) return []

  return [...new Set(
    rolesAdicionales
      .map((rol) => normalizarTexto(rol).toLowerCase())
      .filter((rol) => ROLES_VALIDOS.includes(rol) && rol !== rolPrincipal)
  )]
}

// Roles que mandan dentro de la clinica. `superadmin` no esta en ROLES_VALIDOS
// porque no se puede asignar desde la UI, pero si cuenta como administrador:
// al omitirlo, la guarda de "ultimo administrador" de toggleUsuario se saltaba
// entera para esa cuenta (tienePermisoAdmin devolvia false y ni siquiera se
// llegaba a contar), asi que el superadmin se podia desactivar sin ninguna
// proteccion y quedaba fuera del sistema.
const ROLES_CON_PERMISO_ADMIN = ['admin', 'superadmin']

const tienePermisoAdmin = ({ rol, rolesAdicionales = [], activo = true }) =>
  Boolean(activo) && (
    ROLES_CON_PERMISO_ADMIN.includes(rol) || rolesAdicionales.includes('admin')
  )

// Quien no ha aceptado su invitación todavía no puede entrar: no aparece para
// asignarle citas ni cuenta como el administrador que la clínica debe conservar.
const accesoActivado = { [Op.not]: invitacionService.wherePendiente }

const contarAdminsActivos = async ({ clinicaId, excludeUsuarioId = null }) => {
  const where = {
    clinicaId,
    activo: true,
    [Op.and]: [
      {
        [Op.or]: [
          { rol: { [Op.in]: ROLES_CON_PERMISO_ADMIN } },
          { rolesAdicionales: { [Op.contains]: ['admin'] } },
        ],
      },
      accesoActivado,
    ],
  }

  if (excludeUsuarioId) {
    where.id = { [Op.ne]: excludeUsuarioId }
  }

  return Usuario.count({ where })
}

const validarTelefonoLaboral = (telefono) =>
  !telefono || telefonoColombiaRegex.test(telefono)

const responderErrorInterno = (res) =>
  res.status(500).json({ message: 'Error en el servidor' })

// Solo invita quien probó que su propio correo es suyo: así una cuenta con un
// correo inventado no puede usar Bourgelat para enviar correos a terceros.
const adminPuedeInvitar = async (req) => {
  const admin = await Usuario.findOne({
    where: { id: req.usuario.id, clinicaId: req.usuario.clinicaId },
    attributes: ['id', 'emailVerificado'],
  })
  return Boolean(admin?.emailVerificado)
}

const MENSAJE_ADMIN_SIN_VERIFICAR =
  'Verifica tu correo antes de invitar a tu equipo. Usa el aviso «Reenviar verificación» de la parte superior.'

// Envía el correo después del commit: si el SMTP falla, la cuenta queda creada
// y el administrador puede reenviar la invitación.
const enviarInvitacionSegura = async ({ usuario, token, req }) => {
  try {
    const clinica = await Clinica.findByPk(usuario.clinicaId, { attributes: ['id', 'nombre'] })
    await invitacionService.enviarInvitacion({
      usuario,
      clinica,
      token,
      nombreAdmin: req.usuario?.nombre,
    })
    return true
  } catch (error) {
    logger.error({ contexto: 'invitacion-usuario', mensaje: `Envio fallido: ${error.message}` })
    return false
  }
}

const serializarUsuarioEquipo = (usuario) => ({
  id: usuario.id,
  nombre: usuario.nombre,
  email: usuario.email,
  rol: usuario.rol,
  rolesAdicionales: usuario.rolesAdicionales,
  telefono: usuario.telefono,
  activo: usuario.activo,
  ultimoAcceso: usuario.ultimoAcceso,
  invitacionPendiente: invitacionService.estaPendiente(usuario),
})

const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, rol, rolesAdicionales, telefono } = req.body
    const { clinicaId } = req.usuario

    const nombreNormalizado = normalizarTexto(nombre)
    const emailNormalizado = normalizarEmail(email)
    const rolNormalizado = normalizarTexto(rol).toLowerCase()
    const telefonoNormalizado = normalizarTelefono(telefono)
    const rolesAdicionalesNormalizados = normalizarRolesAdicionales(
      rolesAdicionales,
      rolNormalizado
    )

    if (!nombreNormalizado || !emailNormalizado || !rolNormalizado) {
      return res.status(400).json({ message: 'Nombre, email y rol son obligatorios' })
    }

    if (!ROLES_VALIDOS.includes(rolNormalizado)) {
      return res.status(400).json({ message: 'Rol no valido' })
    }

    if (telefono && !validarTelefonoLaboral(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El celular laboral debe tener 10 digitos colombianos y comenzar por 3',
      })
    }

    if (!(await adminPuedeInvitar(req))) {
      return res.status(403).json({ message: MENSAJE_ADMIN_SIN_VERIFICAR, code: 'EMAIL_NOT_VERIFIED' })
    }

    const usuarioExiste = await Usuario.findOne({ where: { email: emailNormalizado }, sinTenant: true })
    if (usuarioExiste) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }

    const topes = await invitacionService.verificarTopes({ clinicaId })
    if (!topes.permitido) {
      return res.status(429).json({ message: topes.message, code: 'INVITACIONES_TOPE' })
    }

    // Sin contraseña: la define la persona invitada desde su correo. Hasta
    // entonces la cuenta no puede iniciar sesión, pero ocupa cupo del plan.
    const { cupo: cupoUsuarios, resultado } = await ejecutarConCupo(
      cupoUsuariosActivos(clinicaId),
      async (transaction) => {
        const nuevo = await Usuario.create({
          nombre: nombreNormalizado,
          email: emailNormalizado,
          password: null,
          proveedorAuth: 'local',
          emailVerificado: false,
          rol: rolNormalizado,
          rolesAdicionales: rolesAdicionalesNormalizados,
          telefono: telefonoNormalizado || null,
          clinicaId,
        }, { transaction })
        const token = await invitacionService.emitirInvitacion({
          usuario: nuevo,
          creadoPorId: req.usuario.id,
          transaction,
        })
        return { usuario: nuevo, token }
      }
    )

    if (!cupoUsuarios.permitido) {
      return res.status(403).json(respuestaLimiteUsuarios(cupoUsuarios))
    }

    const { usuario, token } = resultado
    const invitacionEnviada = await enviarInvitacionSegura({ usuario, token, req })

    await registrarAuditoria({
      accion: 'INVITAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Invitación enviada a ${usuario.email} con rol ${usuario.rol}`,
      datosNuevos: {
        email: usuario.email,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales,
        telefono: usuario.telefono,
        invitacionEnviada,
      },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: invitacionEnviada
        ? `Invitación enviada a ${usuario.email}`
        : 'El usuario quedó creado, pero no pudimos enviar el correo. Reenvía la invitación en unos minutos.',
      invitacionEnviada,
      usuario: serializarUsuarioEquipo(usuario),
    })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const reenviarInvitacion = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const usuario = await Usuario.findOne({ where: { id, clinicaId } })
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    if (!invitacionService.estaPendiente(usuario)) {
      return res.status(400).json({ message: 'Esta persona ya creó su contraseña; no necesita invitación.' })
    }

    if (!usuario.activo) {
      return res.status(400).json({ message: 'Activa el usuario antes de reenviarle la invitación.' })
    }

    if (!(await adminPuedeInvitar(req))) {
      return res.status(403).json({ message: MENSAJE_ADMIN_SIN_VERIFICAR, code: 'EMAIL_NOT_VERIFIED' })
    }

    const topes = await invitacionService.verificarTopes({ clinicaId, usuarioId: usuario.id })
    if (!topes.permitido) {
      return res.status(429).json({ message: topes.message, code: 'INVITACIONES_TOPE' })
    }

    const token = await invitacionService.emitirInvitacion({ usuario, creadoPorId: req.usuario.id })
    const invitacionEnviada = await enviarInvitacionSegura({ usuario, token, req })

    await registrarAuditoria({
      accion: 'REENVIAR_INVITACION',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Invitación reenviada a ${usuario.email}`,
      datosNuevos: { invitacionEnviada },
      req,
      resultado: invitacionEnviada ? 'exitoso' : 'fallido',
    })

    if (!invitacionEnviada) {
      return res.status(502).json({ message: 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.' })
    }

    res.json({ message: `Invitación reenviada a ${usuario.email}`, invitacionEnviada })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const obtenerUsuarios = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const usuarios = await Usuario.findAll({
      where: { clinicaId },
      attributes: {
        exclude: ['password'],
        include: [invitacionService.atributoInvitacionPendiente()],
      },
      order: [['createdAt', 'DESC']],
    })

    res.json({ usuarios })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const obtenerEquipoAgenda = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const usuarios = await Usuario.findAll({
      where: {
        clinicaId,
        activo: true,
        [Op.and]: [
          {
            [Op.or]: [
              { rol: 'veterinario' },
              { rolesAdicionales: { [Op.contains]: ['veterinario'] } },
            ],
          },
          accesoActivado,
        ],
      },
      attributes: ['id', 'nombre', 'email', 'telefono', 'rol', 'rolesAdicionales'],
      order: [['nombre', 'ASC']],
    })

    res.json({ usuarios })
  } catch (error) {
    responderErrorInterno(res)
  }
}

// Equipo completo de la clinica habilitado para operar modulos donde
// cualquier rol operativo puede ser responsable (ej. estilista en Estilos):
// a diferencia de obtenerEquipoAgenda, no se limita a veterinarios.
const obtenerEquipoClinica = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const rolesEquipo = ['admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar']

    const usuarios = await Usuario.findAll({
      where: {
        clinicaId,
        activo: true,
        [Op.and]: [
          {
            [Op.or]: [
              { rol: { [Op.in]: rolesEquipo } },
              { rolesAdicionales: { [Op.overlap]: rolesEquipo } },
            ],
          },
          accesoActivado,
        ],
      },
      attributes: ['id', 'nombre', 'rol'],
      order: [['nombre', 'ASC']],
    })

    res.json({ usuarios })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const usuario = await Usuario.findOne({
      where: { id, clinicaId },
      attributes: {
        exclude: ['password'],
        include: [invitacionService.atributoInvitacionPendiente()],
      },
    })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json({ usuario })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const usuarioActualId = req.auth?.usuarioId || req.usuario?.id
    const { nombre, telefono, rol, rolesAdicionales, email } = req.body

    const usuario = await Usuario.findOne({ where: { id, clinicaId } })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const nombreNormalizado = nombre === undefined ? undefined : normalizarTexto(nombre)
    const telefonoNormalizado = telefono === undefined ? undefined : normalizarTelefono(telefono)
    const rolNormalizado = rol === undefined ? undefined : normalizarTexto(rol).toLowerCase()
    const emailNormalizado = email === undefined ? undefined : normalizarEmail(email)

    if (rolNormalizado && !ROLES_VALIDOS.includes(rolNormalizado)) {
      return res.status(400).json({ message: 'Rol no valido' })
    }

    if (nombre !== undefined && !nombreNormalizado) {
      return res.status(400).json({ message: 'El nombre no puede estar vacio' })
    }

    if (telefono !== undefined && !validarTelefonoLaboral(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El celular laboral debe tener 10 digitos colombianos y comenzar por 3',
      })
    }

    // Sobre la propia cuenta: el rol principal no se toca, pero si los roles
    // adicionales. Asi el dueno de una clinica con una sola cuenta puede
    // marcarse Veterinario y agendar; sin esto no habia profesional posible.
    const esPropiaCuenta = String(usuario.id) === String(usuarioActualId)
    if (esPropiaCuenta && rolNormalizado && rolNormalizado !== usuario.rol) {
      return res.status(400).json({
        message:
          'No puedes cambiar tu propio rol principal. Solicita apoyo de otro administrador.',
      })
    }

    const siguienteRol = rolNormalizado || usuario.rol
    const siguientesRolesAdicionales =
      rolesAdicionales !== undefined
        ? normalizarRolesAdicionales(rolesAdicionales, siguienteRol)
        : Array.isArray(usuario.rolesAdicionales)
          ? usuario.rolesAdicionales
          : []

    const conservariaAdmin = tienePermisoAdmin({
      rol: siguienteRol,
      rolesAdicionales: siguientesRolesAdicionales,
      activo: usuario.activo,
    })

    // Quitarse a uno mismo el permiso de administrador deja la sesion sin acceso
    // a esta pantalla a mitad de la edicion: eso lo hace otro administrador.
    if (esPropiaCuenta && tienePermisoAdmin(usuario) && !conservariaAdmin) {
      return res.status(400).json({
        message:
          'No puedes quitarte el permiso de administrador. Solicita apoyo de otro administrador.',
      })
    }

    if (tienePermisoAdmin(usuario) && !conservariaAdmin) {
      const adminsRestantes = await contarAdminsActivos({
        clinicaId,
        excludeUsuarioId: usuario.id,
      })

      if (adminsRestantes === 0) {
        return res.status(400).json({
          message:
            'La clinica debe conservar al menos un administrador activo. Asigna otro administrador antes de cambiar este usuario.',
          code: 'LAST_ADMIN_REQUIRED',
        })
      }
    }

    const cambiaEmail = Boolean(emailNormalizado) && emailNormalizado !== usuario.email
    const invitacionPendiente = invitacionService.estaPendiente(usuario)

    // El correo de una cuenta ya activada es su llave de recuperación: si el
    // administrador pudiera cambiarlo, pondría el suyo, pediría «Olvidé mi
    // contraseña» y entraría como esa persona. Mientras la invitación está
    // pendiente sí se corrige (un error de tipeo) y se reenvía al correo nuevo.
    if (cambiaEmail && !invitacionPendiente && !esPropiaCuenta) {
      return res.status(400).json({
        message:
          'El correo de una cuenta activa no se puede cambiar desde aquí. Si la persona ya no usa ese correo, desactívala e invítala con el nuevo.',
        code: 'EMAIL_CUENTA_ACTIVA',
      })
    }

    if (cambiaEmail && invitacionPendiente) {
      if (!(await adminPuedeInvitar(req))) {
        return res.status(403).json({ message: MENSAJE_ADMIN_SIN_VERIFICAR, code: 'EMAIL_NOT_VERIFIED' })
      }
      const topes = await invitacionService.verificarTopes({ clinicaId, usuarioId: usuario.id })
      if (!topes.permitido) {
        return res.status(429).json({ message: topes.message, code: 'INVITACIONES_TOPE' })
      }
    }

    if (cambiaEmail) {
      const emailEnUso = await Usuario.findOne({
        where: {
          email: emailNormalizado,
          id: { [Op.ne]: usuario.id },
        },
        sinTenant: true,
      })

      if (emailEnUso) {
        return res.status(400).json({ message: 'El email ya está registrado por otro usuario' })
      }
    }

    const datosAnteriores = {
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      rolesAdicionales: usuario.rolesAdicionales,
    }

    const datosActualizar = {}

    if (nombre !== undefined) datosActualizar.nombre = nombreNormalizado
    if (email !== undefined) datosActualizar.email = emailNormalizado
    // Un correo nuevo aún no está probado: vuelve a pedir verificación.
    // Salvo en una cuenta local sin contraseña cuyo login social ya probó el
    // correo: quedaría igual que una invitación pendiente y sin forma de entrar.
    if (cambiaEmail && (invitacionPendiente || usuario.password)) datosActualizar.emailVerificado = false
    if (telefono !== undefined) datosActualizar.telefono = telefonoNormalizado || null
    if (rol !== undefined) datosActualizar.rol = siguienteRol
    if (rolesAdicionales !== undefined) datosActualizar.rolesAdicionales = siguientesRolesAdicionales

    await usuario.update(datosActualizar)

    // La invitación anterior iba al correo equivocado: se anula y sale otra.
    let invitacionEnviada = null
    if (cambiaEmail && invitacionPendiente) {
      const token = await invitacionService.emitirInvitacion({ usuario, creadoPorId: usuarioActualId })
      invitacionEnviada = await enviarInvitacionSegura({ usuario, token, req })
    }

    await registrarAuditoria({
      accion: 'EDITAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Usuario ${usuario.email} actualizado`,
      datosAnteriores,
      datosNuevos: {
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales,
        ...(invitacionEnviada === null ? {} : { invitacionEnviada }),
      },
      req,
      resultado: 'exitoso',
    })

    let message = 'Usuario actualizado exitosamente'
    if (invitacionEnviada === true) message = `Usuario actualizado. Enviamos la invitación a ${usuario.email}`
    if (invitacionEnviada === false) {
      message = 'Usuario actualizado, pero no pudimos enviar la invitación al correo nuevo. Reenvíala en unos minutos.'
    }

    res.json({ message, usuario: serializarUsuarioEquipo(usuario) })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const usuarioActualId = req.auth?.usuarioId || req.usuario?.id

    const usuario = await Usuario.findOne({ where: { id, clinicaId } })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    if (String(usuario.id) === String(usuarioActualId)) {
      return res.status(400).json({
        message: 'No puedes desactivar tu propio usuario desde este modulo.',
      })
    }

    if (usuario.activo && tienePermisoAdmin(usuario)) {
      const adminsRestantes = await contarAdminsActivos({
        clinicaId,
        excludeUsuarioId: usuario.id,
      })

      if (adminsRestantes === 0) {
        return res.status(400).json({
          message:
            'La clinica debe conservar al menos un administrador activo. Asigna otro administrador antes de desactivar este usuario.',
          code: 'LAST_ADMIN_REQUIRED',
        })
      }
    }

    const estadoAnterior = usuario.activo

    if (!usuario.activo) {
      // Reactivar ocupa cupo: misma revision bajo lock que crearUsuario.
      const { cupo: cupoUsuarios } = await ejecutarConCupo(
        cupoUsuariosActivos(clinicaId),
        (transaction) => usuario.update({ activo: true }, { transaction })
      )

      if (!cupoUsuarios.permitido) {
        return res.status(403).json(respuestaLimiteUsuarios(cupoUsuarios))
      }
    } else {
      await usuario.update({ activo: false })
    }

    await registrarAuditoria({
      accion: usuario.activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Usuario ${usuario.email} ${usuario.activo ? 'activado' : 'desactivado'}`,
      datosAnteriores: { activo: estadoAnterior },
      datosNuevos: { activo: usuario.activo },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'} exitosamente`,
      activo: usuario.activo,
    })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const esVeterinario = ({ rol, rolesAdicionales = [] }) =>
  rol === 'veterinario' || rolesAdicionales.includes('veterinario')

const serializarPerfil = (usuario) => ({
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
  activo: usuario.activo,
  onboarding: usuario.onboarding || null,
})

// Auto-edición del usuario autenticado: nunca toca rol, email ni activo.
const actualizarMiPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.usuario.id },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const cambios = {}

    if (req.body.nombre !== undefined) {
      const nombre = normalizarTexto(req.body.nombre)
      if (!nombre) return res.status(400).json({ message: 'El nombre no puede estar vacio' })
      cambios.nombre = nombre
    }

    if (req.body.telefono !== undefined) {
      const telefono = normalizarTelefono(req.body.telefono)
      if (telefono && !validarTelefonoLaboral(telefono)) {
        return res.status(400).json({
          message: 'El celular laboral debe tener 10 digitos colombianos y comenzar por 3',
        })
      }
      cambios.telefono = telefono || null
    }

    if (req.body.cargo !== undefined) {
      cambios.cargo = normalizarTexto(req.body.cargo).slice(0, 120) || null
    }

    if (req.body.foto !== undefined) {
      cambios.foto = req.body.foto ? String(req.body.foto).slice(0, 500) : null
    }

    if (req.body.tarjetaProfesional !== undefined) {
      // Solo aplica a quien atiende (rol principal o adicional veterinario)
      if (!esVeterinario(usuario)) {
        return res.status(403).json({
          message: 'La tarjeta profesional solo aplica a usuarios con rol veterinario',
        })
      }
      cambios.tarjetaProfesional =
        normalizarTexto(req.body.tarjetaProfesional).slice(0, 60) || null
    }

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({ message: 'No hay cambios para aplicar' })
    }

    const datosAnteriores = serializarPerfil(usuario)
    await usuario.update(cambios)

    await registrarAuditoria({
      accion: 'ACTUALIZAR_PERFIL',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Perfil actualizado por ${usuario.email}`,
      datosAnteriores,
      datosNuevos: serializarPerfil(usuario),
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Perfil actualizado', usuario: serializarPerfil(usuario) })
  } catch (error) {
    responderErrorInterno(res)
  }
}

// Guarda las respuestas del wizard de onboarding post-registro (una sola vez,
// pero se permite sobreescribir si el usuario decide volver a completarlo).
const guardarOnboarding = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id: req.usuario.id },
      sinTenant: true,
    })

    if (!usuario || !usuario.activo) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const respuestas = {
      usoPlanificado: normalizarTexto(req.body.usoPlanificado || ''),
      cargo: normalizarTexto(req.body.cargo || ''),
      whatsapp: req.body.whatsapp ? normalizarTelefono(req.body.whatsapp) : null,
      tipoClinica: normalizarTexto(req.body.tipoClinica || ''),
      tamanoEquipo: normalizarTexto(req.body.tamanoEquipo || ''),
      mascotasPorMes: normalizarTexto(req.body.mascotasPorMes || ''),
      objetivoInicial: normalizarTexto(req.body.objetivoInicial || ''),
      gestionActual: req.body.gestionActual ? normalizarTexto(req.body.gestionActual) : null,
      completadoEn: new Date().toISOString(),
    }

    await usuario.update({ onboarding: respuestas })

    await registrarAuditoria({
      accion: 'COMPLETAR_ONBOARDING',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Onboarding completado por ${usuario.email}`,
      datosNuevos: respuestas,
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Onboarding guardado', usuario: serializarPerfil(usuario) })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const subirFotoMiPerfil = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibio ninguna foto' })
    }

    const { buildPublicUploadUrl, USUARIOS_SUBDIR } = require('../config/uploads')
    const foto = buildPublicUploadUrl(req, `${USUARIOS_SUBDIR}/${req.file.filename}`)

    res.json({ foto })
  } catch (error) {
    responderErrorInterno(res)
  }
}

module.exports = {
  crearUsuario,
  reenviarInvitacion,
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerEquipoClinica,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
  actualizarMiPerfil,
  subirFotoMiPerfil,
  guardarOnboarding,
}
