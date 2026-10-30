// Pacientes con vacuna, desparasitación o control que vence (o venció hace
// poco) y sin cita agendada: lo que recepción debería llamar esta semana.
// Las reglas están en seguimientoReglas.js.

const { Op, fn, col } = require('sequelize')
const AntecedentesMascota = require('../models/AntecedentesMascota')
const HistoriaClinica = require('../models/HistoriaClinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Cita = require('../models/Cita')
const { hoyISO, sumarDiasISO } = require('../utils/vencimiento')
const { DIAS_ATRAS, DIAS_ADELANTE, armarSeguimientos } = require('./seguimientoReglas')

// El control que pidió la última historia del paciente; si después hubo otra
// consulta, ese control ya se hizo.
const controlesPendientes = async ({ clinicaId, desde, hasta }) => {
  const conControl = await HistoriaClinica.findAll({
    where: { clinicaId, proximaConsulta: { [Op.between]: [desde, hasta] } },
    attributes: ['mascotaId', 'proximaConsulta', 'createdAt'],
  })
  if (conControl.length === 0) return new Map()

  const ultimas = await HistoriaClinica.findAll({
    where: { clinicaId, mascotaId: [...new Set(conControl.map((historia) => historia.mascotaId))] },
    attributes: ['mascotaId', [fn('MAX', col('createdAt')), 'ultima']],
    group: ['mascotaId'],
    raw: true,
  })
  const ultimaDe = new Map(ultimas.map((fila) => [fila.mascotaId, new Date(fila.ultima).getTime()]))

  return new Map(
    conControl
      .filter((historia) => new Date(historia.createdAt).getTime() >= ultimaDe.get(historia.mascotaId))
      .map((historia) => [historia.mascotaId, historia.proximaConsulta])
  )
}

const listarSeguimientos = async ({ clinicaId, ahora = new Date() }) => {
  const hoy = hoyISO(ahora)
  const desde = sumarDiasISO(hoy, -DIAS_ATRAS)
  const hasta = sumarDiasISO(hoy, DIAS_ADELANTE)

  const [antecedentes, controles, citas] = await Promise.all([
    AntecedentesMascota.findAll({
      where: { clinicaId },
      attributes: ['mascotaId', 'vacunas', 'desparasitaciones'],
    }),
    controlesPendientes({ clinicaId, desde, hasta }),
    Cita.findAll({
      where: { clinicaId, fecha: { [Op.gte]: hoy }, estado: ['programada', 'en_espera', 'en_atencion'] },
      attributes: ['mascotaId'],
    }),
  ])

  const porMascota = new Map(antecedentes.map((fila) => [fila.mascotaId, { mascotaId: fila.mascotaId, antecedentes: fila }]))
  for (const [mascotaId, proximaConsulta] of controles) {
    porMascota.set(mascotaId, { ...(porMascota.get(mascotaId) || { mascotaId }), proximaConsulta })
  }

  const candidatos = armarSeguimientos({
    pacientes: [...porMascota.values()],
    conCita: new Set(citas.map((cita) => cita.mascotaId)),
    desde,
    hasta,
    limite: 200,
  })
  if (candidatos.length === 0) return []

  // Solo pacientes activos, con el nombre y el teléfono del tutor para llamar.
  const mascotas = await Mascota.findAll({
    where: { clinicaId, id: candidatos.map((item) => item.mascotaId), activo: true },
    attributes: ['id', 'nombre', 'propietarioId'],
  })
  const propietarios = await Propietario.findAll({
    where: { clinicaId, id: [...new Set(mascotas.map((mascota) => mascota.propietarioId).filter(Boolean))] },
    attributes: ['id', 'nombre', 'telefono'],
  })
  const mascotaDe = new Map(mascotas.map((mascota) => [mascota.id, mascota]))
  const propietarioDe = new Map(propietarios.map((propietario) => [propietario.id, propietario]))

  return candidatos
    .filter((item) => mascotaDe.has(item.mascotaId))
    .slice(0, 50)
    .map((item) => {
      const mascota = mascotaDe.get(item.mascotaId)
      const propietario = propietarioDe.get(mascota.propietarioId)
      return {
        ...item,
        mascotaNombre: mascota.nombre,
        propietarioNombre: propietario?.nombre || null,
        propietarioTelefono: propietario?.telefono || null,
      }
    })
}

module.exports = { listarSeguimientos }
