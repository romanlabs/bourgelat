const { existeTabla } = require('../config/migrations')

module.exports = {
  name: '20260327_000004_align_subscription_plans_with_freemium',

  up: async ({ queryInterface, sequelize, transaction }) => {
    if (!(await existeTabla(queryInterface, 'suscripciones'))) {
      return
    }

    await sequelize.query(
      `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'enum_suscripciones_plan'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'enum_suscripciones_plan_new'
          ) THEN
            DROP TYPE "enum_suscripciones_plan_new";
          END IF;

          CREATE TYPE "enum_suscripciones_plan_new" AS ENUM (
            'inicio',
            'clinica',
            'profesional',
            'personalizado'
          );
        END IF;
      END
      $$;
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "suscripciones"
      ALTER COLUMN "plan" DROP DEFAULT;
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "suscripciones"
      ALTER COLUMN "plan" TYPE "enum_suscripciones_plan_new"
      USING (
        CASE
          WHEN "plan"::text = 'basico' THEN 'clinica'
          WHEN "plan"::text = 'enterprise' THEN 'personalizado'
          ELSE "plan"::text
        END
      )::"enum_suscripciones_plan_new";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      DROP TYPE "enum_suscripciones_plan";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TYPE "enum_suscripciones_plan_new" RENAME TO "enum_suscripciones_plan";
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "suscripciones"
      ALTER COLUMN "plan" SET DEFAULT 'inicio';
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "suscripciones"
      ALTER COLUMN "estado" SET DEFAULT 'activa';
      `,
      { transaction }
    )
  },

  down: async () => {
    // Se conserva el nuevo esquema de planes para evitar perdida o remapeo inverso de datos.
  },
}
