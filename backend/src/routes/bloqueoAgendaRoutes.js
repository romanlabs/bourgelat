const express = require('express')
const { body, param, query } = require('express-validator')

const {
  listarBloqueos,
  calcularImpacto,
  crearBloqueo,
  eliminarBloqueo,
} = require('../controllers/bloqueoAgendaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

// Toda la operacion necesita leer los bloqueos para pintar la agenda; solo la
// administracion puede crearlos o eliminarlos.
const rolesLectura = ['admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar']
const rolesEscritura = ['admin', 'superadmin']

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const validadoresRango = (campo) => [
  campo('fechaInicio').isISO8601().withMessage('Fecha de inicio no valida'),
  campo('fechaFin').optional({ nullable: true, values: 'falsy' }).isISO8601().withMessage('Fecha final no valida'),
  campo('horaInicio')
    .optional({ nullable: true, values: 'falsy' })
    .matches(HORA_REGEX)
    .withMessage('La hora de inicio debe tener el formato HH:MM'),
  campo('horaFin')
    .optional({ nullable: true, values: 'falsy' })
    .matches(HORA_REGEX)
    .withMessage('La hora de fin debe tener el formato HH:MM'),
]

router.get(
  '/',
  verificarToken,
  verificarRol(...rolesLectura),
  [
    query('desde').optional().isISO8601().withMessage('Fecha desde no valida'),
    query('hasta').optional().isISO8601().withMessage('Fecha hasta no valida'),
    validar,
  ],
  listarBloqueos
)

// Es una consulta, no una mutacion: devuelve las citas que quedarian afectadas
// por un bloqueo hipotetico, sin persistir nada.
router.get(
  '/impacto',
  verificarToken,
  verificarRol(...rolesEscritura),
  [...validadoresRango(query), validar],
  calcularImpacto
)

router.post(
  '/',
  verificarToken,
  verificarRol(...rolesEscritura),
  requerirEscritura,
  [
    ...validadoresRango(body),
    body('motivo').trim().notEmpty().withMessage('El motivo es obligatorio').isLength({ max: 200 }),
    body('cancelarCitas').optional().isBoolean(),
    validar,
  ],
  crearBloqueo
)

router.delete(
  '/:id',
  verificarToken,
  verificarRol(...rolesEscritura),
  requerirEscritura,
  [param('id').isUUID().withMessage('Bloqueo no valido'), validar],
  eliminarBloqueo
)

module.exports = router
