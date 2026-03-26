import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'motion/react'
import {
  Stethoscope, ArrowRight, ChevronRight, Menu, X, Monitor,
  Calendar, FileText, Package, Receipt, BarChart3,
  Shield, Clock, Layers, Bell, Globe, Check,
} from 'lucide-react'

// ─── PALETA ──────────────────────────────────────────────────────────────────

const T = {
  navy:    '#05101f',
  navyMid: '#0a1f38',
  navyLt:  '#0f2d50',
  teal:    '#0d9488',
  cyan:    '#22d3ee',
  cyanLt:  '#67e8f9',
  amber:   '#f59e0b',
  cream:   '#f8fafc',
  text:    '#0f172a',
  muted:   '#64748b',
  border:  '#e2e8f0',
  gBorder: 'rgba(255,255,255,0.14)',
}

const glass = (extra = {}) => ({
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.14)',
  ...extra,
})

// ─── FADE UP ──────────────────────────────────────────────────────────────────

const FadeUp = ({ children, delay = 0, className = '', style = {} }) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}>
      {children}
    </motion.div>
  )
}

// ─── MESH BACKGROUND ──────────────────────────────────────────────────────────

const MeshBg = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-20%', left: '-12%', background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 65%)' }} />
    <div style={{ position: 'absolute', width: 550, height: 550, borderRadius: '50%', top: '5%', right: '-8%', background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 65%)' }} />
    <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', bottom: '0', left: '35%', background: 'radial-gradient(circle, rgba(15,45,80,0.75) 0%, transparent 70%)' }} />
    <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', bottom: '15%', right: '10%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)' }} />
    {/* Grid sutil */}
    <div style={{ position: 'absolute', inset: 0, opacity: 0.055, backgroundImage: 'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)', backgroundSize: '62px 62px' }} />
  </div>
)

// ─── SCREENSHOT SLOT ─────────────────────────────────────────────────────────
// Reemplaza con: <img src="/screenshots/xxx.png" style={{ width:'100%', display:'block' }} />

const Shot = ({ label, file = '', aspect = '16/9', dark = true }) => (
  <div style={{ aspectRatio: aspect, background: dark ? 'linear-gradient(150deg,rgba(10,31,56,0.97),rgba(5,16,31,0.99))' : 'linear-gradient(150deg,#f1f5f9,#e2eaf3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', borderRadius: 'inherit' }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.28, backgroundImage: `radial-gradient(circle, ${dark ? 'rgba(34,211,238,0.18)' : 'rgba(13,148,136,0.14)'} 1px, transparent 1px)`, backgroundSize: '26px 26px' }} />
    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '2rem' }}>
      <Monitor style={{ width: 28, height: 28, color: dark ? 'rgba(34,211,238,0.22)' : T.muted, marginBottom: 10 }} strokeWidth={1.2} />
      <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 13, fontWeight: 600, margin: 0, color: dark ? 'rgba(255,255,255,0.20)' : T.muted }}>{label}</p>
      {file && <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 11, margin: '6px 0 0', color: dark ? 'rgba(255,255,255,0.09)' : T.border, fontStyle: 'italic' }}>{file}</p>}
    </div>
  </div>
)

// ─── LOGO SLOT ────────────────────────────────────────────────────────────────
// Reemplaza con: <img src="/logos/clinicaX.svg" style={{ height:30, opacity:0.40, filter:'brightness(0) invert(1)', objectFit:'contain' }} />

const LogoSlot = ({ n }) => (
  <div style={{ height: 32, minWidth: 108, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: 'rgba(255,255,255,0.16)' }}>Logo {n}</span>
  </div>
)

// ─── BROWSER CHROME ───────────────────────────────────────────────────────────

const BrowserChrome = ({ url }) => (
  <div style={{ ...glass({ background: 'rgba(8,22,42,0.88)' }), borderBottom: '1px solid rgba(255,255,255,0.09)', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ display: 'flex', gap: 6 }}>
      {['#e06060','#e0b560','rgba(255,255,255,0.18)'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
    </div>
    <div style={{ flex: 1, ...glass({ borderRadius: 6, padding: '4px 13px', display: 'flex', alignItems: 'center', gap: 8 }) }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.teal }} />
      <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 11, color: 'rgba(255,255,255,0.26)' }}>{url}</span>
    </div>
  </div>
)

// ─── NAVBAR ───────────────────────────────────────────────────────────────────

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  const go = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setOpen(false) }

  return (
    <motion.nav initial={{ y: -72, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, transition: 'all 0.3s',
        ...(scrolled ? { background: 'rgba(5,16,31,0.90)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(255,255,255,0.08)' } : { background: 'transparent' }) }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* ── LOGO — reemplaza con <img src="/logo.svg" style={{ height:32 }} /> ── */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${T.teal}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
            <Stethoscope style={{ width: 17, height: 17, color: '#fff' }} strokeWidth={1.5} />
          </div>
          <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Bourgelat</span>
        </Link>

        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 36 }}>
          {[['Funcionalidades','funcionalidades'],['Por qué','por-que'],['Planes','planes'],['Contacto','contacto']].map(([l,id]) => (
            <button key={id} onClick={() => go(id)} style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.55)'}>{l}</button>
          ))}
        </div>

        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 10 }}>
          <Link to="/login" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.50)', textDecoration: 'none', padding: '8px 16px' }}>Iniciar sesión</Link>
          <Link to="/registro" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 14, fontWeight: 700, color: T.navy, background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLt})`, padding: '10px 22px', borderRadius: 9, textDecoration: 'none', boxShadow: '0 4px 18px rgba(34,211,238,0.24)' }}>
            Empieza gratis
          </Link>
        </div>

        <button onClick={() => setOpen(v=>!v)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 8 }}>
          {open ? <X style={{ width:20,height:20 }}/> : <Menu style={{ width:20,height:20 }}/>}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}
            style={{ background:'rgba(5,16,31,0.97)', backdropFilter:'blur(22px)', borderTop:'1px solid rgba(255,255,255,0.08)', padding:'20px 28px', display:'flex', flexDirection:'column', gap:18 }}>
            {[['Funcionalidades','funcionalidades'],['Por qué Bourgelat','por-que'],['Planes','planes'],['Contacto','contacto']].map(([l,id]) => (
              <button key={id} onClick={() => go(id)} style={{ fontFamily:'Plus Jakarta Sans', fontSize:15, fontWeight:500, color:'rgba(255,255,255,0.70)', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>{l}</button>
            ))}
            <Link to="/registro" style={{ fontFamily:'Plus Jakarta Sans', fontSize:14, fontWeight:700, color:T.navy, background:`linear-gradient(135deg,${T.cyan},${T.cyanLt})`, padding:'13px 20px', borderRadius:9, textDecoration:'none', textAlign:'center', marginTop:4 }}>
              Empieza gratis
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

const Hero = () => {
  const { scrollY } = useScroll()
  const imgY = useTransform(scrollY, [0,600], [0,60])
  const bgY  = useTransform(scrollY, [0,600], [0,-35])
  return (
    <section style={{ background: T.navy, minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '130px 28px 90px', position: 'relative', overflow: 'hidden' }}>
      <motion.div style={{ position: 'absolute', inset: 0, y: bgY }}><MeshBg /></motion.div>

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>

        <FadeUp>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...glass({ borderRadius: 100, padding: '7px 20px', marginBottom: 48 }) }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.cyan, display: 'inline-block', boxShadow: `0 0 8px ${T.cyan}` }} />
            <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 12, fontWeight: 700, color: T.cyanLt, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Software veterinario · Colombia</span>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <h1 style={{ fontFamily: 'Cormorant Garamond', fontSize: 'clamp(52px,8vw,100px)', fontWeight: 700, color: '#fff', lineHeight: 1.02, letterSpacing: '-3px', margin: '0 0 28px', maxWidth: 860 }}>
            Cada consulta,{' '}<span style={{ color: T.cyan }}>registrada.</span><br />
            Cada cita,{' '}<em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>sin complicaciones.</em>
          </h1>
        </FadeUp>

        <FadeUp delay={0.16}>
          <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, color: 'rgba(255,255,255,0.48)', lineHeight: 1.72, margin: '0 0 52px', maxWidth: 520 }}>
            Citas, historias clínicas, inventario y facturación DIAN — todo en una plataforma. Hecho para veterinarios en Colombia.
          </p>
        </FadeUp>

        <FadeUp delay={0.22}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 72 }}>
            <Link to="/registro" style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 700, color: T.navy, background: `linear-gradient(135deg, ${T.cyan}, ${T.cyanLt})`, padding: '15px 32px', borderRadius: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(34,211,238,0.28)' }}>
              Empieza gratis <ArrowRight style={{ width:16,height:16 }}/>
            </Link>
            <button onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior:'smooth' })}
              style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.65)', ...glass({ padding: '15px 28px', borderRadius: 11 }), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Ver cómo funciona <ChevronRight style={{ width:16,height:16 }}/>
            </button>
          </div>
        </FadeUp>

        {/* Stat pills de vidrio */}
        <FadeUp delay={0.30}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 80 }}>
            {[
              { n: '< 3 min', label: 'por consulta completa' },
              { n: 'Todas',   label: 'las especies' },
              { n: 'DIAN',    label: 'facturación incluida' },
            ].map(s => (
              <div key={s.n} style={{ ...glass({ borderRadius: 14, padding: '18px 26px' }) }}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 34, fontWeight: 700, color: T.cyanLt, letterSpacing: '-1px', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 12, color: 'rgba(255,255,255,0.36)', marginTop: 7 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Dashboard — reemplaza con screenshot */}
        <FadeUp delay={0.36}>
          <motion.div style={{ y: imgY }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 60px 140px rgba(0,0,0,0.60), 0 0 0 1px rgba(34,211,238,0.08)' }}>
              <BrowserChrome url="app.bourgelat.co/dashboard" />
              {/*
                ── REEMPLAZA CON TU SCREENSHOT ──────────────────────────────────
                <img src="/screenshots/dashboard.png" alt="Dashboard Bourgelat"
                  style={{ width:'100%', display:'block' }} />
                ─────────────────────────────────────────────────────────────────
              */}
              <Shot label="Screenshot del dashboard" file="/screenshots/dashboard.png" aspect="16/7" />
            </div>
          </motion.div>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── LOGOS ────────────────────────────────────────────────────────────────────

const LogosBar = () => (
  <section style={{ background: T.navyMid, borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '28px 28px' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 26, justifyContent: 'center' }}>
      <span style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.10em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Confían en Bourgelat</span>
      {[1,2,3,4,5,6].map(n => <LogoSlot key={n} n={n} />)}
    </div>
  </section>
)

// ─── FEATURES ─────────────────────────────────────────────────────────────────

const TABS = [
  { id:'agenda',     label:'Agenda',           icon:Calendar,  url:'agenda',      body:'Citas online con recordatorio automático por WhatsApp. Control de disponibilidad por veterinario y vista semanal del equipo completo.' },
  { id:'historia',   label:'Historia clínica', icon:FileText,  url:'historias',   body:'Anamnesis, diagnósticos SOAP, vacunas, medicamentos y archivos. Todo registrado y firmado en menos de 3 minutos.' },
  { id:'inventario', label:'Inventario',       icon:Package,   url:'inventario',  body:'Control de medicamentos, insumos y productos. Alertas de stock mínimo y vencimiento antes de que se convierta en un problema.' },
  { id:'factura',    label:'Facturación',      icon:Receipt,   url:'facturacion', body:'Facturas electrónicas DIAN directamente desde la plataforma. Cobros, abonos y cuentas por cobrar sin salir del sistema.' },
  { id:'reportes',   label:'Reportes',         icon:BarChart3, url:'reportes',    body:'Dashboard con ingresos, citas por médico y productos más vendidos. Sin exportar a Excel. Sin esperar al contador.' },
]
const DURATION = 5200

const Features = () => {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [auto, setAuto] = useState(true)
  const rafRef = useRef(null)
  const t0Ref = useRef(null)

  useEffect(() => {
    if (!auto) return
    t0Ref.current = Date.now() - (progress/100)*DURATION
    const tick = () => {
      const p = Math.min(((Date.now()-t0Ref.current)/DURATION)*100, 100)
      setProgress(p)
      if (p >= 100) { setActive(a=>(a+1)%TABS.length); setProgress(0); t0Ref.current=Date.now() }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [auto, active])

  const pick = i => { cancelAnimationFrame(rafRef.current); setActive(i); setProgress(0); setAuto(false) }

  return (
    <section id="funcionalidades" style={{ background: T.navyMid, padding: '110px 28px', position: 'relative', overflow: 'hidden' }}>
      <MeshBg />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <FadeUp style={{ textAlign:'center', marginBottom:60 }}>
          <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:11, fontWeight:700, color:T.cyan, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 18px' }}>Funcionalidades</p>
          <h2 style={{ fontFamily:'Cormorant Garamond', fontSize:'clamp(38px,5.5vw,64px)', fontWeight:700, color:'#fff', lineHeight:1.06, letterSpacing:'-2px', margin:'0 0 18px' }}>
            Todo lo que tu clínica necesita,<br /><em style={{ fontStyle:'italic', color:T.cyanLt }}>en una sola plataforma</em>
          </h2>
          <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, color:'rgba(255,255,255,0.42)', lineHeight:1.65, maxWidth:460, margin:'0 auto' }}>
            Sin integraciones forzadas. Sin módulos extra. Sin sorpresas en la factura.
          </p>
        </FadeUp>

        {/* ── GLASS PILLS ─────────────────────────────────────────────────── */}
        <FadeUp>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', marginBottom:52 }}>
            {TABS.map((f,i) => {
              const Icon = f.icon
              const on = active === i
              return (
                <button key={f.id} onClick={() => pick(i)} style={{
                  position:'relative', overflow:'hidden',
                  fontFamily:'Plus Jakarta Sans', fontSize:13, fontWeight:600,
                  padding:'11px 22px', borderRadius:100, cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:7,
                  transition:'all 0.25s ease',
                  // GLASS — inactivo: vidrio neutro / activo: vidrio con tinte cyan
                  background: on ? 'rgba(34,211,238,0.11)' : 'rgba(255,255,255,0.05)',
                  backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
                  border: on ? '1.5px solid rgba(34,211,238,0.38)' : '1px solid rgba(255,255,255,0.11)',
                  color: on ? T.cyanLt : 'rgba(255,255,255,0.48)',
                  boxShadow: on ? '0 4px 22px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.10)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                  <Icon style={{ width:14, height:14 }} strokeWidth={1.8} />
                  <span style={{ position:'relative', zIndex:1 }}>{f.label}</span>
                  {/* Barra de progreso estilo vidrio iluminado */}
                  {auto && on && (
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(34,211,238,0.16), rgba(103,232,249,0.06))', transformOrigin:'left', transform:`scaleX(${progress/100})`, transition:'transform 50ms linear' }} />
                  )}
                </button>
              )
            })}
          </div>
        </FadeUp>

        {/* Grid: panel info + screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <FadeUp>
            <AnimatePresence mode="wait">
              <motion.div key={active+'i'} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }} transition={{ duration:0.3 }}
                style={{ ...glass({ borderRadius:18, padding:'36px', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.28)' }) }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${T.teal},${T.cyan})`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, boxShadow:'0 6px 20px rgba(13,148,136,0.32)' }}>
                  {(() => { const Icon=TABS[active].icon; return <Icon style={{ width:25,height:25,color:'#fff' }} strokeWidth={1.5}/> })()}
                </div>
                <h3 style={{ fontFamily:'Cormorant Garamond', fontSize:36, fontWeight:700, color:'#fff', letterSpacing:'-1px', lineHeight:1.1, margin:'0 0 16px' }}>{TABS[active].label}</h3>
                <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:15, color:'rgba(255,255,255,0.48)', lineHeight:1.72, margin:'0 0 30px' }}>{TABS[active].body}</p>
                <Link to="/registro" style={{ fontFamily:'Plus Jakarta Sans', fontSize:13, fontWeight:700, color:T.cyanLt, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, borderBottom:'1.5px solid rgba(34,211,238,0.28)', paddingBottom:3 }}>
                  Ver en acción <ArrowRight style={{ width:13,height:13 }}/>
                </Link>
              </motion.div>
            </AnimatePresence>
          </FadeUp>

          <div className="lg:col-span-2">
            <FadeUp delay={0.08}>
              <AnimatePresence mode="wait">
                <motion.div key={active+'s'} initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}>
                  <div style={{ borderRadius:16, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(34,211,238,0.07)' }}>
                    <BrowserChrome url={`app.bourgelat.co/${TABS[active].url}`} />
                    {/*
                      ── REEMPLAZA CON SCREENSHOT ──────────────────────────────
                      <img src={`/screenshots/${TABS[active].id}.png`}
                        alt={TABS[active].label}
                        style={{ width:'100%', display:'block' }} />
                      ─────────────────────────────────────────────────────────
                    */}
                    <Shot label={`Screenshot: ${TABS[active].label}`} file={`/screenshots/${TABS[active].id}.png`} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── GRADIENTE SEPARADOR ──────────────────────────────────────────────────────

const Grad = ({ from, to }) => (
  <div style={{ background:`linear-gradient(to bottom, ${from}, ${to})`, height:80, pointerEvents:'none' }} />
)

// ─── POR QUÉ ──────────────────────────────────────────────────────────────────

const Why = () => (
  <section id="por-que" style={{ background:T.cream, padding:'110px 28px', position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
    <div style={{ position:'absolute', bottom:0, left:'-8%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
    <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
      <FadeUp style={{ textAlign:'center', marginBottom:64 }}>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:11, fontWeight:700, color:T.teal, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 18px' }}>Por qué Bourgelat</p>
        <h2 style={{ fontFamily:'Cormorant Garamond', fontSize:'clamp(38px,5.5vw,64px)', fontWeight:700, color:T.text, lineHeight:1.06, letterSpacing:'-2px', margin:'0 0 18px' }}>
          Construido para la veterinaria<br /><em style={{ fontStyle:'italic', color:T.teal }}>latinoamericana</em>
        </h2>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, color:T.muted, lineHeight:1.65, maxWidth:540, margin:'0 auto' }}>
          Los grandes competidores cobran en dólares y no entienden cómo trabaja una clínica en Colombia. Nosotros sí.
        </p>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { icon:Globe,   title:'Todas las especies',       body:'Perros, gatos, aves, reptiles, conejos y fauna silvestre. Sin restricción por especie en ningún plan.' },
          { icon:Shield,  title:'Historias inmutables',     body:'Cada edición queda auditada. Historial compatible con inspecciones ICA y auditorías internas.' },
          { icon:Clock,   title:'< 3 min por consulta',     body:'Plantillas de anamnesis rápidas, autocompletado de diagnósticos y firma digital en segundos.' },
          { icon:Layers,  title:'Roles granulares',         body:'Veterinario, recepcionista, auxiliar y admin. Cada persona ve solo lo que necesita.' },
          { icon:Receipt, title:'Factura electrónica DIAN', body:'Integración directa. Emite facturas sin salir del sistema ni usar otro software.' },
          { icon:Bell,    title:'Sin límites de volumen',   body:'Pacientes, citas y usuarios sin tope. Pagas por funcionalidades, no por cuánto usas.' },
        ].map((item,i) => {
          const Icon = item.icon
          return (
            <FadeUp key={item.title} delay={i*0.07}>
              <motion.div whileHover={{ y:-5, boxShadow:'0 18px 50px rgba(13,148,136,0.09)' }}
                style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:16, padding:'30px 28px', transition:'all 0.25s' }}>
                <div style={{ width:48, height:48, borderRadius:13, background:`linear-gradient(135deg,${T.teal}18,${T.cyan}18)`, border:`1px solid ${T.teal}20`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:22 }}>
                  <Icon style={{ width:22,height:22,color:T.teal }} strokeWidth={1.5}/>
                </div>
                <h3 style={{ fontFamily:'Plus Jakarta Sans', fontSize:16, fontWeight:700, color:T.text, margin:'0 0 10px', letterSpacing:'-0.3px' }}>{item.title}</h3>
                <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:14, color:T.muted, lineHeight:1.72, margin:0 }}>{item.body}</p>
              </motion.div>
            </FadeUp>
          )
        })}
      </div>
    </div>
  </section>
)

// ─── CÓMO FUNCIONA ────────────────────────────────────────────────────────────

const How = () => (
  <section style={{ background:T.navyLt, padding:'110px 28px', position:'relative', overflow:'hidden' }}>
    <MeshBg />
    <div style={{ maxWidth:940, margin:'0 auto', position:'relative', zIndex:1 }}>
      <FadeUp style={{ textAlign:'center', marginBottom:72 }}>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:11, fontWeight:700, color:T.cyan, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 18px' }}>Comenzar</p>
        <h2 style={{ fontFamily:'Cormorant Garamond', fontSize:'clamp(38px,5.5vw,64px)', fontWeight:700, color:'#fff', lineHeight:1.06, letterSpacing:'-2px', margin:0 }}>
          Activo en 10 minutos,<br /><em style={{ fontStyle:'italic', color:T.cyanLt }}>sin instalaciones</em>
        </h2>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { n:'01', title:'Crea tu cuenta',      body:'Solo nombre, correo y contraseña. Sin tarjeta de crédito. Sin burocracia. Listo en 60 segundos.' },
          { n:'02', title:'Configura tu equipo', body:'Invita a tus veterinarios y recepcionistas. Cada rol tiene los permisos exactos que necesita.' },
          { n:'03', title:'Empieza a gestionar', body:'Agenda tu primera cita, crea el perfil de un paciente y ve el dashboard en tiempo real.' },
        ].map((s,i) => (
          <FadeUp key={s.n} delay={i*0.13}>
            <motion.div whileHover={{ y:-5 }}
              style={{ ...glass({ borderRadius:18, padding:'36px 28px', textAlign:'center', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 50px rgba(0,0,0,0.24)' }) }}>
              <div style={{ width:66, height:66, borderRadius:18, background:'rgba(34,211,238,0.09)', backdropFilter:'blur(12px)', border:'1px solid rgba(34,211,238,0.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
                <span style={{ fontFamily:'Cormorant Garamond', fontSize:32, fontWeight:700, color:T.cyanLt, lineHeight:1 }}>{s.n}</span>
              </div>
              <h3 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#fff', margin:'0 0 12px', letterSpacing:'-0.3px' }}>{s.title}</h3>
              <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:14, color:'rgba(255,255,255,0.44)', lineHeight:1.72, margin:0 }}>{s.body}</p>
            </motion.div>
          </FadeUp>
        ))}
      </div>
      <FadeUp delay={0.42} style={{ textAlign:'center', marginTop:60 }}>
        <Link to="/registro" style={{ fontFamily:'Plus Jakarta Sans', fontSize:15, fontWeight:700, color:T.navy, background:`linear-gradient(135deg,${T.cyan},${T.cyanLt})`, padding:'15px 36px', borderRadius:11, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8, boxShadow:'0 8px 30px rgba(34,211,238,0.24)' }}>
          Crear mi cuenta gratis <ArrowRight style={{ width:16,height:16 }}/>
        </Link>
      </FadeUp>
    </div>
  </section>
)

// ─── TESTIMONIOS ──────────────────────────────────────────────────────────────

const Testimonials = () => (
  <section style={{ background:T.cream, padding:'110px 28px', position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:'-8%', left:'50%', transform:'translateX(-50%)', width:700, height:450, borderRadius:'50%', background:'radial-gradient(circle, rgba(13,148,136,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
    <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
      <FadeUp style={{ textAlign:'center', marginBottom:64 }}>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:11, fontWeight:700, color:T.teal, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 18px' }}>Veterinarios reales</p>
        <h2 style={{ fontFamily:'Cormorant Garamond', fontSize:'clamp(38px,5.5vw,64px)', fontWeight:700, color:T.text, lineHeight:1.06, letterSpacing:'-2px', margin:0 }}>
          Lo que dicen quienes<br /><em style={{ fontStyle:'italic', color:T.teal }}>ya cambiaron</em>
        </h2>
      </FadeUp>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { quote:'"El registro de consultas pasó de 8 minutos a menos de 3. Ahora veo 4 pacientes más por día sin quedarme hasta las 8pm."',           name:'Dra. [Nombre Apellido]', clinic:'[Clínica Veterinaria]', city:'Bogotá' },
          { quote:'"Finalmente un software que no cobra en dólares y tiene soporte real en español. Las historias son lo que necesitábamos para la inspección ICA."', name:'Dr. [Nombre Apellido]',  clinic:'[Clínica Veterinaria]', city:'Medellín' },
          { quote:'"En 15 minutos teníamos todo el equipo funcionando. Sin contratar a nadie. El equipo de Bourgelat nos acompañó todo el tiempo."',      name:'[Nombre Apellido]',     clinic:'[Clínica Veterinaria]', city:'Cali' },
        ].map((t,i) => (
          <FadeUp key={i} delay={i*0.09}>
            <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:16, padding:'32px', display:'flex', flexDirection:'column', height:'100%', boxSizing:'border-box', boxShadow:'0 4px 20px rgba(13,148,136,0.04)' }}>
              <div style={{ display:'flex', gap:3, marginBottom:22 }}>
                {[...Array(5)].map((_,j) => <span key={j} style={{ color:T.amber, fontSize:15 }}>★</span>)}
              </div>
              <p style={{ fontFamily:'Cormorant Garamond', fontSize:21, fontStyle:'italic', color:T.text, lineHeight:1.58, margin:'0 0 32px', flex:1 }}>{t.quote}</p>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                {/*
                  ── FOTO REAL ────────────────────────────────────────────────
                  <img src="/fotos/testiN.jpg" style={{ width:46,height:46,borderRadius:'50%',objectFit:'cover' }} />
                  ─────────────────────────────────────────────────────────────
                */}
                <div style={{ width:46, height:46, borderRadius:'50%', background:`linear-gradient(135deg,${T.teal}18,${T.cyan}18)`, border:`1.5px dashed ${T.teal}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:'Plus Jakarta Sans', fontSize:9, color:T.teal }}>Foto</span>
                </div>
                <div>
                  <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:14, fontWeight:700, color:T.text, margin:0 }}>{t.name}</p>
                  <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:12, color:T.muted, margin:'3px 0 0' }}>{t.clinic} · {t.city}</p>
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
)

// ─── CTA FINAL ────────────────────────────────────────────────────────────────

const CTA = () => (
  <section id="contacto" style={{ background:T.navy, padding:'110px 28px', position:'relative', overflow:'hidden' }}>
    <MeshBg />
    <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(13,148,136,0.11) 0%, transparent 70%)', pointerEvents:'none' }} />
    <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center', position:'relative', zIndex:1 }}>
      <FadeUp>
        <div style={{ width:58, height:58, borderRadius:16, background:`linear-gradient(135deg,${T.teal},${T.cyan})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 36px', boxShadow:'0 8px 28px rgba(13,148,136,0.35)' }}>
          <Stethoscope style={{ width:28,height:28,color:'#fff' }} strokeWidth={1.5}/>
        </div>
        <h2 style={{ fontFamily:'Cormorant Garamond', fontSize:'clamp(44px,7.5vw,80px)', fontWeight:700, color:'#fff', lineHeight:1.02, letterSpacing:'-3px', margin:'0 0 22px' }}>
          Tu clínica merece<br /><em style={{ fontStyle:'italic', color:T.cyanLt }}>el mejor software.</em>
        </h2>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, color:'rgba(255,255,255,0.42)', lineHeight:1.65, maxWidth:460, margin:'0 auto 52px' }}>
          Sin tarjeta de crédito. Sin contratos anuales. Empieza gratis y activa solo lo que necesitas.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'center' }}>
          <Link to="/registro" style={{ fontFamily:'Plus Jakarta Sans', fontSize:16, fontWeight:700, color:T.navy, background:`linear-gradient(135deg,${T.cyan},${T.cyanLt})`, padding:'16px 36px', borderRadius:12, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8, boxShadow:'0 10px 36px rgba(34,211,238,0.27)' }}>
            Registrar mi clínica <ArrowRight style={{ width:17,height:17 }}/>
          </Link>
          <a href="mailto:hola@bourgelat.co" style={{ fontFamily:'Plus Jakarta Sans', fontSize:15, fontWeight:600, color:'rgba(255,255,255,0.58)', ...glass({ padding:'16px 30px', borderRadius:12 }), textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>
            Hablar con el equipo
          </a>
        </div>
      </FadeUp>
    </div>
  </section>
)

// ─── FOOTER ───────────────────────────────────────────────────────────────────

const Footer = () => (
  <footer style={{ background:'#030b14', padding:'60px 28px 32px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10" style={{ marginBottom:50 }}>
        <div>
          {/* ── LOGO — reemplaza con <img src="/logo.svg" style={{ height:30 }} /> ── */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${T.teal},${T.cyan})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Stethoscope style={{ width:15,height:15,color:'#fff' }} strokeWidth={1.5}/>
            </div>
            <span style={{ fontFamily:'Cormorant Garamond', fontSize:20, fontWeight:700, color:'#fff', letterSpacing:'-0.3px' }}>Bourgelat</span>
          </div>
          <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:13, color:'rgba(255,255,255,0.27)', lineHeight:1.72, margin:0 }}>
            Software de gestión clínica para veterinarios en Colombia. Historias, citas, inventario y facturación DIAN.
          </p>
        </div>
        {[
          { title:'Producto', links:[{ label:'Planes', to:'/planes' }, { label:'Nosotros', to:'/nosotros' }, { label:'Iniciar sesion', to:'/login' }, { label:'Registro', to:'/registro' }] },
          { title:'Empresa',  links:['Quiénes somos','Blog','Contacto','Trabaja con nosotros'] },
          { title:'Legal',    links:['Privacidad','Términos de uso','Política de cookies'] },
        ].map(col => (
          <div key={col.title}>
            <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.22)', letterSpacing:'0.10em', textTransform:'uppercase', margin:'0 0 18px' }}>{col.title}</p>
            {col.links.map(l => <p key={l} style={{ fontFamily:'Plus Jakarta Sans', fontSize:13, color:'rgba(255,255,255,0.38)', margin:'0 0 12px', cursor:'pointer' }}>{l}</p>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:24, display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:10 }}>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:12, color:'rgba(255,255,255,0.17)', margin:0 }}>© 2026 Bourgelat SAS · Bogotá, Colombia</p>
        <p style={{ fontFamily:'Plus Jakarta Sans', fontSize:12, color:'rgba(255,255,255,0.17)', margin:0 }}>hola@bourgelat.co</p>
      </div>
    </div>
  </footer>
)

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
    document.title = 'Bourgelat — Software veterinario para clínicas en Colombia'
  }, [])
  return (
    <div style={{ fontFamily:'Plus Jakarta Sans, sans-serif' }}>
      <Navbar />
      <Hero />
      <LogosBar />
      <Features />
      <Grad from={T.navyMid} to={T.cream} />
      <Why />
      <Grad from={T.cream} to={T.navyLt} />
      <How />
      <Grad from={T.navyLt} to={T.cream} />
      <Testimonials />
      <Grad from={T.cream} to={T.navy} />
      <CTA />
      <Footer />
    </div>
  )
} 
