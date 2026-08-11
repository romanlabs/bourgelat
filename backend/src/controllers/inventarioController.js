const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Producto = require('../models/Producto');
const MovimientoInventario = require('../models/MovimientoInventario');
const { parsePaginacion } = require('../utils/paginacion');
const { PRODUCTOS_SUBDIR, buildPublicUploadUrl } = require('../config/uploads');

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

const subirFotoProducto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'Selecciona una imagen para continuar.',
    });
  }

  const relativePath = `${PRODUCTOS_SUBDIR}/${req.file.filename}`;

  return res.status(201).json({
    message: 'Foto cargada exitosamente',
    imagenUrl: buildPublicUploadUrl(req, relativePath),
  });
};

const crearProducto = async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, subcategoria, unidadMedida,
      precioCompra, precioVenta, stock, stockMinimo,
      fechaVencimiento, lote, laboratorio, requiereFormula, imagenUrl,
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
        imagenUrl,
        clinicaId,
      }, { transaction });

      if (stockInicial > 0) {
        await MovimientoInventario.create({
          tipo: 'entrada',
          cantidad: stockInicial,
          stockAnterior: 0,
          stockNuevo: stockInicial,
          motivo: 'inventario_inicial',
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

const MAX_IMPORT_ROWS = 500;

const importarProductos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const productos = Array.isArray(req.body.productos) ? req.body.productos : [];

    if (productos.length === 0) {
      return res.status(400).json({ message: 'No se recibieron productos para importar' });
    }

    if (productos.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        message: `No se pueden importar mas de ${MAX_IMPORT_ROWS} productos por archivo`,
      });
    }

    const filasNormalizadas = productos.map((fila, indice) => {
      const stock = normalizarEntero(fila.stock, 0);
      const stockMinimo = normalizarEntero(fila.stockMinimo, 5);
      const precioCompra = normalizarNumero(fila.precioCompra, 0);
      const precioVenta = normalizarNumero(fila.precioVenta, 0);
      const nombre = String(fila.nombre || '').trim();
      const codigoBarras = fila.codigoBarras ? String(fila.codigoBarras).trim() : null;

      const numerosValidos = [stock, stockMinimo, precioCompra, precioVenta].every(
        (valor) => Number.isFinite(valor) && valor >= 0
      );

      return {
        indice,
        valido: Boolean(nombre) && Boolean(fila.categoria) && Boolean(fila.unidadMedida) && numerosValidos,
        nombre,
        codigoBarras,
        descripcion: fila.descripcion,
        categoria: fila.categoria,
        subcategoria: fila.subcategoria,
        unidadMedida: fila.unidadMedida,
        precioCompra,
        precioVenta,
        stock,
        stockMinimo,
        fechaVencimiento: fila.fechaVencimiento || null,
        lote: fila.lote,
        laboratorio: fila.laboratorio,
        requiereFormula: Boolean(fila.requiereFormula),
      };
    });

    const nombresBuscados = filasNormalizadas.map((fila) => fila.nombre).filter(Boolean);
    const codigosBuscados = filasNormalizadas.map((fila) => fila.codigoBarras).filter(Boolean);

    const existentes = await Producto.findAll({
      where: {
        clinicaId,
        [Op.or]: [
          ...(nombresBuscados.length ? [{ nombre: { [Op.in]: nombresBuscados } }] : []),
          ...(codigosBuscados.length ? [{ codigoBarras: { [Op.in]: codigosBuscados } }] : []),
        ],
      },
      attributes: ['id', 'nombre', 'codigoBarras'],
    });

    const nombresExistentes = new Set(existentes.map((p) => p.nombre.trim().toLowerCase()));
    const codigosExistentes = new Set(
      existentes.filter((p) => p.codigoBarras).map((p) => p.codigoBarras.trim())
    );

    const nombresReservados = new Set();
    const codigosReservados = new Set();
    const filasACrear = [];
    const omitidos = [];

    filasNormalizadas.forEach((fila) => {
      if (!fila.valido) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'datos_invalidos' });
        return;
      }

      const nombreClave = fila.nombre.toLowerCase();

      if (nombresExistentes.has(nombreClave)) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'nombre_duplicado' });
        return;
      }

      if (fila.codigoBarras && codigosExistentes.has(fila.codigoBarras)) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'codigo_barras_duplicado' });
        return;
      }

      if (nombresReservados.has(nombreClave)) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'duplicado_en_archivo' });
        return;
      }

      if (fila.codigoBarras && codigosReservados.has(fila.codigoBarras)) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'duplicado_en_archivo' });
        return;
      }

      nombresReservados.add(nombreClave);
      if (fila.codigoBarras) codigosReservados.add(fila.codigoBarras);
      filasACrear.push(fila);
    });

    const creados = await sequelize.transaction(async (transaction) => {
      const productosCreados = [];

      for (const fila of filasACrear) {
        const nuevoProducto = await Producto.create({
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          categoria: fila.categoria,
          subcategoria: fila.subcategoria,
          unidadMedida: fila.unidadMedida,
          precioCompra: fila.precioCompra,
          precioVenta: fila.precioVenta,
          stock: fila.stock,
          stockMinimo: fila.stockMinimo,
          fechaVencimiento: fila.fechaVencimiento,
          lote: fila.lote,
          laboratorio: fila.laboratorio,
          requiereFormula: fila.requiereFormula,
          clinicaId,
        }, { transaction });

        if (fila.stock > 0) {
          await MovimientoInventario.create({
            tipo: 'entrada',
            cantidad: fila.stock,
            stockAnterior: 0,
            stockNuevo: fila.stock,
            motivo: 'inventario_inicial',
            precioUnitario: fila.precioCompra,
            productoId: nuevoProducto.id,
            usuarioId: req.usuario.id,
            clinicaId,
          }, { transaction });
        }

        productosCreados.push(nuevoProducto);
      }

      return productosCreados;
    });

    res.status(201).json({
      message: 'Importacion completada',
      creados,
      omitidos,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerProductos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { buscar, categoria, bajoStock } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

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

    const { count, rows } = await Producto.findAndCountAll({
      where,
      limit: limite,
      offset,
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
      fechaVencimiento, lote, laboratorio, requiereFormula, imagenUrl,
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
      fechaVencimiento, lote, laboratorio, requiereFormula, imagenUrl,
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
    const { buscar } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 8 });

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
      limit: limite,
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

    const { productoId, tipo } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = { clinicaId };

    if (productoId) where.productoId = productoId;
    if (tipo) where.tipo = tipo;

    const { count, rows } = await MovimientoInventario.findAndCountAll({
      where,
      limit: limite,
      offset,
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
  subirFotoProducto,
  importarProductos,
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
