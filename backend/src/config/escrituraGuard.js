const fs = require('fs')
const path = require('path')

// Rutas que deben seguir funcionando con la suscripcion vencida: autenticarse y
// pagar para reactivarse. `superadminRoutes.js` salio de la lista al retirarse
// el panel de superadmin; asignar y cancelar suscripciones ahora se opera desde
// el servidor (backend/src/scripts/gestionarSuscripcion.js).
const ARCHIVOS_EXENTOS = ['authRoutes.js', 'suscripcionRoutes.js']

const METODOS_MUTACION = ['post', 'put', 'patch', 'delete']
const GUARD = 'requerirEscritura'

// Encuentra la posicion del parentesis que cierra el que abre en `inicio`.
const buscarCierre = (contenido, inicio) => {
  let profundidad = 0

  for (let i = inicio; i < contenido.length; i += 1) {
    if (contenido[i] === '(') profundidad += 1
    if (contenido[i] === ')') {
      profundidad -= 1
      if (profundidad === 0) return i
    }
  }

  return -1
}

const analizarArchivoRutas = (contenido, nombreArchivo) => {
  if (ARCHIVOS_EXENTOS.includes(nombreArchivo)) {
    return []
  }

  const pendientes = []
  const patron = new RegExp(`router\\.(${METODOS_MUTACION.join('|')})\\s*\\(`, 'g')
  let coincidencia = patron.exec(contenido)

  while (coincidencia !== null) {
    const aperturaParentesis = coincidencia.index + coincidencia[0].length - 1
    const cierre = buscarCierre(contenido, aperturaParentesis)
    const cadena = cierre === -1 ? '' : contenido.slice(aperturaParentesis, cierre)
    const ruta = cadena.match(/['"`]([^'"`]*)['"`]/)

    if (!cadena.includes(GUARD)) {
      pendientes.push({
        archivo: nombreArchivo,
        metodo: coincidencia[1],
        ruta: ruta ? ruta[1] : '?',
      })
    }

    coincidencia = patron.exec(contenido)
  }

  return pendientes
}

const analizarDirectorioRutas = (directorio) =>
  fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.js'))
    .flatMap((archivo) =>
      analizarArchivoRutas(fs.readFileSync(path.join(directorio, archivo), 'utf8'), archivo)
    )

// Se llama en arranque fuera de produccion: el error aparece en la maquina del
// desarrollador, no cuando una clinica vencida ya escribio de mas.
const verificarRutasProtegidas = () => {
  const pendientes = analizarDirectorioRutas(path.join(__dirname, '..', 'routes'))

  if (pendientes.length === 0) {
    return
  }

  const detalle = pendientes
    .map((r) => `  ${r.metodo.toUpperCase()} ${r.ruta} (${r.archivo})`)
    .join('\n')

  throw new Error(
    `Rutas de mutacion sin '${GUARD}':\n${detalle}\n` +
      `Agrega el middleware o declara el archivo en ARCHIVOS_EXENTOS de escrituraGuard.js.`
  )
}

module.exports = {
  ARCHIVOS_EXENTOS,
  METODOS_MUTACION,
  analizarArchivoRutas,
  analizarDirectorioRutas,
  verificarRutasProtegidas,
}
