const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { validar } = require('../middlewares/validacionMiddleware');
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware');
const { isValidDateOnly } = require('../utils/dateOnly');
const {
  obtenerOCrearAntecedentes,
  agregarAlergia,
  agregarCirugia,
  agregarVacuna,
  agregarCondicionCronica,
  actualizarGenerales,
} = require('../controllers/antecedenteController');

const validateDateOnly = (value) => {
  if (!value) return true;
  if (!isValidDateOnly(value)) {
    throw new Error('La fecha no es valida');
  }
  return true;
};

const validarMascotaId = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  validar,
];

const validarAlergia = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('tipo')
    .trim()
    .notEmpty()
    .withMessage('El tipo de alergia es obligatorio')
    .isLength({ max: 120 })
    .withMessage('El tipo no puede exceder 120 caracteres'),
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripcion es obligatoria')
    .isLength({ max: 400 })
    .withMessage('La descripcion no puede exceder 400 caracteres'),
  body('reaccion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 280 })
    .withMessage('La reaccion no puede exceder 280 caracteres'),
  body('fecha').optional({ values: 'falsy' }).custom(validateDateOnly),
  validar,
];

const validarCirugia = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la cirugia es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El nombre no puede exceder 180 caracteres'),
  body('fecha').notEmpty().withMessage('La fecha es obligatoria').custom(validateDateOnly),
  body('veterinario')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 })
    .withMessage('El profesional no puede exceder 180 caracteres'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 600 })
    .withMessage('Las observaciones no pueden exceder 600 caracteres'),
  validar,
];

const validarVacuna = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la vacuna es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El nombre no puede exceder 180 caracteres'),
  body('fecha').notEmpty().withMessage('La fecha es obligatoria').custom(validateDateOnly),
  body('proximaDosis').optional({ values: 'falsy' }).custom(validateDateOnly),
  body('lote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('El lote no puede exceder 120 caracteres'),
  body('laboratorio')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 180 })
    .withMessage('El laboratorio no puede exceder 180 caracteres'),
  validar,
];

const validarCondicion = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la condicion es obligatorio')
    .isLength({ max: 180 })
    .withMessage('El nombre no puede exceder 180 caracteres'),
  body('fechaDiagnostico').optional({ values: 'falsy' }).custom(validateDateOnly),
  body('tratamientoActual')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 600 })
    .withMessage('El tratamiento actual no puede exceder 600 caracteres'),
  validar,
];

const validateMedicamentosActuales = (value) => {
  if (value === undefined || value === null) return true;

  if (!Array.isArray(value)) {
    throw new Error('Los medicamentos actuales deben enviarse como una lista');
  }

  if (value.length > 30) {
    throw new Error('No se admiten mas de 30 medicamentos actuales');
  }

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Cada medicamento actual debe ser un objeto valido');
    }

    if (!String(item.nombre || '').trim()) {
      throw new Error('Cada medicamento actual debe incluir el nombre');
    }

    if (String(item.nombre).trim().length > 180) {
      throw new Error('El nombre del medicamento actual no puede exceder 180 caracteres');
    }
  }

  return true;
};

const validarGenerales = [
  param('mascotaId').isUUID().withMessage('Mascota no valida'),
  body('esterilizado').optional().isBoolean().withMessage('esterilizado debe ser booleano'),
  body('fechaEsterilizacion').optional({ values: 'falsy' }).custom(validateDateOnly),
  body('observacionesGenerales')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Las observaciones generales no pueden exceder 2000 caracteres'),
  body('medicamentosActuales').optional().custom(validateMedicamentosActuales),
  validar,
];

router.get('/:mascotaId', verificarToken, verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'), requerirFuncionalidades('antecedentes'), validarMascotaId, obtenerOCrearAntecedentes);
router.post('/:mascotaId/alergia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), validarAlergia, agregarAlergia);
router.post('/:mascotaId/cirugia', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), validarCirugia, agregarCirugia);
router.post('/:mascotaId/vacuna', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), validarVacuna, agregarVacuna);
router.post('/:mascotaId/condicion', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), validarCondicion, agregarCondicionCronica);
router.put('/:mascotaId/generales', verificarToken, verificarRol('veterinario', 'admin', 'superadmin'), requerirFuncionalidades('antecedentes'), validarGenerales, actualizarGenerales);

module.exports = router;
