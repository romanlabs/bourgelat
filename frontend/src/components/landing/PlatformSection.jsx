import { useState } from "react"
import { useVisible } from "./useVisible"
import DeviceMockup from "./DeviceMockup"
import { PLATFORM_FEATURES } from "./data"

export default function PlatformSection() {
  const { ref: sectionRef, visible } = useVisible(0.2)
  const [active, setActive] = useState(0)
  const screens = PLATFORM_FEATURES.map((f) => f.screen)
  return (
    <section id="plataforma" ref={sectionRef} className="relative scroll-mt-40 overflow-x-clip text-[#2b2018]">
      <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">

          {/* Device mockup — left column. La pantalla cambia según el módulo activo. */}
          <DeviceMockup screens={screens} active={active} />

          {/* Text column */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: visible ? 'opacity 800ms ease-out, transform 800ms ease-out' : 'none',
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.3em', color: '#a35f25', margin: 0,
            }}>
              Plataforma
            </p>

            <h2 style={{
              fontFamily: '"Spectral", Georgia, serif', fontWeight: 700,
              fontSize: 'clamp(2.4rem, 4vw, 3rem)', lineHeight: 0.95,
              letterSpacing: '-0.045em', color: '#2b2018',
              maxWidth: '24rem', marginTop: 20,
            }}>
              Toda la clínica, en una sola vista.
            </h2>

            <p style={{
              fontSize: 15, lineHeight: 1.7, color: '#6b5d4d',
              maxWidth: '22rem', marginTop: 24,
            }}>
              Bourgelat conecta agenda, historia clínica, caja e inventario en módulos que se
              entienden entre sí. Sin copiar datos. Sin perder contexto.
            </p>

            <div className="plat-tabs" role="tablist" aria-label="Módulos de la plataforma">
              {PLATFORM_FEATURES.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <button
                    type="button"
                    key={feature.label}
                    role="tab"
                    aria-selected={i === active}
                    onClick={() => setActive(i)}
                    className={`plat-tab${visible ? ' is-visible' : ''}${i === active ? ' is-active' : ''}`}
                    style={{ transitionDelay: visible ? `${250 + i * 110}ms` : '0ms' }}
                  >
                    <Icon className="plat-tab__icon" style={{ width: 18, height: 18 }} strokeWidth={1.75} />
                    <span className="plat-tab__label">{feature.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
