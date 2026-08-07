import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { STATUS_OPTIONS } from './calendarConstants'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import { CalendarToolbar } from './CalendarToolbar'
import { TimeGridView } from './TimeGridView'
import { MonthView } from './MonthView'
import { CalendarLegend } from './CalendarLegend'
import { CitaDetailDialog } from './CitaDetailDialog'
import { MiniCalendar } from './MiniCalendar'

const SHORTCUT_TO_VIEW = { d: 'dia', w: 'semana', m: 'mes' }

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
  isUpdating = false,
  isRescheduling = false,
}) {
  const { view, effectiveView, setView, isMobile, sidebarOpen, toggleSidebar } = useCalendarView()

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
  } = useAgendaCalendar({ veterinarioId, estado, enabled, view: effectiveView })

  const [selectedCita, setSelectedCita] = useState(null)

  const verDia = (date) => {
    irADia(date)
    setView('dia')
  }

  return (
    <div className="flex">
      {/* Lateral: mini calendario de navegacion rapida (estilo Google Calendar) —
          oculto por defecto, se abre/cierra con el boton de la toolbar */}
      <aside
        aria-hidden={!sidebarOpen}
        className={cn(
          'shrink-0 overflow-hidden transition-[width,opacity,margin] duration-200 ease-out',
          sidebarOpen ? 'w-[190px] opacity-100 mr-4' : 'w-0 opacity-0 mr-0'
        )}
      >
        <div className="w-[190px] border-r border-border pr-4">
          <MiniCalendar fechaBase={fechaBase} onSelectDay={irADia} />

          {(onEstadoChange || onVeterinarioChange) && (
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Filtros
              </p>
              {onEstadoChange && (
                <select
                  value={estado}
                  onChange={(e) => onEstadoChange(e.target.value)}
                  className="h-8 w-full border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-primary"
                >
                  <option value="todos">Todos los estados</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {onVeterinarioChange && (
                <select
                  value={veterinarioId}
                  onChange={(e) => onVeterinarioChange(e.target.value)}
                  className="h-8 w-full border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-primary"
                >
                  <option value="todos">Todos los profesionales</option>
                  {veterinarios.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <CalendarToolbar
          titulo={tituloRango}
          view={effectiveView}
          onViewChange={setView}
          onPrev={irAnterior}
          onNext={irSiguiente}
          onToday={irHoy}
          isMobile={isMobile}
          isFetching={isFetching && !isLoading}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

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
