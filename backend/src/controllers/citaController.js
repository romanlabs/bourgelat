const { Op } = require('sequelize');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');
const HistoriaClinica = require('../models/HistoriaClinica');
const { isPastDateOnly, isValidDateOnly, formatDateOnlyLocal } = require('../utils/dateOnly');
const { parsePaginacion } = require('../utils/paginacion');

const sumarMinutos = (horaHHMM, minutos) => {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
  const horaFin = Math.floor(total / 60);
  const minFin = total % 60;
  return `${String(horaFin).padStart(2, '0')}:${String(minFin).padStart(2, '0')}`;
};

const esProfesionalVeterinario = (usuario) =>
  usuario &&
  usuario.activo &&
  (usuario.rol === 'veterinario' ||
    (Array.isArray(usuario.rolesAdicionales) && usuario.rolesAdicionales.includes('veterinario')));

/**
 * Valida veterinario/propietario/mascota compartidos por crearCita y crearCitaUrgencia.
 * Retorna { error, status } o { veterinario, propietario, mascota }.
 */
const validarParticipantesCita = async ({ clinicaId, veterinarioId, propietarioId, mascotaId }) => {
  const veterinario = await Usuario.findOne({
    where: { id: veterinarioId, clinicaId, activo: true }
  });
  if (!esProfesionalVeterinario(veterinario)) {
    return { error: 'Veterinario no encontrado', status: 404 };
  }

  const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } });
  if (!propietario) {
    return { error: 'Propietario no encontrado', status: 404 };
  }

  const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId, activo: true } });
  if (!mascota) {
    return { error: 'Mascota no encontrada', status: 404 };
  }

  if (mascota.propietarioId !== propietario.id) {
    return { error: 'La mascota seleccionada no pertenece al tutor indicado', status: 400 };
  }

  return { veterinario, propietario, mascota };
};

const incluirRelacionesCita = (cita, clinicaId) =>
  Cita.findOne({
    where: { id: cita.id, clinicaId },
    include: [
      { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
      { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
      { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
    ],
  });

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

    const { error, status, veterinario } = await validarParticipantesCita({
      clinicaId, veterinarioId, propietarioId, mascotaId,
    });
    if (error) {
      return res.status(status).json({ message: error });
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

    const cita = await Cita.create({
      fecha, horaInicio, horaFin, motivo, tipoCita,
      observaciones, mascotaId, propietarioId,
      veterinarioId, clinicaId,
    });

    const citaCompleta = await incluirRelacionesCita(cita, clinicaId);

    res.status(201).json({
      message: 'Cita agendada exitosamente',
      cita: citaCompleta,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const crearCitaUrgencia = async (req, res) => {
  try {
    const {
      fecha, horaInicio, horaFin, motivo,
      observaciones, mascotaId, propietarioId, veterinarioId
    } = req.body;
    const { clinicaId } = req.usuario;

    if (!fecha || !horaInicio || !motivo || !mascotaId || !propietarioId || !veterinarioId) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
    }

    if (!isValidDateOnly(fecha)) {
      return res.status(400).json({ message: 'Fecha no valida' });
    }

    // La urgencia ya fue atendida: puede ser de hoy (incluso horas atras), pero no un dia anterior ni futuro.
    const hoy = formatDateOnlyLocal();
    if (fecha !== hoy) {
      return res.status(400).json({ message: 'La fecha de una urgencia atendida debe ser la de hoy' });
    }

    const ahoraHHMM = new Date().toTimeString().slice(0, 5);
    if (horaInicio > ahoraHHMM) {
      return res.status(400).json({ message: 'La hora de atencion no puede ser futura' });
    }

    const horaFinCalculada = horaFin && horaFin > horaInicio
      ? horaFin
      : sumarMinutos(horaInicio, 30);

    const { error, status } = await validarParticipantesCita({
      clinicaId, veterinarioId, propietarioId, mascotaId,
    });
    if (error) {
      return res.status(status).json({ message: error });
    }

    // No se verifica solapamiento: la atencion ya ocurrio y puede coincidir con otras citas agendadas.
    const cita = await Cita.create({
      fecha, horaInicio, horaFin: horaFinCalculada, motivo,
      tipoCita: 'urgencia', estado: 'completada',
      observaciones, mascotaId, propietarioId,
      veterinarioId, clinicaId,
    });

    const citaCompleta = await incluirRelacionesCita(cita, clinicaId);

    res.status(201).json({
      message: 'Urgencia registrada exitosamente',
      cita: citaCompleta,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerCitas = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const {
      fecha, fechaDesde, fechaHasta,
      veterinarioId, mascotaId, propietarioId, estado,
    } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = { clinicaId };

    if (fecha) {
      where.fecha = fecha;
    } else if (fechaDesde && fechaHasta) {
      where.fecha = { [Op.between]: [fechaDesde, fechaHasta] };
    } else if (fechaDesde) {
      where.fecha = { [Op.gte]: fechaDesde };
    } else if (fechaHasta) {
      where.fecha = { [Op.lte]: fechaHasta };
    }

    if (veterinarioId) where.veterinarioId = veterinarioId;
    if (mascotaId) where.mascotaId = mascotaId;
    if (propietarioId) where.propietarioId = propietarioId;
    if (estado) where.estado = estado;

    const { count, rows } = await Cita.findAndCountAll({
      where,
      limit: limite,
      offset,
      order: [['fecha', 'ASC'], ['horaInicio', 'ASC']],
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'fotoPerfil'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
        { model: HistoriaClinica, as: 'historia', attributes: ['id'], required: false },
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
        { model: HistoriaClinica, as: 'historia', attributes: ['id'], required: false },
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

    const estadosValidos = ['programada', 'en_espera', 'completada', 'cancelada', 'no_asistio'];
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

module.exports = {
  crearCita, crearCitaUrgencia, obtenerCitas, obtenerCita,
  actualizarEstadoCita, reprogramarCita,
};
