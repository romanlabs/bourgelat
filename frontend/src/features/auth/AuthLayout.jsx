import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/shared/Logo'

const SELLOS = ['Tus datos cifrados', 'Soporte en español', '30 días de prueba']

const volverClass =
  'group inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Marco compartido de /login y /registro: panel de marca a la izquierda (solo
// en pantallas grandes) y el formulario a la derecha.
export default function AuthLayout({ tituloId, ancho = 'max-w-[420px]', children }) {
  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground lg:h-[100dvh] lg:overflow-hidden">
      <section
        aria-label="Bourgelat"
        className="hidden flex-1 flex-col justify-between gap-8 bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14 bajo:xl:p-10 muy-bajo:p-8"
      >
        {/* El logo definitivo está en camino: mientras tanto, el nombre. */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-[26px] font-bold tracking-[-0.03em]">Bourgelat</span>
          <Link
            to="/"
            className={`${volverClass} text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>

        <div className="flex max-w-[520px] flex-col gap-5">
          <p className="text-[clamp(40px,4.4vw,64px)] bajo:text-[clamp(36px,3.6vw,52px)] muy-bajo:text-[clamp(32px,3vw,44px)] font-semibold leading-none tracking-[-0.045em]">
            La clínica entera, en orden.
          </p>
          <p className="text-lg leading-relaxed text-sidebar-foreground/85">
            Agenda, historias, inventario y caja en un solo lugar, hecho para veterinarias en Colombia.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2.5">
          {SELLOS.map((sello) => (
            <li key={sello} className="rounded-lg bg-sidebar-foreground/10 px-3 py-2 text-sm">
              {sello}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby={tituloId}
        className="relative flex flex-1 flex-col items-center overflow-y-auto px-4 pb-8 pt-20 sm:px-10 lg:py-6"
      >
        <Link
          to="/"
          className={`${volverClass} absolute left-4 top-4 text-muted-foreground hover:bg-secondary hover:text-foreground sm:left-6 sm:top-6 lg:hidden`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          Volver al inicio
        </Link>

        {/* my-auto centra el formulario y, si es más alto que la pantalla, deja que se desplace sin cortarlo arriba. */}
        <div className={`my-auto w-full ${ancho}`}>
          <Logo className="mb-8 lg:hidden" />
          {children}
        </div>
      </section>
    </div>
  )
}
