import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion as Motion, useInView, useReducedMotion } from 'motion/react'

import { CORREO, LEGAL, LOGIN, NAV, REGISTRO, WHATSAPP } from './contenido'

const enlace = 'inline-block py-1 [overflow-wrap:anywhere] text-[15px] text-secondary no-underline transition-colors hover:text-brand'

// El nombre a todo lo ancho, en petróleo, con una franja de luz que cruza las
// letras cada pocos segundos mientras está a la vista (el mismo brillo del
// vidrio de las pantallas). Quieto con movimiento reducido.
const LETRAS =
  'linear-gradient(105deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 42%, color-mix(in hsl, hsl(var(--primary)) 45%, white) 50%, hsl(var(--primary)) 58%, hsl(var(--primary)) 100%)'

function NombreConBrillo() {
  const ref = useRef(null)
  const visible = useInView(ref, { amount: 0.4 })
  const reducido = useReducedMotion()
  const brilla = visible && !reducido

  return (
    <Motion.p
      ref={ref}
      aria-hidden="true"
      className="-mb-[0.22em] mt-14 sm:mt-20 select-none whitespace-nowrap bg-clip-text pb-[0.22em] text-[21.5vw] font-semibold leading-[0.78] tracking-[-0.06em] text-transparent 2xl:text-[330px]"
      style={{ backgroundImage: LETRAS, backgroundSize: '250% 100%', backgroundPosition: '100% 0' }}
      animate={brilla ? { backgroundPosition: ['100% 0', '0% 0'] } : { backgroundPosition: '100% 0' }}
      transition={brilla ? { duration: 2.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.5 } : { duration: 0 }}
    >
      Bourgelat
    </Motion.p>
  )
}

// Pie: campo tinta y el nombre a todo lo ancho como cierre.
export default function LandingFooter() {
  const anio = new Date().getFullYear()
  return (
    <footer data-campo="tinta" className="overflow-hidden bg-foreground text-background">
      <div className="mx-auto max-w-[1440px] px-4 pt-14 sm:px-8 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-12">
          <nav aria-label="Producto" className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Bourgelat</p>
            <ul className="mt-3 grid gap-1 sm:mt-4 sm:gap-1.5">
              {NAV.map((item) => (
                <li key={item.href}><a href={item.href} className={enlace}>{item.label}</a></li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Cuenta" className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Cuenta</p>
            <ul className="mt-3 grid gap-1 sm:mt-4 sm:gap-1.5">
              <li><Link to={REGISTRO} className={enlace}>Crear cuenta</Link></li>
              <li><Link to={LOGIN} className={enlace}>Iniciar sesión</Link></li>
              <li><Link to="/nosotros" className={enlace}>Nosotros</Link></li>
            </ul>
          </nav>
          <div className="lg:col-span-3">
            <p className="text-[15px] font-semibold">Contacto</p>
            <ul className="mt-3 grid gap-1 sm:mt-4 sm:gap-1.5">
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
            <ul className="mt-3 grid gap-1 sm:mt-4 sm:gap-1.5">
              {LEGAL.map((item) => (
                <li key={item.label}>
                  <a href={item.href} target="_blank" rel="noreferrer" className={enlace}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <NombreConBrillo />
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-secondary sm:px-8">
        <span>© {anio} Bourgelat</span>
        <span>Hecho en Colombia</span>
      </div>
    </footer>
  )
}
