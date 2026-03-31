const { Op, fn, col } = require('sequelize')

const Clinica = require('../models/Clinica')
const Usuario = require('../models/Usuario')
const Suscripcion = require('../models/Suscripcion')
const Factura = require('../models/Factura')
const AuditoriaLog = require('../models/AuditoriaLog')
const IntegracionFacturacion = require('../models/IntegracionFacturacion')
const { PLANES_PUBLICOS, formatDateOnly } = require('../config/planes')

const ESTADOS_SUSCRIPCION_VIGENTES = ['activa', 'prueba']
const FUNCIONALIDAD_FACTURACION_ELECTRONICA = 'facturacion_electronica'

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const serializeDateOnly = (date) => formatDateOnly(date)

const startOfDay = (date = new Date()) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const endOfDay = (date = new Date()) => {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const daysUntil = (dateOnlyValue) => {
  if (!dateOnlyValue) return null

  const today = startOfDay()
  const target = startOfDay(new Date(`${dateOnlyValue}T00:00:00`))

  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
}

const nombreClinica = (clinica) =>
  clinica?.nombreComercial || clinica?.razonSocial || clinica?.nombre || 'Clinica sin nombre'

const esPerfilFiscalCompleto = (clinica) =>
  Boolean(
    clinica?.nit &&
      clinica?.razonSocial &&
      clinica?.nombreComercial &&
      clinica?.telefono &&
      clinica?.direccion &&
      clinica?.ciudad &&
      clinica?.departamento &&
      clinica?.municipioId &&
      clinica?.tipoDocumentoFacturacionId &&
      clinica?.organizacionJuridicaId &&
      clinica?.tributoId
  )

const resumirPorClave = (rows, keyField, emptyKey) =>
  rows.reduce((acc, row) => {
    const key = row[keyField] || emptyKey
    acc[key] = Number(row.total || 0)
    return acc
  }, {})

const obtenerSuscripcionesVigentesPorClinica = (suscripciones) => {
  const suscripcionesPorClinica = new Map()

  suscripciones.forEach((suscripcion) => {
    if (!suscripcion?.clinicaId || suscripcionesPorClinica.has(suscripcion.clinicaId)) {
      return
    }

    suscripcionesPorClinica.set(suscripcion.clinicaId, suscripcion)
  })

  return suscripcionesPorClinica
}

const obtenerResumenGlobal = async (req, res) => {
  try {
    const hoy = new Date()
    const inicioMes = startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    const finMes = endOfDay(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))
    const inicioSemana = startOfDay(addDays(hoy, -6))
    const limitePruebas = endOfDay(addDays(hoy, 7))

    const [
      clinicas,
      usuariosActivos,
      suscripcionesVigentes,
      ingresosFacturadosMes,
      estadosElectronicosMes,
      integraciones,
      totalEventosSemana,
      totalFallidosSemana,
      actividadPorAccion,
    ] = await Promise.all([
      Clinica.findAll({
        attributes: [
          'id',
          'nombre',
          'nombreComercial',
          'razonSocial',
          'email',
          'telefono',
          'direccion',
          'ciudad',
          'departamento',
          'nit',
          'municipioId',
          'tipoDocumentoFacturacionId',
          'organizacionJuridicaId',
          'tributoId',
          'activo',
          'createdAt',
          'ultimoAcceso',
        ],
        order: [['createdAt', 'DESC']],
        raw: true,
      }),
      Usuario.count({
        where: {
          activo: true,
          clinicaId: { [Op.ne]: null },
        },
      }),
      Suscripcion.findAll({
        where: {
          estado: {
            [Op.in]: ESTADOS_SUSCRIPCION_VIGENTES,
          },
        },
        include: [
          {
            model: Clinica,
            as: 'clinica',
            attributes: [
              'id',
              'nombre',
              'nombreComercial',
              'razonSocial',
              'email',
              'telefono',
              'direccion',
              'ciudad',
              'departamento',
              'nit',
              'municipioId',
              'tipoDocumentoFacturacionId',
              'organizacionJuridicaId',
              'tributoId',
              'activo',
              'createdAt',
              'ultimoAcceso',
            ],
            required: false,
          },
        ],
        order: [
          ['clinicaId', 'ASC'],
          ['createdAt', 'DESC'],
        ],
      }),
      Factura.sum('total', {
        where: {
          fecha: {
            [Op.between]: [serializeDateOnly(inicioMes), serializeDateOnly(finMes)],
          },
          estado: {
            [Op.ne]: 'anulada',
          },
        },
      }),
      Factura.findAll({
        where: {
          fecha: {
            [Op.between]: [serializeDateOnly(inicioMes), serializeDateOnly(finMes)],
          },
          estadoElectronico: {
            [Op.ne]: 'no_aplica',
          },
        },
        attributes: ['estadoElectronico', [fn('COUNT', col('id')), 'total']],
        group: ['estadoElectronico'],
        raw: true,
      }),
      IntegracionFacturacion.findAll({
        attributes: [
          'clinicaId',
          'activa',
          'ambiente',
          'ultimoChequeo',
          'ultimoEstadoChequeo',
          'ultimoMensajeChequeo',
        ],
        raw: true,
      }),
      AuditoriaLog.count({
        where: {
          createdAt: {
            [Op.gte]: inicioSemana,
          },
        },
      }),
      AuditoriaLog.count({
        where: {
          createdAt: {
            [Op.gte]: inicioSemana,
          },
          resultado: 'fallido',
        },
      }),
      AuditoriaLog.findAll({
        where: {
          createdAt: {
            [Op.gte]: inicioSemana,
          },
        },
        attributes: ['accion', [fn('COUNT', col('id')), 'total']],
        group: ['accion'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 8,
        raw: true,
      }),
    ])

    const suscripcionesPorClinica = obtenerSuscripcionesVigentesPorClinica(suscripcionesVigentes)
    const integracionesPorClinica = new Map(
      integraciones.map((integracion) => [integracion.clinicaId, integracion])
    )

    const clinicasActivas = clinicas.filter((clinica) => clinica.activo).length
    const nuevasClinicasMes = clinicas.filter(
      (clinica) => new Date(clinica.createdAt).getTime() >= inicioMes.getTime()
    ).length

    const distribucionPlanes = {}
    const distribucionEstados = {}

    let mrrEstimado = 0
    let pruebasActivas = 0

    suscripcionesPorClinica.forEach((suscripcion) => {
      distribucionPlanes[suscripcion.plan] = (distribucionPlanes[suscripcion.plan] || 0) + 1
      distribucionEstados[suscripcion.estado] = (distribucionEstados[suscripcion.estado] || 0) + 1

      if (suscripcion.estado === 'prueba') {
        pruebasActivas += 1
      }

      if (suscripcion.estado === 'activa' && suscripcion.plan !== 'inicio') {
        mrrEstimado += toNumber(suscripcion.precio)
      }
    })

    const pruebasPorVencer = Array.from(suscripcionesPorClinica.values())
      .filter((suscripcion) => {
        if (suscripcion.estado !== 'prueba') return false

        const fechaFin = new Date(`${suscripcion.fechaFin}T23:59:59.999`)
        return fechaFin.getTime() <= limitePruebas.getTime()
      })
      .sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin))
      .map((suscripcion) => ({
        clinicaId: suscripcion.clinicaId,
        clinicaNombre: nombreClinica(suscripcion.clinica),
        ciudad: suscripcion.clinica?.ciudad || '',
        departamento: suscripcion.clinica?.departamento || '',
        contacto: suscripcion.clinica?.email || '',
        plan: suscripcion.plan,
        estado: suscripcion.estado,
        fechaFin: suscripcion.fechaFin,
        diasRestantes: daysUntil(suscripcion.fechaFin),
      }))

    const facturacionPendiente = Array.from(suscripcionesPorClinica.values())
      .filter(
        (suscripcion) =>
          Array.isArray(suscripcion.funcionalidades) &&
          suscripcion.funcionalidades.includes(FUNCIONALIDAD_FACTURACION_ELECTRONICA)
      )
      .map((suscripcion) => {
        const clinica = suscripcion.clinica
        const integracion = integracionesPorClinica.get(suscripcion.clinicaId) || null
        const perfilFiscalCompleto = esPerfilFiscalCompleto(clinica)
        const requiereIntervencion =
          !perfilFiscalCompleto ||
          !integracion?.activa ||
          integracion?.ultimoEstadoChequeo === 'fallido'

        return {
          clinicaId: suscripcion.clinicaId,
          clinicaNombre: nombreClinica(clinica),
          plan: suscripcion.plan,
          estadoSuscripcion: suscripcion.estado,
          ambiente: integracion?.ambiente || 'sin_configurar',
          integracionActiva: Boolean(integracion?.activa),
          perfilFiscalCompleto,
          ultimoEstadoChequeo: integracion?.ultimoEstadoChequeo || 'pendiente',
          ultimoChequeo: integracion?.ultimoChequeo || null,
          ultimoMensajeChequeo: integracion?.ultimoMensajeChequeo || '',
          contacto: clinica?.email || '',
          requiereIntervencion,
        }
      })
      .filter((item) => item.requiereIntervencion)
      .sort((a, b) => {
        const prioridadA = a.integracionActiva ? 1 : 0
        const prioridadB = b.integracionActiva ? 1 : 0
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB
        }
        return a.clinicaNombre.localeCompare(b.clinicaNombre)
      })
      .slice(0, 8)

    const clinicasRecientes = clinicas.slice(0, 8).map((clinica) => {
      const suscripcion = suscripcionesPorClinica.get(clinica.id)
      const integracion = integracionesPorClinica.get(clinica.id)

      return {
        id: clinica.id,
        nombre: nombreClinica(clinica),
        email: clinica.email,
        ciudad: clinica.ciudad,
        departamento: clinica.departamento,
        activo: clinica.activo,
        createdAt: clinica.createdAt,
        ultimoAcceso: clinica.ultimoAcceso,
        plan: suscripcion?.plan || 'sin_suscripcion',
        estadoSuscripcion: suscripcion?.estado || 'sin_suscripcion',
        integracionActiva: Boolean(integracion?.activa),
      }
    })

    res.json({
      catalogoPlanes: PLANES_PUBLICOS,
      resumen: {
        totalClinicas: clinicas.length,
        clinicasActivas,
        nuevasClinicasMes,
        usuariosActivos,
        mrrEstimado,
        ingresosFacturadosMes: toNumber(ingresosFacturadosMes),
        pruebasActivas,
        pruebasPorVencer: pruebasPorVencer.length,
        integracionesActivas: integraciones.filter((integracion) => integracion.activa).length,
        integracionesConFallo: integraciones.filter(
          (integracion) => integracion.ultimoEstadoChequeo === 'fallido'
        ).length,
        eventosFallidosSemana: totalFallidosSemana,
      },
      distribuciones: {
        porPlan: distribucionPlanes,
        porEstadoSuscripcion: distribucionEstados,
        porEstadoElectronico: resumirPorClave(
          estadosElectronicosMes,
          'estadoElectronico',
          'sin_estado'
        ),
      },
      actividad: {
        totalEventosSemana,
        totalFallidosSemana,
        porAccion: resumirPorClave(actividadPorAccion, 'accion', 'sin_accion'),
      },
      listas: {
        clinicasRecientes,
        pruebasPorVencer,
        facturacionPendiente,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

module.exports = {
  obtenerResumenGlobal,
}
