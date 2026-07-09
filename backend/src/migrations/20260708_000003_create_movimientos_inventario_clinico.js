'use strict'

module.exports = {
  name: '20260708_000003_create_movimientos_inventario_clinico',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('movimientos_inventario_clinico')) {
      await queryInterface.createTable('movimientos_inventario_clinico', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        tipo: {
          type: Sequelize.ENUM('entrada', 'salida', 'ajuste'),
          allowNull: false,
        },
        cantidad: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        stockAnterior: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        stockNuevo: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        motivo: {
          type: Sequelize.ENUM(
            'inventario_inicial',
            'compra',
            'uso_servicio',
            'ajuste_inventario',
            'vencimiento',
            'devolucion',
            'otro'
          ),
          allowNull: false,
        },
        observaciones: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        precioUnitario: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        cantidadPresentacion: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        unidadPresentacion: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        precioPresentacion: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        insumoClinicoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'insumos_clinicos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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
        facturaId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'facturas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        servicioClinicoId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'servicios_clinicos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      })

      await queryInterface.addIndex('movimientos_inventario_clinico', ['insumoClinicoId'], {
        name: 'movimientos_inv_clinico_insumo_idx',
      })
      await queryInterface.addIndex('movimientos_inventario_clinico', ['clinicaId', 'createdAt'], {
        name: 'movimientos_inv_clinico_clinica_fecha_idx',
      })
      await queryInterface.addIndex('movimientos_inventario_clinico', ['motivo'], {
        name: 'movimientos_inv_clinico_motivo_idx',
      })
      await queryInterface.addIndex('movimientos_inventario_clinico', ['facturaId'], {
        name: 'movimientos_inv_clinico_factura_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('movimientos_inventario_clinico')) {
      await queryInterface.dropTable('movimientos_inventario_clinico')
    }
  },
}
