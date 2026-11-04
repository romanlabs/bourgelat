import { IlustracionEstado } from './IlustracionEstado'

// Clases de los botones de estas pantallas: siempre en claro, como las páginas
// públicas, y sin depender del router (el AppErrorBoundary está fuera de él).
export const ACCION_PRINCIPAL =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-clinical-500 px-6 py-2.5 text-sm font-semibold text-white no-underline transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-500 focus-visible:ring-offset-2 active:translate-y-px'
export const ACCION_SECUNDARIA =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-papel-400 bg-papel-50 px-6 py-2.5 text-sm font-semibold text-tinta-800 no-underline transition hover:bg-papel-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-caramel-500 focus-visible:ring-offset-2 active:translate-y-px'

/**
 * Pantalla completa de un estado (error, página inexistente, actualización).
 *
 * @param {{
 *   escena: string,
 *   antetitulo?: string,
 *   titulo: string,
 *   descripcion?: React.ReactNode,
 *   acciones?: React.ReactNode,
 *   nota?: React.ReactNode,
 *   children?: React.ReactNode,
 * }} props
 */
export function PantallaEstado({ escena, antetitulo, titulo, descripcion, acciones, nota, children }) {
  return (
    <div className="pantalla-estado flex min-h-screen flex-col bg-papel-100 text-tinta-800 [--escena-acento:theme(colors.caramel.500)] [--escena-suave:theme(colors.papel.300)]">
      <header className="mx-auto w-full max-w-5xl px-6 pt-7 sm:px-8">
        {/* Enlace normal: esta pantalla también se pinta fuera del router. */}
        <a
          href="/"
          className="text-xl font-semibold tracking-[-0.03em] text-tinta-800 no-underline"
          style={{ fontFamily: '"Spectral", Georgia, serif' }}
        >
          Bourgelat
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col-reverse items-center justify-center gap-10 px-6 py-10 sm:px-8 lg:flex-row lg:justify-between lg:gap-16">
        <div className="pantalla-estado__texto w-full max-w-xl">
          {antetitulo ? (
            <p className="mb-4 text-sm font-semibold text-caramel-600">{antetitulo}</p>
          ) : null}
          <h1
            className="text-balance text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl"
            style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
          >
            {titulo}
          </h1>
          {descripcion ? (
            <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-tinta-500 sm:text-lg sm:leading-8">
              {descripcion}
            </p>
          ) : null}
          {children}
          {acciones ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{acciones}</div> : null}
          {nota ? <p className="mt-6 text-sm leading-6 text-tinta-500">{nota}</p> : null}
        </div>

        <IlustracionEstado
          escena={escena}
          className="w-56 shrink-0 sm:w-72 lg:w-[22rem]"
        />
      </main>
    </div>
  )
}
