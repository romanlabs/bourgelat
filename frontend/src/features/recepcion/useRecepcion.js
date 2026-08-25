import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { agendaApi } from '@/features/agenda/agendaApi'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { antecedentesApi } from '@/features/antecedentes/antecedentesApi'
import { recepcionApi } from './recepcionApi'

const RECEPCION_REFETCH_INTERVAL = 15000

const formatHora = (value) => value?.slice(0, 5) || ''

const mostrarAdvertenciaCruce = (advertencia) => {
  if (!advertencia) return
  if (advertencia.tipo === 'cita_programada_proxima') {
    toast.warning(
      `Este veterinario tiene una cita programada a las ${formatHora(advertencia.horaInicio)}` +
        (advertencia.paciente ? ` (${advertencia.paciente})` : '') +
        '. Verifica que no se cruce con este ingreso.'
    )
  } else if (advertencia.tipo === 'walk_in_en_curso') {
    toast.warning(
      'Este veterinario esta atendiendo un walk-in ahora mismo' +
        (advertencia.paciente ? ` (${advertencia.paciente})` : '') +
        '. Verifica el horario asignado.'
    )
  }
}

const INVALIDATE_KEYS = [
  ['recepcion-sala-espera'],
  ['recepcion-disponibilidad'],
  ['agenda-citas'],
  ['agenda-calendario'],
  ['agenda-reporte-mensual'],
  ['dashboard-general'],
]

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

/**
 * Hook central de Recepción: agrupa las queries y mutaciones que alimentan
 * los tres paneles (programar / sala de espera / walk-in). La sala de espera
 * y la disponibilidad de veterinarios se refrescan solas via polling; toda
 * mutación invalida el mismo set de queries de inmediato.
 */
export function useRecepcion({ fecha, habilitado = true }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const invalidarTodo = () => {
    INVALIDATE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
  }

  const salaEsperaQuery = useQuery({
    queryKey: ['recepcion-sala-espera', fecha],
    queryFn: () => recepcionApi.obtenerSalaEspera({ fecha }),
    enabled: habilitado,
    refetchInterval: RECEPCION_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const disponibilidadQuery = useQuery({
    queryKey: ['recepcion-disponibilidad', fecha],
    queryFn: () => recepcionApi.obtenerDisponibilidad({ fecha }),
    enabled: habilitado,
    refetchInterval: RECEPCION_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const consultoriosQuery = useQuery({
    queryKey: ['recepcion-consultorios'],
    queryFn: () => recepcionApi.obtenerConsultorios({ activo: true }),
    enabled: habilitado,
    staleTime: 60000,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['agenda-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: habilitado,
    placeholderData: (previousData) => previousData,
  })

  const crearCitaMutation = useMutation({
    mutationFn: agendaApi.crearCita,
    onSuccess: (data) => {
      toast.success(data?.message || 'Cita creada exitosamente')
      invalidarTodo()
      mostrarAdvertenciaCruce(data?.advertencia)

      const mascotaId = data?.cita?.mascota?.id
      if (mascotaId) {
        antecedentesApi.obtenerAntecedentes(mascotaId)
          .then((res) => {
            const ant = res?.antecedentes
            const sinAntecedentes =
              !ant ||
              (
                (!ant.alergias || ant.alergias.length === 0) &&
                (!ant.condicionesCronicas || ant.condicionesCronicas.length === 0) &&
                (!ant.vacunas || ant.vacunas.length === 0) &&
                (!ant.medicamentosActuales || ant.medicamentosActuales.length === 0)
              )
            if (sinAntecedentes) {
              toast.warning(
                'Este paciente no tiene antecedentes registrados. Regístralos antes de la consulta.',
                {
                  duration: 8000,
                  action: {
                    label: 'Registrar antecedentes →',
                    onClick: () => navigate(`/antecedentes?mascotaId=${mascotaId}`),
                  },
                }
              )
            }
          })
          .catch(() => {})
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear la cita.'))
    },
  })

  const crearWalkInMutation = useMutation({
    mutationFn: recepcionApi.crearWalkIn,
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente registrado en sala de espera')
      invalidarTodo()
      mostrarAdvertenciaCruce(data?.advertencia)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el ingreso directo.'))
    },
  })

  const actualizarEstadoMutation = useMutation({
    mutationFn: ({ citaId, payload }) => agendaApi.actualizarEstadoCita(citaId, payload),
    onSuccess: (data, { payload, cita }) => {
      invalidarTodo()
      if (payload.estado === 'completada' && cita?.mascota?.id) {
        toast.info('Cita completada. Registra la historia clínica de la consulta.')
        navigate(`/pacientes/${cita.mascota.id}/historial?citaId=${cita.id}`)
      } else {
        toast.success(data?.message || 'Estado actualizado')
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar la cita.'))
    },
  })

  const mascotasQuery = useQuery({
    queryKey: ['agenda-mascotas-base'],
    queryFn: () => pacientesApi.obtenerMascotas({ pagina: 1, limite: 200 }),
    enabled: habilitado,
    placeholderData: (previousData) => previousData,
  })

  const salaEspera = useMemo(() => salaEsperaQuery.data?.citas || [], [salaEsperaQuery.data])
  const resumen = salaEsperaQuery.data?.resumen || { programadas: 0, enEspera: 0, enAtencion: 0, completadas: 0 }
  const veterinariosDisponibilidad = disponibilidadQuery.data?.veterinarios || []
  const consultorios = consultoriosQuery.data?.consultorios || []
  const veterinarios = veterinariosQuery.data?.usuarios || []
  const mascotas = mascotasQuery.data?.mascotas || []

  return {
    salaEsperaQuery,
    salaEspera,
    resumen,
    disponibilidadQuery,
    veterinariosDisponibilidad,
    consultoriosQuery,
    consultorios,
    veterinariosQuery,
    veterinarios,
    mascotasQuery,
    mascotas,
    crearCitaMutation,
    crearWalkInMutation,
    actualizarEstadoMutation,
    invalidarTodo,
  }
}

/** Hook independiente (no puede vivir dentro de useRecepcion: violaria las reglas de hooks al invocarse por panel). */
export function useBuscarPropietarios(busqueda, habilitado = true) {
  return useQuery({
    queryKey: ['agenda-propietarios', busqueda.trim()],
    queryFn: () =>
      pacientesApi.obtenerPropietarios({ buscar: busqueda.trim() || undefined, pagina: 1, limite: 8 }),
    enabled: habilitado,
    placeholderData: (previousData) => previousData,
  })
}
