// Nombre del documento impreso de una venta (PDF y tirilla). Solo una venta
// validada por la DIAN (con CUFE) es factura; cualquier otra es un comprobante
// sin valor fiscal, aunque la clinica tenga el plan con facturacion electronica:
// una factura de papel o por computador ya no es valida en Colombia para quien
// esta obligado a facturar.
export const esFacturaElectronica = (factura) =>
  factura?.estadoElectronico === 'validada' && Boolean(factura?.cufe)

export const documentoVenta = (factura) =>
  esFacturaElectronica(factura)
    ? { titulo: 'FACTURA ELECTRÓNICA DE VENTA', nombre: 'Factura electrónica de venta', archivo: 'Factura' }
    : { titulo: 'COMPROBANTE DE VENTA', nombre: 'Comprobante de venta', archivo: 'Comprobante' }
