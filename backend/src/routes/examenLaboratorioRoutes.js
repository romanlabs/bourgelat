const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { validar } = require('../middlewares/validacionMiddleware');
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware');
const { uploadExamenArchivoSingle } = require('../middlewares/uploadExamenArchivoMiddleware');
const { isValidDateOnly } = require('../utils/dateOnly');
const {
  listarExamenes,
  crearExamen,
  editarExamen,
  eliminarExamen,
} = require('../controllers/examenLaboratorioController');

const validateDateOnly = (value) => {
  if (!isValidDateOnly(value)) {
    throw new Error('La fecha no es valida');
  }
  return true;
};

const validarCrearExamen = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('tipo')
    .trim()
    .notEmpty()
    .withMessage('El tipo de examen es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El tipo no puede exceder 180 caracteres'),
  body('fecha').notEmpty().withMessage('La fecha es obligatoria').custom(validateDateOnly),
  body('resultados')
    .trim()
    .notEmpty()
    .withMessage('Los resultados son obligatorios')
    .isLength({ max: 5000 })
    .withMessage('Los resultados no pueden exceder 5000 caracteres'),
  body('interpretacion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La interpretacion no puede exceder 2000 caracteres'),
  body('laboratorio')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 })
    .withMessage('El laboratorio no puede exceder 180 caracteres'),
  validar,
];

const validarEditarExamen = [
  param('id').isUUID().withMessage('Examen no valido'),
  body('tipo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 })
    .withMessage('El tipo no puede exceder 180 caracteres'),
  body('fecha').optional({ values: 'falsy' }).custom(validateDateOnly),
  body('resultados')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Los resultados no pueden exceder 5000 caracteres'),
  body('interpretacion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La interpretacion no puede exceder 2000 caracteres'),
  body('laboratorio')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 })
    .withMessage('El laboratorio no puede exceder 180 caracteres'),
  validar,
];

router.get(
  '/:mascotaId',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar', 'recepcionista'),
  requerirFuncionalidades('historias'),
  [param('mascotaId').isUUID().withMessage('Mascota no valida'), validar],
  listarExamenes
);

router.post(
  '/:mascotaId',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar', 'recepcionista'),
  requerirFuncionalidades('historias'),
  uploadExamenArchivoSingle,
  validarCrearExamen,
  crearExamen
);

router.put(
  '/:id',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar', 'recepcionista'),
  requerirFuncionalidades('historias'),
  uploadExamenArchivoSingle,
  validarEditarExamen,
  editarExamen
);

router.delete(
  '/:id',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin'),
  requerirFuncionalidades('historias'),
  [param('id').isUUID().withMessage('Examen no valido'), validar],
  eliminarExamen
);

module.exports = router;
