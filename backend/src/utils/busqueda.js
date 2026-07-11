const { Op, fn, col, where } = require('sequelize')

// Condicion `unaccent(columna) ILIKE unaccent('%texto%')` — busqueda insensible
// a mayusculas y tildes (requiere la extension unaccent de PostgreSQL).
// La columna debe ir calificada (ej. 'Mascota.nombre') cuando la query tiene
// JOINs con nombres de columna repetidos.
const iLikeSinTildes = (columna, texto) =>
  where(fn('unaccent', col(columna)), { [Op.iLike]: fn('unaccent', `%${texto}%`) })

module.exports = { iLikeSinTildes }
