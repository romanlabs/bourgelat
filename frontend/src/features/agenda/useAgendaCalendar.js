import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  isWeekend,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { agendaApi } from './agendaApi'
import {
  generarSlots,
  parseMinutes,
  rangoVisibleDeHorario,
  esSlotHabil,
  bloqueoDeDiaCompleto,
} from './calendarConstants'

// Re-exports para compatibilidad con imports existentes
export {
  HORA_INICIO,
  HORA_FIN,
  SLOT_MINUTOS,
  generarSlots,
  parseMinutes,
  timeToTop,
  calcCitaHeight,
} from './calendarConstants'

const WEEK_OPTS = { weekStartsOn: 0 } // domingo primero, como Google Calendar
const DIAS_AGENDA = 30 // ventana de la vista "Agenda" (lista), como Google

function calcularRango(fechaBase, view) {
  if (view === 'dia') {
    return { desde: fechaBase, hasta: fechaBase }
  }
  if (view === '4dias') {
    return { desde: fechaBase, hasta: addDays(fechaBase, 3) }
  }
  if (view === 'mes') {
    return {
      desde: startOfWeek(startOfMonth(fechaBase), WEEK_OPTS),
      hasta: endOfWeek(endOfMonth(fechaBase), WEEK_OPTS),
    }
  }
  if (view === 'anio') {
    return { desde: startOfYear(fechaBase), hasta: endOfYear(fechaBase) }
  }
  if (view === 'agenda') {
    return { desde: fechaBase, hasta: addDays(fechaBase, DIAS_AGENDA - 1) }
  }
  const inicio = startOfWeek(fechaBase, WEEK_OPTS)
  return { desde: inicio, hasta: addDays(inicio, 6) }
}

function calcularTitulo(fechaBase, view, desde, hasta) {
  if (view === 'dia') {
    return format(fechaBase, "EEEE, d 'de' MMMM yyyy", { locale: es })
  }
  if (view === 'mes') {
    return format(fechaBase, 'MMMM yyyy', { locale: es })
  }
  if (view === 'anio') {
    return format(fechaBase, 'yyyy')
  }
  const mismoMes = desde.getMonth() === hasta.getMonth()
  const mismoAnio = desde.getFullYear() === hasta.getFullYear()
  if (mismoMes) {
    return `${format(desde, 'd')} – ${format(hasta, 'd')} de ${format(desde, 'MMMM yyyy', { locale: es })}`
  }
  if (mismoAnio) {
    return `${format(desde, "d 'de' MMMM", { locale: es })} – ${format(hasta, "d 'de' MMMM yyyy", { locale: es })}`
  }
  return `${format(desde, 'd MMM yyyy', { locale: es })} – ${format(hasta, 'd MMM yyyy', { locale: es })}`
}

export function useAgendaCalendar({
  veterinarioId,
  estado,
  enabled = true,
  view = 'semana',
  prefs = {},
}) {
  const [fechaBase, setFechaBase] = useState(() => new Date())
  const {
    mostrarFinesDeSemana = true,
    mostrarCanceladas = true,
    mostrarCompletadas = true,
  } = prefs

  const { desde, hasta } = useMemo(() => calcularRango(fechaBase, view), [fechaBase, view])

  // Ocultar fines de semana solo aplica a las vistas de grilla; en día/año/agenda
  // esconder columnas dejaría huecos sin sentido.
  const ocultarFinesDeSemana =
    !mostrarFinesDeSemana && ['semana', 'mes', '4dias'].includes(view)

  const diasVisibles = useMemo(() => {
    const dias = eachDayOfInterval({ start: desde, end: hasta })
    return ocultarFinesDeSemana ? dias.filter((dia) => !isWeekend(dia)) : dias
  }, [desde, hasta, ocultarFinesDeSemana])

  const fechaDesde = format(desde, 'yyyy-MM-dd')
  const fechaHasta = format(hasta, 'yyyy-MM-dd')

  const citasQuery = useQuery({
    queryKey: ['agenda-calendario', fechaDesde, fechaHasta, veterinarioId, estado],
    queryFn: () =>
      agendaApi.obtenerCitas({
        fechaDesde,
        fechaHasta,
        estado: estado && estado !== 'todos' ? estado : undefined,
        veterinarioId: veterinarioId && veterinarioId !== 'todos' ? veterinarioId : undefined,
        limite: 500,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  // Horario de atencion y bloqueos: definen que slots se pueden agendar y
  // recortan la grilla a las horas en las que la clinica realmente atiende.
  const disponibilidadQuery = useQuery({
    queryKey: ['agenda-disponibilidad', fechaDesde, fechaHasta],
    queryFn: () => agendaApi.obtenerDisponibilidadAgenda({ desde: fechaDesde, hasta: fechaHasta }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const horarioAtencion = disponibilidadQuery.data?.horarioAtencion || null
  const bloqueos = useMemo(
    () => disponibilidadQuery.data?.bloqueos || [],
    [disponibilidadQuery.data?.bloqueos]
  )

  const { horaInicio: gridInicio, horaFin: gridFin } = useMemo(
    () => rangoVisibleDeHorario(horarioAtencion),
    [horarioAtencion]
  )

  const slots = useMemo(() => generarSlots(gridInicio, gridFin), [gridInicio, gridFin])

  /** ¿Se puede agendar en este slot? (objeto Date + "HH:MM") */
  const esHabil = (date, slot) =>
    esSlotHabil(format(date, 'yyyy-MM-dd'), slot, { horarioAtencion, bloqueos })

  /** Bloqueo que cubre el día completo, si lo hay (para marcarlo en la vista mes). */
  const getBloqueoDelDia = (date) => bloqueoDeDiaCompleto(format(date, 'yyyy-MM-dd'), bloqueos)
  const citas = useMemo(() => {
    const todas = citasQuery.data?.citas || []
    return todas.filter((cita) => {
      if (!mostrarCanceladas && cita.estado === 'cancelada') return false
      if (!mostrarCompletadas && cita.estado === 'completada') return false
      return true
    })
  }, [citasQuery.data?.citas, mostrarCanceladas, mostrarCompletadas])

  // Mapa fecha ('yyyy-MM-dd') → citas ordenadas por hora; en mes se consulta 42 veces por render
  const citasPorDia = useMemo(() => {
    const map = new Map()
    for (const cita of citas) {
      if (!map.has(cita.fecha)) map.set(cita.fecha, [])
      map.get(cita.fecha).push(cita)
    }
    for (const lista of map.values()) {
      lista.sort((a, b) => parseMinutes(a.horaInicio) - parseMinutes(b.horaInicio))
    }
    return map
  }, [citas])

  /** Retorna las citas de un día específico (objeto Date). */
  const getCitasDelDia = (date) => citasPorDia.get(format(date, 'yyyy-MM-dd')) || []

  /**
   * Id de la cita de hoy (programada o en_espera) más cercana a la hora actual —
   * la "siguiente a atender" — para resaltarla en el calendario.
   */
  const proximaCitaId = useMemo(() => {
    const hoyStr = format(new Date(), 'yyyy-MM-dd')
    const candidatas = citas.filter(
      (cita) => cita.fecha === hoyStr && ['programada', 'en_espera'].includes(cita.estado)
    )
    if (!candidatas.length) return null

    const ahoraMins = parseMinutes(format(new Date(), 'HH:mm'))
    let mejor = null
    let mejorDelta = Infinity
    for (const cita of candidatas) {
      const delta = Math.abs(parseMinutes(cita.horaInicio) - ahoraMins)
      if (delta < mejorDelta) {
        mejor = cita
        mejorDelta = delta
      }
    }
    return mejor?.id ?? null
  }, [citas])

  const saltar = (signo) =>
    setFechaBase((prev) => {
      if (view === 'mes') return addMonths(prev, signo)
      if (view === 'anio') return addYears(prev, signo)
      if (view === 'agenda') return addDays(prev, signo * DIAS_AGENDA)
      if (view === 'dia') return addDays(prev, signo)
      if (view === '4dias') return addDays(prev, signo * 4)
      return addDays(prev, signo * 7)
    })

  const irAnterior = () => saltar(-1)
  const irSiguiente = () => saltar(1)
  const irHoy = () => setFechaBase(new Date())
  const irADia = (date) => setFechaBase(date)

  const tituloRango = useMemo(
    () => calcularTitulo(fechaBase, view, desde, hasta),
    [fechaBase, view, desde, hasta]
  )

  return {
    fechaBase,
    diasVisibles,
    tituloRango,
    fechaDesde,
    fechaHasta,
    irAnterior,
    irSiguiente,
    irHoy,
    irADia,
    citas,
    getCitasDelDia,
    proximaCitaId,
    isLoading: citasQuery.isLoading,
    isFetching: citasQuery.isFetching,
    slots,
    gridInicio,
    gridFin,
    horarioAtencion,
    bloqueos,
    esHabil,
    getBloqueoDelDia,
  }
}
