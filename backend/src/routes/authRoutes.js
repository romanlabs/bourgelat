const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { registro, login, refresh, logout, logoutAll, me } = require('../controllers/authController')
const { verificarToken } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

router.post('/registro', [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La password debe tener mínimo 8 caracteres'),
  body('nit').optional().trim(),
  body('telefono').optional().trim(),
  body('ciudad').optional().trim(),
  body('departamento').optional().trim(),
  body('razonSocial').optional().trim(),
  body('nombreComercial').optional().trim(),
  body('tipoPersona').optional().isIn(['persona_natural', 'persona_juridica']).withMessage('Tipo de persona no vÃ¡lido'),
  body('digitoVerificacion').optional().trim(),
  body('codigoPostal').optional().trim(),
  body('municipioId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Municipio no vÃ¡lido'),
  body('tipoDocumentoFacturacionId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Tipo de documento fiscal no vÃ¡lido'),
  body('organizacionJuridicaId').optional().trim(),
  body('tributoId').optional().trim(),
  validar,
], registro)

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Password requerida'),
  validar,
], login)

router.post('/refresh', [
  body('refreshToken').optional().isString(),
  validar,
], refresh)

router.post('/logout', [
  body('refreshToken').optional().isString(),
  validar,
], logout)
router.post('/logout-all', verificarToken, logoutAll)
router.get('/me', verificarToken, me)

module.exports = router
