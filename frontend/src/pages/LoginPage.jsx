import { createElement, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  PawPrint,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import loginHero from '@/assets/auth/login-hero.webp'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/features/auth/useAuth'

void motion

const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo corporativo valido'),
  password: z.string().min(1, 'Ingresa tu contrasena'),
})

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const MODULES = [
  { icon: CalendarClock, label: 'Agenda' },
  { icon: HeartPulse, label: 'Pacientes' },
  { icon: ReceiptText, label: 'Facturacion DIAN' },
]

function SurfaceField({ icon, error, action, children }) {
  return (
    <div className="rounded-[28px] border border-[#d7e1ea] bg-[#f8fbfd] p-4 shadow-[0_18px_40px_rgba(19,38,58,0.05)]">
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[16px] bg-white text-[#567087] shadow-[0_12px_24px_rgba(19,38,58,0.08)]">
          {createElement(icon, { className: 'h-4 w-4' })}
        </div>
        {children}
        {action ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{action}</div> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  )
}

function InsightPill({ icon, children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-md">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/12 text-[#d9f0e6]">
        {createElement(icon, { className: 'h-4 w-4' })}
      </span>
      <span className="text-sm font-medium text-white/88">{children}</span>
    </div>
  )
}

function ModuleChip({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e5ee] bg-white px-3 py-2 text-sm text-[#27425a] shadow-[0_10px_22px_rgba(19,38,58,0.05)]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf4f9] text-[#5a7893]">
        {createElement(icon, { className: 'h-3.5 w-3.5' })}
      </span>
      {label}
    </div>
  )
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    reset({
      email: '',
      password: '',
    })
  }, [location.key, location.state, reset])

  const emailField = register('email')
  const passwordField = register('password')

  const onSubmit = (data) => {
    login({
      email: normalizarEmail(data.email),
      password: data.password,
    })
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#0b1623] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_top,#17324a_0%,rgba(23,50,74,0.45)_42%,transparent_74%)]" />
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#224f73]/45 blur-3xl" />
        <div className="absolute bottom-[-5rem] right-[-4rem] h-96 w-96 rounded-full bg-[#749e8a]/22 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(238,247,252,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(238,247,252,0.7) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(circle at top, black 20%, transparent 78%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/6 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3 text-white no-underline">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8db8dd_0%,#6d9fe0_58%,#86b6a6_100%)] text-[#0b1623] shadow-[0_18px_40px_rgba(109,159,224,0.24)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.02em]">Bourgelat</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/48">
                acceso de operacion veterinaria
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-white/72 no-underline transition hover:border-white/24 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 rounded-full bg-[#eef4ef] px-4 py-2 text-sm font-semibold text-[#183127] no-underline transition hover:bg-white"
            >
              Crear cuenta principal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(420px,540px)_minmax(0,1fr)]">
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[38px] border border-white/12 bg-white/[0.94] p-6 text-[#13263a] shadow-[0_36px_120px_rgba(5,11,18,0.34)] sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(120,164,195,0.18),transparent_70%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d9e5ee] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b7d97]">
                <span className="h-2 w-2 rounded-full bg-[#86b6a6]" />
                Portal de ingreso
              </div>

              <h1
                className="mt-5 text-[46px] leading-[0.93] tracking-[-0.04em] text-[#13263a] sm:text-[58px]"
                style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
              >
                Tu jornada clinica empieza aqui
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#4e677a]">
                Accede al espacio de trabajo de tu clinica desde un entorno claro, seguro y listo para consultas, pacientes y facturacion.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {MODULES.map((module) => (
                  <ModuleChip key={module.label} icon={module.icon} label={module.label} />
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-[30px] border border-[#d9e5ee] lg:hidden">
                <div className="relative h-56">
                  <img
                    src={loginHero}
                    alt="Veterinaria atendiendo a un perro en consulta"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,23,36,0.04)_0%,rgba(12,23,36,0.68)_100%)]" />
                  <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
                    <InsightPill icon={PawPrint}>Consulta en tiempo real</InsightPill>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" autoComplete="off">
                <input type="text" name="login-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
                <input type="password" name="login-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />
                <div>
                  <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5b7d97]">
                    Correo corporativo
                  </label>
                  <SurfaceField icon={Mail} error={errors.email?.message}>
                    <input
                      {...emailField}
                      type="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      inputMode="email"
                      spellCheck={false}
                      placeholder="direccion.medica@bourgelat.co"
                      className={`h-16 w-full rounded-[22px] border bg-white pl-16 pr-4 text-[15px] text-[#13263a] outline-none transition placeholder:text-[#7f95a6] focus:border-[#7ba0cb] focus:ring-4 focus:ring-[#7ba0cb]/12 ${
                        errors.email ? 'border-red-400' : 'border-[#d7e1ea]'
                      }`}
                    />
                  </SurfaceField>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5b7d97]">
                      Contrasena
                    </label>
                    <span className="text-xs text-[#678397]">
                      Acceso para usuarios activos de la clinica
                    </span>
                  </div>
                  <SurfaceField
                    icon={LockKeyhole}
                    error={errors.password?.message}
                    action={(
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="text-[#678397] transition hover:text-[#13263a]"
                        aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  >
                    <input
                      {...passwordField}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      placeholder="Ingresa tu contrasena"
                      className={`h-16 w-full rounded-[22px] border bg-white pl-16 pr-14 text-[15px] text-[#13263a] outline-none transition placeholder:text-[#7f95a6] focus:border-[#7ba0cb] focus:ring-4 focus:ring-[#7ba0cb]/12 ${
                        errors.password ? 'border-red-400' : 'border-[#d7e1ea]'
                      }`}
                    />
                  </SurfaceField>
                </div>

                <div className="rounded-[28px] border border-[#d8e6de] bg-[linear-gradient(135deg,#f5fbf8_0%,#edf6f2_100%)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#5f8c78] shadow-[0_10px_22px_rgba(95,140,120,0.14)]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1f3a2e]">Ingreso seguro y contextual</p>
                      <p className="mt-1.5 text-sm leading-6 text-[#456356]">
                        El sistema reconoce el usuario, su clinica y el contexto operativo para llevarlo directo al dashboard correcto.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 h-[60px] w-full rounded-full bg-[linear-gradient(135deg,#173b58_0%,#315c7e_62%,#6c9a8f_100%)] px-6 text-sm font-semibold text-white shadow-[0_22px_48px_rgba(23,59,88,0.28)] transition hover:opacity-95"
                >
                  {isPending ? 'Ingresando al entorno clinico...' : 'Entrar a la plataforma'}
                  {!isPending ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              </form>

              <div className="mt-6 border-t border-[#d9e5ee] pt-5 text-sm text-[#5f7284]">
                Primera vez en Bourgelat?{' '}
                <Link to="/registro" className="font-semibold text-[#214864] no-underline hover:text-[#13263a]">
                  Configurar la cuenta principal de la clinica
                </Link>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="hidden xl:block"
          >
            <div className="relative h-full min-h-[820px] overflow-hidden rounded-[42px] border border-white/10 shadow-[0_50px_140px_rgba(4,10,18,0.42)]">
              <img
                src={loginHero}
                alt="Veterinaria revisando a un perro en una consulta moderna"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(7,16,27,0.14)_10%,rgba(7,16,27,0.3)_38%,rgba(7,16,27,0.84)_100%)]" />
              <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(7,16,27,0.64)_0%,transparent_100%)]" />

              <div className="absolute left-6 right-6 top-6 flex flex-wrap gap-2">
                <InsightPill icon={PawPrint}>Caninos y felinos</InsightPill>
                <InsightPill icon={Building2}>Clinica principal</InsightPill>
              </div>

              <div className="absolute left-6 top-24 w-[250px] rounded-[24px] border border-white/10 bg-white/10 p-4 text-white backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d9f0e6]">
                  Operacion diaria
                </p>
                <p className="mt-3 text-sm font-semibold leading-6">
                  Agenda, historia y caja dentro del mismo recorrido.
                </p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Menos capas sobre la imagen, mas contexto clinico y una escena mas limpia.
                </p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d9f0e6]">
                    Operacion veterinaria centralizada
                  </p>
                  <h2
                    className="mt-4 text-[52px] leading-[0.92] tracking-[-0.04em] text-white"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
                  >
                    Todo el equipo entra al mismo flujo de atencion.
                  </h2>
                  <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/72">
                    Desde este acceso se concentra la agenda, la historia clinica y la facturacion para sostener una operacion diaria ordenada.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
