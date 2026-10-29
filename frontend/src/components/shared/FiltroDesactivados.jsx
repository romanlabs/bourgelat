import { cn } from '@/lib/utils'

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Alterna la lista entre lo activo y lo desactivado (para reactivarlo).
export function FiltroDesactivados({ checked, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'h-11 shrink-0 rounded-lg px-3.5 text-sm font-semibold transition active:translate-y-px',
        FOCO,
        checked ? 'bg-warning-soft text-warning' : 'bg-secondary text-secondary-foreground hover:brightness-95'
      )}
    >
      {checked ? 'Viendo desactivados' : 'Ver desactivados'}
    </button>
  )
}
