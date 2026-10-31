import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { useAuthStore } from '@/store/authStore'
import { hasRole } from '@/lib/permissions'
import { invalidarDominios } from '@/lib/queryKeys'
import { mensajeDeError } from '@/lib/errores'

// Sin ningún veterinario no se puede agendar: toda cita necesita quién la atienda.
// Al administrador se le ofrece marcarse como veterinario con un clic.
export function AvisoSinVeterinarios() {
  const usuario = useAuthStore((state) => state.usuario)
  const queryClient = useQueryClient()
  const esAdmin = hasRole(usuario, 'admin')

  const marcarme = useMutation({
    mutationFn: () =>
      usuariosApi.editarUsuario(usuario.id, {
        rolesAdicionales: [...new Set([...(usuario.rolesAdicionales || []), 'veterinario'])],
      }),
    onSuccess: (data) => {
      useAuthStore.setState((state) => ({
        usuario: { ...state.usuario, rolesAdicionales: data?.usuario?.rolesAdicionales || ['veterinario'] },
      }))
      invalidarDominios(queryClient, 'equipo')
      toast.success('Listo, ya puedes agendarte citas')
    },
    onError: (error) => toast.error(mensajeDeError(error, 'No fue posible marcarte como veterinario.')),
  })

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="text-sm leading-6">
          <p className="font-semibold text-foreground">Aún no hay veterinarios en la clínica</p>
          <p className="text-muted-foreground">
            {esAdmin
              ? 'Cada cita necesita quién la atienda. Si tú atiendes pacientes, márcate como veterinario; si no, invita a tu equipo.'
              : 'Cada cita necesita quién la atienda. Pídele al administrador que registre un veterinario en Usuarios.'}
          </p>
        </div>
      </div>
      {esAdmin ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" onClick={() => marcarme.mutate()} disabled={marcarme.isPending}>
            {marcarme.isPending ? 'Guardando...' : 'Atiendo pacientes'}
          </Button>
          <Button asChild variant="outline">
            <Link to="/usuarios">Invitar veterinario</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
