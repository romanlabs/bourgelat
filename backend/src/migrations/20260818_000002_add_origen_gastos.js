'use strict'

// Los insumos consumidos en una historia clinica dejan de facturarse y pasan a
// registrarse como gasto. Ese gasto lo crea el sistema al cerrar la historia,
// no un usuario: 'origen' lo distingue de los que se digitan a mano y
// 'historiaClinicaId' lo ata a la consulta que lo produjo.
//
// SQL plano por el mismo motivo que la migracion anterior: queryInterface hace
// un describeTable en otra conexion y choca con el lock de esta transaccion.
module.exports = {
  name: '20260818_000002_add_origen_gastos',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `DO $$ BEGIN
         CREATE TYPE "enum_gastos_origen" AS ENUM ('manual', 'consumo_insumos');
       EXCEPTION WHEN duplicate_object THEN NULL;
       END $$`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "gastos"
       ADD COLUMN IF NOT EXISTS "origen" "enum_gastos_origen" NOT NULL DEFAULT 'manual'`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "gastos"
       ADD COLUMN IF NOT EXISTS "historiaClinicaId" UUID
       REFERENCES "historias_clinicas" ("id") ON UPDATE CASCADE ON DELETE SET NULL`,
      { transaction }
    )

    // Una historia solo puede generar un gasto de consumo. El bloqueo ya es
    // de una sola via, esto es la red por si alguna vez deja de serlo.
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "gastos_historia_consumo_uniq"
       ON "gastos" ("historiaClinicaId")
       WHERE "origen" = 'consumo_insumos'`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `DROP INDEX IF EXISTS "gastos_historia_consumo_uniq"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "gastos" DROP COLUMN IF EXISTS "historiaClinicaId"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "gastos" DROP COLUMN IF EXISTS "origen"`,
      { transaction }
    )
    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_gastos_origen"`,
      { transaction }
    )
  },
}
