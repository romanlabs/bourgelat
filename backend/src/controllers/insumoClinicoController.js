const { Op } = require('sequelize');
const sequelize = require('../config/database');
const InsumoClinico = require('../models/InsumoClinico');
const MovimientoInventarioClinico = require('../models/MovimientoInventarioClinico');
const ServicioClinicoInsumo = require('../models/ServicioClinicoInsumo');
const { parsePaginacion } = require('../utils/paginacion');
const { tenantWhere } = require('../utils/tenant');

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const normalizarNumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
};

const crearInsumo = async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, unidadBase,
      cantidadPresentacion, unidadPresentacion, precioPresentacion,
      stockMinimo, fechaVencimiento, lote, laboratorio,
    } = req.body;

    const { clinicaId } = req.usuario;

    if (!nombre || !categoria || !unidadBase) {
      return res.status(400).json({
        message: 'Nombre, categoria y unidad base son obligatorios'
      });
    }

    const cantidadPresentacionNormalizada = normalizarNumero(cantidadPresentacion, Number.NaN);
    const precioPresentacionNormalizado = normalizarNumero(precioPresentacion, 0);
    const stockMinimoNormalizado = normalizarNumero(stockMinimo, 0);

    if (
      Number.isNaN(cantidadPresentacionNormalizada) || cantidadPresentacionNormalizada <= 0
    ) {
      return res.status(400).json({
        message: 'La cantidad de la presentacion debe ser mayor a 0'
      });
    }

    if (
      [precioPresentacionNormalizado, stockMinimoNormalizado].some(
        (valor) => Number.isNaN(valor) || valor < 0
      )
    ) {
      return res.status(400).json({
        message: 'El precio de la presentacion y el stock minimo deben ser numeros validos mayores o iguales a 0'
      });
    }

    const precioUnitarioBase = redondear(precioPresentacionNormalizado / cantidadPresentacionNormalizada);

    const insumo = await sequelize.transaction(async (transaction) => {
      const nuevoInsumo = await InsumoClinico.create({
        nombre: String(nombre).trim(),
        descripcion,
        categoria,
        unidadBase,
        cantidadPresentacion: cantidadPresentacionNormalizada,
        unidadPresentacion,
        precioPresentacion: precioPresentacionNormalizado,
        precioUnitarioBase,
        stock: cantidadPresentacionNormalizada,
        stockMinimo: stockMinimoNormalizado,
        fechaVencimiento,
        lote,
        laboratorio,
        clinicaId,
      }, { transaction });

      await MovimientoInventarioClinico.create({
        tipo: 'entrada',
        cantidad: cantidadPresentacionNormalizada,
        stockAnterior: 0,
        stockNuevo: cantidadPresentacionNormalizada,
        motivo: 'inventario_inicial',
        precioUnitario: precioUnitarioBase,
        cantidadPresentacion: cantidadPresentacionNormalizada,
        unidadPresentacion,
        precioPresentacion: precioPresentacionNormalizado,
        insumoClinicoId: nuevoInsumo.id,
        usuarioId: req.usuario.id,
        clinicaId,
      }, { transaction });

      return nuevoInsumo;
    });

    res.status(201).json({
      message: 'Insumo clinico creado exitosamente',
      insumo,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerInsumos = async (req, res) => {
  try {
    const { buscar, categoria, bajoStock } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = tenantWhere(req, { activo: true });

    if (categoria) where.categoria = categoria;
    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { laboratorio: { [Op.iLike]: `%${buscar}%` } },
        { lote: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    if (bajoStock === 'true') {
      where[Op.and] = sequelize.where(
        sequelize.col('stock'),
        { [Op.lte]: sequelize.col('stockMinimo') }
      );
    }

    const { count, rows } = await InsumoClinico.findAndCountAll({
      where,
      limit: limite,
      offset,
      order: [['nombre', 'ASC']],
    });

    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const insumosConAlertas = rows.map((i) => {
      const alertas = [];
      if (Number(i.stock) <= Number(i.stockMinimo)) alertas.push('bajo_stock');
      if (i.fechaVencimiento && new Date(i.fechaVencimiento) <= en30dias) {
        alertas.push('proximo_vencimiento');
      }
      if (i.fechaVencimiento && new Date(i.fechaVencimiento) < hoy) {
        alertas.push('vencido');
      }
      return { ...i.toJSON(), alertas };
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      insumos: insumosConAlertas,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerInsumo = async (req, res) => {
  try {
    const { id } = req.params;

    const insumo = await InsumoClinico.findOne({ where: tenantWhere(req, { id, activo: true }) });

    if (!insumo) {
      return res.status(404).json({ message: 'Insumo clinico no encontrado' });
    }

    const movimientos = await MovimientoInventarioClinico.findAll({
      where: tenantWhere(req, { insumoClinicoId: id }),
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      insumo: {
        ...insumo.toJSON(),
        movimientos,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarInsumo = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, descripcion, categoria, unidadBase,
      stockMinimo, fechaVencimiento, lote, laboratorio,
    } = req.body;

    const insumo = await InsumoClinico.findOne({ where: tenantWhere(req, { id }) });
    if (!insumo) {
      return res.status(404).json({ message: 'Insumo clinico no encontrado' });
    }

    const stockMinimoNormalizado = normalizarNumero(stockMinimo, insumo.stockMinimo);

    if (Number.isNaN(stockMinimoNormalizado) || stockMinimoNormalizado < 0) {
      return res.status(400).json({
        message: 'El stock minimo debe ser un numero valido mayor o igual a 0'
      });
    }

    await insumo.update({
      nombre, descripcion, categoria, unidadBase,
      stockMinimo: stockMinimoNormalizado,
      fechaVencimiento, lote, laboratorio,
    });

    res.json({
      message: 'Insumo clinico actualizado exitosamente',
      insumo,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const registrarMovimientoClinico = async (req, res) => {
  try {
    const { id: insumoClinicoId } = req.params;
    const { tipo, cantidad, motivo, observaciones, cantidadPresentacion, unidadPresentacion, precioPresentacion } = req.body;
    const cantidadNormalizada = normalizarNumero(cantidad, Number.NaN);

    if (!tipo || cantidad === undefined || cantidad === null || !motivo) {
      return res.status(400).json({ message: 'Tipo, cantidad y motivo son obligatorios' });
    }

    if (Number.isNaN(cantidadNormalizada) || cantidadNormalizada <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }

    if (!['entrada', 'salida', 'ajuste'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de movimiento no valido' });
    }

    if (tipo === 'entrada' && motivo === 'compra') {
      const cantidadPresentacionNormalizada = normalizarNumero(cantidadPresentacion, Number.NaN);
      const precioPresentacionNormalizado = normalizarNumero(precioPresentacion, Number.NaN);

      if (Number.isNaN(cantidadPresentacionNormalizada) || cantidadPresentacionNormalizada <= 0) {
        return res.status(400).json({ message: 'La cantidad de la presentacion comprada debe ser mayor a 0' });
      }
      if (Number.isNaN(precioPresentacionNormalizado) || precioPresentacionNormalizado < 0) {
        return res.status(400).json({ message: 'El precio de la presentacion comprada debe ser mayor o igual a 0' });
      }
    }

    let respuesta;

    try {
      respuesta = await sequelize.transaction(async (transaction) => {
        const insumo = await InsumoClinico.findOne({
          where: tenantWhere(req, { id: insumoClinicoId }),
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!insumo) {
          return { status: 404, body: { message: 'Insumo clinico no encontrado' } };
        }

        const stockAnterior = Number(insumo.stock);
        let stockNuevo;
        let cantidadMovimiento = cantidadNormalizada;
        let precioUnitarioNuevo = Number(insumo.precioUnitarioBase);
        let datosCompra = {};

        if (tipo === 'entrada') {
          stockNuevo = stockAnterior + cantidadNormalizada;

          if (motivo === 'compra') {
            const cantidadPresentacionNormalizada = normalizarNumero(cantidadPresentacion);
            const precioPresentacionNormalizado = normalizarNumero(precioPresentacion);
            const costoAnteriorTotal = stockAnterior * Number(insumo.precioUnitarioBase);
            const costoNuevoTotal = costoAnteriorTotal + precioPresentacionNormalizado;
            precioUnitarioNuevo = stockNuevo > 0 ? redondear(costoNuevoTotal / stockNuevo) : 0;
            datosCompra = {
              cantidadPresentacion: cantidadPresentacionNormalizada,
              unidadPresentacion,
              precioPresentacion: precioPresentacionNormalizado,
            };
          }
        } else if (tipo === 'salida') {
          if (cantidadNormalizada > stockAnterior) {
            return { status: 400, body: { message: 'Stock insuficiente' } };
          }
          stockNuevo = stockAnterior - cantidadNormalizada;
        } else {
          stockNuevo = cantidadNormalizada;
          cantidadMovimiento = Math.abs(redondear(stockNuevo - stockAnterior));
        }

        const updates = { stock: stockNuevo };
        if (motivo === 'compra') {
          updates.precioUnitarioBase = precioUnitarioNuevo;
          if (datosCompra.cantidadPresentacion) updates.cantidadPresentacion = datosCompra.cantidadPresentacion;
          if (unidadPresentacion) updates.unidadPresentacion = unidadPresentacion;
          if (datosCompra.precioPresentacion !== undefined) updates.precioPresentacion = datosCompra.precioPresentacion;
        }

        await insumo.update(updates, { transaction });

        const movimiento = await MovimientoInventarioClinico.create({
          tipo,
          cantidad: cantidadMovimiento,
          stockAnterior,
          stockNuevo,
          motivo,
          observaciones,
          precioUnitario: precioUnitarioNuevo,
          ...datosCompra,
          insumoClinicoId,
          usuarioId: req.usuario.id,
          clinicaId: req.usuario.clinicaId,
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
          message: 'El motivo o los datos del movimiento no son validos para inventario clinico',
        });
      }

      throw error;
    }

    return res.status(respuesta.status).json(respuesta.body);
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const eliminarInsumo = async (req, res) => {
  try {
    const { id } = req.params;

    const insumo = await InsumoClinico.findOne({ where: tenantWhere(req, { id, activo: true }) });

    if (!insumo) {
      return res.status(404).json({ message: 'Insumo clinico no encontrado' });
    }

    const recetaActiva = await ServicioClinicoInsumo.findOne({
      where: { insumoClinicoId: id },
      include: [{
        association: 'servicio',
        where: { activo: true },
        required: true,
      }],
    });

    if (recetaActiva) {
      return res.status(409).json({
        message: 'Este insumo esta en uso en la receta de un servicio activo. Edita o desactiva ese servicio primero.',
      });
    }

    await insumo.update({ activo: false });

    return res.json({
      message: 'Insumo clinico desactivado exitosamente',
      insumo,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerAlertas = async (req, res) => {
  try {
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const bajoStock = await InsumoClinico.findAll({
      where: tenantWhere(req, {
        activo: true,
        stock: { [Op.lte]: sequelize.col('stockMinimo') },
      }),
      attributes: ['id', 'nombre', 'stock', 'stockMinimo', 'unidadBase', 'categoria'],
    });

    const proximosVencer = await InsumoClinico.findAll({
      where: tenantWhere(req, {
        activo: true,
        fechaVencimiento: { [Op.between]: [hoy, en30dias] },
      }),
      attributes: ['id', 'nombre', 'stock', 'unidadBase', 'fechaVencimiento', 'categoria'],
    });

    const vencidos = await InsumoClinico.findAll({
      where: tenantWhere(req, {
        activo: true,
        fechaVencimiento: { [Op.lt]: hoy },
      }),
      attributes: ['id', 'nombre', 'stock', 'unidadBase', 'fechaVencimiento', 'categoria'],
    });

    res.json({
      bajoStock: { total: bajoStock.length, insumos: bajoStock },
      proximosVencer: { total: proximosVencer.length, insumos: proximosVencer },
      vencidos: { total: vencidos.length, insumos: vencidos },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerMovimientosClinicos = async (req, res) => {
  try {
    const { insumoClinicoId, tipo } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = tenantWhere(req);

    if (insumoClinicoId) where.insumoClinicoId = insumoClinicoId;
    if (tipo) where.tipo = tipo;

    const { count, rows } = await MovimientoInventarioClinico.findAndCountAll({
      where,
      limit: limite,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: InsumoClinico,
        as: 'insumo',
        attributes: ['id', 'nombre', 'categoria', 'unidadBase'],
      }],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      movimientos: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  crearInsumo,
  obtenerInsumos,
  obtenerInsumo,
  editarInsumo,
  eliminarInsumo,
  registrarMovimientoClinico,
  obtenerAlertas,
  obtenerMovimientosClinicos,
};
