// frontend/src/features/onboarding/useOnboarding.js
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { onboardingApi } from './onboardingApi'

export const useGuardarOnboarding = () => {
  const setUsuario = useAuthStore((s) => s.setUsuario)

  return useMutation({
    mutationFn: onboardingApi.guardar,
    onSuccess: (data) => {
      setUsuario(data.usuario)
    },
  })
}
