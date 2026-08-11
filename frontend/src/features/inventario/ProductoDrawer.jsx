import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, X } from 'lucide-react'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { CATEGORY_OPTIONS } from './useInventarioProductos'

// Unidades pensadas para como una clinica veterinaria cuenta su inventario:
// presentaciones que se cuentan enteras en la estanteria, no volumen/peso fraccional.
const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'caja', label: 'Caja' },
  { value: 'sobre', label: 'Sobre' },
  { value: 'tableta', label: 'Tableta' },
  { value: 'ampolla', label: 'Ampolla / Vial' },
  { value: 'dosis', label: 'Dosis' },
  { value: 'pipeta', label: 'Pipeta' },
  { value: 'bolsa', label: 'Bolsa' },
]

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoria: z.enum(['medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento', 'accesorio', 'otro']),
  unidadMedida: z.string().min(1, 'La unidad es requerida'),
  stock: z.coerce.number().min(0).default(0),
  stockMinimo: z.coerce.number().min(0).default(5),
  precioCompra: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  fechaVencimiento: z.string().optional(),
  lote: z.string().optional(),
  laboratorio: z.string().optional(),
  requiereFormula: z.boolean().default(false),
})

const DEFAULT_VALUES = {
  nombre: '',
  categoria: 'medicamento',
  unidadMedida: 'unidad',
  stock: 0,
  stockMinimo: 5,
  precioCompra: 0,
  precioVenta: 0,
  fechaVencimiento: '',
  lote: '',
  laboratorio: '',
  requiereFormula: false,
}

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export default function ProductoDrawer({ open, editingProduct, onClose, onSubmit, isPending }) {
  const [additionalOpen, setAdditionalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const precioCompra = useWatch({ control, name: 'precioCompra' })
  const precioVenta = useWatch({ control, name: 'precioVenta' })
  const unidadMedida = useWatch({ control, name: 'unidadMedida' })

  const ganancia = Number(precioVenta || 0) - Number(precioCompra || 0)
  const margen = Number(precioVenta) > 0 ? (ganancia / Number(precioVenta)) * 100 : null
  const ventaBajoCosto = Number(precioVenta) > 0 && Number(precioCompra) > 0 && ganancia < 0

  useEffect(() => {
    if (!open) return
    if (editingProduct) {
      reset({
        nombre: editingProduct.nombre || '',
        categoria: editingProduct.categoria || 'medicamento',
        unidadMedida: editingProduct.unidadMedida || 'unidad',
        stock: editingProduct.stock ?? 0,
        stockMinimo: editingProduct.stockMinimo ?? 5,
        precioCompra: editingProduct.precioCompra ?? 0,
        precioVenta: editingProduct.precioVenta ?? 0,
        fechaVencimiento: editingProduct.fechaVencimiento || '',
        lote: editingProduct.lote || '',
        laboratorio: editingProduct.laboratorio || '',
        requiereFormula: Boolean(editingProduct.requiereFormula),
      })
      setAdditionalOpen(
        Boolean(editingProduct.laboratorio || editingProduct.lote || editingProduct.fechaVencimiento || editingProduct.requiereFormula)
      )
    } else {
      reset(DEFAULT_VALUES)
      setAdditionalOpen(false)
    }
  }, [open, editingProduct, reset])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const fieldClass = (hasError) =>
    `h-11 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary ${
      hasError ? 'border-red-400' : 'border-border'
    }`

  const labelClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'
  const unidadLabel = UNIT_OPTIONS.find((u) => u.value === unidadMedida)?.label?.toLowerCase() || 'unidad'

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editingProduct ? `Editar ${editingProduct.nombre}` : 'Nuevo producto'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editingProduct
                ? 'Ajusta los datos. La cantidad se modifica desde movimientos.'
                : 'Registro rápido para dejar el inventario listo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="product-drawer-form" className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Seccion: Informacion basica */}
            <div className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Información básica
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="d-nombre" className={labelClass}>
                  Nombre del producto *
                </label>
                <input
                  id="d-nombre"
                  type="text"
                  placeholder="Ej. Meloxicam suspensión oral"
                  className={fieldClass(errors.nombre)}
                  {...register('nombre')}
                />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-categoria" className={labelClass}>
                    Categoría *
                  </label>
                  <select
                    id="d-categoria"
                    className={fieldClass(errors.categoria)}
                    {...register('categoria')}
                  >
                    {CATEGORY_OPTIONS.filter((o) => o.value !== 'todas').map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-unidad" className={labelClass}>
                    Se cuenta por *
                  </label>
                  <select
                    id="d-unidad"
                    className={fieldClass(errors.unidadMedida)}
                    {...register('unidadMedida')}
                  >
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Elige cómo cuentas una unidad en la estantería. La cantidad baja de a una cada venta.
              </p>
            </div>

            {/* Seccion: Existencias */}
            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Existencias
              </p>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-stock" className={labelClass}>
                    {editingProduct ? 'Cantidad actual' : 'Cantidad inicial'}
                  </label>
                  {editingProduct ? (
                    <div className="flex h-11 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {formatNumber(editingProduct.stock || 0)} {unidadLabel}
                    </div>
                  ) : (
                    <Controller
                      name="stock"
                      control={control}
                      render={({ field }) => (
                        <MoneyInput
                          id="d-stock"
                          value={field.value}
                          onChange={field.onChange}
                          hasError={errors.stock}
                          placeholder="0"
                        />
                      )}
                    />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-stock-min" className={labelClass}>
                    Avisar cuando quede
                  </label>
                  <Controller
                    name="stockMinimo"
                    control={control}
                    render={({ field }) => (
                      <MoneyInput
                        id="d-stock-min"
                        value={field.value}
                        onChange={field.onChange}
                        hasError={errors.stockMinimo}
                        placeholder="5"
                      />
                    )}
                  />
                </div>
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Bourgelat te avisa cuando la cantidad llegue a ese número o menos.
              </p>
            </div>

            {/* Seccion: Precios */}
            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Precios
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-precio-compra" className={labelClass}>
                    Precio de compra
                  </label>
                  <Controller
                    name="precioCompra"
                    control={control}
                    render={({ field }) => (
                      <MoneyInput
                        id="d-precio-compra"
                        value={field.value}
                        onChange={field.onChange}
                        hasError={errors.precioCompra}
                        prefix="$"
                        placeholder="0"
                      />
                    )}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-precio-venta" className={labelClass}>
                    Precio de venta
                  </label>
                  <Controller
                    name="precioVenta"
                    control={control}
                    render={({ field }) => (
                      <MoneyInput
                        id="d-precio-venta"
                        value={field.value}
                        onChange={field.onChange}
                        hasError={errors.precioVenta || ventaBajoCosto}
                        prefix="$"
                        placeholder="0"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Ganancia / margen calculado */}
              {ventaBajoCosto ? (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  El precio de venta está por debajo del costo.
                </div>
              ) : margen !== null && Number(precioCompra) > 0 ? (
                <div className="flex items-center justify-between border border-border bg-muted px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Ganancia por unidad</span>
                  <span className="font-semibold text-foreground">
                    {formatCOP(ganancia)}
                    <span className="ml-1.5 text-primary">({margen.toFixed(0)}% margen)</span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Seccion: Informacion adicional (colapsable) */}
            <div className="border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setAdditionalOpen((v) => !v)}
                className="flex w-full items-center gap-2 border border-dashed border-border bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80"
              >
                <span className="text-base leading-none">{additionalOpen ? '−' : '+'}</span>
                {additionalOpen ? 'Ocultar lote, laboratorio y vencimiento' : 'Agregar lote, laboratorio y vencimiento'}
              </button>

              {additionalOpen && (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label htmlFor="d-laboratorio" className={labelClass}>
                        Laboratorio
                      </label>
                      <input
                        id="d-laboratorio"
                        type="text"
                        placeholder="Ej. Bayer"
                        className={fieldClass(false)}
                        {...register('laboratorio')}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="d-lote" className={labelClass}>
                        Lote
                      </label>
                      <input
                        id="d-lote"
                        type="text"
                        placeholder="Ej. LOT-2024-001"
                        className={fieldClass(false)}
                        {...register('lote')}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="d-vencimiento" className={labelClass}>
                      Fecha de vencimiento
                    </label>
                    <input
                      id="d-vencimiento"
                      type="date"
                      className={fieldClass(false)}
                      {...register('fechaVencimiento')}
                    />
                  </div>
                  <label htmlFor="d-formula" className="flex cursor-pointer items-center gap-3 border border-border bg-muted px-3 py-3 text-sm text-foreground transition hover:bg-muted/80">
                    <input
                      id="d-formula"
                      type="checkbox"
                      {...register('requiereFormula')}
                    />
                    Requiere fórmula médica
                  </label>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="product-drawer-form"
            disabled={isPending}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : editingProduct ? 'Actualizar producto' : 'Guardar producto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
