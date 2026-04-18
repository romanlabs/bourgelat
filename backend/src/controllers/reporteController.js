const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Factura = require('../models/Factura');
const FacturaItem = require('../models/FacturaItem');
const Cita = require('../models/Cita');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
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
        estado: { [Op.in]: ['emitida', 'pagada'] },
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

    res.json({ resumen, porCategoria, productos });
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
        estado: { [Op.in]: ['emitida', 'pagada'] },
        fecha: { [Op.between]: [inicioMes, finMes] },
      },
    });

    // Totales generales
    const totalPropietarios = await Propietario.count({ where: { clinicaId, activo: true } });
    const totalMascotas = await Mascota.count({ where: { clinicaId, activo: true } });
    const totalUsuarios = await Usuario.count({ where: { clinicaId, activo: true } });

    // Alertas de inventario
    const productosbajoStock = await Producto.count({
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
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { reporteIngresos, reporteCitas, reporteInventario, dashboardGeneral };
