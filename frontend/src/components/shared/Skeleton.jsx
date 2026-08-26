import { cn } from '@/lib/utils'

/**
 * Bloque de carga. Reemplaza los `animate-pulse` ad-hoc repartidos por la app
 * (MonthView, TimeGridView, SalaEsperaPanel, DashboardPage) para que todos los
 * módulos usen la misma altura, radio y tono mientras llegan los datos.
 *
 * Props:
 *  - className: alto/ancho/radio del bloque (por defecto `h-4 w-full rounded-md`).
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className || 'h-4 w-full')}
    />
  )
}

/**
 * Marco de panel de gráfica en carga: conserva el radio, el borde y la altura
 * del panel real para que el layout no salte cuando llegan los datos.
 */
export function SkeletonPanel({ className = '', height = 'h-[300px]' }) {
  return (
    <div className={cn('overflow-hidden rounded-[28px] border border-border bg-card shadow-panel', className)}>
      <div className="border-b border-border px-5 py-4">
        <Skeleton className="h-3 w-40 rounded" />
        <Skeleton className="mt-3 h-3 w-64 rounded" />
      </div>
      <div className={cn('flex items-end gap-3 px-6 py-6', height)}>
        <Skeleton className="h-1/3 flex-1 rounded-lg" />
        <Skeleton className="h-2/3 flex-1 rounded-lg" />
        <Skeleton className="h-1/2 flex-1 rounded-lg" />
        <Skeleton className="h-5/6 flex-1 rounded-lg" />
        <Skeleton className="h-2/5 flex-1 rounded-lg" />
        <Skeleton className="h-3/4 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
