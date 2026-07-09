import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X } from 'lucide-react'

const fieldClass = (hasError) =>
  `h-10 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary w-full ${
    hasError ? 'border-red-400' : 'border-border'
  }`

const labelClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'

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
  insumos: [buildBlankRow()],
})

export default function ServicioDrawer({ open, editingServicio, onClose, onSubmit, isPending, insumosDisponibles = [] }) {
  const [form, setForm] = useState(buildInitialForm)

  useEffect(() => {
    if (!open) return
    if (editingServicio) {
      setForm({
        nombre: editingServicio.nombre || '',
        categoria: editingServicio.categoria || '',
        descripcion: editingServicio.descripcion || '',
        precioVenta: editingServicio.precioVenta ?? '',
        insumos: (editingServicio.insumos || []).map((i) => ({
          rowId: i.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          insumoClinicoId: i.insumoClinicoId,
          cantidadConsumida: i.cantidadConsumida,
        })),
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

  const filasValidas = form.insumos.filter((row) => row.insumoClinicoId && Number(row.cantidadConsumida) > 0)
  const formularioValido = form.nombre.trim() && Number(form.precioVenta) >= 0 && filasValidas.length > 0

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
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[560px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define el precio de venta y los insumos clinicos que consume cada vez que se factura.
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form id="servicio-drawer-form" className="flex-1 overflow-y-auto px-5 py-5 space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelClass}>Nombre del servicio *</label>
              <input
                className={fieldClass(!form.nombre.trim())}
                placeholder="Ej. Consulta general, Esterilizacion canina"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                maxLength={160}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Categoria</label>
              <input
                className={fieldClass(false)}
                placeholder="Ej. Consulta, Cirugia"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Precio de venta *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={fieldClass(!(Number(form.precioVenta) >= 0))}
                placeholder="0"
                value={form.precioVenta}
                onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))}
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className={labelClass}>Descripcion</label>
              <textarea
                className="min-h-[70px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Insumos que consume
              </p>
              <button
                type="button"
                onClick={agregarFila}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar insumo
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {form.insumos.map((row) => {
                const insumo = insumoPorId(row.insumoClinicoId)
                return (
                  <div key={row.rowId} className="flex items-start gap-2 border border-border bg-muted/40 p-3">
                    <select
                      className={`${fieldClass(false)} flex-1`}
                      value={row.insumoClinicoId}
                      onChange={(e) => actualizarFila(row.rowId, 'insumoClinicoId', e.target.value)}
                    >
                      <option value="">Selecciona un insumo</option>
                      {insumosDisponibles.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidadBase})
                        </option>
                      ))}
                    </select>
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
                        <span className="text-[11px] text-muted-foreground">{insumo.unidadBase}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarFila(row.rowId)}
                      className="mt-1 text-muted-foreground hover:text-red-600"
                      aria-label="Quitar insumo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border border-border bg-muted px-3 py-2 text-xs">
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
          </div>
        </form>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="servicio-drawer-form"
            disabled={isPending || !formularioValido}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : editingServicio ? 'Actualizar servicio' : 'Guardar servicio'}
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
