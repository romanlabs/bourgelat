import { useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function AperturaTurnoModal({ open, onClose, abrirTurnoMutation }) {
  const [montoInicial, setMontoInicial] = useState('')

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setMontoInicial('')
      onClose()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const monto = parseFloat(montoInicial)
    if (!Number.isFinite(monto) || monto < 0) return

    abrirTurnoMutation.mutate(
      { montoInicial: monto },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Abrir turno de caja</DialogTitle>
          <DialogDescription>
            Registra el fondo inicial en efectivo con el que empiezas tu turno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Monto inicial
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={montoInicial}
              onChange={(event) => setMontoInicial(event.target.value)}
              placeholder="$ 0"
              autoFocus
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-right text-xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </label>

          <button
            type="submit"
            disabled={abrirTurnoMutation.isPending || montoInicial === ''}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {abrirTurnoMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Abriendo turno...
              </>
            ) : (
              'Abrir turno'
            )}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
