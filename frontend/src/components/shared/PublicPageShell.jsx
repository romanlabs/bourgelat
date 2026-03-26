import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Stethoscope } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 left-[-8rem] h-80 w-80 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute top-24 right-[-6rem] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 shadow-lg shadow-teal-500/20">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">Bourgelat</p>
                <p className="text-xs text-slate-400">Software veterinario para Colombia</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-teal-400/50 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
              <Link
                to="/registro"
                className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
              >
                Registrar mi clinica
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mb-12 max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
              {eyebrow}
            </p>
            <h1 className="mb-5 text-4xl font-bold tracking-tight text-white md:text-6xl">
              {title}
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              {description}
            </p>
          </div>

          {children}
        </main>

        <footer className="border-t border-white/10 px-6 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-400">
              Bourgelat construye software para la operacion veterinaria real en Colombia.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {footerLinks.map((link) => (
                <Link key={link.to} to={link.to} className="transition hover:text-white">
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
