import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Smartphone, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { hasRole } from '@/lib/permissions'
import { esSoloLectura } from '@/lib/suscripcion'
import { esCelularValido } from '@/lib/celular'
import { invalidarDominios } from '@/lib/queryKeys'
import { configuracionApi } from '@/features/configuracion/configuracionApi'
import { perfilApi } from '@/features/perfil/perfilApi'
import CampoCelular from '@/components/shared/CampoCelular'
import { SimpleTooltip } from '@/components/ui/tooltip'

const CLAVE_OCULTO = 'bourgelat:aviso-celular-oculto'

const leerOculto = () => {
  try {
    return sessionStorage.getItem(CLAVE_OCULTO) === '1'
  } catch {
    return false
  }
}

// Las cuentas creadas antes de que el celular fuera obligatorio no lo tienen, y
// sin él no hay cómo contactar a la clínica (el cobro de la suscripción sale con
// botón de WhatsApp al celular de la clínica). Se le pide solo al administrador;
// queda en la clínica y, si no tenía, también en su perfil.
export default function AvisoCelular() {
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const setUsuario = useAuthStore((state) => state.setUsuario)
  const setClinica = useAuthStore((state) => state.setClinica)
  const queryClient = useQueryClient()
  const [oculto, setOculto] = useState(leerOculto)
  const [celular, setCelular] = useState('')
  const [error, setError] = useState('')

  const { mutate: guardar, isPending } = useMutation({
    mutationFn: async (telefono) => {
      const [respuestaClinica, respuestaPerfil] = await Promise.all([
        configuracionApi.actualizarClinica({ telefono }),
        usuario?.telefono ? null : perfilApi.actualizarPerfil({ telefono }),
      ])
      return { clinica: respuestaClinica?.clinica, usuario: respuestaPerfil?.usuario }
    },
    onSuccess: (data) => {
      if (data.clinica) setClinica(data.clinica)
      if (data.usuario) setUsuario(data.usuario)
      invalidarDominios(queryClient, 'configuracion')
      toast.success('Celular guardado. ¡Gracias!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'No pudimos guardar el celular. Intenta de nuevo.')
    },
  })

  if (!hasRole(usuario, 'admin') || !clinica || clinica.telefono || oculto || esSoloLectura(suscripcion)) {
    return null
  }

  const ocultar = () => {
    try {
      sessionStorage.setItem(CLAVE_OCULTO, '1')
    } catch {
      // Sin almacenamiento solo se oculta hasta recargar.
    }
    setOculto(true)
  }

  const onSubmit = (event) => {
    event.preventDefault()
    if (!esCelularValido(celular)) {
      setError('Ese número no es válido para el país elegido')
      return
    }
    setError('')
    guardar(celular)
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="aviso-celular-titulo"
      className="mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-info-soft px-4 py-3 text-sm text-info sm:mx-6 lg:mx-10"
    >
      <Smartphone className="hidden h-5 w-5 shrink-0 sm:block" aria-hidden="true" />
      <p id="aviso-celular-titulo" className="min-w-[14rem] flex-1">
        <span className="font-semibold">Déjanos un celular de la clínica.</span> Lo usamos solo para
        avisarte de tu plan o ayudarte si algo falla.
      </p>
      <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto">
        <div className="min-w-0 flex-1 sm:w-64 sm:flex-none">
          <CampoCelular
            id="aviso-celular"
            aria-label="Celular de la clínica"
            value={celular}
            onChange={(valor) => {
              setCelular(valor || '')
              if (error) setError('')
            }}
            invalido={Boolean(error)}
          />
          {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground transition hover:brightness-105 active:translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <SimpleTooltip label="Más tarde">
          <button
            type="button"
            onClick={ocultar}
            aria-label="Más tarde"
            className="flex h-11 w-8 items-center justify-center text-info hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </SimpleTooltip>
      </div>
    </form>
  )
}
