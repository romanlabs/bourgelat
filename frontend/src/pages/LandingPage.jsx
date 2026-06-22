import { useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Mail } from "lucide-react"

import LandingNav from "@/components/landing/LandingNav"
import TrustBar from "@/components/landing/TrustBar"
import PlatformSection from "@/components/landing/PlatformSection"
import FlowCarousel from "@/components/landing/FlowCarousel"
import SectionHeading from "@/components/landing/SectionHeading"
import BrandMark from "@/components/landing/BrandMark"
import DogTug from "@/components/landing/DogTug"
import { PLAN_PREVIEW, footerLinks, WARM_BAND_BACKGROUND } from "@/components/landing/data"

export default function LandingPage() {
  useEffect(() => {
    document.title = 'Bourgelat | Software para clínicas veterinarias'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fdf6ee] text-[#2b2018]">
      <LandingNav />

      <section
        id="hero"
        className="relative flex h-[100dvh] flex-col justify-center overflow-hidden text-[#2b2018]"
        style={{ background: 'linear-gradient(165deg, #f8e7cf 0%, #f1d6ad 48%, #ecd1a7 100%)' }}
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
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: 'translateZ(0)', objectPosition: 'right bottom' }}
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
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[28dvh]"
          style={{
            background:
              'linear-gradient(180deg, rgba(248,244,238,0) 0%, rgba(248,244,238,0.08) 28%, rgba(248,244,238,0.28) 50%, rgba(248,244,238,0.58) 68%, rgba(248,244,238,0.85) 84%, #f8f4ee 100%)',
          }}
        />

        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-5 pt-24 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
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
                className="group pointer-events-auto inline-flex items-center justify-center gap-2 rounded-none bg-[#2b2018] px-7 py-3.5 text-sm font-semibold text-[#fdf6ee] no-underline shadow-[0_4px_12px_rgba(43,32,24,0.12)] transition-colors hover:bg-[#b07645]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
              </Link>
              <Link
                to="/planes"
                className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-none border border-[#2b2018]/25 bg-transparent px-7 py-3.5 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645]"
              >
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div
        className="relative overflow-hidden"
        style={{
          background: WARM_BAND_BACKGROUND,
          boxShadow: 'inset 0 -1px 0 rgba(43,32,24,0.04)',
        }}
      >
        <TrustBar />
        <PlatformSection />
      </div>

      <section id="flujo" className="bg-[#f8f4ee] text-[#2b2018] overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
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

      <section id="planes" className="bg-[#fdf6ee] text-[#2b2018]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Planes"
            title="Planes para entrar sin miedo y crecer sin rearmar todo."
            body="Puedes empezar con orden clínico y sumar caja, inventario, reportes y facturación electrónica cuando la operación lo pida."
            center
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {PLAN_PREVIEW.map((plan) => (
              <article
                key={plan.name}
                className={`border p-6 ${
                  plan.featured
                    ? 'border-[#b07645] bg-white shadow-[0_24px_60px_rgba(43,32,24,0.12)]'
                    : 'border-[#2b2018]/12 bg-white/70'
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    plan.featured ? 'text-[#b07645]' : 'text-[#2b2018]/55'
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
                <p className="mt-4 text-lg font-semibold text-[#2b2018]">{plan.price}</p>
                <p
                  className={`mt-4 text-sm leading-7 ${
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
              className="group inline-flex items-center justify-center gap-2 rounded-none bg-[#2b2018] px-6 py-3.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#b07645]"
            >
              Ver comparativa completa
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
            </Link>
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 rounded-none border border-[rgba(43,32,24,0.25)] px-6 py-3.5 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <section id="contacto" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="overflow-hidden border border-[#2b2018]/10 bg-white p-6 text-[#2b2018] shadow-[0_36px_120px_rgba(43,32,24,0.12)] sm:p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Texto + botones */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b07645]">
                Contacto
              </p>
              <h2
                className="mt-4 text-[2.8rem] leading-[0.94] tracking-[-0.05em] text-[#2b2018] sm:text-5xl md:text-6xl"
                style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
              >
                Si tu clínica ya siente fricción, revisemos dónde se rompe el día.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#2b2018]/70">
                Cuentanos como trabajan hoy: agenda, historias, inventario, caja y DIAN. Con eso
                vemos si Bourgelat encaja y que habria que ordenar primero.
              </p>

              <div className="mt-8 space-y-4">
                <Link
                  to="/registro"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-none bg-[#2b2018] px-6 py-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#b07645]"
                >
                  Crear cuenta
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[3px]" />
                </Link>
                <a
                  href="mailto:hola@bourgelat.co"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-none border border-[rgba(43,32,24,0.25)] px-6 py-4 text-sm font-semibold text-[#2b2018] no-underline transition-colors hover:border-[#b07645] hover:text-[#b07645]"
                >
                  <Mail className="h-4 w-4" />
                  hola@bourgelat.co
                </a>
              </div>
            </div>

            {/* Perrito interactivo */}
            <div>
              <DogTug />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2b2018]/10 bg-[#f8f4ee]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-9 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <BrandMark />
            <p className="mt-4 text-sm leading-7 text-[#6b5d4d]">
              Software para clínicas veterinarias que quieren una operación más clara, más humana y
              más confiable desde la recepción hasta el cierre del día.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-[#6b5d4d] no-underline transition hover:text-[#2b2018]"
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
