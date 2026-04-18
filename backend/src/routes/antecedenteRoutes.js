const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware');
const {
  obtenerOCrearAntecedentes,
  agregarAlergia,
  agregarCirugia,
  agregarVacuna,
  agregarCondicionCronica,
  actualizarGenerales,
} = require('../controllers/antecedenteController');

router.get('/:mascotaId', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), requerirFuncionalidades('antecedentes'), obtenerOCrearAntecedentes);
router.post('/:mascotaId/alergia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), agregarAlergia);
router.post('/:mascotaId/cirugia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), agregarCirugia);
router.post('/:mascotaId/vacuna', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), agregarVacuna);
router.post('/:mascotaId/condicion', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), agregarCondicionCronica);
router.put('/:mascotaId/generales', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), actualizarGenerales);

module.exports = router;
