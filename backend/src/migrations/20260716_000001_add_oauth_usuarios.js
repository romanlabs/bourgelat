'use strict'

module.exports = {
  name: '20260716_000001_add_oauth_usuarios',

  up: async ({ sequelize }) => {
    await sequelize.query(`
      ALTER TABLE usuarios ALTER COLUMN password DROP NOT NULL;
    `)
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_usuarios_proveedor_auth AS ENUM ('local', 'google', 'microsoft');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `)
    await sequelize.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS "proveedorAuth" enum_usuarios_proveedor_auth NOT NULL DEFAULT 'local',
        ADD COLUMN IF NOT EXISTS "proveedorId" VARCHAR(255);
    `)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS usuarios_proveedor_auth_proveedor_id
        ON usuarios ("proveedorAuth", "proveedorId")
        WHERE "proveedorId" IS NOT NULL;
    `)
  },

  down: async ({ sequelize }) => {
    await sequelize.query('DROP INDEX IF EXISTS usuarios_proveedor_auth_proveedor_id')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS "proveedorId"')
    await sequelize.query('ALTER TABLE usuarios DROP COLUMN IF EXISTS "proveedorAuth"')
    await sequelize.query('DROP TYPE IF EXISTS enum_usuarios_proveedor_auth')
    // No se restaura NOT NULL en password: podria haber usuarios sociales sin password.
  },
}
