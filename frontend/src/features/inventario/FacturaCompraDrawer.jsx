import { useDeferredValue, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react'
import MoneyInput from '@/components/shared/MoneyInput'
import ProductoComboBox from '@/components/shared/ProductoComboBox'
import { inventarioApi } from './inventarioApi'
import { CATEGORY_OPTIONS, UNIT_OPTIONS } from './useInventarioProductos'
import { Select } from '@/components/ui/select'

const PRODUCT_CATEGORY_OPTIONS = CATEGORY_OPTIONS.filter((o) => o.value !== 'todas')

const fieldClass = (hasError) =>
  `h-10 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary w-full ${
    hasError ? 'border-red-400' : 'border-border'
  }`

function AvisoProductoDuplicado({ nombre }) {
  const nombreDiferido = useDeferredValue(nombre.trim())

  const { data } = useQuery({
    queryKey: ['producto-combobox', nombreDiferido],
    queryFn: () => inventarioApi.obtenerProductos({ buscar: nombreDiferido, limite: 5 }),
    enabled: nombreDiferido.length > 1,
    placeholderData: (prev) => prev,
  })

  const coincidencia = (data?.productos || []).find(
    (p) => p.nombre.trim().toLowerCase() === nombreDiferido.toLowerCase()
  )

  if (!coincidencia) return null

  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      Ya existe un producto llamado &quot;{coincidencia.nombre}&quot; en el catálogo. Verifica que
      no sea el mismo antes de crear uno nuevo.
    </p>
  )
}

export default function FacturaCompraDrawer({
  open,
  editingFactura,
  form,
  setForm,
  onClose,
  onSubmit,
  isSaving,
  agregarItem,
  actualizarItem,
  seleccionarProductoItem,
  actualizarItemProductoNuevo,
  toggleItemEsNuevo,
  eliminarItem,
  totalCalculado,
  errorMsg,
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const titulo = editingFactura ? 'Editar factura de compra' : 'Nueva factura de compra'

  const formatCOP = (n) =>
    Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

  const itemsValidos = form.items.every((i) => {
    const productoValido = i.esNuevo
      ? Boolean(i.productoNuevo.nombre.trim() && i.productoNuevo.categoria && i.productoNuevo.unidadMedida)
      : Boolean(i.productoId)
    return productoValido && Number(i.cantidad) > 0
  })
  const plazoValido = form.tipoPago !== 'credito' || !!form.fechaPagoFinal
  const formularioValido = form.proveedor.trim() && form.fecha && itemsValidos && plazoValido

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
        aria-label={titulo}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[560px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
            {editingFactura && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingFactura.proveedor} — {editingFactura.fecha}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Datos cabecera */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Proveedor *</label>
              <input
                className={fieldClass(!form.proveedor.trim())}
                placeholder="Nombre del proveedor"
                value={form.proveedor}
                onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
                maxLength={200}
              />
              {!form.proveedor.trim() && (
                <p className="text-xs text-red-500">El proveedor es obligatorio</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Fecha de compra *</label>
              <input
                type="date"
                className={fieldClass(!form.fecha)}
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">N° factura proveedor</label>
              <input
                className={fieldClass(false)}
                placeholder="Opcional"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
              <textarea
                className="border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary w-full resize-none"
                rows={2}
                placeholder="Opcional"
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                maxLength={1000}
              />
            </div>

            {/* Tipo de pago */}
            <div className="col-span-2 flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Forma de pago *</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'contado', label: 'Contado', desc: 'Pago inmediato al recibir la mercancía' },
                  { value: 'credito', label: 'Crédito', desc: 'Se pagará antes de una fecha límite' },
                ].map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tipoPago: op.value,
                        fechaPagoFinal: op.value === 'contado' ? '' : f.fechaPagoFinal,
                      }))
                    }
                    className={`flex flex-col items-start gap-0.5 rounded border px-4 py-3 text-left transition ${
                      form.tipoPago === op.value
                        ? 'border-primary bg-primary/8 ring-1 ring-primary'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${form.tipoPago === op.value ? 'text-primary' : 'text-foreground'}`}>
                      {op.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">{op.desc}</span>
                  </button>
                ))}
              </div>

              {form.tipoPago === 'credito' && (
                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-xs font-medium text-muted-foreground">Fecha límite de pago *</label>
                  <input
                    type="date"
                    className={fieldClass(!form.fechaPagoFinal)}
                    value={form.fechaPagoFinal}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm((f) => ({ ...f, fechaPagoFinal: e.target.value }))}
                  />
                  {!form.fechaPagoFinal && (
                    <p className="text-xs text-red-500">Debes ingresar la fecha límite de pago</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Productos comprados</h3>
              <button
                type="button"
                onClick={agregarItem}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus size={14} /> Agregar ítem
              </button>
            </div>

            {form.items.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded">
                Sin ítems — agrega al menos uno
              </p>
            )}

            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="border border-border rounded p-3 space-y-2 bg-background">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Ítem {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-muted-foreground hover:text-red-500 transition"
                        aria-label="Eliminar ítem"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: false, label: 'Producto existente' },
                      { value: true, label: 'Producto nuevo' },
                    ].map((op) => (
                      <button
                        key={String(op.value)}
                        type="button"
                        onClick={() => {
                          if (Boolean(item.esNuevo) !== op.value) toggleItemEsNuevo(idx)
                        }}
                        className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${
                          Boolean(item.esNuevo) === op.value
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>

                  {item.esNuevo ? (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Nombre del producto *</label>
                        <input
                          className={fieldClass(!item.productoNuevo.nombre.trim())}
                          placeholder="Nombre del producto nuevo"
                          value={item.productoNuevo.nombre}
                          onChange={(e) => actualizarItemProductoNuevo(idx, 'nombre', e.target.value)}
                          maxLength={200}
                        />
                        {!item.productoNuevo.nombre.trim() && (
                          <p className="text-xs text-red-500">El nombre es obligatorio</p>
                        )}
                        {item.productoNuevo.nombre.trim() && (
                          <AvisoProductoDuplicado nombre={item.productoNuevo.nombre} />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Categoría *</label>
                          <Select
                            variant="field"
                            aria-label="Categoría del producto"
                            className={!item.productoNuevo.categoria ? 'border-red-300' : undefined}
                            placeholder="— Selecciona —"
                            value={item.productoNuevo.categoria}
                            onValueChange={(value) => actualizarItemProductoNuevo(idx, 'categoria', value)}
                            options={PRODUCT_CATEGORY_OPTIONS}
                          />
                          {!item.productoNuevo.categoria && (
                            <p className="text-xs text-red-500">Selecciona una categoría</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Unidad de medida *</label>
                          <Select
                            variant="field"
                            aria-label="Unidad de medida"
                            className={!item.productoNuevo.unidadMedida ? 'border-red-300' : undefined}
                            placeholder="— Selecciona —"
                            value={item.productoNuevo.unidadMedida}
                            onValueChange={(value) => actualizarItemProductoNuevo(idx, 'unidadMedida', value)}
                            options={UNIT_OPTIONS}
                          />
                          {!item.productoNuevo.unidadMedida && (
                            <p className="text-xs text-red-500">Selecciona una unidad</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se creará en el inventario con el precio unitario de este ítem como precio de compra
                        y cantidad inicial 0. Completa precio de venta, stock mínimo, laboratorio, etc. luego
                        desde Inventario &gt; Productos.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Producto *</label>
                      <ProductoComboBox
                        value={item.productoId}
                        productoSeleccionado={item.producto}
                        hasError={!item.productoId}
                        onChange={(id, producto) => seleccionarProductoItem(idx, producto)}
                        placeholder="Buscar producto..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Cantidad *</label>
                      <input
                        type="number"
                        min={1}
                        className={fieldClass(!(Number(item.cantidad) > 0))}
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(idx, 'cantidad', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Precio unitario (COP)</label>
                      <MoneyInput
                        value={item.precioUnitario}
                        onChange={(value) => actualizarItem(idx, 'precioUnitario', value)}
                        className={fieldClass(false)}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted-foreground">
                    Subtotal:{' '}
                    <span className="font-semibold text-foreground">
                      {formatCOP(Number(item.cantidad || 0) * Number(item.precioUnitario || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="text-sm text-red-500 rounded border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total estimado</span>
            <span className="text-lg font-bold text-foreground">{formatCOP(totalCalculado)}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded border border-border text-sm text-muted-foreground hover:bg-muted transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSaving || !formularioValido}
              className="flex-1 h-10 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando…' : editingFactura ? 'Guardar cambios' : 'Guardar borrador'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
