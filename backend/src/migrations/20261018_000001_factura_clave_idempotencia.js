'use strict'

// Clave de idempotencia de la venta: el POS la manda para que un reintento
// tras un corte de red no cree una venta duplicada. Nullable (ventas
// anteriores y peticiones sin clave) y única por clínica cuando existe.
module.exports = {
  name: '20261018_000001_factura_clave_idempotencia',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const facturas = await queryInterface.describeTable('facturas', { transaction })
    if (!facturas.claveIdempotencia) {
      await queryInterface.addColumn('facturas', 'claveIdempotencia', {
        type: Sequelize.UUID,
        allowNull: true,
      }, { transaction })
    }

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS facturas_clinica_clave_idempotencia_unique
       ON facturas ("clinicaId", "claveIdempotencia")
       WHERE "claveIdempotencia" IS NOT NULL`,
      { transaction }
    )
  },

  down: async ({ queryInterface, transaction }) => {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS facturas_clinica_clave_idempotencia_unique',
      { transaction }
    )
    const facturas = await queryInterface.describeTable('facturas', { transaction })
    if (facturas.claveIdempotencia) {
      await queryInterface.removeColumn('facturas', 'claveIdempotencia', { transaction })
    }
  },
}
