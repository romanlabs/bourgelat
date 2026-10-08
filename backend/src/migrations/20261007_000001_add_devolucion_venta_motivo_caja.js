'use strict'

module.exports = {
  name: '20261007_000001_add_devolucion_venta_motivo_caja',

  // Egreso que genera el sistema al anular una venta en efectivo cuyo turno ya
  // cerró: la devolución sale de la caja del turno abierto de quien anula.
  up: async ({ sequelize }) => {
    await sequelize.query(
      `ALTER TYPE "enum_movimientos_caja_motivo" ADD VALUE IF NOT EXISTS 'devolucion_venta'`
    )
  },

  down: async () => {
    // PostgreSQL no permite eliminar valores de un ENUM — esta migración no es reversible
  },
}
