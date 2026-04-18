const tableExists = async (queryInterface, targetTable, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction })
  const normalized = tables.map((table) => {
    if (typeof table === 'string') return table
    if (table?.tableName) return table.tableName
    if (table?.name) return table.name
    return String(table)
  })

  return normalized.includes(targetTable)
}

const ensureColumn = async ({ queryInterface, tableName, columnName, definition, transaction }) => {
  const description = await queryInterface.describeTable(tableName, { transaction })

  if (description[columnName]) {
    return
  }

  await queryInterface.addColumn(tableName, columnName, definition, { transaction })
}

module.exports = {
  name: '20260325_000003_add_fiscal_and_electronic_fields',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    if (await tableExists(queryInterface, 'clinicas', transaction)) {
      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'razonSocial',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'nombreComercial',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'tipoPersona',
        definition: {
          type: Sequelize.ENUM('persona_natural', 'persona_juridica'),
          allowNull: false,
          defaultValue: 'persona_juridica',
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'digitoVerificacion',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'codigoPostal',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'municipioId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'tipoDocumentoFacturacionId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'organizacionJuridicaId',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'tributoId',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })
    }

    if (await tableExists(queryInterface, 'propietarios', transaction)) {
      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'razonSocial',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'nombreComercial',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'tipoPersona',
        definition: {
          type: Sequelize.ENUM('persona_natural', 'persona_juridica'),
          allowNull: false,
          defaultValue: 'persona_natural',
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'digitoVerificacion',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'codigoPostal',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'municipioId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'tipoDocumentoFacturacionId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'organizacionJuridicaId',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'propietarios',
        columnName: 'tributoId',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })
    }

    if (await tableExists(queryInterface, 'facturas', transaction)) {
      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'proveedorElectronico',
        definition: {
          type: Sequelize.ENUM('factus'),
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'estadoElectronico',
        definition: {
          type: Sequelize.ENUM('no_aplica', 'pendiente', 'enviada', 'validada', 'rechazada', 'error'),
          allowNull: false,
          defaultValue: 'no_aplica',
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'documentoElectronico',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'rangoNumeracionId',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'referenciaExterna',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'cufe',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'fechaEnvioElectronico',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'fechaValidacionElectronica',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'urlPdfElectronico',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'urlXmlElectronico',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'mensajeElectronico',
        definition: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'payloadElectronico',
        definition: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'facturas',
        columnName: 'respuestaElectronica',
        definition: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        transaction,
      })
    }
  },

  down: async () => {
    // Migracion aditiva; se conserva para no perder datos fiscales/electronicos.
  },
}
