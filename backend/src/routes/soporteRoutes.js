const express = require('express')
const { body, param, query } = require('express-validator')

const {
  listarTickets,
  obtenerTicket,
  crearTicket,
  agregarMensaje,
  cerrarTicket,
} = require('../controllers/soporteController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  limitadorCreacionTickets,
  limitadorMensajesSoporte,
} = require('../middlewares/rateLimitMiddleware')
const { uploadSoporteCapturaSingle } = require('../middlewares/uploadSoporteCapturaMiddleware')
const { ESTADOS, CATEGORIAS, PRIORIDADES } = require('../services/soporteReglas')

const router = express.Router()

// Rutas de la CLINICA. Las del equipo de Bourgelat viviran aparte, en
// soporteEquipoRoutes.js (/api/soporte-equipo), cuando exista el panel web.
//
// Sin `requerirEscritura` a proposito (archivo exento en escrituraGuard): una
// clinica con la suscripcion vencida queda en solo lectura, y justo ahi es
// cuando mas necesita poder pedir ayuda.
//
// Todo el equipo de la clinica puede abrir tickets. Cada quien ve los suyos y
// el admin ve todos los de la clinica (regla en services/soporteReglas.js).
const rolesClinica = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

router.get(
  '/tickets',
  verificarToken,
  verificarRol(...rolesClinica),
  [
    query('estado').optional().isIn([...ESTADOS, 'activos']).withMessage('Estado no valido'),
    query('pagina').optional().isInt({ min: 1 }).withMessage('Pagina no valida'),
    query('limite').optional().isInt({ min: 1, max: 50 }).withMessage('Limite no valido'),
    validar,
  ],
  listarTickets
)

router.get(
  '/tickets/:id',
  verificarToken,
  verificarRol(...rolesClinica),
  [param('id').isUUID().withMessage('Ticket no valido'), validar],
  obtenerTicket
)

router.post(
  '/tickets',
  verificarToken,
  verificarRol(...rolesClinica),
  limitadorCreacionTickets,
  uploadSoporteCapturaSingle,
  [
    body('asunto')
      .trim()
      .isLength({ min: 5, max: 150 })
      .withMessage('El asunto debe tener entre 5 y 150 caracteres'),
    body('descripcion')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Cuéntanos el problema en al menos 10 caracteres (máximo 5000)'),
    body('categoria').isIn(CATEGORIAS).withMessage('Categoria no valida'),
    body('prioridad').isIn(PRIORIDADES).withMessage('Prioridad no valida'),
    body('modulo')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 120 })
      .matches(/^\//)
      .withMessage('Modulo no valido'),
    body('contexto')
      .optional({ values: 'falsy' })
      .isString()
      .isLength({ max: 2000 })
      .withMessage('Contexto no valido'),
    validar,
  ],
  crearTicket
)

router.post(
  '/tickets/:id/mensajes',
  verificarToken,
  verificarRol(...rolesClinica),
  limitadorMensajesSoporte,
  [
    param('id').isUUID().withMessage('Ticket no valido'),
    body('mensaje')
      .trim()
      .isLength({ min: 2, max: 5000 })
      .withMessage('El mensaje debe tener entre 2 y 5000 caracteres'),
    validar,
  ],
  agregarMensaje
)

router.patch(
  '/tickets/:id/cerrar',
  verificarToken,
  verificarRol(...rolesClinica),
  [param('id').isUUID().withMessage('Ticket no valido'), validar],
  cerrarTicket
)

module.exports = router
