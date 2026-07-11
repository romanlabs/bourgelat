const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const limpio = String(valor).trim()
  return limpio || null
}

const normalizarTexto = (valor) => limpiarTexto(valor) ?? ''

const normalizarEmail = (valor) => {
  const limpio = limpiarTexto(valor)
  return limpio ? limpio.toLowerCase() : null
}

const normalizarTelefonoColombiano = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null
  const soloNumeros = limpio.replace(/\D/g, '')
  const sinPrefijo =
    soloNumeros.length > 10 && soloNumeros.startsWith('57')
      ? soloNumeros.slice(2)
      : soloNumeros
  return sinPrefijo.slice(0, 10) || null
}

const normalizarNit = (valor) => {
  const limpio = limpiarTexto(valor)
  if (!limpio) return null
  return limpio.replace(/\D/g, '').slice(0, 15) || null
}

module.exports = { limpiarTexto, normalizarTexto, normalizarEmail, normalizarTelefonoColombiano, normalizarNit }
