// Ruta para los logs, sin la query string: ahi viajan el `?code=` del OAuth y
// busquedas con nombres o documentos de pacientes y tutores (`?buscar=`), que
// no deben quedar escritos en los logs.
const rutaSinQuery = (req) => String(req?.originalUrl || req?.url || '').split('?')[0]

module.exports = { rutaSinQuery }
