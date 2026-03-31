const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { validarCupoSuscripcion } = require('../services/suscripcionService')

const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
const telefonoColombiaRegex = /^3\d{9}$/
const ROLES_VALIDOS = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

const normalizarTexto = (value) => (typeof value === 'string' ? value.trim() : '')
const normalizarEmail = (value) => normalizarTexto(value).toLowerCase()
const normalizarTelefono = (value) => normalizarTexto(value).replace(/\D/g, '').slice(0, 10)

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

    const usuarioExiste = await Usuario.findOne({ where: { email: emailNormalizado } })
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

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
}
