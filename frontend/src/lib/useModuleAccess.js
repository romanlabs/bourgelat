import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/permissions'

const ROL_LABELS = {
  admin: 'Administrador',
  veterinario: 'Veterinario',
  recepcionista: 'Recepcionista',
  auxiliar: 'Auxiliar',
  facturador: 'Facturador',
  superadmin: 'Administrador de la plataforma',
}

export const avisarSinAcceso = (usuario, moduleKey, label) => {
  const rol = ROL_LABELS[usuario?.rol] || 'actual'
  // `id` fijo por módulo: clics repetidos reemplazan el aviso en vez de apilarlo.
  toast.warning(`Sin acceso a ${label}`, {
    id: `sin-acceso-${moduleKey}`,
    description: `Tu rol (${rol}) no tiene permiso para este módulo. Pide a un administrador que lo habilite.`,
  })
}

export function useModuleAccess() {
  const usuario = useAuthStore((state) => state.usuario)

  const canAccess = useCallback((moduleKey) => canAccessModule(usuario, moduleKey), [usuario])

  // true si puede entrar; si no, muestra el aviso y devuelve false.
  const guard = useCallback(
    (moduleKey, label) => {
      if (canAccessModule(usuario, moduleKey)) return true
      avisarSinAcceso(usuario, moduleKey, label)
      return false
    },
    [usuario]
  )

  return { usuario, canAccess, guard }
}
