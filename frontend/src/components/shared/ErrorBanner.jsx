import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Banner de error inline con botón reintentar.
 * `red` = error (danger), `amber` = aviso (warning). Los nombres se conservan
 * por compatibilidad; los colores salen de los tokens del tema.
 * @param {{ message: string, onRetry?: () => void, variant?: 'red' | 'amber' }} props
 */
export function ErrorBanner({ message, onRetry, variant = 'red' }) {
  const styles = {
    red:   'bg-danger-soft text-danger',
    amber: 'bg-warning-soft text-warning',
  }
  const btnStyles = {
    red:   'text-danger',
    amber: 'text-warning',
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm leading-relaxed sm:px-5', styles[variant])}>
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-card px-3.5 font-semibold transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', btnStyles[variant])}
        >
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </button>
      ) : null}
    </div>
  )
}
