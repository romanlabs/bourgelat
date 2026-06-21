import { useEffect, useState } from "react"
import { motion as Motion } from "motion/react"
import { useVisible } from "./useVisible"
import { TRUST_LOGOS } from "./data"

export default function TrustBar() {
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
      className="relative -mt-px overflow-hidden py-8 text-[#2b2018] sm:py-9 lg:py-10"
    >
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-7 lg:grid-cols-[minmax(260px,0.54fr)_minmax(0,1.46fr)]">
          <div className="mx-auto max-w-[23rem] text-center lg:mx-0 lg:text-left">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b07645]"
              style={fadeIn(0)}
            >
              Confianza y cumplimiento
            </p>
            <h2
              className="mx-auto mt-2.5 max-w-[20rem] text-[1.45rem] leading-[1.05] tracking-[-0.03em] text-[#2b2018] sm:text-[1.65rem] lg:mx-0"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, ...fadeIn(100) }}
            >
              Operación segura para clínicas en Colombia.
            </h2>
            <p
              className="mt-3 text-[13px] leading-6 text-[#6b5d4d] sm:text-sm"
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
                          opacity: 0.9,
                          filter: `${logo.invert ? 'invert(1) ' : ''}grayscale(1) brightness(0) invert(1) sepia(1) hue-rotate(330deg) saturate(2.6) brightness(0.5)${logo.outline ? ' drop-shadow(0 0 2px rgba(43,32,24,0.18)) drop-shadow(0 0 2px rgba(43,32,24,0.18))' : ''}`,
                          ...(logo.rounded && { borderRadius: 3, boxShadow: '0 2px 8px rgba(43,32,24,0.10)' }),
                        }}
                      />
                    </div>
                    <span
                      className="mt-1.5 whitespace-nowrap"
                      style={{ fontSize: 11, fontWeight: 500, color: '#8a7a68' }}
                    >
                      {logo.caption}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div style={{ width: 1, height: 26, backgroundColor: 'rgba(43,32,24,0.13)', flexShrink: 0 }} />
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
