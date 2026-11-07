import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion as Motion, useScroll, useTransform } from 'motion/react'

import Aparecer from './Aparecer'
import Tablet from './Tablet'
import Telefono from './Telefono'
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
      className="relative overflow-hidden bg-primary pt-28 text-primary-foreground sm:pt-32"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <h1 className="text-[clamp(2.6rem,min(8vw,12vh),8rem)] font-semibold leading-[0.9] tracking-[-0.05em] lg:col-span-8">
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
          className="mx-auto mt-10 max-w-4xl pb-20 sm:mt-12 sm:pb-28"
          style={amplio ? { perspective: '1800px' } : undefined}
        >
          {/* La tablet a la izquierda y el celular montado sobre su esquina:
              el mismo programa en los dos tamaños. */}
          <Motion.div className="relative" style={amplio ? { rotateX, scale, transformOrigin: '50% 0%' } : undefined}>
            <Tablet src={HERO.imagen} alt={HERO.alt} prioridad className="w-[84%]" />
            <Telefono
              src={HERO.imagenMovil}
              alt={HERO.altMovil}
              className="absolute -bottom-[8%] right-0 w-[25%] sm:w-[22%]"
            />
          </Motion.div>
        </div>
      </div>
    </section>
  )
}
