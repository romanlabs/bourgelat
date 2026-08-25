import { DropdownMenu } from 'radix-ui'
import { Check, ChevronDown, ChevronLeft, ChevronRight, List, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { VIEW_OPTIONS, VIEW_PREFS } from './calendarConstants'

// En móvil las vistas multi-columna no caben
const VISTAS_SOLO_ESCRITORIO = ['semana', '4dias']

export function CalendarToolbar({
  titulo,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  isMobile,
  isFetching,
  prefs = {},
  onTogglePref,
  onVistaTablaChange,
  compact = false,
}) {
  // "compact" = renderizado dentro de la barra superior de AdminShell
  // (ver useAdminHeaderSlot en AgendaCalendar.jsx); AdminShell usa headerVariant="light"
  // en Agenda, asi que el toolbar compacto tambien usa la paleta clara tipo Google.
  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
  const pillBtn =
    'h-10 rounded-full border border-border bg-card px-6 text-sm font-normal text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

  const vistasDisponibles = VIEW_OPTIONS.filter(
    (opt) => !(isMobile && VISTAS_SOLO_ESCRITORIO.includes(opt.value))
  )
  const vistaActual = VIEW_OPTIONS.find((opt) => opt.value === view)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', !compact && 'pb-4')}>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onToday} className={pillBtn}>
          Hoy
        </button>

        <div className="flex items-center">
          <SimpleTooltip label="Anterior">
            <button type="button" onClick={onPrev} className={iconBtn} aria-label="Anterior">
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
          </SimpleTooltip>
          <SimpleTooltip label="Siguiente">
            <button type="button" onClick={onNext} className={iconBtn} aria-label="Siguiente">
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </SimpleTooltip>
        </div>

        {isFetching && <Loader2 className="ml-1 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <p
        className={cn(
          'text-sm font-semibold capitalize',
          compact ? 'hidden text-foreground md:block' : 'text-foreground'
        )}
        aria-live="polite"
      >
        {titulo}
      </p>

      <div className="flex items-center gap-3">
        {/* Selector de vista tipo Google: vistas con atajo + preferencias marcables */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Vista del calendario"
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pl-5 pr-4 text-sm font-normal text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-muted"
            >
              {vistaActual?.label ?? 'Vista'}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              className="z-50 w-64 rounded-lg border border-border bg-card py-2 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            >
              {vistasDisponibles.map((opt) => (
                <DropdownMenu.Item
                  key={opt.value}
                  onSelect={() => onViewChange(opt.value)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                    opt.value === view && 'font-medium'
                  )}
                >
                  {opt.label}
                  <span className="text-xs text-muted-foreground">{opt.shortcut}</span>
                </DropdownMenu.Item>
              ))}

              {onVistaTablaChange && (
                <>
                  <DropdownMenu.Separator className="my-2 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={onVistaTablaChange}
                    className="flex cursor-pointer items-center justify-between px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
                  >
                    <span className="flex items-center gap-3">
                      <List className="h-4 w-4 text-muted-foreground" />
                      Vista de lista
                    </span>
                  </DropdownMenu.Item>
                </>
              )}

              <DropdownMenu.Separator className="my-2 h-px bg-border" />

              {VIEW_PREFS.map((pref) => (
                <DropdownMenu.CheckboxItem
                  key={pref.key}
                  checked={!!prefs[pref.key]}
                  onCheckedChange={() => onTogglePref?.(pref.key)}
                  onSelect={(event) => event.preventDefault()}
                  className="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <DropdownMenu.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  {pref.label}
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  )
}
