const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearMascota, obtenerMascotas, obtenerMascota,
  editarMascota, desactivarMascota,
} = require('../controllers/mascotaController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('especie').isIn(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro']).withMessage('Especie no válida'),
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('sexo').optional().isIn(['macho', 'hembra', 'desconocido']).withMessage('Sexo no válido'),
  body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser un número positivo'),
  validar,
], crearMascota)

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerMascotas)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerMascota)

router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), [
  body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser un número positivo'),
  body('sexo').optional().isIn(['macho', 'hembra', 'desconocido']).withMessage('Sexo no válido'),
  validar,
], editarMascota)

router.patch('/:id/desactivar', verificarToken, verificarRol('admin', 'superadmin'), desactivarMascota)

module.exports = router