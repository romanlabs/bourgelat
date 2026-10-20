const { Op, fn, col } = require('sequelize')
const AuditoriaLog = require('../models/AuditoriaLog')
const Usuario = require('../models/Usuario')

const { limpiarTexto } = require('../utils/normalizar')

const parseEntero = (valor, valorPorDefecto) => {
  const numero = Number.parseInt(valor, 10)
  return Number.isFinite(numero) ? numero : valorPorDefecto
}

const parseDateRange = ({ desde, hasta }) => {
  const filtro = {}

  if (desde) {
    const fechaDesde = new Date(`${desde}T00:00:00`)
    if (Number.isNaN(fechaDesde.getTime())) {
      return { error: 'La fecha inicial no es valida' }
    }
    filtro[Op.gte] = fechaDesde
  }

  if (hasta) {
    const fechaHasta = new Date(`${hasta}T23:59:59.999`)
    if (Number.isNaN(fechaHasta.getTime())) {
      return { error: 'La fecha final no es valida' }
    }
    filtro[Op.lte] = fechaHasta
  }

  return Object.keys(filtro).length > 0 ? filtro : null
}

// Agrupa las acciones por su verbo para filtrar y etiquetar sin listar cada una.
const TIPOS_ACCION = {
  crear: ['CREAR_', 'REGISTRAR_', 'REGISTRO_', 'ABRIR_', 'EMITIR_'],
  editar: ['EDITAR_', 'ACTUALIZAR_', 'CAMBIAR_', 'CERRAR_', 'BLOQUEAR_', 'ACTIVAR_', 'GUARDAR_', 'RELEVAR_', 'COMPLETAR_', 'RESPONDER_', 'SINCRONIZAR_'],
  anular: ['ANULAR_', 'ELIMINAR_', 'DESACTIVAR_', 'CANCELAR_'],
  sesion: ['LOGIN', 'LOGOUT', 'PASSWORD_', 'EMAIL_', 'REFRESH_'],
  fallido: [],
}

const tipoDeAccion = (accion, resultado) => {
  if (resultado === 'fallido' || /FALLIDO|INTENTO_|REUSE/.test(accion || '')) return 'fallido'
  const tipo = Object.entries(TIPOS_ACCION).find(([, prefijos]) =>
    prefijos.some((prefijo) => (accion || '').startsWith(prefijo))
  )
  return tipo ? tipo[0] : 'otro'
}

const construirWhere = ({ clinicaId, accion, entidad, resultado, buscar, desde, hasta, usuarioId, tipo }) => {
  const where = { clinicaId }
  const y = []

  const accionLimpia = limpiarTexto(accion)
  const entidadLimpia = limpiarTexto(entidad)
  const resultadoLimpio = limpiarTexto(resultado)
  const buscarLimpio = limpiarTexto(buscar)

  if (accionLimpia) where.accion = accionLimpia
  if (entidadLimpia) where.entidad = entidadLimpia
  if (resultadoLimpio) where.resultado = resultadoLimpio
  if (usuarioId) where.usuarioId = usuarioId

  if (tipo === 'fallido') {
    y.push({
      [Op.or]: [
        { resultado: 'fallido' },
        { accion: { [Op.iLike]: '%FALLIDO%' } },
        { accion: { [Op.startsWith]: 'INTENTO_' } },
        { accion: { [Op.iLike]: '%REUSE%' } },
      ],
    })
  } else if (TIPOS_ACCION[tipo]) {
    y.push({ resultado: 'exitoso' })
    y.push({ [Op.or]: TIPOS_ACCION[tipo].map((prefijo) => ({ accion: { [Op.startsWith]: prefijo } })) })
  }

  const rangoFecha = parseDateRange({ desde, hasta })
  if (rangoFecha?.error) {
    return { error: rangoFecha.error }
  }
  if (rangoFecha) {
    where.createdAt = rangoFecha
  }

  if (buscarLimpio) {
    y.push({
      [Op.or]: [
        { accion: { [Op.iLike]: `%${buscarLimpio}%` } },
        { entidad: { [Op.iLike]: `%${buscarLimpio}%` } },
        { descripcion: { [Op.iLike]: `%${buscarLimpio}%` } },
      ],
    })
  }

  if (y.length) where[Op.and] = y

  return { where }
}

const serializarTotalesAgrupados = (rows, keyField, labelForNull = 'sin_dato') =>
  rows.reduce((acc, row) => {
    const key = row[keyField] || labelForNull
    acc[key] = Number(row.total || 0)
    return acc
  }, {})

const obtenerAuditoria = async (req, res) => {
  try {
    const pagina = Math.max(parseEntero(req.query.pagina, 1), 1)
    const limite = Math.min(Math.max(parseEntero(req.query.limite, 20), 1), 100)
    const { clinicaId } = req.usuario

    const filtroConstruido = construirWhere({
      clinicaId,
      accion: req.query.accion,
      entidad: req.query.entidad,
      resultado: req.query.resultado,
      buscar: req.query.buscar,
      desde: req.query.desde,
      hasta: req.query.hasta,
      usuarioId: req.query.usuarioId || undefined,
      tipo: req.query.tipo || undefined,
    })

    if (filtroConstruido.error) {
      return res.status(400).json({ message: filtroConstruido.error })
    }

    const { where } = filtroConstruido
    const offset = (pagina - 1) * limite

    // El selector de persona lista a quien actuó en el rango, sin los demás filtros.
    const wherePersonas = { clinicaId, usuarioId: { [Op.ne]: null } }
    if (where.createdAt) wherePersonas.createdAt = where.createdAt

    const [resultadoPaginado, totalFallidos, totalExitosos, porEntidadRows, porAccionRows, usuariosInvolucrados, personasRows] =
      await Promise.all([
        AuditoriaLog.findAndCountAll({
          where,
          order: [['createdAt', 'DESC']],
          limit: limite,
          offset,
        }),
        AuditoriaLog.count({ where: { ...where, resultado: 'fallido' } }),
        AuditoriaLog.count({ where: { ...where, resultado: 'exitoso' } }),
        AuditoriaLog.findAll({
          where,
          attributes: ['entidad', [fn('COUNT', col('id')), 'total']],
          group: ['entidad'],
          order: [[fn('COUNT', col('id')), 'DESC']],
          raw: true,
        }),
        AuditoriaLog.findAll({
          where,
          attributes: ['accion', [fn('COUNT', col('id')), 'total']],
          group: ['accion'],
          order: [[fn('COUNT', col('id')), 'DESC']],
          limit: 12,
          raw: true,
        }),
        AuditoriaLog.count({
          where: { ...where, usuarioId: { [Op.ne]: null } },
          distinct: true,
          col: 'usuarioId',
        }),
        AuditoriaLog.findAll({
          where: wherePersonas,
          attributes: [[fn('DISTINCT', col('usuarioId')), 'usuarioId']],
          raw: true,
        }),
      ])

    const usuarioIds = [
      ...new Set([
        ...resultadoPaginado.rows.map((log) => log.usuarioId),
        ...personasRows.map((row) => row.usuarioId),
      ].filter(Boolean)),
    ]

    const usuarios = usuarioIds.length
      ? await Usuario.findAll({
          where: { id: { [Op.in]: usuarioIds } },
          attributes: ['id', 'nombre', 'email'],
          raw: true,
          // Los ids salen de logs ya filtrados por clínica; puede incluir
          // superadmins (clinicaId null) que actuaron sobre la clínica.
          sinTenant: true,
        })
      : []

    const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]))

    const logs = resultadoPaginado.rows.map((log) => {
      const logPlano = log.get({ plain: true })
      const responsable = logPlano.usuarioId ? usuariosPorId.get(logPlano.usuarioId) : null

      return {
        ...logPlano,
        tipo: tipoDeAccion(logPlano.accion, logPlano.resultado),
        responsable: responsable
          ? {
              id: responsable.id,
              nombre: responsable.nombre,
              email: responsable.email,
            }
          : null,
      }
    })

    res.json({
      total: resultadoPaginado.count,
      paginas: Math.ceil(resultadoPaginado.count / limite) || 1,
      paginaActual: pagina,
      logs,
      resumen: {
        totalEventos: resultadoPaginado.count,
        totalExitosos,
        totalFallidos,
        usuariosInvolucrados,
        porEntidad: serializarTotalesAgrupados(porEntidadRows, 'entidad', 'sin_entidad'),
        porAccion: serializarTotalesAgrupados(porAccionRows, 'accion', 'sin_accion'),
      },
      entidadesDisponibles: porEntidadRows
        .map((row) => row.entidad)
        .filter(Boolean),
      accionesDisponibles: porAccionRows
        .map((row) => row.accion)
        .filter(Boolean),
      personas: personasRows
        .map((row) => usuariosPorId.get(row.usuarioId))
        .filter(Boolean)
        .map(({ id, nombre }) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  obtenerAuditoria,
  TIPOS_ACCION,
}
