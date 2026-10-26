import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Tonos semánticos. Siguen el modo claro/oscuro vía los tokens de index.css,
 * así que no llevan clases dark:.
 *   neutral  → sin urgencia (programada, anulada, inactiva)
 *   success  → bien / terminado (pagada, aceptado, activa, disponible)
 *   warning  → requiere atención (en espera, pendiente, por cobrar, cantidad baja)
 *   danger   → problema (cancelada, rechazado, vencida, agotado)
 *   info     → en curso (en atención, enviado, prueba gratis)
 */
const TONOS = {
  neutral:  { colors: 'bg-secondary text-secondary-foreground', dot: 'bg-muted-foreground' },
  apagado:  { colors: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
  success:  { colors: 'bg-success-soft text-success', dot: 'bg-success' },
  warning:  { colors: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  danger:   { colors: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  info:     { colors: 'bg-info-soft text-info', dot: 'bg-info' },
}

/**
 * Mapa de variantes semánticas.
 * Cubre: citas · facturas · DIAN · suscripciones · inventario.
 *
 * Para añadir un nuevo estado: agregar entrada aquí con uno de los TONOS y
 * estará disponible en toda la aplicación automáticamente.
 */
const STATUS_MAP = {
  // ── Citas ─────────────────────────────────────────────────────
  programada:  { label: 'Programada',  ...TONOS.neutral },
  // Mismos tonos que la agenda y la jornada de Hoy.
  en_espera:   { label: 'En espera',   colors: 'bg-brand-muted text-brand-foreground', dot: 'bg-brand' },
  en_atencion: { label: 'En atención', colors: 'bg-primary text-primary-foreground', dot: 'bg-primary' },
  completada:  { label: 'Completada',  ...TONOS.success },
  cancelada:   { label: 'Cancelada',   ...TONOS.danger  },
  no_asistio:  { label: 'No asistió',  colors: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  atrasada:    { label: 'Atrasada',    ...TONOS.danger  },

  // ── Facturas ──────────────────────────────────────────────────
  pendiente:   { label: 'Pendiente',   ...TONOS.warning },
  emitida:     { label: 'Por cobrar',  ...TONOS.warning },
  parcial:     { label: 'Abono parcial', ...TONOS.warning },
  pagada:      { label: 'Pagada',      ...TONOS.success },
  anulada:     { label: 'Anulada',     ...TONOS.neutral },
  borrador:    { label: 'Borrador',    ...TONOS.apagado },

  // ── DIAN ──────────────────────────────────────────────────────
  enviado:     { label: 'Enviado',     ...TONOS.info    },
  aceptado:    { label: 'Aceptado',    ...TONOS.success },
  rechazado:   { label: 'Rechazado',   ...TONOS.danger  },
  error_dian:  { label: 'Rechazada por la DIAN', ...TONOS.danger },

  // ── Suscripciones ─────────────────────────────────────────────
  activa:      { label: 'Activa',      ...TONOS.success },
  vencida:     { label: 'Vencida',     ...TONOS.danger  },
  trial:       { label: 'Prueba gratis', ...TONOS.info  },
  inactiva:    { label: 'Inactiva',    ...TONOS.neutral },

  // ── Inventario ────────────────────────────────────────────────
  disponible:  { label: 'Disponible',  ...TONOS.success },
  bajo_stock:  { label: 'Cantidad baja', ...TONOS.warning },
  agotado:     { label: 'Agotado',     ...TONOS.danger  },
  vencido:     { label: 'Vencido',     ...TONOS.danger  },
}

const badgeVariants = cva(
  'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md text-[13px] font-semibold leading-5 whitespace-nowrap',
  {
    variants: {
      size: {
        sm: 'px-2 py-0.5',
        md: 'px-2.5 py-1',
      },
    },
    defaultVariants: { size: 'md' },
  }
)

/**
 * Badge semántico de estado para toda la aplicación.
 *
 * Reemplaza el patrón de strings manual en StatusPill:
 *   <StatusPill tone="border-primary/30 bg-primary/10 text-primary">En espera</StatusPill>
 *
 * Por:
 *   <StatusBadge variant="en_espera" />
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
      <span className={cn(badgeVariants({ size }), TONOS.neutral.colors, className)}>
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
