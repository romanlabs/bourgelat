import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import landingHeroConsultation from '@/assets/auth/landing-hero-consultation.webp'
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Globe,
  HeartPulse,
  Layers,
  Mail,
  Menu,
  Package,
  PawPrint,
  Receipt,
  Shield,
  Stethoscope,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Experiencia', href: '#experiencia' },
  { label: 'Flujo', href: '#flujo' },
  { label: 'Planes', href: '#planes' },
  { label: 'Contacto', href: '#contacto' },
]

const EXPERIENCE_CARDS = [
  {
    icon: Calendar,
    title: 'Recepcion que no pierde el ritmo',
    body:
      'Agenda, confirmaciones y llegada del paciente en una experiencia clara para recepcion y auxiliares.',
    points: ['Citas visibles', 'Recordatorios utiles', 'Menos llamadas repetidas'],
  },
  {
    icon: HeartPulse,
    title: 'Consulta con historia y contexto',
    body:
      'El veterinario entra a la cita con antecedentes, evolucion y seguimiento en el mismo recorrido.',
    points: ['Historia clinica', 'Observaciones utiles', 'Continuidad por paciente'],
  },
  {
    icon: Receipt,
    title: 'Caja y cierre sin doble trabajo',
    body:
      'Cobro, inventario y cierre del dia se sienten conectados, no como tareas sueltas al final de la jornada.',
    points: ['Caja ordenada', 'Inventario conectado', 'Mas trazabilidad'],
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Agenda y recepcion',
    body:
      'Desde la primera llamada hasta la llegada a consulta, el equipo ve el mismo contexto y el mismo horario.',
  },
  {
    step: '02',
    title: 'Consulta y evolucion',
    body:
      'La historia clinica deja de vivir en hojas sueltas: cada visita, antecedente y observacion queda en un mismo hilo.',
  },
  {
    step: '03',
    title: 'Cobro y seguimiento',
    body:
      'El cierre administrativo queda amarrado al caso real para que la clinica cobre, reponga y haga seguimiento sin friccion.',
  },
]

const PRODUCT_PANELS = [
  {
    icon: Layers,
    title: 'Una sola plataforma',
    body:
      'Agenda, pacientes, historia clinica, inventario, caja y reportes dentro de una misma experiencia.',
  },
  {
    icon: Bell,
    title: 'Menos olvidos',
    body:
      'Recordatorios, proximos pasos y tareas visibles para que el equipo no dependa de memoria o chats dispersos.',
  },
  {
    icon: Package,
    title: 'Operacion mas solida',
    body:
      'Lo clinico y lo administrativo se sienten conectados, asi que el trabajo diario deja mas orden que desgaste.',
  },
  {
    icon: Globe,
    title: 'Pensado para Colombia',
    body:
      'Facturacion electronica DIAN disponible cuando la clinica ya necesita ese nivel de operacion.',
  },
]

const PLAN_PREVIEW = [
  {
    name: 'Esencial',
    subtitle: 'Para empezar con orden',
    price: 'Sin cargo mensual',
    note: 'Agenda, pacientes e historia clinica para arrancar con una base clara.',
  },
  {
    name: 'Clinica',
    subtitle: 'Para operar el dia completo',
    price: 'COP 99.000/mes',
    note: 'Inventario, caja y reportes para una clinica que ya necesita control operativo.',
  },
  {
    name: 'Profesional',
    subtitle: 'El plan principal',
    price: 'COP 189.000/mes',
    note: 'Incluye facturacion electronica DIAN y una operacion mas completa.',
    featured: true,
  },
  {
    name: 'Personalizado',
    subtitle: 'Para migracion y acompanamiento',
    price: 'Cotizacion guiada',
    note: 'Cuando la clinica necesita una implementacion mas acompasada con el equipo.',
  },
]

const footerLinks = [
  { label: 'Planes', to: '/planes' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Privacidad', to: '/privacidad' },
  { label: 'Terminos', to: '/terminos' },
  { label: 'Cookies', to: '/cookies' },
]

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_18px_40px_rgba(92,206,198,0.2)] ${
          dark
            ? 'bg-white/12 text-white'
            : 'bg-[linear-gradient(135deg,#8fe0da,#b8eff0)] text-[#082033]'
        }`}
      >
        <Stethoscope className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-lg font-semibold tracking-[-0.03em] ${dark ? 'text-white' : 'text-[#0f2437]'}`}>
          Bourgelat
        </p>
        <p
          className={`text-[11px] uppercase tracking-[0.22em] ${
            dark ? 'text-white/50' : 'text-[#5a7188]'
          }`}
        >
          software veterinario para Colombia
        </p>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, body, dark = false, center = false }) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
          dark ? 'text-[#91e7e0]' : 'text-[#3c7d8d]'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-4 text-4xl leading-none tracking-[-0.05em] sm:text-5xl md:text-6xl ${
          dark ? 'text-white' : 'text-[#10263a]'
        }`}
        style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
      >
        {title}
      </h2>
      <p
        className={`mt-5 text-base leading-8 sm:text-lg ${
          dark ? 'text-white/72' : 'text-[#51697d]'
        }`}
      >
        {body}
      </p>
    </div>
  )
}

function LandingNav() {
  const [open, setOpen] = useState(false)
  const [navTheme, setNavTheme] = useState('dark')
  const headerRef = useRef(null)

  useEffect(() => {
    const parseRgbChannels = (value) => {
      const match = value.match(/\d+(\.\d+)?/g)

      if (!match || match.length < 3) {
        return null
      }

      return [Number(match[0]), Number(match[1]), Number(match[2])]
    }

    const isLightColor = (rgb) => {
      const [r, g, b] = rgb
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance > 150
    }

    const syncNavTheme = () => {
      // Keep the top-of-page header in dark mode to avoid the initial gray flash.
      if (window.scrollY < 120) {
        setNavTheme('dark')
        return
      }

      const probeX = Math.max(Math.min(window.innerWidth / 2, window.innerWidth - 1), 0)
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 76
      const probeY = Math.max(Math.min(Math.round(headerHeight + 10), window.innerHeight - 1), 0)
      const elements = document.elementsFromPoint(probeX, probeY)

      for (const element of elements) {
        if (!(element instanceof HTMLElement)) {
          continue
        }

        if (element === headerRef.current || headerRef.current?.contains(element)) {
          continue
        }

        const style = window.getComputedStyle(element)
        const background = style.backgroundColor

        if (!background || background === 'transparent' || background.includes('rgba(0, 0, 0, 0)')) {
          continue
        }

        const rgb = parseRgbChannels(background)

        if (rgb) {
          setNavTheme(isLightColor(rgb) ? 'light' : 'dark')
          return
        }
      }

      setNavTheme(window.scrollY > 36 ? 'light' : 'dark')
    }

    syncNavTheme()
    window.addEventListener('scroll', syncNavTheme, { passive: true })
    window.addEventListener('resize', syncNavTheme)

    return () => {
      window.removeEventListener('scroll', syncNavTheme)
      window.removeEventListener('resize', syncNavTheme)
    }
  }, [])

  const isLight = navTheme === 'light'

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        isLight
          ? 'border-[#c9dcea] bg-[rgba(229,244,251,0.82)] shadow-[0_14px_38px_rgba(11,34,50,0.08)]'
          : 'border-white/18 bg-[rgba(4,12,20,0.72)] shadow-[0_16px_46px_rgba(3,11,19,0.34)]'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="no-underline">
          <BrandMark dark={!isLight} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium no-underline transition-colors ${
                isLight
                  ? 'text-[#173048] hover:bg-[#eef4f7] hover:text-[#0d2435]'
                  : 'text-white/90 hover:bg-white/8 hover:text-[#91e7e0]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className={`rounded-full border px-4 py-2 text-sm font-semibold no-underline transition-colors ${
              isLight
                ? 'border-[#b8cad9] bg-white/70 text-[#10273a] hover:border-[#a8bfd1] hover:bg-white'
                : 'border-white/28 bg-[rgba(6,18,31,0.32)] text-white hover:border-white/45 hover:bg-white/12'
            }`}
          >
            Iniciar sesion
          </Link>
          <Link
            to="/registro"
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold no-underline transition-colors ${
              isLight
                ? 'border border-[#cfe6e2] bg-[#e9f7f3] text-[#0d2435] shadow-[0_12px_30px_rgba(143,224,218,0.14)] hover:bg-[#f2fbf9]'
                : 'border border-[#dff0ee] bg-[#effaf8] text-[#0d2435] shadow-[0_14px_34px_rgba(143,224,218,0.18)] hover:bg-white'
            }`}
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors lg:hidden ${
            isLight
              ? 'border-[#d4e0ea] text-[#173048] hover:bg-[#f4f8fb]'
              : 'border-white/18 text-white hover:bg-white/8'
          }`}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div
          className={`border-t px-5 py-5 lg:hidden ${
            isLight ? 'border-[#dce6ef] bg-white' : 'border-white/10 bg-[#06111c]'
          }`}
        >
          <div className="flex flex-col gap-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-full px-4 py-3 text-sm font-medium no-underline transition-colors ${
                  isLight
                    ? 'text-[#173048] hover:bg-[#f4f8fb]'
                    : 'text-white/90 hover:bg-white/8'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className={`rounded-full border px-4 py-3 text-center text-sm font-semibold no-underline transition-colors ${
                  isLight
                    ? 'border-[#b8cad9] bg-white/70 text-[#10273a] hover:bg-white'
                    : 'border-white/28 bg-[rgba(6,18,31,0.32)] text-white hover:bg-white/12'
                }`}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                onClick={() => setOpen(false)}
                className={`rounded-full px-4 py-3 text-center text-sm font-semibold no-underline transition-colors ${
                  isLight
                    ? 'border border-[#cfe6e2] bg-[#e9f7f3] text-[#0d2435] hover:bg-[#f2fbf9]'
                    : 'border border-[#dff0ee] bg-[#effaf8] text-[#0d2435] hover:bg-white'
                }`}
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[#0a1824] p-4 shadow-[0_32px_100px_rgba(3,10,18,0.34)]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-[#08131d]">
          <img
            src={landingHeroConsultation}
            alt="Veterinario conversando con la tutora mientras revisa a su perro en consulta"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,28,0.12)_0%,rgba(6,17,28,0.28)_38%,rgba(6,17,28,0.88)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(6,17,28,0.4)_0%,transparent_100%)]" />

          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
            {['Recepcion', 'Consulta', 'Cierre'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/14 bg-[#0d2435]/52 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/92 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="absolute bottom-5 left-5 right-5 grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
            <div className="rounded-[26px] border border-white/12 bg-[#091827]/78 p-6 backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fe0da]">
                Consulta activa
              </p>
              <h3
                className="mt-3 max-w-lg text-3xl leading-none tracking-[-0.04em] text-white"
                style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
              >
                Todo el contexto, sin abrir cinco ventanas.
              </h3>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
                La cita, los antecedentes y el siguiente paso aparecen en el mismo lugar para que
                la consulta se sienta ordenada desde el inicio.
              </p>
              <div className="mt-5 grid gap-3 sm:max-w-[23rem]">
                {['Antecedentes visibles', 'Notas del dia', 'Proximo paso claro'].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/84"
                  >
                    <Check className="h-3.5 w-3.5 text-[#91e7e0]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-[#d6e3ed] bg-[#f4f8fb] p-5 text-[#11293c] shadow-[0_16px_44px_rgba(5,15,27,0.14)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4f7487]">
                    Operacion del dia
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#17324a]">Agenda y caja sin cruces</p>
                </div>
                <span className="rounded-full bg-[#dff4ef] px-2.5 py-1 text-[11px] font-semibold text-[#24544f]">
                  estable
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ['Agenda', 'Citas confirmadas y ordenadas'],
                  ['Caja', 'Cobro conectado con la consulta'],
                  ['Seguimiento', 'Pendientes visibles antes del cierre'],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-[#d9e4ec] pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#648299]">
                      {label}
                    </p>
                    <p className="max-w-[190px] text-right text-sm leading-6 text-[#24435c]">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureMockup() {
  return (
    <div className="rounded-[34px] border border-[#d6e3ee] bg-white p-5 shadow-[0_26px_80px_rgba(8,25,39,0.08)]">
      <div className="rounded-[26px] border border-[#dce7f0] bg-[#f7fafc] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#608093]">
              Vista diaria
            </p>
            <h3
              className="mt-2 text-3xl leading-none tracking-[-0.04em] text-[#10263a]"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
            >
              La operacion se siente conectada.
            </h3>
          </div>
          <div className="rounded-full bg-[#e6f7f3] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#27625d]">
            lista para trabajar
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] bg-[#0c1d2d] p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#91e7e0]">
                    Agenda del dia
                  </p>
                  <p className="mt-2 text-lg font-semibold">Consulta, hospitalizacion y control</p>
                </div>
                <Calendar className="h-5 w-5 text-[#91e7e0]" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  '08:00 - Control posoperatorio',
                  '10:30 - Examen general felino',
                  '15:00 - Seguimiento respiratorio',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/78"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#d5e3ed] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66849b]">
                  Inventario
                </p>
                <p className="mt-2 text-sm leading-6 text-[#28445a]">
                  Reposiciones y consumos ligados a la actividad real de la clinica.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#d5e3ed] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66849b]">
                  Reportes
                </p>
                <p className="mt-2 text-sm leading-6 text-[#28445a]">
                  Mas visibilidad para revisar operacion, caja y capacidad del equipo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#d5e3ed] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66849b]">
                    Paciente
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#143149]">
                    Luna - control respiratorio
                  </p>
                </div>
                <PawPrint className="h-5 w-5 text-[#3b7b87]" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Motivo', 'Seguimiento posterior a consulta previa'],
                  ['Observacion', 'Tutor informado y proximo control programado'],
                  ['Estado', 'Listo para pasar a caja y seguimiento'],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-[18px] bg-[#f5f8fb] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66849b]">
                      {label}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-[#27425a]">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d3b4a,#12314a)] p-5 text-white shadow-[0_16px_44px_rgba(6,23,35,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9debe4]">
                Facturacion electronica
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Disponible en los planes Profesional y Personalizado para completar un flujo mas
                serio y mas confiable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Bourgelat | Software veterinario para clinicas en Colombia'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#112739]">
      <LandingNav />

      <section className="relative overflow-hidden bg-[#06111c] text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-10rem] top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#1c5d63]/40 blur-3xl" />
          <div className="absolute right-[-10rem] top-24 h-[28rem] w-[28rem] rounded-full bg-[#163d66]/38 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#11443e]/24 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              maskImage: 'radial-gradient(circle at top, black 16%, transparent 76%)',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-6 lg:px-8 lg:pb-32 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(460px,0.98fr)] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#91e7e0]">
                <span className="h-2 w-2 rounded-full bg-[#91e7e0]" />
                software veterinario para Colombia
              </div>

              <h1
                className="mt-6 max-w-3xl text-5xl leading-[0.92] tracking-[-0.06em] sm:text-6xl lg:text-7xl"
                style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
              >
                La clinica que atiende bien tambien deberia operar bien.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
                Bourgelat organiza agenda, historia clinica, inventario, caja y seguimiento en una
                sola experiencia. Menos friccion para el equipo, mas confianza para el tutor y mas
                claridad para dirigir la clinica.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#effaf8] px-6 py-3.5 text-sm font-semibold text-[#0d2435] no-underline transition hover:bg-white"
                >
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/planes"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                >
                  Ver planes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['Entrada clara', 'Registro simple y puesta en marcha sin una asesoria eterna.'],
                  ['Flujo conectado', 'Recepcion, consulta, caja y seguimiento bajo el mismo contexto.'],
                  ['Escala natural', 'Facturacion electronica DIAN en Profesional y Personalizado.'],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl"
                  >
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-[#d7e4ee] bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            ['Consultorios que quieren orden desde el inicio', Calendar],
            ['Clinicas que ya necesitan caja, inventario y control', Layers],
            ['Equipos que quieren una experiencia mas intuitiva para todos', Shield],
          ].map((item) => {
            const Icon = item[1]

            return (
              <div
                key={item[0]}
                className="flex items-center gap-3 rounded-[22px] border border-[#d8e4ee] bg-[#f7fafc] px-4 py-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e5f4f3] text-[#245e5a]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium leading-6 text-[#28435b]">{item[0]}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="experiencia" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Experiencia"
          title="Una plataforma que se entiende mas rapido y acompana mejor el dia."
          body="Cada modulo esta pensado para que recepcion, consulta y caja entiendan rapido que hacer y que sigue despues."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {EXPERIENCE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className="rounded-[32px] border border-[#d6e3ee] bg-white p-6 shadow-[0_22px_70px_rgba(8,25,39,0.06)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#edf5fb] text-[#466f87]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3
                  className="mt-6 text-3xl leading-none tracking-[-0.04em] text-[#10263a]"
                  style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
                >
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#5a7185]">{card.body}</p>

                <div className="mt-6 space-y-3">
                  {card.points.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-3 text-sm leading-6 text-[#24435c]"
                    >
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#2c7d7a]" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section id="flujo" className="bg-[#edf4f8]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-8 lg:py-24">
          <div>
            <SectionHeading
              eyebrow="Flujo diario"
              title="Del primer agendamiento al cierre del dia, sin perder contexto."
              body="La clinica trabaja sobre el mismo contexto desde la cita hasta el cobro, asi que se reducen repeticiones, olvidos y pasos manuales."
            />

            <div className="mt-10 space-y-5">
              {FLOW_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="rounded-[30px] border border-[#d7e4ee] bg-white px-6 py-5 shadow-[0_18px_60px_rgba(8,25,39,0.05)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf5fb] text-[#3a6d87]">
                      <span className="text-sm font-semibold">{step.step}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#12283c]">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#567185]">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 lg:mt-0">
            <FeatureMockup />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Plataforma"
          title="Lo importante esta conectado, pero la interfaz sigue siendo amable."
          body="El sistema conecta lo clinico, lo administrativo y el seguimiento sin recargar la lectura del equipo."
          center
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PRODUCT_PANELS.map((panel) => {
            const Icon = panel.icon
            return (
              <article
                key={panel.title}
                className="rounded-[28px] border border-[#d7e4ee] bg-white p-6 shadow-[0_18px_55px_rgba(8,25,39,0.06)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#edf5fb] text-[#3a6d87]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3
                  className="mt-6 text-[30px] leading-none tracking-[-0.04em] text-[#10263a]"
                  style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
                >
                  {panel.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#567185]">{panel.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="planes" className="bg-[#07131f] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Planes"
            title="Planes claros para cada etapa de la clinica."
            body="Empieza con una base ordenada, suma operacion diaria cuando la necesites y llega a DIAN cuando el flujo ya lo pida."
            dark
            center
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {PLAN_PREVIEW.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-[30px] border p-6 ${
                  plan.featured
                    ? 'border-[#91e7e0]/40 bg-[linear-gradient(160deg,rgba(15,49,74,0.96),rgba(11,31,50,0.98),rgba(12,57,65,0.98))] shadow-[0_32px_90px_rgba(10,34,48,0.36)]'
                    : 'border-white/10 bg-white/6'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    plan.featured ? 'text-[#91e7e0]' : 'text-white/55'
                  }`}
                >
                  {plan.subtitle}
                </p>
                <h3
                  className="mt-4 text-4xl leading-none tracking-[-0.04em]"
                  style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
                >
                  {plan.name}
                </h3>
                <p className="mt-4 text-lg font-semibold text-white">{plan.price}</p>
                <p
                  className={`mt-4 text-sm leading-7 ${
                    plan.featured ? 'text-white/84' : 'text-white/68'
                  }`}
                >
                  {plan.note}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/planes"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#effaf8] px-6 py-3.5 text-sm font-semibold text-[#0d2435] no-underline transition hover:bg-white"
            >
              Ver comparativa completa
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="overflow-hidden rounded-[38px] bg-[linear-gradient(145deg,#0b1724,#13314a,#0f3f43)] p-8 text-white shadow-[0_36px_120px_rgba(7,20,32,0.24)] md:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#91e7e0]">
                Contacto
              </p>
              <h2
                className="mt-4 text-5xl leading-[0.94] tracking-[-0.05em] text-white md:text-6xl"
                style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
              >
                Agenda una conversacion cuando quieras revisar tu caso.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/74">
                Si quieres validar encaje, migracion, DIAN o el plan correcto para tu equipo,
                conversemos y lo aterrizamos contigo.
              </p>
            </div>

            <div className="space-y-4">
              <Link
                to="/registro"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-[#0d2435] no-underline transition hover:bg-[#effaf8]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hola@bourgelat.co"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-6 py-4 text-sm font-semibold text-white no-underline transition hover:bg-white/12"
              >
                <Mail className="h-4 w-4" />
                hola@bourgelat.co
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d7e4ee] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <BrandMark />
            <p className="mt-4 text-sm leading-7 text-[#5a7185]">
              Software para clinicas veterinarias que quieren una operacion mas clara, mas humana y
              mas confiable desde la recepcion hasta el cierre del dia.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-[#49647b] no-underline transition hover:text-[#10263a]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
