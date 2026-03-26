import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { authApi } from './authApi'

export const useLogin = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        usuario: data.usuario,
        clinica: data.clinica,
      })
      toast.success(`Bienvenido, ${data.usuario?.nombre || data.clinica?.nombre || 'Bourgelat'}`)
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const mensaje = error.response?.data?.message || 'Error al iniciar sesión'
      toast.error(mensaje)
    },
  })
}

export const useRegistro = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.registro,
    onSuccess: (data) => {
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        usuario: data.usuario,
        clinica: data.clinica,
      })
      toast.success('¡Clínica registrada exitosamente!')
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const mensaje = error.response?.data?.message || 'Error al registrar la clínica'
      toast.error(mensaje)
    },
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const getRefreshToken = useAuthStore((s) => s.getRefreshToken)

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch {
      // Limpiar igual aunque falle
    } finally {
      clearAuth()
      toast.info('Sesión cerrada')
      navigate('/login', { replace: true })
    }
  }

  return { logout }
}
