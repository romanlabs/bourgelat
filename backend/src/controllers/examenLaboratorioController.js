const fs = require('fs');
const path = require('path');
const ExamenLaboratorio = require('../models/ExamenLaboratorio');
const Mascota = require('../models/Mascota');
const Usuario = require('../models/Usuario');
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware');
const { EXAMENES_SUBDIR, UPLOADS_ROOT_DIR, buildPublicUploadUrl } = require('../config/uploads');
const logger = require('../utils/logger');

const eliminarArchivoFisico = (archivoUrl) => {
  if (!archivoUrl) return;
  const relativePath = String(archivoUrl).replace(/^\/+/, '');
  if (!relativePath.startsWith(`${EXAMENES_SUBDIR}/`)) return;

  const absolutePath = path.resolve(UPLOADS_ROOT_DIR, relativePath);
  if (!absolutePath.startsWith(path.resolve(UPLOADS_ROOT_DIR))) return;

  fs.unlink(absolutePath, (error) => {
    if (error && error.code !== 'ENOENT') {
      logger.error({ contexto: 'examenes', mensaje: `No fue posible eliminar el archivo: ${error.message}` });
    }
  });
};

const serializarExamen = (req, examen) => {
  const plain = typeof examen.toJSON === 'function' ? examen.toJSON() : examen;
  return {
    ...plain,
    archivoUrlPublica: plain.archivoUrl ? buildPublicUploadUrl(req, plain.archivoUrl) : null,
  };
};

const buscarMascota = async ({ mascotaId, clinicaId }) =>
  Mascota.findOne({ where: { id: mascotaId, clinicaId, activo: true } });

const listarExamenes = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId } = req.usuario;

    const mascota = await buscarMascota({ mascotaId, clinicaId });
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const examenes = await ExamenLaboratorio.findAll({
      where: { mascotaId, clinicaId },
      include: [{ model: Usuario, as: 'registradoPor', attributes: ['id', 'nombre'] }],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({ examenes: examenes.map((examen) => serializarExamen(req, examen)) });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const crearExamen = async (req, res) => {
  try {
    const { mascotaId } = req.params;
    const { clinicaId, id: usuarioId } = req.usuario;
    const { tipo, fecha, resultados, interpretacion, laboratorio } = req.body;

    const mascota = await buscarMascota({ mascotaId, clinicaId });
    if (!mascota) {
      if (req.file) eliminarArchivoFisico(`${EXAMENES_SUBDIR}/${req.file.filename}`);
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    const examen = await ExamenLaboratorio.create({
      tipo,
      fecha,
      resultados,
      interpretacion: interpretacion || null,
      laboratorio: laboratorio || null,
      archivoUrl: req.file ? `${EXAMENES_SUBDIR}/${req.file.filename}` : null,
      archivoNombre: req.file ? req.file.originalname : null,
      mascotaId,
      clinicaId,
      registradoPorId: usuarioId,
    });

    await registrarAuditoria({
      accion: 'CREAR_EXAMEN_LABORATORIO',
      entidad: 'ExamenLaboratorio',
      entidadId: examen.id,
      descripcion: `Examen de laboratorio registrado: ${tipo}`,
      datosNuevos: { tipo, fecha, mascotaId },
      req,
    });

    res.status(201).json({
      message: 'Examen de laboratorio registrado exitosamente',
      examen: serializarExamen(req, examen),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const editarExamen = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;
    const { tipo, fecha, resultados, interpretacion, laboratorio, eliminarArchivo } = req.body;

    const examen = await ExamenLaboratorio.findOne({ where: { id, clinicaId } });
    if (!examen) {
      if (req.file) eliminarArchivoFisico(`${EXAMENES_SUBDIR}/${req.file.filename}`);
      return res.status(404).json({ message: 'Examen no encontrado' });
    }

    const datosAnteriores = {
      tipo: examen.tipo,
      fecha: examen.fecha,
      archivoUrl: examen.archivoUrl,
    };

    const cambios = {
      tipo: tipo !== undefined ? tipo : examen.tipo,
      fecha: fecha !== undefined ? fecha : examen.fecha,
      resultados: resultados !== undefined ? resultados : examen.resultados,
      interpretacion: interpretacion !== undefined ? (interpretacion || null) : examen.interpretacion,
      laboratorio: laboratorio !== undefined ? (laboratorio || null) : examen.laboratorio,
    };

    const archivoAnterior = examen.archivoUrl;

    if (req.file) {
      cambios.archivoUrl = `${EXAMENES_SUBDIR}/${req.file.filename}`;
      cambios.archivoNombre = req.file.originalname;
    } else if (eliminarArchivo === 'true' || eliminarArchivo === true) {
      cambios.archivoUrl = null;
      cambios.archivoNombre = null;
    }

    await examen.update(cambios);

    if (archivoAnterior && cambios.archivoUrl !== undefined && cambios.archivoUrl !== archivoAnterior) {
      eliminarArchivoFisico(archivoAnterior);
    }

    await registrarAuditoria({
      accion: 'EDITAR_EXAMEN_LABORATORIO',
      entidad: 'ExamenLaboratorio',
      entidadId: examen.id,
      descripcion: `Examen de laboratorio actualizado: ${examen.tipo}`,
      datosAnteriores,
      datosNuevos: { tipo: examen.tipo, fecha: examen.fecha, archivoUrl: examen.archivoUrl },
      req,
    });

    res.json({
      message: 'Examen de laboratorio actualizado exitosamente',
      examen: serializarExamen(req, examen),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

const eliminarExamen = async (req, res) => {
  try {
    const { id } = req.params;
    const { clinicaId } = req.usuario;

    const examen = await ExamenLaboratorio.findOne({ where: { id, clinicaId } });
    if (!examen) {
      return res.status(404).json({ message: 'Examen no encontrado' });
    }

    const archivoUrl = examen.archivoUrl;
    const datosAnteriores = { tipo: examen.tipo, fecha: examen.fecha, mascotaId: examen.mascotaId };

    await examen.destroy();
    eliminarArchivoFisico(archivoUrl);

    await registrarAuditoria({
      accion: 'ELIMINAR_EXAMEN_LABORATORIO',
      entidad: 'ExamenLaboratorio',
      entidadId: id,
      descripcion: `Examen de laboratorio eliminado: ${datosAnteriores.tipo}`,
      datosAnteriores,
      req,
    });

    res.json({ message: 'Examen de laboratorio eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

module.exports = {
  listarExamenes,
  crearExamen,
  editarExamen,
  eliminarExamen,
};
