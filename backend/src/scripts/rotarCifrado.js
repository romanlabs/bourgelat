// Recifra la PII con la clave activa del keyring (ENCRYPTION_KEYS) y recalcula
// los indices ciegos con la clave HMAC vigente (BLIND_INDEX_KEY o legacy).
//
// Procedimiento de rotacion (ver docs/secrets-rotation.md):
//   1. Agregar la clave nueva AL FRENTE de ENCRYPTION_KEYS sin retirar la vieja.
//   2. Desplegar / recargar el entorno.
//   3. Correr: npm run cifrado:rotar   (con --dry-run para solo contar)
//   4. Cuando el resumen reporte 0 pendientes, retirar la clave vieja del keyring.
//
// El script es idempotente: los valores ya cifrados con la version activa se
// saltan. Usa SQL crudo para no pasar por los hooks de los modelos.

const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const { cifrarTexto, descifrarTexto, hmacTexto, obtenerVersionActiva } = require('../config/crypto')
const { estaCifrado } = require('../config/modelEncryption')

const TAMANO_LOTE = 200

// Tablas y campos cifrados. Debe mantenerse alineado con los
// registrarHooksCifrado(...) de los modelos y con integracionFacturacionController.
const TABLAS = [
  {
    tabla: 'propietarios',
    campos: ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial'],
    hashConfig: { fuente: 'numeroDocumento', destino: 'numeroDocumentoHash' },
  },
  {
    tabla: 'facturas',
    campos: ['metodoPago', 'observaciones', 'mensajeElectronico', 'payloadElectronico', 'respuestaElectronica'],
  },
  { tabla: 'factura_items', campos: ['descripcion'] },
  { tabla: 'caja_turnos', campos: ['observacionesCierre'] },
  { tabla: 'movimientos_caja', campos: ['observaciones'] },
  {
    tabla: 'integraciones_facturacion',
    campos: ['clientIdCifrado', 'clientSecretCifrado', 'usernameCifrado', 'passwordCifrado'],
  },
]

const tablaExiste = async (tabla) => {
  const [filas] = await sequelize.query('SELECT to_regclass(:nombre) AS reg', {
    replacements: { nombre: `public.${tabla}` },
  })
  return Boolean(filas[0]?.reg)
}

const columnas = (config) => {
  const lista = [...config.campos]
  if (config.hashConfig) lista.push(config.hashConfig.destino)
  return lista.map((c) => `"${c}"`).join(', ')
}

const procesarTabla = async (config, versionActiva, dryRun, resumen) => {
  const { tabla, campos, hashConfig } = config

  if (!(await tablaExiste(tabla))) {
    console.log(`- ${tabla}: no existe en esta base, se omite`)
    return
  }

  let ultimoId = null
  let filasActualizadas = 0

  for (;;) {
    const filtro = ultimoId == null ? '' : 'WHERE id > :ultimoId'
    const [lote] = await sequelize.query(
      `SELECT id, ${columnas(config)} FROM "${tabla}" ${filtro} ORDER BY id LIMIT ${TAMANO_LOTE}`,
      { replacements: { ultimoId } }
    )

    if (lote.length === 0) break
    ultimoId = lote[lote.length - 1].id

    const transaction = dryRun ? null : await sequelize.transaction()

    try {
      for (const fila of lote) {
        const sets = []
        const reemplazos = { id: fila.id }

        for (const campo of campos) {
          const val = fila[campo]
          if (val == null) continue

          const str = String(val)

          if (!estaCifrado(str)) {
            resumen.textoPlano += 1
            continue
          }

          if (str.startsWith(`${versionActiva}:`)) continue

          // descifrarTexto lanza si la version necesaria no esta en el keyring:
          // mejor abortar con mensaje claro que recifrar a medias.
          const plano = descifrarTexto(str)
          sets.push(`"${campo}" = :${campo}`)
          reemplazos[campo] = cifrarTexto(plano)
        }

        // Recalcula el indice ciego incluso si el ciphertext ya esta al dia:
        // cubre el caso de introducir BLIND_INDEX_KEY sobre datos ya rotados.
        if (hashConfig) {
          const { fuente, destino } = hashConfig
          const val = fila[fuente]
          if (val != null && estaCifrado(String(val))) {
            const plano = descifrarTexto(String(val))
            const hashNuevo = hmacTexto(plano)
            if (hashNuevo !== fila[destino]) {
              sets.push(`"${destino}" = :${destino}`)
              reemplazos[destino] = hashNuevo
            }
          }
        }

        if (sets.length === 0) continue

        filasActualizadas += 1
        if (dryRun) continue

        await sequelize.query(`UPDATE "${tabla}" SET ${sets.join(', ')} WHERE id = :id`, {
          replacements: reemplazos,
          transaction,
        })
      }

      if (transaction) await transaction.commit()
    } catch (error) {
      if (transaction) await transaction.rollback()
      throw error
    }
  }

  resumen.filas += filasActualizadas
  console.log(`- ${tabla}: ${filasActualizadas} filas ${dryRun ? 'por actualizar' : 'actualizadas'}`)
}

const run = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const versionActiva = obtenerVersionActiva()

  if (!versionActiva) {
    console.error(
      'ENCRYPTION_KEYS no esta configurado. Define el keyring (ej. ENCRYPTION_KEYS=v1:<clave>) antes de rotar; ver docs/secrets-rotation.md.'
    )
    process.exitCode = 1
    return
  }

  console.log(`Rotacion de cifrado hacia la version activa '${versionActiva}'${dryRun ? ' (dry-run)' : ''}\n`)

  await sequelize.authenticate()

  const resumen = { filas: 0, textoPlano: 0 }

  for (const config of TABLAS) {
    await procesarTabla(config, versionActiva, dryRun, resumen)
  }

  console.log(`\nTotal: ${resumen.filas} filas ${dryRun ? 'pendientes de rotar' : 'rotadas'}.`)

  if (resumen.textoPlano > 0) {
    console.log(
      `Aviso: se encontraron ${resumen.textoPlano} valores en texto plano (pre-migracion); este script no los cifra.`
    )
  }

  if (!dryRun && resumen.filas === 0) {
    console.log(
      `Todo el ciphertext ya usa '${versionActiva}': es seguro retirar las versiones anteriores del keyring.`
    )
  }
}

run()
  .catch((error) => {
    console.error(`Error durante la rotacion: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => sequelize.close())
