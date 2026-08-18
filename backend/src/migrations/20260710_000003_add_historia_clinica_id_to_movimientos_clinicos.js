'use strict'

module.exports = {
  name: '20260710_000003_add_historia_clinica_id_to_movimientos_clinicos',

  up: async ({ queryInterface, Sequelize }) => {
    const movimientosDesc = await queryInterface.describeTable('movimientos_inventario_clinico')

    if (!movimientosDesc.historiaClinicaId) {
      await queryInterface.addColumn('movimientos_inventario_clinico', 'historiaClinicaId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'historias_clinicas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      })

      await queryInterface.addIndex('movimientos_inventario_clinico', ['historiaClinicaId'], {
        name: 'movimientos_inv_clinico_historia_idx',
      })
    }
  },

  down: async ({ queryInterface }) => {
    const movimientosDesc = await queryInterface.describeTable('movimientos_inventario_clinico')
    if (movimientosDesc.historiaClinicaId) {
      await queryInterface.removeColumn('movimientos_inventario_clinico', 'historiaClinicaId')
    }
  },
}
