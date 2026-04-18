const express = require('express')

const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { obtenerAuditoria } = require('../controllers/auditoriaController')

const router = express.Router()

router.get('/', verificarToken, verificarRol('superadmin', 'admin'), obtenerAuditoria)

module.exports = router
