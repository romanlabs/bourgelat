const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { validarCupoSuscripcion } = require('../services/suscripcionService')

const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
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

const tienePermisoAdmin = ({ rol, rolesAdicionales = [], activo = true }) =>
  Boolean(activo) && (rol === 'admin' || rolesAdicionales.includes('admin'))

const contarAdminsActivos = async ({ clinicaId, excludeUsuarioId = null }) => {
  const where = {
    clinicaId,
    activo: true,
    [Op.or]: [{ rol: 'admin' }, { rolesAdicionales: { [Op.contains]: ['admin'] } }],
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

const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol, rolesAdicionales, telefono } = req.body
    const { clinicaId } = req.usuario

    const nombreNormalizado = normalizarTexto(nombre)
    const emailNormalizado = normalizarEmail(email)
    const rolNormalizado = normalizarTexto(rol).toLowerCase()
    const telefonoNormalizado = normalizarTelefono(telefono)
    const rolesAdicionalesNormalizados = normalizarRolesAdicionales(
      rolesAdicionales,
      rolNormalizado
    )

    if (!nombreNormalizado || !emailNormalizado || !password || !rolNormalizado) {
      return res.status(400).json({ message: 'Nombre, email, password y rol son obligatorios' })
    }

    if (!passwordFuerteRegex.test(password)) {
      return res.status(400).json({
        message:
          'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial',
      })
    }

    if (!ROLES_VALIDOS.includes(rolNormalizado)) {
      return res.status(400).json({ message: 'Rol no valido' })
    }

    if (telefono && !validarTelefonoLaboral(telefonoNormalizado)) {
      return res.status(400).json({
        message: 'El celular laboral debe tener 10 digitos colombianos y comenzar por 3',
      })
    }

    const usuarioExiste = await Usuario.findOne({ where: { email: emailNormalizado }, sinTenant: true })
    if (usuarioExiste) {
      return res.status(400).json({ message: 'El email ya esta registrado' })
    }

    const cupoUsuarios = await validarCupoSuscripcion({
      clinicaId,
      campoLimite: 'limiteUsuarios',
      modelo: Usuario,
      where: { clinicaId, activo: true },
    })

    if (!cupoUsuarios.permitido) {
      return res.status(403).json({
        message: `Tu plan ${cupoUsuarios.nombrePlan} permite hasta ${cupoUsuarios.limite} usuarios activos. Desactiva uno o cambia de plan para continuar.`,
        code: 'PLAN_LIMIT_REACHED',
        plan: cupoUsuarios.suscripcion.plan,
        recurso: 'usuarios',
        limite: cupoUsuarios.limite,
        usoActual: cupoUsuarios.usoActual,
      })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const usuario = await Usuario.create({
      nombre: nombreNormalizado,
      email: emailNormalizado,
      password: passwordHash,
      rol: rolNormalizado,
      rolesAdicionales: rolesAdicionalesNormalizados,
      telefono: telefonoNormalizado || null,
      clinicaId,
    })

    await registrarAuditoria({
      accion: 'CREAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Usuario ${usuario.email} creado con rol ${usuario.rol}`,
      datosNuevos: {
        email: usuario.email,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales,
        telefono: usuario.telefono,
      },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales,
        telefono: usuario.telefono,
        activo: usuario.activo,
        ultimoAcceso: usuario.ultimoAcceso,
      },
    })
  } catch (error) {
    responderErrorInterno(res)
  }
}

const obtenerUsuarios = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const usuarios = await Usuario.findAll({
      where: { clinicaId },
      attributes: { exclude: ['password'] },
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
        [Op.or]: [
          { rol: 'veterinario' },
          { rolesAdicionales: { [Op.contains]: ['veterinario'] } },
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

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const usuario = await Usuario.findOne({
      where: { id, clinicaId },
      attributes: { exclude: ['password'] },
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

    if (
      String(usuario.id) === String(usuarioActualId) &&
      (rol !== undefined || rolesAdicionales !== undefined)
    ) {
      return res.status(400).json({
        message:
          'No puedes cambiar tus propios permisos desde este modulo. Solicita apoyo de otro administrador.',
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

    if (emailNormalizado && emailNormalizado !== usuario.email) {
      const emailEnUso = await Usuario.findOne({
        where: {
          email: emailNormalizado,
          id: { [Op.ne]: usuario.id },
        },
        sinTenant: true,
      })

      if (emailEnUso) {
        return res.status(400).json({ message: 'El email ya esta registrado por otro usuario' })
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
    if (telefono !== undefined) datosActualizar.telefono = telefonoNormalizado || null
    if (rol !== undefined) datosActualizar.rol = siguienteRol
    if (rolesAdicionales !== undefined) datosActualizar.rolesAdicionales = siguientesRolesAdicionales

    await usuario.update(datosActualizar)

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
      },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Usuario actualizado exitosamente',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        rolesAdicionales: usuario.rolesAdicionales,
        telefono: usuario.telefono,
        activo: usuario.activo,
        ultimoAcceso: usuario.ultimoAcceso,
      },
    })
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

    if (!usuario.activo) {
      const cupoUsuarios = await validarCupoSuscripcion({
        clinicaId,
        campoLimite: 'limiteUsuarios',
        modelo: Usuario,
        where: { clinicaId, activo: true },
      })

      if (!cupoUsuarios.permitido) {
        return res.status(403).json({
          message: `Tu plan ${cupoUsuarios.nombrePlan} permite hasta ${cupoUsuarios.limite} usuarios activos. Desactiva uno o cambia de plan para continuar.`,
          code: 'PLAN_LIMIT_REACHED',
          plan: cupoUsuarios.suscripcion.plan,
          recurso: 'usuarios',
          limite: cupoUsuarios.limite,
          usoActual: cupoUsuarios.usoActual,
        })
      }
    }

    const estadoAnterior = usuario.activo
    await usuario.update({ activo: !usuario.activo })

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
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
  actualizarMiPerfil,
  subirFotoMiPerfil,
  guardarOnboarding,
}
