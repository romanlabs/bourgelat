const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const { validarCupoSuscripcion } = require('../services/suscripcionService')
const { MASCOTAS_SUBDIR, buildPublicUploadUrl } = require('../config/uploads')

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

    const cupoMascotas = await validarCupoSuscripcion({
      clinicaId,
      campoLimite: 'limiteMascotas',
      modelo: Mascota,
      where: { clinicaId, activo: true },
    })

    if (!cupoMascotas.permitido) {
      return res.status(403).json({
        message: `Tu plan ${cupoMascotas.nombrePlan} permite hasta ${cupoMascotas.limite} mascotas activas. Desactiva una o cambia de plan para continuar.`,
        code: 'PLAN_LIMIT_REACHED',
        plan: cupoMascotas.suscripcion.plan,
        recurso: 'mascotas',
        limite: cupoMascotas.limite,
        usoActual: cupoMascotas.usoActual,
      })
    }

    const mascota = await Mascota.create({
      nombre, especie, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, microchip, observaciones, fotoPerfil,
      propietarioId, clinicaId,
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
    const { clinicaId } = req.usuario;
    const { buscar, especie, pagina = 1, limite = 10 } = req.query;
    const { Op } = require('sequelize');

    const where = { clinicaId, activo: true };

    if (especie) where.especie = especie;

    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${buscar}%` } },
        { microchip: { [Op.iLike]: `%${buscar}%` } },
      ];
    }

    const offset = (pagina - 1) * limite;

    const { count, rows } = await Mascota.findAndCountAll({
      where,
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['nombre', 'ASC']],
      include: [{
        model: Propietario,
        attributes: ['id', 'nombre', 'telefono'],
      }],
    });

    res.json({
      total: count,
      paginas: Math.ceil(count / limite),
      paginaActual: parseInt(pagina),
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

    const mascota = await Mascota.findOne({ where: { id, clinicaId } });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    await mascota.update({
      nombre, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, microchip, observaciones, fotoPerfil,
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

    res.json({ message: 'Mascota desactivada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = { crearMascota, subirFotoMascota, obtenerMascotas, obtenerMascota, editarMascota, desactivarMascota };
