'use strict'

module.exports = {
  name: '20260705_000002_create_abonos_factura',

  up: async ({ queryInterface, Sequelize }) => {
    // Nuevo estado para facturas a crédito con abonos parciales.
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_facturas_estado" ADD VALUE IF NOT EXISTS 'parcial' BEFORE 'pagada'
    `)

    const facturasDesc = await queryInterface.describeTable('facturas')
    if (!facturasDesc.saldoPendiente) {
      // Default 0 y null para históricas: ambas se leen como "sin saldo".
      await queryInterface.addColumn('facturas', 'saldoPendiente', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      })

      // Índice parcial: cuentas por cobrar consulta solo facturas con saldo.
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS facturas_clinica_saldo_pendiente_idx
        ON facturas ("clinicaId") WHERE "saldoPendiente" > 0
      `)
    }

    const tableNames = await queryInterface.showAllTables()
    if (!tableNames.includes('abonos_factura')) {
      await queryInterface.createTable('abonos_factura', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        monto: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
        },
        metodoPago: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        observaciones: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        facturaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'facturas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        cajaTurnoId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'caja_turnos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        usuarioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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
      })

      await queryInterface.addIndex('abonos_factura', ['facturaId'], {
        name: 'abonos_factura_factura_idx',
      })
      await queryInterface.addIndex('abonos_factura', ['clinicaId', 'createdAt'], {
        name: 'abonos_factura_clinica_fecha_idx',
      })
      await queryInterface.addIndex('abonos_factura', ['cajaTurnoId'], {
        name: 'abonos_factura_caja_turno_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    // El valor de ENUM 'parcial' no se puede remover en Postgres sin recrear
    // el tipo; se deja (inofensivo si no hay filas que lo usen).
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('abonos_factura')) {
      await queryInterface.dropTable('abonos_factura')
    }

    const facturasDesc = await queryInterface.describeTable('facturas')
    if (facturasDesc.saldoPendiente) {
      await queryInterface.sequelize
        .query('DROP INDEX IF EXISTS facturas_clinica_saldo_pendiente_idx')
        .catch(() => {})
      await queryInterface.removeColumn('facturas', 'saldoPendiente')
    }
  },
}
