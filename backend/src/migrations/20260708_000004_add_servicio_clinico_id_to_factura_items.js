'use strict'

module.exports = {
  name: '20260708_000004_add_servicio_clinico_id_to_factura_items',

  up: async ({ queryInterface, Sequelize }) => {
    const facturaItemsDesc = await queryInterface.describeTable('factura_items')

    if (!facturaItemsDesc.servicioClinicoId) {
      await queryInterface.addColumn('factura_items', 'servicioClinicoId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'servicios_clinicos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })

      await queryInterface.addIndex('factura_items', ['servicioClinicoId'], {
        name: 'factura_items_servicio_clinico_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const facturaItemsDesc = await queryInterface.describeTable('factura_items')
    if (facturaItemsDesc.servicioClinicoId) {
      await queryInterface.removeColumn('factura_items', 'servicioClinicoId')
    }
  },
}
