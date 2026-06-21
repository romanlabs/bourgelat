import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion as Motion } from "motion/react"
import { Link } from "react-router-dom"
import { ArrowRight, Menu, X } from "lucide-react"
import BrandMark from "./BrandMark"
import { NAV_ITEMS } from "./data"

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [navTheme, setNavTheme] = useState('light')
  const [hiddenBySection, setHiddenBySection] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    // Solo se lee window.scrollY (sin forzar reflow) para el estado "scrolled".
    // El tema del nav (claro/oscuro) y el ocultarse se resuelven con
    // IntersectionObserver — cero lecturas de layout por frame de scroll, lo que
    // evita el jank que entrecortaba la decodificación del video del hero.
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    // El nav es oscuro únicamente mientras el hero cubre la franja del header.
    const heroSection = document.getElementById('hero')
    const headerHeight = headerRef.current?.offsetHeight ?? 78
    const themeObserver = heroSection
      ? new IntersectionObserver(
          ([entry]) => setNavTheme(entry.isIntersecting ? 'dark' : 'light'),
          { rootMargin: `-${Math.round(headerHeight + 12)}px 0px 0px 0px`, threshold: 0 }
        )
      : null
    if (themeObserver && heroSection) themeObserver.observe(heroSection)

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
      themeObserver?.disconnect()
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
          background: 'rgba(253,246,238,0.82)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          border: '1px solid rgba(43,32,24,0.12)',
          boxShadow: '0 8px 32px rgba(43,32,24,0.08)',
        } : {
          background: 'rgba(43,32,24,0.55)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 8px 32px rgba(20,14,9,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
        } : undefined}
      >
        <Link to="/" className="group no-underline">
          <BrandMark dark={!isLight} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`rounded-none px-4 py-2 text-sm font-semibold no-underline transition-[background-color,color] duration-[250ms] ease-out ${
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
          <Link
            to="/login"
            className={`rounded-none border px-4 py-2 text-sm font-semibold no-underline transition-[background-color,border-color,color] duration-[300ms] ease-out ${
              isLight
                ? 'border-[rgba(43,32,24,0.25)] bg-transparent text-[#2b2018] hover:border-[#b07645] hover:text-[#b07645]'
                : ''
            }`}
            style={isLight ? undefined : {
              color: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
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
            Iniciar sesion
          </Link>
          <Link
            to="/registro"
            className="group inline-flex items-center gap-2 rounded-none bg-[#2b2018] px-6 py-3 text-sm font-semibold text-white no-underline transition-colors duration-[300ms] ease-out hover:bg-[#b07645]"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4 transition-transform duration-[250ms] ease-out group-hover:translate-x-[3px]" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-none border transition-colors lg:hidden ${
            isLight
              ? 'border-[rgba(43,32,24,0.25)] text-[#2b2018] hover:bg-[rgba(43,32,24,0.06)]'
              : 'border-white/20 text-white hover:bg-white/10'
          }`}
          aria-label="Abrir menu"
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
                  className={`flex items-center rounded-none px-4 py-3.5 text-[15px] font-medium no-underline transition-colors ${
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
                className={`rounded-none border px-4 py-3.5 text-center text-[15px] font-semibold no-underline transition-colors ${
                  isLight
                    ? 'border-[rgba(43,32,24,0.25)] bg-transparent text-[#2b2018] hover:bg-[rgba(43,32,24,0.06)]'
                    : 'border-white/15 bg-white/05 text-white hover:bg-white/10'
                }`}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/registro"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-none bg-[#2b2018] px-4 py-3.5 text-center text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[#b07645]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
