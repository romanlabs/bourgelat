import { useEffect, useMemo, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { STATUS_OPTIONS, VIEW_OPTIONS } from './calendarConstants'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import { CalendarToolbar } from './CalendarToolbar'
import { TimeGridView } from './TimeGridView'
import { MonthView } from './MonthView'
import { YearView } from './YearView'
import { AgendaListView } from './AgendaListView'
import { CalendarLegend } from './CalendarLegend'
import { CitaDetailDialog } from './CitaDetailDialog'
import { MiniCalendar } from './MiniCalendar'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { Select } from '@/components/ui/select'

const SHORTCUT_TO_VIEW = Object.fromEntries(
  VIEW_OPTIONS.map((opt) => [opt.shortcut.toLowerCase(), opt.value])
)

export default function AgendaCalendar({
  veterinarioId,
  estado,
  onEstadoChange,
  onVeterinarioChange,
  veterinarios = [],
  enabled = true,
  puedeProgramar = false,
  puedeGestionarEstado = false,
  puedeReprogramar = false,
  onSlotClick,
  onUpdateStatus,
  onReschedule,
  onVistaTablaChange,
  onToolbarChange,
  isUpdating = false,
  isRescheduling = false,
}) {
  const { effectiveView, setView, isMobile, sidebarOpen, toggleSidebar, prefs, togglePref } =
    useCalendarView()

  // Atajos de teclado tipo Google Calendar: D/W/M cambian de vista
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return
      const next = SHORTCUT_TO_VIEW[e.key.toLowerCase()]
      if (next) setView(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])

  const {
    fechaBase,
    diasVisibles,
    tituloRango,
    irAnterior,
    irSiguiente,
    irHoy,
    irADia,
    getCitasDelDia,
    proximaCitaId,
    isLoading,
    isFetching,
    slots,
    gridInicio,
    gridFin,
    esHabil,
    getBloqueoDelDia,
  } = useAgendaCalendar({ veterinarioId, estado, enabled, view: effectiveView, prefs })

  const [selectedCita, setSelectedCita] = useState(null)

  const verDia = (date) => {
    irADia(date)
    setView('dia')
  }

  // Memoizado a proposito: sin esto, toolbarNode seria un objeto nuevo en
  // cada render y el efecto de abajo llamaria a onToolbarChange sin parar,
  // lo que hace que AgendaPage vuelva a renderizar, lo que vuelve a crear un
  // toolbarNode nuevo — bucle infinito ("Maximum update depth exceeded").
  // irAnterior/irSiguiente/irHoy/setView/togglePref no estan en las deps:
  // no estan memoizados en los hooks de origen, pero cierran sobre el mismo
  // estado que ya vigilan tituloRango/effectiveView/prefs, asi que usarlos
  // "un render viejos" es equivalente mientras esas deps no cambien.
  const toolbarNode = useMemo(
    () => (
      <CalendarToolbar
        titulo={tituloRango}
        view={effectiveView}
        onViewChange={setView}
        onPrev={irAnterior}
        onNext={irSiguiente}
        onToday={irHoy}
        isMobile={isMobile}
        isFetching={isFetching && !isLoading}
        prefs={prefs}
        onTogglePref={togglePref}
        onVistaTablaChange={onVistaTablaChange}
        compact={!isMobile}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tituloRango, effectiveView, isMobile, isFetching, isLoading, prefs, onVistaTablaChange]
  )

  // En pantallas >= 640px el toolbar lo compone AgendaPage junto con las
  // pestañas en la barra superior de AdminShell (el mismo espacio que
  // aprovecha Google Calendar); en movil se queda inline (ver mas abajo).
  useEffect(() => {
    if (!onToolbarChange) return
    onToolbarChange(isMobile ? null : toolbarNode)
    return () => onToolbarChange(null)
  }, [toolbarNode, isMobile, onToolbarChange])

  const crearMenu = puedeProgramar && (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Crear"
          className={cn(
            'flex shrink-0 items-center rounded-2xl border border-border bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(8,25,39,0.15),0_1px_3px_1px_rgba(8,25,39,0.1)] transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            sidebarOpen ? 'h-14 min-w-0 flex-1 gap-3 py-0 pl-3 pr-2 text-sm' : 'h-14 w-14 justify-center'
          )}
        >
          <Plus className="h-6 w-6 shrink-0 text-primary" />
          {sidebarOpen && (
            <>
              <span className="flex-1 text-left">Crear</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 w-56 rounded-lg border border-border bg-card p-1.5 shadow-lg"
        >
          {puedeProgramar && (
            <DropdownMenu.Item
              onSelect={() => onSlotClick?.(format(fechaBase, 'yyyy-MM-dd'), '09:00')}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
            >
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Nueva cita
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )

  return (
    <div className="relative flex">
      {/* Panel cerrado: "Crear" y el boton de reabrir se superponen sobre el
          gutter de horas de la grilla (espacio libre, igual que hace Google),
          en vez de reservar una columna aparte que empuje la grilla */}
      {!sidebarOpen && (
        <div className="absolute left-0 top-0 z-40 flex w-16 flex-col items-center gap-1.5">
          {crearMenu}
          <SimpleTooltip label="Mostrar mini calendario">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Mostrar mini calendario"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </SimpleTooltip>
        </div>
      )}

      {/* Columna lateral: solo ocupa espacio en el flujo cuando esta abierta */}
      {sidebarOpen && (
        <div className="mr-4 flex w-[190px] shrink-0 flex-col">
          <div className="mb-4 flex items-center gap-1.5">
            {crearMenu}
            <SimpleTooltip label="Ocultar mini calendario">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Ocultar mini calendario"
                className="flex h-14 w-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </SimpleTooltip>
          </div>

          <aside className="border-r border-border pr-4">
          <MiniCalendar fechaBase={fechaBase} onSelectDay={irADia} />

          {(onEstadoChange || onVeterinarioChange) && (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Filtros
              </p>
              {onEstadoChange && (
                <Select
                  variant="field"
                  aria-label="Filtrar por estado"
                  value={estado}
                  onValueChange={onEstadoChange}
                  options={[
                    { value: 'todos', label: 'Todos los estados' },
                    ...STATUS_OPTIONS,
                  ]}
                />
              )}
              {onVeterinarioChange && (
                <Select
                  variant="field"
                  aria-label="Filtrar por profesional"
                  value={veterinarioId}
                  onValueChange={onVeterinarioChange}
                  options={[
                    { value: 'todos', label: 'Todos los profesionales' },
                    ...veterinarios.map((item) => ({ value: item.id, label: item.nombre })),
                  ]}
                />
              )}
            </div>
          )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0">
        {isMobile && toolbarNode}

        {effectiveView === 'mes' ? (
          <MonthView
            days={diasVisibles}
            fechaBase={fechaBase}
            getCitasDelDia={getCitasDelDia}
            proximaCitaId={proximaCitaId}
            puedeProgramar={puedeProgramar}
            onSlotClick={onSlotClick}
            onCitaClick={setSelectedCita}
            onVerDia={verDia}
            isLoading={isLoading}
            getBloqueoDelDia={getBloqueoDelDia}
          />
        ) : effectiveView === 'anio' ? (
          <YearView
            fechaBase={fechaBase}
            getCitasDelDia={getCitasDelDia}
            onVerDia={verDia}
            isLoading={isLoading}
            insetLeft={!sidebarOpen}
          />
        ) : effectiveView === 'agenda' ? (
          <AgendaListView
            days={diasVisibles}
            getCitasDelDia={getCitasDelDia}
            proximaCitaId={proximaCitaId}
            onCitaClick={setSelectedCita}
            isLoading={isLoading}
            insetLeft={!sidebarOpen}
          />
        ) : (
          <TimeGridView
            days={diasVisibles}
            slots={slots}
            getCitasDelDia={getCitasDelDia}
            proximaCitaId={proximaCitaId}
            puedeProgramar={puedeProgramar}
            onSlotClick={onSlotClick}
            onCitaClick={setSelectedCita}
            isLoading={isLoading}
            showTimezoneLabel={sidebarOpen}
            gridInicio={gridInicio}
            gridFin={gridFin}
            esHabil={esHabil}
            getBloqueoDelDia={getBloqueoDelDia}
          />
        )}

        <CalendarLegend />
      </div>

      <CitaDetailDialog
        cita={selectedCita}
        open={!!selectedCita}
        onClose={() => setSelectedCita(null)}
        puedeGestionarEstado={puedeGestionarEstado}
        puedeReprogramar={puedeReprogramar}
        onUpdateStatus={(citaId, payload, cita) => {
          onUpdateStatus(citaId, payload, cita)
          setSelectedCita(null)
        }}
        onReschedule={(citaId, payload) => {
          onReschedule(citaId, payload)
          setSelectedCita(null)
        }}
        isUpdating={isUpdating}
        isRescheduling={isRescheduling}
      />
    </div>
  )
}
