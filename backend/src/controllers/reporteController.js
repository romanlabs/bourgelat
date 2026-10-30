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
const ServicioClinico = require('../models/ServicioClinico');
const { formatDateOnlyLocal } = require('../utils/dateOnly');
const { tenantWhere } = require('../utils/tenant');
const { clasificarVencimiento, hoyISO } = require('../utils/vencimiento');
const {
  validarRango,
  granularidadDe,
  periodoAnterior,
  clavesDelPeriodo,
  armarSerie,
  limitesBogota,
  recortarABasico,
  calcularDestacados,
  margenDe,
  ticketPromedioDe,
  redondearPesos,
  agregarPorMedio,
  fechaBogota,
  GRUPO_GASTO_DE_MEDIO,
} = require('../utils/finanzasPeriodo');
const AbonoFactura = require('../models/AbonoFactura');

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

    const hoy = hoyISO();

    const resumen = {
      totalProductos: productos.length,
      valorTotalInventario: productos.reduce((sum, p) => sum + (parseFloat(p.precioVenta) * p.stock), 0),
      bajoStock: productos.filter(p => p.stock <= p.stockMinimo).length,
      vencidos: productos.filter(p => clasificarVencimiento(p, hoy) === 'vencido').length,
      proximosVencer: productos.filter(p => clasificarVencimiento(p, hoy) === 'proximo').length,
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
      vencidos: insumos.filter(i => clasificarVencimiento(i, hoy) === 'vencido').length,
      proximosVencer: insumos.filter(i => clasificarVencimiento(i, hoy) === 'proximo').length,
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

// ── Analítica de agenda ──────────────────────────────────────────────────────
// A diferencia de `reporteCitas`, que trae las filas y agrega en memoria, aquí
// todo se resuelve con GROUP BY en Postgres apoyándose en los índices que ya
// existen sobre (clinicaId, fecha, estado) y (fecha, veterinarioId, clinicaId).
const ESTADOS_RESUELTOS = ['completada', 'cancelada', 'no_asistio'];

// horaLlegada / horaInicioAtencion son TIME sin fecha: una diferencia negativa
// significa que la atención cruzó la medianoche, no una espera negativa. Se
// descartan esas filas en vez de promediarlas y ensuciar la media.
const ESPERA_VALIDA =
  '"horaLlegada" IS NOT NULL AND "horaInicioAtencion" IS NOT NULL AND "horaInicioAtencion" >= "horaLlegada"';

const contarPorEstado = (estado) =>
  sequelize.literal(`COUNT(*) FILTER (WHERE "estado" = '${estado}')`);

const aRecord = (filas, clave, valor = 'total') =>
  filas.reduce((acc, fila) => {
    acc[fila[clave]] = Number(fila[valor] || 0);
    return acc;
  }, {});

const porcentaje = (parte, total) =>
  total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;

const redondear = (valor) =>
  valor === null || valor === undefined ? null : Math.round(Number(valor));

const reporteAgenda = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son obligatorios' });
    }

    const where = tenantWhere(req, { fecha: { [Op.between]: [fechaInicio, fechaFin] } });
    const total = [sequelize.fn('COUNT', sequelize.col('id')), 'total'];
    const horaDeInicio = sequelize.literal('EXTRACT(HOUR FROM "horaInicio")');
    const diaDeLaSemana = sequelize.literal('EXTRACT(DOW FROM "fecha")');
    const motivoNormalizado = sequelize.literal('LOWER(TRIM("motivoCancelacion"))');

    const [
      porEstado,
      porTipo,
      porOrigen,
      serieDiaria,
      porFranja,
      porDiaSemana,
      porVeterinario,
      topMotivosCancelacion,
      [tiempos],
    ] = await Promise.all([
      Cita.findAll({ attributes: ['estado', total], where, group: ['estado'], raw: true }),

      Cita.findAll({ attributes: ['tipoCita', total], where, group: ['tipoCita'], raw: true }),

      Cita.findAll({ attributes: ['origen', total], where, group: ['origen'], raw: true }),

      Cita.findAll({
        attributes: [
          'fecha',
          total,
          [contarPorEstado('completada'), 'completadas'],
          [contarPorEstado('no_asistio'), 'noAsistio'],
        ],
        where,
        group: ['fecha'],
        order: [['fecha', 'ASC']],
        raw: true,
      }),

      Cita.findAll({
        attributes: [[horaDeInicio, 'hora'], total],
        where,
        group: [horaDeInicio],
        order: [[horaDeInicio, 'ASC']],
        raw: true,
      }),

      Cita.findAll({
        attributes: [[diaDeLaSemana, 'dia'], total],
        where,
        group: [diaDeLaSemana],
        order: [[diaDeLaSemana, 'ASC']],
        raw: true,
      }),

      Cita.findAll({
        attributes: [
          'veterinarioId',
          [sequelize.fn('COUNT', sequelize.col('Cita.id')), 'total'],
          [contarPorEstado('completada'), 'completadas'],
          [contarPorEstado('no_asistio'), 'noAsistio'],
        ],
        include: [{ model: Usuario, as: 'veterinario', attributes: ['nombre'] }],
        where,
        group: ['Cita.veterinarioId', 'veterinario.id'],
        order: [[sequelize.literal('total'), 'DESC']],
        raw: true,
        nest: true,
      }),

      Cita.findAll({
        attributes: [[motivoNormalizado, 'motivo'], total],
        where: { ...where, estado: 'cancelada', motivoCancelacion: { [Op.ne]: null } },
        group: [motivoNormalizado],
        order: [[sequelize.literal('total'), 'DESC']],
        limit: 5,
        raw: true,
      }),

      Cita.findAll({
        attributes: [
          [
            sequelize.literal(
              `AVG(EXTRACT(EPOCH FROM ("horaInicioAtencion" - "horaLlegada")) / 60) FILTER (WHERE ${ESPERA_VALIDA})`
            ),
            'esperaMediaMin',
          ],
          [
            sequelize.literal(
              'AVG(EXTRACT(EPOCH FROM ("horaFin" - "horaInicio")) / 60) FILTER (WHERE "horaFin" >= "horaInicio")'
            ),
            'duracionMediaMin',
          ],
        ],
        where,
        raw: true,
      }),
    ]);

    const citasPorEstado = aRecord(porEstado, 'estado');
    const totalCitas = Object.values(citasPorEstado).reduce((suma, n) => suma + n, 0);
    const completadas = citasPorEstado.completada || 0;
    const canceladas = citasPorEstado.cancelada || 0;
    const noAsistio = citasPorEstado.no_asistio || 0;

    // Las citas aún `programada` no cuentan como fracaso ni como éxito: la tasa
    // se mide solo sobre lo que ya se resolvió, para que un periodo con días
    // futuros no la hunda artificialmente.
    const resueltas = ESTADOS_RESUELTOS.reduce(
      (suma, estado) => suma + (citasPorEstado[estado] || 0),
      0
    );

    const citasPorOrigen = aRecord(porOrigen, 'origen');
    const walkIn = citasPorOrigen.walk_in || 0;

    res.json({
      periodo: {
        fechaInicio,
        fechaFin,
        dias: Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 86400000) + 1,
      },
      resumen: {
        totalCitas,
        completadas,
        canceladas,
        noAsistio,
        walkIn,
        tasaAsistencia: porcentaje(completadas, resueltas),
        tasaNoShow: porcentaje(noAsistio, resueltas),
        walkInPct: porcentaje(walkIn, totalCitas),
        esperaMediaMin: redondear(tiempos?.esperaMediaMin),
        duracionMediaMin: redondear(tiempos?.duracionMediaMin),
      },
      serieDiaria: serieDiaria.map((fila) => ({
        fecha: fila.fecha,
        total: Number(fila.total || 0),
        completadas: Number(fila.completadas || 0),
        noAsistio: Number(fila.noAsistio || 0),
      })),
      citasPorEstado,
      citasPorTipo: aRecord(porTipo, 'tipoCita'),
      citasPorFranja: aRecord(porFranja, 'hora'),
      citasPorDiaSemana: aRecord(porDiaSemana, 'dia'),
      citasPorOrigen,
      porVeterinario: porVeterinario.map((fila) => ({
        id: fila.veterinarioId,
        nombre: fila.veterinario?.nombre || 'Sin profesional',
        total: Number(fila.total || 0),
        completadas: Number(fila.completadas || 0),
        noAsistio: Number(fila.noAsistio || 0),
      })),
      topMotivosCancelacion: topMotivosCancelacion.map((fila) => ({
        motivo: fila.motivo,
        total: Number(fila.total || 0),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// ── Análisis financiero del periodo ──────────────────────────────────────────
// La lectura larga de Finanzas (un año, un trimestre, un rango libre). Usa los
// mismos criterios que `reporteRentabilidad` —ingreso = facturas emitidas,
// parciales o pagadas; gasto = gastos no anulados— pero agrega en Postgres en
// vez de traer filas: un año de una clínica grande son miles de facturas.
// Los métodos de pago no van aquí: `metodoPago` está cifrado y no se agrupa en SQL.
const ESTADOS_INGRESO = ['emitida', 'pagada', 'parcial'];
const TOP_LINEAS = 5;

const sumaDe = (columna) => sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col(columna)), 0);

const topPorLinea = (columnaId, whereFactura) =>
  FacturaItem.findAll({
    attributes: [
      [sequelize.col(`FacturaItem.${columnaId}`), 'id'],
      [sequelize.fn('SUM', sequelize.col('FacturaItem.cantidad')), 'cantidad'],
      [sequelize.fn('SUM', sequelize.col('FacturaItem.subtotal')), 'total'],
    ],
    where: { [columnaId]: { [Op.ne]: null } },
    include: [{ model: Factura, as: 'factura', attributes: [], where: whereFactura }],
    group: [`FacturaItem.${columnaId}`],
    order: [[sequelize.literal('total'), 'DESC']],
    limit: TOP_LINEAS,
    raw: true,
  });

// La descripción de la línea está cifrada: el nombre sale del catálogo, que
// además es el vigente si el producto se renombró después de venderlo.
const conNombres = async (req, filas, Modelo) => {
  if (filas.length === 0) return [];
  const catalogo = await Modelo.findAll({
    attributes: ['id', 'nombre'],
    where: tenantWhere(req, { id: filas.map((fila) => fila.id) }),
    raw: true,
  });
  const nombres = new Map(catalogo.map((item) => [item.id, item.nombre]));
  return filas.map((fila) => ({
    id: fila.id,
    nombre: nombres.get(fila.id) || 'Sin nombre',
    cantidad: Number(fila.cantidad || 0),
    total: redondearPesos(fila.total),
  }));
};

// Lo que la venta trajo de contado: total menos lo que se debe y menos lo que
// entró por abonos (esos se cuentan el día en que se recibieron). De contado da
// el total; a crédito da 0 porque saldo + abonos = total.
const COBRADO_DE_CONTADO = sequelize.literal(`COALESCE(SUM(
  "Factura"."total"
  - COALESCE("Factura"."saldoPendiente", 0)
  - COALESCE((SELECT SUM(a."monto") FROM "abonos_factura" a WHERE a."facturaId" = "Factura"."id"), 0)
), 0)`);

const reporteFinanzasPeriodo = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const errorRango = validarRango(fechaInicio, fechaFin);
    if (errorRango) return res.status(400).json({ message: errorRango });

    const granularidad = granularidadDe(fechaInicio, fechaFin);
    const anterior = periodoAnterior(fechaInicio, fechaFin);
    const formato = granularidad === 'mes' ? 'YYYY-MM' : 'YYYY-MM-DD';
    const tramo = sequelize.literal(`to_char("fecha", '${formato}')`);
    const tramoAbono = sequelize.literal(
      `to_char(("AbonoFactura"."createdAt" AT TIME ZONE 'America/Bogota'), '${formato}')`
    );

    // Los abonos de una factura anulada no existen: anular exige que no tenga abonos.
    const whereAbonos = (inicio, fin) => {
      const { desde, hasta } = limitesBogota(inicio, fin);
      return tenantWhere(req, { createdAt: { [Op.gte]: desde, [Op.lt]: hasta } });
    };

    const whereFacturas = (inicio, fin) =>
      tenantWhere(req, {
        estado: { [Op.in]: ESTADOS_INGRESO },
        fecha: { [Op.between]: [inicio, fin] },
      });
    const whereGastos = (inicio, fin) =>
      tenantWhere(req, { anulado: false, fecha: { [Op.between]: [inicio, fin] } });

    const facturasPeriodo = whereFacturas(fechaInicio, fechaFin);
    const gastosPeriodo = whereGastos(fechaInicio, fechaFin);

    const [
      facturasPorTramo,
      gastosPorTramo,
      porCategoria,
      porTipo,
      topServiciosFilas,
      topProductosFilas,
      sinCatalogoFilas,
      [carteraFila],
      [facturasAnterior],
      [gastosAnterior],
      abonosPorTramo,
      [abonosAnterior],
    ] = await Promise.all([
      Factura.findAll({
        attributes: [
          [tramo, 'periodo'],
          [COBRADO_DE_CONTADO, 'cobrado'],
          [sumaDe('total'), 'vendido'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'ventas'],
        ],
        where: facturasPeriodo,
        group: [tramo],
        raw: true,
      }),

      Gasto.findAll({
        attributes: [[tramo, 'periodo'], [sumaDe('monto'), 'gastos']],
        where: gastosPeriodo,
        group: [tramo],
        raw: true,
      }),

      Gasto.findAll({
        attributes: ['categoria', [sumaDe('monto'), 'total']],
        where: gastosPeriodo,
        group: ['categoria'],
        raw: true,
      }),

      FacturaItem.findAll({
        attributes: ['tipo', [sequelize.fn('SUM', sequelize.col('FacturaItem.subtotal')), 'total']],
        include: [{ model: Factura, as: 'factura', attributes: [], where: facturasPeriodo }],
        group: ['FacturaItem.tipo'],
        raw: true,
      }),

      topPorLinea('servicioClinicoId', facturasPeriodo),
      topPorLinea('productoId', facturasPeriodo),

      // Líneas escritas a mano, sin producto ni servicio del catálogo: no entran
      // en los top (su descripción está cifrada y no se agrupa), pero su total
      // se informa para que los top cuadren con «Ventas por tipo».
      FacturaItem.findAll({
        attributes: ['tipo', [sequelize.fn('SUM', sequelize.col('FacturaItem.subtotal')), 'total']],
        where: { servicioClinicoId: null, productoId: null },
        include: [{ model: Factura, as: 'factura', attributes: [], where: facturasPeriodo }],
        group: ['FacturaItem.tipo'],
        raw: true,
      }),

      // Cartera: todo el fiado que se debe hoy, sin importar cuándo se vendió.
      Factura.findAll({
        attributes: [
          [sumaDe('saldoPendiente'), 'porCobrar'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'creditos'],
          [sequelize.fn('MIN', sequelize.col('fecha')), 'masAntiguo'],
        ],
        where: tenantWhere(req, {
          estado: { [Op.in]: ['emitida', 'parcial'] },
          saldoPendiente: { [Op.gt]: 0 },
        }),
        raw: true,
      }),

      Factura.findAll({
        attributes: [
          [COBRADO_DE_CONTADO, 'cobrado'],
          [sumaDe('total'), 'vendido'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'ventas'],
        ],
        where: whereFacturas(anterior.fechaInicio, anterior.fechaFin),
        raw: true,
      }),

      Gasto.findAll({
        attributes: [[sumaDe('monto'), 'gastos']],
        where: whereGastos(anterior.fechaInicio, anterior.fechaFin),
        raw: true,
      }),

      AbonoFactura.findAll({
        attributes: [[tramoAbono, 'periodo'], [sumaDe('monto'), 'cobrado']],
        where: whereAbonos(fechaInicio, fechaFin),
        group: [tramoAbono],
        raw: true,
      }),

      AbonoFactura.findAll({
        attributes: [[sumaDe('monto'), 'cobrado']],
        where: whereAbonos(anterior.fechaInicio, anterior.fechaFin),
        raw: true,
      }),
    ]);

    const [topServicios, topProductos] = await Promise.all([
      conNombres(req, topServiciosFilas, ServicioClinico),
      conNombres(req, topProductosFilas, Producto),
    ]);

    const serie = armarSerie(
      clavesDelPeriodo(fechaInicio, fechaFin, granularidad),
      facturasPorTramo,
      gastosPorTramo,
      abonosPorTramo
    );

    const sumar = (campo) => redondearPesos(serie.reduce((suma, fila) => suma + fila[campo], 0));
    const ingresos = sumar('ingresos');
    const vendido = sumar('vendido');
    const gastos = sumar('gastos');
    const ventas = serie.reduce((suma, fila) => suma + fila.ventas, 0);
    const ganancia = redondearPesos(ingresos - gastos);
    const abonos = redondearPesos(abonosPorTramo.reduce((suma, fila) => suma + Number(fila.cobrado || 0), 0));

    const ingresosAnterior = redondearPesos(
      Number(facturasAnterior?.cobrado || 0) + Number(abonosAnterior?.cobrado || 0)
    );
    const vendidoAnterior = redondearPesos(facturasAnterior?.vendido);
    const gastosAnteriorTotal = redondearPesos(gastosAnterior?.gastos);
    const ventasAnterior = Number(facturasAnterior?.ventas || 0);

    const tipos = aRecord(porTipo, 'tipo');
    const sinCatalogo = aRecord(sinCatalogoFilas, 'tipo');

    const reporte = {
      alcance: 'completo',
      periodo: { fechaInicio, fechaFin, granularidad, anterior },
      resumen: {
        ingresos,
        vendido,
        abonos,
        gastos,
        ganancia,
        margen: margenDe(ingresos, ganancia),
        ventas,
        // El ticket mide cuánto vale una venta, se haya cobrado o no.
        ticketPromedio: ticketPromedioDe(vendido, ventas),
        porCobrar: redondearPesos(carteraFila?.porCobrar),
        creditosPendientes: Number(carteraFila?.creditos || 0),
        creditoMasAntiguo: carteraFila?.masAntiguo || null,
      },
      anterior: {
        ingresos: ingresosAnterior,
        vendido: vendidoAnterior,
        gastos: gastosAnteriorTotal,
        ganancia: redondearPesos(ingresosAnterior - gastosAnteriorTotal),
        ventas: ventasAnterior,
        ticketPromedio: ticketPromedioDe(vendidoAnterior, ventasAnterior),
      },
      serie,
      destacados: calcularDestacados(serie),
      gastosPorCategoria: aRecord(porCategoria, 'categoria'),
      ingresosPorTipo: {
        servicio: redondearPesos(tipos.servicio),
        producto: redondearPesos(tipos.producto),
      },
      topServicios,
      topProductos,
      sinCatalogo: {
        servicio: redondearPesos(sinCatalogo.servicio),
        producto: redondearPesos(sinCatalogo.producto),
      },
    };

    // La ruta decide el alcance (rol y plan); por defecto, el básico.
    res.json(req.analisisCompleto === true ? reporte : recortarABasico(reporte));
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// ── Cobrado por medio de pago ────────────────────────────────────────────────
// ¿Por dónde entra la plata? Mismo «cobrado» que el análisis del periodo
// (contado de las ventas + abonos recibidos), repartido por medio. El método de
// pago está cifrado: se traen solo las columnas necesarias y se agrupa en memoria.
const ABONADO_DE_LA_FACTURA = sequelize.literal(
  `(SELECT COALESCE(SUM(a."monto"), 0) FROM "abonos_factura" a WHERE a."facturaId" = "Factura"."id")`
);

const reporteMediosPago = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const errorRango = validarRango(fechaInicio, fechaFin);
    if (errorRango) return res.status(400).json({ message: errorRango });

    const granularidad = granularidadDe(fechaInicio, fechaFin);
    const anterior = periodoAnterior(fechaInicio, fechaFin);
    const completo = req.analisisCompleto === true;

    const leerFacturas = (inicio, fin) =>
      Factura.findAll({
        attributes: ['id', 'fecha', 'total', 'saldoPendiente', 'metodoPago', [ABONADO_DE_LA_FACTURA, 'abonado']],
        where: tenantWhere(req, {
          estado: { [Op.in]: ESTADOS_INGRESO },
          fecha: { [Op.between]: [inicio, fin] },
        }),
      });

    const leerAbonos = (inicio, fin) => {
      const { desde, hasta } = limitesBogota(inicio, fin);
      return AbonoFactura.findAll({
        attributes: ['monto', 'metodoPago', 'createdAt'],
        where: tenantWhere(req, { createdAt: { [Op.gte]: desde, [Op.lt]: hasta } }),
      });
    };

    const [facturas, abonos, facturasAnterior, abonosAnterior, gastosPorMetodo] = await Promise.all([
      leerFacturas(fechaInicio, fechaFin),
      leerAbonos(fechaInicio, fechaFin),
      leerFacturas(anterior.fechaInicio, anterior.fechaFin),
      leerAbonos(anterior.fechaInicio, anterior.fechaFin),
      // Los gastos (metodoPago plano) solo van en el análisis completo, como la rentabilidad.
      completo
        ? Gasto.findAll({
            attributes: ['metodoPago', [sumaDe('monto'), 'total']],
            where: tenantWhere(req, { anulado: false, fecha: { [Op.between]: [fechaInicio, fechaFin] } }),
            group: ['metodoPago'],
            raw: true,
          })
        : [],
    ]);

    const entrada = (filasFacturas, filasAbonos) => ({
      facturas: filasFacturas.map((f) => ({
        id: f.id,
        fecha: f.fecha,
        total: f.total,
        saldoPendiente: f.saldoPendiente,
        metodoPago: f.metodoPago,
      })),
      abonosPorFactura: Object.fromEntries(filasFacturas.map((f) => [f.id, f.get('abonado')])),
      abonos: filasAbonos.map((a) => ({
        fecha: fechaBogota(a.createdAt),
        monto: a.monto,
        metodoPago: a.metodoPago,
      })),
    });

    const actual = agregarPorMedio({
      ...entrada(facturas, abonos),
      claves: clavesDelPeriodo(fechaInicio, fechaFin, granularidad),
      granularidad,
    });
    const previo = agregarPorMedio(entrada(facturasAnterior, abonosAnterior));
    const previoPorMedio = Object.fromEntries(previo.medios.map((m) => [m.id, m.cobrado]));
    const gastosPorGrupo = aRecord(gastosPorMetodo, 'metodoPago');

    res.json({
      alcance: completo ? 'completo' : 'basico',
      periodo: { fechaInicio, fechaFin, granularidad, anterior },
      total: actual.total,
      totalAnterior: previo.total,
      // Lo vendido a crédito en el periodo que aún se debe: no entró por ningún medio.
      porCobrarDelPeriodo: redondearPesos(facturas.reduce((suma, f) => suma + Number(f.saldoPendiente || 0), 0)),
      medios: actual.medios.map((medio) => ({
        ...medio,
        anterior: previoPorMedio[medio.id] || 0,
        ...(completo
          ? { grupoGasto: GRUPO_GASTO_DE_MEDIO[medio.id], gastosGrupo: redondearPesos(gastosPorGrupo[GRUPO_GASTO_DE_MEDIO[medio.id]]) }
          : {}),
      })),
      serie: actual.serie,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  reporteIngresos,
  reporteCitas,
  reporteAgenda,
  reporteInventario,
  dashboardGeneral,
  reporteRentabilidad,
  reporteFinanzasPeriodo,
  reporteMediosPago,
};
