'use strict'

const { cifrarTexto, descifrarTexto, hmacTexto } = require('./crypto')
const logger = require('../utils/logger')

// Detecta si un valor ya está cifrado con nuestro formato, en cualquiera de
// sus dos variantes: "vN:iv:tag:contenido" (keyring) o "iv:tag:contenido" (legacy).
// Previene doble cifrado en caso de que un hook se llame dos veces.
const CIPHER_RE = /^(?:v\d+:)?[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/
const estaCifrado = (val) => typeof val === 'string' && CIPHER_RE.test(val)

// Cifra un campo de texto plano. Si ya está cifrado, lo deja intacto.
const cifrarCampo = (val) => {
  if (val == null) return val
  const str = String(val)
  return estaCifrado(str) ? str : cifrarTexto(str)
}

// Descifra un campo. El texto plano de antes de la migración se devuelve tal
// cual (fallback legítimo); un valor que PARECE cifrado pero no descifra indica
// clave ausente/incorrecta o dato corrupto: se loguea y se devuelve null para
// no exponer ciphertext crudo a la aplicación.
const descifrarCampo = (val) => {
  if (val == null) return val
  const str = String(val)
  if (!estaCifrado(str)) return val
  try {
    return descifrarTexto(str)
  } catch (error) {
    logger.error('Fallo al descifrar campo cifrado', { motivo: error.message })
    return null
  }
}

// Cifra un campo que originalmente era JSONB: serializa a JSON antes de cifrar.
const cifrarJsonCampo = (val) => {
  if (val == null) return val
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return estaCifrado(str) ? str : cifrarTexto(str)
}

// Descifra y parsea un campo JSON cifrado. Los valores pre-migración (objetos
// JSONB ya parseados o strings JSON planos) se manejan como fallback; un fallo
// de descifrado real se loguea y devuelve null, igual que descifrarCampo.
const descifrarJsonCampo = (val) => {
  if (val == null) return val

  if (typeof val !== 'string' || !estaCifrado(val)) {
    if (typeof val === 'string') {
      try { return JSON.parse(val) } catch { /* texto plano no-JSON */ }
    }
    return val
  }

  try {
    const plano = descifrarTexto(val)
    try { return JSON.parse(plano) } catch { return plano }
  } catch (error) {
    logger.error('Fallo al descifrar campo JSON cifrado', { motivo: error.message })
    return null
  }
}

// Aplica cifrado sobre una instancia Sequelize dado un conjunto de campos.
// soloModificados=true → solo cifra los campos que changed() reporta (para beforeUpdate).
const aplicarCifrado = ({ instance, campos, camposJson, hashConfig, soloModificados }) => {
  const modificados = soloModificados ? (instance.changed() || []) : null
  const debeActualizar = (campo) => !soloModificados || modificados.includes(campo)

  if (hashConfig) {
    const { fuente, destino } = hashConfig
    if (debeActualizar(fuente)) {
      const val = instance.getDataValue(fuente)
      if (val && !estaCifrado(String(val))) {
        instance.setDataValue(destino, hmacTexto(val))
      }
    }
  }

  for (const campo of (campos || [])) {
    if (debeActualizar(campo)) {
      const val = instance.getDataValue(campo)
      if (val != null) instance.setDataValue(campo, cifrarCampo(val))
    }
  }

  for (const campo of (camposJson || [])) {
    if (debeActualizar(campo)) {
      const val = instance.getDataValue(campo)
      if (val != null) instance.setDataValue(campo, cifrarJsonCampo(val))
    }
  }
}

// Descifra una instancia Sequelize en su lugar, actualizando también
// _previousDataValues para que Sequelize no marque campos como dirty.
const aplicarDescifrado = ({ instance, campos, camposJson }) => {
  if (!instance?.dataValues) return

  for (const campo of (campos || [])) {
    const val = instance.dataValues[campo]
    if (val != null) {
      const dec = descifrarCampo(val)
      instance.dataValues[campo] = dec
      if (instance._previousDataValues) instance._previousDataValues[campo] = dec
    }
  }

  for (const campo of (camposJson || [])) {
    const val = instance.dataValues[campo]
    if (val != null) {
      const dec = descifrarJsonCampo(val)
      instance.dataValues[campo] = dec
      if (instance._previousDataValues) instance._previousDataValues[campo] = dec
    }
  }
}

// Registra los tres hooks de cifrado en un modelo Sequelize.
// Uso:
//   registrarHooksCifrado(MiModelo, {
//     campos:     ['nombre', 'email'],
//     camposJson: ['payload'],
//     hashConfig: { fuente: 'documento', destino: 'documentoHash' },
//   })
const registrarHooksCifrado = (Model, opciones) => {
  Model.addHook('beforeCreate', (instance) =>
    aplicarCifrado({ instance, ...opciones, soloModificados: false })
  )

  Model.addHook('beforeUpdate', (instance) =>
    aplicarCifrado({ instance, ...opciones, soloModificados: true })
  )

  Model.addHook('afterFind', (resultado) => {
    if (!resultado) return
    const descifrar = (inst) => aplicarDescifrado({ instance: inst, ...opciones })
    Array.isArray(resultado) ? resultado.forEach(descifrar) : descifrar(resultado)
  })
}

module.exports = {
  estaCifrado,
  cifrarCampo,
  descifrarCampo,
  cifrarJsonCampo,
  descifrarJsonCampo,
  aplicarDescifrado,
  registrarHooksCifrado,
  hmacTexto,
}
