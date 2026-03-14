const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  crearSuscripcion,
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  cancelarSuscripcion,
  obtenerPlanes,
} = require('../controllers/suscripcionController');

// Publico - cualquiera puede ver los planes
router.get('/planes', obtenerPlanes);

// Solo superadmin puede crear y cancelar suscripciones
router.post('/', verificarToken, verificarRol('superadmin'), crearSuscripcion);
router.patch('/:id/cancelar', verificarToken, verificarRol('superadmin'), cancelarSuscripcion);

// La clinica puede ver su propia suscripcion
router.get('/activa', verificarToken, verificarRol('admin', 'superadmin'), obtenerSuscripcionActiva);
router.get('/historial', verificarToken, verificarRol('admin', 'superadmin'), obtenerHistorialSuscripciones);

module.exports = router;