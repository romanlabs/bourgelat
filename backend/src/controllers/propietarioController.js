const { Op } = require('sequelize');
const Propietario = require('../models/Propietario');
const Mascota = require('../models/Mascota');
const { parsePaginacion } = require('../utils/paginacion');
const { tenantWhere } = require('../utils/tenant');
const { hmacTexto } = require('../config/crypto');
const busquedaPropietario = require('../services/busquedaPropietarioService');

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

    // El documento está cifrado en reposo: la comparación debe hacerse contra el
    // índice ciego (HMAC determinista), no contra el valor en plano.
    const existe = await Propietario.findOne({
      where: { numeroDocumentoHash: hmacTexto(numeroDocumento), clinicaId }
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

    busquedaPropietario.invalidarCache(clinicaId);

    res.status(201).json({
      message: 'Propietario registrado exitosamente',
      propietario,
    });
  } catch (error) {
    // El índice único sobre (numeroDocumentoHash, clinicaId) puede saltar si dos
    // peticiones concurrentes pasan la comprobación previa.
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un propietario con ese documento' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerPropietarios = async (req, res) => {
  try {
    const { buscar } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 10 });

    // Nombre, documento y teléfono están cifrados: ni el filtrado ni el orden
    // alfabético pueden resolverse en SQL. El servicio devuelve los ids ya
    // ordenados y aquí se pagina sobre esa lista.
    const idsOrdenados = buscar
      ? await busquedaPropietario.buscarIds(req, buscar)
      : await busquedaPropietario.listarIdsOrdenados(req);

    const total = idsOrdenados.length;
    const idsPagina = idsOrdenados.slice(offset, offset + limite);

    const filas = idsPagina.length
      ? await Propietario.findAll({
          where: tenantWhere(req, { id: { [Op.in]: idsPagina } }),
          include: [{
            model: Mascota,
            attributes: ['id', 'nombre', 'especie'],
            where: { activo: true },
            required: false,
          }],
        })
      : [];

    // findAll no respeta el orden de la lista de ids: se reordena en memoria.
    const porId = new Map(filas.map((fila) => [fila.id, fila]));
    const propietarios = idsPagina.map((id) => porId.get(id)).filter(Boolean);

    res.json({
      total,
      paginas: Math.ceil(total / limite),
      paginaActual: pagina,
      propietarios,
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

    busquedaPropietario.invalidarCache(clinicaId);

    res.json({
      message: 'Propietario actualizado exitosamente',
      propietario,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearPropietario, obtenerPropietarios, obtenerPropietario, editarPropietario };
