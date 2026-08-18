import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { formatNumber } from '@/features/dashboard/dashboardUtils'
import MoneyInput from '@/components/shared/MoneyInput'
import { CATEGORY_OPTIONS } from './useInsumosClinicos'
import { Select } from '@/components/ui/select'

// Unidades base para consumo clinico: fraccionables, no presentaciones enteras.
const UNIDAD_BASE_OPTIONS = [
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'mg', label: 'Miligramo (mg)' },
  { value: 'gr', label: 'Gramo (gr)' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'dosis', label: 'Dosis' },
]

const insumoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoria: z.enum(['medicamento', 'vacuna', 'insumo', 'antiparasitario', 'suplemento', 'otro']),
  unidadBase: z.string().min(1, 'La unidad base es requerida'),
  cantidadPresentacion: z.coerce.number().min(0.01, 'Debe ser mayor a 0'),
  unidadPresentacion: z.string().optional(),
  precioPresentacion: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  modoConsumo: z.enum(['por_dosis', 'por_receta']).default('por_receta'),
  stockMinimo: z.coerce.number().min(0).default(0),
  fechaVencimiento: z.string().optional(),
  lote: z.string().optional(),
  laboratorio: z.string().optional(),
})

const DEFAULT_VALUES = {
  nombre: '',
  categoria: 'insumo',
  unidadBase: 'ml',
  cantidadPresentacion: '',
  unidadPresentacion: '',
  precioPresentacion: '',
  precioVenta: '',
  modoConsumo: 'por_receta',
  stockMinimo: 0,
  fechaVencimiento: '',
  lote: '',
  laboratorio: '',
}

const MODO_CONSUMO_OPTIONS = [
  {
    value: 'por_receta',
    label: 'Dentro de un servicio',
    hint: 'Se descuenta al facturar un servicio que lo incluye en su receta.',
  },
  {
    value: 'por_dosis',
    label: 'Por dosis en la historia clínica',
    hint: 'El veterinario indica la cantidad aplicada y se descuenta al cerrar la historia.',
  },
]

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

// Motivos de salida manual: perdidas que no pasan por una factura.
const MERMA_MOTIVO_OPTIONS = [
  { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'otro', label: 'Otro (derrame, daño...)' },
]

export default function InsumoClinicoDrawer({
  open,
  editingInsumo,
  onClose,
  onSubmit,
  onRegistrarCompra,
  onRegistrarMerma,
  isPending,
  isPendingCompra,
  isPendingMerma,
}) {
  const [compraForm, setCompraForm] = useState({ cantidadPresentacion: '', unidadPresentacion: '', precioPresentacion: '' })
  const [compraOpen, setCompraOpen] = useState(false)
  const [mermaForm, setMermaForm] = useState({ cantidad: '', motivo: 'ajuste_inventario', observaciones: '' })
  const [mermaOpen, setMermaOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(insumoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const cantidadPresentacion = useWatch({ control, name: 'cantidadPresentacion' })
  const precioPresentacion = useWatch({ control, name: 'precioPresentacion' })
  const unidadBase = useWatch({ control, name: 'unidadBase' })

  const precioUnitarioCalculado =
    Number(cantidadPresentacion) > 0 ? Number(precioPresentacion || 0) / Number(cantidadPresentacion) : null

  useEffect(() => {
    if (!open) return
    if (editingInsumo) {
      reset({
        nombre: editingInsumo.nombre || '',
        categoria: editingInsumo.categoria || 'insumo',
        unidadBase: editingInsumo.unidadBase || 'ml',
        cantidadPresentacion: editingInsumo.cantidadPresentacion ?? '',
        unidadPresentacion: editingInsumo.unidadPresentacion || '',
        precioPresentacion: editingInsumo.precioPresentacion ?? '',
        precioVenta: editingInsumo.precioVenta ?? '',
        modoConsumo: editingInsumo.modoConsumo || 'por_receta',
        stockMinimo: editingInsumo.stockMinimo ?? 0,
        fechaVencimiento: editingInsumo.fechaVencimiento || '',
        lote: editingInsumo.lote || '',
        laboratorio: editingInsumo.laboratorio || '',
      })
      setCompraForm({ cantidadPresentacion: '', unidadPresentacion: editingInsumo.unidadPresentacion || '', precioPresentacion: '' })
      setCompraOpen(false)
      setMermaForm({ cantidad: '', motivo: 'ajuste_inventario', observaciones: '' })
      setMermaOpen(false)
    } else {
      reset(DEFAULT_VALUES)
    }
  }, [open, editingInsumo, reset])

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
  const unidadLabel = UNIDAD_BASE_OPTIONS.find((u) => u.value === unidadBase)?.value || unidadBase

  const compraValida =
    Number(compraForm.cantidadPresentacion) > 0 && Number(compraForm.precioPresentacion) >= 0

  function submitCompra() {
    if (!compraValida) return
    onRegistrarCompra?.(editingInsumo.id, {
      cantidadPresentacion: Number(compraForm.cantidadPresentacion),
      unidadPresentacion: compraForm.unidadPresentacion,
      precioPresentacion: Number(compraForm.precioPresentacion),
    })
  }

  const stockActual = Number(editingInsumo?.stock || 0)
  const mermaValida =
    Number(mermaForm.cantidad) > 0 && Number(mermaForm.cantidad) <= stockActual

  function submitMerma() {
    if (!mermaValida) return
    onRegistrarMerma?.(editingInsumo.id, {
      cantidad: Number(mermaForm.cantidad),
      motivo: mermaForm.motivo,
      observaciones: mermaForm.observaciones,
    })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={editingInsumo ? `Editar ${editingInsumo.nombre}` : 'Nuevo insumo clínico'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[480px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {editingInsumo ? 'Editar insumo clínico' : 'Nuevo insumo clínico'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editingInsumo
                ? 'La cantidad cambia registrando compras, mermas o ajustes.'
                : 'Indica la presentación comprada y Bourgelat calcula el costo por unidad.'}
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

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="insumo-clinico-drawer-form" className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Información básica
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="ic-nombre" className={labelClass}>Nombre del insumo *</label>
                <input
                  id="ic-nombre"
                  type="text"
                  placeholder="Ej. Lidocaina 2% inyectable"
                  className={fieldClass(errors.nombre)}
                  {...register('nombre')}
                />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="ic-categoria" className={labelClass}>Categoría *</label>
                  <Controller
                    name="categoria"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="ic-categoria"
                        aria-label="Categoría"
                        className={errors.categoria ? 'border-red-400' : undefined}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={CATEGORY_OPTIONS.filter((o) => o.value !== 'todas')}
                      />
                    )}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="ic-unidad-base" className={labelClass}>Unidad base *</label>
                  <Controller
                    name="unidadBase"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="ic-unidad-base"
                        aria-label="Unidad base"
                        className={errors.unidadBase ? 'border-red-400' : undefined}
                        disabled={Boolean(editingInsumo)}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={UNIDAD_BASE_OPTIONS}
                      />
                    )}
                  />
                </div>
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                La cantidad y el costo se llevan en esta unidad (ej. mililitros restantes), sin importar la presentación en la que se compre.
              </p>
            </div>

            {!editingInsumo && (
              <div className="grid gap-4 border-t border-border pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Presentación de compra
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label htmlFor="ic-cantidad-presentacion" className={labelClass}>
                      Cantidad en {unidadLabel} *
                    </label>
                    <input
                      id="ic-cantidad-presentacion"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ej. 100"
                      className={fieldClass(errors.cantidadPresentacion)}
                      {...register('cantidadPresentacion')}
                    />
                    {errors.cantidadPresentacion && (
                      <p className="text-xs text-red-600">{errors.cantidadPresentacion.message}</p>
                    )}
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="ic-unidad-presentacion" className={labelClass}>
                      Presentación (opcional)
                    </label>
                    <input
                      id="ic-unidad-presentacion"
                      type="text"
                      placeholder="Ej. frasco, caja"
                      className={fieldClass(false)}
                      {...register('unidadPresentacion')}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="ic-precio-presentacion" className={labelClass}>
                    Precio pagado por esta presentación *
                  </label>
                  <Controller
                    name="precioPresentacion"
                    control={control}
                    render={({ field }) => (
                      <MoneyInput
                        id="ic-precio-presentacion"
                        value={field.value}
                        onChange={field.onChange}
                        hasError={errors.precioPresentacion}
                        prefix="$"
                        placeholder="Ej. 50.000"
                      />
                    )}
                  />
                </div>

                {precioUnitarioCalculado !== null && (
                  <div className="flex items-center justify-between border border-border bg-muted px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Costo calculado por {unidadLabel}</span>
                    <span className="font-semibold text-foreground">
                      {formatCOP(precioUnitarioCalculado)} / {unidadLabel}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Cobro y consumo
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="ic-precio-venta" className={labelClass}>
                  Precio de venta por {unidadLabel}
                </label>
                <Controller
                  name="precioVenta"
                  control={control}
                  render={({ field }) => (
                    <MoneyInput
                      id="ic-precio-venta"
                      value={field.value}
                      onChange={field.onChange}
                      hasError={errors.precioVenta}
                      prefix="$"
                      placeholder="Ej. 900"
                    />
                  )}
                />
                <p className="text-[11px] text-muted-foreground">
                  Se usa al cobrar el insumo como línea propia en la factura. Déjalo en 0 si su
                  costo ya está incluido en el precio de un servicio.
                </p>
              </div>

              <div className="grid gap-1.5">
                <span className={labelClass}>¿Cómo se descuenta del inventario?</span>
                <div className="grid gap-2">
                  {MODO_CONSUMO_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-start gap-2.5 border border-border bg-card px-3 py-2.5 transition hover:bg-muted/60"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="mt-0.5"
                        {...register('modoConsumo')}
                      />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{option.label}</span>
                        <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {editingInsumo && (
              <div className="grid gap-4 border-t border-border pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Existencias
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <span className={labelClass}>Cantidad actual</span>
                    <div className="flex h-11 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {formatNumber(editingInsumo.stock || 0)} {unidadLabel}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <span className={labelClass}>Costo por {unidadLabel}</span>
                    <div className="flex h-11 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {formatCOP(editingInsumo.precioUnitarioBase || 0)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCompraOpen((v) => !v)}
                  className="flex w-full items-center gap-2 border border-dashed border-border bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80"
                >
                  <span className="text-base leading-none">{compraOpen ? '−' : '+'}</span>
                  {compraOpen ? 'Ocultar registro de compra' : 'Registrar nueva compra'}
                </button>

                {compraOpen && (
                  <div className="grid gap-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label className={labelClass}>Cantidad en {unidadLabel}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Ej. 100"
                          value={compraForm.cantidadPresentacion}
                          onChange={(e) => setCompraForm((f) => ({ ...f, cantidadPresentacion: e.target.value }))}
                          className={fieldClass(false)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className={labelClass}>Presentación (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ej. frasco"
                          value={compraForm.unidadPresentacion}
                          onChange={(e) => setCompraForm((f) => ({ ...f, unidadPresentacion: e.target.value }))}
                          className={fieldClass(false)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <label className={labelClass}>Precio pagado por esta presentación</label>
                      <MoneyInput
                        value={compraForm.precioPresentacion}
                        onChange={(value) => setCompraForm((f) => ({ ...f, precioPresentacion: value }))}
                        prefix="$"
                        placeholder="Ej. 50.000"
                        className={`${fieldClass(false)} pl-7 w-full`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={submitCompra}
                      disabled={!compraValida || isPendingCompra}
                      className="border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPendingCompra ? 'Registrando...' : 'Registrar compra y recalcular costo'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMermaOpen((v) => !v)}
                  className="flex w-full items-center gap-2 border border-dashed border-border bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80"
                >
                  <span className="text-base leading-none">{mermaOpen ? '−' : '+'}</span>
                  {mermaOpen ? 'Ocultar merma o ajuste' : 'Registrar merma o ajuste'}
                </button>

                {mermaOpen && (
                  <div className="grid gap-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label className={labelClass}>Cantidad a descontar ({unidadLabel})</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={stockActual}
                          placeholder="Ej. 5"
                          value={mermaForm.cantidad}
                          onChange={(e) => setMermaForm((f) => ({ ...f, cantidad: e.target.value }))}
                          className={fieldClass(false)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className={labelClass}>Motivo</label>
                        <Select
                          variant="field"
                          aria-label="Motivo de la merma"
                          value={mermaForm.motivo}
                          onValueChange={(value) => setMermaForm((f) => ({ ...f, motivo: value }))}
                          options={MERMA_MOTIVO_OPTIONS}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <label className={labelClass}>Observaciones (opcional)</label>
                      <input
                        type="text"
                        maxLength={255}
                        placeholder="Ej. frasco vencido lote 4432"
                        value={mermaForm.observaciones}
                        onChange={(e) => setMermaForm((f) => ({ ...f, observaciones: e.target.value }))}
                        className={fieldClass(false)}
                      />
                    </div>
                    {Number(mermaForm.cantidad) > stockActual ? (
                      <p className="text-xs text-red-600">
                        No puedes descontar más de la cantidad actual ({formatNumber(stockActual)} {unidadLabel}).
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={submitMerma}
                      disabled={!mermaValida || isPendingMerma}
                      className="border border-red-200 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPendingMerma ? 'Registrando...' : 'Descontar del inventario'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 border-t border-border pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Alertas y datos del lote
              </p>
              <div className="grid gap-1.5">
                <label htmlFor="ic-stock-min" className={labelClass}>
                  Avisar cuando quede (en {unidadLabel})
                </label>
                <input
                  id="ic-stock-min"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className={fieldClass(errors.stockMinimo)}
                  {...register('stockMinimo')}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="ic-laboratorio" className={labelClass}>Laboratorio</label>
                  <input id="ic-laboratorio" type="text" className={fieldClass(false)} {...register('laboratorio')} />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="ic-lote" className={labelClass}>Lote</label>
                  <input id="ic-lote" type="text" className={fieldClass(false)} {...register('lote')} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="ic-vencimiento" className={labelClass}>Fecha de vencimiento</label>
                <input id="ic-vencimiento" type="date" className={fieldClass(false)} {...register('fechaVencimiento')} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="insumo-clinico-drawer-form"
            disabled={isPending}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : editingInsumo ? 'Actualizar insumo' : 'Guardar insumo'}
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
