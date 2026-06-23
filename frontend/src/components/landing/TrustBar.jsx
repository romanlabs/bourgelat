import { useVisible } from "./useVisible"
import { TRUST_LOGOS } from "./data"

function TrustLogo({ logo }) {
  return (
    <div className="flex min-w-[148px] flex-col items-center px-5 sm:min-w-[176px] sm:px-7">
      <div className="flex h-12 items-center justify-center">
        <img
          src={logo.src}
          alt={logo.alt}
          // El tinte cálido + relieve letterpress vive en .trust-logo-img. En móvil
          // ese relieve (drop-shadows) se veía sucio, así que el media query lo quita
          // y deja solo el tinte. .is-inverted antepone invert(1) para los logos que
          // lo necesitan.
          className={`trust-logo-img${logo.invert ? ' is-inverted' : ''}`}
          style={{
            height: logo.h,
            width: 'auto',
            maxWidth: 136,
            objectFit: 'contain',
            display: 'block',
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
  )
}

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
      className="relative -mt-px overflow-hidden pb-8 pt-0 text-[#2b2018] sm:py-9 lg:py-10"
    >
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-0 sm:gap-7 lg:grid-cols-[minmax(260px,0.54fr)_minmax(0,1.46fr)]">
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

          <div
            style={{
              opacity: visible ? 1 : 0,
              transition: visible ? 'opacity 900ms ease 350ms' : 'none',
            }}
          >
            {/* Móvil: marquee horizontal continuo. Con poco ancho, una fila estática
                obligaba a apilar en 2×2; el carrusel mantiene los respaldos en
                movimiento y mejor aprovechados. La pista duplica los logos para un
                bucle sin costuras. */}
            <div className="trust-marquee lg:hidden">
              <div className="trust-marquee__track">
                {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
                  <TrustLogo key={`${logo.alt}-${i}`} logo={logo} />
                ))}
              </div>
            </div>

            {/* Desktop: fila estática. Con solo cuatro respaldos quietos se leen
                mejor y dan más autoridad. */}
            <div className="hidden items-stretch lg:flex lg:flex-nowrap lg:justify-between">
              {TRUST_LOGOS.map((logo, i) => (
                <div key={logo.alt} className="flex items-stretch">
                  <TrustLogo logo={logo} />
                  {i < TRUST_LOGOS.length - 1 && (
                    <div className="flex items-center">
                      <div style={{ width: 1, height: 30, backgroundColor: 'rgba(43,32,24,0.12)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
