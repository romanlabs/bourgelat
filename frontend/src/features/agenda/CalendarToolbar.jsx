import { ChevronDown, ChevronLeft, ChevronRight, Loader2, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_OPTIONS = [
  { value: 'dia', label: 'Día', shortcut: 'D' },
  { value: 'semana', label: 'Semana', shortcut: 'W' },
  { value: 'mes', label: 'Mes', shortcut: 'M' },
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

      {/* Selector de vista (dropdown, atajos D/W/M activos globalmente) */}
      <div className="relative">
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value)}
          aria-label="Vista del calendario"
          className="h-8 appearance-none border border-border bg-card pl-3 pr-7 text-xs font-semibold text-foreground outline-none transition hover:bg-muted focus:border-primary"
        >
          {VIEW_OPTIONS.filter((opt) => !(isMobile && opt.value === 'semana')).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
