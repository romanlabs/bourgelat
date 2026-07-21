'use strict'

module.exports = {
  name: '20260718_000001_add_perfil_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS foto VARCHAR(500),
        ADD COLUMN IF NOT EXISTS cargo VARCHAR(120),
        ADD COLUMN IF NOT EXISTS "tarjetaProfesional" VARCHAR(60);
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS "tarjetaProfesional"')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS cargo')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS foto')
  },
}
