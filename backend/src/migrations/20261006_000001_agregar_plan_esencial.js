'use strict'

// Migracion puramente aditiva: agrega 'esencial' al ENUM de planes.
// Deliberadamente SIN { transaction }: Postgres no permite usar, dentro de la
// misma transaccion en que se agrego, un valor de ENUM nuevo. ADD VALUE IF NOT
// EXISTS es idempotente (ver 20260813_000001_modelo_plan_unico).

module.exports = {
  name: '20261006_000001_agregar_plan_esencial',

  up: async ({ sequelize }) => {
    await sequelize.query(
      `ALTER TYPE "enum_suscripciones_plan" ADD VALUE IF NOT EXISTS 'esencial';`
    )
  },

  // Postgres no permite quitar valores de un ENUM sin recrear el tipo.
  down: async () => {},
}
