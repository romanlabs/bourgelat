const { Op } = require('sequelize');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');
const { isPastDateOnly, isValidDateOnly } = require('../utils/dateOnly');

const esProfesionalVeterinario = (usuario) =>
  usuario &&
  usuario.activo &&
  (usuario.rol === 'veterinario' ||
    (Array.isArray(usuario.rolesAdicionales) && usuario.rolesAdicionales.includes('veterinario')));

const crearCita = async (req, res) => {
  try {
    const {
      fecha, horaInicio, horaFin, motivo, tipoCita,
      observaciones, mascotaId, propietarioId, veterinarioId
    } = req.body;
    const { clinicaId } = req.usuario;

    if (!fecha || !horaInicio || !horaFin || !motivo || !mascotaId || !propietarioId || !veterinarioId) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
    }

    // Verificar que la hora fin sea mayor a la hora inicio
    if (horaFin <= horaInicio) {
      return res.status(400).json({ message: 'La hora de fin debe ser mayor a la hora de inicio' });
    }

    if (!isValidDateOnly(fecha)) {
      return res.status(400).json({ message: 'Fecha no valida' });
    }

    // Comparar DATEONLY como texto evita desfases UTC en zonas como Colombia.
    if (isPastDateOnly(fecha)) {
      return res.status(400).json({ message: 'No se puede agendar una cita en una fecha pasada' });
    }

    // Verificar que el veterinario pertenece a la clinica
    const veterinario = await Usuario.findOne({
      where: { id: veterinarioId, clinicaId, activo: true }
    });
    if (!esProfesionalVeterinario(veterinario)) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    // Verificar solapamiento de citas del veterinario
    const solapamiento = await Cita.findOne({
      where: {
        veterinarioId,
        fecha,
        clinicaId,
        estado: { [Op.notIn]: ['cancelada', 'no_asistio'] },
        [Op.or]: [
          {
            horaInicio: { [Op.lt]: horaFin },
            horaFin: { [Op.gt]: horaInicio },
          },
        ],
      },
    });

    if (solapamiento) {
      return res.status(400).json({
        message: 'El veterinario ya tiene una cita programada en ese horario'
      });
    }

    // Verificar que la mascota y propietario pertenecen a la clinica
    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } });
    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId, activo: true } });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    if (mascota.propietarioId !== propietario.id) {
      return res.status(400).json({
        message: 'La mascota seleccionada no pertenece al tutor indicado'
      });
    }

    const cita = await Cita.create({
      fecha, horaInicio, horaFin, motivo, tipoCita,
      observaciones, mascotaId, propietarioId,
      veterinarioId, clinicaId,
    });

    const citaCompleta = await Cita.findOne({
      where: { id: cita.id },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      ],
    });

    res.status(201).json({
      message: 'Cita agendada exitosamente',
      cita: citaCompleta,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerCitas = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { fecha, veterinarioId, mascotaId, propietarioId, estado, pagina = 1, limite = 20 } = req.query;

    const where = { clinicaId };

    if (fecha) where.fecha = fecha;
    if (veterinarioId) where.veterinarioId = veterinarioId;
    if (mascotaId) where.mascotaId = mascotaId;
    if (propietarioId) where.propietarioId = propietarioId;
    if (estado) where.estado = estado;

    const offset = (pagina - 1) * limite;

    const { count, rows } = await Cita.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['fecha', 'ASC'], ['horaInicio', 'ASC']],
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'fotoPerfil'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      ],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      citas: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const cita = await Cita.findOne({
      where: { id, clinicaId },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza', 'fotoPerfil'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono', 'email'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      ],
    });

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.json({ cita });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const actualizarEstadoCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { estado, motivoCancelacion } = req.body;

    const estadosValidos = ['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado no valido' });
    }

    const cita = await Cita.findOne({ where: { id, clinicaId } });
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    if (estado === 'cancelada' && !motivoCancelacion) {
      return res.status(400).json({ message: 'Debe indicar el motivo de cancelacion' });
    }

    await cita.update({ estado, motivoCancelacion });

    res.json({
      message: `Cita ${estado} exitosamente`,
      cita,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const reprogramarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { fecha, horaInicio, horaFin } = req.body;

    if (!fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ message: 'Fecha y horario son obligatorios' });
    }

    if (horaFin <= horaInicio) {
      return res.status(400).json({ message: 'La hora de fin debe ser mayor a la hora de inicio' });
    }

    if (!isValidDateOnly(fecha)) {
      return res.status(400).json({ message: 'Fecha no valida' });
    }

    if (isPastDateOnly(fecha)) {
      return res.status(400).json({ message: 'No se puede reprogramar una cita a una fecha pasada' });
    }

    const cita = await Cita.findOne({ where: { id, clinicaId } });
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    if (cita.estado === 'completada' || cita.estado === 'cancelada') {
      return res.status(400).json({ message: 'No se puede reprogramar una cita completada o cancelada' });
    }

    // Verificar solapamiento
    const solapamiento = await Cita.findOne({
      where: {
        id: { [Op.ne]: id },
        veterinarioId: cita.veterinarioId,
        fecha,
        clinicaId,
        estado: { [Op.notIn]: ['cancelada', 'no_asistio'] },
        [Op.or]: [
          {
            horaInicio: { [Op.lt]: horaFin },
            horaFin: { [Op.gt]: horaInicio },
          },
        ],
      },
    });

    if (solapamiento) {
      return res.status(400).json({
        message: 'El veterinario ya tiene una cita en ese horario'
      });
    }

    await cita.update({ fecha, horaInicio, horaFin, estado: 'programada' });

    res.json({
      message: 'Cita reprogramada exitosamente',
      cita,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearCita, obtenerCitas, obtenerCita, actualizarEstadoCita, reprogramarCita };
