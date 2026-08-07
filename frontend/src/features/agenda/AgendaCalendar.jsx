import { useState } from 'react'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import { CalendarToolbar } from './CalendarToolbar'
import { TimeGridView } from './TimeGridView'
import { MonthView } from './MonthView'
import { CalendarLegend } from './CalendarLegend'
import { CitaDetailDialog } from './CitaDetailDialog'

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
  const { view, effectiveView, setView, isMobile } = useCalendarView()

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
    <div className="flex flex-col gap-0">
      <CalendarToolbar
        titulo={tituloRango}
        view={effectiveView}
        onViewChange={setView}
        onPrev={irAnterior}
        onNext={irSiguiente}
        onToday={irHoy}
        isMobile={isMobile}
        isFetching={isFetching && !isLoading}
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
