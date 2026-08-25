const express = require('express')
const router = express.Router()
const { body, param } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { isValidDateOnly } = require('../utils/dateOnly')
const {
  crearRegistroEstilo,
  obtenerRegistrosEstiloMascota,
  obtenerRegistroEstilo,
  editarRegistroEstilo,
  obtenerPreliquidacionEstilo,
} = require('../controllers/registroEstiloController')

// Estilos lo maneja todo el equipo de atencion: en clinicas de una persona
// el mismo usuario agenda, peluquea y cobra.
const ROLES_ESTILOS = ['admin', 'superadmin', 'veterinario', 'recepcionista', 'auxiliar']

const validarFechaSugerida = (value) => {
  if (value === undefined || value === null || value === '') return true
  if (!isValidDateOnly(value)) {
    throw new Error('La fecha de proxima cita sugerida no es valida')
  }
  return true
}

router.post(
  '/',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  requerirEscritura,
  [
    body('tipoCorte').notEmpty().withMessage('El tipo de corte es obligatorio').trim(),
    body('mascotaId').isUUID().withMessage('Mascota no valida'),
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('estilistaId').isUUID().withMessage('Estilista no valido'),
    body('citaId').optional().isUUID().withMessage('Cita no valida'),
    body('fechaServicio').optional().isISO8601().withMessage('Fecha de servicio no valida'),
    body('proximaCitaSugerida').optional().custom(validarFechaSugerida),
    validar,
  ],
  crearRegistroEstilo
)

router.get(
  '/mascota/:mascotaId',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  [
    param('mascotaId').isUUID().withMessage('Mascota no valida'),
    validar,
  ],
  obtenerRegistrosEstiloMascota
)

router.get(
  '/:id/preliquidacion',
  verificarToken,
  verificarRol(...ROLES_ESTILOS, 'facturador'),
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    validar,
  ],
  obtenerPreliquidacionEstilo
)

router.get(
  '/:id',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    validar,
  ],
  obtenerRegistroEstilo
)

router.put(
  '/:id',
  verificarToken,
  verificarRol(...ROLES_ESTILOS),
  requerirEscritura,
  [
    param('id').isUUID().withMessage('Registro de estilos no valido'),
    body('tipoCorte').optional().notEmpty().withMessage('El tipo de corte no puede estar vacio').trim(),
    body('estilistaId').optional().isUUID().withMessage('Estilista no valido'),
    body('proximaCitaSugerida').optional().custom(validarFechaSugerida),
    validar,
  ],
  editarRegistroEstilo
)

module.exports = router
