import { legalDraftNotice } from '@/content/publicSiteContent'
import { CORREO_LEGAL } from '@/content/legal'

export const legalP = 'text-sm leading-7 text-[#51697d]'
export const legalUl = 'mt-2 list-disc space-y-1.5 pl-5 text-sm leading-7 text-[#51697d]'
export const legalH3 = 'mb-2 mt-5 text-base font-semibold text-[#10263a]'
export const legalLink = 'text-[#3a6d87] underline'

export function LegalHeader({ version, vigencia }) {
  return (
    <>
      <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        {legalDraftNotice}
      </div>
      <p className="mb-8 text-sm text-[#51697d]">
        Versión {version} · Vigente desde {vigencia}
      </p>
    </>
  )
}

export function LegalSection({ numero, titulo, children }) {
  return (
    <section className="rounded-2xl border border-[#d7e4ee] bg-white p-6 sm:p-8">
      <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-[#10263a]">
        {numero}. {titulo}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function Strong({ children }) {
  return <strong className="text-[#10263a]">{children}</strong>
}

export function CorreoLegal() {
  return (
    <a href={`mailto:${CORREO_LEGAL}`} className={legalLink}>
      {CORREO_LEGAL}
    </a>
  )
}
