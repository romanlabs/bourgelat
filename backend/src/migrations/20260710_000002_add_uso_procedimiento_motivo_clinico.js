'use strict'

module.exports = {
  name: '20260710_000002_add_uso_procedimiento_motivo_clinico',

  up: async ({ sequelize }) => {
    await sequelize.query(
      `ALTER TYPE "enum_movimientos_inventario_clinico_motivo" ADD VALUE IF NOT EXISTS 'uso_procedimiento'`
    )
  },

  down: async () => {
    // PostgreSQL no permite eliminar valores de un ENUM — esta migración no es reversible
  },
}
