import { ChevronLeft, ChevronRight, Loader2, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_OPTIONS = [
  { value: 'dia', label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
]

export function CalendarToolbar({
  titulo,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  isMobile,
  isFetching,
  sidebarOpen,
  onToggleSidebar,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          aria-label={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          title={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          className={cn(
            'mr-1 hidden h-8 w-8 items-center justify-center border border-border transition hover:bg-muted hover:text-foreground lg:flex',
            sidebarOpen ? 'bg-muted text-foreground' : 'bg-card text-muted-foreground'
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="h-8 border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {isFetching && (
          <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <p className="text-sm font-semibold capitalize text-foreground" aria-live="polite">
        {titulo}
      </p>

      {/* Switch de vista */}
      <div className="flex" role="group" aria-label="Vista del calendario">
        {VIEW_OPTIONS.map((opt) => {
          const oculta = isMobile && opt.value === 'semana'
          if (oculta) return null
          const activa = view === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onViewChange(opt.value)}
              aria-pressed={activa}
              className={cn(
                'h-8 border border-border px-3 text-xs font-semibold transition -ml-px first:ml-0',
                activa
                  ? 'z-10 border-primary bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
