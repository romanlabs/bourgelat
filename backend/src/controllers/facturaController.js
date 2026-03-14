const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Factura = require('../models/Factura');
const FacturaItem = require('../models/FacturaItem');
const Producto = require('../models/Producto');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');

const generarNumeroFactura = async (clinicaId) => {
  const ultima = await Factura.findOne({
    where: { clinicaId },
    order: [['createdAt', 'DESC']],
  });

  if (!ultima) return 'FAC-0001';

  const numero = parseInt(ultima.numero.split('-')[1]) + 1;
  return `FAC-${String(numero).padStart(4, '0')}`;
};

const crearFactura = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { propietarioId, items, metodoPago, observaciones, descuentoGeneral, usuarioId } = req.body;
    const { id: clinicaId } = req.usuario;

    if (!propietarioId || !items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Propietario e items son obligatorios' });
    }

    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } });
    if (!propietario) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    // Calcular totales
    let subtotal = 0;
    const itemsCalculados = [];

    for (const item of items) {
      if (!item.descripcion || !item.precioUnitario || !item.cantidad) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Cada item debe tener descripcion, precio y cantidad' });
      }

      // Si es producto verificar stock
      if (item.tipo === 'producto' && item.productoId) {
        const producto = await Producto.findOne({ where: { id: item.productoId, clinicaId } });
        if (!producto) {
          await transaction.rollback();
          return res.status(404).json({ message: `Producto no encontrado: ${item.descripcion}` });
        }
        if (producto.stock < item.cantidad) {
          await transaction.rollback();
          return res.status(400).json({ message: `Stock insuficiente para: ${producto.nombre}` });
        }
      }

      const itemSubtotal = (item.precioUnitario * item.cantidad) - (item.descuento || 0);
      subtotal += itemSubtotal;
      itemsCalculados.push({ ...item, subtotal: itemSubtotal });
    }

    const descuento = descuentoGeneral || 0;
    const baseGravable = subtotal - descuento;
    const impuesto = 0; // IVA se implementara con DIAN
    const total = baseGravable + impuesto;
    const numero = await generarNumeroFactura(clinicaId);

    const factura = await Factura.create({
      numero, fecha: new Date(), estado: 'emitida',
      subtotal, descuento, impuesto, total,
      metodoPago, observaciones,
      propietarioId,
      usuarioId: usuarioId || req.usuario.id,
      clinicaId,
    }, { transaction });

    // Crear items y descontar stock si es producto
    for (const item of itemsCalculados) {
      await FacturaItem.create({
        descripcion: item.descripcion,
        tipo: item.tipo || 'servicio',
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento || 0,
        subtotal: item.subtotal,
        productoId: item.productoId || null,
        facturaId: factura.id,
      }, { transaction });

      // Descontar stock automáticamente
      if (item.tipo === 'producto' && item.productoId) {
        const producto = await Producto.findOne({ where: { id: item.productoId } });
        await producto.update(
          { stock: producto.stock - item.cantidad },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const facturaCompleta = await Factura.findOne({
      where: { id: factura.id },
      include: [
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'numeroDocumento'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: FacturaItem, as: 'items' },
      ],
    });

    res.status(201).json({
      message: 'Factura creada exitosamente',
      factura: facturaCompleta,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerFacturas = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;
    const { fechaInicio, fechaFin, estado, pagina = 1, limite = 20 } = req.query;

    const where = { clinicaId };
    if (estado) where.estado = estado;
    if (fechaInicio && fechaFin) {
      where.fecha = { [Op.between]: [fechaInicio, fechaFin] };
    }

    const offset = (pagina - 1) * limite;

    const { count, rows } = await Factura.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
      ],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      facturas: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;

    const factura = await Factura.findOne({
      where: { id, clinicaId },
      include: [
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'numeroDocumento', 'email', 'telefono'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        { model: FacturaItem, as: 'items', include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre'] }] },
      ],
    });

    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    res.json({ factura });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const anularFactura = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;
    const { motivoAnulacion } = req.body;

    if (!motivoAnulacion) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El motivo de anulacion es obligatorio' });
    }

    const factura = await Factura.findOne({
      where: { id, clinicaId },
      include: [{ model: FacturaItem, as: 'items' }],
    });

    if (!factura) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    if (factura.estado === 'anulada') {
      await transaction.rollback();
      return res.status(400).json({ message: 'La factura ya esta anulada' });
    }

    // Devolver stock de productos
    for (const item of factura.items) {
      if (item.tipo === 'producto' && item.productoId) {
        const producto = await Producto.findOne({ where: { id: item.productoId } });
        if (producto) {
          await producto.update(
            { stock: producto.stock + item.cantidad },
            { transaction }
          );
        }
      }
    }

    await factura.update({ estado: 'anulada', motivoAnulacion }, { transaction });
    await transaction.commit();

    res.json({ message: 'Factura anulada exitosamente' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearFactura, obtenerFacturas, obtenerFactura, anularFactura };