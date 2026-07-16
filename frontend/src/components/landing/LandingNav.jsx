import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion as Motion } from "motion/react"
import { Link } from "react-router-dom"
import { ArrowRight, Menu, X } from "lucide-react"
import BrandMark from "./BrandMark"
import { NAV_ITEMS } from "./data"
import RegistroDialog from "@/features/auth/RegistroDialog"

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [navTheme, setNavTheme] = useState('light')
  const [hiddenBySection, setHiddenBySection] = useState(false)
  const [registroAbierto, setRegistroAbierto] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    // Solo se lee window.scrollY (sin forzar reflow) para el estado "scrolled".
    // El tema del nav (claro/oscuro) y el ocultarse se resuelven con
    // IntersectionObserver — cero lecturas de layout por frame de scroll, lo que
    // evita el jank que entrecortaba la decodificación del video del hero.
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    // El hero ahora es cálido y claro, igual que el resto de la página, así que el
    // nav usa siempre el tema claro (texto oscuro). Se mantiene como estado por si
    // en el futuro vuelve una sección oscura bajo el header.
    setNavTheme('light')

    // El header se oculta mientras el carrusel de flujo está en pantalla.
    const flujoSection = document.getElementById('flujo')
    const hideObserver = flujoSection
      ? new IntersectionObserver(
          ([entry]) => setHiddenBySection(entry.isIntersecting),
          { threshold: 0.15 }
        )
      : null
    if (hideObserver && flujoSection) hideObserver.observe(flujoSection)

    return () => {
      window.removeEventListener('scroll', onScroll)
      hideObserver?.disconnect()
    }
  }, [])

  const compact = isScrolled || open
  const isLight = navTheme === 'light'

  return (
    <header
      ref={headerRef}
      className={`fixed z-50 transition-all duration-700 ${
        compact
          ? 'left-3 right-3 top-3 sm:left-5 sm:right-5 sm:top-4'
          : 'left-0 right-0 top-0'
      }`}
      style={{ transform: hiddenBySection ? 'translateY(-120%)' : 'translateY(0)' }}
    >
      <div
        className={`mx-auto flex items-center justify-between px-4 transition-all duration-500 sm:px-6 lg:px-8 ${
          compact
            ? 'max-w-[1200px] rounded-none py-3'
            : 'max-w-[1400px] rounded-none border border-transparent bg-transparent py-5'
        }`}
        style={compact ? isLight ? {
          background: 'rgba(253,246,238,0.94)',
          border: '1px solid rgba(43,32,24,0.12)',
          boxShadow: '0 8px 32px rgba(43,32,24,0.08)',
        } : {
          background: 'rgba(30,21,14,0.88)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 8px 32px rgba(20,14,9,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        } : undefined}
      >
        <Link
          to="/"
          className="group no-underline"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <BrandMark dark={!isLight} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`rounded-md px-4 py-2 text-sm font-semibold no-underline transition-[background-color,color] duration-[250ms] ease-out ${
                isLight
                  ? 'text-[#2b2018] hover:bg-[rgba(43,32,24,0.06)] hover:text-[#b07645]'
                  : 'text-[rgba(255,255,255,0.85)] hover:bg-[rgba(176,118,69,0.14)] hover:text-[#e0b483]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-1.5">
            <a
              href="https://instagram.com/bourgelat.co"
              target="_blank"
              rel="noreferrer"
              aria-label="Bourgelat en Instagram"
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                isLight
                  ? 'text-[#2b2018]/70 hover:bg-[rgba(43,32,24,0.06)] hover:text-[#b07645]'
                  : 'text-white/70 hover:bg-[rgba(176,118,69,0.16)] hover:text-[#e0b483]'
              }`}
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
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                isLight
                  ? 'text-[#2b2018]/70 hover:bg-[rgba(43,32,24,0.06)] hover:text-[#b07645]'
                  : 'text-white/70 hover:bg-[rgba(176,118,69,0.16)] hover:text-[#e0b483]'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>
          <span className={`h-5 w-px ${isLight ? 'bg-[#2b2018]/15' : 'bg-white/15'}`} aria-hidden="true" />
          <Link
            to="/login"
            className={`rounded-md border px-4 py-2.5 text-sm font-semibold no-underline transition-[background-color,border-color,color] duration-[300ms] ease-out ${
              isLight
                ? 'border-[rgba(43,32,24,0.25)] bg-transparent text-[#2b2018] hover:border-[#b07645] hover:text-[#b07645]'
                : ''
            }`}
            style={isLight ? undefined : {
              color: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.10)',
            }}
            onMouseEnter={isLight ? undefined : (e) => {
              e.currentTarget.style.background = 'rgba(176,118,69,0.16)'
              e.currentTarget.style.borderColor = 'rgba(176,118,69,0.45)'
            }}
            onMouseLeave={isLight ? undefined : (e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
            }}
          >
            Iniciar sesión
          </Link>
          <button
            type="button"
            onClick={() => setRegistroAbierto(true)}
            className="group inline-flex items-center gap-2 rounded-md bg-[#2b2018] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-[300ms] ease-out hover:bg-[#b07645]"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4 transition-transform duration-[250ms] ease-out group-hover:translate-x-[3px]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors lg:hidden ${
            isLight
              ? 'border-[rgba(43,32,24,0.25)] text-[#2b2018] hover:bg-[rgba(43,32,24,0.06)]'
              : 'border-white/20 text-white hover:bg-white/10'
          }`}
          aria-label="Abrir menú"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <Motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-2 overflow-hidden rounded-none border lg:hidden"
            style={isLight ? {
              background: 'rgba(253,246,238,0.94)',
              backdropFilter: 'blur(24px) saturate(1.2)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid rgba(43,32,24,0.18)',
              boxShadow: '0 24px 70px rgba(43,32,24,0.10)',
            } : {
              background: 'rgba(20,14,9,0.96)',
              backdropFilter: 'blur(24px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 70px rgba(20,14,9,0.40)',
            }}
          >
            {/* Nav links */}
            <div className="px-3 pt-3">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-md px-4 py-3.5 text-[15px] font-medium no-underline transition-colors ${
                    isLight
                      ? 'text-[#2b2018] hover:bg-black/5'
                      : 'text-white/90 hover:bg-white/08'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className={`mx-5 my-3 h-px ${isLight ? 'bg-black/08' : 'bg-white/08'}`} />

            {/* CTAs */}
            <div className="flex flex-col gap-2 px-3 pb-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className={`rounded-md border px-4 py-3.5 text-center text-[15px] font-semibold no-underline transition-colors ${
                  isLight
                    ? 'border-[rgba(43,32,24,0.25)] bg-transparent text-[#2b2018] hover:bg-[rgba(43,32,24,0.06)]'
                    : 'border-white/15 bg-white/05 text-white hover:bg-white/10'
                }`}
              >
                Iniciar sesión
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setRegistroAbierto(true)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2b2018] px-4 py-3.5 text-center text-[15px] font-semibold text-white transition-colors hover:bg-[#b07645]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <RegistroDialog open={registroAbierto} onOpenChange={setRegistroAbierto} />
    </header>
  )
}
