const { hoyISO } = require('../utils/vencimiento');

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 1000) / 1000;

// Relevo de vencimiento: saca las unidades vencidas (salida con motivo
// "vencimiento") y deja en el item la fecha del siguiente lote mas cercano.
// El item (producto o insumo clinico) llega ya bloqueado dentro de la transaccion.
// Devuelve { status, body } como el resto de movimientos de inventario.
const actualizarVencimiento = async ({
  item,
  MovimientoModelo,
  camposMovimiento,
  precioUnitario = 0,
  cantidadVencida,
  nuevaFechaVencimiento,
  observaciones,
  transaction,
}) => {
  const stockAnterior = Number(item.stock);
  const cantidad = Number(cantidadVencida ?? 0);

  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { status: 400, body: { message: 'Las unidades vencidas deben ser 0 o más' } };
  }
  if (cantidad > stockAnterior) {
    return { status: 400, body: { message: 'Las unidades vencidas superan el stock disponible' } };
  }

  const stockNuevo = redondear(stockAnterior - cantidad);
  const nuevaFecha = nuevaFechaVencimiento ? String(nuevaFechaVencimiento).slice(0, 10) : null;

  if (stockNuevo > 0 && !nuevaFecha) {
    return {
      status: 400,
      body: { message: 'Indica la fecha de vencimiento de las unidades que quedan' },
    };
  }
  if (nuevaFecha && nuevaFecha < hoyISO()) {
    return { status: 400, body: { message: 'La nueva fecha de vencimiento no puede estar en el pasado' } };
  }

  const fechaAnterior = item.fechaVencimiento || null;
  const fechaFinal = stockNuevo > 0 ? nuevaFecha : null;

  // El lote era de la fecha anterior; al cambiarla deja de describir lo que queda.
  await item.update({
    stock: stockNuevo,
    fechaVencimiento: fechaFinal,
    ...(fechaFinal !== fechaAnterior ? { lote: null } : {}),
  }, { transaction });

  let movimiento = null;
  if (cantidad > 0) {
    movimiento = await MovimientoModelo.create({
      tipo: 'salida',
      cantidad,
      stockAnterior,
      stockNuevo,
      motivo: 'vencimiento',
      observaciones: observaciones || null,
      precioUnitario,
      ...camposMovimiento,
    }, { transaction });
  }

  return {
    status: 200,
    body: {
      message: cantidad > 0 ? 'Vencimiento actualizado y unidades vencidas retiradas' : 'Vencimiento actualizado',
      stockAnterior,
      stockNuevo,
      fechaVencimientoAnterior: fechaAnterior,
      fechaVencimiento: fechaFinal,
      movimiento,
    },
  };
};

module.exports = { actualizarVencimiento };
