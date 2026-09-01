const { Op } = require('sequelize');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const { MASCOTAS_SUBDIR, buildPublicUploadUrl } = require('../config/uploads')
const { parsePaginacion } = require('../utils/paginacion')
const { iLikeSinTildes } = require('../utils/busqueda')
const { tenantWhere } = require('../utils/tenant')
const busquedaPropietario = require('../services/busquedaPropietarioService')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

const crearMascota = async (req, res) => {
  try {
    const {
      nombre, especie, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, microchip, observaciones, propietarioId, fotoPerfil
    } = req.body;
    const { clinicaId } = req.usuario;

    if (!nombre || !especie || !propietarioId) {
      return res.status(400).json({ message: 'Nombre, especie y propietario son obligatorios' });
    }

    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } });
    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    const mascota = await Mascota.create({
      nombre, especie, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, microchip, observaciones, fotoPerfil,
      propietarioId, clinicaId,
    });

    await registrarAuditoria({
      accion: 'CREAR_MASCOTA',
      entidad: 'Mascota',
      entidadId: mascota.id,
      descripcion: 'Paciente registrado',
      req,
      resultado: 'exitoso',
    });

    res.status(201).json({
      message: 'Mascota registrada exitosamente',
      mascota,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const subirFotoMascota = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'Selecciona una imagen para continuar.',
    });
  }

  const relativePath = `${MASCOTAS_SUBDIR}/${req.file.filename}`;

  return res.status(201).json({
    message: 'Foto cargada exitosamente',
    fotoPerfil: buildPublicUploadUrl(req, relativePath),
    archivo: {
      nombre: req.file.originalname,
      tamano: req.file.size,
      mimeType: req.file.mimetype,
    },
  });
};

const obtenerMascotas = async (req, res) => {
  try {
    const { buscar, especie } = req.query;
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 10 });

    const where = tenantWhere(req, { activo: true });

    if (especie) where.especie = especie;

    if (buscar) {
      const condiciones = [
        iLikeSinTildes('Mascota.nombre', buscar),
        iLikeSinTildes('Mascota.microchip', buscar),
        iLikeSinTildes('Mascota.raza', buscar),
        iLikeSinTildes('Mascota.especieDetalle', buscar),
      ];

      // Buscar el paciente por su tutor es el caso típico en recepción. Los datos
      // del tutor están cifrados, así que se resuelven a ids con el servicio en
      // lugar de con un JOIN filtrado en SQL. Se omite en términos muy cortos
      // para no construir el índice en cada pulsación.
      if (buscar.trim().length >= 3) {
        const propietarioIds = await busquedaPropietario.buscarIds(req, buscar);
        if (propietarioIds?.length) {
          condiciones.push({ propietarioId: { [Op.in]: propietarioIds } });
        }
      }

      where[Op.or] = condiciones;
    }

    const { count, rows } = await Mascota.findAndCountAll({
      where,
      limit: limite,
      offset,
      order: [['nombre', 'ASC']],
      include: [{
        model: Propietario,
        attributes: ['id', 'nombre', 'telefono'],
      }],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: pagina,
      mascotas: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const obtenerMascota = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const mascota = await Mascota.findOne({
      where: { id, clinicaId },
      include: [{
        model: Propietario,
        attributes: ['id', 'nombre', 'telefono', 'email'],
      }],
    });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.json({ mascota });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarMascota = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const {
      nombre,
      raza,
      sexo,
      fechaNacimiento,
      peso,
      color,
      esterilizado,
      microchip,
      observaciones,
      fotoPerfil,
    } = req.body;

    const mascota = await Mascota.findOne({ where: tenantWhere(req, { id }) });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const cambios = {
      nombre, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, microchip, observaciones, fotoPerfil,
    };

    await mascota.update(cambios);

    await registrarAuditoria({
      accion: 'EDITAR_MASCOTA',
      entidad: 'Mascota',
      entidadId: mascota.id,
      descripcion: 'Paciente actualizado',
      datosNuevos: { camposModificados: Object.keys(cambios).filter((c) => cambios[c] !== undefined) },
      req,
      resultado: 'exitoso',
    });

    res.json({
      message: 'Mascota actualizada exitosamente',
      mascota,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const desactivarMascota = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const mascota = await Mascota.findOne({ where: { id, clinicaId } });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    await mascota.update({ activo: false });

    await registrarAuditoria({
      accion: 'DESACTIVAR_MASCOTA',
      entidad: 'Mascota',
      entidadId: mascota.id,
      descripcion: 'Paciente desactivado',
      req,
      resultado: 'exitoso',
    });

    res.json({ message: 'Mascota desactivada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearMascota, subirFotoMascota, obtenerMascotas, obtenerMascota, editarMascota, desactivarMascota };
