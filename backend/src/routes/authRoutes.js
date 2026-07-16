const express = require('express')
const { body } = require('express-validator')

const {
  registro,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} = require('../controllers/authController')
const { verificarToken } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { limitadorAuth } = require('../middlewares/rateLimitMiddleware')
const { normalizarTelefonoColombiano } = require('../utils/normalizar')

const router = express.Router()
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

router.post(
  '/registro',
  limitadorAuth,
  [
    body('nombre').trim().notEmpty().withMessage('El nombre de la clinica es obligatorio'),
    body('nombreAdministrador')
      .trim()
      .notEmpty()
      .withMessage('El nombre del administrador es obligatorio'),
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial'
      ),
    body('emailClinica')
      .optional({ values: 'falsy' })
      .trim()
      .isEmail()
      .withMessage('Email de la clinica invalido')
      .normalizeEmail(),
    body('telefono')
      .optional({ values: 'falsy' })
      .trim()
      .customSanitizer(normalizarTelefonoColombiano)
      .custom((valor) => /^3\d{9}$/.test(valor))
      .withMessage('El telefono debe ser un celular colombiano valido de 10 digitos'),
    body('departamento').optional({ values: 'falsy' }).trim(),
    body('ciudad').optional({ values: 'falsy' }).trim(),
    body('nit').optional({ values: 'falsy' }).trim(),
    body('direccion').optional({ values: 'falsy' }).trim(),
    body('razonSocial').optional({ values: 'falsy' }).trim(),
    body('nombreComercial').optional({ values: 'falsy' }).trim(),
    body('tipoPersona')
      .optional({ values: 'falsy' })
      .isIn(['persona_natural', 'persona_juridica'])
      .withMessage('Tipo de persona no valido'),
    body('digitoVerificacion').optional({ values: 'falsy' }).trim(),
    body('codigoPostal').optional({ values: 'falsy' }).trim(),
    body('municipioId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Municipio no valido'),
    body('tipoDocumentoFacturacionId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Tipo de documento fiscal no valido'),
    body('organizacionJuridicaId').optional({ values: 'falsy' }).trim(),
    body('tributoId').optional({ values: 'falsy' }).trim(),
    validar,
  ],
  registro
)

router.post(
  '/login',
  limitadorAuth,
  [
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password').notEmpty().withMessage('Password requerida'),
    validar,
  ],
  login
)

router.post('/refresh', limitadorAuth, refresh)

router.post('/logout', limitadorAuth, logout)

router.post('/logout-all', verificarToken, logoutAll)
router.get('/me', verificarToken, me)

module.exports = router
