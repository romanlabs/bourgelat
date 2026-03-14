const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearFactura,
  obtenerFacturas,
  obtenerFactura,
  anularFactura,
} = require('../controllers/facturaController');

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), crearFactura);
router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), obtenerFacturas);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), obtenerFactura);
router.patch('/:id/anular', verificarToken, verificarRol('admin', 'superadmin'), anularFactura);

module.exports = router;