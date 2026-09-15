import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { soporteApi } from './soporteApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje ||
  error?.response?.data?.message ||
  fallback

export function useTicketsSoporte(filtros) {
  return useQuery({
    queryKey: ['soporte-tickets', filtros],
    queryFn: () => soporteApi.listarTickets(filtros),
    placeholderData: (previousData) => previousData,
  })
}

export function useTicketSoporte(ticketId) {
  return useQuery({
    queryKey: ['soporte-ticket', ticketId],
    queryFn: () => soporteApi.obtenerTicket(ticketId),
    enabled: Boolean(ticketId),
    // La respuesta del equipo llega desde el servidor: se revisa cada minuto
    // mientras el ticket esta abierto en pantalla.
    refetchInterval: 60_000,
    retry: (intentos, error) => error?.response?.status !== 404 && intentos < 2,
  })
}

export function useSoporteMutaciones() {
  const queryClient = useQueryClient()

  // Toda respuesta del backend trae el ticket completo: se pinta sin refetch y
  // la lista se invalida porque cambian estado y ultima actividad.
  const aplicarTicket = (data) => {
    if (data?.ticket) {
      queryClient.setQueryData(['soporte-ticket', data.ticket.id], { ticket: data.ticket })
    }
    queryClient.invalidateQueries({ queryKey: ['soporte-tickets'] })
  }

  const crearMutation = useMutation({
    mutationFn: ({ payload, captura }) => soporteApi.crearTicket(payload, captura),
    onSuccess: (data) => {
      toast.success(data?.message || 'Ticket enviado')
      aplicarTicket(data)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible enviar el ticket.')),
  })

  const responderMutation = useMutation({
    mutationFn: ({ ticketId, mensaje }) => soporteApi.responder(ticketId, mensaje),
    onSuccess: aplicarTicket,
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible enviar el mensaje.')),
  })

  const cerrarMutation = useMutation({
    mutationFn: (ticketId) => soporteApi.cerrar(ticketId),
    onSuccess: (data) => {
      toast.success(data?.message || 'Ticket cerrado')
      aplicarTicket(data)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible cerrar el ticket.')),
  })

  return { crearMutation, responderMutation, cerrarMutation }
}
