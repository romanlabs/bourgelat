const express = require('express')
const { body } = require('express-validator')

const {
  obtenerClinicaActual,
  actualizarClinicaActual,
} = require('../controllers/clinicaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerClinicaActual)

router.put(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    body('nombre')
      .optional()
      .trim()
      .isLength({ min: 3, max: 160 })
      .withMessage('El nombre institucional debe tener entre 3 y 160 caracteres'),
    body('email').optional().trim().isEmail().withMessage('Email institucional invalido').normalizeEmail(),
    body('telefono')
      .optional({ nullable: true })
      .custom((valor) => !valor || /^3\d{9}$/.test(String(valor).replace(/\D/g, '').slice(-10)))
      .withMessage('El telefono debe ser un celular colombiano valido de 10 digitos'),
    body('direccion').optional({ nullable: true }).trim().isLength({ max: 200 }),
    body('ciudad').optional({ nullable: true }).trim().isLength({ max: 120 }),
    body('departamento').optional({ nullable: true }).trim().isLength({ max: 120 }),
    body('nit').optional({ nullable: true }).trim().isLength({ min: 6, max: 20 }),
    body('razonSocial').optional({ nullable: true }).trim().isLength({ max: 160 }),
    body('nombreComercial').optional({ nullable: true }).trim().isLength({ max: 160 }),
    body('tipoPersona')
      .optional({ nullable: true })
      .isIn(['persona_natural', 'persona_juridica'])
      .withMessage('Tipo de persona no valido'),
    body('digitoVerificacion').optional({ nullable: true }).trim().isLength({ max: 2 }),
    body('codigoPostal').optional({ nullable: true }).trim().isLength({ max: 12 }),
    body('municipioId')
      .optional({ nullable: true })
      .custom((valor) => valor === '' || valor === null || Number.isInteger(Number(valor)))
      .withMessage('Municipio no valido'),
    body('tipoDocumentoFacturacionId')
      .optional({ nullable: true })
      .custom((valor) => valor === '' || valor === null || Number.isInteger(Number(valor)))
      .withMessage('Tipo de documento fiscal no valido'),
    body('organizacionJuridicaId').optional({ nullable: true }).trim().isLength({ max: 20 }),
    body('tributoId').optional({ nullable: true }).trim().isLength({ max: 20 }),
    body('logo').optional({ nullable: true }).trim().isURL().withMessage('Logo debe ser una URL valida'),
    validar,
  ],
  actualizarClinicaActual
)

module.exports = router
