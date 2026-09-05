'use strict'

// Una factura de compra podia alimentar unicamente el inventario de ventas:
// `factura_compra_items.productoId` era NOT NULL con FK dura a `productos`.
// Las clinicas terminaban registrando dos veces la misma compra (una en la
// factura y otra a mano en el modulo clinico). Esta migracion abre el item a
// dos destinos y lo obliga a apuntar a exactamente uno de ellos.
//
// Todo va en SQL plano y no con queryInterface: removeColumn/addColumn hacen un
// describeTable interno en OTRA conexion del pool, que se queda esperando el
// lock que esta misma transaccion ya tomo sobre la tabla (ver
// 20260818_000001_revertir_venta_insumos_clinicos).
module.exports = {
  name: '20260901_000001_add_destino_inventario_factura_compra',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `DO $$ BEGIN
         CREATE TYPE "enum_factura_compra_items_destinoInventario" AS ENUM ('ventas', 'clinico');
       EXCEPTION WHEN duplicate_object THEN NULL;
       END $$`,
      { transaction }
    )

    // Las filas existentes son todas de ventas, el default las cubre.
    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       ADD COLUMN IF NOT EXISTS "destinoInventario"
       "enum_factura_compra_items_destinoInventario" NOT NULL DEFAULT 'ventas'`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "factura_compra_items" ALTER COLUMN "productoId" DROP NOT NULL`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       ADD COLUMN IF NOT EXISTS "insumoClinicoId" UUID
       REFERENCES "insumos_clinicos" ("id") ON UPDATE CASCADE ON DELETE RESTRICT`,
      { transaction }
    )

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "factura_compra_items_insumo_clinico_idx"
       ON "factura_compra_items" ("insumoClinicoId")`,
      { transaction }
    )

    // El destino y la referencia no pueden contradecirse: un item de ventas
    // apunta solo a un producto y uno clinico solo a un insumo.
    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       DROP CONSTRAINT IF EXISTS "factura_compra_items_destino_ref_chk"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       ADD CONSTRAINT "factura_compra_items_destino_ref_chk" CHECK (
         ("destinoInventario" = 'ventas'
           AND "productoId" IS NOT NULL AND "insumoClinicoId" IS NULL)
         OR ("destinoInventario" = 'clinico'
           AND "insumoClinicoId" IS NOT NULL AND "productoId" IS NULL)
       )`,
      { transaction }
    )

    // Espejo de lo que ya existe en movimientos_inventario: permite rastrear
    // que compra origino la entrada y revertirla al anular.
    await sequelize.query(
      `ALTER TABLE "movimientos_inventario_clinico"
       ADD COLUMN IF NOT EXISTS "facturaCompraId" UUID
       REFERENCES "facturas_compra" ("id") ON UPDATE CASCADE ON DELETE SET NULL`,
      { transaction }
    )

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "movimientos_inventario_clinico_factura_compra_idx"
       ON "movimientos_inventario_clinico" ("facturaCompraId")`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `DROP INDEX IF EXISTS "movimientos_inventario_clinico_factura_compra_idx"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "movimientos_inventario_clinico" DROP COLUMN IF EXISTS "facturaCompraId"`,
      { transaction }
    )

    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       DROP CONSTRAINT IF EXISTS "factura_compra_items_destino_ref_chk"`,
      { transaction }
    )

    // Revertir a un esquema solo-ventas exige que no queden items clinicos:
    // borrarlos en silencio perderia el detalle de compras ya registradas.
    const [filasClinicas] = await sequelize.query(
      `SELECT count(*)::int AS total FROM factura_compra_items WHERE "destinoInventario" = 'clinico'`,
      { transaction }
    )

    if (filasClinicas[0]?.total > 0) {
      throw new Error(
        `Hay ${filasClinicas[0].total} items de factura de compra con destino clinico. ` +
        'Resuelvelos a mano antes de revertir esta migracion.'
      )
    }

    await sequelize.query(
      `DROP INDEX IF EXISTS "factura_compra_items_insumo_clinico_idx"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items" DROP COLUMN IF EXISTS "insumoClinicoId"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items" DROP COLUMN IF EXISTS "destinoInventario"`,
      { transaction }
    )
    await sequelize.query(
      `DROP TYPE IF EXISTS "enum_factura_compra_items_destinoInventario"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items" ALTER COLUMN "productoId" SET NOT NULL`,
      { transaction }
    )
  },
}
