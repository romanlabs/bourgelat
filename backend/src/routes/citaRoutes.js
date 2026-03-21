const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearCita, obtenerCitas, obtenerCita,
  actualizarEstadoCita, reprogramarCita,
} = require('../controllers/citaController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), [
  body('fecha').isDate().withMessage('Fecha no válida'),
  body('horaInicio').notEmpty().withMessage('La hora de inicio es obligatoria'),
  body('horaFin').notEmpty().withMessage('La hora de fin es obligatoria'),
  body('motivo').notEmpty().withMessage('El motivo es obligatorio').trim(),
  body('mascotaId').isUUID().withMessage('Mascota no válida'),
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('veterinarioId').isUUID().withMessage('Veterinario no válido'),
  body('tipoCita').optional().isIn([
    'consulta_general', 'vacunacion', 'cirugia', 'desparasitacion',
    'control', 'urgencia', 'peluqueria', 'laboratorio', 'radiografia', 'otro',
  ]).withMessage('Tipo de cita no válido'),
  validar,
], crearCita)

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), obtenerCitas)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'), obtenerCita)

router.patch('/:id/estado', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario'), [
  body('estado').isIn(['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'])
    .withMessage('Estado no válido'),
  body('motivoCancelacion').if(body('estado').equals('cancelada'))
    .notEmpty().withMessage('El motivo de cancelación es obligatorio'),
  validar,
], actualizarEstadoCita)

router.patch('/:id/reprogramar', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista'), [
  body('fecha').isDate().withMessage('Fecha no válida'),
  body('horaInicio').notEmpty().withMessage('La hora de inicio es obligatoria'),
  body('horaFin').notEmpty().withMessage('La hora de fin es obligatoria'),
  validar,
], reprogramarCita)

module.exports = router