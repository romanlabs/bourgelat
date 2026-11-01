import { useState } from 'react'
import { animate, motion as Motion, useMotionValue } from 'motion/react'
import { cn } from '@/lib/utils'
import { vibrar } from '@/lib/gestos'
import { useEsCelular } from '@/lib/useEsCelular'

const ANCHO_ACCION = 76

const TONOS = {
  primary: 'bg-primary text-primary-foreground',
  danger: 'bg-danger text-primary-foreground',
  warning: 'bg-warning text-primary-foreground',
  info: 'bg-info text-primary-foreground',
  neutro: 'bg-secondary text-secondary-foreground',
}

/**
 * Fila que se desliza a la izquierda con el dedo y deja ver acciones rápidas
 * (cobrar, llamar, quitar…), como en las apps de correo.
 *
 * Es un atajo: cada acción debe existir también en otro lugar accesible
 * (el detalle o el menú «⋯»), porque el gesto no se descubre con teclado
 * ni lector de pantalla. En escritorio no hace nada: muestra solo `children`.
 *
 * acciones: [{ key, label, icon: Componente, onClick, tono: 'primary'|'danger'|… }]
 */
export default function FilaDeslizable({ acciones = [], children, className, redondeo = 'rounded-xl' }) {
  const esCelular = useEsCelular()
  const x = useMotionValue(0)
  const [abierta, setAbierta] = useState(false)
  const ancho = acciones.length * ANCHO_ACCION

  if (!esCelular || acciones.length === 0) return <div className={className}>{children}</div>

  const irA = (destino) => {
    animate(x, destino, { type: 'spring', stiffness: 500, damping: 40 })
    setAbierta(destino !== 0)
  }

  return (
    <div className={cn('relative overflow-hidden', redondeo, className)}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ancho }} aria-hidden={!abierta}>
        {acciones.map((accion) => {
          const Icono = accion.icon
          return (
            <button
              key={accion.key || accion.label}
              type="button"
              tabIndex={abierta ? 0 : -1}
              onClick={() => {
                irA(0)
                accion.onClick?.()
              }}
              className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold', TONOS[accion.tono] || TONOS.neutro)}
            >
              {Icono ? <Icono className="h-5 w-5" aria-hidden="true" /> : null}
              {accion.label}
            </button>
          )
        })}
      </div>
      <Motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ancho, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x, touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          const abrir = info.offset.x < -ancho / 3 || info.velocity.x < -400
          if (abrir && !abierta) vibrar()
          irA(abrir ? -ancho : 0)
        }}
        onClickCapture={(event) => {
          // Con la fila abierta, el primer toque solo la cierra.
          if (abierta) {
            event.stopPropagation()
            event.preventDefault()
            irA(0)
          }
        }}
        className={cn('relative bg-card', redondeo)}
      >
        {children}
      </Motion.div>
    </div>
  )
}
