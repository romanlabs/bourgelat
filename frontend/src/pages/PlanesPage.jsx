import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

import PublicPageShell from '@/components/shared/PublicPageShell'

const PLANES = [
  {
    key: 'inicio',
    nombre: 'Inicio Gratis',
    subtitulo: 'Para digitalizar lo esencial',
    resumen:
      'Ideal para consultorios o clinicas que quieren ordenar agenda, pacientes e historia clinica sin empezar por una configuracion pesada.',
    precioMensual: 0,
    precioAnual: 0,
    badge: 'Entrada simple',
    cta: 'Crear cuenta gratis',
    to: '/registro',
    limites: ['1 sede', '2 usuarios', '250 mascotas activas', '1 GB base'],
    incluye: [
      'Agenda de citas',
      'Propietarios y mascotas',
      'Historia clinica basica',
      'Antecedentes del paciente',
      'Roles operativos base',
    ],
  },
  {
    key: 'clinica',
    nombre: 'Clinica',
    subtitulo: 'Para operar el dia completo',
    resumen:
      'Pensado para equipos que ya necesitan unir agenda, consulta, inventario y caja dentro de un mismo sistema.',
    precioMensual: 99000,
    precioAnual: 79000,
    badge: 'Operacion diaria',
    cta: 'Elegir plan Clinica',
    to: '/registro',
    limites: ['1 sede', '5 usuarios', '2.500 mascotas activas', '5 GB base'],
    incluye: [
      'Todo lo de Inicio Gratis',
      'Inventario operativo',
      'Caja y facturacion interna',
      'Dashboard basico',
      'Reportes operativos',
    ],
  },
  {
    key: 'profesional',
    nombre: 'Profesional',
    subtitulo: 'El plan principal',
    resumen:
      'La opcion recomendada para clinicas que quieren una operacion mas completa y facturacion electronica DIAN en el mismo flujo.',
    precioMensual: 189000,
    precioAnual: 159000,
    badge: 'Mas elegido',
    popular: true,
    cta: 'Elegir plan Profesional',
    to: '/registro',
    limites: ['1 sede', '12 usuarios', '10.000 mascotas activas', '20 GB base'],
    incluye: [
      'Todo lo de Clinica',
      'Facturacion electronica DIAN',
      'Inventario avanzado',
      'Reportes completos',
      'Exportables y cierre mas solido',
    ],
  },
  {
    key: 'personalizado',
    nombre: 'Personalizado',
    subtitulo: 'Migracion y acompanamiento',
    resumen:
      'Para clinicas que necesitan una propuesta con mas acompanamiento, configuracion guiada o una migracion mas cuidada.',
    precioMensual: null,
    precioAnual: null,
    badge: 'Cotizacion guiada',
    cta: 'Hablar con el equipo',
    href: 'mailto:hola@bourgelat.co?subject=Quiero%20cotizar%20Bourgelat',
    limites: ['Volumen a medida', 'Usuarios segun alcance', 'Migracion guiada', 'Acompanamiento comercial'],
    incluye: [
      'Base de Profesional',
      'Revision del caso',
      'Acompanamiento de migracion',
      'Configuracion guiada',
      'Seguimiento inicial con el equipo',
    ],
  },
]

const COMPARISON_ROWS = [
  {
    label: 'Agenda, pacientes e historia clinica',
    values: { inicio: true, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Inventario operativo',
    values: { inicio: false, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Caja y facturacion interna',
    values: { inicio: false, clinica: true, profesional: true, personalizado: true },
  },
  {
    label: 'Facturacion electronica DIAN',
    values: { inicio: false, clinica: false, profesional: true, personalizado: true },
  },
  {
    label: 'Reportes completos y exportables',
    values: { inicio: false, clinica: false, profesional: true, personalizado: true },
  },
  {
    label: 'Acompanamiento de migracion',
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
    title: 'Si estas digitalizando por primera vez',
    body:
      'Inicio Gratis te deja ordenar agenda, pacientes e historia clinica sin meterte de una en un despliegue mas grande.',
  },
  {
    title: 'Si ya cobras, compras y controlas stock todos los dias',
    body:
      'Clinica empieza a tener mas sentido porque la operacion ya necesita inventario, caja y reportes dentro del mismo entorno.',
  },
  {
    title: 'Si quieres cerrar el circulo completo',
    body:
      'Profesional es el plan mas natural cuando la clinica quiere agenda, consulta, administracion y facturacion electronica DIAN en un solo recorrido.',
  },
]

const FAQS = [
  {
    pregunta: 'En que plan entra la facturacion electronica DIAN?',
    respuesta:
      'La facturacion electronica DIAN aparece en Profesional y Personalizado. En la pagina de venta solo necesitas entender eso; la implementacion interna se gestiona despues.',
  },
  {
    pregunta: 'Puedo empezar gratis y subir despues?',
    respuesta:
      'Si. La idea es que una clinica pueda empezar con orden y subir de plan cuando la operacion diaria ya pida mas control.',
  },
  {
    pregunta: 'Que plan suele elegir una clinica que ya factura todos los dias?',
    respuesta:
      'Normalmente Profesional, porque es donde la experiencia ya cubre agenda, consulta, inventario, caja, reportes y DIAN dentro del mismo flujo.',
  },
  {
    pregunta: 'Cuando conviene hablar con el equipo?',
    respuesta:
      'Cuando necesitas migracion, acompanamiento mas cercano o una configuracion con volumen y alcance fuera del caso estandar.',
  },
]

function formatPrice(value) {
  if (value === null) return 'Cotizacion guiada'
  if (value === 0) return 'COP 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function PlanCTA({ plan, className }) {
  if (plan.href) {
    return (
      <a href={plan.href} className={className}>
        {plan.cta}
      </a>
    )
  }

  return (
    <Link to={plan.to} className={className}>
      {plan.cta}
    </Link>
  )
}

function FAQItem({ pregunta, respuesta }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-[28px] border border-[#d7e4ee] bg-white p-5 shadow-[0_12px_36px_rgba(8,25,39,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 bg-transparent text-left"
      >
        <span className="text-base font-semibold text-[#10263a]">{pregunta}</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff5fb] text-[#456c85]">
          <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open ? <p className="mt-4 text-sm leading-7 text-[#567185]">{respuesta}</p> : null}
    </div>
  )
}

export default function PlanesPage() {
  const [anual, setAnual] = useState(false)

  return (
    <PublicPageShell
      eyebrow="Planes Bourgelat"
      title="Planes que se entienden rapido y crecen con la clinica."
      description="La comparativa ahora esta escrita para un cliente real: que incluye cada etapa, cuando entra la DIAN y cual suele ser el siguiente paso natural segun el nivel de operacion."
    >
      <section className="mb-10 rounded-[32px] border border-[#d6e3ee] bg-[linear-gradient(145deg,#0b1724,#13314a,#0f3f43)] p-6 text-white shadow-[0_30px_100px_rgba(6,22,35,0.18)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9debe4]">
              <Sparkles className="h-3.5 w-3.5" />
              Facturacion electronica DIAN en Profesional y Personalizado
            </div>
            <h2
              className="mt-5 text-4xl leading-none tracking-[-0.05em] text-white md:text-5xl"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
            >
              Empieza simple. Sube cuando tu operacion ya pida mas control.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/76 md:text-base">
              No necesitas aprender una estructura complicada para decidir. Lo importante es saber
              si hoy estas ordenando lo esencial, operando el dia completo o cerrando el circulo
              clinico, administrativo y fiscal.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9debe4]">
              Mostrar precios
            </p>
            <div className="mt-4 flex rounded-full border border-white/10 bg-white/6 p-1">
              <button
                type="button"
                onClick={() => setAnual(false)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${!anual ? 'bg-white text-[#10263a]' : 'text-white/72'}`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setAnual(true)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${anual ? 'bg-white text-[#10263a]' : 'text-white/72'}`}
              >
                Anual
              </button>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/68">
              El modo anual muestra el valor mensual equivalente para equipos que quieren una
              proyeccion mas predecible.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-20 grid gap-6 xl:grid-cols-4">
        {PLANES.map((plan) => {
          const highlighted = plan.popular
          const price = anual ? plan.precioAnual : plan.precioMensual
          return (
            <article
              key={plan.key}
              className={`rounded-[32px] border p-6 ${highlighted ? 'border-[#8fe0da] bg-[linear-gradient(160deg,#0e2a3d,#13354e,#10525a)] text-white shadow-[0_32px_90px_rgba(13,44,58,0.24)]' : 'border-[#d7e4ee] bg-white text-[#112739] shadow-[0_18px_60px_rgba(8,25,39,0.05)]'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${highlighted ? 'text-[#9debe4]' : 'text-[#5c778d]'}`}>
                    {plan.badge}
                  </p>
                  <h2
                    className="mt-4 text-4xl leading-none tracking-[-0.05em]"
                    style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
                  >
                    {plan.nombre}
                  </h2>
                </div>
                {highlighted ? (
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    recomendado
                  </span>
                ) : null}
              </div>

              <p className={`mt-4 text-sm leading-7 ${highlighted ? 'text-white/76' : 'text-[#567185]'}`}>
                {plan.subtitulo}
              </p>
              <p className="mt-5 text-3xl font-semibold">
                {formatPrice(price)}
                {price !== null ? <span className={`ml-1 text-sm font-medium ${highlighted ? 'text-white/62' : 'text-[#68839a]'}`}>/mes</span> : null}
              </p>
              <p className={`mt-4 text-sm leading-7 ${highlighted ? 'text-white/82' : 'text-[#48647b]'}`}>
                {plan.resumen}
              </p>

              <div className="mt-6 space-y-3">
                {plan.incluye.map((item) => (
                  <div key={item} className={`flex items-start gap-3 text-sm leading-6 ${highlighted ? 'text-white/88' : 'text-[#24435c]'}`}>
                    <Check className={`mt-1 h-4 w-4 shrink-0 ${highlighted ? 'text-[#9debe4]' : 'text-[#2c7d7a]'}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-black/5 bg-black/[0.03] p-4">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${highlighted ? 'text-white/60' : 'text-[#68839a]'}`}>
                  Limites y alcance
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.limites.map((item) => (
                    <span
                      key={item}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${highlighted ? 'bg-white/10 text-white/86' : 'bg-[#eef5fb] text-[#35536b]'}`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <PlanCTA
                plan={plan}
                className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold no-underline transition ${highlighted ? 'bg-white text-[#10263a] hover:bg-[#effaf8]' : 'bg-[#10263a] text-white hover:bg-[#17364f]'}`}
              />
            </article>
          )
        })}
      </section>

      <section className="mb-20 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[32px] border border-[#d7e4ee] bg-white p-6 shadow-[0_18px_60px_rgba(8,25,39,0.05)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3c7d8d]">
            Como suele decidir una clinica
          </p>
          <h2
            className="mt-4 text-4xl leading-none tracking-[-0.05em] text-[#10263a] md:text-5xl"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
          >
            No es una tabla infinita. Es una eleccion segun el momento de la operacion.
          </h2>
          <div className="mt-8 space-y-4">
            {PLAN_MATCH.map((item) => (
              <div key={item.title} className="rounded-[26px] border border-[#d7e4ee] bg-[#f7fafc] p-5">
                <h3 className="text-lg font-semibold text-[#10263a]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#567185]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#d7e4ee] bg-[linear-gradient(145deg,#0b1724,#13314a,#0f3f43)] p-6 text-white shadow-[0_30px_90px_rgba(8,25,39,0.18)] md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/10 text-[#9debe4]">
            <Shield className="h-5 w-5" />
          </div>
          <h3
            className="mt-5 text-4xl leading-none tracking-[-0.05em]"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
          >
            Profesional suele ser el ancla correcta.
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/78">
            Es el plan que mejor cuenta la propuesta de valor completa de Bourgelat: operacion
            clinica, administracion y facturacion electronica DIAN dentro del mismo flujo.
          </p>

          <div className="mt-6 space-y-3">
            {[
              'Muestra el valor real del producto.',
              'No obliga a vender complejidad demasiado pronto.',
              'Se siente como una evolucion natural desde Inicio o Clinica.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/86">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#9debe4]" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <Link
            to="/registro"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#10263a] no-underline transition hover:bg-[#effaf8]"
          >
            Empezar con Bourgelat
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mb-20 overflow-hidden rounded-[32px] border border-[#d7e4ee] bg-white shadow-[0_18px_60px_rgba(8,25,39,0.05)]">
        <div className="overflow-x-auto">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[290px_repeat(4,minmax(0,1fr))] border-b border-[#e3edf4] bg-[#f7fafc]">
              <div className="px-5 py-4 text-sm font-semibold text-[#5e7b91]">Comparativa rapida</div>
              {PLANES.map((plan) => (
                <div key={plan.key} className="border-l border-[#e3edf4] px-4 py-4 text-sm font-semibold text-[#10263a]">
                  {plan.nombre}
                </div>
              ))}
            </div>

            {COMPARISON_ROWS.map((row) => (
              <div key={row.label} className="grid grid-cols-[290px_repeat(4,minmax(0,1fr))] border-b border-[#e3edf4]">
                <div className="px-5 py-4 text-sm font-medium text-[#264158]">{row.label}</div>
                {PLANES.map((plan) => {
                  const value = row.values[plan.key]
                  return (
                    <div key={`${row.label}-${plan.key}`} className="flex items-center justify-center border-l border-[#e3edf4] px-4 py-4">
                      {row.type === 'text' ? (
                        <span className="text-sm font-semibold text-[#10263a]">{value}</span>
                      ) : value ? (
                        <Check className="h-4 w-4 text-[#2c7d7a]" />
                      ) : (
                        <X className="h-4 w-4 text-[#9fb2c2]" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-8 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3c7d8d]">
            Preguntas frecuentes
          </p>
          <h2
            className="mt-4 text-4xl leading-none tracking-[-0.05em] text-[#10263a] md:text-5xl"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
          >
            Lo importante antes de elegir.
          </h2>
        </div>

        <div className="grid gap-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.pregunta} pregunta={faq.pregunta} respuesta={faq.respuesta} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(145deg,#0b1724,#13314a,#0f3f43)] p-8 text-white shadow-[0_36px_120px_rgba(8,25,39,0.18)] md:p-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9debe4]">
              Siguiente paso
            </p>
            <h2
              className="mt-4 text-4xl leading-none tracking-[-0.05em] text-white md:text-5xl"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
            >
              La pagina ya le habla mejor a la clinica. El siguiente clic deberia ser mas natural.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-white/78 md:text-base">
              Con esta version, la comparativa se siente mas sobria, mas comprable y mucho menos
              cargada de texto interno. Ahora el cliente entiende rapido si esta empezando, operando
              el dia completo o buscando una implementacion mas guiada.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[#10263a] no-underline transition hover:bg-[#effaf8]"
            >
              Crear cuenta principal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:hola@bourgelat.co?subject=Quiero%20revisar%20los%20planes%20de%20Bourgelat"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3.5 text-sm font-semibold text-white no-underline transition hover:bg-white/12"
            >
              Hablar con el equipo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
