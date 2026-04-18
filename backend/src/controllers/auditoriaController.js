const { Op, fn, col } = require('sequelize')
const AuditoriaLog = require('../models/AuditoriaLog')
const Usuario = require('../models/Usuario')

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return ''
  return String(valor).trim()
}

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

const construirWhere = ({ clinicaId, accion, entidad, resultado, buscar, desde, hasta }) => {
  const where = { clinicaId }

  const accionLimpia = limpiarTexto(accion)
  const entidadLimpia = limpiarTexto(entidad)
  const resultadoLimpio = limpiarTexto(resultado)
  const buscarLimpio = limpiarTexto(buscar)

  if (accionLimpia) where.accion = accionLimpia
  if (entidadLimpia) where.entidad = entidadLimpia
  if (resultadoLimpio) where.resultado = resultadoLimpio

  const rangoFecha = parseDateRange({ desde, hasta })
  if (rangoFecha?.error) {
    return { error: rangoFecha.error }
  }
  if (rangoFecha) {
    where.createdAt = rangoFecha
  }

  if (buscarLimpio) {
    where[Op.or] = [
      { accion: { [Op.iLike]: `%${buscarLimpio}%` } },
      { entidad: { [Op.iLike]: `%${buscarLimpio}%` } },
      { descripcion: { [Op.iLike]: `%${buscarLimpio}%` } },
    ]
  }

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
    })

    if (filtroConstruido.error) {
      return res.status(400).json({ message: filtroConstruido.error })
    }

    const { where } = filtroConstruido
    const offset = (pagina - 1) * limite

    const [resultadoPaginado, totalFallidos, totalExitosos, porEntidadRows, porAccionRows, usuariosInvolucrados] =
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
      ])

    const usuarioIds = [
      ...new Set(resultadoPaginado.rows.map((log) => log.usuarioId).filter(Boolean)),
    ]

    const usuarios = usuarioIds.length
      ? await Usuario.findAll({
          where: { id: { [Op.in]: usuarioIds } },
          attributes: ['id', 'nombre', 'email'],
          raw: true,
        })
      : []

    const usuariosPorId = new Map(usuarios.map((usuario) => [usuario.id, usuario]))

    const logs = resultadoPaginado.rows.map((log) => {
      const logPlano = log.get({ plain: true })
      const responsable = logPlano.usuarioId ? usuariosPorId.get(logPlano.usuarioId) : null

      return {
        ...logPlano,
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
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  obtenerAuditoria,
}
