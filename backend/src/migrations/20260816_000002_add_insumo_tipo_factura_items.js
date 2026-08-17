'use strict'

module.exports = {
  name: '20260816_000002_add_insumo_tipo_factura_items',

  up: async ({ sequelize }) => {
    // Va en su propia migracion: PostgreSQL no permite usar un valor de ENUM
    // recien agregado dentro de la misma transaccion que lo creo.
    await sequelize.query(
      `ALTER TYPE "enum_factura_items_tipo" ADD VALUE IF NOT EXISTS 'insumo'`
    )
  },

  down: async () => {
    // PostgreSQL no permite eliminar valores de un ENUM — esta migración no es reversible
  },
}
