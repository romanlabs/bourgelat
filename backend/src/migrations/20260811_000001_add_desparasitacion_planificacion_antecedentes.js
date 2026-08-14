'use strict'

module.exports = {
  name: '20260811_000001_add_desparasitacion_planificacion_antecedentes',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE antecedentes_mascota
        ADD COLUMN IF NOT EXISTS "desparasitaciones" JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "planificaciones" JSONB NOT NULL DEFAULT '[]';
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE antecedentes_mascota
        DROP COLUMN IF EXISTS "desparasitaciones",
        DROP COLUMN IF EXISTS "planificaciones";
    `)
  },
}
