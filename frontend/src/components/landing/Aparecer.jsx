import { motion, useReducedMotion } from 'motion/react'

// Entrada de las partes de cada sección: sube un poco y aparece, una sola vez.
// Con movimiento reducido el contenido se muestra quieto.
export default function Aparecer({ as = 'div', retraso = 0, className = '', children, ...props }) {
  const reducido = useReducedMotion()
  const Comp = motion[as] ?? motion.div
  if (reducido) {
    const Simple = as
    return <Simple className={className} {...props}>{children}</Simple>
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.6, delay: retraso, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </Comp>
  )
}
