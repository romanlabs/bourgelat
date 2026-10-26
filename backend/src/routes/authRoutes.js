const express = require('express')
const { body } = require('express-validator')

const {
  registro,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword,
  verificarEmail,
  reenviarVerificacion,
  cambiarPassword,
  verificarCodigo,
  reenviarCodigo,
  consultarInvitacion,
  aceptarInvitacion,
  rechazarInvitacion,
} = require('../controllers/authController')
const {
  iniciar: oauthIniciar,
  callback: oauthCallback,
  completarRegistro: oauthCompletarRegistro,
} = require('../controllers/oauthController')
const { verificarToken } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { limitadorAuth, limitadorSesion } = require('../middlewares/rateLimitMiddleware')
const { exigirTurnstile } = require('../middlewares/turnstileMiddleware')
const { permitirOpenerEnPopupOauth } = require('../middlewares/oauthPopupMiddleware')
const { normalizarCelular, esCelularValido, MENSAJE_CELULAR_INVALIDO } = require('../utils/normalizar')

const router = express.Router()
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

// Consentimiento del registro. La casilla obligatoria debe llegar como
// booleano true: un valor por defecto o un string no cuentan como aceptación
// expresa. Tras la validación ambos campos quedan como booleanos.
const validarAceptacionesLegales = [
  body('aceptaTerminos')
    .custom((valor) => valor === true)
    .withMessage('Debes aceptar los terminos y autorizar el tratamiento de datos para crear la cuenta'),
  body('aceptaComunicaciones')
    .optional({ values: 'undefined' })
    .custom((valor) => typeof valor === 'boolean')
    .withMessage('Preferencia de comunicaciones no valida'),
]

router.post(
  '/registro',
  limitadorAuth,
  exigirTurnstile,
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
        'La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y carácter especial'
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
      .custom(esCelularValido)
      .withMessage(MENSAJE_CELULAR_INVALIDO)
      .customSanitizer(normalizarCelular),
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
    ...validarAceptacionesLegales,
    validar,
  ],
  registro
)

router.post(
  '/login',
  limitadorAuth,
  exigirTurnstile,
  [
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password').notEmpty().withMessage('Password requerida'),
    validar,
  ],
  login
)

router.post('/refresh', limitadorSesion, refresh)

router.post('/logout', limitadorSesion, logout)

router.post('/logout-all', verificarToken, logoutAll)
router.get('/me', verificarToken, me)

router.post(
  '/forgot-password',
  limitadorAuth,
  exigirTurnstile,
  [
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    validar,
  ],
  forgotPassword
)

router.post(
  '/reset-password',
  limitadorAuth,
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y carácter especial'
      ),
    validar,
  ],
  resetPassword
)

// Invitación de usuarios. Rutas públicas: el token de 256 bits es la
// credencial, y limitadorAuth frena a quien pruebe tokens al azar.
const validarTokenInvitacion = body('token')
  .isString()
  .withMessage('Token requerido')
  .bail()
  .isLength({ min: 20, max: 100 })
  .withMessage('Token requerido')

router.post('/invitacion/consultar', limitadorAuth, [validarTokenInvitacion, validar], consultarInvitacion)

router.post(
  '/invitacion/aceptar',
  limitadorAuth,
  [
    validarTokenInvitacion,
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y carácter especial'
      ),
    ...validarAceptacionesLegales,
    validar,
  ],
  aceptarInvitacion
)

router.post('/invitacion/rechazar', limitadorAuth, [validarTokenInvitacion, validar], rechazarInvitacion)

router.post(
  '/verify-email',
  limitadorAuth,
  [
    body('token').notEmpty().withMessage('Token requerido'),
    validar,
  ],
  verificarEmail
)

router.post(
  '/resend-verification',
  limitadorAuth,
  [
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    validar,
  ],
  reenviarVerificacion
)

// El email es opcional e informativo: la cuenta sale de la cookie de pendiente.
router.post(
  '/verificar-codigo',
  limitadorAuth,
  [
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('codigo').trim().matches(/^\d{6}$/).withMessage('El código debe tener 6 dígitos'),
    validar,
  ],
  verificarCodigo
)

router.post(
  '/reenviar-codigo',
  limitadorAuth,
  exigirTurnstile,
  [
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    validar,
  ],
  reenviarCodigo
)

router.post(
  '/cambiar-password',
  limitadorAuth,
  verificarToken,
  [
    body('passwordActual').notEmpty().withMessage('La contrasena actual es requerida'),
    body('passwordNueva')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contraseña debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y carácter especial'
      ),
    validar,
  ],
  cambiarPassword
)

router.get('/oauth/:proveedor', limitadorAuth, permitirOpenerEnPopupOauth, oauthIniciar)
router.get('/oauth/:proveedor/callback', limitadorAuth, permitirOpenerEnPopupOauth, oauthCallback)

router.post(
  '/oauth/completar-registro',
  limitadorAuth,
  [
    body('token').notEmpty().withMessage('Token requerido'),
    body('nombreClinica').trim().notEmpty().isLength({ max: 160 }).withMessage('El nombre de la clinica es obligatorio'),
    ...validarAceptacionesLegales,
    validar,
  ],
  oauthCompletarRegistro
)

module.exports = router
