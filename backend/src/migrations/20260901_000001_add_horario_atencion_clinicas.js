'use strict'

module.exports = {
  name: '20260901_000001_add_horario_atencion_clinicas',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE clinicas
         ADD COLUMN IF NOT EXISTS "horarioAtencion" JSONB;`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE clinicas DROP COLUMN IF EXISTS "horarioAtencion";`,
      { transaction }
    )
  },
}
