const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { registro, login, refresh, logout } = require('../controllers/authController')
const { validar } = require('../middlewares/validacionMiddleware')

router.post('/registro', [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La password debe tener mínimo 8 caracteres'),
  body('nit').optional().trim(),
  body('telefono').optional().trim(),
  body('ciudad').optional().trim(),
  body('departamento').optional().trim(),
  validar,
], registro)

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Password requerida'),
  validar,
], login)

router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  validar,
], refresh)

router.post('/logout', logout)

module.exports = router