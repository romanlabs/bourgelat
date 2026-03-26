const AntecedentesMascota = require('../models/AntecedentesMascota');
const Mascota = require('../models/Mascota');

const obtenerOCrearAntecedentes = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    let antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });

    // Si no existe lo crea automaticamente
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

    const antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaAlergia = {
      id: Date.now().toString(),
      tipo,
      descripcion,
      reaccion,
      fecha: fecha || new Date().toISOString().split('T')[0],
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

    const antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaCirugia = {
      id: Date.now().toString(),
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

    const antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaVacuna = {
      id: Date.now().toString(),
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

    const antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });
    if (!antecedentes) {
      return res.status(404).json({ message: 'Antecedentes no encontrados' });
    }

    const nuevaCondicion = {
      id: Date.now().toString(),
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

    const antecedentes = await AntecedentesMascota.findOne({ where: { mascotaId, clinicaId } });
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
