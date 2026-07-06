import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MOVIMIENTO_CAJA_MOTIVOS } from './cajaConstants'

const buildInitialForm = () => ({ tipo: 'egreso', monto: '', motivo: 'gasto_menor', observaciones: '' })

export default function MovimientoCajaModal({ open, onClose, registrarMovimientoMutation }) {
  const [form, setForm] = useState(buildInitialForm)

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setForm(buildInitialForm())
      onClose()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const monto = parseFloat(form.monto)
    if (!Number.isFinite(monto) || monto <= 0) return

    registrarMovimientoMutation.mutate(
      {
        tipo: form.tipo,
        monto,
        motivo: form.motivo,
        observaciones: form.observaciones.trim() || undefined,
      },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar movimiento de caja</DialogTitle>
          <DialogDescription>
            Ingresos o egresos manuales de efectivo durante el turno (no ventas).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((curr) => ({ ...curr, tipo: 'ingreso' }))}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                form.tipo === 'ingreso'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-border bg-card text-muted-foreground hover:border-emerald-200'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm((curr) => ({ ...curr, tipo: 'egreso' }))}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${
                form.tipo === 'egreso'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-border bg-card text-muted-foreground hover:border-red-200'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Egreso
            </button>
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monto</span>
            <input
              type="number"
              inputMode="numeric"
              min="0.01"
              step="1"
              value={form.monto}
              onChange={(event) => setForm((curr) => ({ ...curr, monto: event.target.value }))}
              placeholder="$ 0"
              autoFocus
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-right text-xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</span>
            <select
              value={form.motivo}
              onChange={(event) => setForm((curr) => ({ ...curr, motivo: event.target.value }))}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              {MOVIMIENTO_CAJA_MOTIVOS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observaciones (opcional)
            </span>
            <textarea
              value={form.observaciones}
              onChange={(event) => setForm((curr) => ({ ...curr, observaciones: event.target.value }))}
              placeholder="Detalle del movimiento"
              className="min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={registrarMovimientoMutation.isPending || !form.monto}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {registrarMovimientoMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Registrar movimiento'
            )}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
