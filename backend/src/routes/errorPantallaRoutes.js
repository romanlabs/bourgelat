const express = require('express')
const { body } = require('express-validator')

const { verificarToken } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { limitadorErroresPantalla } = require('../middlewares/rateLimitMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { registrarErrorInterno } = require('../services/alertaErroresService')

const router = express.Router()

// Una pantalla que se rompió en el navegador. No guarda nada en la base, solo avisa
// al equipo; por eso no pasa por auditoría.
router.post(
  '/',
  verificarToken,
  requerirEscritura,
  limitadorErroresPantalla,
  [
    body('mensaje').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Mensaje no valido'),
    body('ruta').optional().isString().trim().isLength({ max: 200 }).withMessage('Ruta no valida'),
    validar,
  ],
  (req, res) => {
    registrarErrorInterno({
      origen: 'pantalla',
      ruta: req.body.ruta || '',
      mensaje: req.body.mensaje,
      clinicaId: req.usuario?.clinicaId,
    })
    res.status(204).end()
  }
)

module.exports = router
