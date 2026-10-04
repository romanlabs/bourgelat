const express = require('express')
const { recibirCorreo } = require('../controllers/soporteEquipoController')

const router = express.Router()

// Puertas del EQUIPO de Bourgelat (no de las clinicas). Sin JWT: la unica
// ruta hoy la llama el Email Worker de Cloudflare y se autentica con la firma
// HMAC de SOPORTE_CORREO_SECRETO (ver services/soporteCorreoService.js).
//
// Se monta ANTES de express.json en index.js: la firma cubre los bytes exactos
// del correo, asi que el cuerpo tiene que llegar crudo.
router.post(
  '/correo',
  express.raw({ type: () => true, limit: '5mb' }),
  recibirCorreo
)

module.exports = router
