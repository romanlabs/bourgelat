import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { administracionApi } from '@/features/finanzas/administracionApi'
import { finanzasApi } from '@/features/finanzas/finanzasApi'
import { obtenerAlertasCompra } from '@/features/inventario/facturaCompraApi'
import { soporteApi } from '@/features/soporte/soporteApi'
import { fechaLocal } from '@/lib/fecha'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { FUNCIONALIDAD_DIAN, tieneFuncionalidad } from '@/lib/suscripcion'
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
const CADA_30_MIN = 30 * 60_000

// Los roles de cada fuente son los de su ruta en el backend: pedirla sin
// permiso solo devolvería 403.
const ROLES_INVENTARIO = ['admin', 'superadmin', 'auxiliar']
const ROLES_FIADO = ['admin', 'superadmin', 'facturador', 'recepcionista']
const ROLES_PLAN = ['admin', 'superadmin']
const ROLES_SEGUIMIENTO = ['admin', 'superadmin', 'veterinario', 'auxiliar', 'recepcionista']
const ROLES_DIAN = ['admin', 'superadmin', 'facturador']

const SIN_AJUSTES = { categoriasApagadas: [], correoUrgente: false }

// Lo leído se guarda en el servidor (sirve en todos los equipos) y en este
// navegador, para no esperar la respuesta ni perderlo sin conexión.
const claveLeidas = (usuarioId) => `bourgelat:avisos-leidos:${usuarioId}`
// Los avisos del navegador se activan por equipo: el permiso es de cada navegador.
const claveNavegador = (usuarioId) => `bourgelat:avisos-navegador:${usuarioId}`

const leerLocal = (clave, porDefecto) => {
  try {
    const guardado = window.localStorage.getItem(clave)
    return guardado == null ? porDefecto : JSON.parse(guardado)
  } catch {
    return porDefecto
  }
}

const guardarLocal = (clave, valor) => {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento (incógnito estricto) queda solo lo del servidor.
  }
}

const soportaNavegador = () => typeof window !== 'undefined' && 'Notification' in window

// «(3) Agenda | Bourgelat»: cada página pone su título, así que el contador se
// vuelve a poner cuando el título cambia.
const PREFIJO = /^\(\d+\+?\) /
function useContadorEnTitulo(sinLeer) {
  useEffect(() => {
    const aplicar = () => {
      const base = document.title.replace(PREFIJO, '')
      const deseado = sinLeer > 0 ? `(${sinLeer > 99 ? '99+' : sinLeer}) ${base}` : base
      if (document.title !== deseado) document.title = deseado
    }
    aplicar()
    const titulo = document.querySelector('title')
    if (!titulo) return undefined
    const observador = new MutationObserver(aplicar)
    observador.observe(titulo, { childList: true, characterData: true, subtree: true })
    return () => {
      observador.disconnect()
      document.title = document.title.replace(PREFIJO, '')
    }
  }, [sinLeer])
}

// Con la pestaña en segundo plano, lo nuevo que aparece sale como aviso del
// sistema. Lo que ya estaba al cargar no se repite.
function useAvisosNavegador({ avisos, activo, listo }) {
  const navigate = useNavigate()
  const vistos = useRef(null)

  useEffect(() => {
    if (!listo) return
    const nuevos = avisos.filter((aviso) => aviso.nueva)
    if (vistos.current == null) {
      vistos.current = new Set(nuevos.map((aviso) => aviso.id))
      return
    }
    const porAvisar = nuevos.filter((aviso) => !vistos.current.has(aviso.id))
    nuevos.forEach((aviso) => vistos.current.add(aviso.id))
    if (!activo || !document.hidden || !soportaNavegador() || Notification.permission !== 'granted') return

    porAvisar.slice(0, 3).forEach((aviso) => {
      try {
        const sistema = new Notification(aviso.titulo, { body: aviso.texto || '', tag: aviso.id })
        sistema.onclick = () => {
          window.focus()
          if (aviso.to) navigate(aviso.to, aviso.state ? { state: aviso.state } : undefined)
          sistema.close()
        }
      } catch {
        // Algunos navegadores móviles solo permiten avisos desde un service worker.
      }
    })
  }, [avisos, activo, listo, navigate])
}

export function useNotificaciones() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const usuarioId = usuario?.id
  const hoy = fechaLocal()
  const inicioMes = `${hoy.slice(0, 7)}-01`

  const verAgenda = canAccessModule(usuario, 'agenda')
  const verInventario = hasAnyRole(usuario, ROLES_INVENTARIO)
  const verFiado = hasAnyRole(usuario, ROLES_FIADO)
  const verPlan = hasAnyRole(usuario, ROLES_PLAN)
  const verSoporte = canAccessModule(usuario, 'soporte')
  const verSeguimientos = hasAnyRole(usuario, ROLES_SEGUIMIENTO)
  // Sin el plan con facturación electrónica ninguna venta va a la DIAN.
  const verDian = hasAnyRole(usuario, ROLES_DIAN) && tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN)

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
  // Vacunas, desparasitaciones y controles que vencen: cambian de un día a otro.
  const seguimientosQuery = useQuery({
    queryKey: ['notificaciones-seguimientos'],
    queryFn: notificacionesApi.listarSeguimientos,
    enabled: Boolean(usuarioId) && verSeguimientos,
    refetchInterval: CADA_30_MIN,
  })
  // Solo el resumen por estado electrónico del mes (limite 1, sin filas).
  const dianQuery = useQuery({
    queryKey: ['dashboard-facturacion-estado', inicioMes, hoy],
    queryFn: () => finanzasApi.obtenerFacturas({ fechaInicio: inicioMes, fechaFin: hoy, pagina: 1, limite: 1 }),
    enabled: Boolean(usuarioId) && verDian,
    refetchInterval: CADA_30_MIN,
  })
  // Los avisos guardados (llegadas, exámenes, cierres de caja) los crea el
  // servidor para otra persona: se consultan cada minuto. Traen también los
  // ajustes y lo leído de los derivados.
  const guardadasQuery = useQuery({
    queryKey: CLAVE_GUARDADAS,
    queryFn: notificacionesApi.listar,
    enabled: Boolean(usuarioId) && verSoporte,
    refetchInterval: CADA_MINUTO,
  })
  const ajustes = guardadasQuery.data?.ajustes || SIN_AJUSTES

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
        seguimientos: seguimientosQuery.data?.seguimientos,
        resumenElectronico: dianQuery.data?.resumenElectronico,
        puedeAtender: canAccessModule(usuario, 'historias'),
        ahora,
      }),
    [citas, inventarioQuery.data, comprasQuery.data, fiadoQuery.data, ticketsQuery.data?.tickets, planQuery.data?.diasRestantes, seguimientosQuery.data?.seguimientos, dianQuery.data?.resumenElectronico, usuario, ahora]
  )

  // Lo marcado en esta sesión, atado al usuario: si cambia la sesión se vuelve
  // a leer lo guardado del nuevo usuario (en el servidor y en este navegador).
  const [marcadas, setMarcadas] = useState({ usuarioId: null, ids: new Set() })
  const leidasServidor = guardadasQuery.data?.leidasDerivadas
  const leidas = useMemo(() => {
    if (marcadas.usuarioId === usuarioId) return marcadas.ids
    if (!usuarioId) return new Set()
    const locales = leerLocal(claveLeidas(usuarioId), [])
    return new Set([...(Array.isArray(locales) ? locales : []), ...(leidasServidor || [])])
  }, [marcadas, usuarioId, leidasServidor])

  const { mutate: subirLeidas } = useMutation({ mutationFn: notificacionesApi.guardarLeidasDerivadas })

  // Solo se guardan los ids que siguen vigentes: lo resuelto se olvida solo.
  const marcar = useCallback(
    (ids) => {
      if (!usuarioId) return
      const vigentes = new Set(derivadas.map((aviso) => aviso.id))
      const siguientes = new Set([...leidas, ...ids].filter((id) => vigentes.has(id)))
      guardarLocal(claveLeidas(usuarioId), [...siguientes])
      setMarcadas({ usuarioId, ids: siguientes })
      subirLeidas([...siguientes])
    },
    [derivadas, leidas, usuarioId, subirLeidas]
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

  const { mutate: guardarAjustes } = useMutation({
    mutationFn: notificacionesApi.guardarAjustes,
    onMutate: (cambios) => {
      queryClient.setQueryData(CLAVE_GUARDADAS, (previo) =>
        previo ? { ...previo, ajustes: { ...(previo.ajustes || SIN_AJUSTES), ...cambios } } : previo
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_GUARDADAS }),
  })

  // Avisos del sistema operativo: se piden al activarlos y se recuerdan por equipo.
  const [navegador, setNavegador] = useState({ usuarioId: null, activo: false })
  const navegadorActivo = navegador.usuarioId === usuarioId
    ? navegador.activo
    : Boolean(usuarioId) && leerLocal(claveNavegador(usuarioId), false) === true
  const cambiarNavegador = useCallback(
    async (activar) => {
      if (!usuarioId) return
      if (activar && soportaNavegador() && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      const queda = activar && soportaNavegador() && Notification.permission === 'granted'
      guardarLocal(claveNavegador(usuarioId), queda)
      setNavegador({ usuarioId, activo: queda })
    },
    [usuarioId]
  )

  const guardadas = useMemo(
    () => (guardadasQuery.data?.notificaciones || []).map((fila) => desdeServidor(fila, ahora)),
    [guardadasQuery.data?.notificaciones, ahora]
  )

  // Las categorías apagadas en los ajustes tampoco muestran sus avisos derivados.
  const apagadas = ajustes.categoriasApagadas
  const avisos = useMemo(
    () => [
      ...derivadas
        .filter((aviso) => !apagadas.includes(aviso.categoria))
        .map((aviso) => ({ ...aviso, nueva: !leidas.has(aviso.id) })),
      ...guardadas,
    ],
    [derivadas, leidas, guardadas, apagadas]
  )

  // La lista trae las últimas 50; el conteo del servidor cubre las que no caben.
  const guardadasSinLeer = guardadas.filter((aviso) => aviso.nueva).length
  const sinLeerFueraDeLista = Math.max(0, (guardadasQuery.data?.sinLeer ?? 0) - guardadasSinLeer)
  const { mutate: enviarLeidas } = marcarGuardadas
  const sinLeer = avisos.filter((aviso) => aviso.nueva).length + sinLeerFueraDeLista
  const cargando = [citasQuery, inventarioQuery, comprasQuery, fiadoQuery, ticketsQuery, seguimientosQuery, dianQuery, guardadasQuery]
    .some((query) => query.isLoading)

  useContadorEnTitulo(sinLeer)
  useAvisosNavegador({ avisos, activo: navegadorActivo, listo: !cargando && Boolean(usuarioId) })

  return {
    avisos,
    sinLeer,
    cargando,
    ajustes,
    guardarAjustes,
    navegador: {
      disponible: soportaNavegador(),
      bloqueado: soportaNavegador() && Notification.permission === 'denied',
      activo: navegadorActivo,
      cambiar: cambiarNavegador,
    },
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
