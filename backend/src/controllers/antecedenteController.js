const AntecedentesMascota = require('../models/AntecedentesMascota');
const Mascota = require('../models/Mascota');
const crypto = require('crypto');
const { formatDateOnlyLocal } = require('../utils/dateOnly');

const obtenerOMaterializarAntecedentes = async ({ mascotaId, clinicaId }) => {
  const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId, activo: true } });

  if (!mascota) {
    return { mascota: null, antecedentes: null };
  }

  let antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });

  if (!antecedentes) {
    antecedentes = await AntecedentesMascota.create({
      mascotaId,
      clinicaId,
      alergias: [],
      enfermedadesPrevias: [],
      cirugias: [],
      vacunas: [],
      condicionesCronicas: [],
      medicamentosActuales: [],
    });
  }

  return { mascota, antecedentes };
};

const obtenerOCrearAntecedentes = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.json({ antecedentes });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const agregarAlergia = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;
    const { tipo, descripcion, reaccion, fecha } = req.body;

    if (!tipo || !descripcion) {
      return res.status(400).json({ message: 'Tipo y descripcion son obligatorios' });
    }

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaAlergia = {
      id: crypto.randomUUID(),
      tipo,
      descripcion,
      reaccion,
      fecha: fecha || formatDateOnlyLocal(),
    };

    const alergias = [...antecedentes.alergias, nuevaAlergia];
    await antecedentes.update({ alergias });

    res.json({ message: 'Alergia agregada exitosamente', alergia: nuevaAlergia });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const agregarCirugia = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;
    const { nombre, fecha, veterinario, observaciones } = req.body;

    if (!nombre || !fecha) {
      return res.status(400).json({ message: 'Nombre y fecha son obligatorios' });
    }

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaCirugia = {
      id: crypto.randomUUID(),
      nombre,
      fecha,
      veterinario,
      observaciones,
    };

    const cirugias = [...antecedentes.cirugias, nuevaCirugia];
    await antecedentes.update({ cirugias });

    res.json({ message: 'Cirugia agregada exitosamente', cirugia: nuevaCirugia });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const agregarVacuna = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;
    const { nombre, fecha, proximaDosis, lote, laboratorio } = req.body;

    if (!nombre || !fecha) {
      return res.status(400).json({ message: 'Nombre y fecha son obligatorios' });
    }

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaVacuna = {
      id: crypto.randomUUID(),
      nombre,
      fecha,
      proximaDosis,
      lote,
      laboratorio,
    };

    const vacunas = [...antecedentes.vacunas, nuevaVacuna];
    await antecedentes.update({ vacunas });

    res.json({ message: 'Vacuna agregada exitosamente', vacuna: nuevaVacuna });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const agregarCondicionCronica = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;
    const { nombre, fechaDiagnostico, tratamientoActual } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'Nombre es obligatorio' });
    }

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaCondicion = {
      id: crypto.randomUUID(),
      nombre,
      fechaDiagnostico,
      tratamientoActual,
    };

    const condicionesCronicas = [...antecedentes.condicionesCronicas, nuevaCondicion];
    await antecedentes.update({ condicionesCronicas });

    res.json({ message: 'Condicion cronica agregada exitosamente', condicion: nuevaCondicion });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const actualizarGenerales = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;
    const { esterilizado, fechaEsterilizacion, observacionesGenerales, medicamentosActuales } = req.body;

    const { mascota, antecedentes } = await obtenerOMaterializarAntecedentes({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    await antecedentes.update({
      esterilizado,
      fechaEsterilizacion,
      observacionesGenerales,
      medicamentosActuales,
    });

    res.json({ message: 'Antecedentes actualizados exitosamente', antecedentes });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  obtenerOCrearAntecedentes,
  agregarAlergia,
  agregarCirugia,
  agregarVacuna,
  agregarCondicionCronica,
  actualizarGenerales,
};
