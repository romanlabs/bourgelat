const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  obtenerPlanes,
} = require('../controllers/suscripcionController');

// Publico - cualquiera puede ver los planes
router.get('/planes', obtenerPlanes);

// Asignar y cancelar suscripciones ya no se expone por HTTP: eran las dos unicas
// rutas de escritura con poder sobre CUALQUIER clinica, alcanzables desde el
// login publico con una cuenta superadmin. Ahora se operan desde el servidor con
// `npm run suscripcion:asignar` y `npm run suscripcion:cancelar`
// (backend/src/scripts/gestionarSuscripcion.js).

// La clinica puede ver su propia suscripcion
router.get('/activa', verificarToken, verificarRol('admin'), obtenerSuscripcionActiva);
router.get('/historial', verificarToken, verificarRol('admin'), obtenerHistorialSuscripciones);

module.exports = router;