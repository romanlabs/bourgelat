const Clinica = require('../models/Clinica')
const sequelize = require('../config/database')
const { obtenerSuscripcionActivaClinica, obtenerLimiteNumerico } = require('./suscripcionService')

const MB = 1024 * 1024

// Decision pura, separada del acceso a datos para poder probarla sin base.
const hayCupoAlmacenamiento = ({ usadoMB, limiteMB, bytesNuevos }) => {
  // Sin limite configurado (plan personalizado) no hay nada que verificar.
  if (limiteMB === null || limiteMB === undefined) {
    return true
  }

  // Un contador ausente o corrupto no puede bloquear a la clinica: preferimos
  // dejar pasar la subida antes que impedirle trabajar por un dato malo.
  // Sequelize devuelve los DECIMAL como string, por eso se normaliza con Number.
  const usado = Number(usadoMB)
  if (!Number.isFinite(usado)) {
    return true
  }

  return usado + bytesNuevos / MB <= limiteMB
}

const verificarCupoAlmacenamiento = async (clinicaId, bytes) => {
  const { suscripcion } = await obtenerSuscripcionActivaClinica(clinicaId)
  const limiteMB = obtenerLimiteNumerico(suscripcion, 'almacenamientoMB')
  const clinica = await Clinica.findOne({
    where: { id: clinicaId },
    attributes: ['id', 'almacenamientoUsadoMB'],
  })

  const usadoMB = clinica ? Number(clinica.almacenamientoUsadoMB) : 0

  return {
    permitido: hayCupoAlmacenamiento({ usadoMB, limiteMB, bytesNuevos: bytes }),
    limiteMB,
    usadoMB,
  }
}

// Acepta bytes negativos al borrar un archivo. El GREATEST evita que el
// contador quede negativo si algo se descuadra.
const registrarUsoAlmacenamiento = async (clinicaId, bytes) => {
  await Clinica.update(
    {
      almacenamientoUsadoMB: sequelize.literal(
        `GREATEST(COALESCE("almacenamientoUsadoMB", 0) + (${Number(bytes)} / 1048576.0), 0)`
      ),
    },
    { where: { id: clinicaId } }
  )
}

module.exports = {
  MB,
  hayCupoAlmacenamiento,
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
}
