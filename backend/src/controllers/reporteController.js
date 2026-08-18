const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Factura = require('../models/Factura');
const FacturaItem = require('../models/FacturaItem');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const InsumoClinico = require('../models/InsumoClinico');
const Gasto = require('../models/Gasto');
const { formatDateOnlyLocal } = require('../utils/dateOnly');

const reporteIngresos = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son obligatorios' });
    }

    const facturas = await Factura.findAll({
      where: {
        clinicaId,
        estado: { [Op.in]: ['emitida', 'pagada', 'parcial'] },
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      attributes: ['id', 'numero', 'fecha', 'total', 'metodoPago'],
      order: [['fecha', 'ASC']],
    });

    const totalIngresos = facturas.reduce((sum, f) => sum + parseFloat(f.total), 0);

    const ingresosPorMetodoPago = facturas.reduce((acc, f) => {
      const metodo = f.metodoPago || 'otro';
      acc[metodo] = (acc[metodo] || 0) + parseFloat(f.total);
      return acc;
    }, {});

    // Ingresos por dia
    const ingresosPorDia = facturas.reduce((acc, f) => {
      const dia = f.fecha;
      acc[dia] = (acc[dia] || 0) + parseFloat(f.total);
      return acc;
    }, {});

    res.json({
      periodo: { fechaInicio, fechaFin },
      totalFacturas: facturas.length,
      totalIngresos,
      ingresosPorMetodoPago,
      ingresosPorDia,
      facturas,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const reporteCitas = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son obligatorios' });
    }

    const citas = await Cita.findAll({
      where: {
        clinicaId,
        fecha: { [Op.between]: [fechaInicio, fechaFin] },
      },
      attributes: ['id', 'fecha', 'tipoCita', 'estado'],
      order: [['fecha', 'ASC']],
    });

    const citasPorEstado = citas.reduce((acc, c) => {
      acc[c.estado] = (acc[c.estado] || 0) + 1;
      return acc;
    }, {});

    const citasPorTipo = citas.reduce((acc, c) => {
      acc[c.tipoCita] = (acc[c.tipoCita] || 0) + 1;
      return acc;
    }, {});

    const tasaAsistencia = citas.length > 0
      ? ((citasPorEstado['completada'] || 0) / citas.length * 100).toFixed(1)
      : 0;

    res.json({
      periodo: { fechaInicio, fechaFin },
      totalCitas: citas.length,
      citasPorEstado,
      citasPorTipo,
      tasaAsistencia: `${tasaAsistencia}%`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const reporteInventario = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;

    const productos = await Producto.findAll({
      where: { clinicaId, activo: true },
      attributes: ['id', 'nombre', 'categoria', 'stock', 'stockMinimo', 'precioVenta', 'fechaVencimiento'],
      order: [['categoria', 'ASC'], ['nombre', 'ASC']],
    });

    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const resumen = {
      totalProductos: productos.length,
      valorTotalInventario: productos.reduce((sum, p) => sum + (parseFloat(p.precioVenta) * p.stock), 0),
      bajoStock: productos.filter(p => p.stock <= p.stockMinimo).length,
      vencidos: productos.filter(p => p.fechaVencimiento && new Date(p.fechaVencimiento) < hoy).length,
      proximosVencer: productos.filter(p => p.fechaVencimiento && new Date(p.fechaVencimiento) <= en30dias && new Date(p.fechaVencimiento) >= hoy).length,
    };

    const porCategoria = productos.reduce((acc, p) => {
      if (!acc[p.categoria]) acc[p.categoria] = { total: 0, valor: 0 };
      acc[p.categoria].total += 1;
      acc[p.categoria].valor += parseFloat(p.precioVenta) * p.stock;
      return acc;
    }, {});

    // El inventario clínico va aparte: no se vende, así que se valoriza al
    // costo (precioUnitarioBase) y no tiene precio de venta que sumar.
    const insumos = await InsumoClinico.findAll({
      where: { clinicaId, activo: true },
      attributes: ['id', 'nombre', 'categoria', 'unidadBase', 'stock', 'stockMinimo', 'precioUnitarioBase', 'fechaVencimiento'],
      order: [['categoria', 'ASC'], ['nombre', 'ASC']],
    });

    const resumenClinico = {
      totalInsumos: insumos.length,
      valorTotalInventario: insumos.reduce((sum, i) => sum + (parseFloat(i.precioUnitarioBase) * parseFloat(i.stock)), 0),
      bajoStock: insumos.filter(i => parseFloat(i.stock) <= parseFloat(i.stockMinimo)).length,
      vencidos: insumos.filter(i => i.fechaVencimiento && new Date(i.fechaVencimiento) < hoy).length,
      proximosVencer: insumos.filter(i => i.fechaVencimiento && new Date(i.fechaVencimiento) <= en30dias && new Date(i.fechaVencimiento) >= hoy).length,
    };

    res.json({ resumen, porCategoria, productos, resumenClinico, insumos });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const dashboardGeneral = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const fechaHoy = formatDateOnlyLocal(hoy);

    // Citas de hoy
    const citasHoy = await Cita.count({
      where: { clinicaId, fecha: fechaHoy },
    });

    const citasPendientesHoy = await Cita.count({
      where: { clinicaId, fecha: fechaHoy, estado: 'programada' },
    });

    // Ingresos del mes
    const ingresosMes = await Factura.sum('total', {
      where: {
        clinicaId,
        estado: { [Op.in]: ['emitida', 'pagada', 'parcial'] },
        fecha: { [Op.between]: [inicioMes, finMes] },
      },
    });

    // Totales generales
    const totalPropietarios = await Propietario.count({ where: { clinicaId, activo: true } });
    const totalMascotas = await Mascota.count({ where: { clinicaId, activo: true } });
    const totalUsuarios = await Usuario.count({ where: { clinicaId, activo: true } });

    // Alertas de inventario. Son dos inventarios distintos y ambos importan:
    // quedarse sin un insumo clínico frena una cirugía igual que quedarse sin
    // un producto frena una venta.
    const productosbajoStock = await Producto.count({
      where: {
        clinicaId,
        activo: true,
        stock: { [Op.lte]: sequelize.col('stockMinimo') },
      },
    });

    const insumosBajoStock = await InsumoClinico.count({
      where: {
        clinicaId,
        activo: true,
        stock: { [Op.lte]: sequelize.col('stockMinimo') },
      },
    });

    res.json({
      hoy: {
        fecha: fechaHoy,
        citasTotales: citasHoy,
        citasPendientes: citasPendientesHoy,
      },
      mes: {
        ingresos: ingresosMes || 0,
      },
      totales: {
        propietarios: totalPropietarios,
        mascotas: totalMascotas,
        usuarios: totalUsuarios,
      },
      alertas: {
        productosbajoStock,
        insumosBajoStock,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// El corazón del ciclo administrativo: ¿la clínica ganó o perdió en el periodo?
// Ganancia = ingresos por facturas (emitidas/pagadas) − gastos no anulados.
const reporteRentabilidad = async (req, res) => {
  try {
    const { clinicaId } = req.usuario;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son obligatorios' });
    }

    const [facturas, gastos] = await Promise.all([
      Factura.findAll({
        where: {
          clinicaId,
          estado: { [Op.in]: ['emitida', 'pagada', 'parcial'] },
          fecha: { [Op.between]: [fechaInicio, fechaFin] },
        },
        attributes: ['fecha', 'total'],
      }),
      Gasto.findAll({
        where: {
          clinicaId,
          anulado: false,
          fecha: { [Op.between]: [fechaInicio, fechaFin] },
        },
        attributes: ['fecha', 'monto', 'categoria'],
      }),
    ]);

    const totalIngresos = facturas.reduce((sum, f) => sum + parseFloat(f.total), 0);
    const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
    const ganancia = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? ((ganancia / totalIngresos) * 100).toFixed(1) : null;

    const gastosPorCategoria = gastos.reduce((acc, g) => {
      acc[g.categoria] = (acc[g.categoria] || 0) + parseFloat(g.monto);
      return acc;
    }, {});

    // Serie diaria para graficar ingresos vs gastos en el mismo eje.
    const porDia = {};
    for (const f of facturas) {
      if (!porDia[f.fecha]) porDia[f.fecha] = { ingresos: 0, gastos: 0 };
      porDia[f.fecha].ingresos += parseFloat(f.total);
    }
    for (const g of gastos) {
      if (!porDia[g.fecha]) porDia[g.fecha] = { ingresos: 0, gastos: 0 };
      porDia[g.fecha].gastos += parseFloat(g.monto);
    }

    res.json({
      periodo: { fechaInicio, fechaFin },
      totalIngresos,
      totalGastos,
      ganancia,
      margen: margen !== null ? `${margen}%` : null,
      gastosPorCategoria,
      porDia,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { reporteIngresos, reporteCitas, reporteInventario, dashboardGeneral, reporteRentabilidad };
