const crypto = require('crypto')

// ── Claves ────────────────────────────────────────────────────────────────
//
// Dos modos de operación:
//
// 1. Keyring versionado (recomendado): ENCRYPTION_KEYS="v2:clave,v1:clave"
//    La PRIMERA entrada es la clave activa (cifra todo lo nuevo); las demás
//    solo descifran datos históricos. Rotar = AGREGAR una versión al frente
//    y correr `npm run cifrado:rotar`. Una versión solo se retira del keyring
//    cuando ningún ciphertext la referencia (verificable por su prefijo).
//
// 2. Legacy (sin ENCRYPTION_KEYS): clave derivada de INTEGRACIONES_SECRET o
//    JWT_SECRET, sin versión en el ciphertext. Se mantiene para descifrar los
//    datos existentes; rotar esos secretos en este modo destruye el acceso a
//    la PII cifrada.

const VERSION_RE = /^v\d+$/

const derivarClave = (secreto) => crypto.createHash('sha256').update(secreto).digest()

const resolverClaveLegacy = () => {
  const secret = process.env.INTEGRACIONES_SECRET || process.env.JWT_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'INTEGRACIONES_SECRET o JWT_SECRET son obligatorios en produccion para cifrar integraciones'
      )
    }

    return derivarClave('bourgelat-dev-secret')
  }

  return derivarClave(secret)
}

const parseKeyring = (raw) => {
  const claves = new Map()
  let activa = null

  for (const entrada of raw.split(',')) {
    const idx = entrada.indexOf(':')
    if (idx === -1) {
      throw new Error('ENCRYPTION_KEYS invalido: cada entrada debe tener formato "version:clave"')
    }

    const version = entrada.slice(0, idx).trim()
    const secreto = entrada.slice(idx + 1).trim()

    if (!VERSION_RE.test(version)) {
      throw new Error(`ENCRYPTION_KEYS: version '${version}' invalida (formato esperado: v1, v2, ...)`)
    }
    if (secreto.length < 32) {
      throw new Error(`ENCRYPTION_KEYS: la clave de '${version}' debe tener al menos 32 caracteres`)
    }
    if (claves.has(version)) {
      throw new Error(`ENCRYPTION_KEYS: version '${version}' duplicada`)
    }

    claves.set(version, derivarClave(secreto))
    if (!activa) activa = version
  }

  return { activa, claves }
}

// Cache del keyring, invalidada si cambia la variable de entorno (útil en tests).
let keyringCache = null
let keyringCacheRaw = undefined

const obtenerKeyring = () => {
  const raw = process.env.ENCRYPTION_KEYS
  if (raw !== keyringCacheRaw) {
    keyringCacheRaw = raw
    keyringCache = raw && raw.trim() ? parseKeyring(raw) : null
  }
  return keyringCache
}

// Versión activa del keyring, o null en modo legacy. Usada por el script de
// rotación para saber qué ciphertext ya está al día.
const obtenerVersionActiva = () => obtenerKeyring()?.activa || null

// ── Cifrado AES-256-GCM ───────────────────────────────────────────────────

const cifrarConClave = (clave, valor) => {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', clave, iv)
  const contenido = Buffer.concat([cipher.update(String(valor), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${tag.toString('base64')}:${contenido.toString('base64')}`
}

const descifrarConClave = (clave, ivB64, tagB64, contenidoB64) => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', clave, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))

  const texto = Buffer.concat([
    decipher.update(Buffer.from(contenidoB64, 'base64')),
    decipher.final(),
  ])

  return texto.toString('utf8')
}

// Cifra siempre con la clave activa del keyring (formato "version:iv:tag:contenido"),
// o con la clave legacy si ENCRYPTION_KEYS no está configurado ("iv:tag:contenido").
const cifrarTexto = (valor) => {
  if (!valor) return null

  const keyring = obtenerKeyring()
  if (keyring) {
    return `${keyring.activa}:${cifrarConClave(keyring.claves.get(keyring.activa), valor)}`
  }

  return cifrarConClave(resolverClaveLegacy(), valor)
}

// Descifra según el formato: 4 segmentos → clave de esa versión en el keyring;
// 3 segmentos → clave legacy. Falla ruidosamente si la versión no está disponible,
// nunca devuelve ciphertext como si fuera texto plano.
const descifrarTexto = (valorCifrado) => {
  if (!valorCifrado) return null

  const partes = String(valorCifrado).split(':')

  if (partes.length === 4) {
    const [version, iv, tag, contenido] = partes
    const clave = obtenerKeyring()?.claves.get(version)

    if (!clave) {
      throw new Error(
        `Clave de cifrado '${version}' no disponible en ENCRYPTION_KEYS; no se puede descifrar`
      )
    }

    return descifrarConClave(clave, iv, tag, contenido)
  }

  if (partes.length === 3) {
    const [iv, tag, contenido] = partes
    return descifrarConClave(resolverClaveLegacy(), iv, tag, contenido)
  }

  throw new Error('Valor cifrado invalido')
}

// ── Índice ciego ──────────────────────────────────────────────────────────

// El HMAC debe ser estable para que las búsquedas encuentren los valores ya
// indexados: usa BLIND_INDEX_KEY (dedicada, no rotable sin re-indexar) y cae
// a la clave legacy si no está configurada. `npm run cifrado:rotar` recalcula
// los índices al valor de la clave vigente.
const resolverClaveBlindIndex = () => {
  const propia = process.env.BLIND_INDEX_KEY
  if (propia && propia.trim()) return derivarClave(propia.trim())
  return resolverClaveLegacy()
}

// HMAC determinístico para índices ciegos: mismo input → mismo output,
// pero sin la clave del servidor no se puede precomputar.
// Usar para campos buscables (ej. numeroDocumento) sin exponer el valor real.
const hmacTexto = (valor) => {
  if (valor == null) return null
  return crypto.createHmac('sha256', resolverClaveBlindIndex()).update(String(valor)).digest('hex')
}

module.exports = {
  cifrarTexto,
  descifrarTexto,
  hmacTexto,
  obtenerVersionActiva,
}
