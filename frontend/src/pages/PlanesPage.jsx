import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Package,
  Receipt,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'

import PublicPageShell from '@/components/shared/PublicPageShell'

void motion

const PLANES = [
  {
    key: 'inicio',
    nombre: 'Inicio Gratis',
    subtitulo: 'Para digitalizar lo esencial',
    resumen:
      'Empieza sin friccion, ordena agenda y pacientes, y valida si Bourgelat encaja con el ritmo real de tu clinica.',
    precioMensual: 0,
    precioAnual: 0,
    badge: 'Acceso permanente',
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
    nota:
      'No incluye inventario completo, caja, facturacion interna ni facturacion electronica.',
  },
  {
    key: 'clinica',
    nombre: 'Clinica',
    subtitulo: 'Operacion diaria ordenada',
    resumen:
      'Pensado para clinicas pequenas y medianas que ya necesitan operar agenda, consulta, inventario y caja en el mismo sistema.',
    precioMensual: 99000,
    precioAnual: 79000,
    badge: 'Primer plan pago',
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
    nota:
      'Aun no incluye facturacion electronica; esta pensado para estabilizar la operacion diaria.',
  },
  {
    key: 'profesional',
    nombre: 'Profesional',
    subtitulo: 'Control clinico, administrativo y fiscal',
    resumen:
      'El plan principal para clinicas que quieren centralizar consulta, cobro, reportes y facturacion electronica en un solo flujo.',
    precioMensual: 189000,
    precioAnual: 159000,
    badge: 'Mas elegido',
    popular: true,
    cta: 'Elegir plan Profesional',
    to: '/registro',
    limites: ['1 sede', '12 usuarios', '10.000 mascotas activas', '20 GB base'],
    incluye: [
      'Todo lo de Clinica',
      'Facturacion electronica',
      'Inventario avanzado',
      'Reportes completos',
      'Exportables y cierre mas solido',
    ],
    nota:
      'Es el plan recomendado para una operacion ya madura que necesita mas trazabilidad y control financiero.',
  },
  {
    key: 'personalizado',
    nombre: 'Personalizado',
    subtitulo: 'Acompanamiento segun alcance',
    resumen:
      'Para clinicas que necesitan una propuesta comercial con mas acompanamiento de implementacion, migracion y configuracion.',
    precioMensual: null,
    precioAnual: null,
    badge: 'Cotizacion guiada',
    cta: 'Hablar con el equipo',
    href: 'mailto:hola@bourgelat.co?subject=Quiero%20cotizar%20Bourgelat',
    limites: ['Volumen a medida', 'Usuarios segun alcance', 'Migracion guiada', 'Acompanamiento comercial'],
    incluye: [
      'Base de Profesional',
      'Revision del caso comercial',
      'Acompanamiento de migracion',
      'Activacion orientada',
      'Seguimiento inicial con el equipo',
    ],
    nota:
      'No es humo tecnico: se cotiza segun alcance, volumen y nivel de acompanamiento que realmente necesita la clinica.',
  },
]

const TRIAL_STEPS = [
  {
    numero: '01',
    titulo: 'Prueba de 14 dias',
    cuerpo:
      'La entrada recomendada es una prueba guiada con el alcance de Profesional para evaluar agenda, inventario, caja y reportes.',
  },
  {
    numero: '02',
    titulo: 'Decides con uso real',
    cuerpo:
      'Al terminar la prueba, la clinica ya habra visto su flujo diario con datos reales y podra decidir con mas criterio.',
  },
  {
    numero: '03',
    titulo: 'Continua gratis o escala',
    cuerpo:
      'Si aun no estas lista para pagar, puedes continuar en Inicio Gratis. Si ya necesitas operar completo, subes de plan.',
  },
]

const COMPARISON_SECTIONS = [
  {
    titulo: 'Operacion base',
    icon: Calendar,
    rows: [
      {
        label: 'Agenda de citas',
        values: { inicio: true, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Propietarios y mascotas',
        values: { inicio: true, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Historia clinica y antecedentes',
        values: { inicio: true, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Bloqueo y trazabilidad clinica',
        values: { inicio: true, clinica: true, profesional: true, personalizado: true },
      },
    ],
  },
  {
    titulo: 'Operacion administrativa',
    icon: Receipt,
    rows: [
      {
        label: 'Inventario operativo',
        values: { inicio: false, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Caja y facturacion interna',
        values: { inicio: false, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Reportes operativos',
        values: { inicio: false, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Facturacion electronica',
        values: { inicio: false, clinica: false, profesional: true, personalizado: true },
      },
    ],
  },
  {
    titulo: 'Capacidad y crecimiento',
    icon: Users,
    rows: [
      {
        label: 'Usuarios incluidos',
        type: 'text',
        values: { inicio: '2', clinica: '5', profesional: '12', personalizado: 'A medida' },
      },
      {
        label: 'Mascotas activas',
        type: 'text',
        values: { inicio: '250', clinica: '2.500', profesional: '10.000', personalizado: 'A medida' },
      },
      {
        label: 'Almacenamiento base',
        type: 'text',
        values: { inicio: '1 GB', clinica: '5 GB', profesional: '20 GB', personalizado: 'Segun alcance' },
      },
      {
        label: 'Reporte completo y exportables',
        values: { inicio: false, clinica: false, profesional: true, personalizado: true },
      },
    ],
  },
  {
    titulo: 'Acompanamiento',
    icon: Shield,
    rows: [
      {
        label: 'Soporte por email',
        values: { inicio: true, clinica: true, profesional: true, personalizado: true },
      },
      {
        label: 'Soporte prioritario comercial',
        values: { inicio: false, clinica: false, profesional: false, personalizado: true },
      },
      {
        label: 'Acompanamiento de migracion',
        values: { inicio: false, clinica: false, profesional: false, personalizado: true },
      },
      {
        label: 'Onboarding guiado',
        values: { inicio: false, clinica: false, profesional: false, personalizado: true },
      },
    ],
  },
]

const FAQS = [
  {
    pregunta: 'Que incluye la prueba de 14 dias?',
    respuesta:
      'La propuesta comercial se apoya en una prueba guiada con alcance de Profesional para que la clinica vea agenda, consulta, inventario, caja y reportes antes de decidir.',
  },
  {
    pregunta: 'Que pasa cuando termina la prueba?',
    respuesta:
      'La clinica puede elegir continuar en Inicio Gratis con limites claros o subir a Clinica o Profesional si ya necesita operar completo.',
  },
  {
    pregunta: 'Puedo empezar gratis y pasar a un plan pago despues?',
    respuesta:
      'Si. La idea del freemium es quitar friccion de entrada sin obligarte a pagar antes de comprobar el valor del sistema en tu operacion.',
  },
  {
    pregunta: 'Hay permanencia o tarjeta de credito obligatoria?',
    respuesta:
      'No. La estructura propuesta busca una entrada simple y una conversion por valor, no por amarre contractual.',
  },
  {
    pregunta: 'Como funcionan los limites del plan Inicio Gratis?',
    respuesta:
      'Se limita la cantidad de usuarios, mascotas activas y almacenamiento para que el plan siga siendo util, pero no sustituya el valor del plan pago.',
  },
  {
    pregunta: 'Que especies soporta Bourgelat?',
    respuesta:
      'La operacion esta pensada para clinicas veterinarias y consultorios que atienden caninos, felinos y otras especies sin restringir el tipo de paciente por plan.',
  },
]

const themeByPlan = {
  inicio: {
    glow: 'shadow-[0_26px_70px_rgba(20,184,166,0.16)]',
    border: 'border-teal-400/25',
    badge: 'bg-teal-300/12 text-teal-100',
    button: 'bg-teal-300 text-slate-950 hover:bg-teal-200',
    highlighted: 'bg-teal-300/10',
    check: 'text-teal-200',
    gradient: 'linear-gradient(145deg, rgba(17,94,89,0.95), rgba(8,47,73,0.94))',
  },
  clinica: {
    glow: 'shadow-[0_26px_70px_rgba(45,212,191,0.14)]',
    border: 'border-cyan-400/25',
    badge: 'bg-cyan-300/12 text-cyan-100',
    button: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200',
    highlighted: 'bg-cyan-300/10',
    check: 'text-cyan-200',
    gradient: 'linear-gradient(145deg, rgba(12,74,110,0.96), rgba(15,118,110,0.92))',
  },
  profesional: {
    glow: 'shadow-[0_28px_80px_rgba(103,232,249,0.18)]',
    border: 'border-sky-300/35',
    badge: 'bg-sky-200/14 text-sky-100',
    button: 'bg-white text-slate-950 hover:bg-slate-100',
    highlighted: 'bg-sky-300/12',
    check: 'text-sky-100',
    gradient: 'linear-gradient(145deg, rgba(14,116,144,0.98), rgba(14,165,233,0.78))',
  },
  personalizado: {
    glow: 'shadow-[0_26px_70px_rgba(148,163,184,0.14)]',
    border: 'border-slate-300/20',
    badge: 'bg-slate-200/12 text-slate-100',
    button: 'bg-slate-200 text-slate-950 hover:bg-white',
    highlighted: 'bg-slate-300/10',
    check: 'text-slate-100',
    gradient: 'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(51,65,85,0.92))',
  },
}

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)

const renderPrice = (plan, anual) => {
  if (plan.precioMensual === null) {
    return {
      value: 'Cotizar',
      note: 'Segun alcance y acompanamiento',
    }
  }

  if (plan.precioMensual === 0) {
    return {
      value: '$0',
      note: 'Sin tarjeta de credito',
    }
  }

  return {
    value: formatCOP(anual ? plan.precioAnual : plan.precioMensual),
    note: anual ? 'por mes, cobro anual' : 'por mes, cobro mensual',
  }
}

const FAQItem = ({ pregunta, respuesta }) => {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="text-sm font-semibold text-white md:text-[15px]">{pregunta}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-cyan-200"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <p className="border-t border-white/8 px-6 pb-5 pt-4 text-sm leading-7 text-slate-300">
              {respuesta}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

const PlanCTA = ({ plan, className }) => {
  if (plan.href) {
    return (
      <a href={plan.href} className={className}>
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    )
  }

  return (
    <Link to={plan.to} className={className}>
      {plan.cta}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

export default function PlanesPage() {
  const [anual, setAnual] = useState(false)
  const [selected, setSelected] = useState('profesional')

  return (
    <PublicPageShell
      eyebrow="Planes Bourgelat"
      title="Planes claros para crecer con orden"
      description="Empieza gratis, valida el flujo de tu clinica y escala solo cuando de verdad necesites mas operacion, mas control o mas acompanamiento."
    >
      <section className="mb-12 rounded-[32px] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(8,47,73,0.9),rgba(15,23,42,0.96),rgba(6,78,59,0.88))] p-6 shadow-[0_30px_90px_rgba(8,47,73,0.28)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Entrada recomendada
            </div>
            <h2
              className="max-w-3xl text-4xl leading-none text-white md:text-5xl"
              style={{ fontFamily: 'Cormorant Garamond' }}
            >
              Prueba guiada de 14 dias y luego una version gratuita que si aporta valor.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200/85">
              El modelo recomendado para Bourgelat no es un gratis ilimitado. Es una entrada
              profesional para que la clinica vea el flujo completo y luego decida entre seguir en
              Inicio Gratis o subir a un plan pago con mas operacion y mas control.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            {[
              { label: '14 dias', body: 'con alcance de Profesional' },
              { label: 'Sin tarjeta', body: 'la decision viene despues' },
              { label: 'Sin friccion', body: 'puedes seguir en Inicio Gratis' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-white/8 bg-slate-950/35 px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/75">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Oferta recomendada
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
            La diferencia entre planes ya no esta en promesas infladas: esta en la profundidad de
            la operacion que la clinica puede sostener con Bourgelat.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] p-1 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setAnual(false)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              !anual ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setAnual(true)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              anual ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Anual
          </button>
          <span className="rounded-full bg-cyan-300/15 px-3 py-2 text-xs font-semibold text-cyan-100">
            hasta 20% menos
          </span>
        </div>
      </section>

      <section className="mb-20 grid gap-6 xl:grid-cols-4">
        {PLANES.map((plan, index) => {
          const active = selected === plan.key
          const theme = themeByPlan[plan.key]
          const price = renderPrice(plan, anual)

          return (
            <motion.article
              key={plan.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              onClick={() => setSelected(plan.key)}
              className={`relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[32px] border bg-white/[0.03] p-8 backdrop-blur-xl transition duration-300 ${theme.border} ${active ? `${theme.glow} ring-1 ring-white/16` : 'hover:bg-white/[0.05]'}`}
              style={{ backgroundImage: active ? theme.gradient : 'linear-gradient(145deg, rgba(15,23,42,0.88), rgba(17,24,39,0.92))' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_36%)] opacity-80" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${theme.badge}`}>
                    <Stethoscope className="h-3.5 w-3.5" />
                    {plan.badge}
                  </div>
                  {plan.popular ? (
                    <span className="rounded-full border border-white/14 bg-white/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Mas elegido
                    </span>
                  ) : null}
                </div>

                <div className="mb-6">
                  <h2
                    className="text-[38px] leading-none text-white"
                    style={{ fontFamily: 'Cormorant Garamond' }}
                  >
                    {plan.nombre}
                  </h2>
                  <p className="mt-3 text-sm font-medium text-cyan-100/78">{plan.subtitulo}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-200/86">{plan.resumen}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-semibold tracking-tight text-white">
                      {price.value}
                    </span>
                    {plan.precioMensual !== null ? (
                      <span className="pb-1 text-sm text-slate-200/70">/ mes</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-300/70">{price.note}</p>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                  {plan.limites.map((limit) => (
                    <span
                      key={limit}
                      className="rounded-full border border-white/10 bg-slate-950/28 px-3 py-2 text-xs font-medium text-slate-200/85"
                    >
                      {limit}
                    </span>
                  ))}
                </div>

                <div className="mb-7 space-y-3">
                  {plan.incluye.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/92">
                      <Check className={`mt-1 h-4 w-4 shrink-0 ${theme.check}`} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-7 rounded-[24px] border border-white/10 bg-slate-950/28 p-4">
                  <p className="text-sm leading-7 text-slate-200/80">{plan.nota}</p>
                </div>

                <div className="mt-auto">
                  <PlanCTA
                    plan={plan}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold transition ${theme.button}`}
                  />
                </div>
              </div>
            </motion.article>
          )
        })}
      </section>

      <section className="mb-20 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Como se entra al producto
          </p>
          <h2
            className="mt-3 text-4xl text-white md:text-5xl"
            style={{ fontFamily: 'Cormorant Garamond' }}
          >
            Una ruta comercial que no devalua la marca.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            El freemium tiene sentido si se usa para captacion y no para regalar toda la operacion.
            Por eso la propuesta combina prueba guiada, permanencia gratuita util y escalamiento por
            valor real.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TRIAL_STEPS.map((step, index) => (
            <motion.div
              key={step.numero}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="rounded-[28px] border border-white/10 bg-slate-950/32 p-6"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100">
                <span
                  className="text-2xl leading-none"
                  style={{ fontFamily: 'Cormorant Garamond' }}
                >
                  {step.numero}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{step.titulo}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{step.cuerpo}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Comparativa comercial
          </p>
          <h2
            className="mt-3 text-4xl text-white md:text-5xl"
            style={{ fontFamily: 'Cormorant Garamond' }}
          >
            Lo que si cambia entre un plan y otro.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            La tabla ya no gira alrededor de modulos inflados. Se enfoca en capacidad operativa,
            profundidad administrativa y nivel de acompanamiento.
          </p>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[260px_repeat(4,minmax(0,1fr))] border-b border-white/8">
                <div className="p-5" />
                {PLANES.map((plan) => {
                  const active = selected === plan.key
                  const price = renderPrice(plan, anual)
                  return (
                    <button
                      type="button"
                      key={plan.key}
                      onClick={() => setSelected(plan.key)}
                      className={`border-l border-white/8 px-4 py-5 text-left transition ${active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <p className="text-sm font-semibold text-white">{plan.nombre}</p>
                      <p className="mt-1 text-xs text-slate-300/70">{price.value}</p>
                    </button>
                  )
                })}
              </div>

              {COMPARISON_SECTIONS.map((section) => {
                const Icon = section.icon
                return (
                  <div key={section.titulo}>
                    <div className="grid grid-cols-[260px_repeat(4,minmax(0,1fr))] border-b border-white/8 bg-cyan-300/[0.07]">
                      <div className="col-span-5 flex items-center gap-3 px-5 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-100">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/82">
                          {section.titulo}
                        </span>
                      </div>
                    </div>

                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className="grid grid-cols-[260px_repeat(4,minmax(0,1fr))] border-b border-white/8"
                      >
                        <div className="px-5 py-4 text-sm font-medium text-slate-200">
                          {row.label}
                        </div>

                        {PLANES.map((plan) => {
                          const active = selected === plan.key
                          const value = row.values[plan.key]
                          const isText = row.type === 'text'

                          return (
                            <div
                              key={`${row.label}-${plan.key}`}
                              className={`flex items-center justify-center border-l border-white/8 px-4 py-4 text-center ${active ? themeByPlan[plan.key].highlighted : ''}`}
                            >
                              {isText ? (
                                <span className="text-sm font-medium text-slate-100">{value}</span>
                              ) : value ? (
                                <Check className="h-4 w-4 text-cyan-100" />
                              ) : (
                                <X className="h-4 w-4 text-slate-500" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-20 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Logica del freemium
          </p>
          <h2
            className="mt-3 text-4xl text-white md:text-5xl"
            style={{ fontFamily: 'Cormorant Garamond' }}
          >
            El gratis debe captar, no reemplazar el pago.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileText,
                title: 'Lo que si se regala',
                body:
                  'Agenda, pacientes, historia clinica y una base operativa suficiente para que la clinica pruebe orden real.',
              },
              {
                icon: Package,
                title: 'Lo que se reserva al pago',
                body:
                  'Inventario, caja, facturacion y reportes porque ahi es donde Bourgelat resuelve dolor mas profundo y valor mas claro.',
              },
              {
                icon: BarChart3,
                title: 'Lo que convierte',
                body:
                  'Cuando la clinica ya opera en serio, el upgrade deja de sentirse como venta y se vuelve una necesidad natural.',
              },
              {
                icon: Users,
                title: 'Lo que protege el margen',
                body:
                  'Los limites por usuarios, mascotas activas y almacenamiento hacen que Inicio Gratis siga siendo util sin canibalizar Clinica o Profesional.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-white/10 bg-slate-950/28 p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(160deg,rgba(14,116,144,0.18),rgba(15,23,42,0.94),rgba(8,47,73,0.9))] p-6 backdrop-blur-xl md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Plan recomendado
          </div>
          <h3
            className="mt-4 text-4xl leading-none text-white"
            style={{ fontFamily: 'Cormorant Garamond' }}
          >
            Profesional
          </h3>
          <p className="mt-4 text-sm leading-7 text-slate-200/82">
            Es el plan que mejor cuenta la propuesta de valor completa de Bourgelat: consulta,
            inventario, caja, reportes y facturacion electronica dentro del mismo flujo.
          </p>

          <div className="mt-6 space-y-3">
            {[
              'Muestra el valor real del producto.',
              'No obliga a vender multisede ni API antes de tiempo.',
              'Sirve como plan ancla para subir desde Inicio Gratis o Clinica.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/90">
                <Check className="mt-1 h-4 w-4 shrink-0 text-cyan-100" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <PlanCTA
            plan={PLANES.find((plan) => plan.key === 'profesional')}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          />
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Preguntas frecuentes
          </p>
          <h2
            className="mt-3 text-4xl text-white md:text-5xl"
            style={{ fontFamily: 'Cormorant Garamond' }}
          >
            Lo importante antes de publicar la oferta.
          </h2>
        </div>

        <div className="grid gap-3">
          {FAQS.map((faq, index) => (
            <motion.div
              key={faq.pregunta}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <FAQItem pregunta={faq.pregunta} respuesta={faq.respuesta} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[36px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.98),rgba(6,95,70,0.88))] p-8 shadow-[0_30px_90px_rgba(8,47,73,0.26)] md:p-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/75">
              Siguiente conversion
            </p>
            <h2
              className="mt-3 text-4xl text-white md:text-5xl"
              style={{ fontFamily: 'Cormorant Garamond' }}
            >
              Registro claro, prueba guiada y un plan gratis que no se ve improvisado.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200/84">
              La narrativa comercial y la suscripcion inicial ya quedaron alineadas. El siguiente
              paso que mas valor aporta es aplicar los limites del plan dentro de usuarios,
              pacientes, almacenamiento y otros modulos clave del producto.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Crear cuenta principal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:hola@bourgelat.co?subject=Quiero%20revisar%20los%20planes%20de%20Bourgelat"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
            >
              Hablar con el equipo
            </a>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
