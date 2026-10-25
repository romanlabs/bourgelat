import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule, moduleKeyFromPath } from '@/lib/permissions'
import { avisarSinAcceso } from '@/lib/useModuleAccess'

const MODULE_LABELS = {
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  historias: 'Historias',
  antecedentes: 'Antecedentes',
  finanzas: 'Caja',
  inventario: 'Inventario',
  usuarios: 'Usuarios',
  configuracion: 'Clínica',
  auditoria: 'Auditoría',
  soporte: 'Soporte',
}

// Acceso directo por URL a un módulo vetado para el rol: vuelve al panel con el
// mismo aviso que el sidebar, sin pantalla de "acceso denegado".
export default function ModuleAccessRoute() {
  const usuario = useAuthStore((state) => state.usuario)
  const { pathname } = useLocation()
  const moduleKey = moduleKeyFromPath(pathname)
  const bloqueado = Boolean(moduleKey) && !canAccessModule(usuario, moduleKey)

  useEffect(() => {
    if (bloqueado) avisarSinAcceso(usuario, moduleKey, MODULE_LABELS[moduleKey])
  }, [bloqueado, usuario, moduleKey])

  if (bloqueado) return <Navigate to="/dashboard" replace />
  // Cada ruta monta su página de cero. Sin la key, React reusa la instancia
  // cuando dos rutas tienen la misma forma: /caja y /finanzas (mismo
  // FinanzasPage) se pasaban la pestaña abierta, y el <Suspense> de cada ruta,
  // ya revelado, dejaba ver la página anterior mientras cargaba la nueva.
  return <Outlet key={pathname} />
}
