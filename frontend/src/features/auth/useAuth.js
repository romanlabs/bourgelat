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

// El backend responde 403 con requiereVerificacion cuando la cuenta aun no
// confirmo su correo: no es un error para el usuario, es un paso mas.
export const pideVerificacion = (error) =>
  error?.response?.status === 403 && error.response.data?.requiereVerificacion === true

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
      if (pideVerificacion(error)) return
      toast.error(obtenerMensajeError(error, 'Error al iniciar sesión'))
    },
  })
}

export const useRegistro = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.registro,
    onSuccess: (data) => {
      // Con verificacion por codigo aun no hay sesion: el formulario muestra el
      // paso del codigo y la sesion se abre en useSesionVerificada.
      if (data?.requiereVerificacion) return
      setAuth({
        usuario: data.usuario,
        clinica: data.clinica,
        suscripcion: data.suscripcion || null,
      })
      toast.success('Clínica registrada exitosamente')
      navigate(data.usuario?.onboarding ? '/dashboard' : '/onboarding', { replace: true })
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'Error al registrar la clínica'))
    },
  })
}

// Devuelve la funcion que abre la sesion una vez confirmado el codigo.
// 'registro': mismo destino que tras crear la clinica. 'login': como un ingreso normal.
export const useSesionVerificada = (contexto = 'registro') => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return (data) => {
    setAuth({
      usuario: data.usuario,
      clinica: data.clinica,
      suscripcion: data.suscripcion || null,
    })
    if (contexto === 'login') {
      toast.success(`Bienvenido, ${data.usuario?.nombre || data.clinica?.nombre || 'Bourgelat'}`)
      navigate(hasRole(data.usuario, 'superadmin') ? '/superadmin' : '/dashboard', {
        replace: true,
      })
      return
    }
    toast.success('Clínica registrada exitosamente')
    navigate(data.usuario?.onboarding ? '/dashboard' : '/onboarding', { replace: true })
  }
}

export const useCompletarRegistroOauth = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: authApi.completarRegistroOauth,
    onSuccess: (data) => {
      setAuth({
        usuario: data.usuario,
        clinica: data.clinica,
        suscripcion: data.suscripcion || null,
      })
      toast.success('Clínica registrada exitosamente')
      navigate(data.usuario?.onboarding ? '/dashboard' : '/onboarding', { replace: true })
    },
  })
}

export const useForgotPassword = () =>
  useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos procesar la solicitud'))
    },
  })

export const useResetPassword = () =>
  useMutation({
    mutationFn: authApi.resetPassword,
  })

export const useVerificarEmail = () => {
  const usuario = useAuthStore((s) => s.usuario)
  const setUsuario = useAuthStore((s) => s.setUsuario)

  return useMutation({
    mutationFn: authApi.verificarEmail,
    onSuccess: () => {
      if (usuario) setUsuario({ ...usuario, emailVerificado: true })
    },
  })
}

export const useReenviarVerificacion = () =>
  useMutation({
    mutationFn: authApi.reenviarVerificacion,
    onSuccess: (data) => {
      toast.success(data?.message || 'Si el correo está registrado, recibirás un nuevo enlace.')
    },
    onError: (error) => {
      toast.error(obtenerMensajeError(error, 'No pudimos reenviar la verificación'))
    },
  })

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
      toast.info('Sesión cerrada')
      navigate('/login', {
        replace: true,
        state: { clearedAt: Date.now() },
      })
    }
  }

  return { logout }
}
