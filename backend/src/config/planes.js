// Llaves legado: ya no se ofrecen, pero permanecen en PLAN_KEYS porque
// Suscripcion.plan es un ENUM de Postgres y sus valores no se pueden eliminar
// sin recrear el tipo. Hay filas historicas apuntando aqui.
const PLAN_KEYS_LEGADO = ['inicio', 'clinica', 'profesional']
const PLAN_KEYS_ACTIVOS = ['prueba', 'activo', 'cortesia', 'personalizado']
const PLAN_KEYS = [...PLAN_KEYS_LEGADO, ...PLAN_KEYS_ACTIVOS]

const DEFAULT_INITIAL_PLAN = 'prueba'
const DIAS_PRUEBA = 30
const USUARIOS_BASE = 3
const PRECIO_USUARIO_ADICIONAL = 25000
const CORTESIA_END_DATE = '2099-12-31'

// El add-on DIAN se agrega a la fila de suscripcion al comprarse; ningun plan
// lo trae de fabrica.
const FUNCIONALIDAD_DIAN = 'facturacion_electronica'
const DOCUMENTOS_DIAN_INCLUIDOS = 200
const PRECIO_DIAN_MENSUAL = 49000
const PRECIO_DIAN_DOCUMENTO_EXCEDENTE = 250

const FUNCIONALIDADES_COMPLETAS = [
  'citas',
  'historias',
  'antecedentes',
  'propietarios',
  'mascotas',
  'roles_base',
  'inventario',
  'facturacion_interna',
  'reportes_operativos',
  'reportes_completos',
  'exportables',
]

// Copia por plan: compartir la referencia haria que comprar DIAN en una
// clinica lo activara en todas.
const funcionalidadesCompletas = () => [...FUNCIONALIDADES_COMPLETAS]

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
  prueba: {
    nombre: 'Prueba',
    descripcion:
      'Treinta dias con todo el sistema abierto para que la clinica vea un ciclo mensual completo: agenda, historia, inventario, caja y reportes.',
    precioMensual: 0,
    precioAnual: 0,
    limiteUsuarios: 2,
    limiteMascotas: null,
    almacenamientoMB: 2048,
    funcionalidades: funcionalidadesCompletas(),
  },
  activo: {
    nombre: 'Bourgelat',
    descripcion:
      'Toda la operacion de la clinica en un solo sistema, sin limites de pacientes, historias ni facturas.',
    precioMensual: 89000,
    precioAnual: 75000,
    limiteUsuarios: USUARIOS_BASE,
    limiteMascotas: null,
    almacenamientoMB: 20480,
    funcionalidades: funcionalidadesCompletas(),
  },
  cortesia: {
    nombre: 'Cortesia',
    descripcion:
      'Acceso permanente sin costo para las clinicas que acompanaron el desarrollo del producto.',
    precioMensual: 0,
    precioAnual: 0,
    limiteUsuarios: 3,
    limiteMascotas: null,
    almacenamientoMB: 2048,
    funcionalidades: funcionalidadesCompletas(),
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
    funcionalidades: funcionalidadesCompletas(),
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

const crearSuscripcionPrueba = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'prueba',
    estado: 'prueba',
    fechaInicio: formatDateOnly(),
    fechaFin: addDaysDateOnly(DIAS_PRUEBA),
    precio: 0,
  })

const crearSuscripcionCortesia = (clinicaId) =>
  construirSuscripcion({
    clinicaId,
    plan: 'cortesia',
    estado: 'activa',
    fechaInicio: formatDateOnly(),
    fechaFin: CORTESIA_END_DATE,
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
    funcionalidades: [...value.funcionalidades],
  }
  return acc
}, {})

module.exports = {
  PLAN_KEYS,
  PLAN_KEYS_LEGADO,
  PLAN_KEYS_ACTIVOS,
  PLANES,
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  DIAS_PRUEBA,
  USUARIOS_BASE,
  PRECIO_USUARIO_ADICIONAL,
  CORTESIA_END_DATE,
  FUNCIONALIDAD_DIAN,
  FUNCIONALIDADES_COMPLETAS,
  DOCUMENTOS_DIAN_INCLUIDOS,
  PRECIO_DIAN_MENSUAL,
  PRECIO_DIAN_DOCUMENTO_EXCEDENTE,
  formatDateOnly,
  addDaysDateOnly,
  obtenerPlan,
  construirSuscripcion,
  crearSuscripcionPrueba,
  crearSuscripcionCortesia,
}
