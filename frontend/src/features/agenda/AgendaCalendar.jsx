import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import { CalendarToolbar } from './CalendarToolbar'
import { TimeGridView } from './TimeGridView'
import { MonthView } from './MonthView'
import { CalendarLegend } from './CalendarLegend'
import { CitaDetailDialog } from './CitaDetailDialog'
import { MiniCalendar } from './MiniCalendar'

export default function AgendaCalendar({
  veterinarioId,
  estado,
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
