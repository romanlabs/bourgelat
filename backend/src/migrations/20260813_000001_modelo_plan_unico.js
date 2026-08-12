'use strict'

// Migracion puramente aditiva. Postgres no permite eliminar valores de un ENUM
// sin recrear el tipo, y hay filas historicas apuntando a los planes viejos.

const FUNCIONALIDADES_COMPLETAS = [
  'citas',
  'historias',
  'antecedentes',
  'propietarios',
  'mascotas',
  'roles_base',
  'inventario',
  'facturacion_interna',
  'reportes_operativos',
  'reportes_completos',
  'exportables',
]

module.exports = {
  name: '20260813_000001_modelo_plan_unico',

  up: async ({ sequelize }) => {
    const funcionalidades = JSON.stringify(FUNCIONALIDADES_COMPLETAS)

    // 1. Valores nuevos de ENUM. ADD VALUE IF NOT EXISTS es idempotente.
    for (const plan of ['prueba', 'activo', 'cortesia']) {
      await sequelize.query(
        `ALTER TYPE "enum_suscripciones_plan" ADD VALUE IF NOT EXISTS '${plan}';`
      )
    }

    await sequelize.query(
      `ALTER TYPE "enum_suscripciones_estado" ADD VALUE IF NOT EXISTS 'solo_lectura';`
    )

    // 2. Columna del add-on DIAN.
    await sequelize.query(`
      ALTER TABLE suscripciones
        ADD COLUMN IF NOT EXISTS "documentosDianIncluidos" INTEGER NOT NULL DEFAULT 0;
    `)

    // 3. Default de plan.
    await sequelize.query(`
      ALTER TABLE suscripciones ALTER COLUMN plan SET DEFAULT 'prueba';
    `)

    // 4. Grandfathering: los pilotos del plan gratuito conservan acceso
    //    completo de por vida.
    await sequelize.query(`
      UPDATE suscripciones
         SET plan = 'cortesia',
             "fechaFin" = '2099-12-31',
             "limiteUsuarios" = 3,
             "almacenamientoMB" = 2048,
             "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan = 'inicio';
    `)

    // 5. Los planes pagos viejos pasan al plan unico conservando su vigencia.
    await sequelize.query(`
      UPDATE suscripciones
         SET plan = 'activo',
             "limiteUsuarios" = GREATEST(COALESCE("limiteUsuarios", 3), 3),
             "almacenamientoMB" = 20480,
             "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan IN ('clinica', 'profesional');
    `)

    // 6. Personalizado conserva sus cupos negociados; solo se nivelan las
    //    funcionalidades y se libera el volumen.
    await sequelize.query(`
      UPDATE suscripciones
         SET "limiteMascotas" = NULL,
             funcionalidades = '${funcionalidades}'::jsonb
       WHERE plan = 'personalizado';
    `)
  },

  down: async ({ sequelize }) => {
    // Los valores de ENUM no se revierten: eliminarlos exige recrear el tipo y
    // reescribir la columna, que es justo el riesgo que esta migracion evita.
    await sequelize.query(`
      ALTER TABLE suscripciones ALTER COLUMN plan SET DEFAULT 'inicio';
    `)
    await sequelize.query(`
      ALTER TABLE suscripciones DROP COLUMN IF EXISTS "documentosDianIncluidos";
    `)
  },
}
