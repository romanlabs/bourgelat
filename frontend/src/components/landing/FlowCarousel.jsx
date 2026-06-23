import { useEffect, useRef, useState } from "react"
import { FLOW_STEPS } from "./data"

export default function FlowCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = FLOW_STEPS.length
  const tiltFrame = useRef(0)
  const reducedMotion = useRef(null)

  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total)
    }, 4500)
    return () => clearInterval(id)
  }, [paused, total])

  // Memoiza el MediaQueryList una sola vez en lugar de crear uno en cada mousemove.
  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)')
    return () => {
      if (tiltFrame.current) cancelAnimationFrame(tiltFrame.current)
    }
  }, [])

  const go = (dir) => setCurrent((prev) => (prev + dir + total) % total)

  const roleFor = (index) => {
    if (index === current) return 'current'
    if (index === (current + 1) % total) return 'next'
    if (index === (current - 1 + total) % total) return 'previous'
    return 'hidden'
  }

  const handleTilt = (event) => {
    if (reducedMotion.current?.matches) return
    // Captura los valores del evento de forma síncrona: React anula
    // currentTarget tras el handler, así que no se pueden leer dentro del rAF.
    const stage = event.currentTarget
    const { clientX, clientY } = event
    if (tiltFrame.current) return
    tiltFrame.current = requestAnimationFrame(() => {
      tiltFrame.current = 0
      const slide = stage.querySelector('.flow-slide[data-role="current"]')
      if (!slide) return
      const inner = slide.querySelector('.flow-slide__inner')
      const img = slide.querySelector('.flow-slide__img')
      if (!inner) return

      const rect = slide.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      // normaliza contra 28% del tamaño → efecto completo con poco movimiento
      const x = Math.max(-0.5, Math.min(0.5, (clientX - cx) / (rect.width * 0.28)))
      const y = Math.max(-0.5, Math.min(0.5, (clientY - cy) / (rect.height * 0.28)))

      inner.style.setProperty('--rotX', `${(-y * 10).toFixed(2)}deg`)
      inner.style.setProperty('--rotY', `${(x * 12).toFixed(2)}deg`)

      if (img) {
        img.style.setProperty('--imgX', `${(-x * 3).toFixed(2)}%`)
        img.style.setProperty('--imgY', `${(-y * 3).toFixed(2)}%`)
      }
    })
  }

  const resetTilt = (event) => {
    if (tiltFrame.current) {
      cancelAnimationFrame(tiltFrame.current)
      tiltFrame.current = 0
    }
    const slide = event.currentTarget.querySelector('.flow-slide[data-role="current"]')
    if (!slide) return
    const inner = slide.querySelector('.flow-slide__inner')
    const img = slide.querySelector('.flow-slide__img')
    if (inner) {
      inner.style.setProperty('--rotX', '0deg')
      inner.style.setProperty('--rotY', '0deg')
    }
    if (img) {
      img.style.setProperty('--imgX', '0%')
      img.style.setProperty('--imgY', '0%')
    }
    setPaused(false)
  }

  return (
    <div className="flow-carousel mt-12 lg:mt-16">
      <div
        className="flow-carousel__stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={resetTilt}
        onMouseMove={handleTilt}
      >
        <div className="flow-carousel__bg" aria-hidden="true">
          {FLOW_STEPS.map((step, index) => (
            <div
              key={step.step}
              className="flow-carousel__bg-layer"
              data-role={roleFor(index)}
              style={{ backgroundImage: `url(${step.image})` }}
            />
          ))}
        </div>

        <div className="flow-carousel__slides">
          {FLOW_STEPS.map((step, index) => {
            const role = roleFor(index)
            return (
              <article
                key={step.step}
                className="flow-slide"
                data-role={role}
                aria-hidden={role !== 'current'}
                onClick={role === 'next' ? () => go(1) : role === 'previous' ? () => go(-1) : undefined}
              >
                <div className="flow-slide__inner">
                  <span className="flow-slide__tab" aria-hidden="true" />
                  <div className="flow-slide__media">
                    <img
                      className="flow-slide__img"
                      src={step.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                    <span className="flow-slide__num" aria-hidden="true">{step.step}</span>
                  </div>
                  <div className="flow-slide__text">
                    <div className="flow-reveal">
                      <span className="flow-slide__step">Paso {step.step}</span>
                    </div>
                    <div className="flow-reveal">
                      <h3 className="flow-slide__title">{step.title}</h3>
                    </div>
                    <div className="flow-reveal">
                      <p className="flow-slide__desc">{step.body}</p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

      </div>

    </div>
  )
}
