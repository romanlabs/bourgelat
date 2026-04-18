const express = require('express')

const {
  crearProducto,
  obtenerProductos,
  obtenerProducto,
  editarProducto,
  registrarMovimiento,
  obtenerAlertas,
  obtenerProductoPorBarcode,
  obtenerCatalogoMedicamentos,
  obtenerMovimientos,
} = require('../controllers/inventarioController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()
const requiereInventario = requerirFuncionalidades('inventario')

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  crearProducto
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'recepcionista', 'facturador'),
  requiereInventario,
  obtenerProductos
)

router.get(
  '/catalogo-medicamentos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'facturador'),
  requiereInventario,
  obtenerCatalogoMedicamentos
)

router.get(
  '/movimientos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  obtenerMovimientos
)

router.get(
  '/alertas',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  obtenerAlertas
)

router.get(
  '/barcode/:codigo',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'recepcionista', 'facturador'),
  requiereInventario,
  obtenerProductoPorBarcode
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  obtenerProducto
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  editarProducto
)

router.post(
  '/:id/movimiento',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  registrarMovimiento
)

module.exports = router
