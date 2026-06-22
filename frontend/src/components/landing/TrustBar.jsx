import { useVisible } from "./useVisible"
import { TRUST_LOGOS } from "./data"

export default function TrustBar() {
  const { ref: sectionRef, visible } = useVisible(0.3)

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
              className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a35f25]"
              style={fadeIn(0)}
            >
              Confianza y cumplimiento
            </p>
            <h2
              className="mx-auto mt-2.5 max-w-[20rem] text-[1.45rem] leading-[1.08] tracking-[-0.03em] text-[#2b2018] sm:text-[1.65rem] lg:mx-0"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700, ...fadeIn(100) }}
            >
              Al día con la DIAN, sin pelear con la tecnología.
            </h2>
            <p
              className="mt-3 text-[13px] leading-6 text-[#6b5d4d] sm:text-sm"
              style={fadeIn(200)}
            >
              Factura electrónica habilitada, datos protegidos y una base alojada en Colombia.
            </p>
          </div>

          {/* Fila estática: con solo cuatro respaldos, un marquee parecería relleno
              y dificultaría reconocerlos. Quietos se leen y dan más autoridad. */}
          <div
            className="flex flex-wrap items-stretch justify-center gap-y-6 lg:flex-nowrap lg:justify-between"
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? 'opacity 900ms ease 350ms' : 'none',
            }}
          >
            {TRUST_LOGOS.map((logo, i) => (
              <div key={logo.alt} className="flex items-stretch">
                <div className="flex min-w-[148px] flex-col items-center px-5 sm:min-w-[176px] sm:px-7">
                  <div className="flex h-12 items-center justify-center">
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      style={{
                        height: logo.h,
                        width: 'auto',
                        maxWidth: 136,
                        objectFit: 'contain',
                        display: 'block',
                        // Tinte cálido y suave + relieve letterpress: un realce
                        // claro arriba-izquierda y una sombra oscura abajo-derecha
                        // hacen que el logo parezca grabado en relieve sobre el crema.
                        filter: `${logo.invert ? 'invert(1) ' : ''}grayscale(1) brightness(0) invert(1) sepia(1) hue-rotate(330deg) saturate(1.7) brightness(0.52) opacity(0.92) drop-shadow(-0.8px -0.8px 0.2px rgba(255,252,247,0.9)) drop-shadow(1px 1.3px 0.8px rgba(43,32,24,0.45))`,
                        ...(logo.rounded && { borderRadius: 3, boxShadow: '0 2px 8px rgba(43,32,24,0.10)' }),
                      }}
                    />
                  </div>
                  <span
                    className="mt-2 whitespace-nowrap"
                    style={{ fontSize: 11, fontWeight: 500, color: '#8a7a68' }}
                  >
                    {logo.caption}
                  </span>
                </div>
                {i < TRUST_LOGOS.length - 1 && (
                  <div className="hidden items-center lg:flex">
                    <div style={{ width: 1, height: 30, backgroundColor: 'rgba(43,32,24,0.12)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
