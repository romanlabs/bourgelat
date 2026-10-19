import { DropdownMenu } from 'radix-ui'
import { Link } from 'react-router-dom'
import { ChevronDown, Plus } from 'lucide-react'

/**
 * Reemplaza la fila de acciones rapidas por un unico punto de entrada.
 *
 * Recibe la misma lista que antes alimentaba la franja (ver quickActions.js), de
 * modo que el filtrado por plan y el orden por rol siguen resolviendose fuera de
 * este componente.
 */
export default function QuickCreateMenu({ actions }) {
  const items = (actions || []).filter(Boolean)
  if (items.length === 0) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          Nuevo
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-xl bg-card p-1.5 text-card-foreground shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <DropdownMenu.Item key={item.key} asChild>
                <Link
                  to={item.to}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
