const HistoriaClinica = require('../models/HistoriaClinica')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Cita = require('../models/Cita')
const Producto = require('../models/Producto')
const InsumoClinico = require('../models/InsumoClinico')
const MovimientoInventarioClinico = require('../models/MovimientoInventarioClinico')
const Gasto = require('../models/Gasto')
const sequelize = require('../config/database')
const logger = require('../utils/logger')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const { Op } = require('sequelize')
const { isValidDateOnly } = require('../utils/dateOnly')
const { parsePaginacion } = require('../utils/paginacion')

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

// Categorias del inventario de ventas que pueden formularse al tutor.
const MEDICATION_CATEGORIES = ['medicamento', 'vacuna', 'antiparasitario', 'suplemento']

// Redondeo a 2 decimales: es la precision de stock y cantidad en la BD
// (DECIMAL(10,2)). Sin esto, 0.333 ml aplicados no cuadran con lo descontado.
const redondearCantidad = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100

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
  if (!Number.isFinite(parsed) || parsed < 0) return undefined

  // Decimal a proposito: la cantidad va en la unidadBase del insumo (2.5 ml),
  // no en presentaciones enteras.
  return redondearCantidad(parsed)
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
        // El plan farmacologico sale del inventario de ventas: es lo que el
        // tutor se lleva. No descuenta aqui — el stock se mueve al facturar.
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

// Plan farmacologico: vincula contra el inventario de VENTAS. Solo completa
// datos de presentacion; el stock se mueve cuando la formula se factura.
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

const buildInsumoPresentation = (insumo) =>
  [insumo.unidadBase, insumo.laboratorio, insumo.lote]
    .filter((value) => String(value || '').trim().length > 0)
    .join(' | ')

// Tratamiento intrahospitalario: vincula contra el inventario CLINICO. Estas
// lineas si descuentan stock, al bloquear la historia.
const attachTratamientoInventoryData = async (tratamiento, clinicaId) => {
  const insumoIds = [...new Set(tratamiento.map((item) => item.insumoClinicoId).filter(Boolean))]

  if (!insumoIds.length) {
    return tratamiento
  }

  const insumos = await InsumoClinico.findAll({
    where: {
      id: { [Op.in]: insumoIds },
      clinicaId,
      activo: true,
    },
    attributes: ['id', 'nombre', 'unidadBase', 'laboratorio', 'lote'],
  })

  const insumosMap = new Map(insumos.map((insumo) => [insumo.id, insumo]))

  if (insumos.length !== insumoIds.length) {
    const idsValidos = new Set(insumos.map((insumo) => insumo.id))
    const faltantes = insumoIds.filter((id) => !idsValidos.has(id))
    const error = new Error(
      `No fue posible vincular algunos insumos del tratamiento: ${faltantes.join(', ')}`
    )
    error.statusCode = 400
    throw error
  }

  return tratamiento.map((item) => {
    const insumo = insumosMap.get(item.insumoClinicoId)
    if (!insumo) {
      return item
    }

    return {
      ...item,
      nombre: item.nombre || insumo.nombre,
      unidadBase: insumo.unidadBase,
      presentacion: buildInsumoPresentation(insumo) || undefined,
    }
  })
}

const normalizeAppliedAt = (value) => {
  if (!value) return new Date().toISOString()

  const fecha = new Date(value)
  return Number.isNaN(fecha.getTime()) ? new Date().toISOString() : fecha.toISOString()
}

/**
 * Lineas del tratamiento intrahospitalario. A diferencia del plan farmacologico,
 * aqui el insumo y la cantidad son obligatorios: cada linea descuenta inventario
 * clinico real al cerrar la historia, asi que no admite texto suelto.
 */
const normalizeTratamientoIntrahospitalario = (value) => {
  if (!Array.isArray(value) || value.length === 0) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const insumoClinicoId =
        item.insumoClinicoId && /^[0-9a-fA-F-]{36}$/.test(String(item.insumoClinicoId))
          ? String(item.insumoClinicoId)
          : undefined

      const cantidad = normalizeMedicationQuantity(item.cantidad)

      if (!insumoClinicoId || cantidad === undefined || cantidad <= 0) {
        return null
      }

      return {
        insumoClinicoId,
        nombre: cleanText(item.nombre, 240),
        cantidad,
        unidadBase: cleanText(item.unidadBase, 40),
        via: MEDICATION_ROUTES.includes(item.via) ? item.via : undefined,
        responsableId:
          item.responsableId && /^[0-9a-fA-F-]{36}$/.test(String(item.responsableId))
            ? String(item.responsableId)
            : undefined,
        aplicadoEn: normalizeAppliedAt(item.aplicadoEn),
      }
    })
    .filter(Boolean)
}

const normalizeFollowUpDate = (value) => {
  if (!value) return undefined

  if (!isValidDateOnly(value)) {
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
    } = req.query
    const { pagina, limite, offset } = parsePaginacion(req.query, { limitePorDefecto: 20 })

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

    const { count, rows } = await HistoriaClinica.findAndCountAll({
      where,
      limit: limite,
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
      .json({ message: error.statusCode && error.statusCode < 500 ? error.message : 'Error en el servidor' })
  }
}

const crearHistoria = async (req, res) => {
  try {
    const {
      motivoConsulta, anamnesis, peso, temperatura,
      frecuenciaCardiaca, frecuenciaRespiratoria, condicionCorporal,
      mucosas, estadoHidratacion, examenFisicoDetalle,
      diagnostico, diagnosticoPresuntivo, tratamiento,
      medicamentos, tratamientoIntrahospitalario, indicaciones, proximaConsulta,
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
    const tratamientoIntrahospitalarioNormalizado = await attachTratamientoInventoryData(
      normalizeTratamientoIntrahospitalario(tratamientoIntrahospitalario),
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
      tratamientoIntrahospitalario: tratamientoIntrahospitalarioNormalizado,
      indicaciones: indicacionesNormalizadas,
      proximaConsulta: proximaConsultaNormalizada,
      mascotaId,
      propietarioId,
      citaId,
      veterinarioId,
      clinicaId,
    })

    const historiaCompleta = await HistoriaClinica.findOne({
      where: { id: historia.id, clinicaId },
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
    // Sin esto un 500 aqui queda mudo: el cliente recibe "Error en el servidor"
    // y en los logs solo aparece la linea de acceso del request.
    if (!error.statusCode || error.statusCode >= 500) {
      logger.error({
        contexto: 'crearHistoria',
        mensaje: error.message,
        stack: error.stack,
      })
    }
    res
      .status(error.statusCode || 500)
      .json({ message: error.statusCode && error.statusCode < 500 ? error.message : 'Error en el servidor' })
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
      medicamentos, tratamientoIntrahospitalario, indicaciones, proximaConsulta,
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
      tratamientoIntrahospitalario:
        tratamientoIntrahospitalario !== undefined
          ? await attachTratamientoInventoryData(
              normalizeTratamientoIntrahospitalario(tratamientoIntrahospitalario),
              clinicaId
            )
          : historia.tratamientoIntrahospitalario,
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

// Suma lo aplicado en el tratamiento intrahospitalario, agrupado por insumo. Un
// mismo insumo puede aparecer en varias lineas (dos dosis en horas distintas).
const agruparCantidadesPorInsumo = (lineas) => {
  const porInsumo = new Map()

  for (const item of Array.isArray(lineas) ? lineas : []) {
    if (!item?.insumoClinicoId) continue

    const cantidad = Number(item.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) continue

    const acumulado = porInsumo.get(item.insumoClinicoId) || 0
    porInsumo.set(item.insumoClinicoId, redondearCantidad(acumulado + cantidad))
  }

  return porInsumo
}

// Neto ya descontado por esta historia: salidas menos entradas de correccion.
const obtenerConsumoRegistrado = async (historiaId, clinicaId, transaction) => {
  const movimientos = await MovimientoInventarioClinico.findAll({
    where: {
      historiaClinicaId: historiaId,
      clinicaId,
      motivo: 'uso_procedimiento',
    },
    attributes: ['insumoClinicoId', 'tipo', 'cantidad'],
    transaction,
  })

  const porInsumo = new Map()

  for (const movimiento of movimientos) {
    const signo = movimiento.tipo === 'salida' ? 1 : -1
    const acumulado = porInsumo.get(movimiento.insumoClinicoId) || 0
    porInsumo.set(
      movimiento.insumoClinicoId,
      redondearCantidad(acumulado + signo * Number(movimiento.cantidad))
    )
  }

  return porInsumo
}

/**
 * Aplica sobre el stock la diferencia entre lo que la historia dice haber usado
 * y lo que ya se descontó por ella. Idempotente: correr esto dos veces con la
 * misma historia no descuenta dos veces, y corregir una historia ya bloqueada
 * ajusta el delta en lugar de duplicar el consumo.
 */
const sincronizarConsumoInsumos = async ({ historia, usuarioId, clinicaId, transaction }) => {
  // Solo el tratamiento intrahospitalario mueve inventario clinico. El plan
  // farmacologico sale del inventario de ventas, y lo hace al facturarse.
  const deseado = agruparCantidadesPorInsumo(historia.tratamientoIntrahospitalario)
  const registrado = await obtenerConsumoRegistrado(historia.id, clinicaId, transaction)

  const insumoIds = [...new Set([...deseado.keys(), ...registrado.keys()])]
  const aplicados = []

  for (const insumoClinicoId of insumoIds) {
    const delta = redondearCantidad((deseado.get(insumoClinicoId) || 0) - (registrado.get(insumoClinicoId) || 0))

    if (delta === 0) continue

    const insumo = await InsumoClinico.findOne({
      where: { id: insumoClinicoId, clinicaId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })

    if (!insumo) {
      const error = new Error('Uno de los medicamentos aplicados ya no existe en el inventario')
      error.statusCode = 400
      throw error
    }

    const stockAnterior = Number(insumo.stock)

    if (delta > 0 && stockAnterior < delta) {
      const error = new Error(
        `Stock insuficiente de "${insumo.nombre}": se requieren ${delta} ${insumo.unidadBase} y hay ${stockAnterior}`
      )
      error.statusCode = 400
      throw error
    }

    const stockNuevo = redondearCantidad(stockAnterior - delta)

    await insumo.update({ stock: stockNuevo }, { transaction })

    // Un delta negativo es una correccion a la baja de la historia: devuelve
    // stock, pero conserva el motivo para que el neto por historia siga cuadrando.
    await MovimientoInventarioClinico.create({
      tipo: delta > 0 ? 'salida' : 'entrada',
      cantidad: Math.abs(delta),
      stockAnterior,
      stockNuevo,
      motivo: 'uso_procedimiento',
      observaciones: `Aplicado en historia clinica ${historia.id}`,
      precioUnitario: insumo.precioUnitarioBase,
      insumoClinicoId: insumo.id,
      usuarioId,
      clinicaId,
      historiaClinicaId: historia.id,
    }, { transaction })

    // El costo se valoriza aqui, con el mismo precio que queda congelado en el
    // movimiento. De la suma de estos costos sale el gasto de la consulta.
    aplicados.push({
      insumoClinicoId,
      nombre: insumo.nombre,
      delta,
      unidadBase: insumo.unidadBase,
      costo: redondearCantidad(delta * Number(insumo.precioUnitarioBase)),
    })
  }

  return aplicados
}

/**
 * Borrador de cobro de una consulta ya cerrada. No persiste nada: arma las
 * lineas de factura para precargar el carrito.
 *
 * Solo entra el plan farmacologico (tipo 'producto'): son los medicamentos que
 * el tutor se lleva, y descuentan del inventario de ventas al facturar. El
 * tratamiento intrahospitalario NO se cobra — salio del inventario clinico al
 * cerrar la historia y su costo quedo registrado como gasto de insumos.
 *
 * El servicio de consulta se agrega aparte desde el catalogo de servicios.
 */
const obtenerPreliquidacion = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const historia = await HistoriaClinica.findOne({
      where: { id, clinicaId },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
      ],
    })

    if (!historia) {
      return res.status(404).json({ message: 'Historia clinica no encontrada' })
    }

    if (historia.facturaId) {
      return res.status(409).json({
        message: 'Esta consulta ya fue facturada',
        facturaId: historia.facturaId,
      })
    }

    // Antes de bloquear no hay consumo registrado: facturar ahi cobraria algo
    // que todavia no salio de inventario.
    if (!historia.bloqueada) {
      return res.status(400).json({
        message: 'Cierra la historia clinica antes de facturarla',
      })
    }

    const items = []

    // ── Plan farmacologico: se dispensa y descuenta al facturar ──────────────
    const cantidadesPorProducto = new Map()
    for (const item of Array.isArray(historia.medicamentos) ? historia.medicamentos : []) {
      if (!item?.productoId) continue

      const cantidad = Number(item.cantidad)
      if (!Number.isFinite(cantidad) || cantidad <= 0) continue

      cantidadesPorProducto.set(
        item.productoId,
        (cantidadesPorProducto.get(item.productoId) || 0) + cantidad
      )
    }

    if (cantidadesPorProducto.size > 0) {
      const productos = await Producto.findAll({
        where: { id: { [Op.in]: [...cantidadesPorProducto.keys()] }, clinicaId },
        attributes: ['id', 'nombre', 'unidadMedida', 'precioVenta', 'precioCompra', 'stock'],
      })

      for (const producto of productos) {
        // El inventario de ventas solo maneja enteros.
        const cantidad = Math.max(Math.round(cantidadesPorProducto.get(producto.id)), 1)
        const precioUnitario = Number(producto.precioVenta)

        items.push({
          tipo: 'producto',
          productoId: producto.id,
          descripcion: producto.nombre,
          cantidad,
          precioUnitario,
          precioMinimo: Number(producto.precioCompra),
          stock: Number(producto.stock),
          subtotal: redondearCantidad(cantidad * precioUnitario),
        })
      }
    }

    res.json({
      historiaClinicaId: historia.id,
      mascota: historia.mascota,
      propietario: historia.propietario,
      items,
      // Aviso para la UI: sin stock la factura sera rechazada al intentar
      // descontar el producto.
      productosSinStock: items
        .filter((item) => item.stock !== null && item.cantidad > item.stock)
        .map((item) => item.descripcion),
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const bloquearHistoria = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    // El descuento de stock, el gasto y el bloqueo van juntos: si falta stock,
    // la historia no se bloquea, y si el bloqueo falla, no queda inventario
    // descontado ni un gasto colgando.
    const { consumos, gastoInsumos } = await sequelize.transaction(async (transaction) => {
      const historia = await HistoriaClinica.findOne({
        where: { id, clinicaId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (!historia) {
        const error = new Error('Historia clinica no encontrada')
        error.statusCode = 404
        throw error
      }

      if (historia.bloqueada) {
        const error = new Error('La historia clinica ya esta bloqueada')
        error.statusCode = 400
        throw error
      }

      const aplicados = await sincronizarConsumoInsumos({
        historia,
        usuarioId: req.usuario.id,
        clinicaId,
        transaction,
      })

      // Lo consumido no se le cobra al tutor: es un costo del negocio. Queda
      // como gasto, no como linea de factura. Se crea aqui, una sola vez,
      // porque el bloqueo es de una sola via y la historia ya no puede
      // cambiar — asi el gasto nunca necesita corregirse y el libro de gastos
      // sigue siendo inmutable.
      const costoInsumos = redondearCantidad(
        aplicados.reduce((total, consumo) => total + consumo.costo, 0)
      )

      let gasto = null

      if (costoInsumos > 0) {
        const mascota = await Mascota.findOne({
          where: { id: historia.mascotaId, clinicaId },
          attributes: ['nombre'],
          transaction,
        })

        gasto = await Gasto.create({
          categoria: 'insumos',
          origen: 'consumo_insumos',
          historiaClinicaId: historia.id,
          descripcion: `Consumo de insumos en consulta${mascota ? ` de ${mascota.nombre}` : ''}`,
          monto: costoInsumos,
          fecha: new Date(),
          // 'otro' y sin turno: no hay salida de caja. El dinero salio cuando
          // se compro el insumo, no al aplicarlo al paciente.
          metodoPago: 'otro',
          cajaTurnoId: null,
          movimientoCajaId: null,
          usuarioId: req.usuario.id,
          clinicaId,
        }, { transaction })
      }

      await historia.update({ bloqueada: true }, { transaction })

      return { consumos: aplicados, gastoInsumos: gasto }
    })

    // ── Auditoría bloquear historia ────────────────────────
    await registrarAuditoria({
      accion: 'BLOQUEAR_HISTORIA_CLINICA',
      entidad: 'HistoriaClinica',
      entidadId: id,
      descripcion: consumos.length
        ? `Historia clínica bloqueada — se descontaron ${consumos.length} insumo(s) del inventario clínico`
          + (gastoInsumos ? ` y se registró un gasto de $${gastoInsumos.monto}` : '')
        : `Historia clínica bloqueada — ya no puede ser modificada`,
      datosAnteriores: { bloqueada: false },
      datosNuevos: {
        bloqueada: true,
        consumos,
        gastoInsumosId: gastoInsumos?.id || null,
        costoInsumos: gastoInsumos ? Number(gastoInsumos.monto) : 0,
      },
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Historia clinica bloqueada exitosamente',
      consumos,
      // El costo de lo aplicado, ya registrado como gasto del negocio.
      costoInsumos: gastoInsumos ? Number(gastoInsumos.monto) : 0,
    })
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({
        message: error.statusCode && error.statusCode < 500
          ? error.message
          : 'Error en el servidor',
      })
  }
}

module.exports = {
  obtenerHistorias,
  crearHistoria,
  obtenerHistoriasMascota,
  obtenerHistoria,
  editarHistoria,
  bloquearHistoria,
  obtenerPreliquidacion,
}
