const express = require('express')
const router = express.Router()
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const AuditoriaLog = require('../models/AuditoriaLog')
const { Op } = require('sequelize')

router.get('/', verificarToken, verificarRol('superadmin', 'admin'), async (req, res) => {
  try {
    const { pagina = 1, limite = 50, accion, desde, hasta } = req.query
    const { id: clinicaId } = req.usuario

    const where = { clinicaId }

    if (accion) where.accion = accion
    if (desde && hasta) {
      where.createdAt = { [Op.between]: [new Date(desde), new Date(hasta)] }
    }

    const offset = (pagina - 1) * limite

    const { count, rows } = await AuditoriaLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limite),
      offset: parseInt(offset),
    })

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      logs: rows,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
})

module.exports = router