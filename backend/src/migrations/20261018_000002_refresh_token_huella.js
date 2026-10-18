'use strict'

// Los refresh tokens pasan a guardarse como su huella SHA-256 (hex, 64
// caracteres). Se convierten los existentes con el sha256 de Postgres, que da
// lo mismo que crypto.createHash('sha256') en Node: las sesiones abiertas
// siguen funcionando. Un JWT nunca mide 64 caracteres, así que la condición
// de largo evita volver a convertir una huella.
module.exports = {
  name: '20261018_000002_refresh_token_huella',

  up: async ({ queryInterface, transaction }) => {
    await queryInterface.sequelize.query(
      `UPDATE refresh_tokens
       SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')
       WHERE length(token) <> 64`,
      { transaction }
    )
  },

  // Irreversible: de la huella no se recupera el token. Bajar esta migración
  // solo obliga a volver a iniciar sesión.
  down: async () => {},
}
