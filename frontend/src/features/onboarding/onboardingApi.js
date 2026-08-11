// frontend/src/features/onboarding/onboardingApi.js
import api from '@/lib/api'

export const onboardingApi = {
  guardar: async (respuestas) => {
    const { data } = await api.patch('/usuarios/onboarding', respuestas)
    return data
  },
}
