const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ServicioClinico = require('../models/ServicioClinico');
const ServicioClinicoInsumo = require('../models/ServicioClinicoInsumo');
const InsumoClinico = require('../models/InsumoClinico');
const { parsePaginacion } = require('../utils/paginacion');
const { tenantWhere } = require('../utils/tenant');

const normalizarNumero = (valor, valorPorDefecto = 0) => {
  if (valor === undefined || valor === null || valor === '') {
    return valorPorDefecto;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
};

const validarRecetaInsumos = async (insumos, clinicaId, transaction) => {
  if (!Array.isArray(insumos) || insumos.length === 0) {
    return { error: 'El servicio debe tener al menos un insumo en su receta' };
  }

  const filasValidas = [];

  for (const item of insumos) {
    const cantidadConsumida = normalizarNumero(item?.cantidadConsumida, Number.NaN);

    if (!item?.insumoClinicoId || Number.isNaN(cantidadConsumida) || cantidadConsumida <= 0) {
      return { error: 'Cada insumo de la receta debe tener insumoClinicoId y cantidadConsumida mayor a 0' };
    }

    const insumo = await InsumoClinico.findOne({
      where: { id: item.insumoClinicoId, clinicaId, activo: true },
      transaction,
    });

    if (!insumo) {
      return { error: `Insumo clinico no encontrado o inactivo: ${item.insumoClinicoId}` };
    }

    filasValidas.push({ insumoClinicoId: item.insumoClinicoId, cantidadConsumida });
  }

  return { filasValidas };
};

const crearServicio = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { nombre, descripcion, categoria, precioVenta, insumos } = req.body;
    const { clinicaId } = req.usuario;

    if (!nombre) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El nombre del servicio es obligatorio' });
    }

    const precioVentaNormalizado = normalizarNumero(precioVenta, 0);
    if (Number.isNaN(precioVentaNormalizado) || precioVentaNormalizado < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El precio de venta debe ser un numero valido mayor o igual a 0' });
    }

    const { error, filasValidas } = await validarRecetaInsumos(insumos, clinicaId, transaction);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error });
    }

    const servicio = await ServicioClinico.create({
      nombre: String(nombre).trim(),
      descripcion,
      categoria,
      precioVenta: precioVentaNormalizado,
      clinicaId,
    }, { transaction });

    await ServicioClinicoInsumo.bulkCreate(
      filasValidas.map((fila) => ({ ...fila, servicioClinicoId: servicio.id, clinicaId })),
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      servicio,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerServicios = async (req, res) => {
  try {
    const { buscar, categoria } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 });

    const where = tenantWhere(req, { activo: true });
    if (categoria) where.categoria = categoria;
    if (buscar) {
      where.nombre = { [Op.iLike]: `%${buscar}%` };
    }

    const { count, rows } = await ServicioClinico.findAndCountAll({
      where,
      include: [{
        model: ServicioClinicoInsumo,
        as: 'insumos',
        include: [{
          model: InsumoClinico,
          as: 'insumo',
          attributes: ['id', 'nombre', 'unidadBase', 'precioUnitarioBase'],
        }],
      }],
      limit: limite,
      offset,
      order: [['nombre', 'ASC']],
      distinct: true,
    });

    const serviciosConCosto = rows.map((servicio) => {
      const costoEstimado = (servicio.insumos || []).reduce((acc, fila) => {
        const precioUnitario = Number(fila.insumo?.precioUnitarioBase || 0);
        return acc + precioUnitario * Number(fila.cantidadConsumida || 0);
      }, 0);
      return { ...servicio.toJSON(), costoEstimado };
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      servicios: serviciosConCosto,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await ServicioClinico.findOne({
      where: tenantWhere(req, { id, activo: true }),
      include: [{
        model: ServicioClinicoInsumo,
        as: 'insumos',
        include: [{
          model: InsumoClinico,
          as: 'insumo',
          attributes: ['id', 'nombre', 'unidadBase', 'precioUnitarioBase', 'stock'],
        }],
      }],
    });

    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    res.json({ servicio });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarServicio = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { nombre, descripcion, categoria, precioVenta, insumos } = req.body;

    const servicio = await ServicioClinico.findOne({ where: { id, clinicaId }, transaction });
    if (!servicio) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const precioVentaNormalizado = normalizarNumero(precioVenta, servicio.precioVenta);
    if (Number.isNaN(precioVentaNormalizado) || precioVentaNormalizado < 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'El precio de venta debe ser un numero valido mayor o igual a 0' });
    }

    if (insumos !== undefined) {
      const { error, filasValidas } = await validarRecetaInsumos(insumos, clinicaId, transaction);
      if (error) {
        await transaction.rollback();
        return res.status(400).json({ message: error });
      }

      await ServicioClinicoInsumo.destroy({ where: { servicioClinicoId: id }, transaction });
      await ServicioClinicoInsumo.bulkCreate(
        filasValidas.map((fila) => ({ ...fila, servicioClinicoId: id, clinicaId })),
        { transaction }
      );
    }

    await servicio.update({
      nombre: nombre !== undefined ? nombre : servicio.nombre,
      descripcion: descripcion !== undefined ? descripcion : servicio.descripcion,
      categoria: categoria !== undefined ? categoria : servicio.categoria,
      precioVenta: precioVentaNormalizado,
    }, { transaction });

    await transaction.commit();

    res.json({
      message: 'Servicio actualizado exitosamente',
      servicio,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await ServicioClinico.findOne({ where: tenantWhere(req, { id, activo: true }) });

    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    await servicio.update({ activo: false });

    return res.json({
      message: 'Servicio desactivado exitosamente',
      servicio,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  crearServicio,
  obtenerServicios,
  obtenerServicio,
  editarServicio,
  eliminarServicio,
};
