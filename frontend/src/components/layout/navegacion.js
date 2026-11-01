import {
  Boxes,
  Building2,
  ChartColumn,
  CalendarClock,
  CreditCard,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  PawPrint,
  Receipt,
  ScrollText,
  UserCog,
} from 'lucide-react'
import { canAccessModule, getUserRoles } from '@/lib/permissions'

// Módulos de la app. `descripcion` es la línea que acompaña a cada uno en la
// pantalla «Más» del celular.
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Hoy', to: '/dashboard', icon: LayoutDashboard, descripcion: 'Citas, caja y pendientes del día' },
  { key: 'agenda', label: 'Agenda', to: '/agenda', icon: CalendarClock, descripcion: 'Citas por día y por profesional' },
  { key: 'pacientes', label: 'Pacientes', to: '/pacientes', icon: PawPrint, descripcion: 'Fichas de pacientes y tutores' },
  { key: 'historias', label: 'Historias', to: '/historias', icon: FileText, descripcion: 'Consultas, diagnósticos y fórmulas' },
  { key: 'antecedentes', label: 'Antecedentes', to: '/antecedentes', icon: HeartPulse, descripcion: 'Vacunas, cirugías y alergias por paciente' },
  { key: 'caja', label: 'Caja', to: '/caja', icon: Receipt, descripcion: 'Cobrar y cerrar el turno' },
  { key: 'inventario', label: 'Inventario', to: '/inventario', icon: Boxes, descripcion: 'Productos, servicios y compras' },
  { key: 'finanzas', label: 'Finanzas', to: '/finanzas', icon: ChartColumn, descripcion: 'Ventas, gastos y rentabilidad' },
  { key: 'configuracion', label: 'Clínica', to: '/configuracion', icon: Building2, descripcion: 'Datos, horarios y consultorios' },
  { key: 'usuarios', label: 'Usuarios', to: '/usuarios', icon: UserCog, descripcion: 'Quién entra y con qué permisos' },
  { key: 'auditoria', label: 'Auditoría', to: '/auditoria', icon: ScrollText, descripcion: 'Cada cambio con su autor y hora' },
  { key: 'soporte', label: 'Soporte', to: '/soporte', icon: LifeBuoy, descripcion: 'Escríbenos si algo no funciona' },
  { key: 'planes', label: 'Mi plan', to: '/plan', icon: CreditCard, descripcion: 'Tu suscripción y pagos' },
]

export const NAV_SECTIONS = [
  {
    key: 'operacion',
    label: 'Día a día',
    items: ['dashboard', 'agenda', 'pacientes', 'historias', 'antecedentes', 'caja', 'inventario', 'finanzas'],
  },
  {
    key: 'administracion',
    label: 'Administración',
    items: ['configuracion', 'usuarios', 'auditoria', 'soporte', 'planes'],
  },
]

export const NAV_ITEMS_BY_KEY = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

// Pestañas de la barra inferior del celular, en orden de uso por rol. Se
// toman las primeras a las que el usuario puede entrar; la quinta es «Más».
const PESTANAS_POR_ROL = {
  admin: ['dashboard', 'agenda', 'pacientes', 'caja'],
  superadmin: ['dashboard', 'agenda', 'pacientes', 'caja'],
  veterinario: ['dashboard', 'agenda', 'pacientes', 'historias'],
  recepcionista: ['dashboard', 'agenda', 'pacientes', 'caja'],
  auxiliar: ['dashboard', 'agenda', 'pacientes', 'inventario'],
  facturador: ['dashboard', 'caja', 'finanzas'],
}

export const MAX_PESTANAS_MOVIL = 4

export function pestanasMovil(usuario) {
  const rol = getUserRoles(usuario).find((r) => PESTANAS_POR_ROL[r])
  const orden = PESTANAS_POR_ROL[rol] || ['dashboard', 'agenda', 'pacientes']
  return orden
    .filter((key) => key === 'dashboard' || canAccessModule(usuario, key))
    .slice(0, MAX_PESTANAS_MOVIL)
}
