const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');
const Consultorio = require('../models/Consultorio');
const HistoriaClinica = require('../models/HistoriaClinica');
const { isPastDateOnly, isValidDateOnly, formatDateOnlyLocal } = require('../utils/dateOnly');
const { parsePaginacion } = require('../utils/paginacion');
const { tenantWhere } = require('../utils/tenant');
const { DURACION_ESTIMADA_MINUTOS } = require('../config/duracionesCita');
const { obtenerContextoAgenda, evaluarVentana } = require('../services/horarioAtencionService');
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware');

const ESTADOS_ACTIVOS_AGENDA = ['programada', 'en_espera', 'en_atencion'];

// Transiciones de estado permitidas. Los estados terminales (completada,
// cancelada, no_asistio) no tienen salida: reabrir una cita cerrada exige
// reprogramarla o crear una nueva.
const TRANSICIONES_ESTADO = {
  programada: ['en_espera', 'en_atencion', 'cancelada', 'no_asistio'],
  en_espera: ['en_atencion', 'cancelada', 'no_asistio'],
  en_atencion: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
  no_asistio: [],
};

const sumarMinutos = (horaHHMM, minutos) => {
  const [h, m] = horaHHMM.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
  const horaFin = Math.floor(total / 60);
  const minFin = total % 60;
  return `${String(horaFin).padStart(2, '0')}:${String(minFin).padStart(2, '0')}`;
};

const nowHHMM = () => new Date().toTimeString().slice(0, 5);

const esProfesionalVeterinario = (usuario) =>
  usuario &&
  usuario.activo &&
  (usuario.rol === 'veterinario' ||
    (Array.isArray(usuario.rolesAdicionales) && usuario.rolesAdicionales.includes('veterinario')));

/**
 * Valida veterinario/propietario/mascota compartidos por crearCita y crearWalkIn.
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

/** Valida que el consultorio (opcional) exista, este activo y pertenezca a la clinica. */
const validarConsultorio = async (consultorioId, clinicaId) => {
  if (!consultorioId) return {};

  const consultorio = await Consultorio.findOne({ where: { id: consultorioId, clinicaId, activo: true } });
  if (!consultorio) {
    return { error: 'Consultorio no encontrado', status: 404 };
  }

  return { consultorio };
};

const ROLES_OVERRIDE_HORARIO = ['admin', 'superadmin'];

/**
 * Valida que el intervalo caiga dentro del horario de atencion de la clinica y
 * fuera de todo bloqueo de agenda.
 *
 * Un admin puede forzar la cita (urgencias) enviando forzarFueraDeHorario: true;
 * queda registrado en auditoria. Para el resto de roles el rechazo es duro.
 * Retorna {} si se puede continuar, o { error, status, codigo }.
 */
const validarVentanaAtencion = async ({ req, clinicaId, fecha, horaInicio, horaFin, forzar }) => {
  const { horarioAtencion, bloqueos } = await obtenerContextoAgenda(clinicaId, {
    desde: fecha,
    hasta: fecha,
  });

  const resultado = evaluarVentana({ horarioAtencion, bloqueos, fecha, horaInicio, horaFin });

  if (resultado.valido) return {};

  const puedeForzar = forzar === true && ROLES_OVERRIDE_HORARIO.includes(req?.usuario?.rol);

  if (!puedeForzar) {
    return { error: resultado.message, status: 400, codigo: resultado.codigo };
  }

  await registrarAuditoria({
    accion: 'CITA_FUERA_DE_HORARIO',
    entidad: 'Cita',
    entidadId: null,
    descripcion: `Cita agendada fuera del horario de atencion (${resultado.codigo}) el ${fecha} de ${horaInicio} a ${horaFin}`,
    datosNuevos: { fecha, horaInicio, horaFin, codigo: resultado.codigo },
    req,
    resultado: 'exitoso',
  });

  return {};
};

/**
 * Busca choque de horario contra el veterinario y, si se indica, contra el
 * consultorio. Solo las citas de origen 'programada' bloquean agenda: los
 * walk-in tienen una horaFin estimada y no deben impedir programar citas reales.
 */
const buscarSolapamiento = async ({ clinicaId, fecha, horaInicio, horaFin, veterinarioId, consultorioId, excluirId }) => {
  const recursoOr = [{ veterinarioId }];
  if (consultorioId) recursoOr.push({ consultorioId });

  const where = {
    fecha,
    clinicaId,
    origen: 'programada',
    estado: { [Op.notIn]: ['cancelada', 'no_asistio'] },
    [Op.or]: recursoOr,
    [Op.and]: [
      { horaInicio: { [Op.lt]: horaFin } },
      { horaFin: { [Op.gt]: horaInicio } },
    ],
  };

  if (excluirId) {
    where.id = { [Op.ne]: excluirId };
  }

  return Cita.findOne({ where });
};

/**
 * Busca, sin bloquear la creacion, una cita del origen contrario (programada
 * vs walk-in) que se solape con el rango dado para el mismo veterinario o
 * consultorio. Usada para generar advertencias no-bloqueantes en recepcion.
 */
const buscarConflictoCruzado = async ({ clinicaId, fecha, horaInicio, horaFin, veterinarioId, consultorioId, origenBuscado, estadosBuscados }) => {
  const recursoOr = [{ veterinarioId }];
  if (consultorioId) recursoOr.push({ consultorioId });

  return Cita.findOne({
    where: {
      fecha,
      clinicaId,
      origen: origenBuscado,
      estado: estadosBuscados ? { [Op.in]: estadosBuscados } : { [Op.notIn]: ['cancelada', 'no_asistio', 'completada'] },
      [Op.or]: recursoOr,
      [Op.and]: [
        { horaInicio: { [Op.lt]: horaFin } },
        { horaFin: { [Op.gt]: horaInicio } },
      ],
    },
    include: [{ model: Mascota, as: 'mascota', attributes: ['id', 'nombre'] }],
  });
};

const incluirRelacionesCita = (cita, clinicaId) =>
  Cita.findOne({
    where: { id: cita.id, clinicaId },
    include: [
      { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
      { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
      { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
    ],
  });

const crearCita = async (req, res) => {
  try {
    const {
      fecha, horaInicio, horaFin, motivo, tipoCita,
      observaciones, mascotaId, propietarioId, veterinarioId, consultorioId,
      forzarFueraDeHorario,
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

    const { error, status } = await validarParticipantesCita({
      clinicaId, veterinarioId, propietarioId, mascotaId,
    });
    if (error) {
      return res.status(status).json({ message: error });
    }

    const consultorioResult = await validarConsultorio(consultorioId, clinicaId);
    if (consultorioResult.error) {
      return res.status(consultorioResult.status).json({ message: consultorioResult.error });
    }

    const ventana = await validarVentanaAtencion({
      req, clinicaId, fecha, horaInicio, horaFin, forzar: forzarFueraDeHorario,
    });
    if (ventana.error) {
      return res.status(ventana.status).json({ message: ventana.error, codigo: ventana.codigo });
    }

    const solapamiento = await buscarSolapamiento({
      clinicaId, fecha, horaInicio, horaFin, veterinarioId, consultorioId,
    });

    if (solapamiento) {
      const chocaPorConsultorio = consultorioId && solapamiento.consultorioId === consultorioId;
      return res.status(400).json({
        message: chocaPorConsultorio && solapamiento.veterinarioId !== veterinarioId
          ? 'El consultorio ya esta ocupado en ese horario'
          : 'El veterinario ya tiene una cita programada en ese horario'
      });
    }

    const cita = await Cita.create({
      fecha, horaInicio, horaFin, motivo, tipoCita,
      observaciones, mascotaId, propietarioId,
      veterinarioId, clinicaId, consultorioId: consultorioId || null,
      origen: 'programada',
    });

    const citaCompleta = await incluirRelacionesCita(cita, clinicaId);

    const walkInEnCurso = await buscarConflictoCruzado({
      clinicaId, fecha, horaInicio, horaFin, veterinarioId, consultorioId,
      origenBuscado: 'walk_in',
      estadosBuscados: ['en_espera', 'en_atencion'],
    });

    res.status(201).json({
      message: 'Cita agendada exitosamente',
      cita: citaCompleta,
      advertencia: walkInEnCurso
        ? { tipo: 'walk_in_en_curso', paciente: walkInEnCurso.mascota?.nombre || null }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const crearWalkIn = async (req, res) => {
  try {
    const {
      motivo, tipoCita, observaciones,
      mascotaId, propietarioId, veterinarioId, consultorioId,
    } = req.body;
    const { clinicaId } = req.usuario;

    if (!motivo || !mascotaId || !propietarioId || !veterinarioId) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben completarse' });
    }

    const { error, status } = await validarParticipantesCita({
      clinicaId, veterinarioId, propietarioId, mascotaId,
    });
    if (error) {
      return res.status(status).json({ message: error });
    }

    const consultorioResult = await validarConsultorio(consultorioId, clinicaId);
    if (consultorioResult.error) {
      return res.status(consultorioResult.status).json({ message: consultorioResult.error });
    }

    // El walk-in siempre es "ahora": sin fecha/hora futura, no bloquea agenda,
    // pero se revisa si hay una cita programada proxima para advertir a recepcion.
    const ahora = nowHHMM();
    const fecha = formatDateOnlyLocal();
    const tipoCitaFinal = tipoCita || 'consulta_general';
    const horaFinEstimada = sumarMinutos(ahora, DURACION_ESTIMADA_MINUTOS[tipoCitaFinal] || 30);

    const cita = await Cita.create({
      fecha,
      horaInicio: ahora,
      horaFin: horaFinEstimada,
      horaLlegada: ahora,
      motivo,
      tipoCita: tipoCitaFinal,
      estado: 'en_espera',
      origen: 'walk_in',
      observaciones,
      mascotaId, propietarioId, veterinarioId, clinicaId,
      consultorioId: consultorioId || null,
    });

    const citaCompleta = await incluirRelacionesCita(cita, clinicaId);

    const citaProgramadaProxima = await buscarConflictoCruzado({
      clinicaId, fecha, horaInicio: ahora, horaFin: horaFinEstimada, veterinarioId, consultorioId,
      origenBuscado: 'programada',
    });

    // Un ingreso directo fuera del horario de atencion es una urgencia legitima:
    // no se bloquea, solo se avisa a recepcion.
    const { horarioAtencion, bloqueos } = await obtenerContextoAgenda(clinicaId, {
      desde: fecha, hasta: fecha,
    });
    const ventana = evaluarVentana({
      horarioAtencion, bloqueos, fecha, horaInicio: ahora, horaFin: horaFinEstimada,
    });

    const advertencias = [
      citaProgramadaProxima
        ? {
            tipo: 'cita_programada_proxima',
            horaInicio: citaProgramadaProxima.horaInicio,
            paciente: citaProgramadaProxima.mascota?.nombre || null,
          }
        : null,
      ventana.valido ? null : { tipo: 'fuera_de_horario', codigo: ventana.codigo, message: ventana.message },
    ].filter(Boolean);

    res.status(201).json({
      message: 'Paciente registrado en sala de espera',
      cita: citaCompleta,
      advertencia: advertencias[0] || null,
      advertencias,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerCitas = async (req, res) => {
  try {
    const {
      fecha, fechaDesde, fechaHasta,
      veterinarioId, mascotaId, propietarioId, estado,
    } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = tenantWhere(req);

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
        { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
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
        { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
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

const obtenerSalaEspera = async (req, res) => {
  try {
    const fecha = req.query.fecha || formatDateOnlyLocal();

    const citas = await Cita.findAll({
      where: tenantWhere(req, { fecha }),
      limit: 300,
      order: [
        [sequelize.fn('COALESCE', sequelize.col('horaLlegada'), sequelize.col('horaInicio')), 'ASC'],
      ],
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'fotoPerfil'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
        { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
        { model: HistoriaClinica, as: 'historia', attributes: ['id'], required: false },
      ],
    });

    const resumen = citas.reduce((acc, cita) => {
      if (cita.estado === 'programada') acc.programadas += 1;
      if (cita.estado === 'en_espera') acc.enEspera += 1;
      if (cita.estado === 'en_atencion') acc.enAtencion += 1;
      if (cita.estado === 'completada') acc.completadas += 1;
      return acc;
    }, { programadas: 0, enEspera: 0, enAtencion: 0, completadas: 0 });

    res.json({ fecha, citas, resumen });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerDisponibilidadVeterinarios = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const fecha = req.query.fecha || formatDateOnlyLocal();

    const [veterinarios, consultorios, citasHoy] = await Promise.all([
      Usuario.findAll({ where: { clinicaId, activo: true }, attributes: ['id', 'nombre', 'rol', 'rolesAdicionales', 'activo'] }),
      Consultorio.findAll({ where: { clinicaId, activo: true }, attributes: ['id', 'nombre'] }),
      Cita.findAll({
        where: { clinicaId, fecha, estado: ESTADOS_ACTIVOS_AGENDA },
        include: [{ model: Mascota, as: 'mascota', attributes: ['id', 'nombre'] }],
      }),
    ]);

    const disponibilidad = veterinarios
      .filter(esProfesionalVeterinario)
      .map((vet) => {
        const citaEnAtencion = citasHoy.find((c) => c.veterinarioId === vet.id && c.estado === 'en_atencion');
        const enEspera = citasHoy.filter((c) => c.veterinarioId === vet.id && c.estado === 'en_espera').length;
        const programadasHoy = citasHoy.filter((c) => c.veterinarioId === vet.id).length;

        return {
          id: vet.id,
          nombre: vet.nombre,
          estado: citaEnAtencion ? 'ocupado' : 'libre',
          citaActual: citaEnAtencion
            ? { id: citaEnAtencion.id, paciente: citaEnAtencion.mascota?.nombre || null }
            : null,
          enEspera,
          programadasHoy,
        };
      });

    const consultoriosDisponibilidad = consultorios.map((cons) => {
      const citaEnAtencion = citasHoy.find((c) => c.consultorioId === cons.id && c.estado === 'en_atencion');
      return {
        id: cons.id,
        nombre: cons.nombre,
        ocupado: Boolean(citaEnAtencion),
      };
    });

    res.json({ fecha, veterinarios: disponibilidad, consultorios: consultoriosDisponibilidad });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const actualizarEstadoCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { estado, motivoCancelacion } = req.body;

    const estadosValidos = ['programada', 'en_espera', 'en_atencion', 'completada', 'cancelada', 'no_asistio'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ message: 'Estado no valido' });
    }

    const cita = await Cita.findOne({ where: { id, clinicaId } });
    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const transicionesPermitidas = TRANSICIONES_ESTADO[cita.estado] || [];
    if (!transicionesPermitidas.includes(estado)) {
      return res.status(400).json({
        message: `No se puede pasar una cita de "${cita.estado}" a "${estado}"`
      });
    }

    if (estado === 'cancelada' && !motivoCancelacion) {
      return res.status(400).json({ message: 'Debe indicar el motivo de cancelacion' });
    }

    const cambios = { estado, motivoCancelacion };

    if (estado === 'en_espera' && !cita.horaLlegada) {
      cambios.horaLlegada = nowHHMM();
    }

    if (estado === 'en_atencion') {
      cambios.horaInicioAtencion = nowHHMM();
      if (!cita.horaLlegada) {
        cambios.horaLlegada = cambios.horaInicioAtencion;
      }
    }

    await cita.update(cambios);

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
    const { fecha, horaInicio, horaFin, forzarFueraDeHorario } = req.body;

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

    if (['completada', 'cancelada', 'en_atencion'].includes(cita.estado)) {
      return res.status(400).json({ message: 'No se puede reprogramar una cita completada, cancelada o en atencion' });
    }

    if (cita.origen === 'walk_in') {
      return res.status(400).json({ message: 'Un registro de ingreso directo no se puede reprogramar' });
    }

    const ventana = await validarVentanaAtencion({
      req, clinicaId, fecha, horaInicio, horaFin, forzar: forzarFueraDeHorario,
    });
    if (ventana.error) {
      return res.status(ventana.status).json({ message: ventana.error, codigo: ventana.codigo });
    }

    const solapamiento = await buscarSolapamiento({
      clinicaId, fecha, horaInicio, horaFin,
      veterinarioId: cita.veterinarioId,
      consultorioId: cita.consultorioId,
      excluirId: id,
    });

    if (solapamiento) {
      return res.status(400).json({
        message: 'El veterinario o el consultorio ya tienen una cita en ese horario'
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
  crearCita, crearWalkIn,
  obtenerCitas, obtenerCita, obtenerSalaEspera, obtenerDisponibilidadVeterinarios,
  actualizarEstadoCita, reprogramarCita,
};
