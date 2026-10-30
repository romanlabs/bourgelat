import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { administracionApi } from '@/features/finanzas/administracionApi'
import { obtenerAlertasCompra } from '@/features/inventario/facturaCompraApi'
import { soporteApi } from '@/features/soporte/soporteApi'
import { fechaLocal } from '@/lib/fecha'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'
import { derivarNotificaciones, desdeServidor } from './notificacionesDerivadas'
import { notificacionesApi } from './notificacionesApi'

const CLAVE_GUARDADAS = ['notificaciones']
const CADA_MINUTO = 60_000

// Las citas cambian durante el día (llegadas, consultas que terminan); lo
// demás cambia poco. Las claves son las mismas de Hoy, Inventario, Caja y
// Soporte para compartir la caché y lo que ellas invaliden.
const CADA_2_MIN = 2 * 60_000
const CADA_5_MIN = 5 * 60_000

// Los roles de cada fuente son los de su ruta en el backend: pedirla sin
// permiso solo devolvería 403.
const ROLES_INVENTARIO = ['admin', 'superadmin', 'auxiliar']
const ROLES_FIADO = ['admin', 'superadmin', 'facturador', 'recepcionista']
const ROLES_PLAN = ['admin', 'superadmin']

// Lo leído vive en este navegador (Fase A, sin tabla en el servidor).
const claveLeidas = (usuarioId) => `bourgelat:avisos-leidos:${usuarioId}`

const leerLeidas = (usuarioId) => {
  try {
    const guardado = JSON.parse(window.localStorage.getItem(claveLeidas(usuarioId)) || '[]')
    return new Set(Array.isArray(guardado) ? guardado : [])
  } catch {
    return new Set()
  }
}

const guardarLeidas = (usuarioId, ids) => {
  try {
    window.localStorage.setItem(claveLeidas(usuarioId), JSON.stringify([...ids]))
  } catch {
    // Sin almacenamiento (incógnito estricto) los avisos solo vuelven a salir como nuevos.
  }
}

export function useNotificaciones() {
  const usuario = useAuthStore((state) => state.usuario)
  const usuarioId = usuario?.id
  const hoy = fechaLocal()

  const verAgenda = canAccessModule(usuario, 'agenda')
  const verInventario = hasAnyRole(usuario, ROLES_INVENTARIO)
  const verFiado = hasAnyRole(usuario, ROLES_FIADO)
  const verPlan = hasAnyRole(usuario, ROLES_PLAN)
  const verSoporte = canAccessModule(usuario, 'soporte')

  const citasQuery = useQuery({
    queryKey: ['dashboard-citas-hoy-detalle', hoy],
    queryFn: () => agendaApi.obtenerCitas({ fecha: hoy, pagina: 1, limite: 40 }),
    enabled: Boolean(usuarioId) && verAgenda,
    refetchInterval: CADA_2_MIN,
  })
  const inventarioQuery = useQuery({
    queryKey: ['dashboard-inventario'],
    queryFn: dashboardApi.obtenerReporteInventario,
    enabled: Boolean(usuarioId) && verInventario,
    refetchInterval: CADA_5_MIN,
  })
  const comprasQuery = useQuery({
    queryKey: ['facturas-compra-alertas'],
    queryFn: obtenerAlertasCompra,
    enabled: Boolean(usuarioId) && verInventario,
    refetchInterval: CADA_5_MIN,
  })
  const fiadoQuery = useQuery({
    queryKey: ['administracion', 'cuentas-por-cobrar'],
    queryFn: administracionApi.obtenerCuentasPorCobrar,
    enabled: Boolean(usuarioId) && verFiado,
    refetchInterval: CADA_5_MIN,
  })
  const ticketsQuery = useQuery({
    queryKey: ['soporte-tickets', { estado: 'esperando_usuario' }],
    queryFn: () => soporteApi.listarTickets({ estado: 'esperando_usuario' }),
    enabled: Boolean(usuarioId) && verSoporte,
    refetchInterval: CADA_5_MIN,
  })
  const planQuery = useQuery({
    queryKey: ['suscripcion-activa'],
    queryFn: dashboardApi.obtenerSuscripcionActiva,
    enabled: Boolean(usuarioId) && verPlan,
  })
  // Los avisos guardados (llegadas, exámenes, cierres de caja) los crea el
  // servidor para otra persona: se consultan cada minuto.
  const guardadasQuery = useQuery({
    queryKey: CLAVE_GUARDADAS,
    queryFn: notificacionesApi.listar,
    enabled: Boolean(usuarioId) && verSoporte,
    refetchInterval: CADA_MINUTO,
  })

  // El veterinario recibe avisos de sus pacientes y de los que aún no tienen
  // profesional, como en su jornada de Hoy.
  const citas = useMemo(() => {
    const todas = citasQuery.data?.citas
    if (!todas || !usuarioId || !hasAnyRole(usuario, ['veterinario']) || hasAnyRole(usuario, ['admin'])) return todas
    return todas.filter((cita) => !cita.veterinario?.id || cita.veterinario.id === usuarioId)
  }, [citasQuery.data?.citas, usuario, usuarioId])

  // La espera en sala se mide contra la hora: se recalcula cada minuto.
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(intervalo)
  }, [])

  const derivadas = useMemo(
    () =>
      derivarNotificaciones({
        citas,
        inventario: inventarioQuery.data,
        alertasCompra: comprasQuery.data,
        cuentasPorCobrar: fiadoQuery.data,
        tickets: ticketsQuery.data?.tickets,
        diasRestantes: planQuery.data?.diasRestantes,
        puedeAtender: canAccessModule(usuario, 'historias'),
        ahora,
      }),
    [citas, inventarioQuery.data, comprasQuery.data, fiadoQuery.data, ticketsQuery.data?.tickets, planQuery.data?.diasRestantes, usuario, ahora]
  )

  // Lo marcado en esta sesión, atado al usuario: si cambia la sesión se vuelve
  // a leer lo guardado del nuevo usuario.
  const [marcadas, setMarcadas] = useState({ usuarioId: null, ids: new Set() })
  const leidas = useMemo(() => {
    if (marcadas.usuarioId === usuarioId) return marcadas.ids
    return usuarioId ? leerLeidas(usuarioId) : new Set()
  }, [marcadas, usuarioId])

  // Solo se guardan los ids que siguen vigentes: lo resuelto se olvida solo.
  const marcar = useCallback(
    (ids) => {
      if (!usuarioId) return
      const vigentes = new Set(derivadas.map((aviso) => aviso.id))
      const siguientes = new Set([...leidas, ...ids].filter((id) => vigentes.has(id)))
      guardarLeidas(usuarioId, siguientes)
      setMarcadas({ usuarioId, ids: siguientes })
    },
    [derivadas, leidas, usuarioId]
  )

  // Marcar en el servidor se refleja de una vez en la caché; si falla (p. ej.
  // la clínica está en solo lectura) se vuelve a pedir la lista y ya.
  const queryClient = useQueryClient()
  const marcarGuardadas = useMutation({
    mutationFn: (ids) => notificacionesApi.marcarLeidas(ids),
    onMutate: (ids) => {
      queryClient.setQueryData(CLAVE_GUARDADAS, (previo) => {
        if (!previo) return previo
        const leidaEn = new Date().toISOString()
        const notificaciones = previo.notificaciones.map((fila) =>
          !fila.leidaEn && (!ids || ids.includes(fila.id)) ? { ...fila, leidaEn } : fila
        )
        return { ...previo, notificaciones }
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_GUARDADAS }),
  })

  const guardadas = useMemo(
    () => (guardadasQuery.data?.notificaciones || []).map((fila) => desdeServidor(fila, ahora)),
    [guardadasQuery.data?.notificaciones, ahora]
  )

  const avisos = useMemo(
    () => [...derivadas.map((aviso) => ({ ...aviso, nueva: !leidas.has(aviso.id) })), ...guardadas],
    [derivadas, leidas, guardadas]
  )

  // La lista trae las últimas 50; el conteo del servidor cubre las que no caben.
  const guardadasSinLeer = guardadas.filter((aviso) => aviso.nueva).length
  const sinLeerFueraDeLista = Math.max(0, (guardadasQuery.data?.sinLeer ?? 0) - guardadasSinLeer)
  const { mutate: enviarLeidas } = marcarGuardadas

  return {
    avisos,
    sinLeer: avisos.filter((aviso) => aviso.nueva).length + sinLeerFueraDeLista,
    cargando: [citasQuery, inventarioQuery, comprasQuery, fiadoQuery, ticketsQuery, guardadasQuery].some((query) => query.isLoading),
    marcarLeida: (aviso) => {
      if (!aviso.nueva) return
      if (aviso.servidorId) enviarLeidas([aviso.servidorId])
      else marcar([aviso.id])
    },
    marcarTodas: () => {
      marcar(derivadas.map((aviso) => aviso.id))
      if (guardadasSinLeer + sinLeerFueraDeLista > 0) enviarLeidas(undefined)
    },
  }
}
