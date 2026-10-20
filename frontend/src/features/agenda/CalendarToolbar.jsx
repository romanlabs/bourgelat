import { DropdownMenu } from 'radix-ui'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, List, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { VIEW_OPTIONS, VIEW_PREFS } from './calendarConstants'

// En móvil las vistas multi-columna no caben
const VISTAS_SOLO_ESCRITORIO = ['semana', '4dias']

const iconBtn =
  'flex h-10 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const navBtn =
  'flex h-10 w-9 items-center justify-center rounded-lg transition hover:bg-accent active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const itemMenu =
  'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted'

// El título del rango (p. ej. «13 al 18 de octubre») lo muestra la página
// como encabezado; esta barra solo lleva los controles.
export function CalendarToolbar({
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
  onNuevaCita,
  sidebarOpen,
  onToggleSidebar,
  extra = null,
}) {
  const vistasDisponibles = VIEW_OPTIONS.filter(
    (opt) => !(isMobile && VISTAS_SOLO_ESCRITORIO.includes(opt.value))
  )
  const vistaActual = VIEW_OPTIONS.find((opt) => opt.value === view)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {onToggleSidebar && !isMobile ? (
        <SimpleTooltip label={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}>
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Ocultar mini calendario' : 'Mostrar mini calendario'}
            aria-pressed={sidebarOpen}
            className={cn(iconBtn, sidebarOpen && 'bg-accent text-primary')}
          >
            <CalendarDays className="h-[18px] w-[18px]" />
          </button>
        </SimpleTooltip>
      ) : null}

      <div className="flex h-10 items-center rounded-lg bg-secondary text-secondary-foreground">
        <SimpleTooltip label="Anterior">
          <button type="button" onClick={onPrev} className={navBtn} aria-label="Anterior">
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        </SimpleTooltip>
        <button type="button" onClick={onToday} className={cn(navBtn, 'w-auto px-2 text-sm font-semibold')}>
          Hoy
        </button>
        <SimpleTooltip label="Siguiente">
          <button type="button" onClick={onNext} className={navBtn} aria-label="Siguiente">
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </SimpleTooltip>
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Vista del calendario"
            className="flex h-10 items-center gap-1.5 rounded-lg bg-secondary pl-3 pr-2.5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
          >
            {vistaActual?.label ?? 'Vista'}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 w-64 rounded-xl bg-popover p-1.5 shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            {vistasDisponibles.map((opt) => (
              <DropdownMenu.Item
                key={opt.value}
                onSelect={() => onViewChange(opt.value)}
                className={cn(itemMenu, opt.value === view && 'bg-accent font-semibold')}
              >
                {opt.label}
                <span className="text-[13px] tabular-nums text-muted-foreground">{opt.shortcut}</span>
              </DropdownMenu.Item>
            ))}

            {onVistaTablaChange && (
              <DropdownMenu.Item onSelect={onVistaTablaChange} className={itemMenu}>
                <span className="flex items-center gap-3">
                  <List className="h-4 w-4 text-muted-foreground" />
                  Vista de lista
                </span>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

            {VIEW_PREFS.map((pref) => (
              <DropdownMenu.CheckboxItem
                key={pref.key}
                checked={!!prefs[pref.key]}
                onCheckedChange={() => onTogglePref?.(pref.key)}
                onSelect={(event) => event.preventDefault()}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
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

      {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Actualizando" />}

      {extra}

      {onNuevaCita ? (
        <button
          type="button"
          onClick={onNuevaCita}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </button>
      ) : null}
    </div>
  )
}
