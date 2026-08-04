const { existeTabla } = require('../config/migrations')

module.exports = {
  name: '20260730_000001_simplify_citas_estado',

  up: async ({ queryInterface, sequelize, transaction }) => {
    if (!(await existeTabla(queryInterface, 'citas'))) {
      return
    }

    await sequelize.query(
      `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'enum_citas_estado_new'
        ) THEN
          DROP TYPE "enum_citas_estado_new";
        END IF;

        CREATE TYPE "enum_citas_estado_new" AS ENUM (
          'programada',
          'en_espera',
          'completada',
          'cancelada',
          'no_asistio'
        );
      END
      $$;
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "citas"
      ALTER COLUMN "estado" DROP DEFAULT;
      `,
      { transaction }
    )

    // confirmada -> programada (aun no atendida); en_curso -> en_espera (paciente ya en atencion)
    await sequelize.query(
      `
      ALTER TABLE "citas"
      ALTER COLUMN "estado" TYPE "enum_citas_estado_new"
      USING (
        CASE
          WHEN "estado"::text = 'confirmada' THEN 'programada'
          WHEN "estado"::text = 'en_curso' THEN 'en_espera'
          ELSE "estado"::text
        END
      )::"enum_citas_estado_new";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      DROP TYPE "enum_citas_estado";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TYPE "enum_citas_estado_new" RENAME TO "enum_citas_estado";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "citas"
      ALTER COLUMN "estado" SET DEFAULT 'programada';
      `,
      { transaction }
    )
  },

  down: async () => {
    // Se conserva el nuevo flujo de estados para evitar perdida o remapeo inverso de datos.
  },
}
