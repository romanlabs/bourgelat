import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PublicPageShell from '@/components/shared/PublicPageShell'

// Render responde 200 a toda ruta (rewrite al SPA): el noindex lo pone
// aplicarSeo para cualquier ruta fuera de content/seo.js, así Google no la
// indexa como duplicado de la landing (soft 404).
export default function NoEncontradaPage() {
  useEffect(() => {
    document.title = 'Página no encontrada | Bourgelat'
  }, [])

  return (
    <PublicPageShell
      eyebrow="Error 404"
      title="Esta página no existe."
      description="Puede que el enlace esté mal escrito o que la página se haya movido."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-tinta-800 px-6 py-3 text-sm font-semibold text-white no-underline transition hover:bg-tinta-700"
        >
          Ir al inicio
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/planes"
          className="inline-flex items-center justify-center rounded-full border border-papel-300 bg-papel-50 px-6 py-3 text-sm font-semibold text-tinta-800 no-underline transition hover:border-papel-400"
        >
          Ver planes
        </Link>
      </div>
    </PublicPageShell>
  )
}
