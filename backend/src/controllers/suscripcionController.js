const Suscripcion = require('../models/Suscripcion');
const Clinica = require('../models/Clinica');

const PLANES = {
  basico: {
    limiteUsuarios: null,
    limiteMascotas: null,
    almacenamientoMB: 500,
    funcionalidades: [
      'citas',
      'historias',
      'inventario_basico',
      'propietarios',
      'mascotas',
    ],
    descripcion: 'Ideal para clinicas pequenas que estan comenzando',
  },
  profesional: {
    limiteUsuarios: null,
    limiteMascotas: null,
    almacenamientoMB: 5000,
    funcionalidades: [
      'citas',
      'historias',
      'inventario',
      'facturacion',
      'reportes',
      'propietarios',
      'mascotas',
      'recordatorios_whatsapp',
      'exportar_pdf',
    ],
    descripcion: 'Para clinicas en crecimiento que necesitan control total',
  },
  enterprise: {
    limiteUsuarios: null,
    limiteMascotas: null,
    almacenamientoMB: null,
    funcionalidades: [
      'citas',
      'historias',
      'inventario',
      'facturacion',
      'reportes',
      'propietarios',
      'mascotas',
      'recordatorios_whatsapp',
      'exportar_pdf',
      'multisede',
      'soporte_prioritario',
      'api_acceso',
    ],
    descripcion: 'Para clinicas grandes o cadenas con multiples sedes',
  },
};

const crearSuscripcion = async (req, res) => {
  try {
    const { clinicaId, plan, fechaInicio, fechaFin, precio, metodoPago, referenciaPago } = req.body;

    if (!clinicaId || !plan || !fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'clinicaId, plan, fechaInicio y fechaFin son obligatorios' });
    }

    if (!PLANES[plan]) {
      return res.status(400).json({ message: 'Plan no valido' });
    }

    const clinica = await Clinica.findOne({ where: { id: clinicaId } });
    if (!clinica) {
      return res.status(404).json({ message: 'Clinica no encontrada' });
    }

    const planConfig = PLANES[plan];

    const suscripcion = await Suscripcion.create({
      plan,
      estado: 'activa',
      fechaInicio,
      fechaFin,
      precio: precio || 0,
      metodoPago,
      referenciaPago,
      limiteUsuarios: planConfig.limiteUsuarios,
      limiteMascotas: planConfig.limiteMascotas,
      funcionalidades: planConfig.funcionalidades,
      clinicaId,
    });

    res.status(201).json({
      message: 'Suscripcion creada exitosamente',
      suscripcion,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerSuscripcionActiva = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;

    const suscripcion = await Suscripcion.findOne({
      where: { clinicaId, estado: 'activa' },
      order: [['fechaFin', 'DESC']],
    });

    if (!suscripcion) {
      return res.status(404).json({ message: 'No hay suscripcion activa' });
    }

    // Verificar si ya vencio
    const hoy = new Date();
    const fechaFin = new Date(suscripcion.fechaFin);

    if (fechaFin < hoy) {
      await suscripcion.update({ estado: 'vencida' });
      return res.status(402).json({ message: 'Suscripcion vencida, por favor renueva tu plan' });
    }

    const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));

    res.json({
      suscripcion,
      diasRestantes,
      advertencia: diasRestantes <= 7 ? 'Tu suscripcion vence pronto' : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerHistorialSuscripciones = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;

    const suscripciones = await Suscripcion.findAll({
      where: { clinicaId },
      order: [['createdAt', 'DESC']],
    });

    res.json({ suscripciones });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const cancelarSuscripcion = async (req, res) => {
  try {
    const { id } = req.params;

    const suscripcion = await Suscripcion.findOne({ where: { id } });
    if (!suscripcion) {
      return res.status(404).json({ message: 'Suscripcion no encontrada' });
    }

    await suscripcion.update({ estado: 'cancelada' });

    res.json({ message: 'Suscripcion cancelada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerPlanes = async (req, res) => {
  res.json({ planes: PLANES });
};

module.exports = {
  crearSuscripcion,
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  cancelarSuscripcion,
  obtenerPlanes,
};