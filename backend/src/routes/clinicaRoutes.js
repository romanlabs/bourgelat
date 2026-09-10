const express = require('express')
const { body } = require('express-validator')

const {
  obtenerClinicaActual,
  actualizarClinicaActual,
  actualizarHorarioAtencion,
  subirLogoClinica,
} = require('../controllers/clinicaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { uploadClinicaLogoSingle } = require('../middlewares/uploadClinicaLogoMiddleware')
const { esUrlDeUploadPropio, CLINICAS_SUBDIR } = require('../config/uploads')

const esUrlDeLogoPropia = (valor) => esUrlDeUploadPropio(valor, CLINICAS_SUBDIR)

const router = express.Router()

router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerClinicaActual)

// El logo se sube por su cuenta y no con el PUT del formulario: es multipart y
// necesita persistirse junto con el archivo para no dejar huerfanos en disco.
router.post(
  '/logo',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  uploadClinicaLogoSingle,
  subirLogoClinica
)

router.put(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
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
    // El logo ya no se escribe a mano: se sube por POST /logo. Aqui solo se
    // acepta vaciarlo ('' o null, de ahi el 'falsy') o recibir de vuelta la
    // misma URL que emitimos nosotros, para que reenviar la ficha completa sea
    // idempotente. Cualquier otro valor se rechaza: un isURL a secas no sirve
    // porque en desarrollo nuestra propia URL es http://localhost:3000/... y
    // los hosts sin TLD no lo pasan, mientras que aflojarlo con
    // require_tld:false llega a aceptar cualquier palabra suelta como host.
    body('logo')
      .optional({ values: 'falsy' })
      .trim()
      .custom(esUrlDeLogoPropia)
      .withMessage('El logo se actualiza subiendo la imagen, no escribiendo una URL'),
    validar,
  ],
  actualizarClinicaActual
)

// El horario se lee con GET / (viene dentro de la ficha de la clinica); aqui
// solo se guarda completo. La validacion fina de franjas vive en el servicio.
router.put(
  '/horario-atencion',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  [
    body('horarioAtencion')
      .exists()
      .withMessage('Debes enviar el horario de atencion')
      .custom((valor) => valor === null || (typeof valor === 'object' && !Array.isArray(valor)))
      .withMessage('El horario debe ser un objeto con los dias de la semana'),
    validar,
  ],
  actualizarHorarioAtencion
)

module.exports = router
