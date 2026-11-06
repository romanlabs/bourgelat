import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

import BrandMark from './BrandMark'
import { campo } from './campos'
import { LOGIN, NAV, REGISTRO } from './contenido'

// Barra simple: marca, tres enlaces y una acción. Toma el color del capítulo
// que tiene debajo (cada sección lleva `data-campo`).
export default function LandingNav() {
  const [nombreCampo, setNombreCampo] = useState('primary')
  const [abierto, setAbierto] = useState(false)
  const c = campo(nombreCampo)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const secciones = document.querySelectorAll('[data-campo]')
    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) setNombreCampo(e.target.dataset.campo)
        })
      },
      // Una franja fina a la altura de la barra.
      { rootMargin: '-32px 0px -94% 0px' }
    )
    secciones.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!abierto) return undefined
    const alEscape = (e) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', alEscape)
    return () => window.removeEventListener('keydown', alEscape)
  }, [abierto])

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${c.fondo} ${c.tinta}`}>
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-8"
      >
        <a href="#inicio" className="rounded-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark className={c.tinta} />
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href} className={`text-[15px] font-medium no-underline transition-colors ${c.enlace}`}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-5">
          <Link to={LOGIN} className={`hidden text-[15px] font-medium no-underline transition-colors sm:inline ${c.enlace}`}>
            Iniciar sesión
          </Link>
          <Link
            to={REGISTRO}
            className={`inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${c.boton}`}
          >
            Crear cuenta
          </Link>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-landing"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-transparent lg:hidden ${c.tinta}`}
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {abierto ? (
        <div id="menu-landing" className={`lg:hidden ${c.fondo}`}>
          <ul className="flex flex-col px-4 pb-6">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setAbierto(false)}
                  className={`block py-3 text-lg font-medium no-underline ${c.tinta}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link to={LOGIN} className={`block py-3 text-lg font-medium no-underline ${c.tinta}`}>
                Iniciar sesión
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  )
}
