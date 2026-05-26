import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startOfWeek, addDays, format } from 'date-fns'
import { agendaApi } from './agendaApi'

export const HORA_INICIO = 7   // 07:00
export const HORA_FIN = 20     // 20:00 (exclusive — último slot es 19:30)
export const SLOT_MINUTOS = 30
export const SLOT_HEIGHT = 52  // px por slot de 30 min

/** Genera los slots de horario del día: ["07:00", "07:30", ..., "19:30"] */
export function generarSlots() {
  const slots = []
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

/**
 * Convierte "HH:MM" o "HH:MM:SS" a minutos totales desde medianoche.
 */
export function parseMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  return parts[0] * 60 + (parts[1] || 0)
}

/**
 * Calcula posición top (px) dentro de la grilla para una hora dada.
 */
export function timeToTop(timeStr) {
  const mins = parseMinutes(timeStr)
  const minutesFromStart = mins - HORA_INICIO * 60
  return Math.max(0, (minutesFromStart / SLOT_MINUTOS) * SLOT_HEIGHT)
}

/**
 * Calcula la altura (px) de un chip dados horaInicio y horaFin.
 */
export function calcCitaHeight(horaInicio, horaFin) {
  const startMins = parseMinutes(horaInicio)
  const endMins = parseMinutes(horaFin)
  const duration = Math.max(endMins - startMins, SLOT_MINUTOS / 2)
  const clampedEnd = Math.min(endMins, HORA_FIN * 60)
  const clampedStart = Math.max(startMins, HORA_INICIO * 60)
  const effectiveDuration = Math.max(clampedEnd - clampedStart, 15)
  return Math.max((effectiveDuration / SLOT_MINUTOS) * SLOT_HEIGHT, 24)
}

export function useAgendaCalendar({ veterinarioId, estado, enabled = true }) {
  const [semanaBase, setSemanaBase] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  // Array de 7 fechas: lunes → domingo de la semana seleccionada
  const semanaActual = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(semanaBase, i)),
    [semanaBase]
  )

  const fechaDesde = format(semanaActual[0], 'yyyy-MM-dd')
  const fechaHasta = format(semanaActual[6], 'yyyy-MM-dd')

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

  /** Retorna las citas de un día específico (objeto Date). */
  const getCitasDelDia = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return citas.filter((cita) => cita.fecha === dateStr)
  }

  const irSemanaAnterior = () => setSemanaBase((prev) => addDays(prev, -7))
  const irSemanaSiguiente = () => setSemanaBase((prev) => addDays(prev, 7))
  const irHoy = () => setSemanaBase(startOfWeek(new Date(), { weekStartsOn: 1 }))

  return {
    semanaActual,
    fechaDesde,
    fechaHasta,
    irSemanaAnterior,
    irSemanaSiguiente,
    irHoy,
    citas,
    getCitasDelDia,
    isLoading: citasQuery.isLoading,
    isFetching: citasQuery.isFetching,
    slots,
  }
}
