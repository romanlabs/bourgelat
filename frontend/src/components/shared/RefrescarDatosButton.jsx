import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SimpleTooltip } from '@/components/ui/tooltip'

/**
 * Salida manual cuando el usuario sospecha que esta viendo datos viejos.
 *
 * Invalida solo las queries activas (las montadas en pantalla): es suficiente para
 * refrescar lo que se ve y no toca el estado local de la vista, asi que no vacia el
 * carrito del POS ni cierra formularios abiertos.
 */
export function RefrescarDatosButton() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  const refrescar = async () => {
    await queryClient.invalidateQueries({ type: 'active' })
    toast.success('Datos actualizados')
  }

  return (
    <SimpleTooltip label="Actualizar datos">
      <button
        type="button"
        onClick={refrescar}
        disabled={fetching}
        aria-label="Actualizar datos"
        aria-busy={fetching}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
      >
        <RefreshCw className={cn('h-[18px] w-[18px]', fetching && 'animate-spin')} />
      </button>
    </SimpleTooltip>
  )
}
