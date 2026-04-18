const express = require('express')
const { body } = require('express-validator')

const {
  crearUsuario,
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
} = require('../controllers/usuarioController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()
const passwordFuerteRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
const telefonoColombiaRegex = /^3\d{9}$/
const rolesValidos = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ min: 3, max: 120 })
      .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('password')
      .matches(passwordFuerteRegex)
      .withMessage(
        'La contrasena debe tener entre 8 y 72 caracteres e incluir mayuscula, minuscula, numero y caracter especial'
      ),
    body('rol').isIn(rolesValidos).withMessage('Rol no valido'),
    body('rolesAdicionales')
      .optional()
      .isArray({ max: 4 })
      .withMessage('Los roles adicionales deben enviarse como una lista'),
    body('rolesAdicionales.*').optional().isIn(rolesValidos).withMessage('Rol adicional no valido'),
    body('telefono')
      .optional({ checkFalsy: true })
      .custom((value) => telefonoColombiaRegex.test(String(value).replace(/\D/g, '')))
      .withMessage('El celular laboral debe tener 10 digitos colombianos y comenzar por 3'),
    validar,
  ],
  crearUsuario
)

router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuarios)
router.get(
  '/equipo-agenda',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'),
  obtenerEquipoAgenda
)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuario)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    body('nombre')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacio')
      .isLength({ min: 3, max: 120 })
      .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
    body('email').optional().trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    body('rol').optional().isIn(rolesValidos).withMessage('Rol no valido'),
    body('rolesAdicionales')
      .optional()
      .isArray({ max: 4 })
      .withMessage('Los roles adicionales deben enviarse como una lista'),
    body('rolesAdicionales.*').optional().isIn(rolesValidos).withMessage('Rol adicional no valido'),
    body('telefono')
      .optional({ nullable: true })
      .custom((value) => !value || telefonoColombiaRegex.test(String(value).replace(/\D/g, '')))
      .withMessage('El celular laboral debe tener 10 digitos colombianos y comenzar por 3'),
    validar,
  ],
  editarUsuario
)

router.patch('/:id/toggle', verificarToken, verificarRol('admin', 'superadmin'), toggleUsuario)

module.exports = router
