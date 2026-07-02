const { Op } = require('sequelize');
const sequelize = require('../config/database');
const FacturaCompra = require('../models/FacturaCompra');
const FacturaCompraItem = require('../models/FacturaCompraItem');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');
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

const calcularItems = (items) =>
  items.map((item) => {
    const cantidad = normalizarEntero(item.cantidad, Number.NaN);
    const precioUnitario = normalizarDecimal(item.precioUnitario, 0);
    return {
      productoId: item.productoId,
      cantidad,
      precioUnitario,
      subtotal: Number.isFinite(cantidad) ? cantidad * precioUnitario : 0,
    };
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
        {
          model: FacturaCompraItem,
          as: 'items',
          attributes: ['id', 'productoId', 'cantidad', 'precioUnitario', 'subtotal'],
          include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidadMedida'] }],
        },
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
      include: [
        {
          model: FacturaCompraItem,
          as: 'items',
          include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidadMedida', 'stock'] }],
        },
      ],
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
      (i) => !i.productoId || Number.isNaN(i.cantidad) || i.cantidad <= 0
    );
    if (itemInvalido) {
      return res.status(400).json({ message: 'Cada ítem debe tener un producto válido y cantidad mayor a 0' });
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

    const facturaConItems = await FacturaCompra.findByPk(factura.id, {
      include: [{ model: FacturaCompraItem, as: 'items', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidadMedida'] }] }],
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
          (i) => !i.productoId || Number.isNaN(i.cantidad) || i.cantidad <= 0
        );
        if (itemInvalido) {
          throw new Error('Cada ítem debe tener un producto válido y cantidad mayor a 0');
        }
        await FacturaCompraItem.destroy({ where: { facturaCompraId: id }, transaction });
        await FacturaCompraItem.bulkCreate(
          itemsCalculados.map((i) => ({ ...i, facturaCompraId: id })),
          { transaction }
        );
      }
    });

    const facturaActualizada = await FacturaCompra.findByPk(id, {
      include: [{ model: FacturaCompraItem, as: 'items', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidadMedida'] }] }],
    });

    res.json({ message: 'Factura de compra actualizada', factura: facturaActualizada });
  } catch (error) {
    if (error.message.includes('ítem') || error.message.includes('borrador')) {
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
        for (const item of factura.items) {
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
              observaciones: `Anulación factura de compra #${factura.numero || factura.id.slice(0, 8)}${revertidoParcial ? ` (reversión parcial: stock insuficiente para revertir ${cantidadRevertir} unidades)` : ''}`,
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
