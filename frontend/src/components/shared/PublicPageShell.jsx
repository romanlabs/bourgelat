import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Stethoscope } from 'lucide-react'

const footerLinks = [
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Privacidad', to: '/privacidad' },
  { label: 'Terminos', to: '/terminos' },
  { label: 'Cookies', to: '/cookies' },
  { label: 'Planes', to: '/planes' },
]

export default function PublicPageShell({
  title,
  description,
  eyebrow = 'Bourgelat',
  children,
}) {
  useEffect(() => {
    document.title = `${title} | Bourgelat`
  }, [title])

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#112739]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-8rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute top-28 right-[-6rem] h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-500/8 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 border-b border-[#d7e4ee] bg-white/78 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <Link to="/" className="flex items-center gap-3 text-[#112739] no-underline">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8fe0da,#b8eff0)] text-[#0b2133] shadow-[0_18px_40px_rgba(92,206,198,0.18)]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em]">Bourgelat</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#5a7188]">
                  software veterinario para Colombia
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8e4ee] bg-white px-4 py-2 text-sm font-medium text-[#35536b] no-underline transition hover:border-[#bfd3e1] hover:text-[#112739]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8e4ee] px-4 py-2 text-sm font-medium text-[#35536b] no-underline transition hover:border-[#bfd3e1] hover:text-[#112739]"
              >
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                className="inline-flex items-center gap-2 rounded-full bg-[#0f2436] px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-[#17364f]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-12 max-w-3xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3c7d8d]">
              {eyebrow}
            </p>
            <h1
              className="text-5xl leading-none tracking-[-0.05em] text-[#10263a] md:text-6xl"
              style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
            >
              {title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#51697d]">{description}</p>
          </div>

          {children}
        </main>

        <footer className="border-t border-[#d7e4ee] bg-white px-5 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-[#5a7185]">
              Bourgelat construye una experiencia mas clara para recepcion, consulta, caja y
              seguimiento dentro de la operacion veterinaria en Colombia.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-[#5a7185]">
              {footerLinks.map((link) => (
                <Link key={link.to} to={link.to} className="transition hover:text-[#112739]">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
