const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  obtenerOCrearAntecedentes,
  agregarAlergia,
  agregarCirugia,
  agregarVacuna,
  agregarCondicionCronica,
  actualizarGenerales,
} = require('../controllers/antecedenteController');

router.get('/:mascotaId', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), obtenerOCrearAntecedentes);
router.post('/:mascotaId/alergia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), agregarAlergia);
router.post('/:mascotaId/cirugia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), agregarCirugia);
router.post('/:mascotaId/vacuna', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), agregarVacuna);
router.post('/:mascotaId/condicion', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), agregarCondicionCronica);
router.put('/:mascotaId/generales', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), actualizarGenerales);

module.exports = router;