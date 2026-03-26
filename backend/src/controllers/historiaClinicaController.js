const HistoriaClinica = require('../models/HistoriaClinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Cita = require('../models/Cita')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')

const crearHistoria = async (req, res) => {
  try {
    const {
      motivoConsulta, anamnesis, peso, temperatura,
      frecuenciaCardiaca, frecuenciaRespiratoria, condicionCorporal,
      mucosas, estadoHidratacion, examenFisicoDetalle,
      diagnostico, diagnosticoPresuntivo, tratamiento,
      medicamentos, indicaciones, proximaConsulta,
      mascotaId, propietarioId, citaId, veterinarioId,
    } = req.body

    const { clinicaId } = req.usuario

    if (!motivoConsulta || !diagnostico || !tratamiento || !mascotaId || !propietarioId || !veterinarioId) {
      return res.status(400).json({
        message: 'Motivo, diagnostico, tratamiento, mascota, propietario y veterinario son obligatorios',
      })
    }

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    if (citaId) {
      const cita = await Cita.findOne({ where: { id: citaId, clinicaId } })
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' })
      }
      await cita.update({ estado: 'completada' })
    }

    if (peso) {
      await mascota.update({ peso })
    }

    const historia = await HistoriaClinica.create({
      motivoConsulta, anamnesis, peso, temperatura,
      frecuenciaCardiaca, frecuenciaRespiratoria, condicionCorporal,
      mucosas, estadoHidratacion, examenFisicoDetalle,
      diagnostico, diagnosticoPresuntivo, tratamiento,
      medicamentos: medicamentos || [],
      indicaciones, proximaConsulta,
      mascotaId, propietarioId, citaId,
      veterinarioId, clinicaId,
    })

    const historiaCompleta = await HistoriaClinica.findOne({
      where: { id: historia.id },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      ],
    })

    // ── Auditoría crear historia ───────────────────────────
    await registrarAuditoria({
      accion: 'CREAR_HISTORIA_CLINICA',
      entidad: 'HistoriaClinica',
      entidadId: historia.id,
      descripcion: `Historia clínica creada para mascota ${mascota.nombre} — Diagnóstico: ${diagnostico}`,
      datosNuevos: { mascotaId, veterinarioId, diagnostico },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Historia clinica registrada exitosamente',
      historia: historiaCompleta,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerHistoriasMascota = async (req, res) => {
  try {
    const { mascotaId } = req.params
    const { clinicaId } = req.usuario

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    const historias = await HistoriaClinica.findAll({
      where: { mascotaId, clinicaId },
      order: [['fechaConsulta', 'DESC']],
      include: [
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
      ],
    })

    res.json({
      mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
      totalConsultas: historias.length,
      historias,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerHistoria = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const historia = await HistoriaClinica.findOne({
      where: { id, clinicaId },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza', 'fechaNacimiento', 'fotoPerfil'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono', 'email'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
        { model: Cita, as: 'cita', attributes: ['id', 'fecha', 'tipoCita'] },
      ],
    })

    if (!historia) {
      return res.status(404).json({ message: 'Historia clinica no encontrada' })
    }

    res.json({ historia })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const editarHistoria = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const historia = await HistoriaClinica.findOne({ where: { id, clinicaId } })

    if (!historia) {
      return res.status(404).json({ message: 'Historia clinica no encontrada' })
    }

    if (historia.bloqueada) {
      // ── Auditoría intento edición bloqueada ───────────────
      await registrarAuditoria({
        accion: 'INTENTO_EDITAR_HISTORIA_BLOQUEADA',
        entidad: 'HistoriaClinica',
        entidadId: historia.id,
        descripcion: `Intento de edición en historia clínica bloqueada`,
        req,
        resultado: 'fallido',
      })
      return res.status(403).json({
        message: 'Esta historia clinica esta bloqueada y no puede ser modificada',
      })
    }

    const {
      motivoConsulta, anamnesis, peso, temperatura,
      frecuenciaCardiaca, frecuenciaRespiratoria, condicionCorporal,
      mucosas, estadoHidratacion, examenFisicoDetalle,
      diagnostico, diagnosticoPresuntivo, tratamiento,
      medicamentos, indicaciones, proximaConsulta,
    } = req.body

    const datosAnteriores = {
      diagnostico: historia.diagnostico,
      tratamiento: historia.tratamiento,
    }

    await historia.update({
      motivoConsulta, anamnesis, peso, temperatura,
      frecuenciaCardiaca, frecuenciaRespiratoria, condicionCorporal,
      mucosas, estadoHidratacion, examenFisicoDetalle,
      diagnostico, diagnosticoPresuntivo, tratamiento,
      medicamentos, indicaciones, proximaConsulta,
    })

    // ── Auditoría editar historia ──────────────────────────
    await registrarAuditoria({
      accion: 'EDITAR_HISTORIA_CLINICA',
      entidad: 'HistoriaClinica',
      entidadId: historia.id,
      descripcion: `Historia clínica editada`,
      datosAnteriores,
      datosNuevos: { diagnostico, tratamiento },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Historia clinica actualizada exitosamente',
      historia,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const bloquearHistoria = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const historia = await HistoriaClinica.findOne({ where: { id, clinicaId } })

    if (!historia) {
      return res.status(404).json({ message: 'Historia clinica no encontrada' })
    }

    if (historia.bloqueada) {
      return res.status(400).json({ message: 'La historia clinica ya esta bloqueada' })
    }

    await historia.update({ bloqueada: true })

    // ── Auditoría bloquear historia ────────────────────────
    await registrarAuditoria({
      accion: 'BLOQUEAR_HISTORIA_CLINICA',
      entidad: 'HistoriaClinica',
      entidadId: historia.id,
      descripcion: `Historia clínica bloqueada — ya no puede ser modificada`,
      datosAnteriores: { bloqueada: false },
      datosNuevos: { bloqueada: true },
      req,
      resultado: 'exitoso',
    })

    res.json({ message: 'Historia clinica bloqueada exitosamente' })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = { crearHistoria, obtenerHistoriasMascota, obtenerHistoria, editarHistoria, bloquearHistoria }
