// A qué cuenta de la clínica entró una transferencia: un botón por cuenta.
// Lo usan el carrito y el formulario de abono.
export default function SelectorCuenta({ cuentas, seleccionada, onSeleccionar }) {
  return (
    <div role="radiogroup" aria-label="Cuenta donde entró la transferencia" className="flex flex-wrap gap-1.5">
      {cuentas.map((cuenta) => {
        const activa = cuenta.id === seleccionada
        return (
          <button
            key={cuenta.id}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onSeleccionar(cuenta.id)}
            className={`h-9 rounded-lg px-3 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activa
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-card text-foreground hover:bg-muted'
            }`}
          >
            {cuenta.nombre}
          </button>
        )
      })}
    </div>
  )
}
