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
  // Una receta vacia es valida: el servicio se factura sin descontar inventario.
  if (!Array.isArray(insumos)) {
    return { error: 'Los insumos de la receta deben ser una lista' };
  }

  const filasValidas = [];
  const insumosVistos = new Set();

  for (const item of insumos) {
    const cantidadConsumida = normalizarNumero(item?.cantidadConsumida, Number.NaN);

    if (!item?.insumoClinicoId || Number.isNaN(cantidadConsumida) || cantidadConsumida <= 0) {
      return { error: 'Cada insumo de la receta debe tener insumoClinicoId y cantidadConsumida mayor a 0' };
    }

    if (insumosVistos.has(item.insumoClinicoId)) {
      return { error: 'No se puede repetir el mismo insumo dos veces en la receta' };
    }
    insumosVistos.add(item.insumoClinicoId);

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

    if (filasValidas.length > 0) {
      await ServicioClinicoInsumo.bulkCreate(
        filasValidas.map((fila) => ({ ...fila, servicioClinicoId: servicio.id, clinicaId })),
        { transaction }
      );
    }

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

    // ?estado=inactivos lista los desactivados (para reactivarlos); por defecto, activos.
    const where = tenantWhere(req, { activo: req.query.estado !== 'inactivos' });
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

      await ServicioClinicoInsumo.destroy({ where: { servicioClinicoId: id, clinicaId }, transaction });
      if (filasValidas.length > 0) {
        await ServicioClinicoInsumo.bulkCreate(
          filasValidas.map((fila) => ({ ...fila, servicioClinicoId: id, clinicaId })),
          { transaction }
        );
      }
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


// Revierte la desactivación (desactivado por error o que vuelve a usarse).
const activarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicio = await ServicioClinico.findOne({ where: tenantWhere(req, { id, activo: false }) });

    if (!servicio) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    await servicio.update({ activo: true });

    return res.json({
      message: 'Servicio reactivado',
      servicio,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

const MAX_IMPORT_ROWS = 500;

// Importacion masiva desde la plantilla de Excel. Los servicios entran sin
// receta de insumos; la receta se arma despues desde la pantalla de Servicios.
const importarServicios = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const servicios = Array.isArray(req.body.servicios) ? req.body.servicios : [];

    if (servicios.length === 0) {
      return res.status(400).json({ message: 'No se recibieron servicios para importar' });
    }

    if (servicios.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        message: `No se pueden importar mas de ${MAX_IMPORT_ROWS} servicios por archivo`,
      });
    }

    const filasNormalizadas = servicios.map((fila, indice) => {
      const precioVenta = normalizarNumero(fila.precioVenta, 0);
      const nombre = String(fila.nombre || '').trim();
      const categoria = fila.categoria ? String(fila.categoria).trim() : '';
      const descripcion = fila.descripcion ? String(fila.descripcion).trim() : '';

      return {
        indice,
        valido: Boolean(nombre) && Number.isFinite(precioVenta) && precioVenta >= 0,
        nombre,
        categoria: categoria || null,
        descripcion: descripcion || null,
        precioVenta,
      };
    });

    const nombresBuscados = filasNormalizadas.map((fila) => fila.nombre).filter(Boolean);
    const existentes = nombresBuscados.length
      ? await ServicioClinico.findAll({
        where: tenantWhere(req, { activo: true, nombre: { [Op.in]: nombresBuscados } }),
        attributes: ['nombre'],
      })
      : [];

    const nombresExistentes = new Set(existentes.map((s) => s.nombre.trim().toLowerCase()));
    const nombresReservados = new Set();
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

      if (nombresReservados.has(nombreClave)) {
        omitidos.push({ fila: fila.indice + 1, nombre: fila.nombre, motivo: 'duplicado_en_archivo' });
        return;
      }

      nombresReservados.add(nombreClave);
      filasACrear.push(fila);
    });

    const creados = await sequelize.transaction(async (transaction) => ServicioClinico.bulkCreate(
      filasACrear.map((fila) => ({
        nombre: fila.nombre,
        categoria: fila.categoria,
        descripcion: fila.descripcion,
        precioVenta: fila.precioVenta,
        clinicaId,
      })),
      { transaction }
    ));

    res.status(201).json({
      message: 'Importacion completada',
      creados,
      omitidos,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  crearServicio,
  importarServicios,
  obtenerServicios,
  obtenerServicio,
  editarServicio,
  eliminarServicio,
  activarServicio,
};
