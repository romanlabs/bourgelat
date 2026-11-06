import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion as Motion, useScroll, useTransform } from 'motion/react'

import Aparecer from './Aparecer'
import Captura from './Captura'
import { HERO, REGISTRO } from './contenido'
import { useMovimientoAmplio } from './useMovimiento'

// Primer pantallazo: campo petróleo, el título enorme en dos tintas y el
// inicio real del programa, inclinado en 3D, que se endereza al bajar.
export default function HeroProducto() {
  const ref = useRef(null)
  const amplio = useMovimientoAmplio()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, 0.45], [16, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1])

  return (
    <section
      id="inicio"
      ref={ref}
      data-campo="primary"
      className="relative overflow-hidden bg-primary pt-28 text-primary-foreground sm:pt-36"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <h1 className="text-[clamp(2.6rem,8vw,8rem)] font-semibold leading-[0.9] tracking-[-0.05em] lg:col-span-8">
            <span className="block text-brand">{HERO.titulo[0]}</span>
            <span className="block">{HERO.titulo[1]}</span>
          </h1>
          <Aparecer className="lg:col-span-4 lg:pb-3">
            <p className="max-w-md text-lg leading-relaxed text-sidebar-foreground sm:text-xl">
              {HERO.frase}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                to={REGISTRO}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-foreground no-underline transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-card"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="text-[15px] text-sidebar-foreground">{HERO.nota}</span>
            </div>
          </Aparecer>
        </div>

        {/* La captura entera, dentro del campo y con aire abajo: nada se corta. */}
        <div
          className="mx-auto mt-14 max-w-6xl pb-16 sm:mt-20 sm:pb-24"
          style={amplio ? { perspective: '1800px' } : undefined}
        >
          <Motion.div style={amplio ? { rotateX, scale, transformOrigin: '50% 100%' } : undefined}>
            {/* Marco en petróleo claro: la barra lateral del programa es del
                mismo color del campo y sin él se pierde el borde. */}
            <div className="rounded-2xl bg-sidebar-accent p-1.5 sm:p-2.5">
              <Captura src={HERO.imagen} alt={HERO.alt} prioridad />
            </div>
          </Motion.div>
        </div>
      </div>
    </section>
  )
}
