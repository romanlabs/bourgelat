import { useEffect, useRef, useState } from "react"

export function useVisible(threshold = 0.4, { toggle = false, rootMargin = '0px' } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (toggle) setVisible(entry.isIntersecting)
        else if (entry.isIntersecting) setVisible(true)
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, toggle, rootMargin])
  return { ref, visible }
}
