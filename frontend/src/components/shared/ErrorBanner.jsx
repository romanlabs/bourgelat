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
    red:   'border-danger/30 bg-danger-soft text-danger',
    amber: 'border-warning/30 bg-warning-soft text-warning',
  }
  const btnStyles = {
    red:   'text-danger',
    amber: 'text-warning',
  }

  return (
    <div className={cn('flex items-start justify-between gap-4 border px-4 py-4 text-sm leading-7', styles[variant])}>
      <span>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn('inline-flex shrink-0 items-center gap-1.5 font-semibold underline-offset-2 hover:underline', btnStyles[variant])}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      ) : null}
    </div>
  )
}
