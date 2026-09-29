'use strict'

// Cada item de compra guarda el vencimiento y lote de lo que llego. El producto
// solo conserva el mas cercano; estas filas permiten sugerir el siguiente
// cuando ese se agota o vence.
//
// SQL plano por la misma razon que 20260901_000001_add_destino_inventario_factura_compra.
module.exports = {
  name: '20260929_000001_add_vencimiento_factura_compra_items',

  up: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       ADD COLUMN IF NOT EXISTS "fechaVencimiento" DATE`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items"
       ADD COLUMN IF NOT EXISTS "lote" VARCHAR(80)`,
      { transaction }
    )
  },

  down: async ({ sequelize, transaction }) => {
    await sequelize.query(
      `ALTER TABLE "factura_compra_items" DROP COLUMN IF EXISTS "lote"`,
      { transaction }
    )
    await sequelize.query(
      `ALTER TABLE "factura_compra_items" DROP COLUMN IF EXISTS "fechaVencimiento"`,
      { transaction }
    )
  },
}
