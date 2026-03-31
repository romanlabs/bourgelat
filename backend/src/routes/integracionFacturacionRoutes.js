const express = require('express')
const { body } = require('express-validator')

const {
  obtenerConfiguracionFacturacion,
  guardarConfiguracionFactus,
  sincronizarFactus,
  probarConexionFactus,
} = require('../controllers/integracionFacturacionController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()
const requiereFacturacionElectronica = requerirFuncionalidades('facturacion_electronica')

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requiereFacturacionElectronica,
  obtenerConfiguracionFacturacion
)

router.put(
  '/factus',
  verificarToken,
  verificarRol('superadmin'),
  requiereFacturacionElectronica,
  [
    body('ambiente')
      .optional()
      .isIn(['sandbox', 'production'])
      .withMessage('Ambiente no valido'),
    body('rangoNumeracionId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Rango de numeracion no valido'),
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
  verificarRol('superadmin'),
  requiereFacturacionElectronica,
  sincronizarFactus
)

router.post(
  '/factus/probar',
  verificarToken,
  verificarRol('superadmin'),
  requiereFacturacionElectronica,
  probarConexionFactus
)

module.exports = router
