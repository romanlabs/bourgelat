const { Op } = require('sequelize');
const Propietario = require('../models/Propietario');
const Mascota = require('../models/Mascota');
const { parsePaginacion } = require('../utils/paginacion');
const { iLikeSinTildes } = require('../utils/busqueda');

const crearPropietario = async (req, res) => {
  try {
    const {
      nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad,
      razonSocial, nombreComercial, tipoPersona, digitoVerificacion, codigoPostal,
      municipioId, tipoDocumentoFacturacionId, organizacionJuridicaId, tributoId,
    } = req.body;
    const { clinicaId } = req.usuario;

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
      razonSocial,
      nombreComercial,
      tipoPersona: tipoPersona || 'persona_natural',
      digitoVerificacion,
      codigoPostal,
      municipioId,
      tipoDocumentoFacturacionId,
      organizacionJuridicaId,
      tributoId,
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
    const { clinicaId } = req.usuario;
    const { buscar } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 10 });

    const where = { clinicaId };

    if (buscar) {
      where[Op.or] = [
        iLikeSinTildes('Propietario.nombre', buscar),
        iLikeSinTildes('Propietario.numeroDocumento', buscar),
        iLikeSinTildes('Propietario.telefono', buscar),
      ];
    }

    const { count, rows } = await Propietario.findAndCountAll({
      where,
      limit: limite,
      offset,
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
    const { clinicaId } = req.usuario;

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
    const { clinicaId } = req.usuario;
    const {
      nombre, email, telefono, direccion, ciudad,
      razonSocial, nombreComercial, tipoPersona, digitoVerificacion, codigoPostal,
      municipioId, tipoDocumentoFacturacionId, organizacionJuridicaId, tributoId,
    } = req.body;

    const propietario = await Propietario.findOne({ where: { id, clinicaId } });

    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    await propietario.update({
      nombre,
      email,
      telefono,
      direccion,
      ciudad,
      razonSocial,
      nombreComercial,
      tipoPersona,
      digitoVerificacion,
      codigoPostal,
      municipioId,
      tipoDocumentoFacturacionId,
      organizacionJuridicaId,
      tributoId,
    });

    res.json({
      message: 'Propietario actualizado exitosamente',
      propietario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearPropietario, obtenerPropietarios, obtenerPropietario, editarPropietario };
