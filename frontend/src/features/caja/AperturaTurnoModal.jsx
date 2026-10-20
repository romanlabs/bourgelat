import { useState } from 'react'
import { Loader2, Wallet } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import MoneyInput from '@/components/shared/MoneyInput'

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
    const monto = montoInicial === '' ? 0 : parseInt(montoInicial, 10)
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
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <DialogTitle>Abrir turno de caja</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo con el que empiezas y anótalo como base del turno.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">
              Base en efectivo
            </span>
            <MoneyInput
              value={montoInicial}
              onChange={(value) => setMontoInicial(value === 0 ? '' : String(value))}
              placeholder="$ 0"
              autoFocus
              className="h-14 w-full rounded-lg border border-input bg-card px-4 text-right text-2xl font-semibold tracking-[-0.02em] tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <button
            type="submit"
            disabled={abrirTurnoMutation.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-base disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
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
