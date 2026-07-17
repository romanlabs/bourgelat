import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion as Motion } from 'motion/react'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/features/auth/useAuth'
import RegistroDialog from '@/features/auth/RegistroDialog'
import BotonesSociales, { oauthHabilitado } from '@/features/auth/BotonesSociales'

// Assets servidos desde public/ (Vite). El poster evita el flash inicial y
// actua como fallback estatico con movimiento reducido o si el video falla.
const LOGIN_VIDEO = '/videos/login.mp4'
const LOGIN_POSTER = '/videos/login.webp'

// Paleta calida y limpia que combina con el video (no beige, no azul):
//   INK     espresso para texto, titulo y boton
//   ACCENT  caramelo (el tono del cachorro) para eyebrow, link y foco
const INK = '#2b2018'
const ACCENT = '#b07645'

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (event) => setReduced(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const { mutate: login, isPending } = useLogin()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registroAbierto, setRegistroAbierto] = useState(
    () => searchParams.get('registro') === '1'
  )

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

  const fadeUp = (delay = 0) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
        }

  const showVideo = !reducedMotion && !videoFailed
  const inputClass =
    'h-14 w-full rounded-none border-0 border-b border-[#2b2018]/20 bg-transparent px-1 text-[15px] text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 focus:border-[#b07645]'

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white text-[#2b2018]">

      {/* Video — hijo directo del mismo contenedor flex que el navbar y el form */}
      {showVideo ? (
        <video
          className="login-media absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'scale(1.1) translateX(-5%)' }}
          src={LOGIN_VIDEO}
          poster={LOGIN_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={() => setVideoFailed(true)}
        />
      ) : (
        <img
          src={LOGIN_POSTER}
          alt=""
          aria-hidden="true"
          className="login-media absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'scale(1) translateX(-5%)' }}
        />
      )}

      {/* Velo móvil para legibilidad */}
      {/* Degradado desktop: cubre el área del formulario y se disuelve hacia los animales */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            'linear-gradient(90deg, #fdf6ee 0%, #fdf6ee 32%, rgba(253,246,238,0) 52%)',
        }}
      />

      {/* ── Barra superior ── */}
      <Motion.header
        initial={reducedMotion ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center justify-between px-5 pb-2 pt-4 sm:px-8"
      >
        <Link to="/" className="group inline-flex items-center gap-3 text-[#2b2018] no-underline">
          <span className="flex h-9 w-9 items-center justify-center bg-[#2b2018] text-white transition-colors duration-200 group-hover:bg-[#b07645]">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-none tracking-[-0.02em]">Bourgelat</span>
            <span className="mt-1 block text-[10px] uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
              acceso veterinario
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-[#2b2018]/50 no-underline transition-colors hover:text-[#2b2018] sm:inline-flex"
          >
            <ArrowRight className="h-3 w-3 rotate-180" />
            Volver al inicio
          </Link>
          <div className="hidden h-4 w-px bg-[#2b2018]/15 sm:block" />
          <button
            type="button"
            onClick={() => setRegistroAbierto(true)}
            className="group inline-flex items-center gap-2 bg-[#2b2018] px-4 py-2.5 text-[13px] font-semibold tracking-[0.04em] text-white transition-colors duration-200 hover:bg-[#b07645]"
          >
            Crear cuenta
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </nav>
      </Motion.header>

      {/* Difuminado bajo el navbar: funde el blanco del frosted glass con los tonos cálidos del video */}
      <div
        className="relative z-10 h-3 w-full pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(253,246,238,0.72) 0%, rgba(253,246,238,0.35) 55%, transparent 100%)',
        }}
      />

      {/* ── Contenido: una sola pantalla, formulario a la izquierda ── */}
      <main className="relative z-10 flex flex-1 items-center overflow-hidden pb-80 lg:pb-4">
        <div className="w-full px-5 sm:px-8 lg:pl-[15%] lg:pr-8">
          <div
            className="w-full max-w-[400px] border border-[#2b2018]/8 bg-white/95 px-8 py-8 backdrop-blur-sm"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -6px 20px rgba(43,32,24,0.05), 0 2px 4px rgba(43,32,24,0.04), 0 8px 20px rgba(43,32,24,0.08), 0 24px 56px rgba(43,32,24,0.10), 0 48px 80px rgba(43,32,24,0.05)' }}
          >
            <Motion.p
              {...fadeUp(0.05)}
              className="text-[11px] font-semibold uppercase tracking-[0.26em]"
              style={{ color: ACCENT }}
            >
              Portal de acceso
            </Motion.p>

            <Motion.h1
              {...fadeUp(0.12)}
              className="mt-3 text-[1.45rem] leading-[1.05] tracking-[-0.03em] text-[#2b2018] whitespace-nowrap"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Tu jornada clínica empieza aquí
            </Motion.h1>

            {searchParams.get('error') === 'oauth' ? (
              <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                No pudimos iniciar sesión con tu cuenta. Intenta de nuevo o usa tu correo y contraseña.
              </p>
            ) : null}

            {oauthHabilitado ? (
              <Motion.div {...fadeUp(0.16)} className="mt-6">
                <BotonesSociales contexto="login" />
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#2b2018]/12" />
                  <span className="text-xs font-medium uppercase tracking-wide text-[#2b2018]/45">o</span>
                  <div className="h-px flex-1 bg-[#2b2018]/12" />
                </div>
              </Motion.div>
            ) : null}

            <Motion.form
              {...fadeUp(0.2)}
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
              autoComplete="off"
            >
              <input type="text" name="login-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
              <input type="password" name="login-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">
                  Correo corporativo
                </label>
                <input
                  {...emailField}
                  type="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="Ejemplo@gmail.com"
                  className={`${inputClass} ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">
                  Contraseña
                </label>
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-[#2b2018]/55 transition hover:text-[#2b2018]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
                <div className="mt-2 text-right">
                  <Link
                    to="/recuperar-password"
                    className="text-[13px] font-medium hover:underline"
                    style={{ color: ACCENT }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="group h-14 w-full rounded-none bg-[#2b2018] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#3d2f24]"
              >
                {isPending ? 'Ingresando...' : 'Entrar a la plataforma'}
                {!isPending ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
              </Button>
            </Motion.form>

            <Motion.p {...fadeUp(0.28)} className="mt-6 text-sm text-[#2b2018]/60">
              ¿Primera vez en Bourgelat?{' '}
              <button
                type="button"
                onClick={() => setRegistroAbierto(true)}
                className="font-semibold hover:underline"
                style={{ color: ACCENT }}
              >
                Crear la cuenta de tu clínica
              </button>
            </Motion.p>
          </div>
        </div>
      </main>

      <RegistroDialog open={registroAbierto} onOpenChange={handleRegistroOpenChange} />
    </div>
  )
}
