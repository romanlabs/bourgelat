const MovimientoInventarioClinico = require('../models/MovimientoInventarioClinico');

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

// Un insumo clinico lleva stock en unidad base fraccionable (ml, mg, dosis...)
// pero se compra por presentacion (un frasco de 100 ml). Un item de factura de
// compra con destino clinico expresa `presentaciones` compradas y el precio de
// UNA presentacion; aqui se traduce a unidades base y se recostea el promedio
// ponderado del insumo.
const unidadesBaseDe = (insumo, presentaciones) =>
  redondear(Number(presentaciones) * Number(insumo.cantidadPresentacion));

const aplicarEntradaCompraClinica = async ({
  insumo,
  presentaciones,
  precioPorPresentacion,
  usuarioId,
  clinicaId,
  facturaCompraId,
  transaction,
}) => {
  const stockAnterior = Number(insumo.stock);
  const unidadesBase = unidadesBaseDe(insumo, presentaciones);
  const stockNuevo = redondear(stockAnterior + unidadesBase);

  const costoTotalCompra = Number(presentaciones) * Number(precioPorPresentacion);
  const costoAnteriorTotal = stockAnterior * Number(insumo.precioUnitarioBase);
  const precioUnitarioBase = stockNuevo > 0
    ? redondear((costoAnteriorTotal + costoTotalCompra) / stockNuevo)
    : 0;

  await insumo.update({
    stock: stockNuevo,
    precioUnitarioBase,
    precioPresentacion: Number(precioPorPresentacion),
  }, { transaction });

  const movimiento = await MovimientoInventarioClinico.create({
    tipo: 'entrada',
    motivo: 'compra',
    cantidad: unidadesBase,
    stockAnterior,
    stockNuevo,
    precioUnitario: precioUnitarioBase,
    cantidadPresentacion: Number(insumo.cantidadPresentacion),
    unidadPresentacion: insumo.unidadPresentacion,
    precioPresentacion: Number(precioPorPresentacion),
    insumoClinicoId: insumo.id,
    facturaCompraId,
    usuarioId,
    clinicaId,
  }, { transaction });

  return { stockAnterior, stockNuevo, movimiento };
};

// Reversion por anulacion de la factura. Si el insumo ya se consumio no se
// puede devolver todo: se revierte hasta donde alcance el stock y la
// observacion lo deja explicito, igual que en el inventario de ventas.
const revertirEntradaCompraClinica = async ({
  insumo,
  presentaciones,
  referenciaFactura,
  usuarioId,
  clinicaId,
  facturaCompraId,
  transaction,
}) => {
  const stockAnterior = Number(insumo.stock);
  const unidadesBase = unidadesBaseDe(insumo, presentaciones);
  const revertirReal = Math.min(unidadesBase, stockAnterior);
  const stockNuevo = redondear(stockAnterior - revertirReal);
  const revertidoParcial = revertirReal < unidadesBase;

  await insumo.update({ stock: stockNuevo }, { transaction });

  await MovimientoInventarioClinico.create({
    tipo: 'ajuste',
    motivo: 'ajuste_inventario',
    cantidad: redondear(revertirReal),
    stockAnterior,
    stockNuevo,
    precioUnitario: Number(insumo.precioUnitarioBase),
    observaciones: `Anulación factura de compra #${referenciaFactura}${
      revertidoParcial
        ? ` (reversión parcial: stock insuficiente para revertir ${unidadesBase} ${insumo.unidadBase})`
        : ''
    }`,
    insumoClinicoId: insumo.id,
    facturaCompraId,
    usuarioId,
    clinicaId,
  }, { transaction });

  return { stockAnterior, stockNuevo, revertidoParcial };
};

module.exports = {
  redondear,
  unidadesBaseDe,
  aplicarEntradaCompraClinica,
  revertirEntradaCompraClinica,
};
