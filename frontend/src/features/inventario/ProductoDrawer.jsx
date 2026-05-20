import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import { CATEGORY_OPTIONS } from './useInventarioProductos'

const UNIT_OPTIONS_LIST = ['unidad', 'caja', 'frasco', 'ml', 'kg', 'bolsa']

const productoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoria: z.enum(['medicamento', 'vacuna', 'insumo', 'alimento', 'antiparasitario', 'suplemento', 'accesorio', 'otro']),
  unidadMedida: z.enum(['unidad', 'caja', 'frasco', 'ml', 'kg', 'bolsa']),
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

export default function ProductoDrawer({ open, editingProduct, onClose, onSubmit, isPending }) {
  const [additionalOpen, setAdditionalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productoSchema),
    defaultValues: DEFAULT_VALUES,
  })

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

  return (
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
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] sm:border-l sm:border-border ${
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
                ? 'Ajusta los datos. El stock se modifica desde movimientos.'
                : 'Alta rapida para dejar el inventario listo.'}
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
          <form id="product-drawer-form" className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Seccion: Informacion basica */}
            <div className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Informacion basica
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="d-nombre" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nombre del producto *
                </label>
                <input
                  id="d-nombre"
                  type="text"
                  placeholder="Ej. Meloxicam suspension oral"
                  className={fieldClass(errors.nombre)}
                  {...register('nombre')}
                />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-categoria" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Categoria *
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
                  {errors.categoria && <p className="text-xs text-red-600">{errors.categoria.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-unidad" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Unidad de medida *
                  </label>
                  <select
                    id="d-unidad"
                    className={fieldClass(errors.unidadMedida)}
                    {...register('unidadMedida')}
                  >
                    {UNIT_OPTIONS_LIST.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seccion: Stock y precios */}
            <div className="grid gap-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Stock y precios
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-stock" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {editingProduct ? 'Stock actual' : 'Stock inicial'}
                  </label>
                  {editingProduct ? (
                    <div className="flex h-11 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {formatNumber(editingProduct.stock || 0)} unidades
                    </div>
                  ) : (
                    <input
                      id="d-stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      className={fieldClass(errors.stock)}
                      {...register('stock')}
                    />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-stock-min" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Stock minimo
                  </label>
                  <input
                    id="d-stock-min"
                    type="number"
                    min="0"
                    placeholder="5"
                    className={fieldClass(errors.stockMinimo)}
                    {...register('stockMinimo')}
                  />
                  <p className="text-[11px] text-muted-foreground">Alerta cuando baje de este numero</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-precio-compra" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Precio compra
                  </label>
                  <input
                    id="d-precio-compra"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className={fieldClass(errors.precioCompra)}
                    {...register('precioCompra')}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-precio-venta" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Precio venta
                  </label>
                  <input
                    id="d-precio-venta"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className={fieldClass(errors.precioVenta)}
                    {...register('precioVenta')}
                  />
                </div>
              </div>
            </div>

            {/* Seccion: Informacion adicional (colapsable) */}
            <div className="border-t border-border pt-4">
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
                      <label htmlFor="d-laboratorio" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                      <label htmlFor="d-lote" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                    <label htmlFor="d-vencimiento" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                    Requiere formula medica
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
    </>
  )
}
