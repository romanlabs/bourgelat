const { Op } = require('sequelize');
const Propietario = require('../models/Propietario');
const Mascota = require('../models/Mascota');
const { parsePaginacion } = require('../utils/paginacion');
const { tenantWhere } = require('../utils/tenant');
const { hmacTexto } = require('../config/crypto');
const { estaCifrado } = require('../config/modelEncryption');
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware');
const busquedaPropietario = require('../services/busquedaPropietarioService');

// Los campos cifrados nunca deben viajar del cliente al servidor ya cifrados: el hook
// beforeUpdate los dejaria pasar tal cual y el dato quedaria ilegible en la base.
const CAMPOS_CIFRADOS = ['nombre', 'numeroDocumento', 'email', 'telefono', 'direccion', 'razonSocial', 'nombreComercial'];

const contieneValorCifrado = (datos) =>
  CAMPOS_CIFRADOS.some((campo) => estaCifrado(datos[campo]));

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

    if (contieneValorCifrado(req.body)) {
      return res.status(400).json({ message: 'Datos inválidos' });
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

    await registrarAuditoria({
      accion: 'CREAR_PROPIETARIO',
      entidad: 'Propietario',
      entidadId: propietario.id,
      descripcion: 'Propietario registrado',
      req,
      resultado: 'exitoso',
    });

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
      nombre, tipoDocumento, numeroDocumento, email, telefono, direccion, ciudad,
      razonSocial, nombreComercial, tipoPersona, digitoVerificacion, codigoPostal,
      municipioId, tipoDocumentoFacturacionId, organizacionJuridicaId, tributoId,
    } = req.body;

    if (contieneValorCifrado(req.body)) {
      return res.status(400).json({ message: 'Datos inválidos' });
    }

    const propietario = await Propietario.findOne({ where: tenantWhere(req, { id }) });

    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    // El documento es editable, pero sigue siendo unico por clinica. La comparacion va
    // contra el indice ciego excluyendo el propio registro.
    if (numeroDocumento && numeroDocumento !== propietario.numeroDocumento) {
      const existe = await Propietario.findOne({
        where: {
          numeroDocumentoHash: hmacTexto(numeroDocumento),
          clinicaId,
          id: { [Op.ne]: id },
        },
      });
      if (existe) {
        return res.status(400).json({ message: 'Ya existe un propietario con ese documento' });
      }
    }

    const cambios = {
      nombre,
      tipoDocumento,
      numeroDocumento,
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
    };

    await propietario.update(cambios);

    busquedaPropietario.invalidarCache(clinicaId);

    await registrarAuditoria({
      accion: 'EDITAR_PROPIETARIO',
      entidad: 'Propietario',
      entidadId: propietario.id,
      descripcion: 'Propietario actualizado',
      // Solo la lista de campos: datosNuevos se guarda en claro y aqui hay PII.
      datosNuevos: { camposModificados: Object.keys(cambios).filter((c) => cambios[c] !== undefined) },
      req,
      resultado: 'exitoso',
    });

    res.json({
      message: 'Propietario actualizado exitosamente',
      propietario,
    });
  } catch (error) {
    // Dos ediciones concurrentes pueden pasar la comprobacion previa y chocar en el
    // indice unico (numeroDocumentoHash, clinicaId).
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un propietario con ese documento' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearPropietario, obtenerPropietarios, obtenerPropietario, editarPropietario };
