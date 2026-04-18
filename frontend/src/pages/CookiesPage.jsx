import PublicPageShell from '@/components/shared/PublicPageShell'
import { legalDraftNotice } from '@/content/publicSiteContent'

export default function CookiesPage() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Politica de cookies"
      description="Borrador operativo sobre el uso de cookies y tecnologias similares en las paginas publicas y privadas de Bourgelat."
    >
      <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
        {legalDraftNotice}
      </div>

      <div className="grid gap-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-2xl font-semibold text-white">1. Cookies esenciales</h2>
          <p className="text-sm leading-7 text-slate-300">
            Se usan para autenticación, seguridad de sesión y funcionamiento básico de la plataforma cuando el producto
            se publica y opera con usuarios reales.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-2xl font-semibold text-white">2. Cookies de analitica</h2>
          <p className="text-sm leading-7 text-slate-300">
            En este momento el proyecto no tiene analítica pública montada. Cuando se agregue una herramienta de
            medición, esta política debe actualizarse para informar finalidad, proveedor y forma de consentimiento.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-2xl font-semibold text-white">3. Control del usuario</h2>
          <p className="text-sm leading-7 text-slate-300">
            La versión final debe indicar cómo aceptar, rechazar o borrar cookies desde el navegador y desde el banner
            de consentimiento cuando se implemente.
          </p>
        </section>
      </div>
    </PublicPageShell>
  )
}
