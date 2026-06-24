import { useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Mail, MapPin } from "lucide-react"

import LandingNav from "@/components/landing/LandingNav"
import TrustBar from "@/components/landing/TrustBar"
import PlatformSection from "@/components/landing/PlatformSection"
import FlowCarousel from "@/components/landing/FlowCarousel"
import FlowDog from "@/components/landing/FlowDog"
import FlowDogMedic from "@/components/landing/FlowDogMedic"
import SectionHeading from "@/components/landing/SectionHeading"
import BrandMark from "@/components/landing/BrandMark"
import FooterPulse from "@/components/landing/FooterPulse"
import WhatsAppFab from "@/components/landing/WhatsAppFab"
import { PLAN_PREVIEW, footerLinks, WARM_BAND_BACKGROUND } from "@/components/landing/data"

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Bourgelat | Software para clínicas veterinarias'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f4ee] text-[#2b2018]">
      <LandingNav />

      <section
        id="hero"
        className="hero-bg relative flex h-[100dvh] flex-col justify-start overflow-hidden text-[#2b2018] sm:justify-center"
      >
        {/* ── Video hero: perro completo, contenido y anclado abajo a la derecha.
            object-contain (no cover) muestra al perro entero; su fondo beige funde
            con el degradado cálido del hero. ── */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/videos/perroHero-poster.webp"
          preload="auto"
          className="hero-video absolute inset-x-0 bottom-0 top-auto h-[48dvh] w-full object-contain object-bottom sm:inset-0 sm:top-0 sm:h-full sm:object-[right_bottom]"
          style={{ transform: 'translateZ(0)' }}
        >
          {/* H.264 primero: se decodifica por hardware en casi todos los equipos,
              evitando el thermal throttling del VP9 por software que entrecortaba
              el video tras un rato. WebM queda como fallback. */}
          <source src="/videos/perroHero.mp4"  type="video/mp4"  />
          <source src="/videos/perroHero.webm" type="video/webm" />
        </video>

        {/* Lavado cálido a la izquierda: levanta la legibilidad del texto oscuro
            sobre el beige sin tapar al perro de la derecha. */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: 'linear-gradient(100deg, rgba(249,236,216,0.95) 0%, rgba(249,236,216,0.72) 32%, rgba(249,236,216,0.18) 56%, rgba(249,236,216,0) 70%)' }}
        />

        {/* Funde el final del hero con la banda cálida siguiente (#f8f4ee).
            Degradado con easing (no lineal) para un empalme sin banding visible. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[12dvh] sm:h-[28dvh]"
          style={{
            background:
              'linear-gradient(180deg, rgba(248,244,238,0) 0%, rgba(248,244,238,0.08) 28%, rgba(248,244,238,0.28) 50%, rgba(248,244,238,0.58) 68%, rgba(248,244,238,0.85) 84%, #f8f4ee 100%)',
          }}
        />

        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-5 pt-40 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
          <div className="max-w-[36rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a35f25]">
              Software para clínicas veterinarias
            </p>

            {/* Firma: línea de signo vital. El barrido recorre el trazo como el
                monitor de un paciente — guiño al ECGHeartbeatCanvas de la marca. */}
            <div className="hero-ecg mt-4" aria-hidden="true">
              <svg viewBox="0 0 320 24" preserveAspectRatio="xMinYMid meet">
                <path className="hero-ecg__base" d="M0 12 H94 l6 0 l5 -7 l4 15 l5 -19 l5 23 l5 -12 l4 0 H320" />
                <path className="hero-ecg__pulse" d="M0 12 H94 l6 0 l5 -7 l4 15 l5 -19 l5 23 l5 -12 l4 0 H320" />
              </svg>
            </div>

            <h1
              className="mt-6 max-w-[22rem] text-[2.25rem] leading-[0.96] tracking-[-0.045em] text-[#2b2018] sm:max-w-[32rem] sm:text-[3rem] lg:max-w-[34rem] lg:text-[3.35rem] xl:text-[3.6rem]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Tu clínica merece una operación
              <span style={{ fontStyle: 'italic', fontWeight: 600, color: '#a8662e' }}> a la altura de su medicina.</span>
            </h1>

            <p className="mt-6 max-w-[30rem] text-[15px] leading-7 text-[#6a5038] sm:text-[16.5px] sm:leading-8">
              Agenda, historia clínica, caja e inventario en un solo lugar. Menos reprocesos,
              un equipo coordinado y una experiencia más profesional para cada tutor.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/registro"
                className="group pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2b2018] px-7 py-3.5 text-sm font-semibold text-[#fdf6ee] no-underline shadow-[0_4px_12px_rgba(43,32,24,0.12)] transition-colors hover:bg-[#b07645] sm:w-auto"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
              </Link>
              <Link
                to="/planes"
                className="pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#2b2018]/25 bg-transparent px-7 py-3.5 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645] sm:w-auto"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div
        className="relative -mt-px overflow-x-clip"
        style={{
          background: WARM_BAND_BACKGROUND,
        }}
      >
        <TrustBar />
        <PlatformSection />
      </div>

      <div className="relative -mt-px">
      <FlowDog />
      <FlowDogMedic />
      <section id="flujo" className="relative -mt-px scroll-mt-40 bg-[#f8f4ee] text-[#2b2018] overflow-x-clip">
        <div className="relative z-[1] mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
          <SectionHeading
            eyebrow="Flujo diario"
            title="De la llamada al seguimiento, el día avanza sin perder el caso."
            body="La clínica deja de pasar información de mano en mano. Bourgelat conserva el contexto y convierte cada paso en una señal para el siguiente."
            center
            compact
          />

          <FlowCarousel />
        </div>
      </section>
      </div>

      <section id="planes" className="-mt-px scroll-mt-40 bg-[#f8f4ee] text-[#2b2018]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Planes"
            title="Planes para entrar sin miedo y crecer sin rearmar todo."
            body="Empieza con el orden clínico y suma caja, inventario, reportes y facturación electrónica cuando tu clínica lo pida."
            center
          />

          <div className="plans-grid mt-10 grid gap-4 sm:mt-12 sm:gap-6 lg:grid-cols-4">
            {PLAN_PREVIEW.map((plan) => (
              <article
                key={plan.name}
                className={`plan-card relative rounded-2xl border bg-white p-5 sm:p-6 ${
                  plan.featured
                    ? 'border-[#b07645] shadow-[0_24px_60px_rgba(43,32,24,0.12)]'
                    : 'border-[#2b2018]/10 shadow-[0_12px_30px_rgba(43,32,24,0.06)]'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 right-5 rounded-full bg-[#b07645] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    Más elegido
                  </span>
                )}
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    plan.featured ? 'text-[#b07645]' : 'text-[#2b2018]/55'
                  }`}
                >
                  {plan.subtitle}
                </p>
                {/* Móvil: nombre y precio en una sola línea para tarjetas más
                    compactas y escaneables. Desktop: apilados como antes. */}
                <div className="mt-3 flex items-baseline justify-between gap-3 sm:mt-4 sm:block">
                  <h3
                    className="text-[1.7rem] leading-none tracking-[-0.04em] sm:text-4xl"
                    style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                  >
                    {plan.name}
                  </h3>
                  <p className="shrink-0 text-base font-semibold text-[#2b2018] sm:mt-4 sm:text-lg">
                    {plan.price}
                  </p>
                </div>
                <p
                  className={`mt-3 text-sm leading-6 sm:mt-4 sm:leading-7 ${
                    plan.featured ? 'text-[#2b2018]/80' : 'text-[#2b2018]/65'
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
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2b2018] px-6 py-3.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#b07645] sm:w-auto"
            >
              Ver comparativa completa
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
            </Link>
            <Link
              to="/registro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgba(43,32,24,0.25)] px-6 py-3.5 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645] sm:w-auto"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <section id="contacto" className="-mt-px scroll-mt-40 bg-[#f8f4ee] px-5 pb-16 pt-2 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#2b2018] px-6 py-12 shadow-[0_40px_120px_rgba(43,32,24,0.28)] sm:px-10 sm:py-14 lg:px-16 lg:py-20">
          {/* Glow ámbar cálido detrás del perro */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[-8%] top-1/2 h-[130%] w-[60%] -translate-y-1/2"
            style={{
              background:
                'radial-gradient(ellipse at 62% 50%, rgba(233,192,137,0.22) 0%, rgba(176,118,69,0.10) 38%, transparent 70%)',
            }}
          />

          <div className="relative z-[1] max-w-xl lg:max-w-2xl">
            {/* Texto + CTAs */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d9a06b]">
              Da el primer paso
            </p>
            <h2
              className="mt-4 text-[2.6rem] leading-[0.96] tracking-[-0.045em] text-[#fdf6ee] sm:text-5xl md:text-[3.4rem]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Prueba Bourgelat hoy.{' '}
              <span className="italic text-[#e9c089]">Mañana tu clínica respira distinto.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#fdf6ee]/70">
              Cuéntanos cómo trabajan hoy —agenda, historias, inventario, caja y DIAN— y vemos
              juntos por dónde empezar. Sin compromiso y a tu ritmo.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/registro"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#fdf6ee] px-7 py-3.5 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:bg-[#b07645] hover:text-white sm:w-auto"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
              </Link>
              <a
                href="mailto:hola@bourgelat.co"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#fdf6ee]/25 px-7 py-3.5 text-sm font-semibold text-[#fdf6ee] no-underline transition-colors hover:border-[#e9c089] hover:text-[#e9c089] sm:w-auto"
              >
                <Mail className="h-4 w-4" />
                hola@bourgelat.co
              </a>
            </div>
          </div>

          {/* Perro despidiéndose — firma del cierre, asomado en la esquina */}
          <img
            src="/images/perro-despedida.webp"
            alt="El perro de Bourgelat saluda con la pata"
            loading="lazy"
            className="contact-dog pointer-events-none absolute bottom-0 right-0 hidden w-[380px] md:block lg:right-4 lg:w-[540px] xl:w-[620px]"
          />
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#1c140d] text-[#fdf6ee]">
        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-12 sm:px-6 lg:px-8">
          <FooterPulse />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Marca */}
            <div className="max-w-sm">
              <BrandMark dark />
              <p className="mt-5 text-sm leading-7 text-[#fdf6ee]/70">
                Software para clínicas veterinarias que quieren llevar el día con más orden, más
                calma y más confianza, de la recepción al cierre.
              </p>
              <a
                href="mailto:hola@bourgelat.co"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#fdf6ee] no-underline transition-colors hover:text-[#e9c089]"
              >
                <Mail className="h-4 w-4" />
                hola@bourgelat.co
              </a>
              <p className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#fdf6ee]/55">
                <MapPin className="h-3.5 w-3.5 text-[#e9c089]" />
                Hecho en Colombia
              </p>
            </div>

            {/* Columnas de enlaces: 2 col en móvil, 3 en sm, y se integran a la
                grilla de 4 columnas en desktop con lg:contents */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:contents">
            {/* Producto */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e9c089]">
                Producto
              </p>
              <ul className="mt-5 space-y-3.5">
                {[
                  { label: 'Plataforma', href: '#plataforma' },
                  { label: 'Flujo diario', href: '#flujo' },
                  { label: 'Planes', to: '/planes' },
                  { label: 'Empezar', href: '#contacto' },
                ].map((item) => (
                  <li key={item.label}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e9c089]">
                Empresa
              </p>
              <ul className="mt-5 space-y-3.5">
                <li>
                  <Link to="/nosotros" className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white">
                    Nosotros
                  </Link>
                </li>
                <li>
                  <Link to="/planes" className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white">
                    Comparar planes
                  </Link>
                </li>
                <li>
                  <Link to="/registro" className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white">
                    Crear cuenta
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e9c089]">
                Legal
              </p>
              <ul className="mt-5 space-y-3.5">
                {footerLinks
                  .filter((l) => ['Privacidad', 'Terminos', 'Cookies'].includes(l.label))
                  .map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-[#fdf6ee]/65 no-underline transition-colors hover:text-white"
                      >
                        {link.label === 'Terminos' ? 'Términos' : link.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            </div>
          </div>

          {/* Redes sociales — encima de la línea divisoria */}
          <div className="mt-12 flex items-center justify-center gap-3 sm:justify-end">
            <a
              href="https://instagram.com/bourgelat.co"
              target="_blank"
              rel="noreferrer"
              aria-label="Bourgelat en Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#fdf6ee]/20 bg-white/5 text-[#fdf6ee] transition-colors hover:border-white hover:bg-[#fdf6ee] hover:text-[#1c140d]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://tiktok.com/@bourgelat"
              target="_blank"
              rel="noreferrer"
              aria-label="Bourgelat en TikTok"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#fdf6ee]/20 bg-white/5 text-[#fdf6ee] transition-colors hover:border-white hover:bg-[#fdf6ee] hover:text-[#1c140d]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>

          <div className="mt-6 border-t border-[#fdf6ee]/12 pt-7 text-xs text-[#fdf6ee]/60">
            <p>© {new Date().getFullYear()} Bourgelat. Todos los derechos reservados.</p>
            <p className="mt-1 text-[#fdf6ee]/40">bourgelat.co · app.bourgelat.co</p>
          </div>
        </div>
      </footer>

      <WhatsAppFab />
    </div>
  )
}
