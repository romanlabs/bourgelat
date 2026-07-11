'use strict'

module.exports = {
  name: '20260701_000003_add_fecha_pago_facturas_compra',

  up: async ({ queryInterface, Sequelize }) => {
    const desc = await queryInterface.describeTable('facturas_compra')

    if (!desc.fechaPagoFinal) {
      await queryInterface.addColumn('facturas_compra', 'fechaPagoFinal', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      })
    }

    if (!desc.pagada) {
      await queryInterface.addColumn('facturas_compra', 'pagada', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      })
    }

    if (!desc.fechaPago) {
      await queryInterface.addColumn('facturas_compra', 'fechaPago', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      })
    }
  },

  down: async ({ queryInterface }) => {
    const desc = await queryInterface.describeTable('facturas_compra')
    if (desc.fechaPago) await queryInterface.removeColumn('facturas_compra', 'fechaPago')
    if (desc.pagada) await queryInterface.removeColumn('facturas_compra', 'pagada')
    if (desc.fechaPagoFinal) await queryInterface.removeColumn('facturas_compra', 'fechaPagoFinal')
  },
}
