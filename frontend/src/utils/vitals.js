import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals'

export function reportVitals(cb = console.log) {
  onCLS(cb)
  onINP(cb)
  onLCP(cb)
  onTTFB(cb)
}
