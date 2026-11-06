// Una captura real del programa. Medidas fijas (16:10) para que la página no
// salte mientras carga. `prioridad` solo para la del primer pantallazo.
// En pantallas pequeñas se amplía y se recorta la barra lateral del programa
// (≈19 % del ancho), para que se lea el contenido y no una miniatura.
export default function Captura({ src, alt, prioridad = false, className = '' }) {
  return (
    <div data-ui className={`aspect-[4/3] overflow-hidden rounded-xl bg-card lg:aspect-auto ${className}`}>
      <img
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        loading={prioridad ? 'eager' : 'lazy'}
        fetchPriority={prioridad ? 'high' : 'auto'}
        decoding="async"
        className="block h-auto w-[170%] max-w-none -translate-x-[19%] lg:w-full lg:max-w-full lg:translate-x-0"
      />
    </div>
  )
}
