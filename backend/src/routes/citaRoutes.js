const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearCita,
  obtenerCitas,
  obtenerCita,
  actualizarEstadoCita,
  reprogramarCita,
} = require('../controllers/citaController');

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), crearCita);
router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), obtenerCitas);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), obtenerCita);
router.patch('/:id/estado', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), actualizarEstadoCita);
router.patch('/:id/reprogramar', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista'), reprogramarCita);

module.exports = router;