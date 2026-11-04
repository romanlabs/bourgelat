import { cn } from '@/lib/utils'

// Va en SVG dentro del código y no como imagen: tiene que verse aunque el navegador
// no pueda descargar nada más.

const PULSO = 'M8 84h104l16-44 26 92 18-48h148'

const DEDOS = [
  { cx: 7.6, cy: 14.7, rx: 2.2, ry: 3, giro: -20 },
  { cx: 12.6, cy: 8.9, rx: 2.3, ry: 3.3, giro: -8 },
  { cx: 19.4, cy: 8.9, rx: 2.3, ry: 3.3, giro: 8 },
  { cx: 24.4, cy: 14.7, rx: 2.2, ry: 3, giro: 20 },
]

// La huella de la marca, la misma del favicon.
export function Huella({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('block', className)}>
      <rect className="huella__fondo" width="32" height="32" rx="7" />
      <path
        className="huella__forma"
        d="M16 15.5c3.200 0 6.800 3.600 6.800 7 0 2.200-1.700 3.300-3.500 3.300-1.300 0-2.100-.7-3.300-.7s-2 .7-3.300.7c-1.800 0-3.500-1.100-3.500-3.300 0-3.400 3.600-7 6.800-7Z"
      />
      {DEDOS.map(({ cx, cy, rx, ry, giro }) => (
        <ellipse
          key={cx}
          className="huella__forma"
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          transform={`rotate(${giro} ${cx} ${cy})`}
        />
      ))}
    </svg>
  )
}

// Pantalla completa mientras se descarga un módulo o se abre la sesión. Aparece con
// retraso: si la carga es rápida, no alcanza a parpadear.
export function PantallaCarga({ etiqueta }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PulsoCarga etiqueta={etiqueta} className="estado-aparece-tarde" />
    </div>
  )
}

// Línea de pulso que se dibuja una y otra vez: la carga de la marca.
export function PulsoCarga({ className, etiqueta = 'Cargando' }) {
  return (
    <div role="status" aria-label={etiqueta} className={cn('w-20', className)}>
      <svg
        viewBox="0 0 320 160"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
        aria-hidden="true"
        className="block h-auto w-full"
      >
        <path className="estado-pulso" pathLength="100" d={PULSO} />
      </svg>
    </div>
  )
}
