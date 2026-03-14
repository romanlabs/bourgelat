const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearHistoria,
  obtenerHistoriasMascota,
  obtenerHistoria,
  editarHistoria,
  bloquearHistoria,
} = require('../controllers/historiaClinicaController');

// Solo veterinarios y admin pueden gestionar historias clinicas
router.post('/', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), crearHistoria);
router.get('/mascota/:mascotaId', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), obtenerHistoriasMascota);
router.get('/:id', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), obtenerHistoria);
router.put('/:id', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), editarHistoria);
router.patch('/:id/bloquear', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), bloquearHistoria);

module.exports = router;