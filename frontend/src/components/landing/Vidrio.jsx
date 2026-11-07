import { useRef } from 'react'
import { motion as Motion, useScroll, useTransform } from 'motion/react'

import { useMovimientoAmplio } from './useMovimiento'

// El cristal sobre la pantalla de un aparato: reflejo fijo en diagonal, un
// brillo que cruza la pantalla al hacer scroll (solo en pantallas grandes y
// sin movimiento reducido) y una sombra interior que hunde la imagen bajo el
// vidrio. Va como última capa dentro de la pantalla (que debe ser relative y
// overflow-hidden).
const REFLEJO =
  'linear-gradient(118deg, hsl(0 0% 100% / 0.2) 0%, hsl(0 0% 100% / 0.07) 28%, hsl(0 0% 100% / 0.02) 45%, transparent 60%)'

const BRILLO =
  'linear-gradient(105deg, transparent 0%, hsl(0 0% 100% / 0) 35%, hsl(0 0% 100% / 0.22) 50%, hsl(0 0% 100% / 0) 65%, transparent 100%)'

const PROFUNDIDAD = 'inset 0 0 0 1px hsl(0 0% 0% / 0.55), inset 0 2px 10px hsl(0 0% 0% / 0.28)'

export default function Vidrio() {
  const ref = useRef(null)
  const amplio = useMovimientoAmplio()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const x = useTransform(scrollYProgress, [0, 1], ['-120%', '120%'])

  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[inherit]">
      <span className="absolute inset-0" style={{ background: REFLEJO }} />
      {amplio && <Motion.span className="absolute inset-y-0 left-0 w-full" style={{ background: BRILLO, x }} />}
      <span className="absolute inset-0 rounded-[inherit]" style={{ boxShadow: PROFUNDIDAD }} />
    </span>
  )
}
