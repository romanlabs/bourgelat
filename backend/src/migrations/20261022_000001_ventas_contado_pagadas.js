'use strict'

// Las ventas de contado nacían 'emitida' aunque el dinero ya hubiera entrado,
// y el historial ofrecía «Marcar como pagada» solo para cambiar la etiqueta.
// Ahora nacen 'pagada'; 'emitida' queda para el crédito con todo el saldo por
// cobrar. Esto pasa a 'pagada' las ventas viejas sin saldo pendiente (null =
// factura anterior al módulo de fiado, también sin saldo).
module.exports = {
  name: '20261022_000001_ventas_contado_pagadas',

  up: async ({ queryInterface, transaction }) => {
    await queryInterface.sequelize.query(
      `UPDATE facturas
       SET estado = 'pagada'
       WHERE estado = 'emitida' AND COALESCE("saldoPendiente", 0) = 0`,
      { transaction }
    )
  },

  // Sin reversa: no se puede saber cuáles ya estaban 'pagada' a mano antes.
  down: async () => {},
}
