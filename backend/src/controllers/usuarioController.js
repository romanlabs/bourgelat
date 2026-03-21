const bcrypt = require('bcryptjs')
const Usuario = require('../models/Usuario')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol, rolesAdicionales, telefono } = req.body
    const { id: clinicaId } = req.usuario

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: 'Nombre, email, password y rol son obligatorios' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'La password debe tener minimo 8 caracteres' })
    }

    const rolesValidos = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ message: 'Rol no valido' })
    }

    const usuarioExiste = await Usuario.findOne({ where: { email } })
    if (usuarioExiste) {
      return res.status(400).json({ message: 'El email ya esta registrado' })
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    const usuario = await Usuario.create({
      nombre, email, password: passwordHash,
      rol, rolesAdicionales: rolesAdicionales || [],
      telefono, clinicaId,
    })

    // ── Auditoría crear usuario ────────────────────────────
    await registrarAuditoria({
      accion: 'CREAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Usuario ${usuario.email} creado con rol ${usuario.rol}`,
      datosNuevos: { email: usuario.email, rol: usuario.rol },
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
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerUsuarios = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario

    const usuarios = await Usuario.findAll({
      where: { clinicaId },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    })

    res.json({ usuarios })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { id: clinicaId } = req.usuario

    const usuario = await Usuario.findOne({
      where: { id, clinicaId },
      attributes: { exclude: ['password'] },
    })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json({ usuario })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const editarUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { id: clinicaId } = req.usuario
    const { nombre, telefono, rol, rolesAdicionales } = req.body

    const usuario = await Usuario.findOne({ where: { id, clinicaId } })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const rolesValidos = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']
    if (rol && !rolesValidos.includes(rol)) {
      return res.status(400).json({ message: 'Rol no valido' })
    }

    const datosAnteriores = {
      nombre: usuario.nombre,
      telefono: usuario.telefono,
      rol: usuario.rol,
    }

    await usuario.update({
      nombre: nombre || usuario.nombre,
      telefono: telefono || usuario.telefono,
      rol: rol || usuario.rol,
      rolesAdicionales: rolesAdicionales || usuario.rolesAdicionales,
    })

    // ── Auditoría editar usuario ───────────────────────────
    await registrarAuditoria({
      accion: 'EDITAR_USUARIO',
      entidad: 'Usuario',
      entidadId: usuario.id,
      descripcion: `Usuario ${usuario.email} actualizado`,
      datosAnteriores,
      datosNuevos: { nombre: usuario.nombre, telefono: usuario.telefono, rol: usuario.rol },
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
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params
    const { id: clinicaId } = req.usuario

    const usuario = await Usuario.findOne({ where: { id, clinicaId } })

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const estadoAnterior = usuario.activo
    await usuario.update({ activo: !usuario.activo })

    // ── Auditoría toggle usuario ───────────────────────────
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
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = { crearUsuario, obtenerUsuarios, obtenerUsuario, editarUsuario, toggleUsuario }