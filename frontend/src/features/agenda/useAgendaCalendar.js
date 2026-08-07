import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { agendaApi } from './agendaApi'
import { generarSlots, parseMinutes } from './calendarConstants'

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

const WEEK_OPTS = { weekStartsOn: 1 }

function calcularRango(fechaBase, view) {
  if (view === 'dia') {
    return { desde: fechaBase, hasta: fechaBase }
  }
  if (view === 'mes') {
    return {
      desde: startOfWeek(startOfMonth(fechaBase), WEEK_OPTS),
      hasta: endOfWeek(endOfMonth(fechaBase), WEEK_OPTS),
    }
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

export function useAgendaCalendar({ veterinarioId, estado, enabled = true, view = 'semana' }) {
  const [fechaBase, setFechaBase] = useState(() => new Date())

  const { desde, hasta } = useMemo(() => calcularRango(fechaBase, view), [fechaBase, view])

  const diasVisibles = useMemo(
    () => eachDayOfInterval({ start: desde, end: hasta }),
    [desde, hasta]
  )

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

  const slots = useMemo(() => generarSlots(), [])
  const citas = useMemo(() => citasQuery.data?.citas || [], [citasQuery.data?.citas])

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

  const irAnterior = () =>
    setFechaBase((prev) =>
      view === 'mes' ? addMonths(prev, -1) : addDays(prev, view === 'dia' ? -1 : -7)
    )
  const irSiguiente = () =>
    setFechaBase((prev) =>
      view === 'mes' ? addMonths(prev, 1) : addDays(prev, view === 'dia' ? 1 : 7)
    )
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
  }
}
