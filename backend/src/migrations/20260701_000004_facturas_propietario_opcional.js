'use strict'

module.exports = {
  name: '20260701_000004_facturas_propietario_opcional',

  up: async ({ queryInterface, Sequelize }) => {
    // Venta de mostrador: la factura interna ya no exige un propietario asociado.
    await queryInterface.changeColumn('facturas', 'propietarioId', {
      type: Sequelize.UUID,
      allowNull: true,
    })
  },

  down: async ({ queryInterface, Sequelize }) => {
    await queryInterface.changeColumn('facturas', 'propietarioId', {
      type: Sequelize.UUID,
      allowNull: false,
    })
  },
}
