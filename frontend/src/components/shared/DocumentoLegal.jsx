import { Download, FileText } from 'lucide-react'
import PublicPageShell from '@/components/shared/PublicPageShell'
import { VERSIONES_LEGALES, formatearVigencia, urlDocumentoLegal } from '@/content/legal'

// Las páginas legales solo entregan el PDF oficial (como lo hace Nu): el texto
// vive en legal/documentos.js y `npm run legal:pdf` genera el archivo.
export default function DocumentoLegal({ clave, description, resumen = [] }) {
  const { titulo, version, vigencia, archivo } = VERSIONES_LEGALES[clave]
  const url = urlDocumentoLegal(clave)

  return (
    <PublicPageShell eyebrow="Legal" title={titulo} description={description}>
      <section className="rounded-2xl border border-papel-300 bg-papel-50 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md border border-papel-300 bg-white text-tinta-600">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-tinta-800">{titulo}</h2>
            <p className="mt-1 text-sm text-tinta-500">
              Versión {version} · {vigencia ? `Vigente desde el ${formatearVigencia(vigencia)}` : 'Pendiente de publicación'} · PDF
            </p>

            {resumen.length ? (
              <ul className="mt-5 list-disc space-y-1.5 pl-5 text-sm leading-7 text-tinta-500">
                {resumen.map((punto) => (
                  <li key={punto}>{punto}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-tinta-800 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-tinta-700"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Ver documento
              </a>
              <a
                href={url}
                download={archivo}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-papel-300 bg-white px-5 py-3 text-sm font-semibold text-tinta-700 no-underline transition hover:border-papel-400 hover:text-tinta-800"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Descargar PDF
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  )
}
