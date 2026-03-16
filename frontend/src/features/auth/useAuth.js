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
        token: data.token,
        clinica: data.clinica,
      })
      toast.success(`Bienvenido, ${data.clinica.nombre}`)
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
        token: data.token,
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

  const logout = () => {
    clearAuth()
    toast.info('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  return { logout }
}
