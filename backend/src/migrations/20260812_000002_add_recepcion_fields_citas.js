'use strict'

const { existeTabla } = require('../config/migrations')

module.exports = {
  name: '20260812_000002_add_recepcion_fields_citas',

  up: async ({ queryInterface, sequelize, transaction }) => {
    if (!(await existeTabla(queryInterface, 'citas'))) {
      return
    }

    // ── Estado: agregar 'en_atencion' recreando el ENUM (el runner corre cada
    // migracion en una transaccion, y ALTER TYPE ... ADD VALUE no es transaccional
    // en versiones de Postgres anteriores a la 12) ──────────────────────────
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
          'en_atencion',
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

    await sequelize.query(
      `
      ALTER TABLE "citas"
      ALTER COLUMN "estado" TYPE "enum_citas_estado_new"
      USING ("estado"::text)::"enum_citas_estado_new";
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

    // ── Campos de recepcion ─────────────────────────────────────────────
    await sequelize.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_citas_origen') THEN
          CREATE TYPE "enum_citas_origen" AS ENUM ('programada', 'walk_in');
        END IF;
      END
      $$;
      `,
      { transaction }
    )

    await sequelize.query(
      `
      ALTER TABLE "citas"
        ADD COLUMN IF NOT EXISTS "origen" "enum_citas_origen" NOT NULL DEFAULT 'programada',
        ADD COLUMN IF NOT EXISTS "consultorioId" UUID NULL REFERENCES "consultorios" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "horaLlegada" TIME NULL,
        ADD COLUMN IF NOT EXISTS "horaInicioAtencion" TIME NULL;
      `,
      { transaction }
    )

    // Backfill: las citas historicas ordenan por horaInicio si no tienen horaLlegada
    await sequelize.query(
      `
      UPDATE "citas" SET "horaLlegada" = "horaInicio" WHERE "horaLlegada" IS NULL;
      `,
      { transaction }
    )

    await sequelize.query(
      `
      CREATE INDEX IF NOT EXISTS "citas_clinica_fecha_estado_idx" ON "citas" ("clinicaId", "fecha", "estado");
      CREATE INDEX IF NOT EXISTS "citas_clinica_consultorio_fecha_idx" ON "citas" ("clinicaId", "consultorioId", "fecha");
      `,
      { transaction }
    )
  },

  down: async () => {
    // Se conserva el nuevo flujo de estados y campos de recepcion para evitar perdida de datos.
  },
}
