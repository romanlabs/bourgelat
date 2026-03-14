const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearPropietario,
  obtenerPropietarios,
  obtenerPropietario,
  editarPropietario,
} = require('../controllers/propietarioController');

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), crearPropietario);
router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerPropietarios);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerPropietario);
router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), editarPropietario);

module.exports = router;