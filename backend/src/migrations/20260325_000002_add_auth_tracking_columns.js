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
  name: '20260325_000002_add_auth_tracking_columns',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    if (await tableExists(queryInterface, 'usuarios', transaction)) {
      await ensureColumn({
        queryInterface,
        tableName: 'usuarios',
        columnName: 'rolesAdicionales',
        definition: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          defaultValue: [],
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'usuarios',
        columnName: 'intentosFallidos',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'usuarios',
        columnName: 'bloqueadoHasta',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'usuarios',
        columnName: 'ultimoAcceso',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })
    }

    if (await tableExists(queryInterface, 'clinicas', transaction)) {
      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'intentosFallidos',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'bloqueadoHasta',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })

      await ensureColumn({
        queryInterface,
        tableName: 'clinicas',
        columnName: 'ultimoAcceso',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        transaction,
      })
    }
  },

  down: async () => {
    // Esta migracion es aditiva y segura de conservar.
  },
}
