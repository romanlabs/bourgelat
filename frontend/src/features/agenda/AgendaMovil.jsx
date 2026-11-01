import { useEffect } from 'react'
import { format, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fechaLocal, hoyLocal } from '@/lib/fecha'
import { useAgendaCalendar } from './useAgendaCalendar'
import { useCalendarView } from './useCalendarView'
import {
  buildStateTone,
  buildTipoTone,
  parseMinutes,
  STATUS_OPTIONS,
  TIPO_SHORT,
} from './calendarConstants'

const ESTADO_LABEL = Object.fromEntries(STATUS_OPTIONS.map((opt) => [opt.value, opt.label]))
const ESTADOS_APAGADOS = ['completada', 'cancelada', 'no_asistio']

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

function formatDuracion(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return ''
  const minutos = parseMinutes(horaFin) - parseMinutes(horaInicio)
  if (!(minutos > 0)) return ''
  if (minutos < 60) return `${minutos} min`
  const resto = minutos % 60
  return `${Math.floor(minutos / 60)} h${resto ? ` ${resto} min` : ''}`
}

function TarjetaCita({ cita, esProxima, onClick }) {
  const tipo = TIPO_SHORT[cita.tipoCita] || cita.tipoCita
  const duracion = formatDuracion(cita.horaInicio, cita.horaFin)
  const detalle = [cita.motivo || tipo, duracion].filter(Boolean).join(' · ')
  const mostrarEstado = cita.estado && cita.estado !== 'programada'

  return (
    <button
      type="button"
      onClick={() => onClick(cita)}
      className={cn(
        'grid min-h-[64px] w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-card p-3.5 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        esProxima && 'bg-accent',
        cita.estado === 'en_atencion' && 'ring-2 ring-inset ring-primary',
        ESTADOS_APAGADOS.includes(cita.estado) && 'opacity-60'
      )}
    >
      <span className="text-[15px] font-semibold tabular-nums text-muted-foreground">
        {cita.horaInicio?.slice(0, 5)}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            'truncate text-base font-semibold text-foreground',
            ['cancelada', 'no_asistio'].includes(cita.estado) && 'line-through'
          )}
        >
          {cita.mascota?.nombre || 'Paciente'}
        </span>
        <span className="truncate text-[13px] tabular-nums text-muted-foreground">{detalle}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span
          className={cn(
            'whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold',
            buildTipoTone(cita.tipoCita)
          )}
        >
          {tipo}
        </span>
        {mostrarEstado ? (
          <span
            className={cn(
              'whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold',
              buildStateTone(cita.estado)
            )}
          >
            {ESTADO_LABEL[cita.estado] || cita.estado}
          </span>
        ) : null}
      </span>
    </button>
  )
}

/**
 * Agenda en el celular: la semana como botones de día y las citas del día
 * elegido en tarjetas. Usa la misma consulta del calendario de escritorio
 * (vista semana); el día elegido es la fecha base del calendario.
 */
export function AgendaMovil({
  veterinarioId,
  estado,
  enabled = true,
  puedeProgramar = false,
  onCitaClick,
  onNuevaCita,
  onResumenChange,
}) {
  const { prefs } = useCalendarView()
  const {
    fechaBase,
    diasVisibles,
    tituloRango,
    irAnterior,
    irSiguiente,
    irHoy,
    irADia,
    getCitasDelDia,
    getBloqueoDelDia,
    proximaCitaId,
    isLoading,
  } = useAgendaCalendar({
    veterinarioId,
    estado,
    enabled,
    view: 'semana',
    // En el celular la semana siempre trae sus 7 días: el día elegido no puede quedar oculto.
    prefs: { ...prefs, mostrarFinesDeSemana: true },
  })

  const totalSemana = diasVisibles.reduce((suma, dia) => suma + getCitasDelDia(dia).length, 0)
  useEffect(() => {
    onResumenChange?.({ titulo: tituloRango, total: totalSemana, cargando: isLoading })
  }, [onResumenChange, tituloRango, totalSemana, isLoading])

  const citasDelDia = getCitasDelDia(fechaBase)
  const bloqueo = getBloqueoDelDia(fechaBase)
  const esHoy = isToday(fechaBase)
  const semanaActual = diasVisibles.some((dia) => isToday(dia))
  const tituloDia = capitalizar(format(fechaBase, "EEEE d 'de' MMMM", { locale: es }))

  const nuevaCita = () => {
    const fecha = fechaLocal(fechaBase)
    // Un día pasado no admite citas nuevas: el formulario abre en hoy.
    onNuevaCita?.(fecha < hoyLocal() ? hoyLocal() : fecha)
  }

  return (
    // Espacio al final para el botón fijo y la barra inferior (más la zona segura).
    <div className="flex flex-col gap-3 pb-[calc(9.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={irAnterior}
          aria-label="Semana anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={irHoy}
          disabled={esHoy}
          className="h-11 flex-1 rounded-xl bg-card px-3 text-sm font-semibold text-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground"
        >
          {semanaActual ? 'Hoy' : 'Volver a hoy'}
        </button>
        <button
          type="button"
          onClick={irSiguiente}
          aria-label="Semana siguiente"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div role="group" aria-label="Días de la semana" className="grid grid-cols-7 gap-1.5">
        {diasVisibles.map((dia) => {
          const elegido = isSameDay(dia, fechaBase)
          const hoy = isToday(dia)
          const total = getCitasDelDia(dia).length
          const corto = capitalizar(format(dia, 'EEE', { locale: es }).replace('.', ''))
          const etiqueta = `${capitalizar(format(dia, "EEEE d 'de' MMMM", { locale: es }))}${hoy ? ', hoy' : ''}, ${total} ${total === 1 ? 'cita' : 'citas'}`
          return (
            <button
              key={dia.toISOString()}
              type="button"
              onClick={() => irADia(dia)}
              aria-pressed={elegido}
              aria-label={etiqueta}
              className={cn(
                'flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-px rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                elegido ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
              )}
            >
              <span className={cn('text-xs font-medium', !elegido && 'text-muted-foreground')}>{corto}</span>
              <span className="text-xl font-semibold leading-tight tracking-[-0.02em] tabular-nums">
                {format(dia, 'd')}
              </span>
              <span
                aria-hidden="true"
                className={cn('mt-0.5 h-1.5 w-1.5 rounded-full', hoy ? 'bg-brand' : 'bg-transparent')}
              />
            </button>
          )
        })}
      </div>

      <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
        <h2 className="min-w-0 truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
          {tituloDia}
          {esHoy ? <span className="font-normal text-muted-foreground"> · hoy</span> : null}
        </h2>
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          {isLoading ? 'Cargando…' : `${citasDelDia.length} ${citasDelDia.length === 1 ? 'cita' : 'citas'}`}
        </span>
      </div>

      {bloqueo ? (
        <div className="rounded-2xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Agenda bloqueada este día{bloqueo.motivo ? `: ${bloqueo.motivo}` : ''}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="h-[72px] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : citasDelDia.length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-9 text-center text-[15px] text-muted-foreground">
          No hay citas este día
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {citasDelDia.map((cita) => (
            <li key={cita.id}>
              <TarjetaCita cita={cita} esProxima={cita.id === proximaCitaId} onClick={onCitaClick} />
            </li>
          ))}
        </ul>
      )}

      {puedeProgramar && onNuevaCita ? (
        <button
          type="button"
          onClick={nuevaCita}
          className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl h-[52px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-dropdown transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        >
          <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
          Nueva cita
        </button>
      ) : null}
    </div>
  )
}
