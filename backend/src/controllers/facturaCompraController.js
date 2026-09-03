const { Op } = require('sequelize');
const sequelize = require('../config/database');
const FacturaCompra = require('../models/FacturaCompra');
const FacturaCompraItem = require('../models/FacturaCompraItem');
const Producto = require('../models/Producto');
const InsumoClinico = require('../models/InsumoClinico');
const MovimientoInventario = require('../models/MovimientoInventario');
const {
  aplicarEntradaCompraClinica,
  revertirEntradaCompraClinica,
} = require('../services/inventarioClinicoService');
const { parsePaginacion } = require('../utils/paginacion');

const normalizarEntero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') return valorPorDefecto;
  const n = Math.trunc(Number(valor));
  return Number.isFinite(n) ? n : Number.NaN;
};

const normalizarDecimal = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') return valorPorDefecto;
  const n = Number(valor);
  return Number.isFinite(n) ? n : Number.NaN;
};

// Un item apunta a un producto de venta o a un insumo clinico, nunca a los dos.
// La referencia del destino que no aplica se anula para no dejar residuos de un
// cambio de destino en el formulario (el CHECK de la tabla tambien lo exige).
const calcularItems = (items) =>
  items.map((item) => {
    const cantidad = normalizarEntero(item.cantidad, Number.NaN);
    const precioUnitario = normalizarDecimal(item.precioUnitario, 0);
    const destinoInventario = item.destinoInventario === 'clinico' ? 'clinico' : 'ventas';
    return {
      destinoInventario,
      productoId: destinoInventario === 'ventas' ? item.productoId || null : null,
      insumoClinicoId: destinoInventario === 'clinico' ? item.insumoClinicoId || null : null,
      cantidad,
      precioUnitario,
      subtotal: Number.isFinite(cantidad) ? cantidad * precioUnitario : 0,
    };
  });

const referenciaDeItem = (item) =>
  item.destinoInventario === 'clinico' ? item.insumoClinicoId : item.productoId;

// Verifica que cada referencia exista, este activa y pertenezca a la clinica.
// Lanza un Error con mensaje presentable; los llamadores ya lo traducen a 400.
const validarReferenciasItems = async (itemsCalculados, clinicaId, transaction) => {
  const idsProductos = [...new Set(
    itemsCalculados.filter((i) => i.destinoInventario === 'ventas').map((i) => i.productoId)
  )];
  const idsInsumos = [...new Set(
    itemsCalculados.filter((i) => i.destinoInventario === 'clinico').map((i) => i.insumoClinicoId)
  )];

  if (idsProductos.length) {
    const productos = await Producto.findAll({
      where: { id: { [Op.in]: idsProductos }, clinicaId, activo: true },
      attributes: ['id'],
      transaction,
    });
    if (productos.length !== idsProductos.length) {
      throw new Error('Uno o más productos del detalle no existen o no pertenecen a la clínica');
    }
  }

  if (idsInsumos.length) {
    const insumos = await InsumoClinico.findAll({
      where: { id: { [Op.in]: idsInsumos }, clinicaId, activo: true },
      attributes: ['id'],
      transaction,
    });
    if (insumos.length !== idsInsumos.length) {
      throw new Error('Uno o más insumos clínicos del detalle no existen o no pertenecen a la clínica');
    }
  }
};

const ATRIBUTOS_PRODUCTO_ITEM = ['id', 'nombre', 'unidadMedida'];
const ATRIBUTOS_INSUMO_ITEM = [
  'id', 'nombre', 'unidadBase', 'cantidadPresentacion', 'unidadPresentacion', 'stock',
];

const includeItems = (attributesItem) => ({
  model: FacturaCompraItem,
  as: 'items',
  ...(attributesItem ? { attributes: attributesItem } : {}),
  include: [
    { model: Producto, as: 'producto', attributes: ATRIBUTOS_PRODUCTO_ITEM, required: false },
    { model: InsumoClinico, as: 'insumoClinico', attributes: ATRIBUTOS_INSUMO_ITEM, required: false },
  ],
});

const obtenerFacturasCompra = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { estado, proveedor } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 15 });

    const where = { clinicaId };
    if (estado) where.estado = estado;
    if (proveedor) where.proveedor = { [Op.iLike]: `%${proveedor}%` };

    const { count, rows } = await FacturaCompra.findAndCountAll({
      where,
      limit: limite,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        includeItems([
          'id', 'destinoInventario', 'productoId', 'insumoClinicoId',
          'cantidad', 'precioUnitario', 'subtotal',
        ]),
      ],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      facturas: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const obtenerFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const factura = await FacturaCompra.findOne({
      where: { id, clinicaId },
      include: [includeItems()],
    });

    if (!factura) return res.status(404).json({ message: 'Factura de compra no encontrada' });

    res.json({ factura });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const crearFacturaCompra = async (req, res) => {
  try {
    const { clinicaId, id: usuarioId } = req.usuario;
    const { proveedor, fecha, numero, observaciones, fechaPagoFinal, items = [] } = req.body;

    if (!proveedor || !fecha) {
      return res.status(400).json({ message: 'Proveedor y fecha son obligatorios' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'La factura debe tener al menos un ítem' });
    }

    const itemsCalculados = calcularItems(items);
    const itemInvalido = itemsCalculados.find(
      (i) => !referenciaDeItem(i) || Number.isNaN(i.cantidad) || i.cantidad <= 0
    );
    if (itemInvalido) {
      return res.status(400).json({
        message: 'Cada ítem debe tener un producto o insumo válido y cantidad mayor a 0',
      });
    }

    try {
      await validarReferenciasItems(itemsCalculados, clinicaId);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const factura = await sequelize.transaction(async (transaction) => {
      const nuevaFactura = await FacturaCompra.create({
        proveedor: String(proveedor).trim(),
        fecha,
        numero: numero ? String(numero).trim() : null,
        observaciones: observaciones ? String(observaciones).trim() : null,
        fechaPagoFinal: fechaPagoFinal || null,
        estado: 'borrador',
        total: 0,
        clinicaId,
        usuarioId,
      }, { transaction });

      await FacturaCompraItem.bulkCreate(
        itemsCalculados.map((i) => ({ ...i, facturaCompraId: nuevaFactura.id })),
        { transaction }
      );

      return nuevaFactura;
    });

    const facturaConItems = await FacturaCompra.findOne({
      where: { id: factura.id, clinicaId },
      include: [includeItems()],
    });

    res.status(201).json({ message: 'Factura de compra creada', factura: facturaConItems });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const editarFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { proveedor, fecha, numero, observaciones, fechaPagoFinal, items } = req.body;

    const factura = await FacturaCompra.findOne({ where: { id, clinicaId } });
    if (!factura) return res.status(404).json({ message: 'Factura de compra no encontrada' });
    if (factura.estado !== 'borrador') {
      return res.status(400).json({ message: 'Solo se pueden editar facturas en estado borrador' });
    }

    await sequelize.transaction(async (transaction) => {
      await factura.update({
        ...(proveedor && { proveedor: String(proveedor).trim() }),
        ...(fecha && { fecha }),
        ...(numero !== undefined && { numero: numero ? String(numero).trim() : null }),
        ...(observaciones !== undefined && { observaciones: observaciones ? String(observaciones).trim() : null }),
        ...(fechaPagoFinal !== undefined && { fechaPagoFinal: fechaPagoFinal || null }),
      }, { transaction });

      if (Array.isArray(items)) {
        if (items.length === 0) {
          throw new Error('La factura debe tener al menos un ítem');
        }
        const itemsCalculados = calcularItems(items);
        const itemInvalido = itemsCalculados.find(
          (i) => !referenciaDeItem(i) || Number.isNaN(i.cantidad) || i.cantidad <= 0
        );
        if (itemInvalido) {
          throw new Error('Cada ítem debe tener un producto o insumo válido y cantidad mayor a 0');
        }

        await validarReferenciasItems(itemsCalculados, clinicaId, transaction);

        await FacturaCompraItem.destroy({ where: { facturaCompraId: id }, transaction });
        await FacturaCompraItem.bulkCreate(
          itemsCalculados.map((i) => ({ ...i, facturaCompraId: id })),
          { transaction }
        );
      }
    });

    const facturaActualizada = await FacturaCompra.findOne({
      where: { id, clinicaId },
      include: [includeItems()],
    });

    res.json({ message: 'Factura de compra actualizada', factura: facturaActualizada });
  } catch (error) {
    if (
      error.message.includes('ítem') ||
      error.message.includes('borrador') ||
      error.message.includes('producto') ||
      error.message.includes('insumo')
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const confirmarFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId, id: usuarioId } = req.usuario;

    const factura = await FacturaCompra.findOne({
      where: { id, clinicaId },
      include: [{ model: FacturaCompraItem, as: 'items' }],
    });

    if (!factura) return res.status(404).json({ message: 'Factura de compra no encontrada' });
    if (factura.estado !== 'borrador') {
      return res.status(400).json({ message: 'Solo se pueden confirmar facturas en estado borrador' });
    }
    if (!factura.items || factura.items.length === 0) {
      return res.status(400).json({ message: 'La factura no tiene ítems' });
    }

    await sequelize.transaction(async (transaction) => {
      let total = 0;

      for (const item of factura.items) {
        if (item.destinoInventario === 'clinico') {
          const insumo = await InsumoClinico.findOne({
            where: { id: item.insumoClinicoId, clinicaId, activo: true },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!insumo) {
            throw new Error(`Insumo clínico ${item.insumoClinicoId} no encontrado o inactivo`);
          }

          // En destino clinico la cantidad son presentaciones y el precio
          // unitario es el precio de una presentacion.
          await aplicarEntradaCompraClinica({
            insumo,
            presentaciones: Number(item.cantidad),
            precioPorPresentacion: Number(item.precioUnitario),
            usuarioId,
            clinicaId,
            facturaCompraId: id,
            transaction,
          });
        } else {
          const producto = await Producto.findOne({
            where: { id: item.productoId, clinicaId, activo: true },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!producto) {
            throw new Error(`Producto ${item.productoId} no encontrado o inactivo`);
          }

          const stockAnterior = Number(producto.stock);
          const stockNuevo = stockAnterior + Number(item.cantidad);

          await producto.update({
            stock: stockNuevo,
            precioCompra: Number(item.precioUnitario),
          }, { transaction });

          await MovimientoInventario.create({
            tipo: 'entrada',
            motivo: 'compra',
            cantidad: Number(item.cantidad),
            stockAnterior,
            stockNuevo,
            precioUnitario: Number(item.precioUnitario),
            productoId: item.productoId,
            facturaCompraId: id,
            usuarioId,
            clinicaId,
          }, { transaction });
        }

        total += Number(item.subtotal);
      }

      await factura.update({ estado: 'confirmada', total }, { transaction });
    });

    res.json({ message: 'Factura de compra confirmada exitosamente' });
  } catch (error) {
    if (error.message.includes('no encontrado') || error.message.includes('inactivo')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const anularFacturaCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId, id: usuarioId } = req.usuario;

    const factura = await FacturaCompra.findOne({
      where: { id, clinicaId },
      include: [{ model: FacturaCompraItem, as: 'items' }],
    });

    if (!factura) return res.status(404).json({ message: 'Factura de compra no encontrada' });
    if (factura.estado === 'anulada') {
      return res.status(400).json({ message: 'La factura ya está anulada' });
    }

    await sequelize.transaction(async (transaction) => {
      if (factura.estado === 'confirmada') {
        const referenciaFactura = factura.numero || factura.id.slice(0, 8);

        for (const item of factura.items) {
          if (item.destinoInventario === 'clinico') {
            const insumo = await InsumoClinico.findOne({
              where: { id: item.insumoClinicoId, clinicaId },
              transaction,
              lock: transaction.LOCK.UPDATE,
            });

            if (insumo) {
              await revertirEntradaCompraClinica({
                insumo,
                presentaciones: Number(item.cantidad),
                referenciaFactura,
                usuarioId,
                clinicaId,
                facturaCompraId: id,
                transaction,
              });
            }
            continue;
          }

          const producto = await Producto.findOne({
            where: { id: item.productoId, clinicaId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (producto) {
            const stockAnterior = Number(producto.stock);
            const cantidadRevertir = Number(item.cantidad);
            const revertirReal = Math.min(cantidadRevertir, stockAnterior);
            const stockNuevo = stockAnterior - revertirReal;
            const revertidoParcial = revertirReal < cantidadRevertir;

            await producto.update({ stock: stockNuevo }, { transaction });

            await MovimientoInventario.create({
              tipo: 'ajuste',
              motivo: 'ajuste_inventario',
              cantidad: revertirReal,
              stockAnterior,
              stockNuevo,
              observaciones: `Anulación factura de compra #${referenciaFactura}${revertidoParcial ? ` (reversión parcial: stock insuficiente para revertir ${cantidadRevertir} unidades)` : ''}`,
              productoId: item.productoId,
              usuarioId,
              clinicaId,
            }, { transaction });
          }
        }
      }

      await factura.update({ estado: 'anulada' }, { transaction });
    });

    res.json({ message: 'Factura de compra anulada' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const obtenerAlertasCompra = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const hoy = new Date();
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7)

    const attrs = ['id', 'numero', 'proveedor', 'fecha', 'fechaPagoFinal', 'total']

    const todas = await FacturaCompra.findAll({
      where: {
        clinicaId,
        estado: 'confirmada',
        pagada: false,
        fechaPagoFinal: { [Op.lte]: en7dias },
      },
      attributes: attrs,
      order: [['fechaPagoFinal', 'ASC']],
    })

    const vencidas = todas.filter((f) => new Date(f.fechaPagoFinal) < hoy)
    const proximasAVencer = todas.filter((f) => new Date(f.fechaPagoFinal) >= hoy)

    res.json({
      vencidas: { total: vencidas.length, facturas: vencidas },
      proximasAVencer: { total: proximasAVencer.length, facturas: proximasAVencer },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

const marcarComoPagada = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario
    const { fechaPago } = req.body

    const factura = await FacturaCompra.findOne({ where: { id, clinicaId } })
    if (!factura) return res.status(404).json({ message: 'Factura de compra no encontrada' })
    if (factura.estado !== 'confirmada') {
      return res.status(400).json({ message: 'Solo se pueden marcar como pagadas las facturas confirmadas' })
    }
    if (factura.pagada) {
      return res.status(400).json({ message: 'Esta factura ya está marcada como pagada' })
    }

    const fechaPagoFinal = fechaPago || new Date().toISOString().slice(0, 10)
    await factura.update({ pagada: true, fechaPago: fechaPagoFinal })

    res.json({ message: 'Factura marcada como pagada', fechaPago: fechaPagoFinal })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' })
  }
}

module.exports = {
  obtenerFacturasCompra,
  obtenerFacturaCompra,
  crearFacturaCompra,
  editarFacturaCompra,
  confirmarFacturaCompra,
  anularFacturaCompra,
  obtenerAlertasCompra,
  marcarComoPagada,
};
