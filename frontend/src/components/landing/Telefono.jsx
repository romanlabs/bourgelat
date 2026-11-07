import { BatteryFull, SignalHigh, Wifi } from 'lucide-react'

import { ALUMINIO, LENTE, MARCO, SOMBRA, SOMBRA_BOTON } from './materiales'
import Vidrio from './Vidrio'

// Una captura real del programa en un celular dibujado con CSS (sin marca):
// canto de aluminio, marco negro fino, cámara perforada y barra de estado.
// La captura es de 390×844 (escala 3). Medidas en % y `cqw` para que todo
// escale con el ancho del teléfono.
function Boton({ className }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute w-[3px] rounded-full ${className}`}
      style={{ background: ALUMINIO, boxShadow: SOMBRA_BOTON }}
    />
  )
}

// Fondo de la barra de estado: el mismo del lienzo de la captura (modo claro).
const FONDO_PANTALLA = 'hsl(195 18% 96%)'
const TINTA_PANTALLA = 'hsl(196 48% 12%)'

// `className` debe traer la posición (relative o absolute) y el ancho.
export default function Telefono({ src, alt, className = 'relative' }) {
  return (
    <div className={`isolate [container-type:inline-size] ${className}`}>
      {/* Volumen a la izquierda, encendido a la derecha. */}
      <Boton className="-left-[2px] top-[20%] h-[8%]" />
      <Boton className="-left-[2px] top-[30%] h-[8%]" />
      <Boton className="-right-[2px] top-[25%] h-[12%]" />

      <div className="relative rounded-[14cqw] p-[1.2cqw]" style={{ background: ALUMINIO, boxShadow: SOMBRA }}>
        <div
          className="relative rounded-[12.8cqw] p-[2.6cqw]"
          style={{ background: MARCO, boxShadow: 'inset 0 0 0 1px hsl(0 0% 100% / 0.06)' }}
        >
          <div
            className="relative aspect-[390/800] overflow-hidden rounded-[10.2cqw]"
            style={{ background: FONDO_PANTALLA }}
          >
            {/* Barra de estado sobre la captura */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 z-10 flex h-[5%] items-center justify-between px-[8%] text-[3.8cqw] font-semibold"
              style={{ background: FONDO_PANTALLA, color: TINTA_PANTALLA }}
            >
              <span>10:58</span>
              <span className="flex items-center gap-[1.2cqw]">
                <SignalHigh className="h-[4.2cqw] w-[4.2cqw]" strokeWidth={2.6} />
                <Wifi className="h-[4.2cqw] w-[4.2cqw]" strokeWidth={2.6} />
                <BatteryFull className="h-[5cqw] w-[5cqw]" strokeWidth={2.2} />
              </span>
            </div>
            {/* Cámara perforada */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-[1.6%] z-20 h-[3.4cqw] w-[3.4cqw] -translate-x-1/2 rounded-full"
              style={{ background: LENTE, boxShadow: `0 0 0 0.5cqw ${MARCO}` }}
            />
            <img
              src={src}
              alt={alt}
              width={1170}
              height={2532}
              loading="lazy"
              decoding="async"
              className="absolute inset-x-0 bottom-0 top-[5%] h-[95%] w-full object-contain object-bottom"
            />
            <Vidrio />
          </div>
        </div>
      </div>
    </div>
  )
}
