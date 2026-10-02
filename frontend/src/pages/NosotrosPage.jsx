import PublicPageShell from '@/components/shared/PublicPageShell'
import { brandProfile } from '@/content/publicSiteContent'

const sectionTitle = 'mb-4 text-2xl font-semibold tracking-tight text-tinta-800 md:text-3xl'
const bodyClass = 'text-base leading-8 text-tinta-500'

export default function NosotrosPage() {
  return (
    <PublicPageShell
      eyebrow="Empresa"
      title="Bourgelat no es solo agenda: es operacion veterinaria."
      description={brandProfile.oneLiner}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-8">
          <h2 className={sectionTitle}>Que estamos construyendo</h2>
          <p className={bodyClass}>
            {brandProfile.promise}
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-papel-300 bg-papel-100 p-5">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-caramel-600">Mision</p>
              <p className="text-sm leading-7 text-tinta-500">{brandProfile.mission}</p>
            </div>
            <div className="rounded-2xl border border-papel-300 bg-papel-100 p-5">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-caramel-600">Vision</p>
              <p className="text-sm leading-7 text-tinta-500">{brandProfile.vision}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-tinta-700 bg-tinta-800 p-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-caramel-300">En una frase</p>
          <p className="text-2xl font-semibold leading-10 text-white">
            {brandProfile.shortTagline}
          </p>
          <div className="mt-8 space-y-3">
            {brandProfile.differentiators.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-tinta-100">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-8">
          <h2 className={sectionTitle}>Para quien existe Bourgelat</h2>
          <ul className="space-y-3 text-sm leading-7 text-tinta-600">
            {brandProfile.audience.map((item) => (
              <li key={item} className="rounded-2xl border border-papel-300 bg-papel-100 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-8">
          <h2 className={sectionTitle}>Problemas que quiere resolver</h2>
          <ul className="space-y-3 text-sm leading-7 text-tinta-600">
            {brandProfile.problems.map((item) => (
              <li key={item} className="rounded-2xl border border-papel-300 bg-papel-100 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-8">
          <h2 className={sectionTitle}>Lo que si promete la V1</h2>
          <ul className="space-y-3 text-sm leading-7 text-tinta-600">
            {brandProfile.v1Modules.map((item) => (
              <li key={item} className="rounded-2xl border border-clinical-200 bg-clinical-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-papel-300 bg-papel-50 p-8">
          <h2 className={sectionTitle}>Lo que no vamos a prometer aun</h2>
          <ul className="space-y-3 text-sm leading-7 text-tinta-600">
            {brandProfile.notYet.map((item) => (
              <li key={item} className="rounded-2xl border border-caramel-200 bg-caramel-50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PublicPageShell>
  )
}
