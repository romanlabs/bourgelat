// Verifica, sin escribir nada, que toda la PII cifrada de la base descifra con
// el keyring configurado (ENCRYPTION_KEYS) y que los indices ciegos coinciden
// con BLIND_INDEX_KEY. Sirve para:
//   - probar una restauracion: respaldo de la base + respaldo de las claves
//     (ver docs/respaldos.md)
//   - antes de retirar una version del keyring: `-- --version v1` dice si
//     queda algun valor cifrado con ella (docs/cifrado-recomendaciones.md §2)
//
// Uso:
//   npm run cifrado:verificar
//   npm run cifrado:verificar -- --version v1
//   node --env-file=.env.restauracion src/scripts/verificarCifrado.js
//
// Sale con codigo 1 si algun valor no descifra o algun indice no coincide.

const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const { descifrarTexto, hmacTexto, obtenerVersionActiva } = require('../config/crypto')
const { TABLAS } = require('../config/tablasCifradas')
const { revisarValor, acumular, columnaVacia } = require('./verificarCifradoReglas')

const TAMANO_LOTE = 500

// Conteos para comparar a ojo con produccion tras una restauracion.
const TABLAS_CONTEO = ['clinicas', 'usuarios', 'propietarios', 'mascotas', 'citas', 'historias_clinicas', 'facturas']

const tablaExiste = async (tabla) => {
  const [filas] = await sequelize.query('SELECT to_regclass(:nombre) AS reg', {
    replacements: { nombre: `public.${tabla}` },
  })
  return Boolean(filas[0]?.reg)
}

const leerArgVersion = () => {
  const idx = process.argv.indexOf('--version')
  return idx === -1 ? null : process.argv[idx + 1]
}

const verificarTabla = async ({ tabla, campos, hashConfig }) => {
  const columnas = Object.fromEntries(campos.map((c) => [c, columnaVacia()]))
  const indice = { revisados: 0, distintos: 0 }
  const ejemplosError = new Set()

  const lista = [...campos, ...(hashConfig ? [hashConfig.destino] : [])].map((c) => `"${c}"`).join(', ')
  let ultimoId = null

  for (;;) {
    const filtro = ultimoId == null ? '' : 'WHERE id > :ultimoId'
    const [lote] = await sequelize.query(
      `SELECT id, ${lista} FROM "${tabla}" ${filtro} ORDER BY id LIMIT ${TAMANO_LOTE}`,
      { replacements: { ultimoId } }
    )
    if (lote.length === 0) break
    ultimoId = lote[lote.length - 1].id

    for (const fila of lote) {
      for (const campo of campos) {
        if (fila[campo] == null) continue
        const resultado = revisarValor(fila[campo], descifrarTexto)
        acumular(columnas[campo], resultado)
        if (!resultado.ok) ejemplosError.add(resultado.error)

        if (hashConfig && campo === hashConfig.fuente && resultado.ok && resultado.tipo !== 'plano') {
          indice.revisados += 1
          if (hmacTexto(resultado.plano) !== fila[hashConfig.destino]) indice.distintos += 1
        }
      }
    }
  }

  return { columnas, indice, ejemplosError: [...ejemplosError].slice(0, 3) }
}

const formatoTipos = (tipos) =>
  Object.entries(tipos)
    .map(([tipo, n]) => `${tipo}=${n}`)
    .join(' ')

const run = async () => {
  const versionBuscada = leerArgVersion()

  await sequelize.authenticate()
  const [[info]] = await sequelize.query('SELECT current_database() AS base')
  console.log(`Base: ${info.base} en ${process.env.DB_HOST}`)
  console.log(`Clave activa del keyring: ${obtenerVersionActiva() || '(ninguna: modo legacy)'}\n`)

  console.log('Filas por tabla:')
  for (const tabla of TABLAS_CONTEO) {
    if (!(await tablaExiste(tabla))) continue
    const [[{ n }]] = await sequelize.query(`SELECT count(*)::int AS n FROM "${tabla}"`)
    console.log(`  ${tabla}: ${n}`)
  }

  let fallos = 0
  let indicesDistintos = 0
  let conVersionBuscada = 0

  console.log('\nColumnas cifradas:')
  for (const config of TABLAS) {
    if (!(await tablaExiste(config.tabla))) {
      console.log(`  ${config.tabla}: no existe en esta base, se omite`)
      continue
    }

    const { columnas, indice, ejemplosError } = await verificarTabla(config)
    for (const [campo, r] of Object.entries(columnas)) {
      if (r.total === 0) continue
      const marca = r.fallos > 0 ? `  ← ${r.fallos} NO DESCIFRAN` : ''
      console.log(`  ${config.tabla}.${campo}: ${r.total} (${formatoTipos(r.tipos)})${marca}`)
      fallos += r.fallos
      if (versionBuscada) conVersionBuscada += r.tipos[versionBuscada] || 0
    }
    if (config.hashConfig && indice.revisados > 0) {
      const marca = indice.distintos > 0 ? `  ← ${indice.distintos} NO COINCIDEN` : ''
      console.log(`  ${config.tabla}.${config.hashConfig.destino}: ${indice.revisados} revisados${marca}`)
      indicesDistintos += indice.distintos
    }
    for (const mensaje of ejemplosError) console.log(`    error: ${mensaje}`)
  }

  console.log('')
  if (versionBuscada) {
    console.log(
      conVersionBuscada === 0
        ? `Ningun valor usa '${versionBuscada}'.`
        : `Quedan ${conVersionBuscada} valores cifrados con '${versionBuscada}': NO retirarla del keyring.`
    )
  }

  if (fallos > 0 || indicesDistintos > 0) {
    console.log(
      `FALLA: ${fallos} valores no descifran y ${indicesDistintos} indices ciegos no coinciden. ` +
        'Revisar que ENCRYPTION_KEYS y BLIND_INDEX_KEY sean las del respaldo de esta base.'
    )
    process.exitCode = 1
    return
  }

  console.log('OK: toda la PII cifrada descifra y los indices ciegos coinciden.')
}

run()
  .catch((error) => {
    console.error(`Error durante la verificacion: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => sequelize.close())
