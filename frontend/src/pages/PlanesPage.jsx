import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Minus } from 'lucide-react'

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

const PLANES = [
  {
    key: 'inicio',
    nombre: 'Esencial',
    subtitulo: 'Para empezar con orden',
    resumen:
      'Para consultorios que quieren ordenar agenda, pacientes e historia clínica sin una configuración pesada.',
    precioMensual: 0,
    precioAnual: 0,
    cta: 'Crear cuenta',
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
    resumen:
      'Para equipos que ya necesitan unir agenda, consulta, inventario y caja en un mismo sistema.',
    precioMensual: 99000,
    precioAnual: 79000,
    cta: 'Elegir Clínica',
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
    subtitulo: 'El plan principal',
    resumen:
      'La opción recomendada: operación completa y facturación electrónica DIAN dentro del mismo flujo.',
    precioMensual: 189000,
    precioAnual: 159000,
    popular: true,
    cta: 'Elegir Profesional',
    to: '/registro',
    limites: ['12 usuarios', '10.000 mascotas', '20 GB'],
    incluye: [
      'Todo lo de Clínica',
      'Facturación electrónica DIAN',
      'Inventario avanzado',
      'Reportes completos y exportables',
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

const COMPARISON_ROWS = [
  {
    label: 'Agenda, pacientes e historia clínica',
    values: { inicio: true, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Inventario operativo',
    values: { inicio: false, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Caja y facturación interna',
    values: { inicio: false, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Facturación electrónica DIAN',
    values: { inicio: false, clinica: false, profesional: true, personalizado: true },
  },
  {
    label: 'Reportes completos y exportables',
    values: { inicio: false, clinica: false, profesional: true, personalizado: true },
  },
  {
    label: 'Acompañamiento de migración',
    values: { inicio: false, clinica: false, profesional: false, personalizado: true },
  },
  {
    label: 'Usuarios incluidos',
    type: 'text',
    values: { inicio: '2', clinica: '5', profesional: '12', personalizado: 'A medida' },
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

function formatPrice(value) {
  if (value === null) return 'A medida'
  if (value === 0) return 'Gratis'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function PlanCTA({ plan, className, style }) {
  if (plan.href) {
    return (
      <a href={plan.href} className={className} style={style}>
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    )
  }
  return (
    <Link to={plan.to} className={className} style={style}>
      {plan.cta}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function PlanCard({ plan, anual }) {
  const price = anual ? plan.precioAnual : plan.precioMensual
  const anchor = plan.popular

  if (anchor) {
    return (
      <article
        className="relative flex flex-col rounded-2xl p-7 text-white shadow-[0_30px_70px_-20px_rgba(43,32,24,0.45)] lg:-my-3"
        style={{ backgroundColor: INK }}
      >
        <span
          className="absolute right-6 top-0 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
        >
          Más elegido
        </span>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: ACCENT_ON_INK }}
        >
          {plan.subtitulo}
        </p>
        <h3
          className="mt-3 text-4xl leading-none tracking-[-0.04em]"
          style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
        >
          {plan.nombre}
        </h3>
        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold">{formatPrice(price)}</span>
          {price ? <span className="text-sm text-white/55">/mes</span> : null}
        </div>
        <p className="mt-4 text-sm leading-7 text-white/75">{plan.resumen}</p>

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
            <span
              key={item}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
            >
              {item}
            </span>
          ))}
        </div>

        <PlanCTA
          plan={plan}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-[#f1e9dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ color: INK }}
        />
      </article>
    )
  }

  return (
    <article
      className="flex flex-col rounded-2xl border p-7 transition-shadow hover:shadow-[0_24px_60px_-30px_rgba(43,32,24,0.35)]"
      style={{ backgroundColor: SURFACE, borderColor: LINE, color: INK }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: EYEBROW }}
      >
        {plan.subtitulo}
      </p>
      <h3
        className="mt-3 text-4xl leading-none tracking-[-0.04em]"
        style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}
      >
        {plan.nombre}
      </h3>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold">{formatPrice(price)}</span>
        {price ? <span className="text-sm" style={{ color: BODY }}>/mes</span> : null}
      </div>
      <p className="mt-4 text-sm leading-7" style={{ color: BODY }}>
        {plan.resumen}
      </p>

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
          <span
            key={item}
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: CHIP, color: '#5b4c3c' }}
          >
            {item}
          </span>
        ))}
      </div>

      <PlanCTA
        plan={plan}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md border px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07645]"
        style={{ borderColor: LINE, color: INK }}
      />
    </article>
  )
}

export default function PlanesPage() {
  const [anual, setAnual] = useState(false)

  useEffect(() => {
    document.title = 'Planes | Bourgelat'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM, color: INK }}>
      {/* ── Header cálido propio (las anclas de la landing no aplican en /planes) ── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: LINE, backgroundColor: 'rgba(248,244,238,0.85)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="group no-underline">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors hover:text-[#b07645] sm:inline-flex"
              style={{ color: BODY }}
            >
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
            <Link
              to="/login"
              className="rounded-md border px-4 py-2 text-sm font-semibold no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645]"
              style={{ borderColor: 'rgba(43,32,24,0.25)', color: INK }}
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#b07645]"
              style={{ backgroundColor: INK }}
            >
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
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: EYEBROW }}
              >
                Planes Bourgelat
              </p>
              <h1
                className="mt-4 text-[2.8rem] leading-[0.95] tracking-[-0.045em] sm:text-6xl"
                style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}
              >
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
              <div
                className="inline-flex rounded-full border p-1"
                style={{ borderColor: LINE, backgroundColor: SURFACE }}
                role="group"
                aria-label="Periodicidad de precios"
              >
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
                  className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                  style={anual ? { backgroundColor: INK, color: '#fff' } : { color: BODY }}
                >
                  Anual
                </button>
              </div>
              <p className="mt-2 max-w-[200px] text-right text-xs leading-5" style={{ color: BODY }}>
                Anual muestra el valor mensual equivalente.
              </p>
            </div>
          </div>
        </section>

        {/* ── Cards de planes ── */}
        <section className="grid gap-5 pb-20 lg:grid-cols-4 lg:items-center">
          {PLANES.map((plan) => (
            <PlanCard key={plan.key} plan={plan} anual={anual} />
          ))}
        </section>

        {/* ── Cómo decide una clínica ── */}
        <section className="pb-20">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: EYEBROW }}
          >
            Cómo suele decidir una clínica
          </p>
          <h2
            className="mt-4 max-w-2xl text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl"
            style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, color: INK }}
          >
            Una elección según el momento, no un catálogo.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLAN_MATCH.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border p-6"
                style={{ backgroundColor: SURFACE, borderColor: LINE }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: ACCENT }}
                >
                  {item.momento}
                </span>
                <h3 className="mt-3 text-lg font-semibold" style={{ color: INK }}>
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7" style={{ color: BODY }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparativa ── */}
        <section className="pb-20">
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ backgroundColor: SURFACE, borderColor: LINE }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr style={{ backgroundColor: CREAM }}>
                    <th
                      className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: BODY }}
                    >
                      Comparativa
                    </th>
                    {PLANES.map((plan) => (
                      <th
                        key={plan.key}
                        className="px-4 py-4 text-center text-sm font-semibold"
                        style={{ color: plan.popular ? ACCENT : INK }}
                      >
                        {plan.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.label} className="border-t" style={{ borderColor: LINE }}>
                      <td className="px-5 py-4 text-sm font-medium" style={{ color: '#3f342a' }}>
                        {row.label}
                      </td>
                      {PLANES.map((plan) => {
                        const value = row.values[plan.key]
                        return (
                          <td key={`${row.label}-${plan.key}`} className="px-4 py-4 text-center">
                            {row.type === 'text' ? (
                              <span className="text-sm font-semibold" style={{ color: INK }}>
                                {value}
                              </span>
                            ) : value ? (
                              <Check className="mx-auto h-4 w-4" style={{ color: ACCENT }} />
                            ) : (
                              <Minus className="mx-auto h-4 w-4" style={{ color: '#c9bba9' }} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="pb-24">
          <div
            className="overflow-hidden rounded-3xl px-7 py-12 text-white sm:px-12"
            style={{ backgroundColor: INK }}
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                  style={{ color: ACCENT_ON_INK }}
                >
                  Siguiente paso
                </p>
                <h2
                  className="mt-4 text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl"
                  style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                >
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
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3.5 text-sm font-semibold no-underline transition-colors hover:bg-[#f1e9dc]"
                  style={{ color: INK }}
                >
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="mailto:hola@bourgelat.co?subject=Quiero%20revisar%20los%20planes%20de%20Bourgelat"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-white/15"
                >
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
