'use strict'

module.exports = {
  name: '20260701_000001_add_inventario_inicial_motivo',

  up: async ({ sequelize }) => {
    await sequelize.query(
      `ALTER TYPE "enum_movimientos_inventario_motivo" ADD VALUE IF NOT EXISTS 'inventario_inicial'`
    )
  },

  down: async () => {
    // PostgreSQL no permite eliminar valores de un ENUM — esta migración no es reversible
  },
}
