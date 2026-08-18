'use strict'

module.exports = {
  name: '20260817_000001_add_tratamiento_intrahospitalario',

  up: async ({ queryInterface, Sequelize }) => {
    const historiasDesc = await queryInterface.describeTable('historias_clinicas')

    // Separa los dos consumos de una consulta: este campo guarda lo aplicado
    // dentro de la clinica (descuenta insumos_clinicos al cerrar la historia),
    // mientras `medicamentos` guarda la formula que el tutor se lleva
    // (descuenta productos al facturarse).
    if (!historiasDesc.tratamientoIntrahospitalario) {
      await queryInterface.addColumn('historias_clinicas', 'tratamientoIntrahospitalario', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      })
    }
  },

  down: async ({ queryInterface }) => {
    const historiasDesc = await queryInterface.describeTable('historias_clinicas')
    if (historiasDesc.tratamientoIntrahospitalario) {
      await queryInterface.removeColumn('historias_clinicas', 'tratamientoIntrahospitalario')
    }
  },
}
