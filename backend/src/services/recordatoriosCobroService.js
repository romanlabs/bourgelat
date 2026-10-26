// Recordatorios de cobro: elige las suscripciones por vencer o recién vencidas,
// envía el aviso a los administradores de cada clínica y un resumen a soporte.
// Diseño: docs/superpowers/specs/2026-10-15-recordatorios-cobro-design.md
const { Op } = require('sequelize')
const Suscripcion = require('../models/Suscripcion')
const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const RecordatorioSuscripcion = require('../models/RecordatorioSuscripcion')
const {
  enviarEmailRecordatorioCobro, enviarEmailResumenCobro, smtpConfigurado,
} = require('./emailService')
const { hoyISO, sumarDiasISO } = require('../utils/vencimiento')
const {
  TOPE_POR_EJECUCION, clasificarRecordatorio, preciosRecordatorio, enlaceWhatsapp, cabeEnTope,
} = require('./recordatoriosCobroReglas')
const logger = require('../utils/logger')

const CONTEXTO = 'recordatorios-cobro'
const ESTADOS_CANDIDATOS = ['prueba', 'activa', 'solo_lectura']
const ESTADOS_VIGENTES = ['prueba', 'activa']

// Misma resolución que jobs/recordatoriosCita.js para los enlaces de correo.
const resolverUrlFrontend = () => (
  process.env.OAUTH_FRONTEND_URL ||
  process.env.FRONTEND_URLS?.split(',')[0] ||
  process.env.FRONTEND_URL ||
  'https://app.bourgelat.co'
).replace(/\/$/, '')

// Clínicas con otra suscripción vigente: si ya renovó, no se le cobra la vieja.
const cargarVigentes = async ({ clinicaIds, hoy }) => {
  const vigentes = await Suscripcion.findAll({
    where: {
      clinicaId: clinicaIds,
      estado: { [Op.in]: ESTADOS_VIGENTES },
      fechaFin: { [Op.gte]: hoy },
    },
    attributes: ['id', 'clinicaId'],
    sinTenant: true,
  })
  const porClinica = new Map()
  for (const { id, clinicaId } of vigentes) {
    if (!porClinica.has(clinicaId)) porClinica.set(clinicaId, [])
    porClinica.get(clinicaId).push(id)
  }
  return porClinica
}

const procesarRecordatorios = async ({
  simular = false, tope = TOPE_POR_EJECUCION, ahora = new Date(),
} = {}) => {
  let enviados = 0
  let fallidos = 0
  // Correos que cuentan para el tope: los enviados, o en simulación los que saldrían.
  let enTope = 0
  const filas = []
  const enProduccion = process.env.NODE_ENV === 'production'

  if (!simular && enProduccion && !smtpConfigurado()) {
    logger.warn({ contexto: CONTEXTO, mensaje: 'SMTP no configurado: no se envían recordatorios de cobro' })
    return { enviados, fallidos, filas }
  }

  const hoy = hoyISO(ahora)
  try {
    const candidatas = await Suscripcion.findAll({
      where: {
        estado: { [Op.in]: ESTADOS_CANDIDATOS },
        fechaFin: { [Op.between]: [sumarDiasISO(hoy, -3), sumarDiasISO(hoy, 7)] },
      },
      include: [{
        model: Clinica,
        as: 'clinica',
        attributes: ['id', 'nombre', 'telefono'],
        where: { activo: true },
        required: true,
      }],
      order: [['fechaFin', 'ASC']],
      sinTenant: true,
    })
    if (candidatas.length === 0) return { enviados, fallidos, filas }

    const yaEnviados = await RecordatorioSuscripcion.findAll({
      where: { suscripcionId: candidatas.map((s) => s.id) },
      attributes: ['suscripcionId', 'tipo'],
      sinTenant: true,
    })
    const enviadas = new Set(yaEnviados.map((r) => `${r.suscripcionId}:${r.tipo}`))

    const vigentes = await cargarVigentes({
      clinicaIds: [...new Set(candidatas.map((s) => s.clinicaId))],
      hoy,
    })

    const urlFrontend = resolverUrlFrontend()
    const urlPagar = `${urlFrontend}/pagar`

    for (const suscripcion of candidatas) {
      // Un fallo en una candidata no corta la corrida: se registra y se sigue.
      try {
        const tieneOtraVigente = (vigentes.get(suscripcion.clinicaId) || [])
          .some((id) => id !== suscripcion.id)
        const clasificacion = clasificarRecordatorio({ suscripcion, hoy, tieneOtraVigente })
        if (!clasificacion) continue
        const { tipo, dias } = clasificacion
        if (enviadas.has(`${suscripcion.id}:${tipo}`)) continue

        const admins = await Usuario.findAll({
          where: {
            clinicaId: suscripcion.clinicaId,
            rol: 'admin',
            activo: true,
            // Misma condición que bloquea el login: cuenta registrada y nunca verificada.
            [Op.not]: { requiereVerificacionCodigo: true, emailVerificado: false },
          },
          attributes: ['nombre', 'email'],
        })
        if (admins.length === 0) continue

        if (!cabeEnTope({ enviados: enTope, destinatarios: admins.length, tope })) {
          logger.warn({ contexto: CONTEXTO, mensaje: `Tope de ${tope} correos por ejecución alcanzado` })
          break
        }

        const clinica = suscripcion.clinica
        const fechaFin = String(suscripcion.fechaFin).slice(0, 10)
        const fila = {
          suscripcionId: suscripcion.id,
          clinicaId: suscripcion.clinicaId,
          clinica: clinica?.nombre,
          plan: suscripcion.plan,
          tipo,
          dias,
          fechaFin,
          correos: admins.map((a) => a.email),
          telefono: clinica?.telefono || null,
          enlaceWhatsapp: enlaceWhatsapp({ telefono: clinica?.telefono, nombreClinica: clinica?.nombre, urlPagar }),
        }

        if (simular) {
          enTope += admins.length
          filas.push(fila)
          continue
        }

        // El estado de antes del cambio decide si el correo habla de la prueba.
        const esPrueba = suscripcion.estado === 'prueba'
        if (tipo === 'vencida' && ESTADOS_VIGENTES.includes(suscripcion.estado)) {
          await suscripcion.update({ estado: 'solo_lectura' })
        }

        let registro
        try {
          registro = await RecordatorioSuscripcion.create({
            suscripcionId: suscripcion.id,
            clinicaId: suscripcion.clinicaId,
            tipo,
            destinatarios: admins.length,
          })
        } catch (error) {
          // Otra instancia ya registró este aviso: lo envía ella.
          if (error.name === 'SequelizeUniqueConstraintError') continue
          throw error
        }

        let salidos = 0
        for (const admin of admins) {
          try {
            const resultado = await enviarEmailRecordatorioCobro({
              para: admin.email,
              nombre: admin.nombre,
              clinica: clinica?.nombre,
              tipo,
              dias,
              fechaFin,
              esPrueba,
              precios: preciosRecordatorio(suscripcion),
              urlPagar,
              urlFrontend,
            })
            if (enProduccion && resultado?.enviado === false) continue
            salidos += 1
          } catch (error) {
            logger.error({
              contexto: CONTEXTO,
              mensaje: `No se pudo enviar el aviso: ${error.code || error.responseCode || 'desconocido'}`,
              suscripcionId: suscripcion.id,
              clinicaId: suscripcion.clinicaId,
            })
          }
        }

        if (salidos === 0) {
          fallidos += 1
          // Sin el registro, la próxima ejecución lo vuelve a intentar.
          try {
            await registro.destroy()
          } catch (errorBorrar) {
            logger.error({
              contexto: CONTEXTO,
              mensaje: 'No se pudo borrar el registro del aviso tras el fallo de envío',
              suscripcionId: suscripcion.id,
              clinicaId: suscripcion.clinicaId,
            })
          }
          continue
        }

        // Ya salieron correos: la fila va al resumen aunque falle este ajuste.
        enviados += salidos
        enTope += salidos
        filas.push(fila)
        if (salidos !== admins.length) {
          try {
            await registro.update({ destinatarios: salidos })
          } catch (errorAjuste) {
            logger.error({
              contexto: CONTEXTO,
              mensaje: 'No se pudo ajustar el número de destinatarios del aviso',
              suscripcionId: suscripcion.id,
              clinicaId: suscripcion.clinicaId,
            })
          }
        }
      } catch (error) {
        fallidos += 1
        logger.error({
          contexto: CONTEXTO,
          mensaje: `Error al procesar el aviso: ${error.message}`,
          suscripcionId: suscripcion.id,
          clinicaId: suscripcion.clinicaId,
        })
      }
    }
  } catch (error) {
    logger.error({ contexto: CONTEXTO, mensaje: `Error en la corrida: ${error.message}` })
  }

  // Fuera del try: aunque la corrida se corte, soporte recibe lo que sí salió.
  if (!simular && filas.length > 0) {
    try {
      await enviarEmailResumenCobro({ filas, fecha: hoy })
    } catch (error) {
      logger.error({
        contexto: CONTEXTO,
        mensaje: `No se pudo enviar el resumen a soporte: ${error.code || error.responseCode || 'desconocido'}`,
      })
    }
  }

  if (enviados > 0 || fallidos > 0) {
    logger.info({ contexto: CONTEXTO, mensaje: `Correos enviados: ${enviados}, avisos fallidos: ${fallidos}` })
  }
  return { enviados, fallidos, filas }
}

module.exports = { procesarRecordatorios }
