import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Stethoscope } from 'lucide-react'
import RegistroDialog from '@/features/auth/RegistroDialog'

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
  const [registroAbierto, setRegistroAbierto] = useState(false)

  useEffect(() => {
    document.title = `${title} | Bourgelat`
  }, [title])

  return (
    <div className="min-h-screen bg-papel-100 text-tinta-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-8rem] h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 border-b border-papel-300 bg-papel-50/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <Link to="/" className="flex items-center gap-3 text-tinta-800 no-underline">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clinical-500 text-white shadow-[0_18px_40px_rgba(31,122,92,0.18)]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em]">Bourgelat</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-tinta-500">
                  software veterinario para Colombia
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-papel-300 bg-papel-50 px-4 py-2 text-sm font-medium text-tinta-600 no-underline transition hover:border-papel-400 hover:text-tinta-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-papel-300 px-4 py-2 text-sm font-medium text-tinta-600 no-underline transition hover:border-papel-400 hover:text-tinta-800"
              >
                Iniciar sesion
              </Link>
              <button
                type="button"
                onClick={() => setRegistroAbierto(true)}
                className="inline-flex items-center gap-2 rounded-full bg-tinta-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-tinta-700"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-12 max-w-3xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-caramel-600">
              {eyebrow}
            </p>
            <h1
              className="text-5xl leading-none tracking-[-0.05em] text-tinta-800 md:text-6xl"
              style={{ fontFamily: '"Spectral", "Spectral Fallback", Georgia, serif', fontWeight: 700 }}
            >
              {title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-tinta-500">{description}</p>
          </div>

          {children}
        </main>

        <footer className="border-t border-papel-300 bg-papel-50 px-5 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-tinta-500">
              Bourgelat construye una experiencia mas clara para recepcion, consulta, caja y
              seguimiento dentro de la operacion veterinaria en Colombia.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-tinta-500">
              {footerLinks.map((link) => (
                <Link key={link.to} to={link.to} className="transition hover:text-tinta-800">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <RegistroDialog open={registroAbierto} onOpenChange={setRegistroAbierto} />
    </div>
  )
}
