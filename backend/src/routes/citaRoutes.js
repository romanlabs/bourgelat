const express = require('express')
const router = express.Router()
const { body, query } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearCita, crearWalkIn,
  obtenerCitas, obtenerCita, obtenerSalaEspera, obtenerDisponibilidadVeterinarios,
  actualizarEstadoCita, reprogramarCita,
} = require('../controllers/citaController')

const TIPOS_CITA = [
  'consulta_general', 'vacunacion', 'cirugia', 'desparasitacion',
  'control', 'urgencia', 'peluqueria', 'laboratorio', 'radiografia', 'otro',
]

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

// El horario de atencion compara horas como texto, asi que el formato HH:MM
// tiene que estar garantizado antes de llegar al controlador.
const validadoresHorario = [
  body('horaInicio')
    .notEmpty().withMessage('La hora de inicio es obligatoria')
    .bail()
    .matches(HORA_REGEX).withMessage('La hora de inicio debe tener el formato HH:MM'),
  body('horaFin')
    .notEmpty().withMessage('La hora de fin es obligatoria')
    .bail()
    .matches(HORA_REGEX).withMessage('La hora de fin debe tener el formato HH:MM'),
  body('forzarFueraDeHorario').optional().isBoolean(),
]

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), requerirEscritura, [
  body('fecha').isDate().withMessage('Fecha no válida'),
  ...validadoresHorario,
  body('motivo').notEmpty().withMessage('El motivo es obligatorio').trim(),
  body('mascotaId').isUUID().withMessage('Mascota no válida'),
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('veterinarioId').isUUID().withMessage('Veterinario no válido'),
  body('consultorioId').optional().isUUID().withMessage('Consultorio no válido'),
  body('tipoCita').optional().isIn(TIPOS_CITA).withMessage('Tipo de cita no válido'),
  validar,
], crearCita)

router.post('/walk-in', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), requerirEscritura, [
  body('motivo').notEmpty().withMessage('El motivo es obligatorio').trim(),
  body('mascotaId').isUUID().withMessage('Mascota no válida'),
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('veterinarioId').isUUID().withMessage('Veterinario no válido'),
  body('consultorioId').optional().isUUID().withMessage('Consultorio no válido'),
  body('tipoCita').optional().isIn(TIPOS_CITA).withMessage('Tipo de cita no válido'),
  validar,
], crearWalkIn)

// Rutas fijas antes de '/:id' — de lo contrario el parametro las captura.
router.get('/sala-espera', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), [
  query('fecha').optional().isDate().withMessage('fecha debe ser una fecha válida (YYYY-MM-DD)'),
  validar,
], obtenerSalaEspera)

router.get('/disponibilidad-veterinarios', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), [
  query('fecha').optional().isDate().withMessage('fecha debe ser una fecha válida (YYYY-MM-DD)'),
  validar,
], obtenerDisponibilidadVeterinarios)

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), [
  query('fechaDesde').optional().isDate().withMessage('fechaDesde debe ser una fecha válida (YYYY-MM-DD)'),
  query('fechaHasta').optional().isDate().withMessage('fechaHasta debe ser una fecha válida (YYYY-MM-DD)'),
  validar,
], obtenerCitas)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), obtenerCita)

router.patch('/:id/estado', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), requerirEscritura, [
  body('estado').isIn(['programada', 'en_espera', 'en_atencion', 'completada', 'cancelada', 'no_asistio'])
    .withMessage('Estado no válido'),
  body('motivoCancelacion').if(body('estado').equals('cancelada'))
    .notEmpty().withMessage('El motivo de cancelación es obligatorio'),
  validar,
], actualizarEstadoCita)

router.patch('/:id/reprogramar', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista'), requerirEscritura, [
  body('fecha').isDate().withMessage('Fecha no válida'),
  ...validadoresHorario,
  validar,
], reprogramarCita)

module.exports = router
