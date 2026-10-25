'use strict'

// Plazo opcional de la venta a crédito: fecha en que el cliente queda en
// pagar. Nullable: las ventas anteriores y el fiado sin plazo no vencen.
module.exports = {
  name: '20261025_000001_factura_vencimiento_credito',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const facturas = await queryInterface.describeTable('facturas', { transaction })
    if (!facturas.fechaVencimientoCredito) {
      await queryInterface.addColumn('facturas', 'fechaVencimientoCredito', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }, { transaction })
    }
  },

  down: async ({ queryInterface, transaction }) => {
    const facturas = await queryInterface.describeTable('facturas', { transaction })
    if (facturas.fechaVencimientoCredito) {
      await queryInterface.removeColumn('facturas', 'fechaVencimientoCredito', { transaction })
    }
  },
}
