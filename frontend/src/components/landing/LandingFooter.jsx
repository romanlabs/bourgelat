import { Link } from 'react-router-dom'

import { CORREO, LEGAL, LOGIN, NAV, REGISTRO, WHATSAPP } from './contenido'

const enlace = 'text-[15px] text-secondary no-underline transition-colors hover:text-brand'

// Pie: campo tinta y el nombre a todo lo ancho como cierre.
export default function LandingFooter() {
  const anio = new Date().getFullYear()
  return (
    <footer data-campo="tinta" className="overflow-hidden bg-foreground text-background">
      <div className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <nav aria-label="Producto" className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Bourgelat</p>
            <ul className="mt-4 grid gap-3">
              {NAV.map((item) => (
                <li key={item.href}><a href={item.href} className={enlace}>{item.label}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Cuenta" className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Cuenta</p>
            <ul className="mt-4 grid gap-3">
              <li><Link to={REGISTRO} className={enlace}>Crear cuenta</Link></li>
              <li><Link to={LOGIN} className={enlace}>Iniciar sesión</Link></li>
              <li><Link to="/nosotros" className={enlace}>Nosotros</Link></li>
            </ul>
          </nav>
          <div className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Contacto</p>
            <ul className="mt-4 grid gap-3">
              <li><a href={`mailto:${CORREO}`} className={enlace}>{CORREO}</a></li>
              <li>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className={enlace}>
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Legal</p>
            <ul className="mt-4 grid gap-3">
              {LEGAL.map((item) => (
                <li key={item.label}>
                  <a href={item.href} target="_blank" rel="noreferrer" className={enlace}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="mt-20 select-none whitespace-nowrap text-[21.5vw] font-semibold leading-[0.78] tracking-[-0.06em] text-primary 2xl:text-[330px]"
        >
          Bourgelat
        </p>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-secondary sm:px-8">
        <span>© {anio} Bourgelat</span>
        <span>Hecho en Colombia</span>
      </div>
    </footer>
  )
}
