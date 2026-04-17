const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');

const MEDICATION_CATEGORIES = ['medicamento', 'vacuna', 'antiparasitario', 'suplemento'];
const MOVEMENT_REASON_ALIASES = {
  ajuste: 'ajuste_inventario',
  consumo_interno: 'uso_clinico',
};

const buildMedicationPresentation = (producto) =>
  [producto.subcategoria, producto.unidadMedida, producto.laboratorio]
    .filter((value) => String(value || '').trim().length > 0)
    .join(' | ');

const normalizarNumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
};

const normalizarEntero = (valor, valorPorDefecto = 0) => {
  const numero = normalizarNumero(valor, valorPorDefecto);
  return Number.isFinite(numero) ? Math.trunc(numero) : Number.NaN;
};

const normalizarMotivoMovimiento = (motivo) => {
  const motivoNormalizado = String(motivo || '').trim().toLowerCase();
  return MOVEMENT_REASON_ALIASES[motivoNormalizado] || motivoNormalizado;
};

const crearProducto = async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stock, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula,
    } = req.body;

    const { clinicaId } = req.usuario;

    if (!nombre || !categoria || !unidadMedida) {
      return res.status(400).json({
        message: 'Nombre, categoria y unidad de medida son obligatorios'
      });
    }

    const stockInicial = normalizarEntero(stock, 0);
    const stockMinimoNormalizado = normalizarEntero(stockMinimo, 5);
    const precioCompraNormalizado = normalizarNumero(precioCompra, 0);
    const precioVentaNormalizado = normalizarNumero(precioVenta, 0);

    if (
      [stockInicial, stockMinimoNormalizado, precioCompraNormalizado, precioVentaNormalizado].some(
        (valor) => Number.isNaN(valor) || valor < 0
      )
    ) {
      return res.status(400).json({
        message: 'Stock, stock minimo y precios deben ser numeros validos mayores o iguales a 0'
      });
    }

    const producto = await sequelize.transaction(async (transaction) => {
      const nuevoProducto = await Producto.create({
        nombre: String(nombre).trim(),
        descripcion,
        categoria,
        subcategoria,
        unidadMedida,
        precioCompra: precioCompraNormalizado,
        precioVenta: precioVentaNormalizado,
        stock: stockInicial,
        stockMinimo: stockMinimoNormalizado,
        fechaVencimiento,
        lote,
        laboratorio,
        requiereFormula: Boolean(requiereFormula),
        clinicaId,
      }, { transaction });

      if (stockInicial > 0) {
        await MovimientoInventario.create({
          tipo: 'entrada',
          cantidad: stockInicial,
          stockAnterior: 0,
          stockNuevo: stockInicial,
          motivo: 'compra',
          observaciones: 'Stock inicial',
          precioUnitario: precioCompraNormalizado,
          productoId: nuevoProducto.id,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction });
      }

      return nuevoProducto;
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

const obtenerProductos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
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
    const { clinicaId } = req.usuario;

    const producto = await Producto.findOne({ where: { id, clinicaId, activo: true } });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const movimientos = await MovimientoInventario.findAll({
      where: { productoId: id, clinicaId },
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      producto: {
        ...producto.toJSON(),
        movimientos,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const {
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula,
    } = req.body;

    const producto = await Producto.findOne({ where: { id, clinicaId } });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const precioCompraNormalizado = normalizarNumero(precioCompra, producto.precioCompra);
    const precioVentaNormalizado = normalizarNumero(precioVenta, producto.precioVenta);
    const stockMinimoNormalizado = normalizarEntero(stockMinimo, producto.stockMinimo);

    if (
      [precioCompraNormalizado, precioVentaNormalizado, stockMinimoNormalizado].some(
        (valor) => Number.isNaN(valor) || valor < 0
      )
    ) {
      return res.status(400).json({
        message: 'Precio compra, precio venta y stock minimo deben ser numeros validos mayores o iguales a 0'
      });
    }

    await producto.update({
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra: precioCompraNormalizado,
      precioVenta: precioVentaNormalizado,
      stockMinimo: stockMinimoNormalizado,
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
    const { clinicaId } = req.usuario;
    const { tipo, cantidad, motivo, observaciones, precioUnitario } = req.body;
    const cantidadNormalizada = normalizarEntero(cantidad, Number.NaN);
    const precioUnitarioNormalizado = normalizarNumero(precioUnitario, 0);
    const motivoNormalizado = normalizarMotivoMovimiento(motivo);

    if (!tipo || !cantidad || !motivo) {
      return res.status(400).json({ message: 'Tipo, cantidad y motivo son obligatorios' });
    }

    if (Number.isNaN(cantidadNormalizada) || cantidadNormalizada <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    if (Number.isNaN(precioUnitarioNormalizado) || precioUnitarioNormalizado < 0) {
      return res.status(400).json({ message: 'El precio unitario debe ser un numero valido mayor o igual a 0' });
    }

    if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de movimiento no valido' });
    }

    let respuesta;

    try {
      respuesta = await sequelize.transaction(async (transaction) => {
        const producto = await Producto.findOne({
          where: { id: productoId, clinicaId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!producto) {
          return { status: 404, body: { message: 'Producto no encontrado' } };
        }

        const stockAnterior = Number(producto.stock);
        let stockNuevo;
        let cantidadMovimiento = cantidadNormalizada;

        if (tipo === 'entrada') {
          stockNuevo = stockAnterior + cantidadNormalizada;
        } else if (tipo === 'salida') {
          if (cantidadNormalizada > stockAnterior) {
            return { status: 400, body: { message: 'Stock insuficiente' } };
          }
          stockNuevo = stockAnterior - cantidadNormalizada;
        } else {
          stockNuevo = cantidadNormalizada;
          cantidadMovimiento = Math.abs(stockNuevo - stockAnterior);
        }

        await producto.update({ stock: stockNuevo }, { transaction });

        const movimiento = await MovimientoInventario.create({
          tipo,
          cantidad: cantidadMovimiento,
          stockAnterior,
          stockNuevo,
          motivo: motivoNormalizado,
          observaciones,
          precioUnitario: precioUnitarioNormalizado,
          productoId,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction });

        return {
          status: 201,
          body: {
            message: 'Movimiento registrado exitosamente',
            stockAnterior,
            stockNuevo,
            movimiento,
          },
        };
      });
    } catch (error) {
      if (error?.name === 'SequelizeDatabaseError' || error?.name === 'SequelizeValidationError') {
        return res.status(400).json({
          message: 'El motivo o los datos del movimiento no son validos para inventario',
        });
      }

      throw error;
    }

    return res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const producto = await Producto.findOne({ where: { id, clinicaId, activo: true } });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await producto.update({ activo: false });

    return res.json({
      message: 'Producto desactivado exitosamente',
      producto,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerAlertas = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
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

const obtenerProductoPorBarcode = async (req, res) => {
  try {
    const { codigo } = req.params;
    const { clinicaId } = req.usuario;

    const producto = await Producto.findOne({
      where: {
        codigoBarras: codigo,
        clinicaId,
        activo: true
      },
      attributes: [
        'id',
        'nombre',
        'precioVenta',
        'stock',
        'categoria',
        'requiereFormula'
      ]
    });

    if (!producto) {
      return res.status(404).json({
        message: 'Producto no encontrado'
      });
    }

    if (producto.stock <= 0) {
      return res.status(400).json({
        message: 'Producto sin stock'
      });
    }

    res.json({
      producto
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error en servidor',
      error: error.message
    });
  }
};

const obtenerCatalogoMedicamentos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { buscar, pagina = 1, limite = 8 } = req.query;

    const where = {
      clinicaId,
      activo: true,
      categoria: { [Op.in]: MEDICATION_CATEGORIES },
      stock: { [Op.gt]: 0 },
    };

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { laboratorio: { [Op.iLike]: `%${buscar}%` } },
        { subcategoria: { [Op.iLike]: `%${buscar}%` } },
        { descripcion: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    const offset = (Number(pagina) - 1) * Number(limite);

    const { count, rows } = await Producto.findAndCountAll({
      where,
      attributes: [
        'id',
        'nombre',
        'categoria',
        'subcategoria',
        'unidadMedida',
        'laboratorio',
        'descripcion',
        'stock',
        'precioVenta',
        'requiereFormula',
      ],
      limit: Number(limite),
      offset,
      order: [['nombre', 'ASC']],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / Number(limite)),
      paginaActual: Number(pagina),
      productos: rows.map((producto) => ({
        ...producto.toJSON(),
        presentacionReferencia: buildMedicationPresentation(producto),
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error en el servidor',
      error: error.message,
    });
  }
};

const obtenerMovimientos = async (req, res) => {
  try {

    const { clinicaId } = req.usuario;

    const { productoId, tipo, pagina = 1, limite = 20 } = req.query;

    const where = { clinicaId };

    if (productoId) where.productoId = productoId;
    if (tipo) where.tipo = tipo;

    const offset = (pagina - 1) * limite;

    const { count, rows } = await MovimientoInventario.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{
      model: Producto,
      as: 'producto',
      attributes: ['id','nombre','categoria']
      }]
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      movimientos: rows
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error en servidor',
      error: error.message
    });
  }
};

module.exports = {
  crearProducto,
  obtenerProductos,
  obtenerProducto,
  editarProducto,
  eliminarProducto,
  registrarMovimiento,
  obtenerAlertas,
  obtenerProductoPorBarcode,
  obtenerCatalogoMedicamentos,
  obtenerMovimientos 
};
