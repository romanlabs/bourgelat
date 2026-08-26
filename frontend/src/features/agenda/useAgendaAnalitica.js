import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { agendaAnaliticaApi } from './agendaAnaliticaApi'
import {
  CITA_ESTADO_COLORS,
  CITA_ESTADO_LABELS,
  CITA_ORIGEN_LABELS,
  CITA_TIPO_COLORS,
  CITA_TIPO_LABELS,
  getRangeForPreset,
  mapFranjaHoraria,
  mapSerieCitas,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'

/**
 * Estado y datos del tab de analítica de la agenda.
 *
 * Todo el tab cuelga de un único periodo: antes convivían dos escalas (los
 * donuts eran del mes y la carga por profesional del día seleccionado, además
 * truncada a la página visible de citas), de modo que las tarjetas de una misma
 * fila no eran comparables entre sí.
 */
export function useAgendaAnalitica({ habilitado = true } = {}) {
  const [preset, setPreset] = useState('30d')
  const rango = useMemo(() => getRangeForPreset(preset), [preset])

  const analiticaQuery = useQuery({
    queryKey: ['agenda-analitica', rango.fechaInicio, rango.fechaFin],
    queryFn: () => agendaAnaliticaApi.obtenerAnaliticaAgenda(rango),
    enabled: habilitado,
    placeholderData: (previousData) => previousData,
  })

  const data = analiticaQuery.data

  const estadoChartData = useMemo(
    () => objectToChartData(data?.citasPorEstado, CITA_ESTADO_LABELS, CITA_ESTADO_COLORS),
    [data]
  )

  const tipoChartData = useMemo(
    () => objectToChartData(data?.citasPorTipo, CITA_TIPO_LABELS, CITA_TIPO_COLORS),
    [data]
  )

  const origenChartData = useMemo(
    () => objectToChartData(data?.citasPorOrigen, CITA_ORIGEN_LABELS),
    [data]
  )

  const serieDiaria = useMemo(() => mapSerieCitas(data?.serieDiaria), [data])
  const franjaHoraria = useMemo(() => mapFranjaHoraria(data?.citasPorFranja), [data])

  // El backend ya devuelve porVeterinario ordenado por total desc; el panel solo
  // muestra los primeros para que la lista no crezca sin control en clínicas grandes.
  const cargaProfesionales = useMemo(() => (data?.porVeterinario || []).slice(0, 8), [data])

  const totalTipos = useMemo(
    () => tipoChartData.reduce((suma, item) => suma + item.value, 0),
    [tipoChartData]
  )

  return {
    preset,
    setPreset,
    rango,
    query: analiticaQuery,
    resumen: data?.resumen,
    estadoChartData,
    tipoChartData,
    origenChartData,
    serieDiaria,
    franjaHoraria,
    cargaProfesionales,
    totalTipos,
    topMotivosCancelacion: data?.topMotivosCancelacion || [],
  }
}
