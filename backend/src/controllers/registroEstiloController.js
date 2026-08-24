const RegistroEstilo = require('../models/RegistroEstilo')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const Usuario = require('../models/Usuario')
const Cita = require('../models/Cita')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const {
  normalizarTipoCorte,
  normalizarObservaciones,
  normalizarProximaCita,
} = require('./registroEstiloNormalizers')

const INCLUDES_DETALLE = [
  { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie', 'raza'] },
  { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
  { model: Usuario, as: 'estilista', attributes: ['id', 'nombre'] },
]

const crearRegistroEstilo = async (req, res) => {
  try {
    const {
      tipoCorte, observaciones, proximaCitaSugerida, fechaServicio,
      mascotaId, propietarioId, estilistaId, citaId,
    } = req.body

    const { clinicaId } = req.usuario

    const tipoCorteNormalizado = normalizarTipoCorte(tipoCorte)
    const observacionesNormalizadas = normalizarObservaciones(observaciones)

    let proximaCitaNormalizada
    try {
      proximaCitaNormalizada = normalizarProximaCita(proximaCitaSugerida)
    } catch (error) {
      return res.status(400).json({ message: error.message })
    }

    if (!tipoCorteNormalizado) {
      return res.status(400).json({ message: 'El tipo de corte es obligatorio' })
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

    // El estilista es cualquier miembro activo del equipo: en clinicas de una
    // persona el mismo usuario agenda, peluquea y cobra.
    const estilista = await Usuario.findOne({
      where: { id: estilistaId, clinicaId, activo: true },
    })
    if (!estilista) {
      return res.status(404).json({ message: 'Estilista no encontrado' })
    }

    if (citaId) {
      const cita = await Cita.findOne({ where: { id: citaId, clinicaId } })
      if (!cita) {
        return res.status(404).json({ message: 'Cita no encontrada' })
      }

      const registroExistente = await RegistroEstilo.findOne({ where: { citaId, clinicaId } })
      if (registroExistente) {
        return res.status(400).json({
          message: 'La cita seleccionada ya tiene un registro de estilos asociado',
        })
      }

      if (cita.mascotaId !== mascotaId || cita.propietarioId !== propietarioId) {
        return res.status(400).json({
          message: 'La cita seleccionada no coincide con la mascota o el tutor enviado',
        })
      }

      await cita.update({ estado: 'completada' })
    }

    const registro = await RegistroEstilo.create({
      tipoCorte: tipoCorteNormalizado,
      observaciones: observacionesNormalizadas,
      proximaCitaSugerida: proximaCitaNormalizada,
      fechaServicio: fechaServicio || new Date(),
      mascotaId,
      propietarioId,
      estilistaId,
      citaId: citaId || null,
      clinicaId,
    })

    const registroCompleto = await RegistroEstilo.findOne({
      where: { id: registro.id, clinicaId },
      include: INCLUDES_DETALLE,
    })

    await registrarAuditoria({
      accion: 'CREAR_REGISTRO_ESTILO',
      entidad: 'RegistroEstilo',
      entidadId: registro.id,
      descripcion: `Registro de estilos creado para ${mascota.nombre} — ${tipoCorteNormalizado}`,
      datosNuevos: { mascotaId, estilistaId, tipoCorte: tipoCorteNormalizado },
      req,
      resultado: 'exitoso',
    })

    res.status(201).json({
      message: 'Registro de estilos creado exitosamente',
      registro: registroCompleto,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerRegistrosEstiloMascota = async (req, res) => {
  try {
    const { mascotaId } = req.params
    const { clinicaId } = req.usuario

    const mascota = await Mascota.findOne({ where: { id: mascotaId, clinicaId } })
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' })
    }

    const registros = await RegistroEstilo.findAll({
      where: { mascotaId, clinicaId },
      order: [['fechaServicio', 'DESC']],
      include: [{ model: Usuario, as: 'estilista', attributes: ['id', 'nombre'] }],
    })

    res.json({
      mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
      totalRegistros: registros.length,
      registros,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerRegistroEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({
      where: { id, clinicaId },
      include: [
        ...INCLUDES_DETALLE,
        { model: Cita, as: 'cita', attributes: ['id', 'fecha', 'tipoCita'] },
      ],
    })

    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    res.json({ registro })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const editarRegistroEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({ where: { id, clinicaId } })
    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    if (registro.bloqueado) {
      await registrarAuditoria({
        accion: 'INTENTO_EDITAR_ESTILO_BLOQUEADO',
        entidad: 'RegistroEstilo',
        entidadId: registro.id,
        descripcion: 'Intento de edicion en registro de estilos ya facturado',
        req,
        resultado: 'fallido',
      })
      return res.status(409).json({
        message: 'Este registro ya fue facturado y no se puede modificar',
        code: 'ESTILO_YA_FACTURADO',
      })
    }

    const { tipoCorte, observaciones, proximaCitaSugerida, estilistaId } = req.body
    const cambios = {}

    if (tipoCorte !== undefined) {
      const normalizado = normalizarTipoCorte(tipoCorte)
      if (!normalizado) {
        return res.status(400).json({ message: 'El tipo de corte no puede estar vacio' })
      }
      cambios.tipoCorte = normalizado
    }

    if (observaciones !== undefined) {
      cambios.observaciones = normalizarObservaciones(observaciones)
    }

    if (proximaCitaSugerida !== undefined) {
      try {
        cambios.proximaCitaSugerida = normalizarProximaCita(proximaCitaSugerida)
      } catch (error) {
        return res.status(400).json({ message: error.message })
      }
    }

    if (estilistaId !== undefined) {
      const estilista = await Usuario.findOne({
        where: { id: estilistaId, clinicaId, activo: true },
      })
      if (!estilista) {
        return res.status(404).json({ message: 'Estilista no encontrado' })
      }
      cambios.estilistaId = estilistaId
    }

    await registro.update(cambios)

    const registroActualizado = await RegistroEstilo.findOne({
      where: { id: registro.id, clinicaId },
      include: INCLUDES_DETALLE,
    })

    await registrarAuditoria({
      accion: 'EDITAR_REGISTRO_ESTILO',
      entidad: 'RegistroEstilo',
      entidadId: registro.id,
      descripcion: `Registro de estilos actualizado`,
      datosNuevos: cambios,
      req,
      resultado: 'exitoso',
    })

    res.json({
      message: 'Registro de estilos actualizado exitosamente',
      registro: registroActualizado,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

// Borrador de cobro: devuelve los datos del tutor y la mascota para prellenar
// Caja. El servicio a cobrar lo elige el cajero del catalogo de ServicioClinico
// — este registro no define precios.
const obtenerPreliquidacionEstilo = async (req, res) => {
  try {
    const { id } = req.params
    const { clinicaId } = req.usuario

    const registro = await RegistroEstilo.findOne({
      where: { id, clinicaId },
      include: [
        { model: Mascota, as: 'mascota', attributes: ['id', 'nombre', 'especie'] },
        { model: Propietario, as: 'propietario', attributes: ['id', 'nombre', 'telefono'] },
      ],
    })

    if (!registro) {
      return res.status(404).json({ message: 'Registro de estilos no encontrado' })
    }

    if (registro.facturaId) {
      return res.status(409).json({
        message: 'Este servicio de estilos ya fue facturado',
        code: 'ESTILO_YA_FACTURADO',
        facturaId: registro.facturaId,
      })
    }

    res.json({
      registroEstiloId: registro.id,
      tipoCorte: registro.tipoCorte,
      mascota: registro.mascota,
      propietario: registro.propietario,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  crearRegistroEstilo,
  obtenerRegistrosEstiloMascota,
  obtenerRegistroEstilo,
  editarRegistroEstilo,
  obtenerPreliquidacionEstilo,
}
