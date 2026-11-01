// Reglas de `npm run cifrado:verificar`, separadas del acceso a la base para
// poder probarlas (verificarCifradoReglas.test.js).

const { estaCifrado } = require('../config/modelEncryption')

// Clasifica un valor de una columna cifrada e intenta descifrarlo.
// tipo: 'plano' (anterior al cifrado), 'legacy' (iv:tag:contenido) o la
// versión del keyring ('v1', 'v2'...). `plano` solo viene si descifró.
const revisarValor = (valor, descifrar) => {
  const str = String(valor)
  if (!estaCifrado(str)) return { tipo: 'plano', ok: true }

  const partes = str.split(':')
  const tipo = partes.length === 4 ? partes[0] : 'legacy'

  try {
    return { tipo, ok: true, plano: descifrar(str) }
  } catch (error) {
    return { tipo, ok: false, error: error.message }
  }
}

// Suma un resultado al resumen de una columna: { total, fallos, tipos: { v1: n } }.
const acumular = (resumenColumna, resultado) => {
  resumenColumna.total += 1
  resumenColumna.tipos[resultado.tipo] = (resumenColumna.tipos[resultado.tipo] || 0) + 1
  if (!resultado.ok) resumenColumna.fallos += 1
  return resumenColumna
}

const columnaVacia = () => ({ total: 0, fallos: 0, tipos: {} })

module.exports = { revisarValor, acumular, columnaVacia }
