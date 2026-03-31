const express = require('express')

const { obtenerResumenGlobal } = require('../controllers/superadminController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/resumen', verificarToken, verificarRol('superadmin'), obtenerResumenGlobal)

module.exports = router
