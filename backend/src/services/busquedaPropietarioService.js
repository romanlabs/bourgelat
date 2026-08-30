'use strict'

// Búsqueda de propietarios sobre campos cifrados.
//
// `nombre`, `numeroDocumento` y `telefono` se guardan cifrados con AES-256-GCM
// e IV aleatorio (config/crypto.js), así que NO se pueden comparar en SQL: ni
// con ILIKE contra el ciphertext, ni cifrando el término (el mismo texto produce
// un ciphertext distinto cada vez). El descifrado solo ocurre en el hook
// afterFind, ya en memoria.
//
// Estrategia: se mantiene por clínica un índice ligero en memoria con los campos
// ya descifrados y normalizados, y se filtra ahí. El documento completo se
// resuelve además por HMAC exacto (numeroDocumentoHash), que sí usa índice de BD.
//
// Coste medido: ~20 us por propietario en régimen. La API corre en Render con
// 0,5 CPU compartida (render.yaml), por lo que el índice se construye troceado
// cediendo el event loop, y se cachea para no repetir el trabajo en cada tecla.

const { Op } = require('sequelize')
const Propietario = require('../models/Propietario')
const { hmacTexto } = require('../config/crypto')
const { tenantWhere } = require('../utils/tenant')
const logger = require('../utils/logger')

const TTL_MS = 5 * 60 * 1000
const MAX_CLINICAS_EN_CACHE = 10
const TAMANO_BLOQUE = 500
// Por encima de este volumen el filtrado en memoria deja de ser viable en el
// plan Starter y conviene migrar a un blind index por palabras.
const UMBRAL_ALERTA = 10000

// Normalización compartida: debe aplicarse a ambos lados de la comparación para
// que la búsqueda sea insensible a mayúsculas y tildes.
const normalizar = (valor) =>
  valor == null
    ? ''
    : String(valor)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()

const soloDigitos = (valor) => String(valor).replace(/\D/g, '')

// clinicaId -> { expiraEn, usadoEn, entradas: [{ id, nombreNorm, documentoNorm, telefonoNorm, nombreOrden }] }
const cache = new Map()

const invalidarCache = (clinicaId) => {
  if (clinicaId) cache.delete(clinicaId)
  else cache.clear()
}

// Desaloja la clínica menos recientemente usada para acotar la memoria del
// proceso (512 MB en Starter) cuando hay muchos tenants activos.
const desalojarSiHaceFalta = () => {
  if (cache.size <= MAX_CLINICAS_EN_CACHE) return

  let masAntigua = null
  let usadoMin = Infinity
  for (const [clave, valor] of cache) {
    if (valor.usadoEn < usadoMin) {
      usadoMin = valor.usadoEn
      masAntigua = clave
    }
  }
  if (masAntigua) cache.delete(masAntigua)
}

const construirIndice = async (req, clinicaId) => {
  const filas = await Propietario.findAll({
    attributes: ['id', 'nombre', 'numeroDocumento', 'telefono'],
    where: tenantWhere(req, { activo: true }),
    raw: false,
  })

  if (filas.length > UMBRAL_ALERTA) {
    logger.warn('Indice de busqueda de propietarios por encima del umbral recomendado', {
      clinicaId,
      total: filas.length,
      umbral: UMBRAL_ALERTA,
    })
  }

  const entradas = []
  for (let i = 0; i < filas.length; i += TAMANO_BLOQUE) {
    for (const fila of filas.slice(i, i + TAMANO_BLOQUE)) {
      const nombreNorm = normalizar(fila.nombre)
      entradas.push({
        id: fila.id,
        nombreNorm,
        nombreOrden: nombreNorm,
        documentoNorm: normalizar(fila.numeroDocumento),
        telefonoNorm: soloDigitos(fila.telefono || ''),
      })
    }
    // Cede el event loop entre bloques: en 0,5 CPU un índice grande bloquearía
    // al resto de tenants durante cientos de milisegundos.
    if (i + TAMANO_BLOQUE < filas.length) {
      await new Promise((resolve) => setImmediate(resolve))
    }
  }

  entradas.sort((a, b) => a.nombreOrden.localeCompare(b.nombreOrden, 'es'))
  return entradas
}

// Devuelve el índice de la clínica, reconstruyéndolo si expiró.
const obtenerIndice = async (req) => {
  const clinicaId = req?.usuario?.clinicaId
  const ahora = Date.now()
  const enCache = cache.get(clinicaId)

  if (enCache && enCache.expiraEn > ahora) {
    enCache.usadoEn = ahora
    return enCache.entradas
  }

  const entradas = await construirIndice(req, clinicaId)
  cache.set(clinicaId, { entradas, expiraEn: ahora + TTL_MS, usadoEn: ahora })
  desalojarSiHaceFalta()

  return entradas
}

// IDs de propietarios que coinciden con el término, ordenados alfabéticamente
// por nombre. Devuelve null si no hay término (el llamador no debe filtrar).
const buscarIds = async (req, termino) => {
  const texto = normalizar(termino)
  if (!texto) return null

  const coincidencias = new Set()

  // Atajo por documento exacto: usa el índice único propietarios_doc_hash_clinica_unique
  // sin necesidad de descifrar nada.
  const digitos = soloDigitos(termino)
  if (digitos.length >= 5) {
    const porHash = await Propietario.findOne({
      attributes: ['id'],
      where: tenantWhere(req, { numeroDocumentoHash: hmacTexto(digitos), activo: true }),
    })
    if (porHash) coincidencias.add(porHash.id)
  }

  const entradas = await obtenerIndice(req)
  const ids = []

  for (const entrada of entradas) {
    const coincide =
      entrada.nombreNorm.includes(texto) ||
      entrada.documentoNorm.includes(texto) ||
      (digitos.length >= 3 && entrada.telefonoNorm.includes(digitos))

    if (coincide || coincidencias.has(entrada.id)) {
      ids.push(entrada.id)
      coincidencias.delete(entrada.id)
    }
  }

  // Coincidencias por hash que no estaban en el índice (p. ej. cache recién
  // invalidada) se añaden al final para no perderlas.
  return [...ids, ...coincidencias]
}

// IDs de la clínica ordenados alfabéticamente. Necesario porque ORDER BY nombre
// en SQL ordenaría por ciphertext, es decir, en un orden arbitrario.
const listarIdsOrdenados = async (req) => {
  const entradas = await obtenerIndice(req)
  return entradas.map((e) => e.id)
}

module.exports = {
  buscarIds,
  listarIdsOrdenados,
  invalidarCache,
  normalizar,
  UMBRAL_ALERTA,
}
