import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { administracionApi } from '@/features/finanzas/administracionApi'
import { obtenerAlertasCompra } from '@/features/inventario/facturaCompraApi'
import { soporteApi } from '@/features/soporte/soporteApi'
import { fechaLocal } from '@/lib/fecha'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'
import { derivarNotificaciones } from './notificacionesDerivadas'

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

  const avisos = useMemo(
    () => derivadas.map((aviso) => ({ ...aviso, nueva: !leidas.has(aviso.id) })),
    [derivadas, leidas]
  )

  return {
    avisos,
    sinLeer: avisos.filter((aviso) => aviso.nueva).length,
    cargando: [citasQuery, inventarioQuery, comprasQuery, fiadoQuery, ticketsQuery].some((query) => query.isLoading),
    marcarLeida: (id) => marcar([id]),
    marcarTodas: () => marcar(derivadas.map((aviso) => aviso.id)),
  }
}
