// frontend/src/features/onboarding/useOnboarding.js
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { onboardingApi } from './onboardingApi'

const obtenerMensajeError = (error, fallback) =>
  error.response?.data?.errores?.[0]?.mensaje ||
  error.response?.data?.message ||
  fallback

export const useGuardarOnboarding = () => {
  const setUsuario = useAuthStore((s) => s.setUsuario)

  return useMutation({
    mutationFn: onboardingApi.guardar,
    onSuccess: (data) => {
      setUsuario(data.usuario)
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos guardar tus respuestas. Intenta de nuevo.'))
    },
  })
}
