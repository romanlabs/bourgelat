import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useLogin, useCompletarRegistroOauth } from '@/features/auth/useAuth'
import RegistroDialog from '@/features/auth/RegistroDialog'
import BotonesSociales, { oauthHabilitado } from '@/features/auth/BotonesSociales'

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const inputClass =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registroAbierto, setRegistroAbierto] = useState(
    () => searchParams.get('registro') === '1'
  )
  const [tokenOnboardingOauth, setTokenOnboardingOauth] = useState(null)
  const { mutate: completarRegistroOauth, isPending: completandoOauth } = useCompletarRegistroOauth()

  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.tipo === 'oauth-exito') {
        // Hard redirect (no navigate()): la sesión OAuth solo dejó cookies
        // httpOnly, y el authStore (Zustand) sigue vacío en esta pestaña. Un
        // navigate() de react-router no remonta App ni vuelve a correr el
        // AuthBootstrap de App.jsx que llama a authApi.me(). Necesitamos una
        // carga completa para poblar el store, igual que useLogout/useLogin.
        window.location.assign('/dashboard')
      } else if (event.data?.tipo === 'oauth-nuevo' && event.data.token) {
        setTokenOnboardingOauth(event.data.token)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate])

  const handleRegistroOpenChange = (abierto) => {
    setRegistroAbierto(abierto)
    if (!abierto && searchParams.get('registro') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('registro')
      setSearchParams(next, { replace: true })
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    reset({ email: '', password: '' })
  }, [location.key, location.state, reset])

  const emailField = register('email')
  const passwordField = register('password')

  const onSubmit = (data) => {
    login({ email: normalizarEmail(data.email), password: data.password })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px] text-center">
        <Logo className="justify-center" />

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Ingresa a tu cuenta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tu clínica en un solo lugar
        </p>
      </div>

      <div className="mt-8 w-full max-w-[420px] text-left">
        {searchParams.get('error') === 'oauth' ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            No pudimos iniciar sesión con tu cuenta. Intenta de nuevo o usa tu correo y contraseña.
          </p>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
          <input type="text" name="login-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="login-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Correo electrónico
            </label>
            <input
              {...emailField}
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              inputMode="email"
              spellCheck={false}
              placeholder="tu@correo.com"
              className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Contraseña</label>
              <Link to="/recuperar-password" className="text-sm font-medium text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                {...passwordField}
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Ingresa tu contraseña"
                className={`${inputClass} pr-10 ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        {oauthHabilitado ? (
          <div className="mt-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">o</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <BotonesSociales contexto="login" />
          </div>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Primera vez en Bourgelat?{' '}
          <button
            type="button"
            onClick={() => setRegistroAbierto(true)}
            className="font-semibold text-primary hover:underline"
          >
            Crear cuenta
          </button>
        </p>
      </div>

      <RegistroDialog open={registroAbierto} onOpenChange={handleRegistroOpenChange} />

      {tokenOnboardingOauth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[380px] rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Un último paso</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ¿Cómo se llama tu clínica?
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                const nombreClinica = new FormData(e.currentTarget).get('nombreClinica')
                completarRegistroOauth({ token: tokenOnboardingOauth, nombreClinica })
              }}
            >
              <input
                name="nombreClinica"
                type="text"
                required
                placeholder="Clínica Veterinaria Bourgelat"
                className={inputClass}
              />
              <Button type="submit" disabled={completandoOauth} className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                {completandoOauth ? 'Creando cuenta...' : 'Continuar'}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
