'use strict'

module.exports = {
  name: '20260717_000001_create_password_reset_tokens',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
        expiracion TIMESTAMPTZ NOT NULL,
        usado BOOLEAN NOT NULL DEFAULT false,
        "usuarioId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS password_reset_tokens_usuario_id
        ON password_reset_tokens ("usuarioId");
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS password_reset_tokens_expiracion
        ON password_reset_tokens (expiracion);
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('DROP TABLE IF EXISTS password_reset_tokens')
  },
}
