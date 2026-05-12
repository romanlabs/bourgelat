import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'motion/react'
import { Link } from 'react-router-dom'
import medicaPerritoImage from '@/assets/landing/Medica-perrito.webp'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  HeartPulse,
  Mail,
  Menu,
  Package,
  Shield,
  Stethoscope,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Flujo', href: '#flujo' },
  { label: 'Planes', href: '#planes' },
  { label: 'Contacto', href: '#contacto' },
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

const TRUST_LOGOS = [
  { src: '/logos/dian.svg', alt: 'DIAN', h: 28, caption: 'Facturación electrónica' },
  { src: '/logos/cloudflare.svg', alt: 'Cloudflare', h: 28, caption: 'Protegido por Cloudflare' },
  { src: '/logos/colombia.svg', alt: 'Bandera de Colombia', h: 24, rounded: true, caption: 'Hecho en Colombia' },
]
// TODO: agregar Factus cuando la integración como partner esté cerrada y publicada

const WARM_BAND_BACKGROUND =
  'linear-gradient(180deg, #f8f4ee 0%, #f4eee6 44%, #f8f4ee 100%)'


function useVisible(threshold = 0.4) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

const ARRIVAL_ITEMS = [
  'Citas con contexto clínico',
  'Antecedentes visibles desde recepción',
  'Sin preguntar dos veces',
]

const CARE_ITEMS = [
  'Caja conectada al cierre del caso',
  'Stock que se descuenta automáticamente',
  'Seguimiento programado al tutor',
]

function CinematicCard({ visible, isMobile, alignRight = false, eyebrow, title, body, items }) {
  const desktopPos = alignRight ? { right: 0 } : { left: 0 }
  const entranceX = alignRight ? 30 : -30

  const cardStyle = isMobile
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        padding: '24px 0',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : `translateX(${entranceX}px)`,
        transition: visible ? 'opacity 1s ease-out 0.2s, transform 1s ease-out 0.2s' : 'none',
      }
    : {
        position: 'absolute',
        top: '50%',
        ...desktopPos,
        maxWidth: '32rem',
        padding: '40px 0',
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(-50%) translateX(0)'
          : `translateY(-50%) translateX(${entranceX}px)`,
        transition: visible
          ? 'opacity 1s ease-out 0.2s, transform 1s ease-out 0.2s'
          : 'none',
      }

  return (
    <div
      style={{
        ...cardStyle,
        background: 'transparent',
      }}
    >
      <p style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.2em', color: '#91e7e0', margin: 0,
      }}>
        <span style={{ width: 24, height: 1, backgroundColor: '#91e7e0', flexShrink: 0 }} />
        {eyebrow}
      </p>

      <h2 style={{
        fontFamily: '"Spectral", Georgia, serif',
        fontWeight: 700,
        fontSize: isMobile ? '1.6rem' : '2.2rem',
        lineHeight: 0.95,
        letterSpacing: '-0.04em',
        color: '#ffffff',
        margin: 0,
        marginTop: 16,
      }}>
        {title}
      </h2>

      <p style={{
        fontSize: 14, lineHeight: 1.6,
        color: 'rgba(255,255,255,0.75)', margin: 0, marginTop: 20,
      }}>
        {body}
      </p>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: 0, marginTop: 28, padding: 0, listStyle: 'none' }}>
        {items.map((item, idx) => (
          <li key={item} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : `translateX(${entranceX * 0.6}px)`,
            transition: visible
              ? `opacity 600ms ease-out ${400 + idx * 100}ms, transform 600ms ease-out ${400 + idx * 100}ms`
              : 'none',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '1.5px solid #91e7e0',
              background: 'rgba(145,231,224,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontFamily: '"Spectral", Georgia, serif',
              fontSize: 11, fontWeight: 600, color: '#91e7e0',
              lineHeight: 1, paddingTop: 1,
            }}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ArrivalSection() {
  const { ref: sectionRef, visible } = useVisible(0.15)
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: '#06111c' }}
    >
      <video
        src="/videos/landing-cinema/escena-2-llegada.mp4"
        muted autoPlay loop playsInline preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: visible ? 'scale(1.0)' : 'scale(1.05)',
          transition: 'transform 1.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(6,17,28,0.85) 0%, rgba(6,17,28,0.55) 45%, rgba(6,17,28,0.15) 75%, transparent 100%)',
      }} />
      <div style={{ position: 'absolute', inset: 0 }}>
        <div className="mx-auto h-full max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="relative h-full">
            <CinematicCard
              visible={visible}
              isMobile={isMobile}
              alignRight={false}
              eyebrow="El primer momento"
              title="Cuando el paciente llega, el equipo ya sabe."
              body="La recepción ve al paciente, el motivo y los antecedentes antes de que el tutor termine de parquear. Sin llamadas internas, sin notas sueltas."
              items={ARRIVAL_ITEMS}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function CareSection() {
  const { ref: sectionRef, visible } = useVisible(0.15)
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: '#06111c' }}
    >
      <video
        src="/videos/landing-cinema/escena-3-consulta.mp4"
        muted autoPlay loop playsInline preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: visible ? 'scale(1.0)' : 'scale(1.05)',
          transition: 'transform 1.4s cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to left, rgba(6,17,28,0.85) 0%, rgba(6,17,28,0.55) 45%, rgba(6,17,28,0.15) 75%, transparent 100%)',
      }} />
      <div style={{ position: 'absolute', inset: 0 }}>
        <div className="mx-auto h-full max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="relative h-full">
            <CinematicCard
              visible={visible}
              isMobile={isMobile}
              alignRight={true}
              eyebrow="Continuidad real"
              title="El cuidado no termina en la consulta."
              body="Bourgelat cierra el caso con caja, consumo de inventario y recordatorio de seguimiento para que el tutor sepa que el siguiente paso ya está programado."
              items={CARE_ITEMS}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const PLATFORM_FEATURES = [
  { icon: Calendar, label: 'Agenda con contexto del paciente' },
  { icon: HeartPulse, label: 'Historia que acompaña cada visita' },
  { icon: Package, label: 'Inventario que se descuenta solo' },
]

const AGENDA_SLOTS = [
  { time: '09:00', name: 'Luna', type: 'vacunación', bg: '#f0faf8', borderColor: '#91c4c0', useBorderLeft: true },
  { time: '10:30', name: 'Milo', type: 'revisión',   bg: '#ffffff', borderColor: '#e8f1f4', useBorderLeft: false },
  { time: '14:00', name: 'Kira', type: 'cirugía',    bg: '#fef3e8', borderColor: '#d4a574', useBorderLeft: true },
]

const BAR_SPECS = [
  { h: '60%' }, { h: '85%' }, { h: '45%' }, { h: '75%' }, { h: '55%' },
]

function PlatformSection() {
  const { ref: sectionRef, visible } = useVisible(0.2)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  const [hoveredCard, setHoveredCard] = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const entrance = (delay) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1) translateY(0px)' : 'scale(0.94) translateY(30px)',
    transition: visible
      ? `opacity 900ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, transform 900ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`
      : 'none',
  })

  const cardHover = (idx) => {
    if (hoveredCard === null) return {}
    return hoveredCard === idx
      ? { transform: 'scale(1.03)', boxShadow: '0 40px 100px rgba(83,62,41,0.20), 0 12px 32px rgba(83,62,41,0.12)', zIndex: 40 }
      : { opacity: 0.65 }
  }

  const CARD_TRANSITION = 'transform 350ms ease-out, box-shadow 350ms ease-out, opacity 350ms ease-out'

  return (
    <section ref={sectionRef} className="relative overflow-hidden text-[#10263a]">
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(var(--card-rotate, 0deg)); }
          50%       { transform: translateY(-5px) rotate(var(--card-rotate, 0deg)); }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">

          {/* ── Columna texto ── */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: visible ? 'opacity 800ms ease-out, transform 800ms ease-out' : 'none',
          }}>
            <p style={{
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.2em', color: '#3c7d8d', margin: 0,
            }}>
              <span style={{ width: 24, height: 1, backgroundColor: '#91c4c0', flexShrink: 0 }} />
              Plataforma
            </p>

            <h2 style={{
              fontFamily: '"Spectral", Georgia, serif', fontWeight: 700,
              fontSize: 'clamp(2.4rem, 4vw, 3rem)', lineHeight: 0.95,
              letterSpacing: '-0.045em', color: '#10263a',
              maxWidth: '24rem', marginTop: 20,
            }}>
              Toda la operación, en una sola vista.
            </h2>

            <p style={{
              fontSize: 15, lineHeight: 1.7, color: '#52697a',
              maxWidth: '22rem', marginTop: 24,
            }}>
              Bourgelat conecta agenda, historia clínica, caja e inventario en módulos que se
              entienden entre sí. Sin copiar datos. Sin perder contexto.
            </p>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32, padding: 0, listStyle: 'none' }}>
              {PLATFORM_FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon style={{ width: 14, height: 14, color: '#2c7d7a', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#24435c' }}>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Columna mockup ── */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CardPatient style={entrance(150)} />
              <CardAgenda style={entrance(280)} />
              <CardStock style={entrance(410)} />
              <CardFactura style={entrance(540)} />
            </div>
          ) : (
            <div style={{ position: 'relative', height: 580 }}>

              {/* Card 1 — Paciente · top-left · z30 */}
              <CardPatient
                style={{
                  position: 'absolute', top: '5%', left: '3%',
                  width: 300, zIndex: 30,
                  '--card-rotate': '0deg',
                  animation: 'floatCard 6s ease-in-out infinite',
                  animationDelay: '0s',
                  ...entrance(150),
                  ...cardHover(0),
                  transition: CARD_TRANSITION,
                }}
                onMouseEnter={() => setHoveredCard(0)}
                onMouseLeave={() => setHoveredCard(null)}
              />

              {/* Card 2 — Agenda · mid-right · z20 · tilt +2.5° */}
              <CardAgenda
                style={{
                  position: 'absolute', top: '28%', right: '5%',
                  width: 260, zIndex: 20,
                  '--card-rotate': '2.5deg',
                  animation: 'floatCard 7.5s ease-in-out infinite',
                  animationDelay: '1.5s',
                  boxShadow: '0 24px 60px rgba(83,62,41,0.10)',
                  ...entrance(280),
                  ...cardHover(1),
                  transition: CARD_TRANSITION,
                }}
                onMouseEnter={() => setHoveredCard(1)}
                onMouseLeave={() => setHoveredCard(null)}
              />

              {/* Card 3 — Stock · bottom-left · z25 · tilt -2.5° */}
              <CardStock
                style={{
                  position: 'absolute', bottom: '20%', left: '8%',
                  width: 240, zIndex: 25,
                  '--card-rotate': '-2.5deg',
                  animation: 'floatCard 6.8s ease-in-out infinite',
                  animationDelay: '3s',
                  boxShadow: '0 24px 60px rgba(83,62,41,0.10)',
                  ...entrance(410),
                  ...cardHover(2),
                  transition: CARD_TRANSITION,
                }}
                onMouseEnter={() => setHoveredCard(2)}
                onMouseLeave={() => setHoveredCard(null)}
              />

              {/* Card 4 — Factura · bottom-right · z35 */}
              <CardFactura
                style={{
                  position: 'absolute', bottom: '4%', right: '2%',
                  width: 220, zIndex: 35,
                  '--card-rotate': '0deg',
                  animation: 'floatCard 8s ease-in-out infinite',
                  animationDelay: '4.5s',
                  ...entrance(540),
                  ...cardHover(3),
                  transition: CARD_TRANSITION,
                }}
                onMouseEnter={() => setHoveredCard(3)}
                onMouseLeave={() => setHoveredCard(null)}
              />

            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function CardPatient({ style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: '#ffffff', borderRadius: 20, padding: 20,
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 30px 80px rgba(83,62,41,0.12), 0 8px 24px rgba(83,62,41,0.06)',
        willChange: 'transform',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8fe0da, #b8eff0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 16, fontWeight: 600, color: '#082033',
        }}>
          M
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#10263a', margin: 0 }}>Milo García</p>
          <p style={{ fontSize: 11, color: '#7a8da0', margin: 0, marginTop: 2 }}>Golden Retriever · 4 años</p>
        </div>
      </div>
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { Icon: Clock,    iconColor: '#3c7d8d', text: 'Última visita: hace 2 meses' },
          { Icon: Shield,   iconColor: '#2c7d7a', text: 'Vacunas: al día' },
          { Icon: Calendar, iconColor: '#3c7d8d', text: 'Próxima cita: mañana 10am' },
        ].map(({ Icon, iconColor, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon style={{ width: 12, height: 12, color: iconColor, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#52697a' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardAgenda({ style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: '#ffffff', borderRadius: 18, padding: 18,
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 30px 80px rgba(83,62,41,0.12), 0 8px 24px rgba(83,62,41,0.06)',
        willChange: 'transform',
        ...style,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#3c7d8d', margin: '0 0 12px' }}>
        Agenda · Hoy
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AGENDA_SLOTS.map((s) => (
          <div key={s.time} style={{
            background: s.bg,
            ...(s.useBorderLeft
              ? { borderLeft: `3px solid ${s.borderColor}`, borderRadius: '0 8px 8px 0', padding: '8px 12px' }
              : { border: `1px solid ${s.borderColor}`, borderRadius: 8, padding: '8px 12px' }),
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3c7d8d' }}>{s.time}</span>
            <span style={{ fontSize: 12, color: '#10263a' }}>{s.name} · {s.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardStock({ style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: '#ffffff', borderRadius: 18, padding: 18,
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 30px 80px rgba(83,62,41,0.12), 0 8px 24px rgba(83,62,41,0.06)',
        willChange: 'transform',
        ...style,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#3c7d8d', margin: '0 0 12px' }}>
        Inventario
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48 }}>
        {BAR_SPECS.map((bar, i) => (
          <div key={i} style={{
            width: 12, height: bar.h, borderRadius: '3px 3px 0 0',
            background: 'linear-gradient(to top, #6bc4be, #91e7e0)',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#52697a', margin: '12px 0 8px' }}>
        23 productos por reordenar
      </p>
      <span style={{
        display: 'inline-block',
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: '#2c7d7a', background: 'rgba(145,231,224,0.15)',
        border: '1px solid rgba(145,231,224,0.30)',
        padding: '3px 8px', borderRadius: 999,
      }}>
        Automático
      </span>
    </div>
  )
}

function CardFactura({ style = {}, onMouseEnter, onMouseLeave }) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #06111c 0%, #0d2435 100%)',
        borderRadius: 20, padding: 20,
        boxShadow: '0 30px 80px rgba(6,17,28,0.30), 0 0 0 1px rgba(145,231,224,0.10)',
        willChange: 'transform',
        ...style,
      }}
    >
      <CheckCircle style={{
        position: 'absolute', top: 16, right: 16,
        width: 16, height: 16, color: '#91e7e0',
      }} />
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#91e7e0', margin: '0 0 8px' }}>
        Factura generada
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: '"Spectral", Georgia, serif', fontWeight: 700,
          fontSize: 22, lineHeight: 1, color: '#ffffff',
        }}>
          $ 145.000
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>COP</span>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
        Enviada al tutor · 2 min
      </p>
    </div>
  )
}

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${
          dark
            ? 'bg-white/10 text-white'
            : 'bg-[linear-gradient(135deg,#8fe0da,#b8eff0)] text-[#082033]'
        }`}
        style={dark
          ? { boxShadow: '0 18px 40px rgba(92,206,198,0.2), 0 0 24px rgba(145,231,224,0.15)' }
          : { boxShadow: '0 18px 40px rgba(92,206,198,0.2)' }
        }
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
        style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
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
        className={`mx-auto flex items-center justify-between px-4 transition-all duration-500 sm:px-6 lg:px-8 ${
          compact
            ? isLight
              ? 'max-w-[1200px] rounded-[28px] border border-transparent bg-[rgba(248,251,252,0.9)] py-3 shadow-[0_24px_70px_rgba(11,34,50,0.12)] backdrop-blur-xl'
              : 'max-w-[1200px] rounded-[28px] py-3'
            : 'max-w-[1400px] rounded-none border border-transparent bg-transparent py-5'
        }`}
        style={compact && !isLight ? {
          background: 'rgba(6,17,28,0.55)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(2,8,14,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        } : undefined}
      >
        <Link to="/" className="no-underline">
          <BrandMark dark={!isLight} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold no-underline transition-[background-color,color] duration-[250ms] ease-out ${
                isLight
                  ? 'text-[#173048] hover:bg-[#e8f1f4] hover:text-[#0d2435]'
                  : 'text-[rgba(255,255,255,0.85)] hover:bg-[rgba(145,231,224,0.08)] hover:text-[#c4f3ed]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className={`rounded-full border px-4 py-2 text-sm font-semibold no-underline transition-[background-color,border-color,color] duration-[300ms] ease-out ${
              isLight
                ? 'border-[#b9ccd8] bg-white/70 text-[#10263a] hover:border-[#9cb5c6] hover:bg-white'
                : 'hover:text-[#91e7e0]'
            }`}
            style={isLight ? undefined : {
              color: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onMouseEnter={isLight ? undefined : (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              e.currentTarget.style.borderColor = 'rgba(145,231,224,0.35)'
            }}
            onMouseLeave={isLight ? undefined : (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            Iniciar sesion
          </Link>
          <Link
            to="/registro"
            className="group inline-flex items-center gap-2 rounded-full border border-[#dff0ee] px-6 py-3 text-sm font-semibold text-[#0d2435] no-underline transition-[box-shadow,transform] duration-[300ms] ease-out hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, #effaf8, #ffffff)',
              boxShadow: '0 12px 32px rgba(143,224,218,0.20), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 18px 44px rgba(143,224,218,0.30), 0 4px 12px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(143,224,218,0.20), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
            }}
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4 transition-transform duration-[250ms] ease-out group-hover:translate-x-[3px]" />
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

function FlowStepper() {
  const [active, setActive] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % FLOW_STEPS.length)
      setTick((prev) => prev + 1)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const handleSelect = (index) => {
    setActive(index)
    setTick((prev) => prev + 1)
  }

  return (
    <div className="mt-10 space-y-2">
      {FLOW_STEPS.map((step, index) => {
        const isActive = active === index
        return (
          <button
            key={step.step}
            type="button"
            onClick={() => handleSelect(index)}
            className={`w-full rounded-[28px] border px-6 py-5 text-left transition-all duration-300 ${
              isActive
                ? 'border-[#c8dde9] bg-white shadow-[0_18px_60px_rgba(8,25,39,0.07)]'
                : 'border-transparent bg-transparent hover:bg-white/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors duration-300 ${
                  isActive ? 'bg-[#edf5fb] text-[#3a6d87]' : 'bg-[#e4ecf2] text-[#7a9db5]'
                }`}
              >
                {step.step}
              </span>
              <span
                className={`text-base font-semibold transition-colors duration-300 ${
                  isActive ? 'text-[#12283c]' : 'text-[#7a9db5]'
                }`}
              >
                {step.title}
              </span>
            </div>

            <AnimatePresence>
              {isActive && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="mt-4 pl-14 text-sm leading-7 text-[#567185]">{step.body}</p>
                  <div className="mt-4 pl-14">
                    <div className="h-px w-full overflow-hidden rounded-full bg-[#d7e4ee]">
                      <Motion.div
                        key={tick}
                        className="h-full origin-left bg-[#3a6d87]"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 4, ease: 'linear' }}
                      />
                    </div>
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </button>
        )
      })}
    </div>
  )
}


function TrustBar() {
  const doubled = [...TRUST_LOGOS, ...TRUST_LOGOS]
  const { ref: sectionRef, visible } = useVisible(0.3)
  const [carouselDuration, setCarouselDuration] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 18 : 32
  ))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setCarouselDuration(e.matches ? 18 : 32)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const fadeIn = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0px)' : 'translateY(20px)',
    transition: visible
      ? `opacity 800ms ease ${delay}ms, transform 800ms ease ${delay}ms`
      : 'none',
  })

  return (
    <section
      ref={sectionRef}
      className="relative -mt-px overflow-hidden py-8 text-[#10263a] sm:py-9 lg:py-10"
    >
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-7 lg:grid-cols-[minmax(260px,0.54fr)_minmax(0,1.46fr)]">
          <div className="mx-auto max-w-[23rem] text-center lg:mx-0 lg:text-left">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3c7d8d]"
              style={fadeIn(0)}
            >
              Confianza y cumplimiento
            </p>
            <h2
              className="mx-auto mt-2.5 max-w-[20rem] text-[1.45rem] leading-[1.05] tracking-[-0.03em] text-[#10263a] sm:text-[1.65rem] lg:mx-0"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, ...fadeIn(100) }}
            >
              Operación segura para clínicas en Colombia.
            </h2>
            <p
              className="mt-3 text-[13px] leading-6 text-[#52697a] sm:text-sm"
              style={fadeIn(200)}
            >
              Facturación electrónica, protección de red y una base local para operar con más calma.
            </p>
          </div>

          <div
            className="relative overflow-hidden"
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? 'opacity 900ms ease 350ms' : 'none',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%)',
              maskImage:
                'linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%)',
            }}
          >
            <Motion.div
              className="flex items-center"
              style={{ gap: 0 }}
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: carouselDuration, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
              aria-hidden="true"
            >
              {doubled.map((logo, i) => (
                <div key={i} className="flex shrink-0 items-stretch">
                  <div className="flex min-w-[168px] flex-col items-center px-5 sm:min-w-[210px] sm:px-8">
                    <div className="flex h-9 items-center justify-center sm:h-10">
                      <img
                        src={logo.src}
                        alt={logo.alt}
                        style={{
                          height: logo.h,
                          width: 'auto',
                          maxWidth: 136,
                          objectFit: 'contain',
                          display: 'block',
                          opacity: 0.86,
                          filter: 'saturate(0.9) contrast(0.96)',
                          ...(logo.rounded && { borderRadius: 3, boxShadow: '0 2px 8px rgba(16,38,58,0.10)' }),
                        }}
                      />
                    </div>
                    <span
                      className="mt-1.5 whitespace-nowrap"
                      style={{ fontSize: 11, fontWeight: 500, color: '#5d7180' }}
                    >
                      {logo.caption}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div style={{ width: 1, height: 26, backgroundColor: 'rgba(16,38,58,0.13)', flexShrink: 0 }} />
                  </div>
                </div>
              ))}
            </Motion.div>

            <ul className="sr-only">
              {TRUST_LOGOS.map((logo) => <li key={logo.alt}>{logo.alt} — {logo.caption}</li>)}
            </ul>
          </div>

        </div>
      </div>
    </section>
  )
}

function DailyFlowVisual() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[#10263a] shadow-[0_30px_90px_rgba(8,25,39,0.16)] sm:rounded-[36px]">
      <img
        src={medicaPerritoImage}
        alt="Medica veterinaria abrazando a un paciente canino en consulta"
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,15,25,0.78),rgba(4,15,25,0.22)_56%,rgba(4,15,25,0.04))]" />
    </div>
  )
}

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Bourgelat | Software para clinicas veterinarias'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-[#112739]">
      <LandingNav />

      <section className="relative flex h-[100dvh] flex-col justify-end overflow-hidden bg-[#06111c] text-white">
        <video
          src="/videos/landing-cinema/escena-1-perro.mp4"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 z-0 h-full w-full object-cover object-[42%_center] sm:object-[48%_center] lg:object-center"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(to top right, rgba(6,17,28,0.5), rgba(6,17,28,0.08) 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[30dvh] sm:h-[34dvh] lg:h-[38dvh]"
          style={{
            background:
              'linear-gradient(180deg, rgba(248,244,238,0) 0%, rgba(248,244,238,0) 42%, rgba(248,244,238,0.06) 58%, rgba(248,244,238,0.24) 74%, rgba(248,244,238,0.68) 91%, #f8f4ee 100%)',
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-32 lg:px-8 lg:pb-12 lg:pt-36">
          <div className="max-w-[34rem]">
            <h1
              className="mt-2 max-w-[22rem] text-[2.15rem] leading-[0.94] tracking-[-0.06em] sm:max-w-[32rem] sm:text-[2.9rem] lg:max-w-[34rem] lg:text-[3.25rem] xl:text-[3.45rem]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Tu clinica veterinaria merece una operacion a la altura de su medicina.
            </h1>

            <p className="mt-5 max-w-[31rem] text-[15px] leading-7 text-white/76 sm:mt-6 sm:text-base sm:leading-8">
              Bourgelat integra agenda, historia clinica, caja, inventario y seguimiento en un
              solo sistema para reducir reprocesos, ordenar al equipo y ofrecer una experiencia
              mas profesional a cada tutor.
            </p>
          </div>
        </div>
      </section>

      <div
        className="relative overflow-hidden"
        style={{
          background: WARM_BAND_BACKGROUND,
          boxShadow: 'inset 0 -1px 0 rgba(9,31,48,0.04)',
        }}
      >
        <TrustBar />
        <PlatformSection />
      </div>

      <ArrivalSection />

      <section id="flujo" className="bg-[#edf4f8]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:grid lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-24">
          <div>
            <SectionHeading
              eyebrow="Flujo diario"
              title="De la llamada al seguimiento, el dia avanza sin perder el caso."
              body="La clinica deja de pasar informacion de mano en mano. Bourgelat conserva el contexto y convierte cada paso en una senal para el siguiente."
            />

            <FlowStepper />
          </div>

          <div className="mt-12 lg:mt-0">
            <DailyFlowVisual />
          </div>
        </div>
      </section>

      <CareSection />

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
                  style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
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
                style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
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
