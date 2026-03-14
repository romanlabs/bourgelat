const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
} = require('../controllers/usuarioController');

// Solo admin puede gestionar usuarios
router.post('/', verificarToken, verificarRol('admin', 'superadmin'), crearUsuario);
router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuarios);
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuario);
router.put('/:id', verificarToken, verificarRol('admin', 'superadmin'), editarUsuario);
router.patch('/:id/toggle', verificarToken, verificarRol('admin', 'superadmin'), toggleUsuario);

module.exports = router;