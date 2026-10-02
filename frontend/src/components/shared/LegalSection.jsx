import { legalDraftNotice } from '@/content/publicSiteContent'
import { CORREO_LEGAL } from '@/content/legal'

export const legalP = 'text-sm leading-7 text-tinta-500'
export const legalUl = 'mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-tinta-500'
export const legalH3 = 'mb-2 mt-5 text-base font-semibold text-tinta-800'
export const legalLink = 'text-clinical-600 underline'

export function LegalHeader({ version, vigencia }) {
  return (
    <>
      <div className="mb-8 rounded-2xl border border-caramel-200 bg-caramel-50 p-5 text-sm leading-7 text-caramel-800">
        {legalDraftNotice}
      </div>
      <p className="mb-8 text-sm text-tinta-500">
        Versión {version} · Vigente desde {vigencia}
      </p>
    </>
  )
}

export function LegalSection({ numero, titulo, children }) {
  return (
    <section className="rounded-2xl border border-papel-300 bg-papel-50 p-6 sm:p-8">
      <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-tinta-800">
        {numero}. {titulo}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function Strong({ children }) {
  return <strong className="text-tinta-800">{children}</strong>
}

export function CorreoLegal() {
  return (
    <a href={`mailto:${CORREO_LEGAL}`} className={legalLink}>
      {CORREO_LEGAL}
    </a>
  )
}
