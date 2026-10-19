import { useEffect, useMemo, useState } from 'react'
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
  onResumenChange,
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

  // La página muestra el rango y cuántas citas trae como su encabezado.
  const totalCitas = diasVisibles.reduce((suma, dia) => suma + getCitasDelDia(dia).length, 0)
  useEffect(() => {
    onResumenChange?.({ titulo: tituloRango, total: totalCitas, cargando: isLoading })
  }, [onResumenChange, tituloRango, totalCitas, isLoading])

  // La barra sube a la fila del título de la página (AgendaPage la pone ahí).
  // Memoizada: un nodo nuevo en cada render haría que el efecto de abajo
  // actualice a la página sin parar. Las funciones de navegación no están en
  // las dependencias porque cierran sobre el mismo estado que ya se vigila.
  const toolbarNode = useMemo(
    () => (
      <CalendarToolbar
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
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        extra={<CalendarLegend />}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveView, isMobile, isFetching, isLoading, prefs, sidebarOpen, onVistaTablaChange, fechaBase]
  )

  useEffect(() => {
    if (!onToolbarChange) return
    onToolbarChange(toolbarNode)
    return () => onToolbarChange(null)
  }, [toolbarNode, onToolbarChange])

  return (
    <div className="flex flex-col gap-4">
      {onToolbarChange ? null : toolbarNode}

    <div className="relative flex">
      {/* Columna lateral: solo ocupa espacio en el flujo cuando esta abierta */}
      {sidebarOpen && (
        <div className="mr-4 flex w-[190px] shrink-0 flex-col">
          <aside className="rounded-2xl bg-card p-3">
          <MiniCalendar fechaBase={fechaBase} onSelectDay={irADia} />

          {(onEstadoChange || onVeterinarioChange) && (
            <div className="mt-4 flex flex-col gap-2 pt-1">
              <p className="text-[13px] font-semibold text-muted-foreground">
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

      </div>
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
