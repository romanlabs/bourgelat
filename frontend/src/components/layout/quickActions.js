import { Boxes, CalendarClock, FileText, PawPrint, Receipt } from 'lucide-react'

export const ALL_QUICK_ACTIONS = {
  facturar: {
    key: 'facturar',
    label: 'Facturar',
    to: '/finanzas',
    icon: Receipt,
    accent: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
    cardHover: 'hover:border-emerald-200 hover:bg-emerald-50/50',
  },
  paciente: {
    key: 'paciente',
    label: 'Nuevo paciente',
    to: '/pacientes',
    icon: PawPrint,
    accent: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    cardHover: 'hover:border-violet-200 hover:bg-violet-50/50',
  },
  historia: {
    key: 'historia',
    label: 'Historia clinica',
    to: '/pacientes',
    icon: FileText,
    accent: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    cardHover: 'hover:border-blue-200 hover:bg-blue-50/50',
  },
  agenda: {
    key: 'agenda',
    label: 'Nueva cita',
    to: '/agenda',
    icon: CalendarClock,
    accent: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100',
    cardHover: 'hover:border-sky-200 hover:bg-sky-50/50',
  },
  inventario: {
    key: 'inventario',
    label: 'Inventario',
    to: '/inventario',
    icon: Boxes,
    accent: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
    cardHover: 'hover:border-amber-200 hover:bg-amber-50/50',
  },
}

export const ROL_ACTION_ORDER = {
  veterinario:  ['historia', 'agenda', 'paciente', 'facturar'],
  recepcionista: ['agenda', 'paciente', 'facturar', 'historia'],
  facturador:   ['facturar', 'agenda', 'paciente', 'historia'],
  auxiliar:     ['agenda', 'paciente', 'historia', 'facturar'],
  admin:        ['agenda', 'paciente', 'inventario', 'facturar'],
  superadmin:   ['agenda', 'paciente', 'inventario', 'facturar'],
}

export const DEFAULT_QUICK_ACTIONS = Object.values(ALL_QUICK_ACTIONS)
