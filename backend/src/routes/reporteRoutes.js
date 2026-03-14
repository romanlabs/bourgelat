const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  reporteIngresos,
  reporteCitas,
  reporteInventario,
  dashboardGeneral,
} = require('../controllers/reporteController');

router.get('/dashboard', verificarToken, verificarRol('admin', 'superadmin'), dashboardGeneral);
router.get('/ingresos', verificarToken, verificarRol('admin', 'superadmin', 'facturador'), reporteIngresos);
router.get('/citas', verificarToken, verificarRol('admin', 'superadmin', 'veterinario'), reporteCitas);
router.get('/inventario', verificarToken, verificarRol('admin', 'superadmin', 'auxiliar'), reporteInventario);

module.exports = router;