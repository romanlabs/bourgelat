import { CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { textoAvisoError } from '@/lib/estadoError'
import { cn } from '@/lib/utils'

/**
 * Una sección no pudo traer sus datos. Lo demás de la pantalla sigue funcionando,
 * así que va en miel (aviso) y no en rojo (algo salió mal por tu culpa).
 *
 * Uso:
 *   {pacientesQuery.isError ? (
 *     <AvisoError
 *       titulo="Los pacientes no cargaron"
 *       error={pacientesQuery.error}
 *       alReintentar={pacientesQuery.refetch}
 *       reintentando={pacientesQuery.isFetching}
 *     />
 *   ) : null}
 *
 * @param {{
 *   titulo?: string,
 *   error?: unknown,
 *   alReintentar?: () => void,
 *   reintentando?: boolean,
 *   className?: string,
 * }} props
 */
export function AvisoError({ titulo = 'Esta información no cargó', error, alReintentar, reintentando = false, className }) {
  const { motivo, reintenta } = textoAvisoError(error)

  return (
    <div
      role="alert"
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-warning-soft px-4 py-3.5', className)}
    >
      <CloudOff className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-[12rem] flex-1">
        <p className="text-sm font-semibold leading-6 text-foreground">{titulo}</p>
        <p className="text-sm leading-6 text-muted-foreground">{motivo}</p>
      </div>
      {alReintentar && reintenta ? (
        <Button variant="secondary" size="sm" disabled={reintentando} onClick={() => alReintentar()}>
          {reintentando ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
