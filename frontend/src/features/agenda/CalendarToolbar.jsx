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
  extra,
  compact = false,
}) {
  // "compact" = renderizado dentro de la barra superior oscura de AdminShell
  // (ver useAdminHeaderSlot en AgendaCalendar.jsx); usa la paleta navy/cyan
  // del navbar en vez de los tokens claros de la tarjeta.
  const iconBtn = cn(
    'flex items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2',
    compact
      ? 'h-8 w-8 text-[#91e7e0]/70 hover:bg-[#081827] hover:text-[#91e7e0] focus-visible:ring-[#91e7e0]/40'
      : 'h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/40'
  )
  const pillBtn = cn(
    'rounded-full px-4 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2',
    compact
      ? 'h-8 border border-white/10 bg-[#081827] text-[#91e7e0]/70 hover:border-white/20 hover:text-[#91e7e0] focus-visible:ring-[#91e7e0]/40'
      : 'h-9 border border-border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground focus-visible:ring-primary/40'
  )

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', !compact && 'pb-4')}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-pressed={sidebarOpen}
          aria-label={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          title={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
          className={cn(
            iconBtn,
            'hidden lg:flex',
            sidebarOpen && (compact ? 'bg-[#081827] text-[#91e7e0]' : 'bg-muted text-foreground')
          )}
        >
          <PanelLeft className="h-[18px] w-[18px]" />
        </button>

        <button type="button" onClick={onToday} className={pillBtn}>
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

        {isFetching && (
          <Loader2
            className={cn('ml-1 h-4 w-4 animate-spin', compact ? 'text-[#91e7e0]/60' : 'text-muted-foreground')}
          />
        )}
      </div>

      <p
        className={cn(
          'text-sm font-semibold capitalize',
          compact ? 'hidden text-white md:block' : 'text-foreground'
        )}
        aria-live="polite"
      >
        {titulo}
      </p>

      <div className="flex items-center gap-3">
        {/* Selector de vista (dropdown, atajos D/W/M activos globalmente) */}
        <div className="relative">
          <select
            value={view}
            onChange={(e) => onViewChange(e.target.value)}
            aria-label="Vista del calendario"
            className={cn(
              'cursor-pointer appearance-none rounded-full pl-4 pr-8 text-xs font-semibold outline-none transition focus-visible:ring-2',
              compact
                ? 'h-8 border border-white/10 bg-[#081827] text-[#91e7e0] hover:border-white/20 focus-visible:ring-[#91e7e0]/40'
                : 'h-9 border border-border bg-card text-foreground shadow-sm hover:bg-muted focus-visible:ring-primary/40'
            )}
          >
            {VIEW_OPTIONS.filter((opt) => !(isMobile && opt.value === 'semana')).map((opt) => (
              <option key={opt.value} value={opt.value} className="text-foreground">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
              compact ? 'text-[#91e7e0]/60' : 'text-muted-foreground'
            )}
          />
        </div>

        {extra}
      </div>
    </div>
  )
}
