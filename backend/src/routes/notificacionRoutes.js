const express = require('express')
const { body } = require('express-validator')

const { listarNotificaciones, marcarNotificacionesLeidas } = require('../controllers/notificacionController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

// Todo el equipo de la clínica tiene campanita.
const rolesClinica = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

router.get('/', verificarToken, verificarRol(...rolesClinica), listarNotificaciones)

// Sin `ids` marca todas las del usuario. Con la suscripción vencida (solo
// lectura) no se marca: el frontend lo ignora y el aviso sigue sin leer.
router.patch(
  '/leidas',
  verificarToken,
  verificarRol(...rolesClinica),
  requerirEscritura,
  [
    body('ids').optional().isArray({ max: 100 }).withMessage('Lista no valida'),
    body('ids.*').isUUID().withMessage('Aviso no valido'),
    validar,
  ],
  marcarNotificacionesLeidas
)

module.exports = router
