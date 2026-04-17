import { useEffect, useMemo } from 'react'
import { Link, useLocation, useRouteError } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Stethoscope } from 'lucide-react'

const CHUNK_RELOAD_KEY = 'bourgelat-chunk-reload-attempted'

const getErrorMessage = (error) => {
  if (!error) return 'Ocurrio un problema inesperado al cargar esta pantalla.'
  if (typeof error === 'string') return error
  return error.message || error.statusText || 'Ocurrio un problema inesperado al cargar esta pantalla.'
}

const isChunkLoadError = (message) => {
  const normalized = String(message || '').toLowerCase()
  return (
    normalized.includes('dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('error loading dynamically imported module')
  )
}

export default function RouteErrorPage() {
  const error = useRouteError()
  const location = useLocation()
  const message = getErrorMessage(error)

  const isImportError = useMemo(() => isChunkLoadError(message), [message])

  useEffect(() => {
    if (!isImportError || typeof window === 'undefined') return

    const retryKey = `${CHUNK_RELOAD_KEY}:${location.pathname}`
    const alreadyRetried = window.sessionStorage.getItem(retryKey)

    if (alreadyRetried) return

    window.sessionStorage.setItem(retryKey, '1')

    const timeoutId = window.setTimeout(() => {
      window.location.reload()
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [isImportError, location.pathname])

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07131f_0%,#0d2335_55%,#f4f7fb_55%,#f4f7fb_100%)] px-5 py-8 text-[#112739] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-[28px] border border-white/10 bg-white/6 px-5 py-4 text-white backdrop-blur-xl">
        <Link to="/" className="inline-flex items-center gap-3 no-underline">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#8db8dd_0%,#6d9fe0_58%,#86b6a6_100%)] text-[#0b1623] shadow-[0_18px_40px_rgba(109,159,224,0.24)]">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em]">Bourgelat</p>
            <p className="mt-1 hidden text-xs uppercase tracking-[0.22em] text-white/48 sm:block">
              continuidad operativa para clinicas veterinarias
            </p>
          </div>
        </Link>
      </div>

      <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[34px] border border-[#d7e4ee] bg-white shadow-[0_30px_100px_rgba(7,20,32,0.18)]">
        <div className="border-b border-[#d7e4ee] bg-[linear-gradient(135deg,#0d2335,#14344c)] px-6 py-8 text-white sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9debe4]">
            <AlertTriangle className="h-3.5 w-3.5" />
            Estado de carga
          </div>
          <h1
            className="mt-5 text-[2.7rem] leading-[0.92] tracking-[-0.05em] sm:text-5xl"
            style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 700 }}
          >
            No pudimos abrir esta vista todavia.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
            {isImportError
              ? 'Detectamos una diferencia entre la version que tenia el navegador y la version publicada. La plataforma intentara recargarse una vez y, si no alcanza, puedes hacerlo manualmente con el boton de abajo.'
              : 'La ruta respondio con un error inesperado. Puedes volver al inicio o intentar recargar esta pantalla.'}
          </p>
        </div>

        <div className="px-6 py-8 sm:px-8">
          <div className="rounded-[28px] border border-[#d7e4ee] bg-[#f7fafc] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#608093]">
              Detalle tecnico
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-[#28445a]">
              {message}
            </pre>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#173b58_0%,#315c7e_62%,#6c9a8f_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_22px_48px_rgba(23,59,88,0.22)] transition hover:opacity-95"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar plataforma
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-[#c9d8e3] bg-white px-6 py-3 text-sm font-semibold text-[#163149] no-underline transition hover:border-[#9cb5c6] hover:bg-[#f8fbfd]"
            >
              Volver al inicio
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-[#c9d8e3] bg-white px-6 py-3 text-sm font-semibold text-[#163149] no-underline transition hover:border-[#9cb5c6] hover:bg-[#f8fbfd]"
            >
              Ir al acceso
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
