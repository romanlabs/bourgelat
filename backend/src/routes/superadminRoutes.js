const express = require('express')

const { obtenerResumenGlobal, listarClinicas } = require('../controllers/superadminController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')

const router = express.Router()

router.get('/resumen', verificarToken, verificarRol('superadmin'), obtenerResumenGlobal)
router.get('/clinicas', verificarToken, verificarRol('superadmin'), listarClinicas)

module.exports = router
