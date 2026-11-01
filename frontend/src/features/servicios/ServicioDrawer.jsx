import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X } from 'lucide-react'
import MoneyInput from '@/components/shared/MoneyInput'
import { Select } from '@/components/ui/select'

const fieldClass = (hasError) =>
  `h-12 w-full rounded-lg border bg-card px-3 text-base lg:h-11 lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
    hasError ? 'border-danger' : 'border-input'
  }`

const labelClass = 'text-[13px] font-semibold text-muted-foreground'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

const buildBlankRow = () => ({
  rowId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  insumoClinicoId: '',
  cantidadConsumida: '',
})

const buildInitialForm = () => ({
  nombre: '',
  categoria: '',
  descripcion: '',
  precioVenta: '',
  consumeInsumos: true,
  insumos: [buildBlankRow()],
})

export default function ServicioDrawer({ open, editingServicio, onClose, onSubmit, isPending, insumosDisponibles = [] }) {
  const [form, setForm] = useState(buildInitialForm)

  useEffect(() => {
    if (!open) return
    if (editingServicio) {
      const receta = editingServicio.insumos || []
      setForm({
        nombre: editingServicio.nombre || '',
        categoria: editingServicio.categoria || '',
        descripcion: editingServicio.descripcion || '',
        precioVenta: editingServicio.precioVenta ?? '',
        // Sin columna propia: un servicio consume insumos si su receta tiene filas.
        consumeInsumos: receta.length > 0,
        insumos: receta.length > 0
          ? receta.map((i) => ({
            rowId: i.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            insumoClinicoId: i.insumoClinicoId,
            cantidadConsumida: i.cantidadConsumida,
          }))
          : [buildBlankRow()],
      })
    } else {
      setForm(buildInitialForm())
    }
  }, [open, editingServicio])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const agregarFila = () => {
    setForm((f) => ({ ...f, insumos: [...f.insumos, buildBlankRow()] }))
  }

  const actualizarFila = (rowId, campo, valor) => {
    setForm((f) => ({
      ...f,
      insumos: f.insumos.map((row) => (row.rowId === rowId ? { ...row, [campo]: valor } : row)),
    }))
  }

  const eliminarFila = (rowId) => {
    setForm((f) => ({ ...f, insumos: f.insumos.filter((row) => row.rowId !== rowId) }))
  }

  const insumoPorId = (id) => insumosDisponibles.find((i) => i.id === id)

  const costoEstimado = form.insumos.reduce((acc, row) => {
    const insumo = insumoPorId(row.insumoClinicoId)
    if (!insumo || !row.cantidadConsumida) return acc
    return acc + Number(insumo.precioUnitarioBase || 0) * Number(row.cantidadConsumida || 0)
  }, 0)

  // Apagar el interruptor es una decisión explícita: así una cirugía no queda
  // sin receta por olvido y deja de descontar inventario sin que nadie lo note.
  const filasValidas = form.consumeInsumos
    ? form.insumos.filter((row) => row.insumoClinicoId && Number(row.cantidadConsumida) > 0)
    : []
  const formularioValido =
    form.nombre.trim() && Number(form.precioVenta) >= 0 && (!form.consumeInsumos || filasValidas.length > 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formularioValido) return
    onSubmit({
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      descripcion: form.descripcion,
      precioVenta: Number(form.precioVenta),
      insumos: filasValidas.map((row) => ({
        insumoClinicoId: row.insumoClinicoId,
        cantidadConsumida: Number(row.cantidadConsumida),
      })),
    })
  }

  const titulo = editingServicio ? 'Editar servicio' : 'Nuevo servicio'

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-foreground/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[560px] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3 lg:gap-4 lg:px-6 lg:pb-3 lg:pt-5">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">{titulo}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Define el precio de venta y, si aplica, los insumos clínicos que consume cada vez que se factura.
            </p>
          </div>
          <button onClick={onClose} className="flex h-11 w-11 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form id="servicio-drawer-form" className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 lg:px-6 lg:py-4 space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelClass}>Nombre del servicio *</label>
              <input
                className={fieldClass(!form.nombre.trim())}
                placeholder="Ej. Consulta general, Esterilización canina"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                maxLength={160}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Categoría</label>
              <input
                className={fieldClass(false)}
                placeholder="Ej. Consulta, Cirugía"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Precio de venta *</label>
              <MoneyInput
                value={form.precioVenta}
                onChange={(value) => setForm((f) => ({ ...f, precioVenta: value }))}
                prefix="$"
                placeholder="0"
                className={`${fieldClass(!(Number(form.precioVenta) >= 0))} pl-7`}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelClass}>Descripción</label>
              <textarea
                className="min-h-[70px] rounded-lg border border-input bg-card px-3 py-2.5 text-base lg:text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.consumeInsumos}
                aria-label="Consume insumos del inventario clínico"
                onClick={() => setForm((f) => ({ ...f, consumeInsumos: !f.consumeInsumos }))}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
                  form.consumeInsumos ? 'bg-primary' : 'bg-muted-foreground/25'
                }`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-card transition-transform ${form.consumeInsumos ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <p className="text-sm font-semibold text-foreground">Consume insumos del inventario clínico</p>
            </div>

            {form.consumeInsumos ? (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-muted-foreground">
                    Insumos que consume
                  </p>
                  <button
                    type="button"
                    onClick={agregarFila}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar insumo
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {form.insumos.map((row) => {
                    const insumo = insumoPorId(row.insumoClinicoId)
                    return (
                      <div key={row.rowId} className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                        <Select
                          variant="field"
                          aria-label="Insumo"
                          className="flex-1"
                          placeholder="Selecciona un insumo"
                          value={row.insumoClinicoId}
                          onValueChange={(value) => actualizarFila(row.rowId, 'insumoClinicoId', value)}
                          options={insumosDisponibles.map((i) => ({
                            value: i.id,
                            label: `${i.nombre} (${i.unidadBase})`,
                          }))}
                        />
                        <div className="flex w-32 flex-col gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Cantidad"
                            className={fieldClass(false)}
                            value={row.cantidadConsumida}
                            onChange={(e) => actualizarFila(row.rowId, 'cantidadConsumida', e.target.value)}
                          />
                          {insumo && (
                            <span className="text-[13px] text-muted-foreground">{insumo.unidadBase}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarFila(row.rowId)}
                          className="mt-1 text-muted-foreground hover:text-danger"
                          aria-label="Quitar insumo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-[13px]">
                  <span className="text-muted-foreground">Costo estimado de insumos</span>
                  <span className="font-semibold text-foreground">
                    {formatCOP(costoEstimado)}
                    {Number(form.precioVenta) > 0 && (
                      <span className="ml-1.5 text-primary">
                        ({(((Number(form.precioVenta) - costoEstimado) / Number(form.precioVenta)) * 100).toFixed(0)}% margen)
                      </span>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-[13px] leading-5 text-muted-foreground">
                Al facturarlo no se descontará nada del inventario. Lo que uses en consulta regístralo en la historia clínica.
              </p>
            )}
          </div>
        </form>

        <div className="flex gap-3 border-t border-border/60 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:px-6 lg:py-4">
          <button
            type="submit"
            form="servicio-drawer-form"
            disabled={isPending || !formularioValido}
            className="flex-1 inline-flex h-12 lg:h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : editingServicio ? 'Actualizar servicio' : 'Guardar servicio'}
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
