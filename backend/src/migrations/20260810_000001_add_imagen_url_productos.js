'use strict'

module.exports = {
  name: '20260810_000001_add_imagen_url_productos',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE productos
        ADD COLUMN IF NOT EXISTS "imagenUrl" VARCHAR(255);
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE productos DROP COLUMN IF EXISTS "imagenUrl";
    `)
  },
}
