import { useEffect, useRef } from 'react'

const TWO_PI = Math.PI * 2
const SPHERE_CHARS = [
  '\u2591',
  '\u2592',
  '\u2593',
  '\u2588',
  '\u2580',
  '\u2584',
  '\u258c',
  '\u2590',
  '\u2502',
  '\u2500',
  '\u2524',
  '\u251c',
  '\u2534',
  '\u252c',
  '\u256d',
  '\u256e',
  '\u2570',
  '\u256f',
]

export default function ClinicOrbitCanvas({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      return undefined
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = null
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(280, rect.width)
      height = Math.max(280, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time = 0) => {
      const t = reducedMotion ? 8 : time / 1000
      const isCompact = width < 560
      const isPhone = width < 420
      const centerX = width * (isCompact ? (isPhone ? 0.59 : 0.56) : 0.73)
      const centerY = height * (isCompact ? (isPhone ? 0.6 : 0.56) : 0.47)
      const radius = Math.min(width, height) * (isCompact ? (isPhone ? 0.6 : 0.64) : 0.68)
      const step = isCompact ? 0.205 : 0.145
      const fontSize = Math.max(isCompact ? 8.5 : 9.5, Math.min(isCompact ? 12 : 13, radius / 50))
      const points = []

      ctx.clearRect(0, 0, width, height)

      for (let phi = 0; phi < TWO_PI; phi += step) {
        for (let theta = 0; theta < Math.PI; theta += step) {
          const x = Math.sin(theta) * Math.cos(phi + t * 0.5)
          const y = Math.sin(theta) * Math.sin(phi + t * 0.5)
          const z = Math.cos(theta)

          const rotY = t * 0.32
          const yAxisX = x * Math.cos(rotY) - z * Math.sin(rotY)
          const yAxisZ = x * Math.sin(rotY) + z * Math.cos(rotY)

          const rotX = t * 0.18
          const finalY = y * Math.cos(rotX) - yAxisZ * Math.sin(rotX)
          const finalZ = y * Math.sin(rotX) + yAxisZ * Math.cos(rotX)
          const depth = (finalZ + 1) / 2
          const charIndex = Math.max(0, Math.min(SPHERE_CHARS.length - 1, Math.floor(depth * (SPHERE_CHARS.length - 1))))

          points.push({
            char: SPHERE_CHARS[charIndex],
            depth,
            x: centerX + yAxisX * radius,
            y: centerY + finalY * radius,
            z: finalZ,
          })
        }
      }

      points.sort((a, b) => a.z - b.z)

      ctx.save()
      ctx.font = `${fontSize}px "Geist Variable", "Geist", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      points.forEach((point, index) => {
        if (isCompact && index % 2 === 0 && point.depth < 0.55) {
          return
        }

        const alpha = 0.08 + point.depth * (isCompact ? 0.46 : 0.5)
        const teal = Math.round(130 + point.depth * 95)
        const blue = Math.round(142 + point.depth * 78)

        ctx.globalAlpha = alpha
        ctx.fillStyle = `rgb(${Math.round(82 + point.depth * 86)}, ${teal}, ${blue})`
        ctx.fillText(point.char, point.x, point.y)
      })

      ctx.restore()
    }

    const tick = (time) => {
      draw(time)
      animationFrame = window.requestAnimationFrame(tick)
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      draw(window.performance.now())
    })

    resize()
    draw(window.performance.now())
    resizeObserver.observe(canvas)

    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(tick)
    }

    return () => {
      resizeObserver.disconnect()

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
