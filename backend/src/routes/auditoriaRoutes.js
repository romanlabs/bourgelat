const express = require('express')
const { query } = require('express-validator')

const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { obtenerAuditoria, TIPOS_ACCION } = require('../controllers/auditoriaController')

const router = express.Router()

router.get(
  '/',
  verificarToken,
  verificarRol('superadmin', 'admin'),
  [
    query('usuarioId').optional({ values: 'falsy' }).isUUID().withMessage('Usuario no valido'),
    query('tipo').optional({ values: 'falsy' }).isIn(Object.keys(TIPOS_ACCION)).withMessage('Tipo de accion no valido'),
    validar,
  ],
  obtenerAuditoria
)

module.exports = router
