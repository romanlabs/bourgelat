import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react'
import {
  PawPrint, Heart, Stethoscope, Pill, Syringe, Scissors,
  Fish, Activity, Thermometer, Microscope, FlaskConical,
  Bone, Bird, Dog, Rabbit, Turtle, HeartPulse, Dna,
  TestTube, Bandage, ClipboardPlus, Shield, Sparkles, Eye,
  Calendar, FileText, Package, Receipt, Check, ArrowRight,
  ChevronRight, Globe, Clock, Zap, Star, Quote, Menu, X,
  BarChart3, Users,
} from 'lucide-react'

const Spotlight = () => {
  const [pos, setPos] = useState({ x: -500, y: -500 })
  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <div className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
      style={{ background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, rgba(14,165,233,0.15), transparent 70%)` }} />
  )
}

const FadeUp = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}>
      {children}
    </motion.div>
  )
}

const ScaleIn = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}>
      {children}
    </motion.div>
  )
}

const Counter = ({ to, suffix = '' }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const num = parseInt(to.replace(/[^0-9]/g, ''))
    const steps = 60
    const increment = num / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= num) { setCount(num); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 2000 / steps)
    return () => clearInterval(timer)
  }, [inView, to])
  return <span ref={ref}>{count.toLocaleString('es-CO')}{suffix}</span>
}

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
      timeout = setTimeout(() => setDeleting(true), 2000)
    else if (deleting && displayed.length > 0)
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40)
    else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setIndex((i) => (i + 1) % WORDS.length)
    }
    return () => clearTimeout(timeout)
  }, [displayed, deleting, index])
  return <span className="text-sky-500">{displayed}<span className="animate-pulse">|</span></span>
}

const ICONS = [
  // ── Capa trasera ─────────────────────────────────────────────────────────
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
  { icon: Pill,         x: 75,  y: 3,   size: 14, opacity: 0.19, color: 'text-sky-300',  anim: 'float', duration: 17, delay: 2.9, glow: false },
  { icon: Turtle,       x: 40,  y: 98,  size: 15, opacity: 0.18, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 5.2, glow: false },

  // ── Capa media ───────────────────────────────────────────────────────────
  { icon: PawPrint,     x: 20,  y: 20,  size: 21, opacity: 0.28, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 0.5, glow: false },
  { icon: Stethoscope,  x: 78,  y: 18,  size: 21, opacity: 0.26, color: 'text-sky-500',  anim: 'float', duration: 22, delay: 1.2, glow: false },
  { icon: Rabbit,       x: 10,  y: 50,  size: 20, opacity: 0.25, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 2,   glow: false },
  { icon: Dog,          x: 88,  y: 45,  size: 20, opacity: 0.25, color: 'text-sky-400',  anim: 'float', duration: 21, delay: 0.8, glow: false },
  { icon: Activity,     x: 55,  y: 14,  size: 19, opacity: 0.26, color: 'text-sky-500',  anim: 'pulse', duration: 16, delay: 0.5, glow: false },
  { icon: FlaskConical, x: 30,  y: 72,  size: 19, opacity: 0.25, color: 'text-cyan-400', anim: 'float', duration: 19, delay: 3.2, glow: false },
  { icon: Microscope,   x: 68,  y: 70,  size: 19, opacity: 0.25, color: 'text-sky-400',  anim: 'float', duration: 23, delay: 1.8, glow: false },
  { icon: TestTube,     x: 45,  y: 80,  size: 18, opacity: 0.23, color: 'text-cyan-300', anim: 'spin',  duration: 32, delay: 0,   glow: false },
  { icon: ClipboardPlus,x: 92,  y: 32,  size: 18, opacity: 0.22, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 4,   glow: false },
  { icon: Bone,         x: 5,   y: 35,  size: 19, opacity: 0.23, color: 'text-sky-300',  anim: 'float', duration: 22, delay: 2.8, glow: false },
  { icon: Thermometer,  x: 75,  y: 55,  size: 17, opacity: 0.22, color: 'text-cyan-400', anim: 'pulse', duration: 18, delay: 1,   glow: false },
  { icon: Shield,       x: 25,  y: 45,  size: 17, opacity: 0.21, color: 'text-sky-400',  anim: 'float', duration: 25, delay: 3.5, glow: false },
  { icon: Bird,         x: 42,  y: 22,  size: 19, opacity: 0.24, color: 'text-sky-300',  anim: 'float', duration: 21, delay: 2,   glow: false },
  { icon: Syringe,      x: 63,  y: 52,  size: 18, opacity: 0.23, color: 'text-cyan-400', anim: 'float', duration: 18, delay: 1.5, glow: false },
  { icon: Turtle,       x: 52,  y: 65,  size: 17, opacity: 0.22, color: 'text-sky-300',  anim: 'float', duration: 24, delay: 0.7, glow: false },
  { icon: Dna,          x: 35,  y: 38,  size: 18, opacity: 0.21, color: 'text-cyan-300', anim: 'spin',  duration: 29, delay: 3,   glow: false },
  { icon: Fish,         x: 18,  y: 75,  size: 18, opacity: 0.22, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 4.5, glow: false },
  { icon: Pill,         x: 83,  y: 60,  size: 17, opacity: 0.21, color: 'text-sky-300',  anim: 'float', duration: 19, delay: 2.3, glow: false },
  { icon: PawPrint,     x: 33,  y: 50,  size: 17, opacity: 0.22, color: 'text-sky-400',  anim: 'drift', duration: 26, delay: 1.3, glow: false },
  { icon: Rabbit,       x: 62,  y: 20,  size: 16, opacity: 0.21, color: 'text-cyan-400', anim: 'drift', duration: 23, delay: 3.1, glow: false },
  { icon: Dog,          x: 8,   y: 88,  size: 18, opacity: 0.22, color: 'text-sky-400',  anim: 'drift', duration: 20, delay: 1.1, glow: false },

  // ── Capa frontal con glow ─────────────────────────────────────────────────
  { icon: PawPrint,     x: 14,  y: 62,  size: 28, opacity: 0.38, color: 'text-sky-400',  anim: 'float', duration: 22, delay: 0,   glow: true },
  { icon: HeartPulse,   x: 82,  y: 30,  size: 28, opacity: 0.36, color: 'text-sky-500',  anim: 'pulse', duration: 20, delay: 0,   glow: true },
  { icon: Stethoscope,  x: 38,  y: 58,  size: 27, opacity: 0.35, color: 'text-cyan-400', anim: 'float', duration: 24, delay: 1.5, glow: true },
  { icon: Syringe,      x: 60,  y: 36,  size: 25, opacity: 0.33, color: 'text-sky-400',  anim: 'float', duration: 21, delay: 2.2, glow: true },
  { icon: Heart,        x: 70,  y: 78,  size: 27, opacity: 0.33, color: 'text-sky-500',  anim: 'pulse', duration: 22, delay: 0.8, glow: true },
  { icon: Sparkles,     x: 48,  y: 46,  size: 23, opacity: 0.30, color: 'text-cyan-300', anim: 'spin',  duration: 26, delay: 0,   glow: true },
  { icon: Dog,          x: 22,  y: 28,  size: 25, opacity: 0.32, color: 'text-sky-400',  anim: 'float', duration: 20, delay: 3,   glow: true },
  { icon: Microscope,   x: 88,  y: 60,  size: 25, opacity: 0.32, color: 'text-cyan-400', anim: 'float', duration: 23, delay: 1,   glow: true },
  { icon: Bone,         x: 55,  y: 82,  size: 23, opacity: 0.30, color: 'text-sky-400',  anim: 'float', duration: 19, delay: 2.5, glow: true },
  { icon: FlaskConical, x: 5,   y: 20,  size: 23, opacity: 0.29, color: 'text-cyan-400', anim: 'float', duration: 22, delay: 1.8, glow: true },
]
 
const getAnimation = (anim, i) => {
  const dir = i % 8
  const xPaths = [
    [-8, 5, -3, 10, -6, 8, -8],
    [6, -10, 8, -4, 10, -6, 6],
    [-5, 8, -10, 4, -8, 6, -5],
    [10, -6, 4, -8, 6, -10, 10],
    [-6, 10, -8, 6, -4, 8, -6],
    [4, -8, 10, -6, 8, -4, 4],
    [-10, 4, -6, 8, -10, 6, -10],
    [8, -4, 6, -10, 4, -8, 8],
  ]
  const yPaths = [
    [-6, 10, -8, 4, -10, 6, -6],
    [8, -4, 6, -10, 8, -6, 8],
    [-10, 6, -4, 8, -6, 10, -10],
    [4, -8, 10, -6, 4, -10, 4],
    [-8, 6, -10, 8, -4, 6, -8],
    [10, -6, 4, -8, 10, -4, 10],
    [-4, 8, -6, 10, -8, 4, -4],
    [6, -10, 8, -4, 6, -8, 6],
  ]
  switch (anim) {
    case 'float':
    case 'drift':
      return {
        animate: {
          x: xPaths[dir],
          y: yPaths[dir],
          rotate: [-4, 4, -3, 5, -4],
        },
        transition: { ease: 'easeInOut', repeat: Infinity },
      }
    case 'spin':
      return {
        animate: {
          rotate: [0, 360],
          x: xPaths[dir].map(v => v * 0.6),
          y: yPaths[dir].map(v => v * 0.6),
        },
        transition: { ease: 'linear', repeat: Infinity },
      }
    case 'pulse':
      return {
        animate: {
          scale: [1, 1.15, 1, 1.1, 1],
          x: xPaths[dir].map(v => v * 0.7),
          y: yPaths[dir].map(v => v * 0.7),
        },
        transition: { ease: 'easeInOut', repeat: Infinity },
      }
    default:
      return {
        animate: { x: xPaths[0], y: yPaths[0] },
        transition: { ease: 'easeInOut', repeat: Infinity },
      }
  }
}
 
const FloatingIcons = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
    {ICONS.map((item, i) => {
      const { animate, transition } = getAnimation(item.anim, i)
      return (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          animate={animate}
          transition={{ ...transition, duration: item.duration, delay: item.delay }}
        >
          {item.glow && (
            <div
              className="absolute inset-0 rounded-full blur-xl -z-10 bg-sky-400"
              style={{ opacity: item.opacity * 0.6, transform: 'scale(2.5)' }}
            />
          )}
          <item.icon
            style={{ width: item.size, height: item.size, opacity: item.opacity }}
            className={item.color}
            strokeWidth={1.5}
          />
        </motion.div>
      )
    })}
  </div>
)


const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  return (
    <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-sky-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/30">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">VetNova</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[{ label: 'Funcionalidades', id: 'funcionalidades' }, { label: 'Planes', id: 'planes' }, { label: '¿Por qué VetNova?', id: 'por-que' }, { label: 'Testimonios', id: 'testimonios' }].map(link => (
            <button key={link.id} onClick={() => scrollTo(link.id)}
              className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors cursor-pointer">{link.label}</button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors px-4 py-2">Iniciar sesión</Link>
          <Link to="/registro" className="text-sm font-semibold bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/25 hover:-translate-y-0.5">Registrarse gratis</Link>
        </div>
        <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-slate-600">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-t border-sky-100 px-6 py-4 flex flex-col gap-4">
            {[{ label: 'Funcionalidades', id: 'funcionalidades' }, { label: 'Planes', id: 'planes' }, { label: '¿Por qué VetNova?', id: 'por-que' }, { label: 'Testimonios', id: 'testimonios' }].map(link => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm font-medium text-slate-600 text-left">{link.label}</button>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-sky-100">
              <Link to="/login" className="text-sm font-medium text-slate-600 py-2">Iniciar sesión</Link>
              <Link to="/registro" className="text-sm font-semibold bg-sky-500 text-white px-4 py-2.5 rounded-xl text-center">Registrarse gratis</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

const Hero = () => {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 400], [0, -60])
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden min-h-screen flex items-center"
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f9ff, #dbeafe)' }}>

      {/* Cuadrícula con degradado */}
            <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(14,165,233,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.08) 1px, transparent 1px),
          linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px, 40px 40px, 8px 8px, 8px 8px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 70%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 70%, black 100%)',
      }} />

      <FloatingIcons />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-sky-200 opacity-25 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-blue-200 opacity-20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-cyan-200 opacity-15 rounded-full blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center max-w-4xl mx-auto">
          <FadeUp>
            <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Software veterinario #1 en Colombia 🇨🇴
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight mb-6" style={{ minHeight: '280px' }}>
              Gestiona tu clínica<br />veterinaria con <TypingText />
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
              Citas, historias clínicas, inventario y facturación en un solo lugar. Rápido, seguro y hecho para Colombia.
            </p>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/registro" className="group flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-sky-500/30 hover:-translate-y-1">
                Empieza gratis hoy <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 text-slate-600 hover:text-sky-600 font-medium px-8 py-4 rounded-2xl border border-slate-200 hover:border-sky-300 transition-all bg-white hover:bg-sky-50">
                Ver funcionalidades <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </FadeUp>
          <FadeUp delay={0.4}>
            <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-8 border-t border-sky-100">
              {[{ value: '500', suffix: '+', label: 'Clínicas activas' }, { value: '50000', suffix: '+', label: 'Mascotas registradas' }, { value: '200000', suffix: '+', label: 'Citas agendadas' }, { value: '99', suffix: '.9%', label: 'Disponibilidad' }].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-bold text-sky-600"><Counter to={s.value} suffix={s.suffix} /></p>
                  <p className="text-sm text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
        <motion.div style={{ y }} className="mt-16 rounded-3xl bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50 border border-sky-200 shadow-2xl shadow-sky-200/50 aspect-video flex items-center justify-center overflow-hidden">
          <FadeUp delay={0.5} className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-200 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-10 h-10 text-sky-500" />
            </div>
            <p className="text-slate-400 font-semibold text-lg">Screenshot del dashboard</p>
            <p className="text-slate-300 text-sm">Próximamente</p>
          </FadeUp>
        </motion.div>
      </div>
    </section>
  )
}

const LOGOS = ['Clínica San Roque', 'VetCare Bogotá', 'Animal Health', 'PetClinic Medellín', 'Clínica Paws', 'VetSalud Cali', 'Animal Care Barranquilla', 'PetWorld', 'Clínica AnimalLife', 'VetCenter Colombia']
const LogosCarrusel = () => (
  <section className="py-12 bg-white border-y border-sky-100 overflow-hidden">
    <div className="max-w-7xl mx-auto px-6 mb-6">
      <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest">Clínicas que confían en VetNova</p>
    </div>
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, white, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, white, transparent)' }} />
      <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="flex gap-12 whitespace-nowrap">
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-50 border border-sky-100">
            <div className="w-6 h-6 rounded-md bg-sky-500 flex items-center justify-center"><Stethoscope className="w-3 h-3 text-white" /></div>
            <span className="text-sm font-semibold text-slate-600">{logo}</span>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
)

const TABS = [
  { id: 'citas', label: 'Agenda', icon: Calendar, title: 'Agenda inteligente sin solapamientos', desc: 'Gestiona todas las citas de tu clínica con un calendario visual. El sistema detecta automáticamente conflictos de horario y envía recordatorios a los dueños.', features: ['Vista semanal y mensual', 'Anti-solapamiento por veterinario', 'Recordatorios automáticos', '6 estados de cita'], color: 'sky' },
  { id: 'historias', label: 'Historia clínica', icon: FileText, title: 'Historia clínica completa e inmutable', desc: 'Registra examen físico, diagnósticos, medicamentos y tratamientos. Una vez bloqueada, la historia clínica no puede ser modificada.', features: ['Examen físico detallado', 'Diagnósticos y medicamentos', 'Antecedentes del paciente', 'Inmutable al bloquear'], color: 'blue' },
  { id: 'inventario', label: 'Inventario', icon: Package, title: 'Control de inventario con escáner', desc: 'Controla tu stock de medicamentos y productos. Compatible con lectores de código de barras. Alertas automáticas de stock bajo y productos próximos a vencer.', features: ['Escáner código de barras', 'Alertas de stock bajo', 'Alertas de vencimiento', 'Trazabilidad completa'], color: 'cyan' },
  { id: 'facturacion', label: 'Facturación', icon: Receipt, title: 'Facturación automática con DIAN', desc: 'Genera facturas automáticamente con descuento de inventario incluido. Cumple con los requisitos del DIAN para facturación electrónica en Colombia.', features: ['Descuento automático de inventario', 'Cumplimiento DIAN', 'Exportar PDF', 'Historial de facturas'], color: 'indigo' },
]
const colorMap = {
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', active: 'bg-sky-500', check: 'bg-sky-100 text-sky-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', active: 'bg-blue-500', check: 'bg-blue-100 text-blue-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', active: 'bg-cyan-500', check: 'bg-cyan-100 text-cyan-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', active: 'bg-indigo-500', check: 'bg-indigo-100 text-indigo-600' },
}

const WaveDivider = ({ fromColor = '#ffffff', toColor = '#f0f9ff', flip = false }) => (
  <div style={{ background: fromColor, lineHeight: 0 }}>
    <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none' }}>
      <path
        d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z"
        fill={toColor}
      />
    </svg>
  </div>
)


const Funcionalidades = () => {
  const [activeTab, setActiveTab] = useState('citas')
  const active = TABS.find(t => t.id === activeTab)
  const colors = colorMap[active.color]
  return (
    <section id="funcionalidades" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <FadeUp className="text-center mb-16">
          <p className="text-sky-500 font-semibold text-sm uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Todo lo que tu clínica necesita</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">Desde la cita hasta la factura — VetNova cubre cada proceso.</p>
        </FadeUp>
        <FadeUp>
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? `${colorMap[tab.color].active} text-white shadow-lg` : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-600'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </FadeUp>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
            className={`rounded-3xl border ${colors.border} ${colors.bg} p-10`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className={`w-12 h-12 rounded-2xl ${colors.check} flex items-center justify-center mb-6`}><active.icon className="w-6 h-6" /></div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{active.title}</h3>
                <p className="text-slate-500 text-lg mb-8 leading-relaxed">{active.desc}</p>
                <ul className="flex flex-col gap-3">
                  {active.features.map(f => (
                    <li key={f} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full ${colors.check} flex items-center justify-center flex-shrink-0`}><Check className="w-3 h-3" /></div>
                      <span className="text-slate-700 font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-2xl ${colors.check} flex items-center justify-center mx-auto mb-3`}><active.icon className="w-8 h-8" /></div>
                  <p className="text-slate-400 font-medium">Screenshot de {active.label}</p>
                  <p className="text-slate-300 text-sm">Próximamente</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

const PorQue = () => (
  <section id="por-que" className="py-24 px-6" style={{ background: '#f0f9ff' }}>
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <ScaleIn className="order-2 lg:order-1">
          <div className="rounded-3xl bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 border border-sky-200 aspect-square flex items-center justify-center shadow-xl shadow-sky-200/40">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-200 flex items-center justify-center mx-auto mb-4"><Heart className="w-10 h-10 text-sky-500" /></div>
              <p className="text-slate-400 font-medium">Foto del equipo</p>
              <p className="text-slate-300 text-sm">Próximamente</p>
            </div>
          </div>
        </ScaleIn>
        <FadeUp className="order-1 lg:order-2">
          <p className="text-sky-500 font-semibold text-sm uppercase tracking-widest mb-3">¿Por qué VetNova?</p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">Hecho en Colombia,<br /><span className="text-sky-500">para Colombia</span></h2>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">No somos una traducción de software extranjero. VetNova nació en Neiva, Huila, cumple con la Ley 1581 y soporta todas las especies incluyendo fauna silvestre.</p>
          <div className="flex flex-col gap-4">
            {[
              { icon: Shield, text: 'Cumplimiento Ley 1581 y DIAN', color: 'bg-sky-50 text-sky-600' },
              { icon: Globe, text: 'Soporte para fauna silvestre y todas las especies', color: 'bg-blue-50 text-blue-600' },
              { icon: Zap, text: 'Sin límite de mascotas ni usuarios', color: 'bg-cyan-50 text-cyan-600' },
              { icon: Clock, text: 'Soporte en español colombiano', color: 'bg-indigo-50 text-indigo-600' },
            ].map((item, i) => (
              <motion.div key={item.text} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}><item.icon className="w-5 h-5" /></div>
                <span className="text-slate-700 font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </FadeUp>
      </div>
    </div>
  </section>
)

const TESTIMONIOS = [
  { nombre: 'Dra. Carolina Mejía', cargo: 'Directora, Clínica VetCare Bogotá', texto: 'VetNova transformó completamente la gestión de nuestra clínica. Lo que antes nos tomaba horas ahora lo hacemos en minutos.', stars: 5 },
  { nombre: 'Dr. Andrés Gómez', cargo: 'Veterinario, Animal Health Medellín', texto: 'La historia clínica inmutable nos da mucha seguridad legal. Además el soporte en español colombiano es excelente.', stars: 5 },
  { nombre: 'Luisa Fernanda Torres', cargo: 'Administradora, PetClinic Cali', texto: 'El inventario con escáner de código de barras nos ahorró muchísimo tiempo. La facturación automática es increíble.', stars: 5 },
]

const Testimonios = () => (
  <section id="testimonios" className="py-24 px-6" style={{ background: '#ffffff' }}>
    <div className="max-w-7xl mx-auto">
      <FadeUp className="text-center mb-16">
        <p className="text-sky-500 font-semibold text-sm uppercase tracking-widest mb-3">Testimonios</p>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Lo que dicen nuestros clientes</h2>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIOS.map((t, i) => (
          <FadeUp key={t.nombre} delay={i * 0.1}>
            <motion.div whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(14,165,233,0.1)' }}
              className="p-8 rounded-3xl border border-slate-100 bg-white hover:border-sky-200 transition-all">
              <Quote className="w-8 h-8 text-sky-200 mb-4" />
              <div className="flex gap-1 mb-4">{Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
              <p className="text-slate-600 leading-relaxed mb-6">"{t.texto}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center"><span className="text-sky-600 font-bold text-sm">{t.nombre.charAt(0)}</span></div>
                <div><p className="font-semibold text-slate-900 text-sm">{t.nombre}</p><p className="text-slate-500 text-xs">{t.cargo}</p></div>
              </div>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
)

const PLANES = [
  { nombre: 'Básico', precio: '99.000', desc: 'Ideal para clínicas pequeñas que están empezando.', features: ['Agenda de citas', 'Historia clínica', 'Propietarios y mascotas', 'Inventario básico', '500MB almacenamiento'], cta: 'Empezar gratis', destacado: false },
  { nombre: 'Profesional', precio: '199.000', desc: 'Para clínicas en crecimiento que necesitan más.', features: ['Todo lo del Básico', 'Facturación completa', 'Reportes avanzados', 'Recordatorios WhatsApp', 'Exportar PDF', '5GB almacenamiento'], cta: 'Empezar gratis', destacado: true },
  { nombre: 'Enterprise', precio: '399.000', desc: 'Para cadenas veterinarias con múltiples sedes.', features: ['Todo lo del Profesional', 'Multisede', 'Almacenamiento ilimitado', 'Soporte prioritario', 'Acceso API', 'Onboarding personalizado'], cta: 'Contactar ventas', destacado: false },
]

const Planes = () => (
  <section id="planes" className="py-24 px-6" style={{ background: '#f0f9ff' }}>
    <div className="max-w-7xl mx-auto">
      <FadeUp className="text-center mb-16">
        <p className="text-sky-500 font-semibold text-sm uppercase tracking-widest mb-3">Planes</p>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Precios en COP, sin sorpresas</h2>
        <p className="text-slate-500 text-lg">Sin cobros en dólares. Cancela cuando quieras.</p>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {PLANES.map((plan, i) => (
          <FadeUp key={plan.nombre} delay={i * 0.1}>
            <motion.div whileHover={{ y: plan.destacado ? 0 : -8 }}
              className={`relative rounded-3xl p-8 border transition-all ${plan.destacado ? 'bg-gradient-to-b from-sky-500 to-sky-600 border-sky-500 shadow-2xl shadow-sky-500/30 scale-105' : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xl'}`}>
              {plan.destacado && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">⭐ MÁS POPULAR</div>}
              <h3 className={`text-xl font-bold mb-1 ${plan.destacado ? 'text-white' : 'text-slate-900'}`}>{plan.nombre}</h3>
              <p className={`text-sm mb-6 ${plan.destacado ? 'text-sky-100' : 'text-slate-500'}`}>{plan.desc}</p>
              <div className="mb-6">
                <span className={`text-4xl font-bold ${plan.destacado ? 'text-white' : 'text-slate-900'}`}>${plan.precio}</span>
                <span className={`text-sm ml-1 ${plan.destacado ? 'text-sky-100' : 'text-slate-500'}`}>COP/mes</span>
              </div>
              <Link to="/registro" className={`block text-center font-bold py-3 rounded-2xl mb-8 transition-all ${plan.destacado ? 'bg-white text-sky-600 hover:bg-sky-50 shadow-lg' : 'bg-sky-500 text-white hover:bg-sky-600'}`}>{plan.cta}</Link>
              <ul className="flex flex-col gap-3">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.destacado ? 'bg-sky-400' : 'bg-sky-50'}`}><Check className={`w-3 h-3 ${plan.destacado ? 'text-white' : 'text-sky-600'}`} /></div>
                    <span className={`text-sm ${plan.destacado ? 'text-sky-50' : 'text-slate-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
)

const CTAFinal = () => (
  <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700">
    <div style={{ position: 'absolute', top: -1, left: 0, right: 0, lineHeight: 0 }}>
  <svg viewBox="0 0 1440 60" style={{ display: 'block' }}>
    <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,0 L0,0 Z" fill="#ffffff" />
  </svg>
</div>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-300 opacity-10 rounded-full blur-3xl" />
    </div>
    <div className="max-w-3xl mx-auto text-center relative z-10">
      <FadeUp>
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6"><Stethoscope className="w-8 h-8 text-white" /></div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">¿Listo para transformar tu clínica?</h2>
        <p className="text-sky-100 text-lg mb-10">Únete a cientos de clínicas colombianas que ya confían en VetNova.</p>
        <Link to="/registro" className="inline-flex items-center gap-2 bg-white text-sky-600 font-bold px-8 py-4 rounded-2xl hover:bg-sky-50 transition-all shadow-2xl hover:-translate-y-1 text-lg">
          Registrar mi clínica gratis <ArrowRight className="w-5 h-5" />
        </Link>
      </FadeUp>
    </div>
  </section>
)

const Footer = () => (
  <footer className="py-12 px-6 bg-slate-900">
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-white text-lg">VetNova</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {['Funcionalidades', 'Planes', 'Contacto', 'Política de privacidad', 'Términos'].map(link => (
            <a key={link} href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{link}</a>
          ))}
        </div>
        <p className="text-sm text-slate-500">© 2026 VetNova. Hecho en Colombia 🇨🇴</p>
      </div>
    </div>
  </footer>
)

export default function LandingPage() {
  useEffect(() => {
    document.title = 'VetNova — Software veterinario para Colombia'
  }, [])

  return (
  <div className="font-sans antialiased">
    <Spotlight />
    <Navbar />
    <Hero />
    <LogosCarrusel />
    <Funcionalidades />
    <WaveDivider fromColor="#ffffff" toColor="#f0f9ff" />
    <PorQue />
    <WaveDivider fromColor="#ffffff" toColor="#f0f9ff" flip={true} />
    <Testimonios />
    <WaveDivider fromColor="#ffffff" toColor="#f0f9ff" />
    <Planes />
    <WaveDivider fromColor="#f0f9ff" toColor="#ffffff" />
    <CTAFinal />
    
    <Footer />
  </div>
)
}