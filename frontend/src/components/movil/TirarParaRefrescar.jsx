import { useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { vibrar } from '@/lib/gestos'
import { useEsCelular } from '@/lib/useEsCelular'

const UMBRAL = 72
const MAXIMO = 110

/**
 * Tirar hacia abajo desde arriba de la página para actualizar, como en las
 * apps. `onRefrescar` puede devolver una promesa (p. ej. `refetch()` o
 * `queryClient.invalidateQueries(...)`); el indicador gira hasta que termina.
 * Solo en celular; en escritorio devuelve `children` sin cambios.
 */
export default function TirarParaRefrescar({ onRefrescar, children, className }) {
  const esCelular = useEsCelular()
  const inicio = useRef(null)
  const [tiron, setTiron] = useState(0)
  const [refrescando, setRefrescando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

  if (!esCelular || !onRefrescar) return <div className={className}>{children}</div>

  const terminar = async () => {
    const llego = tiron >= UMBRAL
    inicio.current = null
    setArrastrando(false)
    if (!llego) {
      setTiron(0)
      return
    }
    vibrar()
    setRefrescando(true)
    setTiron(UMBRAL * 0.7)
    try {
      await onRefrescar()
    } finally {
      setRefrescando(false)
      setTiron(0)
    }
  }

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={(event) => {
        // Solo cuenta si la página ya está arriba del todo, y no si el toque
        // viene de una hoja o diálogo abierto encima (los portales de React
        // también burbujean aquí aunque no estén dentro en el DOM).
        if (window.scrollY > 0 || refrescando) return
        if (!event.currentTarget.contains(event.target)) return
        inicio.current = event.touches[0]?.clientY ?? null
        setArrastrando(inicio.current != null)
      }}
      onTouchMove={(event) => {
        if (inicio.current == null) return
        const dy = (event.touches[0]?.clientY ?? 0) - inicio.current
        if (dy <= 0) {
          setTiron(0)
          return
        }
        // Resistencia: cuesta más mientras más se tira.
        setTiron(Math.min(MAXIMO, dy * 0.5))
      }}
      onTouchEnd={terminar}
      onTouchCancel={() => {
        inicio.current = null
        setArrastrando(false)
        setTiron(0)
      }}
    >
      {/* Solo se mueve el indicador: trasladar el contenido rompería los
          elementos `fixed` de adentro (barra de cobro, botón flotante). */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{
          transform: `translateY(${tiron - 44}px)`,
          opacity: Math.min(tiron / UMBRAL, 1),
          transition: arrastrando ? 'none' : 'transform 200ms ease, opacity 200ms ease',
        }}
        aria-hidden={!refrescando}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-primary shadow-dropdown">
          <RefreshCw
            className={cn('h-[18px] w-[18px]', refrescando && 'animate-spin')}
            style={refrescando ? undefined : { transform: `rotate(${tiron * 3}deg)` }}
          />
        </span>
      </div>
      {children}
      {refrescando ? <span className="sr-only" role="status">Actualizando</span> : null}
    </div>
  )
}
