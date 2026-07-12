'use strict'

module.exports = {
  name: '20260711_000001_enable_unaccent_extension',

  up: async ({ sequelize }) => {
    // Permite busquedas insensibles a tildes: unaccent('León') ILIKE unaccent('%leon%')
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS unaccent')
  },

  down: async ({ sequelize }) => {
    await sequelize.query('DROP EXTENSION IF EXISTS unaccent')
  },
}
