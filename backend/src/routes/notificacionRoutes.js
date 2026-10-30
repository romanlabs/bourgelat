const express = require('express')
const { body } = require('express-validator')

const {
  listarNotificaciones,
  marcarNotificacionesLeidas,
  actualizarAjustesAvisos,
  actualizarLeidasDerivadas,
} = require('../controllers/notificacionController')
const { CATEGORIAS } = require('../services/notificacionReglas')
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

// Qué categorías recibe y si quiere correo de lo urgente.
router.put(
  '/ajustes',
  verificarToken,
  verificarRol(...rolesClinica),
  requerirEscritura,
  [
    body('categoriasApagadas').optional().isArray({ max: CATEGORIAS.length }).withMessage('Categorías no validas'),
    body('categoriasApagadas.*').isIn(CATEGORIAS).withMessage('Categoría no valida'),
    body('correoUrgente').optional().isBoolean().withMessage('Valor no valido'),
    validar,
  ],
  actualizarAjustesAvisos
)

// Los avisos derivados que ya leyó (la lista completa de los vigentes).
router.put(
  '/derivadas-leidas',
  verificarToken,
  verificarRol(...rolesClinica),
  requerirEscritura,
  [
    body('ids').isArray({ max: 300 }).withMessage('Lista no valida'),
    body('ids.*').isString().isLength({ min: 1, max: 200 }).withMessage('Aviso no valido'),
    validar,
  ],
  actualizarLeidasDerivadas
)

module.exports = router
