import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cajaApi } from './cajaApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback

export function useCajaTurno({ enabled, esAdmin }) {
  const queryClient = useQueryClient()
  const [historialFiltros, setHistorialFiltros] = useState({ fechaInicio: '', fechaFin: '', usuarioId: '' })
  const [reporteFiltros, setReporteFiltros] = useState({ fechaInicio: '', fechaFin: '', usuarioId: '' })

  const turnoActivoQuery = useQuery({
    queryKey: ['caja-turno-activo'],
    queryFn: () => cajaApi.obtenerTurnoActivo(),
    enabled,
  })

  const turnoActivo = turnoActivoQuery.data?.turno || null

  const movimientosQuery = useQuery({
    queryKey: ['caja-movimientos', turnoActivo?.id],
    queryFn: () => cajaApi.listarMovimientos(turnoActivo.id),
    enabled: enabled && Boolean(turnoActivo?.id),
  })

  const historialQuery = useQuery({
    queryKey: ['caja-historial', historialFiltros],
    queryFn: () => cajaApi.listarHistorial(historialFiltros),
    enabled,
  })

  const reporteDescuadresQuery = useQuery({
    queryKey: ['caja-reporte-descuadres', reporteFiltros],
    queryFn: () => cajaApi.obtenerReporteDescuadres(reporteFiltros),
    enabled: enabled && esAdmin,
  })

  const invalidarTurno = () => {
    queryClient.invalidateQueries({ queryKey: ['caja-turno-activo'] })
    queryClient.invalidateQueries({ queryKey: ['caja-movimientos'] })
  }

  const abrirTurnoMutation = useMutation({
    mutationFn: (payload) => cajaApi.abrirTurno(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Turno de caja abierto')
      invalidarTurno()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible abrir el turno de caja.'))
    },
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: (payload) => cajaApi.registrarMovimiento(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Movimiento registrado')
      invalidarTurno()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el movimiento.'))
    },
  })

  const cerrarTurnoMutation = useMutation({
    mutationFn: (payload) => cajaApi.cerrarTurno(payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Turno cerrado exitosamente')
      invalidarTurno()
      queryClient.invalidateQueries({ queryKey: ['caja-historial'] })
      queryClient.invalidateQueries({ queryKey: ['caja-reporte-descuadres'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible cerrar el turno.'))
    },
  })

  return {
    turnoActivoQuery,
    turnoActivo,
    movimientosQuery,
    movimientos: movimientosQuery.data?.movimientos || [],
    historialFiltros,
    setHistorialFiltros,
    historialQuery,
    turnosHistorial: historialQuery.data?.turnos || [],
    reporteFiltros,
    setReporteFiltros,
    reporteDescuadresQuery,
    reporteDescuadres: reporteDescuadresQuery.data?.reporte || [],
    abrirTurnoMutation,
    registrarMovimientoMutation,
    cerrarTurnoMutation,
  }
}
