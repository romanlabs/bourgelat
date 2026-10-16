// Metadatos de las páginas públicas indexables. Es la fuente única: la usa el
// SeoManager del router en el navegador y el plugin `bourgelat:seo-estatico` de
// vite.config.js para escribir un HTML por ruta y el sitemap en el build.
// ESM puro (sin alias `@/` ni React) porque Node lo importa desde vite.config.

export const SITE_URL = 'https://bourgelat.co'

// Hosts que sirven la app, no el sitio público: nada de lo que muestran se indexa.
export const APP_HOSTS = ['app.bourgelat.co', 'staging.bourgelat.co']

export const RUTAS_PUBLICAS = {
  '/': {
    title: 'Software veterinario para clínicas en Colombia | Bourgelat',
    description:
      'Bourgelat organiza agenda, historia clínica, pacientes, inventario y caja en una sola plataforma para clínicas veterinarias en Colombia.',
    changefreq: 'weekly',
    priority: '1.0',
  },
  '/planes': {
    title: 'Planes y precios del software veterinario | Bourgelat',
    description:
      'Planes de Bourgelat para consultorios y clínicas veterinarias en Colombia: agenda, historia clínica, inventario y caja desde $49.000 al mes.',
    changefreq: 'monthly',
    priority: '0.8',
  },
  '/nosotros': {
    title: 'Nosotros | Bourgelat, software para clínicas veterinarias',
    description:
      'Qué estamos construyendo en Bourgelat: misión, visión y la operación diaria de las clínicas veterinarias en Colombia.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  '/privacidad': {
    title: 'Política de privacidad | Bourgelat',
    description:
      'Cómo Bourgelat trata los datos personales de clínicas, tutores y pacientes conforme a la Ley 1581 de 2012.',
    changefreq: 'yearly',
    priority: '0.3',
  },
  '/terminos': {
    title: 'Términos y condiciones | Bourgelat',
    description: 'Condiciones de uso del software veterinario Bourgelat para clínicas en Colombia.',
    changefreq: 'yearly',
    priority: '0.3',
  },
  '/cookies': {
    title: 'Política de cookies | Bourgelat',
    description:
      'Qué guarda Bourgelat en tu navegador, para qué lo usa y cómo puedes controlarlo.',
    changefreq: 'yearly',
    priority: '0.3',
  },
}

export const urlCanonica = (path) => `${SITE_URL}${path === '/' ? '/' : path}`
