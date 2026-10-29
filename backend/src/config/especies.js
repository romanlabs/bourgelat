// Especies que acepta Mascota.especie (ENUM en Postgres). Agregar una aqui
// exige una migracion con ALTER TYPE ... ADD VALUE y su etiqueta en
// frontend/src/lib/especies.js.
const ESPECIES = [
  'perro',
  'gato',
  'ave',
  'conejo',
  'roedor',
  'huron',
  'reptil',
  'pez',
  'equino',
  'bovino',
  'porcino',
  'ovino',
  'caprino',
  'otro',
]

module.exports = { ESPECIES }
