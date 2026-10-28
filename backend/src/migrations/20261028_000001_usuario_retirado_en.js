'use strict'

// Fecha en que el usuario salió del equipo. Un usuario con actividad no se
// borra (sus historias, citas y ventas lo referencian): se retira, se le quitan
// los datos de contacto y se conserva el nombre para saber quién hizo qué.
module.exports = {
  name: '20261028_000001_usuario_retirado_en',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const usuarios = await queryInterface.describeTable('usuarios', { transaction })
    if (!usuarios.retiradoEn) {
      await queryInterface.addColumn('usuarios', 'retiradoEn', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction })
    }
  },

  down: async ({ queryInterface, transaction }) => {
    const usuarios = await queryInterface.describeTable('usuarios', { transaction })
    if (usuarios.retiradoEn) {
      await queryInterface.removeColumn('usuarios', 'retiradoEn', { transaction })
    }
  },
}
