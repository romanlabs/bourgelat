import Aparecer from './Aparecer'
import { HECHOS } from './contenido'

// Lo que es cierto de cómo se usa: en la nube, en cualquier pantalla, hecho
// aquí. Campo petróleo; la foto entra cuando haya una aprobada (HECHOS.foto).
export default function BandaHechos() {
  return (
    <section
      id="como-funciona"
      data-campo="primary"
      aria-labelledby="titulo-hechos"
      className="scroll-mt-16 bg-primary text-primary-foreground"
    >
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-24 sm:px-8 lg:min-h-[80svh] lg:grid-cols-12 lg:items-center lg:py-32">
        <div className={HECHOS.foto ? 'lg:col-span-6' : 'lg:col-span-12'}>
          <Aparecer
            as="h2"
            id="titulo-hechos"
            className="max-w-4xl text-[clamp(2.6rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
          >
            {HECHOS.titulo}
          </Aparecer>

          <ul className={`mt-14 grid gap-10 ${HECHOS.foto ? '' : 'md:grid-cols-3'}`}>
            {HECHOS.items.map((item, i) => (
              <Aparecer as="li" key={item.titulo} retraso={0.08 * (i + 1)}>
                <p className="text-2xl font-semibold tracking-[-0.02em] text-brand">{item.titulo}</p>
                <p className="mt-2 max-w-sm text-lg leading-relaxed text-sidebar-foreground">{item.texto}</p>
              </Aparecer>
            ))}
          </ul>

          <Aparecer as="p" retraso={0.3} className="mt-14 text-lg font-medium text-sidebar-foreground">
            {HECHOS.proximamente}
          </Aparecer>
        </div>

        {HECHOS.foto ? (
          <Aparecer className="lg:col-span-6">
            <figure>
              <img
                src={HECHOS.foto.src}
                alt={HECHOS.foto.alt}
                width={1200}
                height={1500}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-xl object-cover"
              />
              <figcaption className="mt-3 text-sm text-sidebar-foreground">{HECHOS.foto.credito}</figcaption>
            </figure>
          </Aparecer>
        ) : null}
      </div>
    </section>
  )
}
