'use strict'

module.exports = {
  name: '20260710_000001_add_modo_consumo_to_insumos_clinicos',

  up: async ({ queryInterface, Sequelize, sequelize }) => {
    const insumosDesc = await queryInterface.describeTable('insumos_clinicos')

    if (!insumosDesc.modoConsumo) {
      await queryInterface.addColumn('insumos_clinicos', 'modoConsumo', {
        type: Sequelize.ENUM('por_dosis', 'por_receta'),
        allowNull: false,
        defaultValue: 'por_receta',
      })

      // Los insumos de dosis exacta se descuentan desde la historia clinica
      await sequelize.query(
        `UPDATE insumos_clinicos SET "modoConsumo" = 'por_dosis'
         WHERE categoria IN ('medicamento', 'vacuna', 'antiparasitario')`
      )
    }
  },

  down: async ({ queryInterface, sequelize }) => {
    const insumosDesc = await queryInterface.describeTable('insumos_clinicos')
    if (insumosDesc.modoConsumo) {
      await queryInterface.removeColumn('insumos_clinicos', 'modoConsumo')
      await sequelize.query('DROP TYPE IF EXISTS "enum_insumos_clinicos_modoConsumo"')
    }
  },
}
