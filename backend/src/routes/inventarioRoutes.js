const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearProducto,
  obtenerProductos,
  obtenerProducto,
  editarProducto,
  registrarMovimiento,
  obtenerAlertas,
} = require('../controllers/inventarioController');

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar'), crearProducto);
router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'recepcionista'), obtenerProductos);
router.get('/alertas', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar'), obtenerAlertas);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'), obtenerProducto);
router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar'), editarProducto);
router.post('/:id/movimiento', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'), registrarMovimiento);

module.exports = router;