// Envía por correo el aviso de cada cita al profesional asignado, con la
// anticipación que eligió la clínica. Corre cada minuto desde index.js.
// Diseño: docs/superpowers/specs/2026-10-17-recordatorios-cita-design.md
const { Op } = require('sequelize')
const sequelize = require('../config/database')
const Cita = require('../models/Cita')
const Clinica = require('../models/Clinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Consultorio = require('../models/Consultorio')
const { obtenerSuscripcionActivaClinica } = require('../services/suscripcionService')
const { enviarEmailRecordatorioCita, smtpConfigurado } = require('../services/emailService')
const { notificar } = require('../services/notificacionService')
const { avisoCitaProxima } = require('../services/notificacionReglas')
const { hoyISO, sumarDiasISO } = require('../utils/vencimiento')
const {
  TOPE_DIARIO, inicioCita, inicioDelDia, debeAvisar, datosCorreo,
} = require('../services/recordatorioCitaReglas')
const logger = require('../utils/logger')

const INTERVALO_MS = 60 * 1000
const ESTADOS_QUE_AVISAN = ['prueba', 'activa']

let corriendo = false
let diaTopeAvisado = null
let diaSmtpAvisado = null

const contarEnviadosHoy = (hoy) =>
  Cita.count({
    where: { recordatorioProfesionalEnviadoEn: { [Op.gte]: inicioDelDia(hoy) } },
    sinTenant: true,
  })

// Marca antes de enviar: si otra corrida ya la tomó o cambió de estado, no
// actualiza ninguna fila y se salta.
const tomarCita = async (citaId) => {
  const [, filas] = await sequelize.query(
    `UPDATE citas SET "recordatorioProfesionalEnviadoEn" = now()
     WHERE id = :id AND "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`,
    { replacements: { id: citaId }, type: sequelize.QueryTypes.UPDATE }
  )
  return filas > 0
}

const soltarCita = (citaId) =>
  sequelize.query(
    `UPDATE citas SET "recordatorioProfesionalEnviadoEn" = NULL WHERE id = :id`,
    { replacements: { id: citaId }, type: sequelize.QueryTypes.UPDATE }
  )

const enviarRecordatoriosCita = async ({ ahora = new Date() } = {}) => {
  if (corriendo) return { enviados: 0, fallidos: 0 }
  let enviados = 0
  let fallidos = 0
  const enProduccion = process.env.NODE_ENV === 'production'
  if (enProduccion && !smtpConfigurado()) {
    const dia = hoyISO(ahora)
    if (diaSmtpAvisado !== dia) {
      diaSmtpAvisado = dia
      logger.warn({ contexto: 'recordatorio-cita', mensaje: 'SMTP no configurado: no se envían recordatorios de cita' })
    }
    return { enviados, fallidos }
  }
  corriendo = true
  try {
    const hoy = hoyISO(ahora)
    const candidatas = await Cita.findAll({
      where: {
        estado: 'programada',
        origen: 'programada',
        recordatorioProfesionalEnviadoEn: null,
        fecha: { [Op.between]: [hoy, sumarDiasISO(hoy, 2)] },
      },
      include: [
        { model: Clinica, attributes: ['id', 'recordatorioCitaActivo', 'recordatorioCitaMinutos'], where: { recordatorioCitaActivo: true } },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre', 'email', 'activo'], where: { activo: true } },
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Consultorio, as: 'consultorio', attributes: ['id', 'nombre'], required: false },
      ],
      order: [['fecha', 'ASC'], ['horaInicio', 'ASC']],
      sinTenant: true,
    })

    const enVentana = candidatas.filter((cita) => {
      const inicio = inicioCita(cita)
      if (Number.isNaN(inicio?.getTime?.())) return false
      return debeAvisar({ inicio, ahora, minutos: cita.Clinica.recordatorioCitaMinutos })
    })
    if (enVentana.length === 0) return { enviados, fallidos }

    let restantes = TOPE_DIARIO - (await contarEnviadosHoy(hoy))
    const suscripciones = new Map()
    // Misma resolución que authController (urlFrontend) para los enlaces de correo.
    const urlFrontend = (
      process.env.OAUTH_FRONTEND_URL ||
      process.env.FRONTEND_URLS?.split(',')[0] ||
      process.env.FRONTEND_URL ||
      'https://app.bourgelat.co'
    ).replace(/\/$/, '')

    for (const cita of enVentana) {
      if (restantes <= 0) {
        if (diaTopeAvisado !== hoy) {
          diaTopeAvisado = hoy
          logger.warn({ contexto: 'recordatorio-cita', mensaje: `Tope diario de ${TOPE_DIARIO} avisos alcanzado` })
        }
        break
      }

      if (!suscripciones.has(cita.clinicaId)) {
        try {
          const { suscripcion } = await obtenerSuscripcionActivaClinica(cita.clinicaId)
          suscripciones.set(cita.clinicaId, ESTADOS_QUE_AVISAN.includes(suscripcion?.estado))
        } catch (error) {
          suscripciones.set(cita.clinicaId, false)
          logger.error({
            contexto: 'recordatorio-cita',
            mensaje: `No se pudo consultar la suscripción: ${error.message}`,
            clinicaId: cita.clinicaId,
          })
        }
      }
      if (!suscripciones.get(cita.clinicaId)) continue

      if (!(await tomarCita(cita.id))) continue

      try {
        const resultado = await enviarEmailRecordatorioCita({
          para: cita.veterinario.email,
          nombreProfesional: cita.veterinario.nombre,
          datos: datosCorreo({
            cita, mascota: cita.mascota, propietario: cita.propietario,
            consultorio: cita.consultorio, urlFrontend,
          }),
        })
        if (enProduccion && resultado?.enviado === false) {
          throw Object.assign(new Error('Correo no enviado'), { code: 'NO_ENVIADO' })
        }
        enviados += 1
        restantes -= 1
        // El mismo aviso en la campanita. Solo tras el envío: si el correo
        // falla, la cita se suelta y se reintenta, y no debe avisar dos veces.
        await notificar({
          clinicaId: cita.clinicaId,
          usuarioIds: [cita.veterinario.id],
          aviso: avisoCitaProxima({
            cita,
            mascotaNombre: cita.mascota?.nombre,
            propietarioNombre: cita.propietario?.nombre,
            consultorioNombre: cita.consultorio?.nombre,
          }),
        })
      } catch (error) {
        fallidos += 1
        try {
          await soltarCita(cita.id)
        } catch (errorSoltar) {
          logger.error({
            contexto: 'recordatorio-cita',
            mensaje: 'No se pudo liberar la marca del aviso tras el fallo de envío',
            citaId: cita.id,
            clinicaId: cita.clinicaId,
          })
        }
        logger.error({
          contexto: 'recordatorio-cita',
          mensaje: `No se pudo enviar el aviso: ${error.code || error.responseCode || 'desconocido'}`,
          citaId: cita.id,
          clinicaId: cita.clinicaId,
        })
      }
    }

    if (enviados > 0 || fallidos > 0) {
      logger.info({ contexto: 'recordatorio-cita', mensaje: `Avisos enviados: ${enviados}, fallidos: ${fallidos}` })
    }
    return { enviados, fallidos }
  } catch (error) {
    logger.error({ contexto: 'recordatorio-cita', mensaje: `Error en la corrida: ${error.message}` })
    return { enviados, fallidos }
  } finally {
    corriendo = false
  }
}

module.exports = { enviarRecordatoriosCita, INTERVALO_MS }
