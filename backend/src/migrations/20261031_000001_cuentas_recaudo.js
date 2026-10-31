'use strict'

// Cuentas donde cada clínica recibe transferencias, y a cuál entró cada venta
// o abono por transferencia. La columna va cifrada como metodoPago (en claro
// delataría que se pagó por transferencia), así que es TEXT y sin llave
// foránea: la cuenta se valida al cobrar y el reporte agrupa en memoria.
module.exports = {
  name: '20261031_000001_cuentas_recaudo',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('cuentas_recaudo')) {
      await queryInterface.createTable('cuentas_recaudo', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        nombre: {
          type: Sequelize.STRING(60),
          allowNull: false,
        },
        activo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        clinicaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'clinicas', key: 'id' },
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
      })

      await queryInterface.addIndex('cuentas_recaudo', ['clinicaId', 'activo'], {
        name: 'cuentas_recaudo_clinica_activo_idx',
      })
      await queryInterface.addIndex('cuentas_recaudo', ['clinicaId', 'nombre'], {
        name: 'cuentas_recaudo_clinica_nombre_idx',
        unique: true,
      })
    }

    for (const tabla of ['facturas', 'abonos_factura']) {
      const columnas = await queryInterface.describeTable(tabla)
      if (!columnas.cuentaRecaudoId) {
        await queryInterface.addColumn(tabla, 'cuentaRecaudoId', {
          type: Sequelize.TEXT,
          allowNull: true,
        })
      }
    }
  },

  down: async ({ queryInterface }) => {
    for (const tabla of ['facturas', 'abonos_factura']) {
      const columnas = await queryInterface.describeTable(tabla)
      if (columnas.cuentaRecaudoId) await queryInterface.removeColumn(tabla, 'cuentaRecaudoId')
    }
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('cuentas_recaudo')) {
      await queryInterface.dropTable('cuentas_recaudo')
    }
  },
}
