import { useRef } from 'react'
import { motion as Motion, useScroll, useTransform } from 'motion/react'

import Aparecer from './Aparecer'
import Tablet from './Tablet'
import { campo } from './campos'
import { MODULOS } from './contenido'
import { useMovimientoAmplio } from './useMovimiento'

// Orden de los campos: claro, oscuro, ámbar, claro. Dos vecinos nunca comparten
// luminosidad, y el héroe (petróleo) y la banda siguiente quedan contrastados.
const CAMPO_POR_MODULO = { agenda: 'card', historia: 'tinta', caja: 'brand', inventario: 'fondo' }

function Capitulo({ modulo, indice }) {
  const ref = useRef(null)
  const amplio = useMovimientoAmplio()
  const nombreCampo = CAMPO_POR_MODULO[modulo.id] ?? 'card'
  const c = campo(nombreCampo)
  const aLaDerecha = indice % 2 === 0
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotateY = useTransform(scrollYProgress, [0, 1], [aLaDerecha ? -18 : 18, 0])
  const x = useTransform(scrollYProgress, [0, 1], [aLaDerecha ? 80 : -80, 0])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.4, 1])

  return (
    <section
      ref={ref}
      id={modulo.id === 'agenda' ? 'producto' : undefined}
      data-campo={nombreCampo}
      aria-labelledby={`modulo-${modulo.id}`}
      className={`scroll-mt-16 overflow-hidden ${c.fondo} ${c.tinta}`}
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 py-24 sm:px-8 lg:min-h-[90svh] lg:grid-cols-12 lg:gap-12 lg:py-32">
        <div className={`lg:col-span-5 ${aLaDerecha ? '' : 'lg:order-2 lg:col-start-8'}`}>
          <Aparecer as="p" className={`text-lg font-semibold ${c.suave}`}>
            {modulo.nombre}
          </Aparecer>
          <Aparecer
            as="h2"
            retraso={0.08}
            id={`modulo-${modulo.id}`}
            className="mt-3 text-[clamp(2.2rem,3.8vw,3.75rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
          >
            {modulo.titulo}
          </Aparecer>
          <Aparecer as="p" retraso={0.16} className={`mt-6 max-w-md text-lg leading-relaxed ${c.tinta}`}>
            {modulo.frase}
          </Aparecer>
        </div>

        <div
          className={`mx-auto w-full max-w-2xl lg:col-span-7 ${aLaDerecha ? '' : 'lg:order-1'}`}
          style={amplio ? { perspective: '1600px' } : undefined}
        >
          <Motion.div style={amplio ? { rotateY, x, opacity } : undefined}>
            <Tablet src={modulo.imagen} alt={modulo.alt} />
          </Motion.div>
        </div>
      </div>
    </section>
  )
}

// El programa por dentro: un capítulo de color por módulo.
export default function ProgramaPorDentro() {
  return (
    <div>
      {MODULOS.map((modulo, i) => (
        <Capitulo key={modulo.id} modulo={modulo} indice={i} />
      ))}
    </div>
  )
}
