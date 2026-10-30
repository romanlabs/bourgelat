const { listarMias, marcarLeidas, guardarAjustes, guardarLeidasDerivadas } = require('../services/notificacionService')

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

// Ajustes de la campanita: también son estado personal, sin auditoría.
const actualizarAjustesAvisos = async (req, res) => {
  try {
    const { clinicaId, id: usuarioId } = req.usuario
    const { categoriasApagadas, correoUrgente } = req.body || {}
    res.json({ ajustes: await guardarAjustes({ clinicaId, usuarioId, categoriasApagadas, correoUrgente }) })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

const actualizarLeidasDerivadas = async (req, res) => {
  try {
    const { clinicaId, id: usuarioId } = req.usuario
    res.json({ guardadas: await guardarLeidasDerivadas({ clinicaId, usuarioId, ids: req.body.ids }) })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

module.exports = {
  listarNotificaciones,
  marcarNotificacionesLeidas,
  actualizarAjustesAvisos,
  actualizarLeidasDerivadas,
}
