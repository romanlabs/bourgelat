'use strict'

// Migracion puramente aditiva: agrega especies al ENUM de mascotas.
// Deliberadamente SIN { transaction }: Postgres no permite usar, dentro de la
// misma transaccion en que se agrego, un valor de ENUM nuevo. ADD VALUE IF NOT
// EXISTS es idempotente (ver 20261006_000001_agregar_plan_esencial).

const NUEVAS = ['roedor', 'huron', 'pez', 'equino', 'bovino', 'porcino', 'ovino', 'caprino']

module.exports = {
  name: '20261029_000001_mas_especies',

  up: async ({ sequelize }) => {
    for (const especie of NUEVAS) {
      await sequelize.query(
        `ALTER TYPE "enum_mascotas_especie" ADD VALUE IF NOT EXISTS '${especie}';`
      )
    }
  },

  // Postgres no permite quitar valores de un ENUM sin recrear el tipo.
  down: async () => {},
}
