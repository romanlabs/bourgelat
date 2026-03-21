const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearHistoria, obtenerHistoriasMascota, obtenerHistoria,
  editarHistoria, bloquearHistoria,
} = require('../controllers/historiaClinicaController')

router.post('/', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), [
  body('motivoConsulta').notEmpty().withMessage('El motivo de consulta es obligatorio').trim(),
  body('diagnostico').notEmpty().withMessage('El diagnóstico es obligatorio').trim(),
  body('tratamiento').notEmpty().withMessage('El tratamiento es obligatorio').trim(),
  body('mascotaId').isUUID().withMessage('Mascota no válida'),
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('veterinarioId').isUUID().withMessage('Veterinario no válido'),
  body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser positivo'),
  body('temperatura').optional().isFloat({ min: 30, max: 45 }).withMessage('Temperatura no válida'),
  body('frecuenciaCardiaca').optional().isInt({ min: 0 }).withMessage('Frecuencia cardíaca no válida'),
  body('condicionCorporal').optional().isInt({ min: 1, max: 5 }).withMessage('Condición corporal debe ser entre 1 y 5'),
  validar,
], crearHistoria)

router.get('/mascota/:mascotaId', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), obtenerHistoriasMascota)
router.get('/:id', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), obtenerHistoria)

router.put('/:id', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), [
  body('diagnostico').optional().notEmpty().withMessage('El diagnóstico no puede estar vacío').trim(),
  body('tratamiento').optional().notEmpty().withMessage('El tratamiento no puede estar vacío').trim(),
  body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser positivo'),
  body('temperatura').optional().isFloat({ min: 30, max: 45 }).withMessage('Temperatura no válida'),
  validar,
], editarHistoria)

router.patch('/:id/bloquear', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), bloquearHistoria)

module.exports = router