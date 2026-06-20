'use strict'

// Importamos las funciones de cifrado para poder cifrar los datos existentes.
// resolverClave() usa INTEGRACIONES_SECRET (o JWT_SECRET en dev), igual que la app.
const { cifrarTexto, hmacTexto } = require('../config/crypto')

const tableExists = async (queryInterface, targetTable, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction })
  const normalized = tables.map((t) => {
    if (typeof t === 'string') return t
    return t?.tableName || t?.name || String(t)
  })
  return normalized.includes(targetTable)
}

const columnExists = async (queryInterface, tableName, columnName, transaction) => {
  const desc = await queryInterface.describeTable(tableName, { transaction })
  return !!desc[columnName]
}

// Cifra un lote de filas y las actualiza con un solo UPDATE por fila.
// Usamos raw SQL para no pasar por los hooks del modelo (que aún no están
// activos durante la migración) y evitar dependencias circulares.
const cifrarFilas = async ({ sequelize, transaction, tabla, campos, camposJson, hashConfig, lote }) => {
  for (const fila of lote) {
    const sets = []
    const reemplazos = { id: fila.id }

    if (hashConfig) {
      const { fuente, destino } = hashConfig
      const val = fila[fuente]
      if (val != null) {
        sets.push(`"${destino}" = :${destino}`)
        reemplazos[destino] = hmacTexto(val)
      }
    }

    for (const campo of (campos || [])) {
      const val = fila[campo]
      if (val != null) {
        sets.push(`"${campo}" = :${campo}`)
        reemplazos[campo] = cifrarTexto(String(val))
      }
    }

    for (const campo of (camposJson || [])) {
      const val = fila[campo]
      if (val != null) {
        const str = typeof val === 'string' ? val : JSON.stringify(val)
        sets.push(`"${campo}" = :${campo}`)
        reemplazos[campo] = cifrarTexto(str)
      }
    }

    if (sets.length === 0) continue

    await sequelize.query(
      `UPDATE "${tabla}" SET ${sets.join(', ')} WHERE id = :id`,
      { replacements: reemplazos, transaction }
    )
  }
}

module.exports = {
  name: '20260615_000005_encrypt_financial_pii',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const { sequelize } = queryInterface

    // ── 1. propietarios ──────────────────────────────────────────────────────

    if (await tableExists(queryInterface, 'propietarios', transaction)) {

      // 1a. Añadir columna del índice ciego si no existe
      if (!(await columnExists(queryInterface, 'propietarios', 'numeroDocumentoHash', transaction))) {
        await queryInterface.addColumn('propietarios', 'numeroDocumentoHash', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction })
      }

      // 1b. Cambiar columnas de STRING a TEXT para almacenar ciphertext
      //     (STRING tiene límite de 255 chars; el ciphertext puede ser más largo)
      for (const col of ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial']) {
        if (await columnExists(queryInterface, 'propietarios', col, transaction)) {
          await sequelize.query(
            `ALTER TABLE propietarios ALTER COLUMN "${col}" TYPE TEXT`,
            { transaction }
          )
        }
      }

      // 1c. Cifrar datos existentes
      const [propietarios] = await sequelize.query(
        `SELECT id, nombre, "numeroDocumento", email, telefono, direccion, "razonSocial", "nombreComercial" FROM propietarios`,
        { transaction }
      )

      await cifrarFilas({
        sequelize,
        transaction,
        tabla: 'propietarios',
        campos:     ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial'],
        hashConfig: { fuente: 'numeroDocumento', destino: 'numeroDocumentoHash' },
        lote: propietarios,
      })

      // 1d. Reemplazar índice único (numeroDocumento, clinicaId) por (hash, clinicaId)
      //     Sequelize puede haber nombrado el índice de distintas formas; usamos raw SQL.
      await sequelize.query(
        `DROP INDEX IF EXISTS "propietarios_numero_documento_clinica_id"`,
        { transaction }
      )
      await sequelize.query(
        `DROP INDEX IF EXISTS "propietarios_numeroDocumento_clinicaId"`,
        { transaction }
      )
      // Índice nuevo sobre el hash (ya definido en el modelo)
      const [existing] = await sequelize.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'propietarios' AND indexname = 'propietarios_doc_hash_clinica_unique'`,
        { transaction }
      )
      if (existing.length === 0) {
        await sequelize.query(
          `CREATE UNIQUE INDEX "propietarios_doc_hash_clinica_unique" ON propietarios ("numeroDocumentoHash", "clinicaId")`,
          { transaction }
        )
      }
    }

    // ── 2. facturas ───────────────────────────────────────────────────────────

    if (await tableExists(queryInterface, 'facturas', transaction)) {

      // 2a. metodoPago: ENUM → TEXT (el ciphertext no es un valor ENUM válido)
      const desc = await queryInterface.describeTable('facturas', { transaction })
      if (desc.metodoPago && desc.metodoPago.type !== 'TEXT') {
        await sequelize.query(
          `ALTER TABLE facturas ALTER COLUMN "metodoPago" TYPE TEXT USING "metodoPago"::TEXT`,
          { transaction }
        )
        await sequelize.query(
          `DROP TYPE IF EXISTS "enum_facturas_metodoPago"`,
          { transaction }
        )
      }

      // 2b. payloadElectronico / respuestaElectronica: JSONB → TEXT
      for (const col of ['payloadElectronico', 'respuestaElectronica']) {
        if (desc[col] && desc[col].type === 'JSONB') {
          await sequelize.query(
            `ALTER TABLE facturas ALTER COLUMN "${col}" TYPE TEXT USING "${col}"::TEXT`,
            { transaction }
          )
        }
      }

      // 2c. Cifrar datos existentes
      const [facturas] = await sequelize.query(
        `SELECT id, "metodoPago", observaciones, "mensajeElectronico", "payloadElectronico", "respuestaElectronica" FROM facturas`,
        { transaction }
      )

      await cifrarFilas({
        sequelize,
        transaction,
        tabla: 'facturas',
        campos:     ['metodoPago', 'observaciones', 'mensajeElectronico'],
        camposJson: ['payloadElectronico', 'respuestaElectronica'],
        lote: facturas,
      })
    }

    // ── 3. factura_items ──────────────────────────────────────────────────────

    if (await tableExists(queryInterface, 'factura_items', transaction)) {

      // 3a. descripcion: STRING → TEXT
      const desc = await queryInterface.describeTable('factura_items', { transaction })
      if (desc.descripcion && desc.descripcion.type !== 'TEXT') {
        await sequelize.query(
          `ALTER TABLE factura_items ALTER COLUMN "descripcion" TYPE TEXT`,
          { transaction }
        )
      }

      // 3b. Cifrar datos existentes
      const [items] = await sequelize.query(
        `SELECT id, descripcion FROM factura_items`,
        { transaction }
      )

      await cifrarFilas({
        sequelize,
        transaction,
        tabla: 'factura_items',
        campos: ['descripcion'],
        lote: items,
      })
    }
  },

  down: async () => {
    // El descifrado masivo de datos en producción es una operación irreversible
    // por diseño: no se provee rollback automático para no exponer datos en texto
    // plano en un proceso automatizado. Para revertir, restaurar un backup previo.
  },
}
