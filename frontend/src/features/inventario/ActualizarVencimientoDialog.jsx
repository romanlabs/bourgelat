import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { inventarioApi } from './inventarioApi'
import { inventarioClinicoApi } from '@/features/inventarioClinico/inventarioClinicoApi'
import { formatLongDate } from '@/features/dashboard/dashboardUtils'
import { getErrorMessage, invalidateInventarioQueries } from './inventarioUtils'
import { invalidateInventarioClinicoQueries } from '@/features/inventarioClinico/inventarioClinicoUtils'
import VencimientosSiguientes from './VencimientosSiguientes'

// Los insumos clinicos admiten decimales (ml, g); el formatNumber del dashboard redondea.
const formatNumber = (valor) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(valor || 0))

// Fecha de hoy YYYY-MM-DD en hora local del navegador.
const hoyLocal = () => {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

const fieldClass = (hasError) =>
  `h-11 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary ${
    hasError ? 'border-danger' : 'border-border'
  }`
const labelClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'

const crearSchema = (stock) =>
  z
    .object({
      cantidadVencida: z.coerce.number({ message: 'Ingresa un número' }).min(0, 'No puede ser negativo'),
      nuevaFechaVencimiento: z.string().optional(),
    })
    .superRefine((valores, ctx) => {
      if (valores.cantidadVencida > stock) {
        ctx.addIssue({ code: 'custom', path: ['cantidadVencida'], message: `Solo hay ${formatNumber(stock)} en existencia` })
        return
      }
      const quedan = stock - valores.cantidadVencida > 0
      if (quedan && !valores.nuevaFechaVencimiento) {
        ctx.addIssue({ code: 'custom', path: ['nuevaFechaVencimiento'], message: 'Indica la fecha de lo que queda' })
      }
      if (valores.nuevaFechaVencimiento && valores.nuevaFechaVencimiento < hoyLocal()) {
        ctx.addIssue({ code: 'custom', path: ['nuevaFechaVencimiento'], message: 'La fecha no puede estar en el pasado' })
      }
    })

/**
 * Relevo de vencimiento: la clinica saca lo vencido y deja la fecha del siguiente
 * producto mas cercano a vencer. `item` = { id, nombre, stock, fechaVencimiento, unidad? }.
 * `tipo`: 'producto' (ventas) o 'insumo' (clinico). Sin `item` el dialogo esta cerrado.
 */
export default function ActualizarVencimientoDialog({ item, tipo = 'producto', onClose }) {
  return (
    <DialogRoot open={Boolean(item)} onOpenChange={(abierto) => { if (!abierto) onClose() }}>
      {item && <ContenidoDialogo key={item.id} item={item} tipo={tipo} onClose={onClose} />}
    </DialogRoot>
  )
}

function ContenidoDialogo({ item, tipo, onClose }) {
  const queryClient = useQueryClient()
  const stock = Number(item.stock) || 0
  const vencido = Boolean(item.fechaVencimiento) && String(item.fechaVencimiento).slice(0, 10) < hoyLocal()
  const esInsumo = tipo === 'insumo'

  const schema = useMemo(() => crearSchema(stock), [stock])
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    // Si ya vencio, lo habitual es que se haya vencido todo lo que habia.
    defaultValues: { cantidadVencida: vencido ? stock : 0, nuevaFechaVencimiento: '' },
  })

  const cantidadVencida = Number(useWatch({ control, name: 'cantidadVencida' })) || 0
  const quedan = stock - cantidadVencida
  const unidad = item.unidad ? ` ${item.unidad}` : ''

  const mutation = useMutation({
    mutationFn: (payload) =>
      esInsumo
        ? inventarioClinicoApi.relevarVencimiento(item.id, payload)
        : inventarioApi.relevarVencimiento(item.id, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Vencimiento actualizado')
      if (esInsumo) invalidateInventarioClinicoQueries(queryClient)
      else invalidateInventarioQueries(queryClient)
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible actualizar el vencimiento.')),
  })

  const onSubmit = (valores) =>
    mutation.mutate({
      cantidadVencida: valores.cantidadVencida,
      nuevaFechaVencimiento: stock - valores.cantidadVencida > 0 ? valores.nuevaFechaVencimiento : undefined,
    })

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Actualizar vencimiento</DialogTitle>
        <DialogDescription>
          {item.nombre}
          {item.fechaVencimiento && (
            <>
              {' · '}
              {vencido ? 'venció el ' : 'vence el '}
              {formatLongDate(item.fechaVencimiento)}
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4" noValidate>
        <div className="grid gap-1.5">
          <label htmlFor="av-cantidad" className={labelClass}>
            Unidades vencidas a retirar
          </label>
          <div className="flex gap-2">
            <input
              id="av-cantidad"
              type="number"
              inputMode="decimal"
              min="0"
              max={stock}
              step={esInsumo ? 'any' : '1'}
              className={`${fieldClass(Boolean(errors.cantidadVencida))} min-w-0 flex-1`}
              {...register('cantidadVencida')}
            />
            <button
              type="button"
              onClick={() => setValue('cantidadVencida', stock, { shouldValidate: true })}
              className="h-11 shrink-0 border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Todo ({formatNumber(stock)})
            </button>
          </div>
          {errors.cantidadVencida ? (
            <p className="text-xs text-danger">{errors.cantidadVencida.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              En existencia: {formatNumber(stock)}{unidad}. Déjalo en 0 si solo quieres corregir la fecha.
            </p>
          )}
        </div>

        {quedan > 0 && (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="av-fecha" className={labelClass}>
                Vencimiento de las {formatNumber(quedan)}{unidad} que quedan
              </label>
              <input
                id="av-fecha"
                type="date"
                min={hoyLocal()}
                className={fieldClass(Boolean(errors.nuevaFechaVencimiento))}
                {...register('nuevaFechaVencimiento')}
              />
              {errors.nuevaFechaVencimiento && (
                <p className="text-xs text-danger">{errors.nuevaFechaVencimiento.message}</p>
              )}
            </div>
            <VencimientosSiguientes
              productoId={esInsumo ? undefined : item.id}
              insumoClinicoId={esInsumo ? item.id : undefined}
              desde={hoyLocal()}
              onUsar={(fecha) => setValue('nuevaFechaVencimiento', fecha, { shouldValidate: true })}
            />
          </div>
        )}

        {quedan <= 0 && (
          <p className="border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            Se retira todo el stock: el producto queda sin existencias y sin fecha de vencimiento. Cuando
            registres la próxima compra tomará la fecha de esa factura.
          </p>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="h-11 border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="h-11 bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
