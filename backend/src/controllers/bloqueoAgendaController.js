const { Op } = require('sequelize');
const sequelize = require('../config/database');
const BloqueoAgenda = require('../models/BloqueoAgenda');
const Clinica = require('../models/Clinica');
const { tenantWhere } = require('../utils/tenant');
const { isValidDateOnly } = require('../utils/dateOnly');
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware');
const { buscarCitasEnRango, normalizarHora } = require('../services/horarioAtencionService');

// Estados que ya no se pueden cancelar: la cita ocurrio o esta ocurriendo.
// Se reportan como omitidas para que el admin las resuelva a mano.
const ESTADOS_NO_CANCELABLES = ['completada', 'en_atencion'];

const serializarCitaAfectada = (cita) => ({
  id: cita.id,
  fecha: cita.fecha,
  horaInicio: cita.horaInicio,
  horaFin: cita.horaFin,
  estado: cita.estado,
  motivo: cita.motivo,
  mascota: cita.mascota ? { id: cita.mascota.id, nombre: cita.mascota.nombre } : null,
  veterinario: cita.veterinario ? { id: cita.veterinario.id, nombre: cita.veterinario.nombre } : null,
  cancelable: !ESTADOS_NO_CANCELABLES.includes(cita.estado),
});

/**
 * Valida el cuerpo comun de impacto/creacion. Devuelve { error } o los datos ya
 * normalizados. Las horas son opcionales, pero van juntas o ninguna.
 */
const normalizarRangoBloqueo = (body) => {
  const fechaInicio = body.fechaInicio;
  const fechaFin = body.fechaFin || body.fechaInicio;

  if (!isValidDateOnly(fechaInicio) || !isValidDateOnly(fechaFin)) {
    return { error: 'Fecha no valida' };
  }

  if (fechaFin < fechaInicio) {
    return { error: 'La fecha final no puede ser anterior a la inicial' };
  }

  const tieneHoras = Boolean(body.horaInicio || body.horaFin);
  const horaInicio = tieneHoras ? normalizarHora(body.horaInicio) : null;
  const horaFin = tieneHoras ? normalizarHora(body.horaFin) : null;

  if (tieneHoras && (!horaInicio || !horaFin)) {
    return { error: 'Para bloquear una franja debes indicar hora de inicio y de fin en formato HH:MM' };
  }

  if (horaInicio && horaFin && horaFin <= horaInicio) {
    return { error: 'La hora de fin debe ser mayor a la hora de inicio' };
  }

  return { fechaInicio, fechaFin, horaInicio, horaFin };
};

/**
 * Devuelve los bloqueos del rango junto con el horario de atencion. Van juntos
 * a proposito: la agenda necesita ambos para pintar los slots y GET /clinica
 * solo lo puede leer la administracion.
 */
const listarBloqueos = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const where = tenantWhere(req);

    if (desde) where.fechaFin = { [Op.gte]: desde };
    if (hasta) where.fechaInicio = { [Op.lte]: hasta };

    const [bloqueos, clinica] = await Promise.all([
      BloqueoAgenda.findAll({
        where,
        order: [['fechaInicio', 'ASC'], ['horaInicio', 'ASC']],
      }),
      Clinica.findByPk(req.usuario.clinicaId, { attributes: ['id', 'horarioAtencion'] }),
    ]);

    res.json({ bloqueos, horarioAtencion: clinica?.horarioAtencion || null });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

/**
 * Preview: no persiste nada, solo devuelve las citas que quedarian en conflicto
 * con el bloqueo propuesto para que el administrador decida.
 */
const calcularImpacto = async (req, res) => {
  try {
    const rango = normalizarRangoBloqueo(req.query);
    if (rango.error) {
      return res.status(400).json({ message: rango.error });
    }

    const { clinicaId } = req.usuario;
    const citas = await buscarCitasEnRango({ clinicaId, ...rango });

    const afectadas = citas.map(serializarCitaAfectada);

    res.json({
      citas: afectadas,
      total: afectadas.length,
      cancelables: afectadas.filter((cita) => cita.cancelable).length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const crearBloqueo = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const rango = normalizarRangoBloqueo(req.body);
    if (rango.error) {
      await transaction.rollback();
      return res.status(400).json({ message: rango.error });
    }

    const { clinicaId, id: usuarioId } = req.usuario;
    const motivo = String(req.body.motivo || '').trim();
    const cancelarCitas = req.body.cancelarCitas === true;

    if (!motivo) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El motivo del bloqueo es obligatorio' });
    }

    const bloqueo = await BloqueoAgenda.create(
      { ...rango, motivo, clinicaId, creadoPorId: usuarioId || null },
      { transaction }
    );

    const canceladas = [];
    const omitidas = [];

    if (cancelarCitas) {
      const citas = await buscarCitasEnRango({ clinicaId, ...rango, transaction });

      for (const cita of citas) {
        if (ESTADOS_NO_CANCELABLES.includes(cita.estado)) {
          omitidas.push(serializarCitaAfectada(cita));
          continue;
        }

        await cita.update(
          { estado: 'cancelada', motivoCancelacion: motivo },
          { transaction }
        );
        canceladas.push(serializarCitaAfectada(cita));
      }
    }

    await transaction.commit();

    await registrarAuditoria({
      accion: 'CREAR_BLOQUEO_AGENDA',
      entidad: 'BloqueoAgenda',
      entidadId: bloqueo.id,
      descripcion: `Bloqueo de agenda ${rango.fechaInicio} a ${rango.fechaFin}: ${motivo}`,
      datosNuevos: { ...rango, motivo, citasCanceladas: canceladas.length },
      req,
      resultado: 'exitoso',
    });

    for (const cita of canceladas) {
      await registrarAuditoria({
        accion: 'CANCELAR_CITA',
        entidad: 'Cita',
        entidadId: cita.id,
        descripcion: `Cita cancelada por bloqueo de agenda: ${motivo}`,
        datosNuevos: { estado: 'cancelada', motivoCancelacion: motivo },
        req,
        resultado: 'exitoso',
      });
    }

    res.status(201).json({
      message: 'Bloqueo creado exitosamente',
      bloqueo,
      citasCanceladas: canceladas,
      citasOmitidas: omitidas,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

/** Elimina el bloqueo. Las citas ya canceladas no se reactivan. */
const eliminarBloqueo = async (req, res) => {
  try {
    const { id } = req.params;

    const bloqueo = await BloqueoAgenda.findOne({ where: tenantWhere(req, { id }) });
    if (!bloqueo) {
      return res.status(404).json({ message: 'Bloqueo no encontrado' });
    }

    const datosAnteriores = bloqueo.toJSON();
    await bloqueo.destroy();

    await registrarAuditoria({
      accion: 'ELIMINAR_BLOQUEO_AGENDA',
      entidad: 'BloqueoAgenda',
      entidadId: id,
      descripcion: `Bloqueo de agenda eliminado: ${datosAnteriores.motivo}`,
      datosAnteriores,
      req,
      resultado: 'exitoso',
    });

    res.json({ message: 'Bloqueo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  listarBloqueos,
  calcularImpacto,
  crearBloqueo,
  eliminarBloqueo,
};
