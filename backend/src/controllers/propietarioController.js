const { Op } = require('sequelize');
const Propietario = require('../models/Propietario');
const Mascota = require('../models/Mascota');

const crearPropietario = async (req, res) => {
  try {
    const { nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad } = req.body;
    const { id: clinicaId } = req.usuario;

    if (!nombre || !numeroDocumento || !telefono) {
      return res.status(400).json({ message: 'Nombre, documento y telefono son obligatorios' });
    }

    const existe = await Propietario.findOne({ 
      where: { numeroDocumento, clinicaId } 
    });
    if (existe) {
      return res.status(400).json({ message: 'Ya existe un propietario con ese documento' });
    }

    const propietario = await Propietario.create({
      nombre,
      tipoDocumento: tipoDocumento || 'CC',
      numeroDocumento,
      email,
      telefono,
      direccion,
      ciudad,
      clinicaId,
    });

    res.status(201).json({
      message: 'Propietario registrado exitosamente',
      propietario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerPropietarios = async (req, res) => {
  try {
    const { id: clinicaId } = req.usuario;
    const { buscar, pagina = 1, limite = 10 } = req.query;

    const where = { clinicaId };

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { numeroDocumento: { [Op.iLike]: `%${buscar}%` } },
        { telefono: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    const offset = (pagina - 1) * limite;

    const { count, rows } = await Propietario.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['nombre', 'ASC']],
      include: [{
        model: Mascota,
        attributes: ['id', 'nombre', 'especie'],
        where: { activo: true },
        required: false,
      }],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
      propietarios: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerPropietario = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;

    const propietario = await Propietario.findOne({
      where: { id, clinicaId },
      include: [{
        model: Mascota,
        where: { activo: true },
        required: false,
      }],
    });

    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    res.json({ propietario });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarPropietario = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: clinicaId } = req.usuario;
    const { nombre, email, telefono, direccion, ciudad } = req.body;

    const propietario = await Propietario.findOne({ where: { id, clinicaId } });

    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    await propietario.update({ nombre, email, telefono, direccion, ciudad });

    res.json({
      message: 'Propietario actualizado exitosamente',
      propietario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearPropietario, obtenerPropietarios, obtenerPropietario, editarPropietario };