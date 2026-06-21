import { useVisible } from "./useVisible"
import DeviceMockup from "./DeviceMockup"
import { PLATFORM_FEATURES } from "./data"

export default function PlatformSection() {
  const { ref: sectionRef, visible } = useVisible(0.2)
  return (
    <section ref={sectionRef} className="relative text-[#2b2018]">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-20 lg:px-8 lg:pb-36 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">

          {/* Device mockup — left column */}
          <DeviceMockup />

          {/* Text column */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: visible ? 'opacity 800ms ease-out, transform 800ms ease-out' : 'none',
          }}>
            <p style={{
              display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.2em', color: '#b07645', margin: 0,
            }}>
              <span style={{ width: 24, height: 1, backgroundColor: '#c79a6f', flexShrink: 0 }} />
              Plataforma
            </p>

            <h2 style={{
              fontFamily: '"Spectral", Georgia, serif', fontWeight: 700,
              fontSize: 'clamp(2.4rem, 4vw, 3rem)', lineHeight: 0.95,
              letterSpacing: '-0.045em', color: '#2b2018',
              maxWidth: '24rem', marginTop: 20,
            }}>
              Toda la operación, en una sola vista.
            </h2>

            <p style={{
              fontSize: 15, lineHeight: 1.7, color: '#6b5d4d',
              maxWidth: '22rem', marginTop: 24,
            }}>
              Bourgelat conecta agenda, historia clínica, caja e inventario en módulos que se
              entienden entre sí. Sin copiar datos. Sin perder contexto.
            </p>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32, padding: 0, listStyle: 'none' }}>
              {PLATFORM_FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <li key={feature.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon style={{ width: 14, height: 14, color: '#b07645', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#4a3f33' }}>{feature.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
