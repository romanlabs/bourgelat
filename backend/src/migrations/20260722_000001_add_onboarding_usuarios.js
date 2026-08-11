'use strict'

module.exports = {
  name: '20260722_000001_add_onboarding_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS onboarding JSONB;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS onboarding')
  },
}
