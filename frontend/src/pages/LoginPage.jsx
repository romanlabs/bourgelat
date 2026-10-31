import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogin, pideVerificacion, useSesionVerificada } from '@/features/auth/useAuth'
import TurnstileWidget from '@/components/auth/TurnstileWidget'
import { turnstileHabilitado } from '@/lib/turnstile'
import CodigoVerificacionPaso from '@/features/auth/CodigoVerificacionPaso'
import BotonesSociales, { oauthHabilitado } from '@/features/auth/BotonesSociales'
import AuthLayout from '@/features/auth/AuthLayout'
import { useMensajesOauth } from '@/features/auth/useMensajesOauth'

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const inputClass =
  'h-12 w-full rounded-lg border border-input bg-card px-4 text-base muy-bajo:h-11 text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary'

const labelClass = 'mb-2 muy-bajo:mb-1.5 block text-sm font-semibold text-foreground'

const botonPrincipalClass =
  'h-12 w-full text-base muy-bajo:h-11'

const enlaceClass =
  'rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()
  const sesionVerificada = useSesionVerificada('login')
  const [emailPendiente, setEmailPendiente] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [reinicio, setReinicio] = useState(0)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  useMensajesOauth()

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
    // Tras aceptar una invitación llega con su correo para que solo escriba la clave.
    reset({ email: location.state?.email || '', password: '' })
  }, [location.key, location.state, reset])

  const emailField = register('email')
  const passwordField = register('password')

  // Enlaces viejos: el registro era una ventana dentro de /login.
  if (searchParams.get('registro') === '1') return <Navigate to="/registro" replace />

  const onSubmit = (data) => {
    const email = normalizarEmail(data.email)
    login(
      { email, password: data.password, turnstileToken },
      {
        onError: (error) => {
          if (pideVerificacion(error)) setEmailPendiente(error.response.data.email || email)
          setReinicio((n) => n + 1)
        },
      }
    )
  }

  return (
    <AuthLayout tituloId="login-titulo">

          <div className={emailPendiente ? 'hidden' : ''}>
            <h1 id="login-titulo" className="text-[40px] bajo:text-[34px] muy-bajo:text-[30px] font-semibold leading-none tracking-[-0.04em] text-foreground">
              Hola de nuevo
            </h1>
            <p className="mt-1.5 text-base text-muted-foreground">Entra con tu cuenta de la clínica</p>
          </div>

          {searchParams.get('error') === 'oauth' ? (
            <p role="alert" className="mt-6 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
              No pudimos iniciar sesión con tu cuenta. Intenta de nuevo o usa tu correo y contraseña.
            </p>
          ) : null}

          {searchParams.get('error') === 'invitacion' ? (
            <p role="alert" className="mt-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
              Tienes una invitación pendiente. Ábrela desde el enlace que llegó a tu correo para crear tu contraseña.
            </p>
          ) : null}

          {emailPendiente ? (
            <div className="rounded-2xl bg-card p-6">
              <CodigoVerificacionPaso
                email={emailPendiente}
                onVerificado={sesionVerificada}
                onVolver={() => {
                  setEmailPendiente(null)
                  setReinicio((n) => n + 1)
                }}
              />
            </div>
          ) : null}

          {oauthHabilitado && !emailPendiente ? (
            <div className="mt-8 bajo:mt-6 muy-bajo:mt-4">
              <BotonesSociales contexto="login" />
              <div className="mt-5 muy-bajo:mt-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[13px] text-muted-foreground">o con tu correo</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className={`${oauthHabilitado ? 'mt-5 muy-bajo:mt-3' : 'mt-8 bajo:mt-6'} space-y-5 bajo:space-y-4 muy-bajo:space-y-3 ${emailPendiente ? 'hidden' : ''}`}
            autoComplete="off"
          >
            <input type="text" name="login-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
            <input type="password" name="login-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

            <div>
              <label htmlFor="login-email" className={labelClass}>
                Correo
              </label>
              <input
                {...emailField}
                id="login-email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                placeholder="tu@clinica.co"
                aria-invalid={errors.email ? 'true' : undefined}
                className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
              />
              {errors.email ? <p className="mt-1.5 text-sm text-danger">{errors.email.message}</p> : null}
            </div>

            <div>
              <div className="mb-2 muy-bajo:mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
                  Contraseña
                </label>
                <Link to="/recuperar-password" className={`text-sm ${enlaceClass}`}>
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...passwordField}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="Tu contraseña"
                  aria-invalid={errors.password ? 'true' : undefined}
                  className={`${inputClass} pr-12 ${errors.password ? 'border-danger' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
              {errors.password ? <p className="mt-1.5 text-sm text-danger">{errors.password.message}</p> : null}
            </div>

            <TurnstileWidget resetKey={reinicio} onToken={setTurnstileToken} />

            <Button
              type="submit"
              disabled={isPending || (turnstileHabilitado && !turnstileToken)}
              className={botonPrincipalClass}
            >
              {isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className={`mt-6 bajo:mt-4 muy-bajo:mt-3 text-center text-[15px] text-muted-foreground ${emailPendiente ? 'hidden' : ''}`}>
            ¿Tu clínica aún no usa Bourgelat?{' '}
            <Link to="/registro" className={enlaceClass}>
              Crea una cuenta
            </Link>
          </p>
    </AuthLayout>
  )
}
