import { useEffect, useRef } from 'react'

const TWO_PI = Math.PI * 2
const R_PEAK_PHASE = 0.405 // midpoint of QRS spike in the 0..1 cycle

function ecgSample(p) {
  p = ((p % 1) + 1) % 1
  if (p < 0.10) return 0
  if (p < 0.22) return 0.20 * Math.exp(-(((p - 0.16) / 0.028) ** 2))         // P wave
  if (p < 0.32) return 0                                                       // PR segment
  if (p < 0.37) return -0.12 * Math.sin(((p - 0.32) / 0.05) * Math.PI)       // Q dip
  if (p < 0.44) return Math.sin(((p - 0.37) / 0.07) * Math.PI)                // R spike
  if (p < 0.50) return -0.25 * Math.sin(((p - 0.44) / 0.06) * Math.PI)       // S dip
  if (p < 0.58) return 0                                                       // ST segment
  if (p < 0.78) return 0.30 * Math.exp(-(((p - 0.68) / 0.07) ** 2))           // T wave
  return 0
}

function drawPaw(ctx, cx, cy, r, alpha) {
  if (alpha < 0.01) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#5ce8df'

  ctx.beginPath()
  ctx.ellipse(cx, cy + r * 0.10, r * 0.50, r * 0.40, 0, 0, TWO_PI)
  ctx.fill()

  for (const [dx, dy, rx, ry, rot] of [
    [-0.48, -0.45, 0.21, 0.17, -0.20],
    [-0.16, -0.62, 0.21, 0.17,  0.05],
    [ 0.16, -0.62, 0.21, 0.17, -0.05],
    [ 0.48, -0.45, 0.21, 0.17,  0.20],
  ]) {
    ctx.beginPath()
    ctx.ellipse(cx + dx * r, cy + dy * r, rx * r, ry * r, rot, 0, TWO_PI)
    ctx.fill()
  }

  ctx.restore()
}

export default function ECGHeartbeatCanvas({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animFrame = null
    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(280, rect.width)
      height = Math.max(200, rect.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time = 0) => {
      const t = reducedMotion ? 4 : time / 1000
      ctx.clearRect(0, 0, width, height)

      const compact = width < 560
      const cyclesPerScreen = compact ? 1.6 : 2.0
      const scrollSpeed = 0.38 // cycles per second — calm, clinical pace

      // ECG paper grid: very subtle teal crosshatch
      const gridSize = compact ? 26 : 34
      ctx.save()
      ctx.strokeStyle = 'rgba(92, 210, 205, 0.045)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      }
      ctx.restore()

      const lineConfigs = [
        { yFrac: compact ? 0.54 : 0.50, amp: compact ? 62 : 78, baseAlpha: 0.88, phaseOff: 0.00, lw: 1.8, main: true  },
        { yFrac: compact ? 0.30 : 0.27, amp: compact ? 36 : 48, baseAlpha: 0.20, phaseOff: 0.43, lw: 1.0, main: false },
        { yFrac: compact ? 0.77 : 0.74, amp: compact ? 26 : 32, baseAlpha: 0.10, phaseOff: 0.72, lw: 0.8, main: false },
      ]

      for (const cfg of lineConfigs) {
        const cy = height * cfg.yFrac

        const pts = []
        for (let px = 0; px <= width; px += 2) {
          const phase = px / width * cyclesPerScreen + t * scrollSpeed + cfg.phaseOff
          pts.push([px, cy - ecgSample(phase) * cfg.amp])
        }

        const strokePath = () => {
          ctx.beginPath()
          ctx.moveTo(pts[0][0], pts[0][1])
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
          ctx.stroke()
        }

        // Soft wide glow underneath
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = `rgba(92, 232, 218, ${cfg.baseAlpha * 0.16})`
        ctx.lineWidth = cfg.lw * 7
        strokePath()
        ctx.restore()

        // Sharp line with shadow glow
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = `rgba(92, 232, 218, ${cfg.baseAlpha})`
        ctx.lineWidth = cfg.lw
        if (cfg.main) {
          ctx.shadowColor = 'rgba(92, 232, 218, 0.75)'
          ctx.shadowBlur = 10
        }
        strokePath()
        ctx.restore()

        // Paw prints at each visible R spike (main line only)
        if (cfg.main) {
          const pawR = Math.max(10, Math.min(width, height) * 0.026)

          for (let k = -1; k <= Math.ceil(cyclesPerScreen) + 1; k++) {
            const rx = (R_PEAK_PHASE + k - t * scrollSpeed - cfg.phaseOff) / cyclesPerScreen * width
            if (rx < width * 0.04 || rx > width * 0.96) continue

            const ry = cy - cfg.amp // R peak amplitude is exactly 1.0
            const pawCY = ry - pawR * 2.8
            // Paws fade from dim (left/older beats) to bright (right/recent beat)
            const pawAlpha = 0.20 + 0.62 * (rx / width)

            const grd = ctx.createRadialGradient(rx, pawCY, 0, rx, pawCY, pawR * 4.5)
            grd.addColorStop(0, `rgba(92, 232, 218, ${pawAlpha * 0.28})`)
            grd.addColorStop(1, 'rgba(92, 232, 218, 0)')
            ctx.save()
            ctx.fillStyle = grd
            ctx.beginPath()
            ctx.arc(rx, pawCY, pawR * 4.5, 0, TWO_PI)
            ctx.fill()
            ctx.restore()

            drawPaw(ctx, rx, pawCY, pawR, pawAlpha)
          }
        }
      }
    }

    const tick = (time) => {
      draw(time)
      animFrame = window.requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(() => {
      resize()
      draw(window.performance.now())
    })

    resize()
    draw(window.performance.now())
    ro.observe(canvas)
    if (!reducedMotion) animFrame = window.requestAnimationFrame(tick)

    return () => {
      ro.disconnect()
      if (animFrame) window.cancelAnimationFrame(animFrame)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
