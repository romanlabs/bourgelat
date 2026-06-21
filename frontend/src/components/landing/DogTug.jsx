import { useEffect, useRef } from "react"

// ── Perrito tira-cuerda ────────────────────────────────────────────────────────
export default function DogTug() {
  const canvasRef = useRef(null)
  const msgRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const msgEl  = msgRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const CW = 560, CH = 330
    canvas.width  = CW
    canvas.height = CH

    const GY           = CH * 0.79   // lower horizon = more breathing room above
    const SEG_COUNT    = 18
    const SEG_LEN      = 12
    const GRAVITY_VAL  = 0.42
    const DAMPING      = 0.984
    const ITERATIONS   = 16
    const DOG_BASE_X   = CW * 0.74
    const DOG_Y        = GY
    const DOG_PULL     = 1.5
    const DOG_LEAN_MAX = 22
    const WIN_X        = CW * 0.1
    const LOSE_X       = DOG_BASE_X - 52

    let dogLean   = 0
    let gameState = 'idle'
    let winTimer  = 0
    let tick      = 0
    let mouse     = { x: 160, y: GY - 90 }
    let dragging  = false
    let pts       = []

    // Idle invitation: after ~2.5 s the dog tugs once to show the user what to do
    let idleTick  = 0
    let idlePhase = 'wait'   // 'wait' | 'pull' | 'release' | 'rest'

    const lerpFn  = (a, b, t)   => a + (b - a) * t
    const clampFn = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const distFn  = (a, b)      => Math.hypot(a.x - b.x, a.y - b.y)

    function mouthPos() {
      return { x: DOG_BASE_X + dogLean - 48, y: DOG_Y - 88 }
    }

    function initRope() {
      pts = []
      const m = mouthPos()
      for (let i = 0; i <= SEG_COUNT; i++) {
        const f = i / SEG_COUNT
        const x = lerpFn(CW * 0.2, m.x, f)
        const y = m.y - 5
        pts.push({ x, y, px: x, py: y })
      }
    }
    initRope()

    function canvasXY(clientX, clientY) {
      const r = canvas.getBoundingClientRect()
      return {
        x: (clientX - r.left) * (CW / r.width),
        y: (clientY - r.top)  * (CH / r.height),
      }
    }

    function onDown(e) {
      e.preventDefault()
      const src = e.touches ? e.touches[0] : e
      const p = canvasXY(src.clientX, src.clientY)
      mouse.x = p.x; mouse.y = p.y
      if (distFn(p, pts[0]) < 30) {
        dragging = true
        idlePhase = 'rest'; idleTick = 0   // cancel idle animation
        if (gameState === 'idle') gameState = 'grabbed'
      }
    }
    function onMove(e) {
      e.preventDefault()
      const src = e.touches ? e.touches[0] : e
      const p = canvasXY(src.clientX, src.clientY)
      mouse.x = p.x; mouse.y = p.y
      const near = distFn({ x: mouse.x, y: mouse.y }, pts[0]) < 30
      canvas.style.cursor = dragging ? 'grabbing' : near ? 'grab' : 'default'
    }
    function onUp() {
      if (dragging) { dragging = false; if (gameState === 'grabbed') gameState = 'idle' }
    }

    canvas.addEventListener('mousedown',  onDown, { passive: false })
    canvas.addEventListener('mousemove',  onMove, { passive: false })
    canvas.addEventListener('mouseup',    onUp)
    canvas.addEventListener('touchstart', onDown, { passive: false })
    canvas.addEventListener('touchmove',  onMove, { passive: false })
    canvas.addEventListener('touchend',   onUp)

    function updateRope() {
      const m = mouthPos()
      const last = pts[pts.length - 1]
      last.x = m.x; last.px = m.x; last.y = m.y; last.py = m.y

      if (dragging) {
        pts[0].x = clampFn(mouse.x, 10, m.x - 24)
        pts[0].y = clampFn(mouse.y, 10, GY - 4)
        pts[0].px = pts[0].x; pts[0].py = pts[0].y
      }

      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i]
        const vx = (p.x - p.px) * DAMPING
        const vy = (p.y - p.py) * DAMPING
        p.px = p.x; p.py = p.y
        p.x += vx; p.y += vy + GRAVITY_VAL
        if (p.y > GY - 3) { p.y = GY - 3; p.py = p.y }
      }

      for (let it = 0; it < ITERATIONS; it++) {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1]
          const pinA = dragging && i === 0
          const pinB = i === pts.length - 2
          const d = Math.hypot(b.x - a.x, b.y - a.y)
          if (d < 0.001) continue
          const diff = (d - SEG_LEN) / d * 0.5
          const ox = (b.x - a.x) * diff, oy = (b.y - a.y) * diff
          if (!pinA) { a.x += ox; a.y += oy }
          if (!pinB) { b.x -= ox; b.y -= oy }
        }
      }
    }

    // Dog tugs once after ~2.5 s to invite the user
    function updateIdleAnim() {
      if (gameState !== 'idle' || dragging) return
      idleTick++
      if (idlePhase === 'wait' && idleTick > 150) { idlePhase = 'pull'; idleTick = 0 }
      if (idlePhase === 'pull') {
        dogLean += (-DOG_LEAN_MAX * 0.55 - dogLean) * 0.07
        pts[0].x += DOG_PULL * 0.65
        if (idleTick > 42) { idlePhase = 'release'; idleTick = 0 }
      }
      if (idlePhase === 'release') {
        dogLean += (0 - dogLean) * 0.09
        if (idleTick > 32) { idlePhase = 'rest'; idleTick = 0 }
      }
      if (idlePhase === 'rest' && idleTick > 220) { idlePhase = 'wait'; idleTick = 0 }
    }

    function updateGame() {
      if (gameState === 'dogWins' || gameState === 'userWins') {
        if (--winTimer <= 0) {
          gameState = 'idle'; dogLean = 0
          idlePhase = 'wait'; idleTick = 0
          initRope()
          if (msgEl) msgEl.textContent = 'Agarra la cuerda — él también quiere jugar.'
        }
        return
      }
      if (gameState === 'grabbed') {
        dogLean += (-DOG_LEAN_MAX - dogLean) * 0.04
        pts[0].x += dragging ? DOG_PULL * 0.35 : DOG_PULL * 1.6
        if (pts[0].x >= LOSE_X) {
          gameState = 'dogWins'; winTimer = 150
          if (msgEl) msgEl.textContent = 'Ganó él. Pero nosotros respondemos rápido → hola@bourgelat.co'
        }
        if (pts[0].x <= WIN_X) {
          gameState = 'userWins'; winTimer = 150
          if (msgEl) msgEl.textContent = 'Se la arrebataste. Cuéntanos qué está fallando → hola@bourgelat.co'
        }
      } else {
        dogLean += (0 - dogLean) * 0.05
        if (gameState === 'idle' && msgEl) {
          const near = distFn({ x: mouse.x, y: mouse.y }, pts[0]) < 30
          msgEl.textContent = near
            ? 'Jala.'
            : 'Agarra la cuerda — él también quiere jugar.'
        }
      }
    }

    function drawScene() {
      // Seamless warm cream — the dog lives on the page, not inside a game box
      ctx.fillStyle = '#fdf6ee'
      ctx.fillRect(0, 0, CW, GY)

      // Warm sandy earth (no videogame grass stripe)
      ctx.fillStyle = '#c4a87a'
      ctx.fillRect(0, GY, CW, 5)
      ctx.fillStyle = '#a08450'
      ctx.fillRect(0, GY + 5, CW, CH - GY - 5)

      // Subtle shadow where dog meets earth
      const gs = ctx.createLinearGradient(0, GY, 0, GY + 20)
      gs.addColorStop(0, 'rgba(43,32,24,0.06)')
      gs.addColorStop(1, 'rgba(43,32,24,0)')
      ctx.fillStyle = gs
      ctx.fillRect(0, GY, CW, 20)
    }

    function drawRope() {
      if (pts.length < 2) return
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'

      // shadow
      ctx.beginPath(); ctx.moveTo(pts[0].x + 2, pts[0].y + 3)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x + 2, pts[i].y + 3)
      ctx.strokeStyle = 'rgba(43,32,24,0.10)'; ctx.lineWidth = 9; ctx.stroke()

      // rope body
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx2 = (pts[i].x + pts[i + 1].x) / 2
        const my2 = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx2, my2)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.strokeStyle = '#5C3010'; ctx.lineWidth = 9; ctx.stroke()

      // braid texture
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const mx2 = (pts[i].x + pts[i + 1].x) / 2
        const my2 = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx2, my2)
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 4
      ctx.setLineDash([7, 6]); ctx.stroke(); ctx.setLineDash([])

      // grab knob — uses brand amber on interaction
      const g = pts[0]
      const near = distFn({ x: mouse.x, y: mouse.y }, g) < 30
      ctx.beginPath(); ctx.arc(g.x, g.y, 12, 0, Math.PI * 2)
      ctx.fillStyle = dragging ? '#b07645' : near ? '#c98840' : '#8B4513'
      ctx.fill()
      ctx.strokeStyle = '#fdf6ee'; ctx.lineWidth = 2.5; ctx.stroke()
      ctx.restore()
    }

    function drawDog() {
      const pulling = gameState === 'grabbed' || idlePhase === 'pull'
      const winning = gameState === 'dogWins'

      ctx.save()
      ctx.translate(DOG_BASE_X + dogLean, DOG_Y)
      ctx.rotate(pulling ? 0.12 : 0)

      // ground shadow
      ctx.save(); ctx.scale(1, 0.2)
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(43,32,24,0.10)'; ctx.fill()
      ctx.restore()

      // tail
      const wagAmp   = pulling ? 6 : 22
      const wagSpeed = pulling ? 0.05 : 0.12
      const wagAngle = Math.sin(tick * wagSpeed * 60) * (wagAmp * Math.PI / 180)
      ctx.save(); ctx.translate(38, -30); ctx.rotate(wagAngle - 0.3)
      ctx.fillStyle = '#7A3810'
      ctx.beginPath(); ctx.ellipse(0, -16, 7, 19, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#C07830'
      ctx.beginPath(); ctx.arc(0, -34, 9, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      // body
      ctx.fillStyle = '#C07830'
      ctx.beginPath(); ctx.ellipse(0, -30, 38, 26, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#E8B87A'
      ctx.beginPath(); ctx.ellipse(-4, -24, 20, 14, 0, 0, Math.PI * 2); ctx.fill()

      // legs — shake when pulling
      const shake = pulling ? Math.sin(tick * 0.28) * 4 : 0
      ;[{ lx: -22, d: shake }, { lx: -8, d: -shake }, { lx: 10, d: -shake }, { lx: 24, d: shake }]
        .forEach(({ lx, d }) => {
          ctx.fillStyle = '#C07830'
          ctx.beginPath(); ctx.rect(lx - 6, -10, 12, 32 + d); ctx.fill()
          ctx.fillStyle = '#D4956A'
          ctx.beginPath(); ctx.ellipse(lx, 24 + d, 9, 6, 0, 0, Math.PI * 2); ctx.fill()
        })

      // head
      ctx.fillStyle = '#C07830'
      ctx.beginPath(); ctx.ellipse(-36, -56, 25, 21, -0.18, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#D4A070'
      ctx.beginPath(); ctx.ellipse(-50, -50, 14, 12, 0.1, 0, Math.PI * 2); ctx.fill()

      // nose
      ctx.fillStyle = '#2b2018'
      ctx.beginPath(); ctx.ellipse(-58, -53, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath(); ctx.ellipse(-60, -55, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill()

      // mouth: gritted when pulling, happy otherwise
      ctx.strokeStyle = '#5c2c08'; ctx.lineWidth = 2; ctx.lineCap = 'round'
      if (pulling) {
        ctx.beginPath(); ctx.moveTo(-58, -44); ctx.lineTo(-52, -46); ctx.lineTo(-44, -44); ctx.stroke()
      } else {
        ctx.beginPath(); ctx.arc(-50, -44, 7, 0.1, Math.PI - 0.1); ctx.stroke()
        ctx.fillStyle = '#f06080'
        ctx.beginPath(); ctx.ellipse(-50, -38, 4, 5, 0, 0, Math.PI); ctx.fill()
      }

      // eye
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(-32, -62, 7.5, 7.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#2b2018'
      ctx.beginPath(); ctx.ellipse(-31, -61, 4, 4, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(-29, -63, 2, 2, 0, 0, Math.PI * 2); ctx.fill()

      // eyebrow: furrowed when pulling
      ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
      ctx.beginPath()
      if (pulling) { ctx.moveTo(-40, -71); ctx.lineTo(-25, -68) }
      else         { ctx.moveTo(-40, -72); ctx.lineTo(-25, -72) }
      ctx.stroke()

      // ear
      ctx.fillStyle = '#8B3A10'
      ctx.beginPath(); ctx.ellipse(-27, -74, 11, 15, 0.35, 0, Math.PI * 2); ctx.fill()

      // effort lines in brand amber
      if (pulling) {
        ctx.save()
        ctx.globalAlpha = 0.35 + Math.sin(tick * 0.3) * 0.2
        ctx.strokeStyle = '#b07645'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(55 + i * 10, -55 + i * 12)
          ctx.lineTo(72 + i * 12, -49 + i * 12)
          ctx.stroke()
        }
        ctx.restore()
      }

      // victory sparkles
      if (winning) {
        ctx.save()
        for (let i = 0; i < 5; i++) {
          const a = tick * 0.08 + (i / 5) * Math.PI * 2
          const r = 56 + Math.sin(tick * 0.1 + i) * 8
          ctx.fillStyle = i % 2 === 0 ? '#b07645' : '#2b2018'
          ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r - 55, 5, 0, Math.PI * 2); ctx.fill()
        }
        ctx.restore()
      }

      ctx.restore()
    }

    let rafId = 0
    let visible = false

    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting },
      { threshold: 0.1 }
    )
    observer.observe(canvas)

    function loop() {
      if (visible) {
        tick++
        ctx.clearRect(0, 0, CW, CH)
        drawScene()
        updateRope()
        updateIdleAnim()
        updateGame()
        drawRope()
        drawDog()
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      canvas.removeEventListener('mousedown',  onDown)
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('mouseup',    onUp)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('touchend',   onUp)
    }
  }, [])

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: 'block', touchAction: 'none', cursor: 'default' }}
      />
      <p
        ref={msgRef}
        style={{
          margin: '10px 0 0',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#6b5d4d',
          minHeight: 22,
        }}
      >
        Agarra la cuerda — él también quiere jugar.
      </p>
    </div>
  )
}
