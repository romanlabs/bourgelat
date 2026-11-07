import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import Aparecer from './Aparecer'
import { CIERRE, REGISTRO } from './contenido'

// Cierre: campo ámbar, la frase grande y la única acción.
export default function CierreRegistro() {
  return (
    <section id="cierre" data-campo="brand" aria-labelledby="titulo-cierre" className="bg-brand text-foreground">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 lg:py-36">
        <Aparecer
          as="h2"
          id="titulo-cierre"
          className="text-[clamp(2.6rem,7vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
        >
          <span className="block">{CIERRE.titulo[0]}</span>
          <span className="block">{CIERRE.titulo[1]}</span>
        </Aparecer>
        <Aparecer retraso={0.1} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            to={REGISTRO}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-base font-semibold text-background no-underline transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <span className="text-[15px] font-medium">{CIERRE.nota}</span>
        </Aparecer>
      </div>
    </section>
  )
}
