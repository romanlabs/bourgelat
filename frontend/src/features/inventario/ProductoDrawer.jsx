import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ImageOff, Upload, X } from 'lucide-react'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from './useInventarioProductos'
import { Select } from '@/components/ui/select'
import VencimientosSiguientes from './VencimientosSiguientes'

const MAX_PHOTO_BYTES = 4 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoInputKey, setPhotoInputKey] = useState(0)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
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
      setPhotoPreview(editingProduct.imagenUrl || '')
    } else {
      reset(DEFAULT_VALUES)
      setAdditionalOpen(false)
      setPhotoPreview('')
    }
    setPhotoFile(null)
    setPhotoInputKey((k) => k + 1)
  }, [open, editingProduct, reset])

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('La foto debe estar en formato JPG, PNG o WEBP.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('La foto supera el máximo permitido de 4 MB.')
      e.target.value = ''
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleFormSubmit(formData) {
    onSubmit({ ...formData, photoFile, imagenUrlActual: editingProduct?.imagenUrl || '' })
  }

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const fieldClass = (hasError) =>
    `h-12 rounded-lg border bg-card px-3 text-base lg:h-11 lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
      hasError ? 'border-danger' : 'border-input'
    }`

  const labelClass = 'text-[13px] font-semibold text-muted-foreground'
  const unidadLabel = UNIT_OPTIONS.find((u) => u.value === unidadMedida)?.label?.toLowerCase() || 'unidad'

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-foreground/50 transition-opacity duration-300 ${
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
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3 lg:gap-4 lg:px-6 lg:pb-3 lg:pt-5">
          <div>
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {editingProduct
                ? 'Ajusta los datos. La cantidad se modifica desde movimientos.'
                : 'Registro rápido para dejar el inventario listo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="flex h-11 w-11 lg:h-9 lg:w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 lg:px-6 lg:py-4">
          <form id="product-drawer-form" className="grid gap-6" onSubmit={handleSubmit(handleFormSubmit)}>
            {/* Seccion: Informacion basica */}
            <div className="grid gap-4">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Información básica
              </p>

              <div className="grid gap-1.5">
                <span className={labelClass}>Foto del producto</span>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {photoPreview
                      ? <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                      : <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                    }
                  </div>
                  <div className="grid gap-1">
                    <label htmlFor={`producto-foto-${photoInputKey}`} className="inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-[13px] font-semibold text-foreground transition hover:bg-muted">
                      <Upload className="h-3.5 w-3.5" />
                      {photoPreview ? 'Cambiar foto' : 'Seleccionar foto'}
                    </label>
                    <input
                      id={`producto-foto-${photoInputKey}`}
                      key={photoInputKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="sr-only"
                    />
                    <p className="text-[13px] text-muted-foreground">JPG, PNG o WEBP · máx 4 MB</p>
                  </div>
                </div>
              </div>

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
                {errors.nombre && <p className="text-[13px] text-danger">{errors.nombre.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="d-categoria" className={labelClass}>
                    Categoría *
                  </label>
                  <Controller
                    name="categoria"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="d-categoria"
                        aria-label="Categoría"
                        className={errors.categoria ? 'border-danger' : undefined}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={CATEGORY_OPTIONS.filter((o) => o.value !== 'todas')}
                      />
                    )}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="d-unidad" className={labelClass}>
                    Se cuenta por *
                  </label>
                  <Controller
                    name="unidadMedida"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="d-unidad"
                        aria-label="Se cuenta por"
                        className={errors.unidadMedida ? 'border-danger' : undefined}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={UNIT_OPTIONS}
                      />
                    )}
                  />
                </div>
              </div>
              <p className="text-[13px] leading-5 text-muted-foreground">
                Elige cómo cuentas una unidad en la estantería. La cantidad baja de a una cada venta.
              </p>
            </div>

            {/* Seccion: Existencias */}
            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Existencias
              </p>

              <div className="grid items-start grid-cols-2 gap-3 sm:gap-4">
                <div className="grid gap-1.5">
                  <label htmlFor="d-stock" className={labelClass}>
                    {editingProduct ? 'Cantidad actual' : 'Cantidad inicial'}
                  </label>
                  {editingProduct ? (
                    <div className="flex h-12 lg:h-11 items-center rounded-xl bg-muted px-3 text-sm text-muted-foreground">
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
              <p className="text-[13px] leading-5 text-muted-foreground">
                Bourgelat te avisa cuando la cantidad llegue a ese número o menos.
              </p>
            </div>

            {/* Seccion: Precios */}
            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Precios
              </p>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  El precio de venta está por debajo del costo.
                </div>
              ) : margen !== null && Number(precioCompra) > 0 ? (
                <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-[13px]">
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
                className="flex h-12 lg:h-11 w-full items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  {editingProduct && (
                    <VencimientosSiguientes
                      productoId={editingProduct.id}
                      onUsar={(fecha, lote) => {
                        setValue('fechaVencimiento', fecha, { shouldDirty: true })
                        setValue('lote', lote, { shouldDirty: true })
                      }}
                    />
                  )}
                  <label htmlFor="d-formula" className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted px-3 py-3 text-sm text-foreground transition hover:bg-muted/80">
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
        <div className="flex gap-3 border-t border-border/60 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:px-6 lg:py-4">
          <button
            type="submit"
            form="product-drawer-form"
            disabled={isPending}
            className="flex-1 inline-flex h-12 lg:h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : editingProduct ? 'Actualizar producto' : 'Guardar producto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 lg:h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
