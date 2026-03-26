import PublicPageShell from '@/components/shared/PublicPageShell'
import { legalDraftNotice } from '@/content/publicSiteContent'

const itemClass = 'rounded-2xl border border-white/10 bg-white/5 p-6'

export default function PrivacidadPage() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Politica de privacidad"
      description="Borrador operativo para explicar como Bourgelat recopila, usa, protege y conserva datos personales dentro de la plataforma."
    >
      <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
        {legalDraftNotice}
      </div>

      <div className="grid gap-6">
        <section className={itemClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">1. Datos que tratamos</h2>
          <p className="text-sm leading-7 text-slate-300">
            Bourgelat puede tratar datos de clínicas, usuarios, propietarios de mascotas, pacientes, agenda,
            facturación e inventario cuando son necesarios para operar el servicio.
          </p>
        </section>

        <section className={itemClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">2. Finalidad</h2>
          <p className="text-sm leading-7 text-slate-300">
            Usamos los datos para prestar el servicio, autenticar usuarios, mantener trazabilidad, generar reportes,
            emitir facturación y mejorar la seguridad operativa de la plataforma.
          </p>
        </section>

        <section className={itemClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">3. Seguridad</h2>
          <p className="text-sm leading-7 text-slate-300">
            Aplicamos controles de acceso, autenticación, auditoría, cifrado de credenciales sensibles y mecanismos
            de protección del backend. La clínica sigue siendo responsable del uso adecuado de sus usuarios y permisos.
          </p>
        </section>

        <section className={itemClass}>
          <h2 className="mb-3 text-2xl font-semibold text-white">4. Conservacion y derechos</h2>
          <p className="text-sm leading-7 text-slate-300">
            La plataforma conservará la información según la relación contractual, obligaciones legales y necesidades
            operativas. El texto final debe incluir procedimientos formales para consultas, actualización, supresión
            y revocatoria de autorización de tratamiento de datos.
          </p>
        </section>
      </div>
    </PublicPageShell>
  )
}
