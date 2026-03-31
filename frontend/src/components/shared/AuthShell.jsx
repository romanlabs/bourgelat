import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Building2,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'

const EXPERIENCES = {
  login: {
    eyebrow: 'Acceso del equipo',
    title: 'Ingreso claro, sereno y listo para la jornada clinica.',
    description:
      'La entrada al sistema debe sentirse confiable desde el primer segundo: limpia, legible y enfocada en la operacion real de la clinica.',
    bullets: [
      {
        icon: ShieldCheck,
        title: 'Acceso sin ruido',
        body: 'El formulario aparece primero y la informacion secundaria acompana sin competir.',
      },
      {
        icon: Activity,
        title: 'Contexto operativo',
        body: 'La cuenta recupera la clinica y el rol para continuar la jornada sin friccion.',
      },
      {
        icon: BadgeCheck,
        title: 'Lenguaje visual medico',
        body: 'Superficies suaves, contraste estable y una lectura mas profesional.',
      },
    ],
    footerLabel: 'Disponibilidad',
    footerValue: 'Pantalla lista para iniciar turno',
  },
  register: {
    eyebrow: 'Alta de la clinica',
    title: 'Crear la cuenta principal con datos limpios y estructura clara.',
    description:
      'El registro se reorganiza como una admision: primero la institucion, luego el responsable y al final la seguridad de acceso.',
    bullets: [
      {
        icon: Building2,
        title: 'Clinica antes que todo',
        body: 'Los datos del establecimiento se ordenan primero para reducir errores desde el alta.',
      },
      {
        icon: ShieldCheck,
        title: 'Validaciones reales',
        body: 'Telefono colombiano, correos consistentes y campos acotados desde el inicio.',
      },
      {
        icon: BadgeCheck,
        title: 'Base lista para operar',
        body: 'La cuenta principal queda preparada para entrar directo al sistema.',
      },
    ],
    footerLabel: 'Flujo guiado',
    footerValue: 'Tres bloques simples para empezar',
  },
}

const MODE_LINKS = [
  { key: 'login', label: 'Iniciar sesion', to: '/login' },
  { key: 'register', label: 'Registrar clinica', to: '/registro' },
]

function ModeSwitcher({ variant }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-[#d8e4ef] bg-[#f5f9fd] p-2">
      {MODE_LINKS.map((item) => {
        const active = item.key === variant

        return (
          <Link
            key={item.key}
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[18px] px-4 py-3 text-center text-sm font-semibold no-underline transition ${
              active
                ? 'bg-[#12324b] text-white shadow-[0_18px_38px_rgba(18,50,75,0.18)]'
                : 'text-[#12324b]/58 hover:bg-white hover:text-[#12324b]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function AuthShell({
  variant = 'login',
  modeLabel,
  title,
  description,
  stepper,
  children,
  footer,
}) {
  const experience = EXPERIENCES[variant] ?? EXPERIENCES.login

  return (
    <div className="min-h-screen bg-[#f4f8fc] text-[#12324b]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_top,#d7eafe_0%,rgba(215,234,254,0.34)_42%,transparent_72%)]" />
        <div className="absolute left-[-8rem] top-[-6rem] h-80 w-80 rounded-full bg-[#d7eafe] blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-4rem] h-96 w-96 rounded-full bg-[#cde7f6] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(18,50,75,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18,50,75,0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at center, black 60%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1380px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-[30px] border border-[#d8e4ef] bg-white/88 px-5 py-4 shadow-[0_18px_50px_rgba(18,50,75,0.06)] backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="inline-flex items-center gap-3 text-[#12324b] no-underline">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1f6fb2] text-white shadow-[0_20px_40px_rgba(31,111,178,0.22)]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.02em]">Bourgelat</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#12324b]/44">
                  software veterinario
                </p>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#d8e4ef] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#12324b]/72 no-underline transition hover:border-[#9dc6e6] hover:text-[#12324b]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <main className="order-1">
            <section className="overflow-hidden rounded-[40px] border border-[#d8e4ef] bg-white shadow-[0_28px_90px_rgba(18,50,75,0.08)]">
              <div className="h-2 w-full bg-[linear-gradient(90deg,#1f6fb2_0%,#46a3d9_54%,#8ed1c3_100%)]" />
              <div className="p-6 sm:p-8 lg:p-10">
                <ModeSwitcher variant={variant} />

                <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#d9ecf7] bg-[#eff7fc] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1f6fb2]">
                  <span className="h-2 w-2 rounded-full bg-[#1f6fb2]" />
                  {modeLabel}
                </div>

                <h1 className="mt-5 max-w-3xl text-[40px] font-semibold leading-[0.95] tracking-[-0.04em] text-[#12324b] sm:text-[54px]">
                  {title}
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#12324b]/64 sm:text-base">
                  {description}
                </p>

                {stepper ? <div className="mt-6">{stepper}</div> : null}

                <div className="mt-8">{children}</div>

                {footer ? <div className="mt-8 border-t border-[#d8e4ef] pt-5">{footer}</div> : null}
              </div>
            </section>
          </main>

          <aside className="order-2">
            <section className="overflow-hidden rounded-[34px] border border-[#1d4f76] bg-[linear-gradient(180deg,#154265_0%,#12324b_100%)] text-white shadow-[0_28px_80px_rgba(18,50,75,0.24)]">
              <div className="border-b border-white/10 px-6 py-6 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9dd5f2]">
                  {experience.eyebrow}
                </p>
                <h2 className="mt-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.03em]">
                  {experience.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {experience.description}
                </p>
              </div>

              <div className="space-y-3 px-6 py-6 sm:px-7">
                {experience.bullets.map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-[#9dd5f2]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/66">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-white/10 bg-white/6 px-6 py-5 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9dd5f2]">
                  {experience.footerLabel}
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {experience.footerValue}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
