import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { hasRole } from '@/lib/permissions'
import { authApi } from './authApi'

const obtenerMensajeError = (error, fallback) =>
  error.response?.data?.errores?.[0]?.mensaje ||
  error.response?.data?.message ||
  fallback

export const useLogin = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth({
        usuario: data.usuario,
        clinica: data.clinica,
        suscripcion: data.suscripcion || null,
      })
      toast.success(`Bienvenido, ${data.usuario?.nombre || data.clinica?.nombre || 'Bourgelat'}`)
      navigate(hasRole(data.usuario, 'superadmin') ? '/superadmin' : '/dashboard', {
        replace: true,
      })
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'Error al iniciar sesion'))
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
        usuario: data.usuario,
        clinica: data.clinica,
        suscripcion: data.suscripcion || null,
      })
      toast.success('Clinica registrada exitosamente')
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'Error al registrar la clinica'))
    },
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Limpiar igual aunque falle el cierre remoto.
    } finally {
      clearAuth()
      toast.info('Sesion cerrada')
      navigate('/login', {
        replace: true,
        state: { clearedAt: Date.now() },
      })
    }
  }

  return { logout }
}
