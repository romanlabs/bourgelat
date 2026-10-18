const { Op } = require('sequelize');
const Mascota = require('../models/Mascota');
const Propietario = require('../models/Propietario');
const sequelize = require('../config/database')
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
      peso, color, esterilizado, observaciones, propietarioId, fotoPerfil
    } = req.body;
    const { clinicaId } = req.usuario;

    if (!nombre || !especie || !propietarioId) {
      return res.status(400).json({ message: 'Nombre, especie y propietario son obligatorios' });
    }

    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } });
    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' });
    }

    // El numero de historia es el siguiente de la clinica. El lock por clinica
    // evita que dos altas simultaneas tomen el mismo numero (el indice unico es
    // la ultima defensa).
    const mascota = await sequelize.transaction(async (transaction) => {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
        replacements: { lockKey: `numero-historia:${clinicaId}` },
        transaction,
      })
      const ultimo = await Mascota.max('numeroHistoria', { where: { clinicaId }, transaction })
      return Mascota.create({
        nombre, especie, raza, sexo, fechaNacimiento,
        peso, color, esterilizado, observaciones, fotoPerfil,
        propietarioId, clinicaId,
        numeroHistoria: (Number(ultimo) || 0) + 1,
      }, { transaction })
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

    // ?estado=inactivas lista las desactivadas (para reactivarlas); por defecto, activas.
    const where = tenantWhere(req, { activo: req.query.estado !== 'inactivas' });

    if (especie) where.especie = especie;

    if (buscar) {
      const condiciones = [
        iLikeSinTildes('Mascota.nombre', buscar),
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
      observaciones,
      fotoPerfil,
    } = req.body;

    const mascota = await Mascota.findOne({ where: tenantWhere(req, { id }) });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const cambios = {
      nombre, raza, sexo, fechaNacimiento,
      peso, color, esterilizado, observaciones, fotoPerfil,
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

    res.json({ message: 'Paciente desactivado' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Revierte la desactivación (un paciente desactivado por error o que volvió).
const activarMascota = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const mascota = await Mascota.findOne({ where: { id, clinicaId } });

    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    await mascota.update({ activo: true });

    await registrarAuditoria({
      accion: 'ACTIVAR_MASCOTA',
      entidad: 'Mascota',
      entidadId: mascota.id,
      descripcion: 'Paciente reactivado',
      req,
      resultado: 'exitoso',
    });

    res.json({ message: 'Paciente reactivado' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { crearMascota, subirFotoMascota, obtenerMascotas, obtenerMascota, editarMascota, desactivarMascota, activarMascota };
