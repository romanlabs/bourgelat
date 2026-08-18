'use strict'

module.exports = {
  name: '20260816_000001_add_precio_venta_insumo_y_vinculos_factura',

  up: async ({ queryInterface, Sequelize }) => {
    const insumosDesc = await queryInterface.describeTable('insumos_clinicos')

    // Hasta ahora el insumo solo tenia costo: se cobraba dentro del precio del
    // servicio. Para facturarlo como linea propia necesita precio de venta.
    if (!insumosDesc.precioVenta) {
      await queryInterface.addColumn('insumos_clinicos', 'precioVenta', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      })
    }

    const facturaItemsDesc = await queryInterface.describeTable('factura_items')

    if (!facturaItemsDesc.insumoClinicoId) {
      await queryInterface.addColumn('factura_items', 'insumoClinicoId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'insumos_clinicos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })

      await queryInterface.addIndex('factura_items', ['insumoClinicoId'], {
        name: 'factura_items_insumo_clinico_idx',
      })
    }

    const historiasDesc = await queryInterface.describeTable('historias_clinicas')

    // Marca que la consulta ya se cobro, para impedir doble facturacion.
    if (!historiasDesc.facturaId) {
      await queryInterface.addColumn('historias_clinicas', 'facturaId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'facturas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })

      await queryInterface.addIndex('historias_clinicas', ['facturaId'], {
        name: 'historias_clinicas_factura_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const historiasDesc = await queryInterface.describeTable('historias_clinicas')
    if (historiasDesc.facturaId) {
      await queryInterface.removeColumn('historias_clinicas', 'facturaId')
    }

    const facturaItemsDesc = await queryInterface.describeTable('factura_items')
    if (facturaItemsDesc.insumoClinicoId) {
      await queryInterface.removeColumn('factura_items', 'insumoClinicoId')
    }

    const insumosDesc = await queryInterface.describeTable('insumos_clinicos')
    if (insumosDesc.precioVenta) {
      await queryInterface.removeColumn('insumos_clinicos', 'precioVenta')
    }
  },
}
