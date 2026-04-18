import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import ClinicOrbitCanvas from '@/components/shared/ClinicOrbitCanvas'
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
    title: 'Recepcion sin perseguir chats',
    body:
      'La llamada, la confirmacion y la llegada del paciente quedan en un mismo tablero para que recepcion no trabaje a ciegas.',
    points: ['Citas con contexto', 'Llegadas visibles', 'Menos mensajes repetidos'],
  },
  {
    icon: HeartPulse,
    title: 'La historia no arranca de cero',
    body:
      'El veterinario ve antecedentes, evolucion y pendientes del paciente sin buscar entre papel, Word o notas sueltas.',
    points: ['Antecedentes a mano', 'Evolucion por visita', 'Pendientes clinicos claros'],
  },
  {
    icon: Receipt,
    title: 'El cierre deja rastro',
    body:
      'El cobro, el consumo de inventario y el seguimiento salen del mismo caso para que el cierre no dependa de memoria.',
    points: ['Caja conectada', 'Stock que se descuenta', 'Seguimiento despues del pago'],
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    title: 'Llaman, agendan y llegan',
    body:
      'La recepcion ve que paciente viene, por que viene y que debe pasar antes de entrar a consulta.',
  },
  {
    step: '02',
    title: 'El caso se atiende con memoria',
    body:
      'El veterinario registra la evolucion sobre el historial real del paciente, no sobre una nota aislada.',
  },
  {
    step: '03',
    title: 'Caja, stock y proximo paso',
    body:
      'El cierre queda amarrado al caso: cobro, consumo, alerta de reposicion y siguiente contacto con el tutor.',
  },
]

const PRODUCT_PANELS = [
  {
    icon: Layers,
    title: 'Agenda con contexto',
    body:
      'No solo hora y nombre: tambien motivo, paciente, tutor y estado de llegada para tomar mejores decisiones.',
  },
  {
    icon: Bell,
    title: 'Historia que acompana',
    body:
      'Cada visita suma continuidad: antecedentes, observaciones y tareas pendientes siguen al paciente.',
  },
  {
    icon: Package,
    title: 'Inventario con pulso',
    body:
      'El consumo de la atencion ayuda a mantener stock, reposiciones y caja conectados con el trabajo real.',
  },
  {
    icon: Globe,
    title: 'DIAN cuando toca',
    body:
      'Facturacion electronica disponible para clinicas que ya necesitan operar con mas control fiscal.',
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

const HERO_MARQUEE_ITEMS = [
  { label: 'Agenda', icon: Calendar },
  { label: 'Pacientes', icon: PawPrint },
  { label: 'Historia clinica', icon: HeartPulse },
  { label: 'Inventario', icon: Package },
  { label: 'Caja', icon: Receipt },
  { label: 'Facturacion DIAN', icon: Globe },
  { label: 'Recordatorios', icon: Bell },
  { label: 'Operacion diaria', icon: Layers },
]

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_18px_40px_rgba(92,206,198,0.2)] sm:h-11 sm:w-11 ${
          dark
            ? 'bg-white/10 text-white'
            : 'bg-[linear-gradient(135deg,#8fe0da,#b8eff0)] text-[#082033]'
        }`}
      >
        <Stethoscope className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-base font-semibold tracking-[-0.03em] sm:text-lg ${dark ? 'text-white' : 'text-[#0f2437]'}`}>
          Bourgelat
        </p>
        <p
          className={`hidden text-[11px] uppercase tracking-[0.22em] sm:block ${
            dark ? 'text-white/50' : 'text-[#5a7188]'
          }`}
        >
          plataforma para clinicas veterinarias
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
        className={`mt-4 text-[2.7rem] leading-[0.94] tracking-[-0.05em] sm:text-5xl md:text-6xl ${
          dark ? 'text-white' : 'text-[#10263a]'
        }`}
        style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
      >
        {title}
      </h2>
      <p
        className={`mt-5 text-[15px] leading-7 sm:text-lg sm:leading-8 ${
          dark ? 'text-white/70' : 'text-[#51697d]'
        }`}
      >
        {body}
      </p>
    </div>
  )
}

function LandingNav() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [navTheme, setNavTheme] = useState('dark')
  const headerRef = useRef(null)

  useEffect(() => {
    const parseRgbChannels = (value) => {
      const match = value.match(/\d+(\.\d+)?/g)

      if (!match || match.length < 3) {
        return null
      }

      return [
        Number(match[0]),
        Number(match[1]),
        Number(match[2]),
        match.length >= 4 ? Number(match[3]) : 1,
      ]
    }

    const isLightColor = ([r, g, b]) => {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return luminance > 150
    }

    const findSolidBackground = (element) => {
      let current = element

      while (current && current instanceof HTMLElement) {
        const background = window.getComputedStyle(current).backgroundColor
        const rgba = parseRgbChannels(background)

        if (rgba && rgba[3] > 0.08) {
          return rgba
        }

        current = current.parentElement
      }

      return null
    }

    const syncHeader = () => {
      const scrolled = window.scrollY > 24
      setIsScrolled(scrolled)

      if (!scrolled) {
        setNavTheme('dark')
        return
      }

      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 78
      const probeX = Math.max(0, Math.min(window.innerWidth / 2, window.innerWidth - 1))
      const probeY = Math.max(0, Math.min(Math.round(headerBottom + 18), window.innerHeight - 1))
      const elements = document.elementsFromPoint(probeX, probeY)

      for (const element of elements) {
        if (!(element instanceof HTMLElement)) {
          continue
        }

        if (element === headerRef.current || headerRef.current?.contains(element)) {
          continue
        }

        const background = findSolidBackground(element)

        if (background) {
          setNavTheme(isLightColor(background) ? 'light' : 'dark')
          return
        }
      }

      setNavTheme('dark')
    }

    syncHeader()
    window.addEventListener('scroll', syncHeader, { passive: true })
    window.addEventListener('resize', syncHeader)

    return () => {
      window.removeEventListener('scroll', syncHeader)
      window.removeEventListener('resize', syncHeader)
    }
  }, [])

  const compact = isScrolled || open
  const isLight = compact && navTheme === 'light'

  return (
    <header
      ref={headerRef}
      className={`fixed z-50 transition-all duration-700 ${
        compact
          ? 'left-3 right-3 top-3 sm:left-5 sm:right-5 sm:top-4'
          : 'left-0 right-0 top-0'
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-between border px-4 transition-all duration-700 sm:px-6 lg:px-8 ${
          compact
            ? isLight
              ? 'max-w-[1200px] rounded-[28px] border-transparent bg-[rgba(248,251,252,0.9)] py-3 shadow-[0_24px_70px_rgba(11,34,50,0.12)] backdrop-blur-xl'
              : 'max-w-[1200px] rounded-[28px] border-transparent bg-[rgba(3,13,22,0.86)] py-3 shadow-[0_24px_70px_rgba(2,8,14,0.5)] backdrop-blur-xl'
            : 'max-w-[1400px] rounded-none border-transparent bg-transparent py-5'
        }`}
      >
        <Link to="/" className="no-underline">
          <BrandMark dark={!isLight} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold no-underline transition-colors ${
                isLight
                  ? 'text-[#173048] hover:bg-[#e8f1f4] hover:text-[#0d2435]'
                  : 'text-[#e8f3f2] hover:bg-white/10 hover:text-[#a8fff6]'
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
                ? 'border-[#b9ccd8] bg-white/70 text-[#10263a] hover:border-[#9cb5c6] hover:bg-white'
                : 'border-white/30 bg-[#081827] text-white hover:border-[#91e7e0]/60 hover:bg-[#0c2235]'
            }`}
          >
            Iniciar sesion
          </Link>
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 rounded-full border border-[#dff0ee] bg-[#effaf8] px-5 py-2.5 text-sm font-semibold text-[#0d2435] no-underline shadow-[0_14px_34px_rgba(143,224,218,0.18)] transition-colors hover:bg-white"
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
              ? 'border-[#c5d6e1] text-[#173048] hover:bg-[#e8f1f4]'
              : 'border-white/20 text-white hover:bg-white/10'
          }`}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div
          className={`mt-2 overflow-hidden rounded-[24px] border px-5 py-5 shadow-[0_24px_70px_rgba(2,8,14,0.26)] backdrop-blur-xl lg:hidden ${
            isLight
              ? 'border-[#d4e2ea] bg-[rgba(248,251,252,0.96)]'
              : 'border-white/10 bg-[rgba(2,11,18,0.96)]'
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
                    ? 'text-[#173048] hover:bg-[#e8f1f4]'
                    : 'text-white/90 hover:bg-white/10'
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
                    ? 'border-[#b9ccd8] bg-white/70 text-[#10263a] hover:bg-white'
                    : 'border-white/30 bg-[#081827] text-white hover:bg-white/10'
                }`}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#dff0ee] bg-[#effaf8] px-4 py-3 text-center text-sm font-semibold text-[#0d2435] no-underline transition-colors hover:bg-white"
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

function HeroPreview({ className = '' }) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <ClinicOrbitCanvas className="block h-full w-full opacity-95" />
    </div>
  )
}

function HeroModuleMarquee() {
  const loopItems = [...HERO_MARQUEE_ITEMS, ...HERO_MARQUEE_ITEMS]
  const MotionTrack = motion.div

  return (
    <section className="relative z-20 bg-[#f4f7fb] pt-4 sm:pt-6">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-transparent py-4 sm:py-5">
          <div className="relative overflow-hidden">
            <div className="sr-only">
              Bourgelat conecta agenda, pacientes, historia clinica, inventario, caja,
              facturacion DIAN y recordatorios en una misma operacion.
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-[linear-gradient(90deg,#f4f7fb,rgba(244,247,251,0))] sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-[linear-gradient(270deg,#f4f7fb,rgba(244,247,251,0))] sm:w-24" />

            <MotionTrack
              aria-hidden="true"
              className="flex w-max items-center gap-6 px-3 sm:gap-8 sm:px-6"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
            >
              {loopItems.map((item, index) => {
                const Icon = item.icon

                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-center gap-6 whitespace-nowrap text-[#173048]"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-[#2d7a79]" />
                      <span className="text-sm font-semibold tracking-[-0.02em] sm:text-[15px]">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[#b8cad5]">/</span>
                  </div>
                )
              })}
            </MotionTrack>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureMockup() {
  return (
    <div className="rounded-[28px] border border-[#d6e3ee] bg-white p-4 shadow-[0_26px_80px_rgba(8,25,39,0.08)] sm:rounded-[34px] sm:p-5">
      <div className="rounded-[24px] border border-[#dce7f0] bg-[#f7fafc] p-4 sm:rounded-[26px] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#608093]">
              Vista diaria
            </p>
            <h3
              className="mt-2 text-[2rem] leading-none tracking-[-0.04em] text-[#10263a] sm:text-3xl"
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
            <div className="rounded-[24px] bg-[#0c1d2d] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#91e7e0]">
                    Agenda del dia
                  </p>
                  <p className="mt-2 text-lg font-semibold">Recepcion, consulta y cierre</p>
                </div>
                <Calendar className="h-5 w-5 text-[#91e7e0]" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  '08:00 - Milo llega a vacuna anual',
                  '10:30 - Luna entra a control respiratorio',
                  '15:00 - Bruno pasa a caja y seguimiento',
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
                  El consumo de consulta se vuelve una senal para reponer, no una sorpresa al final.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#d5e3ed] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#66849b]">
                  Reportes
                </p>
                <p className="mt-2 text-sm leading-6 text-[#28445a]">
                  El cierre muestra donde se fue el dia: atenciones, cobros, stock y pendientes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#d5e3ed] bg-white p-5">
              <div className="flex items-start justify-between gap-4">
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
                  ['Motivo', 'Tos persistente despues de control previo'],
                  ['Hallazgo', 'Tutor informado y formula actualizada'],
                  ['Salida', 'Listo para caja y proximo seguimiento'],
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

            <div className="rounded-[24px] bg-[linear-gradient(135deg,#0d3b4a,#12314a)] p-4 text-white shadow-[0_16px_44px_rgba(6,23,35,0.22)] sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9debe4]">
                Facturacion electronica
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Disponible cuando la clinica necesita emitir sin volver a digitar el caso en otro
                sistema.
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
    document.title = 'Bourgelat | Software para clinicas veterinarias'
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
        <HeroPreview className="absolute inset-x-[-16%] bottom-[-5rem] top-[7.75rem] z-0 opacity-38 sm:inset-0 sm:opacity-75" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="max-w-4xl">
            <h1
              className="mt-2 max-w-3xl text-[3.2rem] leading-[0.92] tracking-[-0.06em] sm:text-6xl lg:text-7xl"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
            >
              Tu clinica veterinaria merece una operacion a la altura de su medicina.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:mt-6 sm:text-lg sm:leading-8">
              Bourgelat integra agenda, historia clinica, caja, inventario y seguimiento en un
              solo sistema para reducir reprocesos, ordenar al equipo y ofrecer una experiencia
              mas profesional a cada tutor.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/registro"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#effaf8] px-6 py-3.5 text-sm font-semibold text-[#0d2435] no-underline transition hover:bg-white sm:w-auto"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/planes"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-white no-underline transition hover:bg-white/10 sm:w-auto"
              >
                Ver planes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      <HeroModuleMarquee />

      <section id="experiencia" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Experiencia"
          title="Menos pantalla por pantalla. Mas continuidad por caso."
          body="Bourgelat no intenta decorar el caos: lo ordena alrededor del paciente, del tutor y de las decisiones del equipo."
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
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-8 lg:py-24">
          <div>
            <SectionHeading
              eyebrow="Flujo diario"
              title="De la llamada al seguimiento, cada paso empuja al siguiente."
              body="La clinica deja de pasar informacion de mano en mano. El sistema conserva el contexto y el equipo avanza con menos friccion."
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

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeading
          eyebrow="Plataforma"
          title="No es otro tablero bonito: es el hilo comun del equipo."
          body="Cada modulo responde a una pregunta del dia: quien llega, que le paso, que se uso, que se cobra y que toca despues."
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
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Planes"
            title="Planes para entrar sin miedo y crecer sin rearmar todo."
            body="Puedes empezar con orden clinico y sumar caja, inventario, reportes y facturacion electronica cuando la operacion lo pida."
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
                  className="mt-4 text-[2rem] leading-none tracking-[-0.04em] sm:text-4xl"
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

      <section id="contacto" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,#0b1724,#13314a,#0f3f43)] p-6 text-white shadow-[0_36px_120px_rgba(7,20,32,0.24)] sm:rounded-[38px] sm:p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#91e7e0]">
                Contacto
              </p>
              <h2
                className="mt-4 text-[2.8rem] leading-[0.94] tracking-[-0.05em] text-white sm:text-5xl md:text-6xl"
                style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
              >
                Si tu clinica ya siente friccion, revisemos donde se rompe el dia.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/74">
                Cuentanos como trabajan hoy: agenda, historias, inventario, caja y DIAN. Con eso
                vemos si Bourgelat encaja y que habria que ordenar primero.
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
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-9 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
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
