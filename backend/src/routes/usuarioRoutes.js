const express = require('express')
const { body } = require('express-validator')

const {
  crearUsuario,
  reenviarInvitacion,
  obtenerUsuarios,
  obtenerEquipoAgenda,
  obtenerEquipoClinica,
  obtenerUsuario,
  editarUsuario,
  toggleUsuario,
  actualizarMiPerfil,
  subirFotoMiPerfil,
  guardarOnboarding,
} = require('../controllers/usuarioController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { uploadUsuarioFotoSingle } = require('../middlewares/uploadUsuarioFotoMiddleware')
const { normalizarTelefonoColombiano } = require('../utils/normalizar')

const router = express.Router()
const telefonoColombiaRegex = /^3\d{9}$/
const rolesValidos = ['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador']

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  [
    body('nombre')
      .trim()
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ min: 3, max: 120 })
      .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
    body('email').trim().isEmail().withMessage('Email invalido').normalizeEmail(),
    // La contraseña la define la persona invitada, nunca el administrador.
    body('password').not().exists().withMessage('La contraseña la crea la persona invitada desde su correo'),
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

// Auto-servicio del usuario autenticado (cualquier rol). Registradas antes de
// las rutas /:id para que "me" no se interprete como un id.
router.patch(
  '/me',
  verificarToken,
  requerirEscritura,
  [
    body('nombre')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacio')
      .isLength({ min: 3, max: 120 })
      .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
    body('telefono')
      .optional({ nullable: true })
      .custom((value) => !value || telefonoColombiaRegex.test(String(value).replace(/\D/g, '')))
      .withMessage('El celular laboral debe tener 10 digitos colombianos y comenzar por 3'),
    body('cargo').optional({ nullable: true }).trim().isLength({ max: 120 }),
    body('foto').optional({ nullable: true }).trim().isLength({ max: 500 }),
    body('tarjetaProfesional').optional({ nullable: true }).trim().isLength({ max: 60 }),
    validar,
  ],
  actualizarMiPerfil
)

router.post('/me/foto', verificarToken, requerirEscritura, uploadUsuarioFotoSingle, subirFotoMiPerfil)

router.patch(
  '/onboarding',
  verificarToken,
  requerirEscritura,
  [
    body('usoPlanificado').trim().notEmpty().withMessage('Selecciona una opción').isLength({ max: 60 }),
    body('cargo').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
    // El admin es el contacto de la clínica (cobro, soporte): su celular es obligatorio.
    body('whatsapp')
      .if((value, { req }) => Boolean(value) || req.usuario?.rol === 'admin')
      .custom((value) => telefonoColombiaRegex.test(normalizarTelefonoColombiano(value) || ''))
      .withMessage('El celular debe tener 10 dígitos colombianos y comenzar por 3'),
    body('tipoClinica').trim().notEmpty().withMessage('Selecciona el tipo de clínica').isLength({ max: 60 }),
    body('tamanoEquipo').trim().notEmpty().withMessage('Selecciona el tamaño del equipo').isLength({ max: 30 }),
    body('mascotasPorMes').trim().notEmpty().withMessage('Selecciona un rango').isLength({ max: 30 }),
    body('objetivoInicial').trim().notEmpty().withMessage('Selecciona tu objetivo inicial').isLength({ max: 60 }),
    body('gestionActual').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
    validar,
  ],
  guardarOnboarding
)

router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuarios)
router.get(
  '/equipo-agenda',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar'),
  obtenerEquipoAgenda
)
router.get(
  '/equipo-clinica',
  verificarToken,
  verificarRol('admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar'),
  obtenerEquipoClinica
)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuario)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
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

router.post(
  '/:id/reenviar-invitacion',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  reenviarInvitacion
)

router.patch(
  '/:id/toggle',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  toggleUsuario
)

module.exports = router
