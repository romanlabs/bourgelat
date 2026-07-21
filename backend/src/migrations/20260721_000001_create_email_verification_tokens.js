'use strict'

module.exports = {
  name: '20260721_000001_create_email_verification_tokens',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
        expiracion TIMESTAMPTZ NOT NULL,
        usado BOOLEAN NOT NULL DEFAULT false,
        "usuarioId" UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS email_verification_tokens_usuario_id
        ON email_verification_tokens ("usuarioId");
    `)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS email_verification_tokens_expiracion
        ON email_verification_tokens (expiracion);
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('DROP TABLE IF EXISTS email_verification_tokens')
  },
}
