'use strict'

module.exports = {
  name: '20260701_000002_create_facturas_compra',

  up: async ({ queryInterface, Sequelize }) => {
    const tableNames = await queryInterface.showAllTables()

    if (!tableNames.includes('facturas_compra')) {
      await queryInterface.createTable('facturas_compra', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        numero: {
          type: Sequelize.STRING(80),
          allowNull: true,
        },
        proveedor: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        fecha: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        estado: {
          type: Sequelize.ENUM('borrador', 'confirmada', 'anulada'),
          allowNull: false,
          defaultValue: 'borrador',
        },
        observaciones: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        total: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        clinicaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'clinicas', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        usuarioId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
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

      await queryInterface.addIndex('facturas_compra', ['clinicaId', 'estado'], {
        name: 'facturas_compra_clinica_estado_idx',
      })
      await queryInterface.addIndex('facturas_compra', ['clinicaId', 'fecha'], {
        name: 'facturas_compra_clinica_fecha_idx',
      })
    }

    if (!tableNames.includes('factura_compra_items')) {
      await queryInterface.createTable('factura_compra_items', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        facturaCompraId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'facturas_compra', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        productoId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'productos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        cantidad: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        precioUnitario: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        subtotal: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
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

      await queryInterface.addIndex('factura_compra_items', ['facturaCompraId'], {
        name: 'factura_compra_items_factura_idx',
      })
    }

    // Agregar facturaCompraId a movimientos_inventario si no existe
    const movimientosDesc = await queryInterface.describeTable('movimientos_inventario')
    if (!movimientosDesc.facturaCompraId) {
      await queryInterface.addColumn('movimientos_inventario', 'facturaCompraId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'facturas_compra', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const movimientosDesc = await queryInterface.describeTable('movimientos_inventario')
    if (movimientosDesc.facturaCompraId) {
      await queryInterface.removeColumn('movimientos_inventario', 'facturaCompraId')
    }

    const tableNames = await queryInterface.showAllTables()
    if (tableNames.includes('factura_compra_items')) {
      await queryInterface.dropTable('factura_compra_items')
    }
    if (tableNames.includes('facturas_compra')) {
      await queryInterface.dropTable('facturas_compra')
    }
  },
}
