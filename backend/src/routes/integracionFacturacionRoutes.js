const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  obtenerConfiguracionFacturacion,
  guardarConfiguracionFactus,
  sincronizarFactus,
  probarConexionFactus,
} = require('../controllers/integracionFacturacionController')

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  obtenerConfiguracionFacturacion
)

router.put(
  '/factus',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    body('ambiente').optional().isIn(['sandbox', 'production']).withMessage('Ambiente no vÃ¡lido'),
    body('rangoNumeracionId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Rango de numeraciÃ³n no vÃ¡lido'),
    body('documentoCodigo').optional().trim(),
    body('formaPagoCodigo').optional().trim(),
    body('metodoPagoCodigo').optional().trim(),
    body('enviarEmail').optional().isBoolean().withMessage('enviarEmail debe ser booleano'),
    validar,
  ],
  guardarConfiguracionFactus
)

router.post(
  '/factus/sincronizar',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  sincronizarFactus
)

router.post(
  '/factus/probar',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  probarConexionFactus
)

module.exports = router
