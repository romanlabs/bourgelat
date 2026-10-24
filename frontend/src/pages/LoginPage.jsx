import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/shared/Logo'
import { useLogin, useCompletarRegistroOauth, pideVerificacion, useSesionVerificada } from '@/features/auth/useAuth'
import TurnstileWidget from '@/components/auth/TurnstileWidget'
import { turnstileHabilitado } from '@/lib/turnstile'
import { esOrigenOauthValido } from '@/lib/oauthPopup'
import CodigoVerificacionPaso from '@/features/auth/CodigoVerificacionPaso'
import RegistroDialog from '@/features/auth/RegistroDialog'
import BotonesSociales, { oauthHabilitado } from '@/features/auth/BotonesSociales'
import ConsentimientoRegistro from '@/features/auth/ConsentimientoRegistro'

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

const SELLOS = ['Tus datos cifrados', 'Soporte en español', '30 días de prueba']

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()
  const sesionVerificada = useSesionVerificada('login')
  const [emailPendiente, setEmailPendiente] = useState(null)
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [reinicio, setReinicio] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registroAbierto, setRegistroAbierto] = useState(
    () => searchParams.get('registro') === '1'
  )
  const [tokenOnboardingOauth, setTokenOnboardingOauth] = useState(null)
  const [aceptaTerminosOauth, setAceptaTerminosOauth] = useState(false)
  const { mutate: completarRegistroOauth, isPending: completandoOauth } = useCompletarRegistroOauth()

  useEffect(() => {
    const handler = (event) => {
      if (!esOrigenOauthValido(event.origin)) return
      if (event.data?.tipo === 'oauth-exito') {
        // Hard redirect (no navigate()): la sesión OAuth solo dejó cookies
        // httpOnly, y el authStore (Zustand) sigue vacío en esta pestaña. Un
        // navigate() de react-router no remonta App ni vuelve a correr el
        // AuthBootstrap de App.jsx que llama a authApi.me(). Necesitamos una
        // carga completa para poblar el store, igual que useLogout/useLogin.
        // Va al origen del popup (app.bourgelat.co aunque el login esté en
        // bourgelat.co), que es donde vive la app.
        window.location.assign(`${event.origin}/dashboard`)
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
    // Tras aceptar una invitación llega con su correo para que solo escriba la clave.
    reset({ email: location.state?.email || '', password: '' })
  }, [location.key, location.state, reset])

  const emailField = register('email')
  const passwordField = register('password')

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
    <div className="flex min-h-[100dvh] bg-background text-foreground lg:h-[100dvh] lg:overflow-hidden">
      <section
        aria-label="Bourgelat"
        className="hidden flex-1 flex-col justify-between gap-8 bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14 bajo:xl:p-10 muy-bajo:p-8"
      >
        {/* El logo definitivo está en camino: mientras tanto, el nombre. */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[26px] font-bold tracking-[-0.03em]">Bourgelat</span>
          <Link
            to="/"
            className="group inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>

        <div className="flex max-w-[520px] flex-col gap-5">
          <p className="text-[clamp(40px,4.4vw,64px)] bajo:text-[clamp(36px,3.6vw,52px)] muy-bajo:text-[clamp(32px,3vw,44px)] font-semibold leading-none tracking-[-0.045em]">
            La clínica entera, en orden.
          </p>
          <p className="text-lg leading-relaxed text-sidebar-foreground/85">
            Agenda, historias, inventario y caja en un solo lugar, hecho para veterinarias en Colombia.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2.5">
          {SELLOS.map((sello) => (
            <li key={sello} className="rounded-lg bg-sidebar-foreground/10 px-3 py-2 text-sm">
              {sello}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="login-titulo"
        className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-8 pt-20 sm:px-10 lg:py-6"
      >
        <Link
          to="/"
          className="group absolute left-4 top-4 inline-flex h-10 lg:hidden items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-6 sm:top-6"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          Volver al inicio
        </Link>

        <div className="w-full max-w-[420px]">
          <Logo className="mb-8 lg:hidden" />

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
            <button type="button" onClick={() => setRegistroAbierto(true)} className={enlaceClass}>
              Crea una cuenta
            </button>
          </p>
        </div>
      </section>

      <RegistroDialog open={registroAbierto} onOpenChange={handleRegistroOpenChange} />

      {tokenOnboardingOauth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4 dark:bg-background/80">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="oauth-ultimo-paso"
            className="w-full max-w-[420px] rounded-2xl bg-card p-6 shadow-modal"
          >
            <h2 id="oauth-ultimo-paso" className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
              Un último paso
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ¿Cómo se llama tu clínica?
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const formulario = new FormData(e.currentTarget)
                completarRegistroOauth({
                  token: tokenOnboardingOauth,
                  nombreClinica: formulario.get('nombreClinica'),
                  aceptaTerminos: aceptaTerminosOauth,
                  aceptaComunicaciones: formulario.get('aceptaComunicaciones') === 'on',
                })
              }}
            >
              <input
                name="nombreClinica"
                type="text"
                required
                aria-label="Nombre de la clínica"
                placeholder="Veterinaria San Roque"
                className={inputClass}
              />
              <ConsentimientoRegistro
                terminosProps={{
                  checked: aceptaTerminosOauth,
                  onChange: (e) => setAceptaTerminosOauth(e.target.checked),
                }}
                comunicacionesProps={{ name: 'aceptaComunicaciones' }}
              />
              <Button type="submit" disabled={completandoOauth || !aceptaTerminosOauth} className={botonPrincipalClass}>
                {completandoOauth ? 'Creando cuenta...' : 'Continuar'}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
