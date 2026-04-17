const express = require('express')
const router = express.Router()
const { body, param, query } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')
const { formatDateOnlyLocal, isValidDateOnly } = require('../utils/dateOnly')
const {
  obtenerHistorias,
  crearHistoria,
  obtenerHistoriasMascota,
  obtenerHistoria,
  editarHistoria,
  bloquearHistoria,
} = require('../controllers/historiaClinicaController')

const HYDRATION_STATES = [
  'normal',
  'deshidratacion_leve',
  'deshidratacion_moderada',
  'deshidratacion_severa',
]

const MEDICATION_ROUTES = [
  'oral',
  'subcutanea',
  'intramuscular',
  'intravenosa',
  'topica',
  'otica',
  'oftalmica',
  'inhalada',
  'rectal',
  'transdermica',
  'otra',
]

const hasMedicationValue = (item = {}) =>
  ['nombre', 'productoId', 'concentracion', 'dosis', 'via', 'frecuencia', 'duracion', 'cantidad', 'indicacion']
    .some((field) => String(item[field] || '').trim().length > 0)

const validateFollowUpDate = (value) => {
  if (!value) return true

  if (!isValidDateOnly(value)) {
    throw new Error('La fecha de control no es valida')
  }

  if (value < formatDateOnlyLocal()) {
    throw new Error('La proxima consulta no puede quedar en una fecha pasada')
  }

  return true
}

const validateMedications = (value) => {
  if (value === undefined || value === null) return true

  if (!Array.isArray(value)) {
    throw new Error('Los medicamentos deben enviarse como una lista')
  }

  if (value.length > 20) {
    throw new Error('No se admiten mas de 20 medicamentos por historia')
  }

  for (const item of value) {
    if (typeof item === 'string') {
      if (String(item).trim().length > 240) {
        throw new Error('El nombre del medicamento no puede exceder 240 caracteres')
      }
      continue
    }

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Cada medicamento debe ser un objeto valido')
    }

    if (!hasMedicationValue(item)) {
      continue
    }

    if (!String(item.nombre || '').trim()) {
      throw new Error('Cada medicamento diligenciado debe incluir el nombre del producto')
    }

    if (item.productoId && !/^[0-9a-fA-F-]{36}$/.test(String(item.productoId))) {
      throw new Error('El producto vinculado a inventario no es valido')
    }

    if (item.via && !MEDICATION_ROUTES.includes(item.via)) {
      throw new Error('La via de administracion de un medicamento no es valida')
    }

    if (
      item.cantidad !== undefined &&
      item.cantidad !== null &&
      item.cantidad !== '' &&
      (!Number.isFinite(Number(item.cantidad)) || Number(item.cantidad) < 0)
    ) {
      throw new Error('La cantidad dispensada de un medicamento no es valida')
    }

    const textFields = ['nombre', 'concentracion', 'dosis', 'frecuencia', 'duracion', 'indicacion']
    for (const field of textFields) {
      if (item[field] !== undefined && String(item[field]).trim().length > 240) {
        throw new Error('Los campos del medicamento no pueden exceder 240 caracteres')
      }
    }
  }

  return true
}

router.get(
  '/',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'),
  requerirFuncionalidades('historias'),
  [
    query('mascotaId').optional().isUUID().withMessage('Mascota no valida'),
    query('veterinarioId').optional().isUUID().withMessage('Veterinario no valido'),
    query('bloqueada').optional().isIn(['true', 'false']).withMessage('bloqueada debe ser true o false'),
    query('fechaInicio').optional().custom(validateFollowUpDate),
    query('fechaFin').optional().custom((value) => {
      if (!value) return true
      if (!isValidDateOnly(value)) {
        throw new Error('La fecha final no es valida')
      }
      return true
    }),
    query('pagina').optional().isInt({ min: 1 }).withMessage('La pagina debe ser un entero mayor a 0'),
    query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('El limite debe ser un entero entre 1 y 100'),
    validar,
  ],
  obtenerHistorias
)

router.post(
  '/',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin'),
  requerirFuncionalidades('historias'),
  [
    body('motivoConsulta').notEmpty().withMessage('El motivo de consulta es obligatorio').trim(),
    body('diagnostico').notEmpty().withMessage('El diagnostico es obligatorio').trim(),
    body('tratamiento').notEmpty().withMessage('El tratamiento es obligatorio').trim(),
    body('mascotaId').isUUID().withMessage('Mascota no valida'),
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('veterinarioId').isUUID().withMessage('Veterinario no valido'),
    body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser positivo'),
    body('temperatura')
      .optional()
      .isFloat({ min: 30, max: 45 })
      .withMessage('Temperatura no valida'),
    body('frecuenciaCardiaca')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Frecuencia cardiaca no valida'),
    body('frecuenciaRespiratoria')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Frecuencia respiratoria no valida'),
    body('condicionCorporal')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Condicion corporal debe ser entre 1 y 5'),
    body('estadoHidratacion')
      .optional()
      .isIn(HYDRATION_STATES)
      .withMessage('Estado de hidratacion no valido'),
    body('proximaConsulta').optional().custom(validateFollowUpDate),
    body('medicamentos').optional().custom(validateMedications),
    validar,
  ],
  crearHistoria
)

router.get(
  '/mascota/:mascotaId',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'),
  requerirFuncionalidades('historias'),
  [
    param('mascotaId').isUUID().withMessage('Mascota no valida'),
    validar,
  ],
  obtenerHistoriasMascota
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin', 'auxiliar'),
  requerirFuncionalidades('historias'),
  [
    param('id').isUUID().withMessage('Historia clinica no valida'),
    validar,
  ],
  obtenerHistoria
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin'),
  requerirFuncionalidades('historias'),
  [
    param('id').isUUID().withMessage('Historia clinica no valida'),
    body('motivoConsulta')
      .optional()
      .notEmpty()
      .withMessage('El motivo de consulta no puede estar vacio')
      .trim(),
    body('diagnostico').optional().notEmpty().withMessage('El diagnostico no puede estar vacio').trim(),
    body('tratamiento').optional().notEmpty().withMessage('El tratamiento no puede estar vacio').trim(),
    body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser positivo'),
    body('temperatura')
      .optional()
      .isFloat({ min: 30, max: 45 })
      .withMessage('Temperatura no valida'),
    body('frecuenciaCardiaca')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Frecuencia cardiaca no valida'),
    body('frecuenciaRespiratoria')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Frecuencia respiratoria no valida'),
    body('condicionCorporal')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Condicion corporal debe ser entre 1 y 5'),
    body('estadoHidratacion')
      .optional()
      .isIn(HYDRATION_STATES)
      .withMessage('Estado de hidratacion no valido'),
    body('proximaConsulta').optional().custom(validateFollowUpDate),
    body('medicamentos').optional().custom(validateMedications),
    validar,
  ],
  editarHistoria
)

router.patch(
  '/:id/bloquear',
  verificarToken,
  verificarRol('veterinario', 'admin', 'superadmin'),
  requerirFuncionalidades('historias'),
  [
    param('id').isUUID().withMessage('Historia clinica no valida'),
    validar,
  ],
  bloquearHistoria
)

module.exports = router
