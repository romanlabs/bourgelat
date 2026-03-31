const HistoriaClinica = require('../models/HistoriaClinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Cita = require('../models/Cita')
const Producto = require('../models/Producto')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { Op } = require('sequelize')

const HYDRATION_STATES = [
  'normal',
  'deshidratacion_leve',
  'deshidratacion_moderada',
  'deshidratacion_severa',
]

const MEDICATION_ROUTES = [
  'oral',
  'subcutanea',
  'intramuscular',
  'intravenosa',
  'topica',
  'otica',
  'oftalmica',
  'inhalada',
  'rectal',
  'transdermica',
  'otra',
]

const MEDICATION_CATEGORIES = ['medicamento', 'vacuna', 'antiparasitario', 'suplemento']

const esProfesionalVeterinario = (usuario) =>
  usuario &&
  usuario.activo &&
  (usuario.rol === 'veterinario' ||
    (Array.isArray(usuario.rolesAdicionales) && usuario.rolesAdicionales.includes('veterinario')))

const cleanText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return undefined

  const normalized = String(value).replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined

  return normalized.slice(0, maxLength)
}

const normalizeMedicationQuantity = (value) => {
  if (value === undefined || value === null || value === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

const normalizeMedications = (value) => {
  if (!Array.isArray(value) || value.length === 0) return []

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const nombre = cleanText(item, 240)
        return nombre ? { nombre } : null
      }

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const nombre = cleanText(item.nombre, 240)
      const concentracion = cleanText(item.concentracion, 240)
      const dosis = cleanText(item.dosis, 240)
      const frecuencia = cleanText(item.frecuencia, 240)
      const duracion = cleanText(item.duracion, 240)
      const indicacion = cleanText(item.indicacion || item.instrucciones, 240)
      const cantidad = normalizeMedicationQuantity(item.cantidad)
      const via = MEDICATION_ROUTES.includes(item.via) ? item.via : undefined

      if (
        !nombre &&
        !concentracion &&
        !dosis &&
        !frecuencia &&
        !duracion &&
        !indicacion &&
        cantidad === undefined &&
        !via
      ) {
        return null
      }

      if (!nombre) {
        return null
      }

      return {
        nombre,
        productoId:
          item.productoId && /^[0-9a-fA-F-]{36}$/.test(String(item.productoId))
            ? String(item.productoId)
            : undefined,
        concentracion,
        dosis,
        via,
        frecuencia,
        duracion,
        cantidad,
        indicacion,
      }
    })
    .filter(Boolean)
}

const buildMedicationPresentation = (producto) =>
  [producto.subcategoria, producto.unidadMedida, producto.laboratorio]
    .filter((value) => String(value || '').trim().length > 0)
    .join(' | ')

const attachMedicationInventoryData = async (medicamentos, clinicaId) => {
  const productIds = [...new Set(medicamentos.map((item) => item.productoId).filter(Boolean))]

  if (!productIds.length) {
    return medicamentos
  }

  const productos = await Producto.findAll({
    where: {
      id: { [Op.in]: productIds },
      clinicaId,
      activo: true,
      categoria: { [Op.in]: MEDICATION_CATEGORIES },
    },
    attributes: ['id', 'nombre', 'subcategoria', 'unidadMedida', 'laboratorio'],
  })

  const productosMap = new Map(productos.map((producto) => [producto.id, producto]))

  if (productos.length !== productIds.length) {
    const idsValidos = new Set(productos.map((producto) => producto.id))
    const faltantes = productIds.filter((id) => !idsValidos.has(id))
    const error = new Error(
      `No fue posible vincular algunos medicamentos al inventario: ${faltantes.join(', ')}`
    )
    error.statusCode = 400
    throw error
  }

  return medicamentos.map((item) => {
    if (!item.productoId) {
      return item
    }

    const producto = productosMap.get(item.productoId)
    if (!producto) {
      return item
    }

    return {
      ...item,
      nombre: item.nombre || producto.nombre,
      concentracion: item.concentracion || buildMedicationPresentation(producto) || undefined,
      fuente: 'inventario',
    }
  })
}

const normalizeFollowUpDate = (value) => {
  if (!value) return undefined

  const fecha = new Date(value)
  if (Number.isNaN(fecha.getTime())) {
    return undefined
  }

  return value
}

const updatePetWeight = async (mascota, peso) => {
  if (peso === undefined || peso === null || peso === '') return
  await mascota.update({ peso })
}

const obtenerHistorias = async (req, res) => {
  try {
    const { clinicaId } = req.usuario
    const {
      mascotaId,
      veterinarioId,
      bloqueada,
      fechaInicio,
      fechaFin,
      pagina = 1,
      limite = 20,
    } = req.query

    const where = { clinicaId }

    if (mascotaId) where.mascotaId = mascotaId
    if (veterinarioId) where.veterinarioId = veterinarioId
    if (bloqueada === 'true') where.bloqueada = true
    if (bloqueada === 'false') where.bloqueada = false

    if (fechaInicio && fechaFin) {
      where.fechaConsulta = { [Op.between]: [fechaInicio, fechaFin] }
    } else if (fechaInicio) {
      where.fechaConsulta = { [Op.gte]: fechaInicio }
    } else if (fechaFin) {
      where.fechaConsulta = { [Op.lte]: fechaFin }
    }

    const offset = (Number(pagina) - 1) * Number(limite)

    const { count, rows } = await HistoriaClinica.findAndCountAll({
      where,
      limit: Number(limite),
      offset,
      order: [['fechaConsulta', 'DESC']],
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'veterinario', attributes: ['id', 'nombre'] },
        {
          model: Cita,
          as: 'cita',
          attributes: ['id', 'fecha', 'tipoCita', 'estado'],
          required: false,
        },
      ],
    })

    res.json({
      total: count,
      paginas: Math.ceil(count / Number(limite)),
      paginaActual: Number(pagina),
      historias: rows,
    })
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : 'Error en el servidor', error: error.message })
  }
}

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
    const motivoConsultaNormalizado = cleanText(motivoConsulta, 2000)
    const anamnesisNormalizada = cleanText(anamnesis, 4000)
    const mucosasNormalizadas = cleanText(mucosas, 240)
    const estadoHidratacionNormalizado = HYDRATION_STATES.includes(estadoHidratacion)
      ? estadoHidratacion
      : undefined
    const examenFisicoDetalleNormalizado = cleanText(examenFisicoDetalle, 4000)
    const diagnosticoNormalizado = cleanText(diagnostico, 4000)
    const diagnosticoPresuntivoNormalizado = cleanText(diagnosticoPresuntivo, 4000)
    const tratamientoNormalizado = cleanText(tratamiento, 4000)
    const medicamentosNormalizados = await attachMedicationInventoryData(
      normalizeMedications(medicamentos),
      clinicaId
    )
    const indicacionesNormalizadas = cleanText(indicaciones, 4000)
    const proximaConsultaNormalizada = normalizeFollowUpDate(proximaConsulta)

    if (
      !motivoConsultaNormalizado ||
      !diagnosticoNormalizado ||
      !tratamientoNormalizado ||
      !mascotaId ||
      !propietarioId ||
      !veterinarioId
    ) {
      return res.status(400).json({
        message: 'Motivo, diagnostico, tratamiento, mascota, propietario y veterinario son obligatorios',
      })
    }

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    const propietario = await Propietario.findOne({ where: { id: propietarioId, clinicaId } })
    if (!propietario) {
      return res.status(404).json({ message: 'Propietario no encontrado' })
    }

    if (mascota.propietarioId !== propietario.id) {
      return res.status(400).json({
        message: 'La mascota seleccionada no pertenece al tutor indicado',
      })
    }

    const veterinario = await Usuario.findOne({
      where: { id: veterinarioId, clinicaId, activo: true },
    })

    if (!esProfesionalVeterinario(veterinario)) {
      return res.status(404).json({ message: 'Veterinario no encontrado' })
    }

    if (citaId) {
      const cita = await Cita.findOne({ where: { id: citaId, clinicaId } })
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' })
      }

      const historiaExistente = await HistoriaClinica.findOne({ where: { citaId, clinicaId } })
      if (historiaExistente) {
        return res.status(400).json({
          message: 'La cita seleccionada ya tiene una historia clinica asociada',
        })
      }

      if (
        cita.mascotaId !== mascotaId ||
        cita.propietarioId !== propietarioId ||
        cita.veterinarioId !== veterinarioId
      ) {
        return res.status(400).json({
          message: 'La cita seleccionada no coincide con la mascota, el tutor o el veterinario enviado',
        })
      }

      await cita.update({ estado: 'completada' })
    }

    await updatePetWeight(mascota, peso)

    const historia = await HistoriaClinica.create({
      motivoConsulta: motivoConsultaNormalizado,
      anamnesis: anamnesisNormalizada,
      peso,
      temperatura,
      frecuenciaCardiaca,
      frecuenciaRespiratoria,
      condicionCorporal,
      mucosas: mucosasNormalizadas,
      estadoHidratacion: estadoHidratacionNormalizado,
      examenFisicoDetalle: examenFisicoDetalleNormalizado,
      diagnostico: diagnosticoNormalizado,
      diagnosticoPresuntivo: diagnosticoPresuntivoNormalizado,
      tratamiento: tratamientoNormalizado,
      medicamentos: medicamentosNormalizados,
      indicaciones: indicacionesNormalizadas,
      proximaConsulta: proximaConsultaNormalizada,
      mascotaId,
      propietarioId,
      citaId,
      veterinarioId,
      clinicaId,
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
      datosNuevos: { mascotaId, veterinarioId, diagnostico: diagnosticoNormalizado },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Historia clinica registrada exitosamente',
      historia: historiaCompleta,
    })
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode ? error.message : 'Error en el servidor', error: error.message })
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

    const payloadActualizado = {
      motivoConsulta:
        motivoConsulta !== undefined ? cleanText(motivoConsulta, 2000) : historia.motivoConsulta,
      anamnesis: anamnesis !== undefined ? cleanText(anamnesis, 4000) : historia.anamnesis,
      peso: peso !== undefined ? peso : historia.peso,
      temperatura: temperatura !== undefined ? temperatura : historia.temperatura,
      frecuenciaCardiaca:
        frecuenciaCardiaca !== undefined ? frecuenciaCardiaca : historia.frecuenciaCardiaca,
      frecuenciaRespiratoria:
        frecuenciaRespiratoria !== undefined
          ? frecuenciaRespiratoria
          : historia.frecuenciaRespiratoria,
      condicionCorporal:
        condicionCorporal !== undefined ? condicionCorporal : historia.condicionCorporal,
      mucosas: mucosas !== undefined ? cleanText(mucosas, 240) : historia.mucosas,
      estadoHidratacion:
        estadoHidratacion !== undefined && HYDRATION_STATES.includes(estadoHidratacion)
          ? estadoHidratacion
          : estadoHidratacion === null
            ? undefined
            : historia.estadoHidratacion,
      examenFisicoDetalle:
        examenFisicoDetalle !== undefined
          ? cleanText(examenFisicoDetalle, 4000)
          : historia.examenFisicoDetalle,
      diagnostico:
        diagnostico !== undefined ? cleanText(diagnostico, 4000) : historia.diagnostico,
      diagnosticoPresuntivo:
        diagnosticoPresuntivo !== undefined
          ? cleanText(diagnosticoPresuntivo, 4000)
          : historia.diagnosticoPresuntivo,
      tratamiento:
        tratamiento !== undefined ? cleanText(tratamiento, 4000) : historia.tratamiento,
      medicamentos:
        medicamentos !== undefined
          ? await attachMedicationInventoryData(normalizeMedications(medicamentos), clinicaId)
          : historia.medicamentos,
      indicaciones:
        indicaciones !== undefined ? cleanText(indicaciones, 4000) : historia.indicaciones,
      proximaConsulta:
        proximaConsulta !== undefined
          ? normalizeFollowUpDate(proximaConsulta)
          : historia.proximaConsulta,
    }

    await historia.update(payloadActualizado)

    if (peso !== undefined) {
      await Mascota.update({ peso }, { where: { id: historia.mascotaId, clinicaId } })
    }

    // ── Auditoría editar historia ──────────────────────────
    await registrarAuditoria({
      accion: 'EDITAR_HISTORIA_CLINICA',
      entidad: 'HistoriaClinica',
      entidadId: historia.id,
      descripcion: `Historia clínica editada`,
      datosAnteriores,
      datosNuevos: {
        diagnostico: payloadActualizado.diagnostico,
        tratamiento: payloadActualizado.tratamiento,
      },
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

module.exports = {
  obtenerHistorias,
  crearHistoria,
  obtenerHistoriasMascota,
  obtenerHistoria,
  editarHistoria,
  bloquearHistoria,
}
