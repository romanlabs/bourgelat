import { Boxes, CalendarClock, FileText, PawPrint, Receipt } from 'lucide-react'

export const ALL_QUICK_ACTIONS = {
  facturar: {
    key: 'facturar',
    label: 'Facturar',
    detail: 'Entrar a caja y emitir una factura sin buscar el modulo.',
    to: '/finanzas',
    icon: Receipt,
  },
  paciente: {
    key: 'paciente',
    label: 'Nuevo paciente',
    detail: 'Registrar tutor y paciente desde el flujo operativo.',
    to: '/pacientes',
    icon: PawPrint,
  },
  historia: {
    key: 'historia',
    label: 'Historia clinica',
    detail: 'Abrir consulta y documentar el caso sin rodeos.',
    to: '/pacientes',
    icon: FileText,
  },
  agenda: {
    key: 'agenda',
    label: 'Nueva cita',
    detail: 'Programar o reorganizar la agenda del dia.',
    to: '/agenda',
    icon: CalendarClock,
  },
  inventario: {
    key: 'inventario',
    label: 'Inventario',
    detail: 'Revisar stock critico y vencimientos sin rodeos.',
    to: '/inventario',
    icon: Boxes,
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
