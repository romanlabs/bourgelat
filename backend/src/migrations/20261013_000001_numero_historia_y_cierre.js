'use strict'

// Dos datos que pide la historia clinica impresa, siguiendo la logica de la
// historia clinica humana:
//
// 1. Numero de historia: consecutivo por clinica, uno por paciente y para
//    siempre. Los pacientes existentes se numeran por orden de registro
//    (incluidos los inactivos, para que un numero nunca se repita).
// 2. Hora de cierre: cuando se bloqueo la historia. Para las ya bloqueadas se
//    toma del registro de auditoria BLOQUEAR_HISTORIA_CLINICA; si ese registro
//    ya se limpio, queda vacia (no se inventa una hora).

module.exports = {
  name: '20261013_000001_numero_historia_y_cierre',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      'ALTER TABLE "mascotas" ADD COLUMN IF NOT EXISTS "numeroHistoria" INTEGER',
      { transaction }
    )
    await sequelize.query(
      `UPDATE "mascotas" m
          SET "numeroHistoria" = t.numero
         FROM (
           SELECT id, ROW_NUMBER() OVER (PARTITION BY "clinicaId" ORDER BY "createdAt", id) AS numero
             FROM "mascotas"
         ) t
        WHERE m.id = t.id AND m."numeroHistoria" IS NULL`,
      { transaction }
    )
    await sequelize.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "mascotas_clinica_numero_historia_unique" ON "mascotas" ("clinicaId", "numeroHistoria")',
      { transaction }
    )

    await sequelize.query(
      'ALTER TABLE "historias_clinicas" ADD COLUMN IF NOT EXISTS "bloqueadaEn" TIMESTAMP WITH TIME ZONE',
      { transaction }
    )
    await sequelize.query(
      `UPDATE "historias_clinicas" h
          SET "bloqueadaEn" = a.fecha
         FROM (
           SELECT "entidadId", MIN("createdAt") AS fecha
             FROM "auditoria_logs"
            WHERE accion = 'BLOQUEAR_HISTORIA_CLINICA' AND "entidadId" IS NOT NULL
            GROUP BY "entidadId"
         ) a
        WHERE h.id = a."entidadId" AND h.bloqueada = true AND h."bloqueadaEn" IS NULL`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query('ALTER TABLE "historias_clinicas" DROP COLUMN IF EXISTS "bloqueadaEn"', { transaction })
    await sequelize.query('DROP INDEX IF EXISTS "mascotas_clinica_numero_historia_unique"', { transaction })
    await sequelize.query('ALTER TABLE "mascotas" DROP COLUMN IF EXISTS "numeroHistoria"', { transaction })
  },
}
