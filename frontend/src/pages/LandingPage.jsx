import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react'
import {
  PawPrint, Heart, Stethoscope, Pill, Syringe, Scissors,
  Fish, Activity, Thermometer, Microscope, FlaskConical,
  Bone, Bird, Dog, Rabbit, Turtle, HeartPulse, Dna,
  TestTube, Bandage, ClipboardPlus, Shield, Eye,
  Calendar, FileText, Package, Receipt, Check, ArrowRight,
  ChevronRight, Globe, Zap, Menu, X,
  Users, Building2, Lock, BarChart3, Bell, Layers,
} from 'lucide-react'

// ─── Animaciones ────────────────────────────────────────────────────────────

const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}>
      {children}
    </motion.div>
  )
}

// ─── Spotlight ──────────────────────────────────────────────────────────────

const Spotlight = () => {
  const [pos, setPos] = useState({ x: -500, y: -500 })
  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <div className="pointer-events-none fixed inset-0 z-30"
      style={{ background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(14,165,233,0.05), transparent 70%)` }} />
  )
}

// ─── Iconos flotantes ────────────────────────────────────────────────────────

const ICONS = [
  { icon: PawPrint,     x: 3,   y: 10,  size: 16, opacity: 0.22, color: 'text-sky-400',  anim: 'float', duration: 18, delay: 0,   glow: false },
  { icon: Pill,         x: 96,  y: 15,  size: 15, opacity: 0.20, color: 'text-sky-300',  anim: 'float', duration: 22, delay: 2,   glow: false },
  { icon: Heart,        x: 7,   y: 78,  size: 15, opacity: 0.20, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 1,   glow: false },
  { icon: Fish,         x: 90,  y: 72,  size: 16, opacity: 0.20, color: 'text-cyan-300', anim: 'float', duration: 19, delay: 3,   glow: false },
  { icon: Scissors,     x: 50,  y: 5,   size: 14, opacity: 0.18, color: 'text-sky-300',  anim: 'spin',  duration: 30, delay: 0,   glow: false },
  { icon: Turtle,       x: 15,  y: 92,  size: 15, opacity: 0.20, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 4,   glow: false },
  { icon: Bird,         x: 82,  y: 88,  size: 15, opacity: 0.19, color: 'text-sky-300',  anim: 'float', duration: 21, delay: 1.5, glow: false },
  { icon: Bandage,      x: 35,  y: 95,  size: 14, opacity: 0.18, color: 'text-sky-400',  anim: 'float', duration: 17, delay: 2.5, glow: false },
  { icon: Dna,          x: 65,  y: 92,  size: 14, opacity: 0.19, color: 'text-cyan-300', anim: 'spin',  duration: 28, delay: 5,   glow: false },
  { icon: Eye,          x: 43,  y: 88,  size: 14, opacity: 0.18, color: 'text-sky-300',  anim: 'pulse', duration: 18, delay: 1,   glow: false },
  { icon: Rabbit,       x: 58,  y: 96,  size: 15, opacity: 0.19, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 3.5, glow: false },
  { icon: Syringe,      x: 77,  y: 95,  size: 14, opacity: 0.18, color: 'text-cyan-300', anim: 'float', duration: 22, delay: 0.5, glow: false },
  { icon: TestTube,     x: 2,   y: 60,  size: 15, opacity: 0.19, color: 'text-sky-300',  anim: 'spin',  duration: 26, delay: 2,   glow: false },
  { icon: Thermometer,  x: 97,  y: 55,  size: 14, opacity: 0.18, color: 'text-cyan-400', anim: 'pulse', duration: 20, delay: 3,   glow: false },
  { icon: Bone,         x: 72,  y: 5,   size: 15, opacity: 0.19, color: 'text-sky-300',  anim: 'float', duration: 19, delay: 1.2, glow: false },
  { icon: FlaskConical, x: 25,  y: 5,   size: 14, opacity: 0.18, color: 'text-cyan-300', anim: 'float', duration: 23, delay: 4,   glow: false },
  { icon: Dog,          x: 12,  y: 15,  size: 15, opacity: 0.20, color: 'text-sky-400',  anim: 'float', duration: 21, delay: 1.7, glow: false },
  { icon: Stethoscope,  x: 88,  y: 8,   size: 15, opacity: 0.19, color: 'text-cyan-300', anim: 'float', duration: 25, delay: 3.3, glow: false },
  { icon: Microscope,   x: 47,  y: 2,   size: 14, opacity: 0.18, color: 'text-sky-300',  anim: 'float', duration: 22, delay: 0.9, glow: false },
  { icon: ClipboardPlus,x: 60,  y: 90,  size: 15, opacity: 0.19, color: 'text-sky-400',  anim: 'float', duration: 18, delay: 2.1, glow: false },
  { icon: Shield,       x: 30,  y: 8,   size: 14, opacity: 0.18, color: 'text-cyan-400', anim: 'float', duration: 20, delay: 4.5, glow: false },
  { icon: PawPrint,     x: 93,  y: 35,  size: 15, opacity: 0.20, color: 'text-sky-300',  anim: 'float', duration: 23, delay: 1.4, glow: false },
  { icon: Heart,        x: 20,  y: 6,   size: 14, opacity: 0.19, color: 'text-cyan-300', anim: 'pulse', duration: 19, delay: 3.8, glow: false },
  { icon: Fish,         x: 5,   y: 95,  size: 15, opacity: 0.18, color: 'text-sky-400',  anim: 'float', duration: 21, delay: 0.6, glow: false },
  { icon: PawPrint,     x: 20,  y: 20,  size: 21, opacity: 0.28, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 0.5, glow: false },
  { icon: Stethoscope,  x: 78,  y: 18,  size: 21, opacity: 0.26, color: 'text-sky-500',  anim: 'float', duration: 22, delay: 1.2, glow: false },
  { icon: Rabbit,       x: 10,  y: 50,  size: 20, opacity: 0.25, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 2,   glow: false },
  { icon: Dog,          x: 88,  y: 45,  size: 20, opacity: 0.25, color: 'text-sky-400',  anim: 'float', duration: 21, delay: 0.8, glow: false },
  { icon: Activity,     x: 55,  y: 14,  size: 19, opacity: 0.26, color: 'text-sky-500',  anim: 'pulse', duration: 16, delay: 0.5, glow: false },
  { icon: PawPrint,     x: 14,  y: 62,  size: 28, opacity: 0.28, color: 'text-sky-400',  anim: 'float', duration: 22, delay: 0,   glow: true  },
  { icon: HeartPulse,   x: 82,  y: 30,  size: 28, opacity: 0.26, color: 'text-sky-500',  anim: 'pulse', duration: 20, delay: 0,   glow: true  },
  { icon: Stethoscope,  x: 38,  y: 58,  size: 27, opacity: 0.24, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 1.5, glow: true  },
  { icon: Dog,          x: 22,  y: 28,  size: 25, opacity: 0.24, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 3,   glow: true  },
]

const getAnimation = (anim, i) => {
  const dir = i % 8
  const xP = [[-8,5,-3,10,-6,8,-8],[6,-10,8,-4,10,-6,6],[-5,8,-10,4,-8,6,-5],[10,-6,4,-8,6,-10,10],[-6,10,-8,6,-4,8,-6],[4,-8,10,-6,8,-4,4],[-10,4,-6,8,-10,6,-10],[8,-4,6,-10,4,-8,8]]
  const yP = [[-6,10,-8,4,-10,6,-6],[8,-4,6,-10,8,-6,8],[-10,6,-4,8,-6,10,-10],[4,-8,10,-6,4,-10,4],[-8,6,-10,8,-4,6,-8],[10,-6,4,-8,10,-4,10],[-4,8,-6,10,-8,4,-4],[6,-10,8,-4,6,-8,6]]
  switch (anim) {
    case 'float': case 'drift':
      return { animate: { x: xP[dir], y: yP[dir], rotate: [-4,4,-3,5,-4] }, transition: { ease: 'easeInOut', repeat: Infinity } }
    case 'spin':
      return { animate: { rotate: [0,360], x: xP[dir].map(v=>v*0.6), y: yP[dir].map(v=>v*0.6) }, transition: { ease: 'linear', repeat: Infinity } }
    case 'pulse':
      return { animate: { scale: [1,1.15,1,1.1,1], x: xP[dir].map(v=>v*0.7), y: yP[dir].map(v=>v*0.7) }, transition: { ease: 'easeInOut', repeat: Infinity } }
    default:
      return { animate: { x: xP[0], y: yP[0] }, transition: { ease: 'easeInOut', repeat: Infinity } }
  }
}

const FloatingIcons = () => {
  const { scrollY } = useScroll()
  const yBack  = useTransform(scrollY, [0, 1000], [0, -80])
  const yMid   = useTransform(scrollY, [0, 1000], [0, -140])
  const yFront = useTransform(scrollY, [0, 1000], [0, -200])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {ICONS.map((item, i) => {
        const { animate, transition } = getAnimation(item.anim, i)
        const layerY = item.glow ? yFront : item.opacity > 0.24 ? yMid : yBack
        return (
          <motion.div key={i} className="absolute"
            style={{ left: `${item.x}%`, top: `${item.y}%`, y: layerY }}
            animate={animate}
            transition={{ ...transition, duration: item.duration, delay: item.delay }}>
            {item.glow && (
              <div className="absolute inset-0 rounded-full blur-xl -z-10 bg-sky-400"
                style={{ opacity: item.opacity * 0.4, transform: 'scale(2.5)' }} />
            )}
            <item.icon style={{ width: item.size, height: item.size, opacity: item.opacity }}
              className={item.color} strokeWidth={1.5} />
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Wave divider ────────────────────────────────────────────────────────────

const WaveDivider = ({ fromColor = '#ffffff', toColor = '#f0f9ff', flip = false }) => (
  <div style={{ background: fromColor, lineHeight: 0 }}>
    <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill={toColor} />
    </svg>
  </div>
)

// ─── Navbar ──────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Funcionalidades', id: 'funcionalidades', scroll: true },
  { label: 'Por qué Bourgelat', id: 'por-que', scroll: true },
  { label: 'Planes', href: '/planes', scroll: false },
  { label: 'Contacto', id: 'contacto', scroll: true },
]

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  return (
    <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div whileHover={{ rotate: [0,-10,10,0], scale: 1.05 }} transition={{ duration: 0.4 }}
            className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-md shadow-sky-600/25">
            <Stethoscope className="w-4 h-4 text-white" />
          </motion.div>
          <span className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-sky-700 transition-colors">Bourgelat</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link =>
            link.scroll
              ? <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">{link.label}</button>
              : <Link key={link.href} to={link.href} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">{link.label}</Link>
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-4 py-2">Iniciar sesión</Link>
          <Link to="/registro" className="text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-md shadow-sky-600/20 hover:-translate-y-px">Registrarse gratis</Link>
        </div>
        <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-slate-500">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map(link =>
              link.scroll
                ? <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm font-medium text-slate-600 text-left">{link.label}</button>
                : <Link key={link.href} to={link.href} className="text-sm font-medium text-slate-600">{link.label}</Link>
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Link to="/login" className="text-sm font-medium text-slate-600 py-2">Iniciar sesión</Link>
              <Link to="/registro" className="text-sm font-semibold bg-sky-600 text-white px-4 py-2.5 rounded-lg text-center">Registrarse gratis</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── Typing text ─────────────────────────────────────────────────────────────

const WORDS = ['inteligencia', 'eficiencia', 'confianza', 'tranquilidad']

const TypingText = () => {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    const word = WORDS[index]
    let timeout
    if (!deleting && displayed.length < word.length)
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80)
    else if (!deleting && displayed.length === word.length)
      timeout = setTimeout(() => setDeleting(true), 2200)
    else if (deleting && displayed.length > 0)
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
    else if (deleting && displayed.length === 0) { setDeleting(false); setIndex(i => (i + 1) % WORDS.length) }
    return () => clearTimeout(timeout)
  }, [displayed, deleting, index])
  return <span className="text-sky-600">{displayed}<span className="animate-pulse">|</span></span>
}

// ─── Hero dashboard mockup (estático) ────────────────────────────────────────

const HeroDashboard = () => (
  <div className="rounded-xl overflow-hidden shadow-2xl shadow-sky-200/40 border border-slate-200/60" style={{ background: '#f8fafc' }}>
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80" style={{ background: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)' }}>
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 mx-4">
        <div className="bg-white/80 rounded-md px-3 py-1 flex items-center gap-2 border border-slate-200/60">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-xs text-slate-400 font-medium">app.bourgelat.co/dashboard</span>
        </div>
      </div>
    </div>
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-sm font-bold text-slate-800">Buenos días, Dr. Gómez</div>
          <div className="text-xs text-slate-400">Martes 21 de marzo • Clínica Central</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">AG</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Citas hoy', value: '12', color: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
          { label: 'Completadas', value: '8', color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          { label: 'Ingresos hoy', value: '$840k', color: 'bg-violet-50 border-violet-200', text: 'text-violet-700' },
          { label: 'Pacientes', value: '1.247', color: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 border ${s.color}`}>
            <div className={`text-lg font-bold ${s.text}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700">Ingresos del mes</span>
          <span className="text-xs text-sky-600 font-semibold">$3.240.000 COP</span>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {[40,65,45,80,60,90,70,85,55,75,95,65,88,72,60,78,92,68,84,76].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 16 ? '#0284c7' : `rgba(2,132,199,${0.12 + h * 0.004})` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
)

// ─── Hero ─────────────────────────────────────────────────────────────────────

const Hero = () => {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 400], [0, -40])
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden min-h-screen flex items-center"
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f9ff, #dbeafe)' }}>
      <FloatingIcons />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-sky-200 opacity-20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-blue-200 opacity-15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-cyan-200 opacity-10 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center max-w-4xl mx-auto">
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-white/80 border border-sky-200 text-sky-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Software veterinario para clínicas hispanohablantes
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight" style={{ minHeight: '280px' }}>
              Gestiona tu clínica<br />veterinaria con<br /><TypingText />
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Gestión clínica completa — citas, historias clínicas, inventario y facturación. Diseñado para veterinarios hispanohablantes, al precio que corresponde.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registro" className="group flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl shadow-sky-600/25 hover:-translate-y-0.5">
                Empieza gratis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-slate-600 hover:text-sky-700 font-medium px-8 py-4 rounded-xl border border-slate-200 hover:border-sky-300 transition-all bg-white/80 hover:bg-sky-50 backdrop-blur-sm">
                Ver funcionalidades <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-8 border-t border-sky-100/80">
              {[
                { icon: Shield, text: 'Seguridad de nivel hospitalario' },
                { icon: Globe,  text: 'Todas las especies, toda Latinoamérica' },
                { icon: Zap,    text: 'Sin límites de pacientes ni usuarios' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2.5 text-slate-500">
                  <item.icon className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
        <motion.div style={{ y }} className="mt-16">
          <HeroDashboard />
        </motion.div>
      </div>
    </section>
  )
}

// ─── Feature showcase estilo Digitail ────────────────────────────────────────

const FEATURE_DURATION = 5000
const FEATURES = [
  { id: 'agenda',      label: 'Agenda de citas',    url: 'agenda' },
  { id: 'historia',    label: 'Historia clínica',   url: 'historias' },
  { id: 'inventario',  label: 'Inventario',         url: 'inventario' },
  { id: 'facturacion', label: 'Facturación',        url: 'facturacion' },
  { id: 'reportes',    label: 'Reportes',           url: 'reportes' },
]

const FeatureShowcase = () => {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (!autoplay) return
    startRef.current = Date.now() - (progress / 100) * FEATURE_DURATION

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const p = Math.min((elapsed / FEATURE_DURATION) * 100, 100)
      setProgress(p)
      if (p >= 100) {
        setActive(prev => (prev + 1) % FEATURES.length)
        setProgress(0)
        startRef.current = Date.now()
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [autoplay, active])

  const handleSelect = (i) => {
    cancelAnimationFrame(rafRef.current)
    setActive(i)
    setProgress(0)
    setAutoplay(false)
    startRef.current = Date.now()
  }

  return (
    <section id="funcionalidades" className="py-24 px-6" style={{ background: '#ffffff' }}>
      <div className="max-w-7xl mx-auto">
        <FadeUp className="text-center mb-16">
          <p className="text-sky-600 font-semibold text-xs uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Todo lo que tu clínica necesita</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">Desde la cita hasta la factura — Bourgelat cubre cada proceso.</p>
        </FadeUp>

        {/* Pills con barra de progreso interna */}
        <FadeUp>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {FEATURES.map((f, i) => (
              <button key={f.id} onClick={() => handleSelect(i)}
                className={`relative overflow-hidden text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-300 border whitespace-nowrap cursor-pointer z-10 ${
                  active === i
                    ? 'border-sky-300 text-sky-700 shadow-md shadow-sky-100/60 bg-white/50'
                    : 'border-slate-200 text-slate-500 bg-white/30 hover:opacity-80 hover:border-sky-200'
                }`}>
                <span className="relative z-10">{f.label}</span>
                {/* Barra de progreso — solo en el tab activo con autoplay */}
                {autoplay && active === i && (
                  <div
                    className="absolute inset-0 bg-sky-50 origin-left"
                    style={{ transform: `scaleX(${progress / 100})`, transition: 'transform 50ms linear' }} />
                )}
              </button>
            ))}
          </div>
        </FadeUp>

        {/* Área de imagen / screenshot */}
        <FadeUp>
          <div className="rounded-2xl overflow-hidden border border-slate-200/60 shadow-2xl shadow-sky-100/40">
            {/* Barra browser */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80"
              style={{ background: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white/80 rounded-md px-3 py-1 flex items-center gap-2 border border-slate-200/60">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-xs text-slate-400 font-medium">
                    app.bourgelat.co/{FEATURES[active].url}
                  </span>
                </div>
              </div>
            </div>

            {/* Placeholder — reemplaza esto con <img> cuando tengas los screenshots */}
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="aspect-video flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe, #bae6fd)' }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 border-2 border-sky-200 flex items-center justify-center mx-auto mb-4">
                    {active === 0 && <Calendar className="w-7 h-7 text-sky-600" />}
                    {active === 1 && <FileText className="w-7 h-7 text-sky-600" />}
                    {active === 2 && <Package className="w-7 h-7 text-sky-600" />}
                    {active === 3 && <Receipt className="w-7 h-7 text-sky-600" />}
                    {active === 4 && <BarChart3 className="w-7 h-7 text-sky-600" />}
                  </div>
                  <p className="text-slate-400 font-semibold text-sm">{FEATURES[active].label}</p>
                  <p className="text-slate-300 text-xs mt-1">Screenshot disponible próximamente</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── Feature showcase ─────────────────────────────────────────────────────────


// ─── Cómo empezar ─────────────────────────────────────────────────────────────

const ComoComienzo = () => (
  <section className="py-24 px-6" style={{ background: '#f0f9ff' }}>
    <div className="max-w-5xl mx-auto">
      <FadeUp className="text-center mb-16">
        <p className="text-sky-600 font-semibold text-xs uppercase tracking-widest mb-3">Proceso</p>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Activo en minutos</h2>
        <p className="text-slate-500 text-lg">Sin instalaciones. Sin configuraciones complejas.</p>
      </FadeUp>
      <div className="relative">
        <div className="absolute top-10 left-0 right-0 h-px bg-sky-200 hidden lg:block" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {[
            { step: '01', icon: Building2,  title: 'Registra tu clínica',  desc: 'Crea tu cuenta en menos de 2 minutos. Solo nombre, email y contraseña. Sin tarjeta de crédito.' },
            { step: '02', icon: Users,       title: 'Configura tu equipo',  desc: 'Agrega veterinarios, recepcionistas y auxiliares. Cada rol tiene accesos específicos.' },
            { step: '03', icon: Stethoscope, title: 'Empieza a gestionar', desc: 'Agenda citas, registra pacientes y controla tu inventario desde el primer día.' },
          ].map((item, i) => (
            <FadeUp key={item.step} delay={i * 0.12}>
              <div className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-sky-200 flex items-center justify-center shadow-md shadow-sky-100 z-10 relative">
                    <item.icon className="w-9 h-9 text-sky-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center shadow-md z-20">{item.step}</div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
      <FadeUp delay={0.4} className="text-center mt-14">
        <Link to="/registro" className="group inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-sky-600/20 hover:-translate-y-0.5">
          Crear mi cuenta gratis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </FadeUp>
    </div>
  </section>
)

// ─── Por qué Bourgelat ────────────────────────────────────────────────────────

const PorQue = () => (
  <section id="por-que" className="py-24 px-6" style={{ background: '#ffffff' }}>
    <div className="max-w-7xl mx-auto">
      <FadeUp className="text-center mb-16">
        <p className="text-sky-600 font-semibold text-xs uppercase tracking-widest mb-3">Por qué Bourgelat</p>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">Construido para la veterinaria hispanohablante</h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">Los grandes competidores internacionales cobran en dólares y no hablan tu idioma. Bourgelat sí.</p>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: Globe,     title: 'Todas las especies',       desc: 'Perros, gatos, aves, reptiles, conejos, fauna silvestre y más. Sin restricciones por especie en ningún plan.', color: 'bg-sky-50 text-sky-700 border-sky-200' },
          { icon: Zap,       title: 'Precio accesible',         desc: 'Precios en COP, sin cobros en dólares. Diseñado para que cualquier clínica veterinaria hispanohablante pueda acceder.', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
          { icon: Lock,      title: 'Seguridad hospitalaria',   desc: 'Historias clínicas inmutables, auditoría de cada acción, tokens seguros, bloqueo por intentos fallidos y cifrado en tránsito.', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { icon: Layers,    title: 'Roles granulares',         desc: 'Veterinario, recepcionista, auxiliar, facturador y admin. Cada miembro accede solo a lo que necesita.', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { icon: BarChart3, title: 'Reportes en tiempo real',  desc: 'Dashboard con ingresos, citas del día, alertas de inventario y métricas actualizadas al instante.', color: 'bg-sky-50 text-sky-700 border-sky-200' },
          { icon: Bell,      title: 'Sin límites artificiales', desc: 'Sin límite de mascotas, propietarios ni usuarios en ningún plan. Pagas por funcionalidades, no por volumen.', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        ].map((item, i) => (
          <FadeUp key={item.title} delay={i * 0.08}>
            <motion.div whileHover={{ y: -4 }} className={`p-6 rounded-xl border ${item.color} transition-all`}>
              <item.icon className="w-7 h-7 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2 tracking-tight">{item.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
)

// ─── CTA Final ────────────────────────────────────────────────────────────────

const CTAFinal = () => (
  <section id="contacto" className="py-24 px-6 relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)' }}>
    <div style={{ position: 'absolute', top: -1, left: 0, right: 0, lineHeight: 0 }}>
      <svg viewBox="0 0 1440 60" style={{ display: 'block' }}>
        <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,0 L0,0 Z" fill="#ffffff" />
      </svg>
    </div>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white opacity-[0.04] rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-300 opacity-[0.08] rounded-full blur-3xl" />
    </div>
    <div className="max-w-3xl mx-auto text-center relative z-10">
      <FadeUp>
        <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
          <Stethoscope className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Tu clínica merece el mejor software.</h2>
        <p className="text-sky-100 text-lg mb-10 max-w-xl mx-auto">Regístrate gratis y empieza a gestionar tu clínica desde hoy. Sin tarjeta de crédito, sin contratos.</p>
        <Link to="/registro" className="inline-flex items-center gap-2 bg-white text-sky-700 font-bold px-8 py-4 rounded-xl hover:bg-sky-50 transition-all shadow-2xl shadow-sky-900/20 hover:-translate-y-0.5 text-lg">
          Registrar mi clínica gratis <ArrowRight className="w-5 h-5" />
        </Link>
      </FadeUp>
    </div>
  </section>
)

// ─── Footer ───────────────────────────────────────────────────────────────────

const Footer = () => (
  <footer className="py-12 px-6 bg-slate-900">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Bourgelat</span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {['Funcionalidades','Planes','Contacto','Política de privacidad','Términos de uso'].map(link => (
            <a key={link} href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{link}</a>
          ))}
        </div>
        <p className="text-sm text-slate-500">© 2026 Bourgelat.</p>
      </div>
    </div>
  </footer>
)

// ─── LandingPage ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Bourgelat — Software veterinario para clínicas hispanohablantes'
  }, [])
  return (
    <div className="font-sans antialiased">
      <Spotlight />
      <Navbar />
      <Hero />
      <WaveDivider fromColor="#dbeafe" toColor="#ffffff" />
      <FeatureShowcase />
      <WaveDivider fromColor="#ffffff" toColor="#f0f9ff" />
      <ComoComienzo />
      <WaveDivider fromColor="#f0f9ff" toColor="#ffffff" flip={true} />
      <PorQue />
      <CTAFinal />
      <Footer />
    </div>
  )
}