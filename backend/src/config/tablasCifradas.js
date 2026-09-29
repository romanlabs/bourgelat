// Tablas y campos cifrados que recorre scripts/rotarCifrado.js. Debe mantenerse
// alineado con los registrarHooksCifrado(...) de los modelos y con
// integracionFacturacionController: una tabla que falte aqui conserva la clave
// vieja tras la rotacion y queda ilegible al retirarla del keyring.
// tablasCifradas.test.js falla si un modelo cifra algo que no esta en la lista.

const TABLAS = [
  {
    tabla: 'propietarios',
    campos: ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial'],
    hashConfig: { fuente: 'numeroDocumento', destino: 'numeroDocumentoHash' },
  },
  {
    tabla: 'facturas',
    campos: ['metodoPago', 'observaciones', 'mensajeElectronico', 'payloadElectronico', 'respuestaElectronica'],
  },
  { tabla: 'factura_items', campos: ['descripcion'] },
  { tabla: 'caja_turnos', campos: ['observacionesCierre'] },
  { tabla: 'movimientos_caja', campos: ['observaciones'] },
  { tabla: 'gastos', campos: ['descripcion'] },
  { tabla: 'abonos_factura', campos: ['metodoPago', 'observaciones'] },
  {
    tabla: 'integraciones_facturacion',
    campos: ['clientIdCifrado', 'clientSecretCifrado', 'usernameCifrado', 'passwordCifrado'],
  },
]

module.exports = { TABLAS }
