import { APP_HOSTS, RUTAS_PUBLICAS, urlCanonica } from '@/content/seo'

const setContent = (selector, value) => {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute('content', value)
}

// Actualiza en su sitio las etiquetas de index.html (no crea duplicados).
// Solo las rutas de RUTAS_PUBLICAS servidas desde bourgelat.co se indexan; el
// resto (app, login, 404) queda en noindex y conserva el título que ponga su página.
export function aplicarSeo(pathname, hostname = window.location.hostname) {
  const ruta = RUTAS_PUBLICAS[pathname]
  const indexable = Boolean(ruta) && !APP_HOSTS.includes(hostname.toLowerCase())

  setContent('meta[name="robots"]', indexable ? 'index, follow' : 'noindex, nofollow')

  const canonical = document.head.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', urlCanonica(pathname))

  if (!ruta) return

  document.title = ruta.title
  setContent('meta[name="description"]', ruta.description)
  setContent('meta[property="og:url"]', urlCanonica(pathname))
  setContent('meta[property="og:title"]', ruta.title)
  setContent('meta[property="og:description"]', ruta.description)
  setContent('meta[name="twitter:url"]', urlCanonica(pathname))
  setContent('meta[name="twitter:title"]', ruta.title)
  setContent('meta[name="twitter:description"]', ruta.description)
}
