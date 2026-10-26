'use strict'

// Barrio opcional del tutor, aparte de la dirección. En plano como la ciudad:
// solo no identifica a nadie.
module.exports = {
  name: '20261026_000002_propietario_barrio',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const propietarios = await queryInterface.describeTable('propietarios', { transaction })
    if (!propietarios.barrio) {
      await queryInterface.addColumn('propietarios', 'barrio', {
        type: Sequelize.STRING(120),
        allowNull: true,
      }, { transaction })
    }
  },

  down: async ({ queryInterface, transaction }) => {
    const propietarios = await queryInterface.describeTable('propietarios', { transaction })
    if (propietarios.barrio) {
      await queryInterface.removeColumn('propietarios', 'barrio', { transaction })
    }
  },
}
