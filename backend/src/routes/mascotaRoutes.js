const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearMascota,
  obtenerMascotas,
  obtenerMascota,
  editarMascota,
  desactivarMascota,
} = require('../controllers/mascotaController');

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), crearMascota);
router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerMascotas);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerMascota);
router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), editarMascota);
router.patch('/:id/desactivar', verificarToken, verificarRol('admin', 'superadmin'), desactivarMascota);

module.exports = router;