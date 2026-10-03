import { Boxes, CalendarClock, FileText, PawPrint, Receipt } from 'lucide-react'

// Todas las acciones comparten el acento de marca (caramelo): el color era
// decorativo y no distinguía nada; los iconos y etiquetas ya las diferencian.

export const ALL_QUICK_ACTIONS = {
  facturar: {
    key: 'facturar',
    label: 'Facturar',
    to: '/finanzas',
    icon: Receipt,
    accent: 'bg-brand-muted text-brand-foreground group-hover:bg-brand/20',
    cardHover: 'hover:border-brand/30 hover:bg-brand-muted/50',
  },
  paciente: {
    key: 'paciente',
    label: 'Nuevo paciente',
    // Abre el formulario directamente, no el resumen del modulo.
    to: '/pacientes?tab=pacientes&nuevo=paciente',
    icon: PawPrint,
    accent: 'bg-brand-muted text-brand-foreground group-hover:bg-brand/20',
    cardHover: 'hover:border-brand/30 hover:bg-brand-muted/50',
  },
  historia: {
    key: 'historia',
    label: 'Historia clínica',
    // La historia se abre desde el paciente: se llega a la lista con la accion.
    to: '/pacientes?tab=pacientes',
    icon: FileText,
    accent: 'bg-brand-muted text-brand-foreground group-hover:bg-brand/20',
    cardHover: 'hover:border-brand/30 hover:bg-brand-muted/50',
  },
  agenda: {
    key: 'agenda',
    label: 'Nueva cita',
    to: '/agenda',
    icon: CalendarClock,
    accent: 'bg-brand-muted text-brand-foreground group-hover:bg-brand/20',
    cardHover: 'hover:border-brand/30 hover:bg-brand-muted/50',
  },
  inventario: {
    key: 'inventario',
    label: 'Inventario',
    to: '/inventario',
    icon: Boxes,
    accent: 'bg-brand-muted text-brand-foreground group-hover:bg-brand/20',
    cardHover: 'hover:border-brand/30 hover:bg-brand-muted/50',
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
