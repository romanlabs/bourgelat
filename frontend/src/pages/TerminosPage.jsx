import PublicPageShell from '@/components/shared/PublicPageShell'
import { legalDraftNotice } from '@/content/publicSiteContent'

const cardClass = 'rounded-2xl border border-white/10 bg-white/5 p-6'

export default function TerminosPage() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Terminos de uso"
      description="Borrador operativo para definir el alcance del servicio, responsabilidades de la clínica y límites de uso de Bourgelat."
    >
      <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
        {legalDraftNotice}
      </div>

      <div className="grid gap-6">
        <section className={cardClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">1. Objeto del servicio</h2>
          <p className="text-sm leading-7 text-slate-300">
            Bourgelat ofrece una plataforma web para apoyar la operación veterinaria, incluyendo agenda, historias,
            inventario, facturación y funciones administrativas relacionadas.
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">2. Cuenta y acceso</h2>
          <p className="text-sm leading-7 text-slate-300">
            Cada clínica es responsable de la administración de sus usuarios, credenciales, roles, autorizaciones y
            uso adecuado de la información dentro del sistema.
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">3. Uso aceptable</h2>
          <p className="text-sm leading-7 text-slate-300">
            No se permite usar la plataforma para actividades ilícitas, acceso no autorizado, suplantación,
            manipulación indebida de datos o cualquier uso que comprometa la seguridad del servicio.
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">4. Disponibilidad y limites</h2>
          <p className="text-sm leading-7 text-slate-300">
            Bourgelat buscará mantener alta disponibilidad, pero el texto final debe dejar claros mantenimientos,
            integraciones de terceros, ventanas de soporte, responsabilidades fiscales y exclusiones de garantía.
          </p>
        </section>
      </div>
    </PublicPageShell>
  )
}
