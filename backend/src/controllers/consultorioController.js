const Consultorio = require('../models/Consultorio');
const { tenantWhere } = require('../utils/tenant');

const listarConsultorios = async (req, res) => {
  try {
    const { activo } = req.query;
    const where = tenantWhere(req);

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const consultorios = await Consultorio.findAll({
      where,
      order: [['nombre', 'ASC']],
    });

    res.json({ consultorios });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const crearConsultorio = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const { clinicaId } = req.usuario;

    const consultorio = await Consultorio.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      clinicaId,
    });

    res.status(201).json({
      message: 'Consultorio creado exitosamente',
      consultorio,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un consultorio con ese nombre' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const actualizarConsultorio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    const consultorio = await Consultorio.findOne({ where: tenantWhere(req, { id }) });
    if (!consultorio) {
      return res.status(404).json({ message: 'Consultorio no encontrado' });
    }

    await consultorio.update({
      nombre: nombre !== undefined ? nombre.trim() : consultorio.nombre,
      descripcion: descripcion !== undefined ? (descripcion?.trim() || null) : consultorio.descripcion,
      activo: activo !== undefined ? activo : consultorio.activo,
    });

    res.json({
      message: 'Consultorio actualizado exitosamente',
      consultorio,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un consultorio con ese nombre' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  listarConsultorios,
  crearConsultorio,
  actualizarConsultorio,
};
