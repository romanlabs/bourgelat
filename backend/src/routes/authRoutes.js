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

const router = express.Router()
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const normalizarTelefonoColombiano = (valor) => {
  if (typeof valor !== 'string') return valor

  const soloNumeros = valor.replace(/\D/g, '')
  const sinPrefijo =
    soloNumeros.length > 10 && soloNumeros.startsWith('57')
      ? soloNumeros.slice(2)
      : soloNumeros

  return sinPrefijo.slice(0, 10)
}

router.post(
  '/registro',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre de la clinica es obligatorio'),
    body('nombreAdministrador')
      .trim()
      .notEmpty()
      .withMessage('El nombre del administrador es obligatorio'),
    body('departamento')
      .trim()
      .notEmpty()
      .withMessage('El departamento es obligatorio'),
    body('ciudad').trim().notEmpty().withMessage('La ciudad es obligatoria'),
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('emailClinica')
      .trim()
      .notEmpty()
      .withMessage('El email de la clinica es obligatorio')
      .bail()
      .isEmail()
      .withMessage('Email de la clinica invalido')
      .normalizeEmail(),
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial'
      ),
    body('nit').optional({ values: 'falsy' }).trim(),
    body('telefono')
      .trim()
      .notEmpty()
      .withMessage('El telefono de la clinica es obligatorio')
      .bail()
      .customSanitizer(normalizarTelefonoColombiano)
      .custom((valor) => /^3\d{9}$/.test(valor))
      .withMessage('El telefono debe ser un celular colombiano valido de 10 digitos'),
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
  [
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password').notEmpty().withMessage('Password requerida'),
    validar,
  ],
  login
)

router.post('/refresh', [validar], refresh)

router.post('/logout', [validar], logout)

router.post('/logout-all', verificarToken, logoutAll)
router.get('/me', verificarToken, me)

module.exports = router
