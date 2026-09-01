const { Op } = require('sequelize');
const Clinica = require('../models/Clinica');
const BloqueoAgenda = require('../models/BloqueoAgenda');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Usuario = require('../models/Usuario');

// Fuente de verdad del horario de atencion de la clinica y de los bloqueos
// puntuales de agenda. Todo se compara como texto 'HH:MM' / 'YYYY-MM-DD', igual
// que hace citaController con DATEONLY: el orden lexicografico coincide con el
// cronologico y evita desfases UTC en zonas como Colombia.

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS_SEMANA = ['0', '1', '2', '3', '4', '5', '6'];

const NOMBRES_DIA = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
};

class HorarioInvalidoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HorarioInvalidoError';
  }
}

/** Dia de la semana (0-6) de un DATEONLY 'YYYY-MM-DD', sin pasar por Date. */
const diaSemanaDeFecha = (fecha) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
};

const normalizarHora = (valor) => {
  if (typeof valor !== 'string') return null;
  // Las columnas TIME de Postgres vuelven como 'HH:MM:SS'.
  const recortado = valor.trim().slice(0, 5);
  return HORA_REGEX.test(recortado) ? recortado : null;
};

/**
 * Valida y normaliza el horario semanal recibido del cliente.
 * Acepta null (sin restriccion) y devuelve siempre las 7 claves presentes.
 * Lanza HorarioInvalidoError con un mensaje legible si algo no cuadra.
 */
const normalizarHorario = (raw) => {
  if (raw === null || raw === undefined) return null;

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HorarioInvalidoError('El horario debe ser un objeto con los dias de la semana');
  }

  const resultado = {};

  for (const dia of DIAS_SEMANA) {
    const franjas = raw[dia];

    if (franjas === undefined || franjas === null) {
      resultado[dia] = [];
      continue;
    }

    if (!Array.isArray(franjas)) {
      throw new HorarioInvalidoError(`Las franjas del ${NOMBRES_DIA[dia]} deben ser una lista`);
    }

    const normalizadas = franjas.map((franja) => {
      const inicio = normalizarHora(franja?.inicio);
      const fin = normalizarHora(franja?.fin);

      if (!inicio || !fin) {
        throw new HorarioInvalidoError(
          `Las horas del ${NOMBRES_DIA[dia]} deben tener el formato HH:MM`
        );
      }

      if (fin <= inicio) {
        throw new HorarioInvalidoError(
          `En el ${NOMBRES_DIA[dia]} la hora de cierre debe ser mayor a la de apertura`
        );
      }

      return { inicio, fin };
    });

    normalizadas.sort((a, b) => a.inicio.localeCompare(b.inicio));

    for (let i = 1; i < normalizadas.length; i += 1) {
      if (normalizadas[i].inicio < normalizadas[i - 1].fin) {
        throw new HorarioInvalidoError(
          `Las franjas del ${NOMBRES_DIA[dia]} no se pueden solapar entre si`
        );
      }
    }

    resultado[dia] = normalizadas;
  }

  return resultado;
};

/** true si el bloqueo cubre el dia completo (sin franja horaria). */
const esBloqueoDiaCompleto = (bloqueo) =>
  !normalizarHora(bloqueo.horaInicio) || !normalizarHora(bloqueo.horaFin);

/**
 * Determina si un bloqueo interseca el intervalo [horaInicio, horaFin) de una
 * fecha concreta.
 */
const bloqueoAfecta = (bloqueo, fecha, horaInicio, horaFin) => {
  if (fecha < bloqueo.fechaInicio || fecha > bloqueo.fechaFin) return false;
  if (esBloqueoDiaCompleto(bloqueo)) return true;

  const desde = normalizarHora(bloqueo.horaInicio);
  const hasta = normalizarHora(bloqueo.horaFin);

  return horaInicio < hasta && horaFin > desde;
};

/**
 * Evalua si un intervalo cae dentro del horario de atencion y fuera de todo
 * bloqueo. Devuelve { valido, codigo, message }.
 *
 * codigo: 'dia_cerrado' | 'fuera_de_horario' | 'bloqueado'
 */
const evaluarVentana = ({ horarioAtencion, bloqueos = [], fecha, horaInicio, horaFin }) => {
  const inicio = normalizarHora(horaInicio);
  const fin = normalizarHora(horaFin);

  if (!inicio || !fin) {
    return { valido: false, codigo: 'hora_invalida', message: 'Las horas deben tener el formato HH:MM' };
  }

  const bloqueo = bloqueos.find((item) => bloqueoAfecta(item, fecha, inicio, fin));
  if (bloqueo) {
    return {
      valido: false,
      codigo: 'bloqueado',
      message: `La agenda esta bloqueada en ese horario: ${bloqueo.motivo}`,
      bloqueo: { id: bloqueo.id, motivo: bloqueo.motivo },
    };
  }

  // Sin horario configurado la clinica opera 24/7 (comportamiento previo).
  if (!horarioAtencion) {
    return { valido: true };
  }

  const dia = diaSemanaDeFecha(fecha);
  const franjas = horarioAtencion[String(dia)] || [];

  if (franjas.length === 0) {
    return {
      valido: false,
      codigo: 'dia_cerrado',
      message: `La clinica no atiende los ${NOMBRES_DIA[dia]}`,
      dia,
    };
  }

  const cabe = franjas.some((franja) => inicio >= franja.inicio && fin <= franja.fin);

  if (!cabe) {
    return {
      valido: false,
      codigo: 'fuera_de_horario',
      message: 'El horario seleccionado esta fuera del horario de atencion de la clinica',
      dia,
      franjas,
    };
  }

  return { valido: true };
};

/**
 * Trae el horario de la clinica y los bloqueos que tocan el rango pedido.
 * Si no se pasa rango, devuelve todos los bloqueos desde `desde`.
 */
const obtenerContextoAgenda = async (clinicaId, { desde, hasta } = {}) => {
  const where = { clinicaId };

  if (desde) where.fechaFin = { [Op.gte]: desde };
  if (hasta) where.fechaInicio = { [Op.lte]: hasta };

  const [clinica, bloqueos] = await Promise.all([
    Clinica.findByPk(clinicaId, { attributes: ['id', 'horarioAtencion'] }),
    BloqueoAgenda.findAll({ where, order: [['fechaInicio', 'ASC'], ['horaInicio', 'ASC']] }),
  ]);

  return {
    horarioAtencion: clinica?.horarioAtencion || null,
    bloqueos,
  };
};

/**
 * Citas activas de la clinica que intersecan el rango de un bloqueo.
 * Misma logica de interseccion que buscarSolapamiento en citaController.
 */
const buscarCitasEnRango = async ({
  clinicaId, fechaInicio, fechaFin, horaInicio, horaFin, transaction,
}) => {
  const where = {
    clinicaId,
    fecha: { [Op.between]: [fechaInicio, fechaFin] },
    estado: { [Op.notIn]: ['cancelada', 'no_asistio'] },
  };

  const desde = normalizarHora(horaInicio);
  const hasta = normalizarHora(horaFin);

  if (desde && hasta) {
    where[Op.and] = [
      { horaInicio: { [Op.lt]: hasta } },
      { horaFin: { [Op.gt]: desde } },
    ];
  }

  return Cita.findAll({
    where,
    transaction,
    order: [['fecha', 'ASC'], ['horaInicio', 'ASC']],
    include: [
      { model: Mascota, as: 'mascota', attributes: ['id', 'nombre'] },
      { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
    ],
  });
};

module.exports = {
  HorarioInvalidoError,
  normalizarHorario,
  normalizarHora,
  diaSemanaDeFecha,
  evaluarVentana,
  obtenerContextoAgenda,
  buscarCitasEnRango,
  NOMBRES_DIA,
};
