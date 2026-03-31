const express = require('express')

const {
  reporteIngresos,
  reporteCitas,
  reporteInventario,
  dashboardGeneral,
} = require('../controllers/reporteController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()

router.get('/dashboard', verificarToken, verificarRol('admin', 'superadmin'), dashboardGeneral)

router.get(
  '/ingresos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador'),
  requerirFuncionalidades('facturacion_interna', 'reportes_operativos'),
  reporteIngresos
)

router.get(
  '/citas',
  verificarToken,
  verificarRol('admin', 'superadmin', 'veterinario'),
  requerirFuncionalidades('reportes_operativos'),
  reporteCitas
)

router.get(
  '/inventario',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirFuncionalidades('inventario', 'reportes_operativos'),
  reporteInventario
)

module.exports = router
