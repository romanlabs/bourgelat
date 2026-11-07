import { useId, useState } from 'react'
import { Plus } from 'lucide-react'

import Aparecer from './Aparecer'
import { FAQS } from './contenido'

// Acordeón de baldosas: una abierta a la vez, la abierta en ámbar.
export default function PreguntasFrecuentes() {
  const [abierta, setAbierta] = useState(0)
  const base = useId()

  return (
    <section
      id="preguntas"
      data-campo="fondo"
      aria-labelledby="titulo-preguntas"
      className="scroll-mt-16 bg-background text-foreground"
    >
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-4">
          <Aparecer
            as="h2"
            id="titulo-preguntas"
            className="text-[clamp(2.4rem,4.5vw,4rem)] font-semibold leading-[0.95] tracking-[-0.04em] lg:sticky lg:top-28"
          >
            Lo que suelen preguntar.
          </Aparecer>
        </div>

        <ul className="grid gap-2 lg:col-span-8">
          {FAQS.map((faq, i) => {
            const abiertaEsta = abierta === i
            const idRespuesta = `${base}-r${i}`
            return (
              <li key={faq.pregunta} className={`rounded-xl transition-colors ${abiertaEsta ? 'bg-brand' : 'bg-card'}`}>
                <h3 className="m-0">
                  <button
                    type="button"
                    aria-expanded={abiertaEsta}
                    aria-controls={idRespuesta}
                    onClick={() => setAbierta(abiertaEsta ? -1 : i)}
                    className="flex min-h-[72px] w-full items-center justify-between gap-6 rounded-xl bg-transparent px-6 py-4 text-left text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xl"
                  >
                    {faq.pregunta}
                    <Plus
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 transition-transform duration-300 ${abiertaEsta ? 'rotate-45' : ''}`}
                    />
                  </button>
                </h3>
                <div id={idRespuesta} role="region" hidden={!abiertaEsta}>
                  <p className="max-w-[52ch] px-6 pb-6 text-[17px] leading-relaxed text-foreground">{faq.respuesta}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
