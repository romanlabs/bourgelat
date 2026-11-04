import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { textoAvisoError } from '@/lib/estadoError'
import { cn } from '@/lib/utils'

/**
 * Una sección no pudo traer sus datos. Lo demás de la pantalla sigue funcionando.
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
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-warning-soft px-4 py-3', className)}
    >
      <p className="min-w-[12rem] flex-1 text-sm leading-6 text-muted-foreground">
        <span className="font-semibold text-foreground">{titulo}.</span> {motivo}
      </p>
      {alReintentar && reintenta ? (
        <Button variant="ghost" size="sm" disabled={reintentando} onClick={() => alReintentar()} className="text-primary">
          {reintentando ? <Loader2 className="animate-spin" /> : null}
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
