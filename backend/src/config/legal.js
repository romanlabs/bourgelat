// Versión vigente de cada documento legal. Es la que queda registrada como
// aceptada en `aceptaciones_legales` al crear una cuenta.
//
// Debe coincidir con VERSIONES_LEGALES de frontend/src/content/legal.js, que es
// lo que el usuario ve publicado. Al cambiar un texto de forma sustancial se
// sube la versión en ambos lados.
const VERSIONES_LEGALES = {
  terminos: '1.0',
  privacidad: '1.0',
}

const DOCUMENTOS_LEGALES = ['terminos', 'privacidad', 'comunicaciones_comerciales']

module.exports = { VERSIONES_LEGALES, DOCUMENTOS_LEGALES }
