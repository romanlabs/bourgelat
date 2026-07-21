import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { perfilApi } from './perfilApi'

const obtenerMensajeError = (error, fallback) =>
  error?.response?.data?.message || fallback

export const useActualizarPerfil = () => {
  const setUsuario = useAuthStore((s) => s.setUsuario)

  return useMutation({
    mutationFn: perfilApi.actualizarPerfil,
    onSuccess: (data) => {
      if (data?.usuario) setUsuario(data.usuario)
      toast.success('Perfil actualizado')
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos actualizar tu perfil'))
    },
  })
}

export const useSubirFotoPerfil = () =>
  useMutation({
    mutationFn: perfilApi.subirFoto,
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos subir la foto'))
    },
  })

export const useCambiarPassword = () =>
  useMutation({
    mutationFn: perfilApi.cambiarPassword,
    onSuccess: () => {
      toast.success('Contraseña actualizada')
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos cambiar la contraseña'))
    },
  })
