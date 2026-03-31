const PLAN_KEYS = ['inicio', 'clinica', 'profesional', 'personalizado']
const TRIAL_DAYS = 14
const FREE_PLAN_END_DATE = '2099-12-31'

const formatDateOnly = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (baseDate, days) => {
  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const addDaysDateOnly = (days, baseDate = new Date()) =>
  formatDateOnly(addDays(baseDate, days))

const PLANES = {
  inicio: {
    nombre: 'Inicio Gratis',
    descripcion:
      'Para clinicas que necesitan ordenar agenda y pacientes antes de pasar a una operacion mas completa.',
    precioMensual: 0,
    precioAnual: 0,
    limiteUsuarios: 2,
    limiteMascotas: 250,
    almacenamientoMB: 1024,
    funcionalidades: [
      'citas',
      'historias',
      'antecedentes',
      'propietarios',
      'mascotas',
      'roles_base',
    ],
  },
  clinica: {
    nombre: 'Clinica',
    descripcion:
      'Para clinicas pequenas y medianas que necesitan agenda, consulta, inventario y caja dentro del mismo sistema.',
    precioMensual: 99000,
    precioAnual: 79000,
    limiteUsuarios: 5,
    limiteMascotas: 2500,
    almacenamientoMB: 5120,
    funcionalidades: [
      'citas',
      'historias',
      'antecedentes',
      'propietarios',
      'mascotas',
      'roles_base',
      'inventario',
      'facturacion_interna',
      'reportes_operativos',
    ],
  },
  profesional: {
    nombre: 'Profesional',
    descripcion:
      'Para clinicas que buscan centralizar la operacion clinica, administrativa y fiscal en un solo flujo.',
    precioMensual: 189000,
    precioAnual: 159000,
    limiteUsuarios: 12,
    limiteMascotas: 10000,
    almacenamientoMB: 20480,
    funcionalidades: [
      'citas',
      'historias',
      'antecedentes',
      'propietarios',
      'mascotas',
      'roles_base',
      'inventario',
      'facturacion_interna',
      'facturacion_electronica',
      'reportes_operativos',
      'reportes_completos',
      'exportables',
    ],
  },
  personalizado: {
    nombre: 'Personalizado',
    descripcion:
      'Para clinicas que necesitan una propuesta comercial con configuracion, migracion y acompanamiento segun alcance.',
    precioMensual: null,
    precioAnual: null,
    limiteUsuarios: null,
    limiteMascotas: null,
    almacenamientoMB: null,
    funcionalidades: [
      'citas',
      'historias',
      'antecedentes',
      'propietarios',
      'mascotas',
      'roles_base',
      'inventario',
      'facturacion_interna',
      'facturacion_electronica',
      'reportes_operativos',
      'reportes_completos',
      'exportables',
      'acompanamiento_migracion',
      'soporte_prioritario_comercial',
    ],
  },
}

const obtenerPlan = (plan) => PLANES[plan] || null

const construirSuscripcion = ({
  clinicaId,
  plan,
  estado = 'activa',
  fechaInicio,
  fechaFin,
  precio,
  metodoPago = null,
  referenciaPago = null,
  limiteUsuarios,
  limiteMascotas,
  almacenamientoMB,
  funcionalidades,
}) => {
  const configuracion = obtenerPlan(plan)

  if (!configuracion) {
    throw new Error(`Plan no soportado: ${plan}`)
  }

  return {
    plan,
    estado,
    fechaInicio,
    fechaFin,
    precio:
      typeof precio === 'number' || typeof precio === 'string'
        ? precio
        : configuracion.precioMensual || 0,
    metodoPago,
    referenciaPago,
    limiteUsuarios:
      limiteUsuarios === undefined
        ? configuracion.limiteUsuarios
        : limiteUsuarios,
    limiteMascotas:
      limiteMascotas === undefined
        ? configuracion.limiteMascotas
        : limiteMascotas,
    almacenamientoMB:
      almacenamientoMB === undefined
        ? configuracion.almacenamientoMB
        : almacenamientoMB,
    funcionalidades:
      funcionalidades === undefined
        ? configuracion.funcionalidades
        : funcionalidades,
    clinicaId,
  }
}

const crearSuscripcionPruebaInicial = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'profesional',
    estado: 'prueba',
    fechaInicio: formatDateOnly(),
    fechaFin: addDaysDateOnly(TRIAL_DAYS),
    precio: 0,
  })

const crearSuscripcionInicioGratis = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'inicio',
    estado: 'activa',
    fechaInicio: formatDateOnly(),
    fechaFin: FREE_PLAN_END_DATE,
    precio: 0,
  })

const PLANES_PUBLICOS = Object.entries(PLANES).reduce((acc, [key, value]) => {
  acc[key] = {
    key,
    nombre: value.nombre,
    descripcion: value.descripcion,
    precioMensual: value.precioMensual,
    precioAnual: value.precioAnual,
    limiteUsuarios: value.limiteUsuarios,
    limiteMascotas: value.limiteMascotas,
    almacenamientoMB: value.almacenamientoMB,
    funcionalidades: value.funcionalidades,
  }
  return acc
}, {})

module.exports = {
  PLAN_KEYS,
  PLANES,
  PLANES_PUBLICOS,
  TRIAL_DAYS,
  FREE_PLAN_END_DATE,
  formatDateOnly,
  addDaysDateOnly,
  obtenerPlan,
  construirSuscripcion,
  crearSuscripcionPruebaInicial,
  crearSuscripcionInicioGratis,
}
