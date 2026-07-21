'use strict'

module.exports = {
  name: '20260721_000002_add_email_verificado_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
    `)
    // Cuentas ya operando: se consideran verificadas para no bloquear el
    // acceso de clinicas existentes con el nuevo gate de cambio de password.
    await sequelize.query(`
      UPDATE usuarios SET "emailVerificado" = true;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios DROP COLUMN IF EXISTS "emailVerificado";
    `)
  },
}
