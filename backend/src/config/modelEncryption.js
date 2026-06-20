'use strict'

const { cifrarTexto, descifrarTexto, hmacTexto } = require('./crypto')

// Detecta si un valor ya está cifrado con nuestro formato IV:tag:contenido.
// Previene doble cifrado en caso de que un hook se llame dos veces.
const CIPHER_RE = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/
const estaCifrado = (val) => typeof val === 'string' && CIPHER_RE.test(val)

// Cifra un campo de texto plano. Si ya está cifrado, lo deja intacto.
const cifrarCampo = (val) => {
  if (val == null) return val
  const str = String(val)
  return estaCifrado(str) ? str : cifrarTexto(str)
}

// Descifra un campo. Si falla (e.g. valor en texto plano de antes de la
// migración), devuelve el valor original para no romper la lectura.
const descifrarCampo = (val) => {
  if (val == null) return val
  try {
    return descifrarTexto(String(val))
  } catch {
    return val
  }
}

// Cifra un campo que originalmente era JSONB: serializa a JSON antes de cifrar.
const cifrarJsonCampo = (val) => {
  if (val == null) return val
  const str = typeof val === 'string' ? val : JSON.stringify(val)
  return estaCifrado(str) ? str : cifrarTexto(str)
}

// Descifra y parsea un campo JSON cifrado. Maneja texto plano como fallback.
const descifrarJsonCampo = (val) => {
  if (val == null) return val
  try {
    return JSON.parse(descifrarTexto(String(val)))
  } catch {
    if (typeof val === 'string') {
      try { return JSON.parse(val) } catch { /* texto plano no-JSON */ }
    }
    return val
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
  registrarHooksCifrado,
  hmacTexto,
}
