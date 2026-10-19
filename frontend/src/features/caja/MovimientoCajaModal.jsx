import { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import MoneyInput from '@/components/shared/MoneyInput'
import { MOVIMIENTO_CAJA_MOTIVOS } from './cajaConstants'
import { Select } from '@/components/ui/select'

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
    const monto = parseInt(form.monto, 10)
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
            Entradas o salidas de efectivo que no son ventas, como un gasto menor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div role="group" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((curr) => ({ ...curr, tipo: 'ingreso' }))}
              aria-pressed={form.tipo === 'ingreso'}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                form.tipo === 'ingreso'
                  ? 'bg-success-soft text-success'
                  : 'bg-secondary text-secondary-foreground hover:brightness-95'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm((curr) => ({ ...curr, tipo: 'egreso' }))}
              aria-pressed={form.tipo === 'egreso'}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                form.tipo === 'egreso'
                  ? 'bg-danger-soft text-danger'
                  : 'bg-secondary text-secondary-foreground hover:brightness-95'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Egreso
            </button>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Monto</span>
            <MoneyInput
              value={form.monto}
              onChange={(value) => setForm((curr) => ({ ...curr, monto: value === 0 ? '' : String(value) }))}
              placeholder="$ 0"
              autoFocus
              className="h-14 w-full rounded-lg border border-input bg-card px-4 text-right text-2xl font-semibold tracking-[-0.02em] tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Motivo</span>
            <Select
              variant="field"
              aria-label="Motivo del movimiento"
              className="rounded-lg"
              value={form.motivo}
              onValueChange={(value) => setForm((curr) => ({ ...curr, motivo: value }))}
              options={MOVIMIENTO_CAJA_MOTIVOS}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">
              Observaciones (opcional)
            </span>
            <textarea
              value={form.observaciones}
              onChange={(event) => setForm((curr) => ({ ...curr, observaciones: event.target.value }))}
              placeholder="Detalle del movimiento"
              className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <button
            type="submit"
            disabled={registrarMovimientoMutation.isPending || !form.monto}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-base disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
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
