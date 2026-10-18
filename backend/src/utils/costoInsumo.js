// Costo promedio ponderado de un insumo clinico al anular una compra.

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

// Devuelve el costo por unidad base que tenia el insumo ANTES de la compra
// (el inverso del promedio ponderado de `aplicarEntradaCompraClinica`), o
// `null` cuando no se puede restaurar con seguridad y hay que dejar el costo
// actual:
//  - el costo actual ya no es el que dejo esta compra (hubo otra compra o una
//    edicion manual despues: ese valor es el vigente);
//  - despues de devolver las unidades no quedaria stock: sin existencias
//    previas no hay promedio que recuperar;
//  - faltan datos del movimiento de entrada (compras antiguas).
// Las salidas no cambian el costo unitario, por eso el valor del inventario
// actual (costo * stock) menos lo pagado en la compra es el de antes.
const costoAntesDeCompra = ({
  costoActual,
  stockActual,
  unidadesCompra,
  costoCompraTotal,
  costoTrasCompra,
}) => {
  const valores = [costoActual, stockActual, unidadesCompra, costoCompraTotal, costoTrasCompra];
  if (valores.some((v) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)))) {
    return null;
  }
  if (redondear(costoActual) !== redondear(costoTrasCompra)) return null;

  const stockPrevio = Number(stockActual) - Number(unidadesCompra);
  if (stockPrevio <= 0) return null;

  const costoPrevio = (Number(costoActual) * Number(stockActual) - Number(costoCompraTotal)) / stockPrevio;
  if (!Number.isFinite(costoPrevio) || costoPrevio < 0) return null;
  return redondear(costoPrevio);
};

module.exports = { costoAntesDeCompra };
