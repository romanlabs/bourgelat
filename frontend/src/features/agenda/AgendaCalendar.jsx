import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { CalendarClock, Plus, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAdminHeaderSlot } from '@/components/layout/HeaderSlotContext'
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
  onCreateUrgencia,
  isUpdating = false,
  isRescheduling = false,
  toolbarExtra,
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

  const toolbarNode = (
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
      extra={toolbarExtra}
      compact={!isMobile}
    />
  )

  // En pantallas >= 640px el toolbar vive en la barra superior de AdminShell
  // (el mismo espacio que aprovecha Google Calendar); en movil se queda inline.
  const setHeaderCenter = useAdminHeaderSlot()
  useEffect(() => {
    if (!setHeaderCenter) return
    setHeaderCenter(isMobile ? null : toolbarNode)
    return () => setHeaderCenter(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })

  const crearMenu = (puedeProgramar || onCreateUrgencia) && (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Crear"
          className={cn(
            'flex shrink-0 items-center border border-border bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(8,25,39,0.15)] transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            sidebarOpen
              ? 'h-11 w-full gap-3 rounded-full pl-3 pr-4 text-sm'
              : 'h-14 w-14 justify-center rounded-2xl'
          )}
        >
          {sidebarOpen ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Plus className="h-4 w-4" />
            </span>
          ) : (
            <Plus className="h-6 w-6 text-foreground" />
          )}
          {sidebarOpen && 'Crear'}
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
          {onCreateUrgencia && (
            <DropdownMenu.Item
              onSelect={onCreateUrgencia}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-700 outline-none transition hover:bg-red-50 focus:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <Zap className="h-4 w-4" />
              Atender urgencia
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )

  return (
    <div className="relative flex">
      {/* Boton "Crear" flotando sobre la grilla cuando el panel esta cerrado
          (como Google: no reserva una columna vacia permanente) */}
      {!sidebarOpen && crearMenu && (
        <div className="absolute left-0 top-0 z-40">{crearMenu}</div>
      )}

      {/* Columna lateral: solo ocupa espacio en el flujo cuando esta abierta */}
      {sidebarOpen && (
        <div className="mr-4 flex w-[190px] shrink-0 flex-col">
          {crearMenu && <div className="mb-4">{crearMenu}</div>}

          <aside className="border-r border-border pr-4">
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
