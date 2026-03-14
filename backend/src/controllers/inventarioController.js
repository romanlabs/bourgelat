const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');

const crearProducto = async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stock, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula,
    } = req.body;
    const { id: clinicaId } = req.usuario;

    if (!nombre || !categoria || !unidadMedida) {
      return res.status(400).json({ message: 'Nombre, categoria y unidad de medida son obligatorios' });
    }

    const producto = await Producto.create({
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra: precioCompra || 0,
      precioVenta: precioVenta || 0,
      stock: stock || 0,
      stockMinimo: stockMinimo || 5,
      fechaVencimiento, lote, laboratorio,
      requiereFormula: requiereFormula || false,
      clinicaId,
    });

    // Si viene con stock inicial registrar movimiento
    if (stock && stock > 0) {
      await MovimientoInventario.create({
        tipo: 'entrada',
        cantidad: stock,
        stockAnterior: 0,
        stockNuevo: stock,
        motivo: 'compra',
        observaciones: 'Stock inicial',
        precioUnitario: precioCompra || 0,
        productoId: producto.id,
        usuarioId: req.body.usuarioId || req.usuario.id,
        clinicaId,
      });
    }

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerProductos = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;
    const { buscar, categoria, bajoStock, pagina = 1, limite = 20 } = req.query;

    const where = { clinicaId, activo: true };

    if (categoria) where.categoria = categoria;
    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { laboratorio: { [Op.iLike]: `%${buscar}%` } },
        { lote: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    // Filtrar productos con bajo stock
    if (bajoStock === 'true') {
      where[Op.and] = sequelize.where(
        sequelize.col('stock'),
        { [Op.lte]: sequelize.col('stockMinimo') }
      );
    }

    const offset = (pagina - 1) * limite;

    const { count, rows } = await Producto.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['nombre', 'ASC']],
    });

    // Alertas de bajo stock y vencimiento
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const productosConAlertas = rows.map(p => {
      const alertas = [];
      if (p.stock <= p.stockMinimo) alertas.push('bajo_stock');
      if (p.fechaVencimiento && new Date(p.fechaVencimiento) <= en30dias) {
        alertas.push('proximo_vencimiento');
      }
      if (p.fechaVencimiento && new Date(p.fechaVencimiento) < hoy) {
        alertas.push('vencido');
      }
      return { ...p.toJSON(), alertas };
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      productos: productosConAlertas,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;

    const producto = await Producto.findOne({
      where: { id, clinicaId },
      include: [{
        model: MovimientoInventario,
        as: 'movimientos',
        limit: 10,
        order: [['createdAt', 'DESC']],
      }],
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ producto });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;
    const {
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula,
    } = req.body;

    const producto = await Producto.findOne({ where: { id, clinicaId } });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await producto.update({
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula,
    });

    res.json({
      message: 'Producto actualizado exitosamente',
      producto,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const registrarMovimiento = async (req, res) => {
  try {
    const { id: productoId } = req.params;
    const { id: clinicaId } = req.usuario;
    const { tipo, cantidad, motivo, observaciones, precioUnitario } = req.body;

    if (!tipo || !cantidad || !motivo) {
      return res.status(400).json({ message: 'Tipo, cantidad y motivo son obligatorios' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    const producto = await Producto.findOne({ where: { id: productoId, clinicaId } });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const stockAnterior = producto.stock;
    let stockNuevo;

    if (tipo === 'entrada') {
      stockNuevo = stockAnterior + cantidad;
    } else if (tipo === 'salida') {
      if (cantidad > stockAnterior) {
        return res.status(400).json({ message: 'Stock insuficiente' });
      }
      stockNuevo = stockAnterior - cantidad;
    } else {
      stockNuevo = cantidad;
    }

    await producto.update({ stock: stockNuevo });

    const movimiento = await MovimientoInventario.create({
      tipo, cantidad, stockAnterior, stockNuevo,
      motivo, observaciones, precioUnitario,
      productoId, usuarioId: req.usuario.id, clinicaId,
    });

    res.status(201).json({
      message: 'Movimiento registrado exitosamente',
      stockAnterior,
      stockNuevo,
      movimiento,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerAlertas = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const bajoStock = await Producto.findAll({
      where: {
        clinicaId,
        activo: true,
        stock: { [Op.lte]: sequelize.col('stockMinimo') },
      },
      attributes: ['id', 'nombre', 'stock', 'stockMinimo', 'categoria'],
    });

    const proximosVencer = await Producto.findAll({
      where: {
        clinicaId,
        activo: true,
        fechaVencimiento: { [Op.between]: [hoy, en30dias] },
      },
      attributes: ['id', 'nombre', 'stock', 'fechaVencimiento', 'categoria'],
    });

    const vencidos = await Producto.findAll({
      where: {
        clinicaId,
        activo: true,
        fechaVencimiento: { [Op.lt]: hoy },
      },
      attributes: ['id', 'nombre', 'stock', 'fechaVencimiento', 'categoria'],
    });

    res.json({
      bajoStock: { total: bajoStock.length, productos: bajoStock },
      proximosVencer: { total: proximosVencer.length, productos: proximosVencer },
      vencidos: { total: vencidos.length, productos: vencidos },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  crearProducto, obtenerProductos, obtenerProducto,
  editarProducto, registrarMovimiento, obtenerAlertas,
};