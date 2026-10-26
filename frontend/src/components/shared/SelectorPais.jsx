import { useMemo, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { Check, ChevronDown, Search } from 'lucide-react'
import flags from 'react-phone-number-input/flags'
import { getCountryCallingCode } from 'react-phone-number-input/max'
import { cn } from '@/lib/utils'

const sinTildes = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const indicativo = (pais) => `+${getCountryCallingCode(pais)}`

export function Bandera({ pais, className }) {
  const Flag = flags[pais]
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[15px] w-[22px] shrink-0 overflow-hidden rounded-[4px] bg-muted ring-1 ring-foreground/10 [&_svg]:h-full [&_svg]:w-full',
        className
      )}
    >
      {Flag ? <Flag title="" /> : null}
    </span>
  )
}

// Reemplaza el <select> nativo de react-phone-number-input: lista con bandera,
// nombre e indicativo, y un buscador (por nombre o por indicativo).
export default function SelectorPais({ value, onChange, options, disabled, readOnly }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const buscadorRef = useRef(null)

  const visibles = useMemo(() => {
    const consulta = sinTildes(busqueda.trim())
    if (!consulta) return options
    const digitos = consulta.replace(/\D/g, '')
    return options.filter(
      (opcion) =>
        !opcion.divider &&
        opcion.value &&
        (sinTildes(opcion.label).includes(consulta) ||
          (digitos && getCountryCallingCode(opcion.value).startsWith(digitos)))
    )
  }, [busqueda, options])

  const elegir = (pais) => {
    onChange(pais)
    setAbierto(false)
    setBusqueda('')
  }

  return (
    <Popover.Root
      open={abierto}
      onOpenChange={(siguiente) => {
        setAbierto(siguiente)
        if (!siguiente) setBusqueda('')
      }}
    >
      <Popover.Trigger
        type="button"
        disabled={disabled || readOnly}
        aria-label={value ? `País: ${options.find((o) => o.value === value)?.label}` : 'Elegir país'}
        className="-ml-1 flex h-8 shrink-0 items-center gap-1 rounded-md px-1 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
      >
        <Bandera pais={value} />
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          onOpenAutoFocus={(evento) => {
            evento.preventDefault()
            buscadorRef.current?.focus()
          }}
          className="z-[100] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-card p-1.5 text-card-foreground shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="relative mb-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={buscadorRef}
              type="text"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key !== 'Enter') return
                evento.preventDefault()
                const primero = visibles.find((opcion) => opcion.value && !opcion.divider)
                if (primero) elegir(primero.value)
              }}
              placeholder="Buscar país o indicativo"
              aria-label="Buscar país o indicativo"
              className="h-10 w-full rounded-lg bg-muted pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          <div role="listbox" aria-label="Países" className="max-h-72 overflow-y-auto overscroll-contain">
            {visibles.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No encontramos ese país</p>
            ) : (
              visibles.map((opcion, indice) =>
                opcion.divider ? (
                  <div key={`divisor-${indice}`} role="separator" className="mx-2 my-1 h-px bg-border" />
                ) : opcion.value ? (
                  <button
                    key={opcion.value}
                    type="button"
                    role="option"
                    aria-selected={opcion.value === value}
                    onClick={() => elegir(opcion.value)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-foreground outline-none transition hover:bg-muted focus-visible:bg-muted',
                      opcion.value === value && 'font-semibold'
                    )}
                  >
                    <Bandera pais={opcion.value} />
                    <span className="min-w-0 flex-1 truncate">{opcion.label}</span>
                    <span className="tabular-nums text-muted-foreground">{indicativo(opcion.value)}</span>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {opcion.value === value ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
                    </span>
                  </button>
                ) : null
              )
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
