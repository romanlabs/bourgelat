'use strict'

module.exports = {
  name: '20260813_000002_add_almacenamiento_usado_clinicas',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE clinicas
         ADD COLUMN IF NOT EXISTS "almacenamientoUsadoMB" NUMERIC(12,2) NOT NULL DEFAULT 0;`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE clinicas DROP COLUMN IF EXISTS "almacenamientoUsadoMB";`,
      { transaction }
    )
  },
}
