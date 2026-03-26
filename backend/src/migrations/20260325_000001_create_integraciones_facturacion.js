const tableName = 'integraciones_facturacion'

const normalizarTabla = (table) => {
  if (typeof table === 'string') return table
  if (table?.tableName) return table.tableName
  if (table?.name) return table.name
  return String(table)
}

const tableExists = async (queryInterface, targetTable, transaction) => {
  const tables = await queryInterface.showAllTables({ transaction })
  return tables.map(normalizarTabla).includes(targetTable)
}

module.exports = {
  name: '20260325_000001_create_integraciones_facturacion',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const exists = await tableExists(queryInterface, tableName, transaction)

    if (exists) {
      return
    }

    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      proveedor: {
        type: Sequelize.ENUM('factus'),
        allowNull: false,
        defaultValue: 'factus',
      },
      ambiente: {
        type: Sequelize.ENUM('sandbox', 'production'),
        allowNull: false,
        defaultValue: 'sandbox',
      },
      activa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      baseUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      clientIdCifrado: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      clientSecretCifrado: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      usernameCifrado: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      passwordCifrado: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rangoNumeracionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      documentoCodigo: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '01',
      },
      formaPagoCodigo: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '1',
      },
      metodoPagoCodigo: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '10',
      },
      enviarEmail: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      configuracionAdicional: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      ultimoChequeo: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ultimoEstadoChequeo: {
        type: Sequelize.ENUM('pendiente', 'exitoso', 'fallido'),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      ultimoMensajeChequeo: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      clinicaId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'clinicas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    }, { transaction })

    await queryInterface.addIndex(tableName, ['clinicaId'], {
      unique: true,
      transaction,
      name: 'integraciones_facturacion_clinicaId_unique',
    })

    await queryInterface.addIndex(tableName, ['proveedor', 'activa'], {
      transaction,
      name: 'integraciones_facturacion_proveedor_activa_idx',
    })
  },

  down: async ({ queryInterface, transaction }) => {
    if (await tableExists(queryInterface, tableName, transaction)) {
      await queryInterface.dropTable(tableName, { transaction })
    }
  },
}
