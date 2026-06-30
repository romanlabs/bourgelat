import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Bell, Check, Clock, Minus, ShieldCheck } from 'lucide-react'

import BrandMark from '@/components/landing/BrandMark'

// ── Paleta cálida (misma identidad de landing, login y registro) ──
//   INK      espresso — títulos, texto, botón sólido y card-ancla
//   BODY     taupe — cuerpo
//   ACCENT   caramelo — eyebrows, checks, links
//   CREAM    fondo general
//   SURFACE  blanco cálido para cards
//   LINE     hairline cálido
const INK = '#2b2018'
const BODY = '#6b5d4d'
const ACCENT = '#b07645'
const EYEBROW = '#a35f25'
const CREAM = '#f8f4ee'
const SURFACE = '#fffdf9'
const LINE = '#e7ddd0'
const CHIP = '#f1e9dc'
const ACCENT_ON_INK = '#d9a06b'
const REC_BAND = 'rgba(176,118,69,0.07)' // banda de la columna recomendada

// Gradientes sutiles para dar profundidad (que el café no se vea plano)
const GRAD_CARD = 'linear-gradient(165deg, #fffdf9 0%, #f8f1e6 100%)'
const GRAD_INK = 'linear-gradient(165deg, #38291c 0%, #211710 100%)'
const GRAD_SOON = 'linear-gradient(165deg, #fdf8f0 0%, #f5ecdd 100%)'
// Efecto spotlight: las cards no apuntadas se atenúan y desenfocan un poco
const DIM_FILTER = 'blur(1.4px) brightness(0.97) saturate(0.92)'
const GLOW_ACTIVE = '0 18px 50px -18px rgba(176,118,69,0.45)'

const PLANES = [
  {
    key: 'inicio',
    nombre: 'Esencial',
    subtitulo: 'Para empezar con orden',
    resumen:
      'Para consultorios que quieren ordenar agenda, pacientes e historia clínica sin una configuración pesada.',
    precioMensual: 0,
    precioAnual: 0,
    cta: 'Empezar gratis',
    nota: 'Gratis para siempre · sin tarjeta',
    to: '/registro',
    limites: ['2 usuarios', '250 mascotas', '1 GB'],
    incluye: [
      'Agenda de citas',
      'Propietarios y mascotas',
      'Historia clínica básica',
      'Antecedentes del paciente',
    ],
  },
  {
    key: 'clinica',
    nombre: 'Clínica',
    subtitulo: 'Para operar el día completo',
    popular: true,
    resumen:
      'Para equipos que ya necesitan unir agenda, consulta, inventario y caja en un mismo sistema.',
    precioMensual: 99000,
    precioAnual: 79000,
    cta: 'Elegir Clínica',
    nota: 'Cancela cuando quieras',
    to: '/registro',
    limites: ['5 usuarios', '2.500 mascotas', '5 GB'],
    incluye: [
      'Todo lo de Esencial',
      'Inventario operativo',
      'Caja y facturación interna',
      'Reportes operativos',
    ],
  },
  {
    key: 'profesional',
    nombre: 'Profesional',
    subtitulo: 'Facturación electrónica DIAN',
    comingSoon: true,
    resumen:
      'La emisión validada ante la DIAN —con CUFE y conexión a Factus— llega en la próxima versión de Bourgelat.',
    proximamente: [
      'Facturación electrónica DIAN',
      'Validación y CUFE automáticos',
      'Conexión con Factus',
      'Todo lo del plan Clínica',
    ],
  },
  {
    key: 'personalizado',
    nombre: 'Personalizado',
    subtitulo: 'Migración y acompañamiento',
    resumen:
      'Para clínicas que necesitan acompañamiento, configuración guiada o una migración más cuidada.',
    precioMensual: null,
    precioAnual: null,
    cta: 'Hablar con el equipo',
    nota: 'Te respondemos en 24 h',
    href: 'mailto:hola@bourgelat.co?subject=Quiero%20cotizar%20Bourgelat',
    limites: ['Volumen a medida', 'Migración guiada', 'Soporte cercano'],
    incluye: [
      'Base de Profesional',
      'Revisión del caso',
      'Acompañamiento de migración',
      'Configuración guiada',
    ],
  },
]

// Comparativa por categorías. Los valores reflejan backend/src/config/planes.js
// (límites y funcionalidades por plan). Mantener en sincronía con ese archivo.
const COMPARISON_GROUPS = [
  {
    grupo: 'Operación clínica',
    filas: [
      { label: 'Agenda con contexto del paciente', values: { inicio: true, clinica: true, profesional: true, personalizado: true } },
      { label: 'Historia clínica y antecedentes', values: { inicio: true, clinica: true, profesional: true, personalizado: true } },
      { label: 'Mascotas activas', values: { inicio: '250', clinica: '2.500', profesional: '10.000', personalizado: 'Ilimitadas' } },
      { label: 'Usuarios del equipo', values: { inicio: '2', clinica: '5', profesional: '12', personalizado: 'A medida' } },
    ],
  },
  {
    grupo: 'Caja y facturación',
    filas: [
      { label: 'Inventario operativo', values: { inicio: false, clinica: true, profesional: true, personalizado: true } },
      { label: 'Caja y facturación interna', values: { inicio: false, clinica: true, profesional: true, personalizado: true } },
      {
        label: 'Facturación electrónica DIAN',
        hint: 'Emisión validada ante la DIAN a través de Factus. Disponible en la próxima versión.',
        soon: { profesional: true, personalizado: true },
        values: { inicio: false, clinica: false, profesional: 'soon', personalizado: 'soon' },
      },
    ],
  },
  {
    grupo: 'Reportes y datos',
    filas: [
      { label: 'Reportes operativos', values: { inicio: false, clinica: true, profesional: true, personalizado: true } },
      { label: 'Reportes completos y exportables', values: { inicio: false, clinica: false, profesional: true, personalizado: true } },
      { label: 'Almacenamiento de archivos', values: { inicio: '1 GB', clinica: '5 GB', profesional: '20 GB', personalizado: 'A medida' } },
    ],
  },
  {
    grupo: 'Acompañamiento',
    filas: [
      { label: 'Migración guiada desde otro sistema', values: { inicio: false, clinica: false, profesional: false, personalizado: true } },
      { label: 'Soporte prioritario', values: { inicio: false, clinica: false, profesional: false, personalizado: true } },
    ],
  },
]

const PLAN_MATCH = [
  {
    momento: 'Estás empezando',
    title: 'Si digitalizas por primera vez',
    body:
      'Esencial te deja ordenar agenda, pacientes e historia clínica sin meterte de una en un despliegue grande.',
  },
  {
    momento: 'Operación diaria',
    title: 'Si ya cobras, compras y controlas stock',
    body:
      'Clínica empieza a tener sentido: la operación ya necesita inventario, caja y reportes en el mismo entorno.',
  },
  {
    momento: 'Círculo completo',
    title: 'Si quieres cerrar el círculo',
    body:
      'Profesional es lo natural cuando la clínica quiere agenda, consulta, administración y DIAN en un solo recorrido.',
  },
]

const TRUST = [
  'Habilitado ante la DIAN',
  'Conectado con Factus',
  'Protegido con Cloudflare',
  'Hecho en Colombia',
]

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function formatPrice(value) {
  if (value === null) return 'A medida'
  if (value === 0) return 'Gratis'
  return pesos.format(value)
}

function PlanCTA({ plan, className, style }) {
  const content = (
    <>
      {plan.cta}
      <ArrowRight className="h-4 w-4" />
    </>
  )
  return plan.href ? (
    <a href={plan.href} className={className} style={style}>{content}</a>
  ) : (
    <Link to={plan.to} className={className} style={style}>{content}</Link>
  )
}

function AnimatedPrice({ price, reduce, onInk }) {
  const sub = onInk ? 'text-white/70' : ''
  const subStyle = onInk ? undefined : { color: BODY }
  return (
    <div className="flex min-h-[44px] items-baseline gap-1.5">
      <AnimatePresence mode="wait" initial={false}>
        <Motion.span
          key={String(price)}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="text-[2rem] font-semibold leading-none tracking-[-0.02em]"
        >
          {formatPrice(price)}
        </Motion.span>
      </AnimatePresence>
      {price ? <span className={`text-sm ${sub}`} style={subStyle}>/mes</span> : null}
    </div>
  )
}

// Captura de interesados en la facturación electrónica (lista de espera v2).
// Sin backend aún: dispara un mailto para que el lead llegue a la bandeja y
// muestra confirmación. TODO v2: reemplazar por endpoint de waitlist.
function AvisameField() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const onSubmit = (e) => {
    e.preventDefault()
    if (!valid) return
    const asunto = encodeURIComponent('Avísame: facturación electrónica DIAN')
    const cuerpo = encodeURIComponent(`Quiero que me avisen cuando salga la facturación electrónica.\nCorreo: ${email.trim()}`)
    window.location.href = `mailto:hola@bourgelat.co?subject=${asunto}&body=${cuerpo}`
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex items-start gap-2 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: LINE, backgroundColor: '#f3efe6', color: '#3f342a' }}>
        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
        <span>Listo. Te escribimos a <strong>{email.trim()}</strong> en cuanto esté disponible.</span>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <label htmlFor="avisame-email" className="block text-xs font-medium" style={{ color: BODY }}>
        Te avisamos cuando esté lista
      </label>
      <input
        id="avisame-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
        className="h-11 w-full rounded-md border bg-white px-3.5 text-sm outline-none transition focus:border-[#b07645]"
        style={{ borderColor: LINE, color: INK }}
      />
      <button
        type="submit"
        disabled={!valid}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-white transition-colors hover:bg-[#b07645] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: INK }}
      >
        <Bell className="h-4 w-4" />
        Avísame
      </button>
    </form>
  )
}

function ComingSoonCard({ plan, index, reduce, hovered, setHovered }) {
  const dim = hovered && hovered !== plan.key
  const active = hovered === plan.key
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <Motion.article
      {...reveal}
      onMouseEnter={() => setHovered(plan.key)}
      onMouseLeave={() => setHovered(null)}
      className="relative flex h-full flex-col rounded-2xl border-2 border-dashed p-7 transition-[filter,border-color] duration-300"
      style={{
        background: GRAD_SOON,
        borderColor: active ? ACCENT : '#e0cdb4',
        color: INK,
        filter: dim ? DIM_FILTER : 'none',
      }}
    >
      {/* Sello tipo estampa de caucho "Próximamente" — doble filete, fondo lavado y leve rotación */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-5 -rotate-[6deg] select-none rounded-[6px] px-3 py-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.22em]"
        style={{
          color: ACCENT,
          border: `1.5px solid ${ACCENT}`,
          backgroundColor: 'rgba(176,118,69,0.06)',
          boxShadow: 'inset 0 0 0 2px #fdf8f0, inset 0 0 0 3px rgba(176,118,69,0.45)',
        }}
      >
        Próximamente
      </span>

      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: EYEBROW }}>
        Versión 2
      </p>
      <h3 className="mt-3 text-4xl leading-none tracking-[-0.04em]" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}>
        {plan.nombre}
      </h3>
      <p className="mt-3 text-sm font-semibold" style={{ color: ACCENT }}>{plan.subtitulo}</p>
      <p className="mt-3 text-sm leading-7" style={{ color: BODY }}>{plan.resumen}</p>

      <div className="mt-6 space-y-3">
        {plan.proximamente.map((item) => (
          <div key={item} className="flex items-start gap-3 text-sm leading-6" style={{ color: '#5b4c3c' }}>
            <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b89a78' }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-7">
        <AvisameField />
      </div>
    </Motion.article>
  )
}

function PlanCard({ plan, anual, index, reduce, hovered, setHovered }) {
  if (plan.comingSoon) {
    return <ComingSoonCard plan={plan} index={index} reduce={reduce} hovered={hovered} setHovered={setHovered} />
  }
  const price = anual ? plan.precioAnual : plan.precioMensual
  const ahorro =
    anual && plan.precioMensual && plan.precioAnual && plan.precioMensual > plan.precioAnual
      ? plan.precioMensual - plan.precioAnual
      : 0
  const anchor = plan.popular
  const dim = hovered && hovered !== plan.key
  const active = hovered === plan.key
  const hover = {
    onMouseEnter: () => setHovered(plan.key),
    onMouseLeave: () => setHovered(null),
  }

  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] },
      }

  if (anchor) {
    return (
      <Motion.article
        {...reveal}
        {...hover}
        className="relative flex h-full flex-col rounded-2xl p-7 text-white shadow-[0_36px_80px_-24px_rgba(43,32,24,0.55)] transition-[filter] duration-300 lg:-translate-y-3 lg:scale-[1.02]"
        style={{ background: GRAD_INK, filter: dim ? DIM_FILTER : active ? 'brightness(1.06)' : 'none' }}
      >
        {/* glow ámbar de marca detrás de la card ancla */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-70 blur-2xl"
          style={{ background: 'radial-gradient(120% 80% at 70% 0%, rgba(233,192,137,0.30), transparent 65%)' }}
        />
        <span
          className="absolute right-6 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
        >
          Más elegido
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT_ON_INK }}>
          {plan.subtitulo}
        </p>
        <h3 className="mt-3 text-4xl leading-none tracking-[-0.04em]" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}>
          {plan.nombre}
        </h3>
        <AnimatedPrice price={price} reduce={reduce} onInk />
        <div className="min-h-[20px]">
          {ahorro ? (
            <span className="text-xs font-semibold" style={{ color: ACCENT_ON_INK }}>
              Ahorras {pesos.format(ahorro)}/mes
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-7 text-white/75">{plan.resumen}</p>

        <div className="mt-6 space-y-3">
          {plan.incluye.map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/90">
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT_ON_INK }} />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {plan.limites.map((item) => (
            <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">{item}</span>
          ))}
        </div>

        <div className="mt-auto pt-7">
          <PlanCTA
            plan={plan}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-[#f1e9dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ color: INK }}
          />
          <p className="mt-3 text-center text-xs text-white/55">{plan.nota}</p>
        </div>
      </Motion.article>
    )
  }

  return (
    <Motion.article
      {...reveal}
      {...hover}
      className="flex h-full flex-col rounded-2xl border p-7 transition-[filter,border-color,box-shadow] duration-300"
      style={{
        background: GRAD_CARD,
        borderColor: active ? ACCENT : LINE,
        color: INK,
        filter: dim ? DIM_FILTER : 'none',
        boxShadow: active ? GLOW_ACTIVE : '0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: EYEBROW }}>
        {plan.subtitulo}
      </p>
      <h3 className="mt-3 text-4xl leading-none tracking-[-0.04em]" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}>
        {plan.nombre}
      </h3>
      <AnimatedPrice price={price} reduce={reduce} />
      <div className="min-h-[20px]">
        {ahorro ? (
          <span className="text-xs font-semibold" style={{ color: ACCENT }}>
            Ahorras {pesos.format(ahorro)}/mes
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-7" style={{ color: BODY }}>{plan.resumen}</p>

      <div className="mt-6 space-y-3">
        {plan.incluye.map((item) => (
          <div key={item} className="flex items-start gap-3 text-sm leading-6" style={{ color: '#3f342a' }}>
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {plan.limites.map((item) => (
          <span key={item} className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: CHIP, color: '#5b4c3c' }}>{item}</span>
        ))}
      </div>

      <div className="mt-auto pt-7">
        <PlanCTA
          plan={plan}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07645]"
          style={{ borderColor: LINE, color: INK }}
        />
        <p className="mt-3 text-center text-xs" style={{ color: BODY }}>{plan.nota}</p>
      </div>
    </Motion.article>
  )
}

// Celda de comparativa: booleano → check/guion; 'soon' → píldora; texto → valor.
function CompareCell({ value }) {
  if (value === true) return <Check className="mx-auto h-4 w-4" style={{ color: ACCENT }} aria-label="Incluido" />
  if (value === false) return <Minus className="mx-auto h-4 w-4" style={{ color: '#c9bba9' }} aria-label="No incluido" />
  if (value === 'soon') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ backgroundColor: CHIP, color: EYEBROW }}
      >
        <Clock className="h-3 w-3" />
        Pronto
      </span>
    )
  }
  return <span className="text-sm font-semibold" style={{ color: INK }}>{value}</span>
}

export default function PlanesPage() {
  const [anual, setAnual] = useState(false)
  const [hovered, setHovered] = useState(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    document.title = 'Planes | Bourgelat'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM, color: INK }}>
      {/* ── Header cálido propio ── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl" style={{ borderColor: LINE, backgroundColor: 'rgba(248,244,238,0.85)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="group no-underline"><BrandMark /></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors hover:text-[#b07645] sm:inline-flex" style={{ color: BODY }}>
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
            <Link to="/login" className="rounded-md border px-4 py-2 text-sm font-semibold no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645]" style={{ borderColor: 'rgba(43,32,24,0.25)', color: INK }}>
              Iniciar sesión
            </Link>
            <Link to="/registro" className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#b07645]" style={{ backgroundColor: INK }}>
              Crear cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        {/* ── Hero ── */}
        <section className="pb-12 pt-16 sm:pt-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: EYEBROW }}>
                Planes Bourgelat
              </p>
              <h1 className="mt-4 text-[2.8rem] leading-[0.95] tracking-[-0.045em] sm:text-6xl" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}>
                Un plan por cada
                <br />
                momento de la clínica.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 sm:text-lg" style={{ color: BODY }}>
                No es una tabla infinita. Es elegir según dónde está hoy la operación:
                ordenando lo esencial, atendiendo el día completo o cerrando el círculo
                clínico, administrativo y fiscal.
              </p>
            </div>

            {/* Toggle mensual / anual */}
            <div className="shrink-0">
              <div className="inline-flex rounded-full border p-1" style={{ borderColor: LINE, backgroundColor: SURFACE }} role="group" aria-label="Periodicidad de precios">
                <button
                  type="button"
                  onClick={() => setAnual(false)}
                  aria-pressed={!anual}
                  className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                  style={!anual ? { backgroundColor: INK, color: '#fff' } : { color: BODY }}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setAnual(true)}
                  aria-pressed={anual}
                  className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                  style={anual ? { backgroundColor: INK, color: '#fff' } : { color: BODY }}
                >
                  Anual
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={anual ? { backgroundColor: ACCENT_ON_INK, color: INK } : { backgroundColor: CHIP, color: EYEBROW }}
                  >
                    −20%
                  </span>
                </button>
              </div>
              <p className="mt-2 max-w-[210px] text-right text-xs leading-5" style={{ color: BODY }}>
                Plan anual: hasta dos meses gratis frente al mensual.
              </p>
            </div>
          </div>
        </section>

        {/* ── Cards de planes ── */}
        <section className="grid items-stretch gap-5 pb-16 lg:grid-cols-4">
          {PLANES.map((plan, i) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              anual={anual}
              index={i}
              reduce={reduce}
              hovered={hovered}
              setHovered={setHovered}
            />
          ))}
        </section>

        {/* ── Franja de confianza ── */}
        <section className="mb-20 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-y py-4 text-center" style={{ borderColor: LINE }}>
          {TRUST.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: BODY }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: ACCENT }} />
              {t}
            </span>
          ))}
        </section>

        {/* ── Cómo decide una clínica ── */}
        <section className="pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: EYEBROW }}>
            Cómo suele decidir una clínica
          </p>
          <h2 className="mt-4 max-w-2xl text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}>
            Una elección según el momento, no un catálogo.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLAN_MATCH.map((item) => (
              <div key={item.title} className="rounded-2xl border p-6" style={{ backgroundColor: SURFACE, borderColor: LINE }}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>{item.momento}</span>
                <h3 className="mt-3 text-lg font-semibold" style={{ color: INK }}>{item.title}</h3>
                <p className="mt-3 text-sm leading-7" style={{ color: BODY }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparativa profesional ── */}
        <section className="pb-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: EYEBROW }}>
              Comparativa completa
            </p>
            <h2 className="mt-4 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}>
              Todo lo que entra en cada plan.
            </h2>
          </div>

          <p className="mb-3 text-xs lg:hidden" style={{ color: BODY }}>Desliza para comparar →</p>
          <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: SURFACE, borderColor: LINE }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr>
                    <th
                      className="sticky top-[68px] z-10 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: BODY, backgroundColor: SURFACE }}
                    >
                      Funcionalidad
                    </th>
                    {PLANES.map((plan) => {
                      const rec = plan.popular
                      return (
                        <th
                          key={plan.key}
                          className="sticky top-[68px] z-10 px-4 py-4 text-center"
                          style={{ backgroundColor: rec ? '#f4e8da' : SURFACE }}
                        >
                          {rec ? (
                            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT }}>
                              Recomendado
                            </span>
                          ) : null}
                          {plan.comingSoon ? (
                            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: EYEBROW }}>
                              Próximamente
                            </span>
                          ) : null}
                          <span className="text-sm font-semibold" style={{ color: rec ? ACCENT : INK }}>{plan.nombre}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_GROUPS.map((group) => (
                    <Fragment key={group.grupo}>
                      <tr>
                        <td className="px-5 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: EYEBROW }}>
                          {group.grupo}
                        </td>
                        {PLANES.map((plan) => (
                          <td key={plan.key} style={{ backgroundColor: plan.popular ? REC_BAND : undefined }} />
                        ))}
                      </tr>
                      {group.filas.map((fila) => (
                        <tr key={fila.label} className="border-t transition-colors hover:bg-[#faf5ec]" style={{ borderColor: LINE }}>
                          <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#3f342a' }}>
                            <span className="inline-flex items-center gap-1.5">
                              {fila.label}
                              {fila.hint ? (
                                <span
                                  title={fila.hint}
                                  className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: CHIP, color: EYEBROW }}
                                >
                                  ?
                                </span>
                              ) : null}
                            </span>
                          </td>
                          {PLANES.map((plan) => (
                            <td
                              key={plan.key}
                              className="px-4 py-3.5 text-center"
                              style={{ backgroundColor: plan.popular ? REC_BAND : undefined }}
                            >
                              <CompareCell value={fila.values[plan.key]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {/* Fila de cierre con CTA por columna */}
                  <tr className="border-t" style={{ borderColor: LINE }}>
                    <td className="px-5 py-5" />
                    {PLANES.map((plan) => (
                      <td key={plan.key} className="px-4 py-5 text-center" style={{ backgroundColor: plan.popular ? REC_BAND : undefined }}>
                        {plan.comingSoon ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: EYEBROW }}>
                            <Clock className="h-3.5 w-3.5" />
                            Pronto
                          </span>
                        ) : (
                          <PlanCTA
                            plan={plan}
                            className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold no-underline transition-colors"
                            style={plan.popular ? { backgroundColor: INK, color: '#fff' } : { color: ACCENT }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="pb-24">
          <div className="overflow-hidden rounded-3xl px-7 py-12 text-white sm:px-12" style={{ backgroundColor: INK }}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT_ON_INK }}>
                  Siguiente paso
                </p>
                <h2 className="mt-4 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl" style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}>
                  Cuando el plan está claro,
                  <br />
                  empezar debe ser simple.
                </h2>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/75">
                  Crea la cuenta de tu clínica o escríbenos si necesitas revisar migración,
                  implementación o una propuesta más acompañada.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:w-64">
                <Link to="/registro" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-[#f1e9dc]" style={{ color: INK }}>
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="mailto:hola@bourgelat.co?subject=Quiero%20revisar%20los%20planes%20de%20Bourgelat" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-white/15">
                  Hablar con el equipo
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer cálido ── */}
      <footer className="border-t" style={{ borderColor: LINE, backgroundColor: SURFACE }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="max-w-2xl text-sm leading-7" style={{ color: BODY }}>
            Bourgelat construye una experiencia más clara para recepción, consulta, caja y
            seguimiento dentro de la operación veterinaria en Colombia.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/nosotros" className="no-underline transition-colors hover:text-[#b07645]" style={{ color: BODY }}>Nosotros</Link>
            <Link to="/privacidad" className="no-underline transition-colors hover:text-[#b07645]" style={{ color: BODY }}>Privacidad</Link>
            <Link to="/terminos" className="no-underline transition-colors hover:text-[#b07645]" style={{ color: BODY }}>Términos</Link>
            <Link to="/cookies" className="no-underline transition-colors hover:text-[#b07645]" style={{ color: BODY }}>Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
