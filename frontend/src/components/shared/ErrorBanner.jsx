import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Banner de error inline con botón reintentar.
 * @param {{ message: string, onRetry?: () => void, variant?: 'red' | 'amber' }} props
 */
export function ErrorBanner({ message, onRetry, variant = 'red' }) {
  const styles = {
    red:   'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  }
  const btnStyles = {
    red:   'text-red-700 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100',
    amber: 'text-amber-800 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-100',
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
