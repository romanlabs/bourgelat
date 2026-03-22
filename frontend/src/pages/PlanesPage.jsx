import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Stethoscope, Check, X, ChevronDown, ArrowRight,
  Calendar, FileText, Package, Receipt, BarChart3,
  Users, Shield, Zap, Lock, Bell, Layers, Sparkles,
} from 'lucide-react'

const TABLA_FEATURES = [
  {
    categoria: 'Agenda',
    icon: Calendar,
    items: [
      { label: 'Agenda de citas',                    basico: true,  profesional: true,  enterprise: true  },
      { label: 'Anti-solapamiento por veterinario',  basico: true,  profesional: true,  enterprise: true  },
      { label: '6 estados de cita',                  basico: true,  profesional: true,  enterprise: true  },
      { label: 'Reprogramación de citas',            basico: true,  profesional: true,  enterprise: true  },
    ],
  },
  {
    categoria: 'Historia clínica',
    icon: FileText,
    items: [
      { label: 'Historia clínica digital',           basico: true,  profesional: true,  enterprise: true  },
      { label: 'Examen físico con constantes',       basico: true,  profesional: true,  enterprise: true  },
      { label: 'Antecedentes del paciente',          basico: true,  profesional: true,  enterprise: true  },
      { label: 'Historia inmutable al bloquear',     basico: true,  profesional: true,  enterprise: true  },
    ],
  },
  {
    categoria: 'Inventario',
    icon: Package,
    items: [
      { label: 'Inventario básico',                  basico: true,  profesional: true,  enterprise: true  },
      { label: 'Alertas de stock mínimo',            basico: false, profesional: true,  enterprise: true  },
      { label: 'Control de vencimientos',            basico: false, profesional: true,  enterprise: true  },
      { label: 'Trazabilidad por lote',              basico: false, profesional: true,  enterprise: true  },
    ],
  },
  {
    categoria: 'Facturación',
    icon: Receipt,
    items: [
      { label: 'Facturación completa',               basico: false, profesional: true,  enterprise: true  },
      { label: 'Descuento automático de stock',      basico: false, profesional: true,  enterprise: true  },
      { label: 'Múltiples métodos de pago',          basico: false, profesional: true,  enterprise: true  },
      { label: 'Exportar PDF',                       basico: false, profesional: true,  enterprise: true  },
    ],
  },
  {
    categoria: 'Reportes',
    icon: BarChart3,
    items: [
      { label: 'Dashboard general',                  basico: false, profesional: true,  enterprise: true  },
      { label: 'Reporte de ingresos',                basico: false, profesional: true,  enterprise: true  },
      { label: 'Reporte de citas',                   basico: false, profesional: true,  enterprise: true  },
      { label: 'Reporte de inventario',              basico: false, profesional: true,  enterprise: true  },
    ],
  },
  {
    categoria: 'Equipo y acceso',
    icon: Users,
    items: [
      { label: 'Usuarios ilimitados',                basico: true,  profesional: true,  enterprise: true  },
      { label: 'Roles granulares',                   basico: true,  profesional: true,  enterprise: true  },
      { label: 'Multisede',                          basico: false, profesional: false, enterprise: true  },
      { label: 'Acceso API',                         basico: false, profesional: false, enterprise: true  },
    ],
  },
  {
    categoria: 'Soporte',
    icon: Shield,
    items: [
      { label: 'Soporte por email',                  basico: true,  profesional: true,  enterprise: true  },
      { label: 'Soporte prioritario',                basico: false, profesional: false, enterprise: true  },
      { label: 'Onboarding personalizado',           basico: false, profesional: false, enterprise: true  },
    ],
  },
]

const PLANES_DATA = [
  {
    key: 'basico',
    nombre: 'Básico',
    tagline: 'Para empezar con el pie derecho',
    precio_mensual: 99000,
    precio_anual: 79000,
    color: 'teal',
    features: ['Agenda de citas', 'Historia clínica', 'Inventario básico', 'Propietarios y mascotas', 'Usuarios ilimitados'],
  },
  {
    key: 'profesional',
    nombre: 'Profesional',
    tagline: 'Para clínicas que quieren crecer',
    precio_mensual: 199000,
    precio_anual: 159000,
    color: 'cyan',
    popular: true,
    features: ['Todo lo del Básico', 'Facturación completa', 'Reportes y dashboard', 'Control de inventario avanzado', 'Exportar PDF'],
  },
  {
    key: 'enterprise',
    nombre: 'Enterprise',
    tagline: 'Para cadenas y grupos veterinarios',
    precio_mensual: 399000,
    precio_anual: 319000,
    color: 'slate',
    features: ['Todo lo del Profesional', 'Multisede', 'Soporte prioritario', 'Onboarding personalizado', 'Acceso API'],
  },
]

const FAQS = [
  { pregunta: '¿Puedo cambiar de plan en cualquier momento?', respuesta: 'Sí. Puedes subir o bajar de plan cuando quieras. El cambio aplica desde el siguiente ciclo de facturación sin penalizaciones.' },
  { pregunta: '¿Hay límite de mascotas o propietarios?', respuesta: 'No. Ningún plan tiene límite de mascotas, propietarios ni usuarios. Pagas por funcionalidades, no por volumen de datos.' },
  { pregunta: '¿Qué pasa con mis datos si cancelo?', respuesta: 'Tus datos permanecen disponibles para exportar durante 30 días después de cancelar. Después se eliminan de forma segura.' },
  { pregunta: '¿El plan anual tiene descuento?', respuesta: 'Sí. El plan anual tiene un descuento del 20% respecto al precio mensual. Se cobra una sola vez al año.' },
  { pregunta: '¿Qué especies soporta Bourgelat?', respuesta: 'Todas. Perros, gatos, aves, reptiles, conejos, fauna silvestre y cualquier otra especie. Sin restricciones en ningún plan.' },
  { pregunta: '¿Mis datos están seguros?', respuesta: 'Sí. Usamos cifrado en tránsito, autenticación con tokens de corta duración, auditoría de cada acción y copias de seguridad automáticas.' },
]

const formatCOP = (precio) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precio)

const THEME = {
  teal:  { card: 'from-teal-500 to-teal-600',   ring: 'ring-teal-400',  glow: 'shadow-teal-500/40',  badge: 'bg-teal-100 text-teal-700',  btn: 'bg-teal-600 hover:bg-teal-700', check: 'text-teal-400' },
  cyan:  { card: 'from-cyan-500 to-teal-600',    ring: 'ring-cyan-400',  glow: 'shadow-cyan-500/40',  badge: 'bg-cyan-100 text-cyan-700',   btn: 'bg-cyan-600 hover:bg-cyan-700',  check: 'text-cyan-300' },
  slate: { card: 'from-slate-600 to-slate-800',  ring: 'ring-slate-400', glow: 'shadow-slate-500/30', badge: 'bg-slate-100 text-slate-700', btn: 'bg-slate-700 hover:bg-slate-800', check: 'text-slate-300' },
}

const FAQItem = ({ pregunta, respuesta }) => {
  const [open, setOpen] = useState(false)
  return (
    <motion.div layout className="border border-slate-200/60 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/60">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50/80 transition-colors">
        <span className="font-semibold text-slate-800 text-sm pr-4">{pregunta}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
          <ChevronDown className="w-4 h-4 text-teal-500 flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4">
              {respuesta}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function PlanesPage() {
  const [anual, setAnual] = useState(false)
  const [seleccionado, setSeleccionado] = useState('profesional')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #ecfdf5 30%, #f0f9ff 60%, #e0f2fe 100%)' }}>

      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }} />
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #0891b2, transparent)' }} />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #0f766e, transparent)' }} />
        {/* Grid sutil */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#0d9488 1px, transparent 1px), linear-gradient(90deg, #0d9488 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/40 backdrop-blur-xl"
        style={{ background: 'rgba(240,253,250,0.85)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }} transition={{ duration: 0.4 }}
              className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/30">
              <Stethoscope className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-teal-700 transition-colors">
              Bourgelat
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-4 py-2">
              Iniciar sesión
            </Link>
            <Link to="/registro"
              className="text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md shadow-teal-600/25 hover:-translate-y-px">
              Registrarse gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-28 pb-24 px-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-center mb-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border border-teal-200/60 backdrop-blur-sm"
              style={{ background: 'rgba(204,251,241,0.6)' }}>
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-teal-700 text-xs font-semibold tracking-wide">Elige tu plan</span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-bold mb-5 tracking-tight"
              style={{ background: 'linear-gradient(135deg, #134e4a, #0f766e, #0891b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Simple y transparente
            </h1>
            <p className="text-slate-500 text-xl max-w-lg mx-auto mb-10">
              Un precio justo para cada etapa de tu clínica. Sin cobros en dólares.
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-teal-200/50 backdrop-blur-sm"
              style={{ background: 'rgba(204,251,241,0.4)' }}>
              <motion.button onClick={() => setAnual(false)} layout
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${!anual ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                {!anual && (
                  <motion.div layoutId="toggle-bg" className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <span className="relative z-10">Mensual</span>
              </motion.button>
              <motion.button onClick={() => setAnual(true)} layout
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${anual ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                {anual && (
                  <motion.div layoutId="toggle-bg" className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
                )}
                <span className="relative z-10">Anual</span>
                <span className="relative z-10 bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-20%</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {PLANES_DATA.map((plan, i) => {
              const theme = THEME[plan.color]
              const precio = anual ? plan.precio_anual : plan.precio_mensual
              const isSelected = seleccionado === plan.key
              return (
                <motion.div key={plan.key}
                  initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setSeleccionado(plan.key)}
                  className="cursor-pointer">
                  <motion.div
                    animate={{
                      scale: isSelected ? 1.03 : 1,
                      y: isSelected ? -6 : 0,
                    }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                    className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                      isSelected
                        ? `ring-2 ${theme.ring} shadow-2xl ${theme.glow}`
                        : 'ring-1 ring-white/60 shadow-lg hover:shadow-xl'
                    }`}>

                    {/* Fondo de la card */}
                    {isSelected ? (
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.card} opacity-100`} />
                    ) : (
                      <div className="absolute inset-0 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.7)' }} />
                    )}

                    {/* Badge popular */}
                    {plan.popular && (
                      <div className="absolute top-4 right-4 z-20">
                        <motion.div animate={{ scale: isSelected ? [1, 1.1, 1] : 1 }}
                          transition={{ duration: 1.5, repeat: isSelected ? Infinity : 0 }}
                          className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'}`}>
                          MÁS POPULAR
                        </motion.div>
                      </div>
                    )}

                    <div className="relative z-10 p-8">
                      <h3 className={`text-2xl font-bold mb-1 tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {plan.nombre}
                      </h3>
                      <p className={`text-sm mb-8 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        {plan.tagline}
                      </p>

                      <AnimatePresence mode="wait">
                        <motion.div key={anual ? 'a' : 'm'}
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }} className="mb-1">
                          <span className={`text-5xl font-bold tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {formatCOP(precio)}
                          </span>
                          <span className={`text-sm ml-2 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>/ mes</span>
                        </motion.div>
                      </AnimatePresence>

                      {anual && (
                        <p className={`text-xs mb-6 ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                          Facturado anualmente
                        </p>
                      )}
                      {!anual && <div className="mb-6" />}

                      <Link to="/registro" onClick={e => e.stopPropagation()}
                        className={`block text-center font-bold py-3.5 rounded-2xl mb-8 transition-all text-sm ${
                          isSelected
                            ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30'
                            : `${theme.btn} text-white shadow-md`
                        }`}>
                        Empezar gratis →
                      </Link>

                      <ul className="flex flex-col gap-3">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-white/20' : 'bg-teal-50'
                            }`}>
                              <Check className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                            </div>
                            <span className={`text-sm ${isSelected ? 'text-white/90' : 'text-slate-600'}`}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          {/* Tabla comparativa */}
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-24">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Comparativa completa</h2>
              <p className="text-slate-500">Selecciona un plan arriba para resaltarlo en la tabla</p>
            </div>

            <div className="rounded-3xl overflow-hidden border border-white/60 shadow-xl backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.7)' }}>

              {/* Header tabla */}
              <div className="grid grid-cols-4 border-b border-slate-100">
                <div className="p-5" />
                {PLANES_DATA.map((plan, i) => {
                  const isSelected = seleccionado === plan.key
                  const theme = THEME[plan.color]
                  return (
                    <motion.div key={plan.key}
                      animate={{ backgroundColor: isSelected ? undefined : 'transparent' }}
                      onClick={() => setSeleccionado(plan.key)}
                      className={`p-5 text-center cursor-pointer transition-all relative ${
                        isSelected ? `bg-gradient-to-b ${theme.card}` : 'hover:bg-slate-50'
                      }`}>
                      <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>{plan.nombre}</p>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                        {formatCOP(anual ? plan.precio_anual : plan.precio_mensual)}/mes
                      </p>
                    </motion.div>
                  )
                })}
              </div>

              {/* Categorías y filas */}
              {TABLA_FEATURES.map((categoria, ci) => (
                <div key={categoria.categoria}>
                  <div className="grid grid-cols-4 border-b border-slate-100/80" style={{ background: 'rgba(240,253,250,0.5)' }}>
                    <div className="p-3 col-span-4 flex items-center gap-2.5 px-5">
                      <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center">
                        <categoria.icon className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
                        {categoria.categoria}
                      </span>
                    </div>
                  </div>
                  {categoria.items.map((item, ii) => (
                    <div key={item.label}
                      className={`grid grid-cols-4 border-b border-slate-100/50 ${ii % 2 === 0 ? '' : ''}`}
                      style={{ background: ii % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(248,250,252,0.4)' }}>
                      <div className="p-4 px-5 text-sm text-slate-600 font-medium">{item.label}</div>
                      {[
                        { tiene: item.basico,       key: 'basico' },
                        { tiene: item.profesional,  key: 'profesional' },
                        { tiene: item.enterprise,   key: 'enterprise' },
                      ].map(({ tiene, key }) => {
                        const isSelected = seleccionado === key
                        const theme = THEME[PLANES_DATA.find(p => p.key === key).color]
                        return (
                          <div key={key}
                            className={`p-4 flex justify-center items-center transition-colors ${
                              isSelected ? `bg-gradient-to-b ${theme.card} bg-opacity-10` : ''
                            }`}
                            style={isSelected ? { background: 'rgba(13,148,136,0.08)' } : {}}>
                            {tiene
                              ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
                                  <Check className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-teal-400'}`} />
                                </motion.div>
                              : <X className="w-4 h-4 text-slate-200" />
                            }
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ))}

              {/* CTA en tabla */}
              <div className="grid grid-cols-4" style={{ background: 'rgba(240,253,250,0.6)' }}>
                <div className="p-5" />
                {PLANES_DATA.map((plan) => {
                  const theme = THEME[plan.color]
                  const isSelected = seleccionado === plan.key
                  return (
                    <div key={plan.key} className="p-4 flex justify-center">
                      <Link to="/registro"
                        className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all ${
                          isSelected
                            ? `${theme.btn} text-white shadow-md`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        Empezar gratis
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }} className="max-w-2xl mx-auto mb-24">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Preguntas frecuentes</h2>
              <p className="text-slate-500">Todo lo que necesitas saber antes de empezar</p>
            </div>
            <div className="flex flex-col gap-3">
              {FAQS.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <FAQItem pregunta={faq.pregunta} respuesta={faq.respuesta} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Final */}
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="relative text-center rounded-3xl overflow-hidden p-16">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488, #0891b2)' }} />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }} />
            <div className="relative z-10">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-6">
                <Stethoscope className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Tu clínica, tu ritmo.
              </h2>
              <p className="text-teal-100 text-lg mb-10 max-w-md mx-auto">
                Sin tarjeta de crédito. Sin contratos. Empieza gratis y escala cuando quieras.
              </p>
              <Link to="/registro"
                className="inline-flex items-center gap-2 bg-white text-teal-700 font-bold px-8 py-4 rounded-2xl hover:bg-teal-50 transition-all shadow-2xl hover:-translate-y-0.5 text-base">
                Crear mi cuenta gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}