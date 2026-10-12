'use strict'

module.exports = {
  name: '20261012_000001_drop_mascotas_microchip',

  // El microchip nunca tuvo campo en la app: se quita la columna y su índice.
  // Si alguna fila tiene un valor, la migración se detiene en vez de perderlo.
  up: async ({ sequelize, transaction }) => {
    const [[{ conValor }]] = await sequelize.query(
      `SELECT count(*)::int AS "conValor" FROM "mascotas" WHERE "microchip" IS NOT NULL AND btrim("microchip") <> ''`,
      { transaction }
    )
    if (conValor > 0) {
      throw new Error(`${conValor} mascota(s) tienen microchip registrado; revisar antes de borrar la columna`)
    }

    await sequelize.query('DROP INDEX IF EXISTS "mascotas_microchip_idx"', { transaction })
    await sequelize.query('ALTER TABLE "mascotas" DROP COLUMN IF EXISTS "microchip"', { transaction })
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query('ALTER TABLE "mascotas" ADD COLUMN IF NOT EXISTS "microchip" VARCHAR(255)', { transaction })
    await sequelize.query('CREATE INDEX IF NOT EXISTS "mascotas_microchip_idx" ON "mascotas" ("microchip")', { transaction })
  },
}
