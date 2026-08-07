import { ChevronDown, ChevronLeft, ChevronRight, Loader2, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_OPTIONS = [
  { value: 'dia', label: 'Día', shortcut: 'D' },
  { value: 'semana', label: 'Semana', shortcut: 'W' },
  { value: 'mes', label: 'Mes', shortcut: 'M' },
]

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          aria-label={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          title={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          className={cn(iconBtn, 'hidden lg:flex', sidebarOpen && 'bg-muted text-foreground')}
        >
          <PanelLeft className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          onClick={onToday}
          className="h-9 rounded-full border border-border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Hoy
        </button>

        <div className="flex items-center">
          <button type="button" onClick={onPrev} className={iconBtn} aria-label="Anterior">
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <button type="button" onClick={onNext} className={iconBtn} aria-label="Siguiente">
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>

        {isFetching && <Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground" />}
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
          className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-card pl-4 pr-8 text-xs font-semibold text-foreground shadow-sm outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {VIEW_OPTIONS.filter((opt) => !(isMobile && opt.value === 'semana')).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
