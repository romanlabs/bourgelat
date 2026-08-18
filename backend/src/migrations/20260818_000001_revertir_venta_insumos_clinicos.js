'use strict'

// El inventario clinico deja de ser mercancia: sus insumos no se facturan al
// tutor, se consumen. Esta migracion retira del esquema todo lo que existia
// unicamente para venderlos (precio de venta, modo de consumo y el vinculo del
// insumo con la factura). El costo del consumo pasa a reflejarse como gasto,
// no como linea de venta.
//
// Se conserva historias_clinicas.facturaId: la consulta se sigue cobrando
// (servicios y plan farmacologico) y ese campo es lo que impide cobrarla dos veces.
//
// Todo va en SQL plano y no con queryInterface: removeColumn/addColumn hacen un
// describeTable interno en OTRA conexion del pool, que se queda esperando el
// lock que esta misma transaccion ya tomo sobre la tabla. La transaccion queda
// idle y el idle_in_transaction_session_timeout (10s) la mata.
module.exports = {
  name: '20260818_000001_revertir_venta_insumos_clinicos',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE "factura_items" DROP COLUMN IF EXISTS "insumoClinicoId"`,
      { transaction }
    )

    // Un item facturado con tipo 'insumo' es dinero ya cobrado a un cliente:
    // reasignarlo en silencio falsearia una factura emitida. Si existe alguno,
    // la migracion se detiene para que se resuelva a mano.
    const [filasInsumo] = await sequelize.query(
      `SELECT count(*)::int AS total FROM factura_items WHERE tipo = 'insumo'`,
      { transaction }
    )

    if (filasInsumo[0]?.total > 0) {
      throw new Error(
        `Hay ${filasInsumo[0].total} factura_items con tipo 'insumo'. ` +
        'Revisalos y reasignalos antes de correr esta migracion: no se pueden convertir automaticamente.'
      )
    }

    // PostgreSQL no soporta eliminar valores de un ENUM, hay que recrear el tipo.
    await sequelize.query(
      `ALTER TABLE "factura_items" ALTER COLUMN "tipo" DROP DEFAULT`,
      { transaction }
    )
    await sequelize.query(
      `CREATE TYPE "enum_factura_items_tipo_new" AS ENUM ('producto', 'servicio')`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_items" ALTER COLUMN "tipo"
       TYPE "enum_factura_items_tipo_new"
       USING "tipo"::text::"enum_factura_items_tipo_new"`,
      { transaction }
    )
    await sequelize.query(`DROP TYPE "enum_factura_items_tipo"`, { transaction })
    await sequelize.query(
      `ALTER TYPE "enum_factura_items_tipo_new" RENAME TO "enum_factura_items_tipo"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_items" ALTER COLUMN "tipo" SET DEFAULT 'servicio'`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "insumos_clinicos" DROP COLUMN IF EXISTS "precioVenta"`,
      { transaction }
    )

    // Solo servia para separar lo que se cobraba aparte de lo que se cobraba
    // dentro de un servicio. Sin venta de insumos, la distincion sobra.
    await sequelize.query(
      `ALTER TABLE "insumos_clinicos" DROP COLUMN IF EXISTS "modoConsumo"`,
      { transaction }
    )
    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_insumos_clinicos_modoConsumo"`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `DO $$ BEGIN
         CREATE TYPE "enum_insumos_clinicos_modoConsumo" AS ENUM ('por_dosis', 'por_receta');
       EXCEPTION WHEN duplicate_object THEN NULL;
       END $$`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "insumos_clinicos"
       ADD COLUMN IF NOT EXISTS "modoConsumo" "enum_insumos_clinicos_modoConsumo"
       NOT NULL DEFAULT 'por_receta'`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "insumos_clinicos"
       ADD COLUMN IF NOT EXISTS "precioVenta" DECIMAL(10, 2) NOT NULL DEFAULT 0`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TYPE "enum_factura_items_tipo" ADD VALUE IF NOT EXISTS 'insumo'`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_items"
       ADD COLUMN IF NOT EXISTS "insumoClinicoId" UUID
       REFERENCES "insumos_clinicos" ("id") ON UPDATE CASCADE ON DELETE SET NULL`,
      { transaction }
    )
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "factura_items_insumo_clinico_idx"
       ON "factura_items" ("insumoClinicoId")`,
      { transaction }
    )
  },
}
