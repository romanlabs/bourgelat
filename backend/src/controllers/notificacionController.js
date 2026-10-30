const { listarMias, marcarLeidas } = require('../services/notificacionService')

// Cada usuario ve y marca solo sus avisos: el filtro va por clinicaId y
// usuarioId del token, nunca por parámetros del cliente.

const listarNotificaciones = async (req, res) => {
  try {
    const { clinicaId, id: usuarioId } = req.usuario
    res.json(await listarMias({ clinicaId, usuarioId }))
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

// Marcar leído es estado personal de la campanita, no un cambio de datos de la
// clínica: no pasa por auditoría.
const marcarNotificacionesLeidas = async (req, res) => {
  try {
    const { clinicaId, id: usuarioId } = req.usuario
    const actualizadas = await marcarLeidas({ clinicaId, usuarioId, ids: req.body?.ids })
    res.json({ actualizadas })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

module.exports = { listarNotificaciones, marcarNotificacionesLeidas }
