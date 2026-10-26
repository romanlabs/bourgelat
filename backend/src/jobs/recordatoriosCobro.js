// Avisa por correo a las clínicas cuya suscripción está por vencer o venció.
// Se revisa cada hora desde index.js, pero solo corre una vez al día y dentro
// del horario de oficina de Colombia (8:00 a 20:00).
const { procesarRecordatorios } = require('../services/recordatoriosCobroService')
const { hoyISO } = require('../utils/vencimiento')
const logger = require('../utils/logger')

const INTERVALO_MS = 60 * 60 * 1000
const HORA_INICIO = 8
const HORA_FIN = 20

let corriendo = false
let ultimoDia = null

const formatoHora = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23',
})

const horaColombia = (ahora) => Number(formatoHora.format(ahora))

const ejecutarRecordatoriosCobro = async ({ ahora = new Date() } = {}) => {
  if (corriendo) return
  const hora = horaColombia(ahora)
  if (hora < HORA_INICIO || hora >= HORA_FIN) return
  const hoy = hoyISO(ahora)
  if (ultimoDia === hoy) return

  corriendo = true
  // Se marca antes de procesar: un fallo no provoca reintentos cada hora.
  ultimoDia = hoy
  try {
    const { enviados, fallidos } = await procesarRecordatorios({ ahora })
    if (enviados > 0 || fallidos > 0) {
      logger.info({
        contexto: 'recordatorios-cobro',
        mensaje: `Recordatorios de cobro: ${enviados} enviados, ${fallidos} fallidos`,
      })
    }
  } catch (error) {
    logger.error({ contexto: 'recordatorios-cobro', mensaje: `Error en la corrida: ${error.message}` })
  } finally {
    corriendo = false
  }
}

module.exports = { ejecutarRecordatoriosCobro, INTERVALO_MS }
