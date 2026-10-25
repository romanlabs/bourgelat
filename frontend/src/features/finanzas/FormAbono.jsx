import { useState } from 'react'
import MoneyInput from '@/components/shared/MoneyInput'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { useRegistrarAbono } from '@/features/finanzas/useAdministracion'
import { mensajeDeError } from '@/lib/errores'

// Igual que la venta: Nequi, Daviplata y cualquier banco van como transferencia.
const METODOS_ABONO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'otro', label: 'Otro' },
]

const inputClass =
  'rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Cobro de una venta a crédito: un abono parcial o el saldo completo («Pagar
// todo»). Lo usan la pestaña Por cobrar y el detalle de la factura.
export default function FormAbono({ factura, autoFocus = false, onListo, onCancelar }) {
  const saldo = Number(factura.saldoPendiente) || 0
  const [monto, setMonto] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [error, setError] = useState(null)
  const registrarAbono = useRegistrarAbono()

  const cobrar = async (valor) => {
    setError(null)
    try {
      await registrarAbono.mutateAsync({ facturaId: factura.id, monto: valor, metodoPago })
      setMonto('')
      onListo?.()
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo registrar el abono'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <MoneyInput
          autoFocus={autoFocus}
          value={monto}
          onChange={(value) => setMonto(value === 0 ? '' : String(value))}
          placeholder="valor"
          className={`${inputClass} h-10 w-32 text-right tabular-nums`}
        />
        <Select
          variant="field"
          aria-label="Método del abono"
          className="h-10"
          value={metodoPago}
          onValueChange={setMetodoPago}
          options={METODOS_ABONO}
        />
        <button
          type="button"
          onClick={() => cobrar(Number(monto))}
          disabled={registrarAbono.isPending || !monto}
          className="h-10 px-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abonar
        </button>
        <button
          type="button"
          onClick={() => cobrar(saldo)}
          disabled={registrarAbono.isPending || saldo <= 0}
          className="h-10 px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          Pagar todo ({formatCurrency(saldo)})
        </button>
        {onCancelar ? (
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancelar
          </button>
        ) : null}
      </div>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
    </div>
  )
}
