import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'
import { formatearCelular } from '@/lib/celular'

export default function ClientInlinePicker({
  open,
  onClose,
  propietariosQuery,
  ownerSearch,
  setOwnerSearch,
  onSelect,
  selectedId,
}) {
  const panelRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  const propietarios = propietariosQuery?.data?.propietarios || []
  const isLoading = propietariosQuery?.isLoading

  return (
    <div
      ref={panelRef}
      className="absolute left-5 right-5 top-full z-50 mt-1 overflow-hidden rounded-xl bg-card shadow-dropdown"
    >
      {/* Búsqueda */}
      <div className="p-3">
        <div className="flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            placeholder="Nombre, documento o teléfono"
            aria-label="Buscar cliente"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="max-h-64 overflow-y-auto px-1.5 pb-1.5">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">Buscando...</div>
        ) : propietarios.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {ownerSearch ? 'Sin resultados para la búsqueda.' : 'Escribe para buscar un tutor.'}
          </div>
        ) : (
          propietarios.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p)
                onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                p.id === selectedId ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground">
                {p.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{p.nombre}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {p.email || formatearCelular(p.telefono) || p.numeroDocumento || '—'}
                </p>
              </div>
              {p.id === selectedId && (
                <span className="shrink-0 text-[13px] font-semibold text-accent-foreground">Elegido</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/60 px-4 py-3">
        <Link
          to="/pacientes"
          onClick={onClose}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
        >
          <UserPlus className="h-4 w-4" />
          Crear nuevo tutor
        </Link>
      </div>
    </div>
  )
}
