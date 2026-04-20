import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Mapa de variantes semánticas.
 * Cubre: citas · facturas · DIAN · suscripciones · inventario.
 *
 * Para añadir un nuevo estado: agregar entrada aquí y estará disponible
 * en toda la aplicación automáticamente.
 */
const STATUS_MAP = {
  // ── Citas ─────────────────────────────────────────────────────
  programada:  { label: 'Programada',  colors: 'bg-warm-100    border-warm-300    text-warm-700',    dot: 'bg-warm-400'     },
  confirmada:  { label: 'Confirmada',  colors: 'bg-clinical-100 border-clinical-300 text-clinical-700', dot: 'bg-clinical-500' },
  en_curso:    { label: 'En curso',    colors: 'bg-blue-100    border-blue-300    text-blue-700',    dot: 'bg-blue-500'     },
  completada:  { label: 'Completada',  colors: 'bg-warm-100    border-warm-200    text-warm-600',    dot: 'bg-warm-400'     },
  cancelada:   { label: 'Cancelada',   colors: 'bg-red-50      border-red-200     text-red-600',     dot: 'bg-red-400'      },
  no_asistio:  { label: 'No asistió',  colors: 'bg-orange-50   border-orange-200  text-orange-600',  dot: 'bg-orange-400'   },

  // ── Facturas ──────────────────────────────────────────────────
  pendiente:   { label: 'Pendiente',   colors: 'bg-amber-50    border-amber-200   text-amber-700',   dot: 'bg-amber-400'    },
  emitida:     { label: 'Emitida',     colors: 'bg-blue-50     border-blue-200    text-blue-700',    dot: 'bg-blue-400'     },
  pagada:      { label: 'Pagada',      colors: 'bg-clinical-50 border-clinical-200 text-clinical-700', dot: 'bg-clinical-500' },
  anulada:     { label: 'Anulada',     colors: 'bg-warm-100    border-warm-200    text-warm-500',    dot: 'bg-warm-300'     },
  borrador:    { label: 'Borrador',    colors: 'bg-warm-50     border-warm-200    text-warm-600',    dot: 'bg-warm-300'     },

  // ── DIAN ──────────────────────────────────────────────────────
  enviado:     { label: 'Enviado',     colors: 'bg-blue-50     border-blue-200    text-blue-700',    dot: 'bg-blue-400'     },
  aceptado:    { label: 'Aceptado',    colors: 'bg-clinical-50 border-clinical-200 text-clinical-700', dot: 'bg-clinical-500' },
  rechazado:   { label: 'Rechazado',   colors: 'bg-red-50      border-red-200     text-red-600',     dot: 'bg-red-400'      },
  error_dian:  { label: 'Error DIAN',  colors: 'bg-red-50      border-red-200     text-red-600',     dot: 'bg-red-400'      },

  // ── Suscripciones ─────────────────────────────────────────────
  activa:      { label: 'Activa',      colors: 'bg-clinical-50 border-clinical-200 text-clinical-700', dot: 'bg-clinical-500' },
  vencida:     { label: 'Vencida',     colors: 'bg-red-50      border-red-200     text-red-600',     dot: 'bg-red-400'      },
  trial:       { label: 'Trial',       colors: 'bg-purple-50   border-purple-200  text-purple-700',  dot: 'bg-purple-400'   },
  inactiva:    { label: 'Inactiva',    colors: 'bg-warm-100    border-warm-200    text-warm-500',    dot: 'bg-warm-300'     },

  // ── Inventario ────────────────────────────────────────────────
  disponible:  { label: 'Disponible',  colors: 'bg-clinical-50 border-clinical-200 text-clinical-700', dot: 'bg-clinical-500' },
  bajo_stock:  { label: 'Bajo stock',  colors: 'bg-amber-50    border-amber-200   text-amber-700',   dot: 'bg-amber-400'    },
  agotado:     { label: 'Agotado',     colors: 'bg-red-50      border-red-200     text-red-600',     dot: 'bg-red-400'      },
  vencido:     { label: 'Vencido',     colors: 'bg-orange-50   border-orange-200  text-orange-600',  dot: 'bg-orange-400'   },
}

const badgeVariants = cva(
  'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.12em] whitespace-nowrap',
  {
    variants: {
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-[11px]',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

/**
 * Badge semántico de estado para toda la aplicación.
 *
 * Reemplaza el patrón de strings manual en StatusPill:
 *   <StatusPill tone="border-cyan-200 bg-cyan-50 text-cyan-700">Confirmada</StatusPill>
 *
 * Por:
 *   <StatusBadge variant="confirmada" />
 *
 * Props:
 *   variant  — clave del STATUS_MAP (requerido)
 *   label    — sobreescribe el texto del mapa (opcional)
 *   showDot  — muestra punto de color antes del texto (default: false)
 *   size     — 'sm' | 'md' (default: 'md')
 *   className
 */
export function StatusBadge({ variant, label, showDot = false, size = 'md', className }) {
  const config = STATUS_MAP[variant]

  if (!config) {
    return (
      <span className={cn(badgeVariants({ size }), 'border-warm-200 bg-warm-100 text-warm-600', className)}>
        {label ?? variant}
      </span>
    )
  }

  return (
    <span className={cn(badgeVariants({ size }), config.colors, className)}>
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} aria-hidden />
      )}
      {label ?? config.label}
    </span>
  )
}

/** Exporta el mapa por si algún componente necesita iterar los estados disponibles */
export { STATUS_MAP }
