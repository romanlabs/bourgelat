import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus } from 'lucide-react'

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
      className="absolute left-0 right-0 top-full z-50 mt-1 border border-border bg-card shadow-xl"
    >
      {/* Búsqueda */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 border border-border bg-background px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            placeholder="Nombre, documento o teléfono..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="max-h-60 overflow-y-auto">
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
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted ${
                p.id === selectedId ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-secondary text-xs font-bold text-primary">
                {p.nombre?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{p.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.email || p.telefono || p.numeroDocumento || '—'}
                </p>
              </div>
              {p.id === selectedId && (
                <span className="shrink-0 text-xs font-bold text-primary">✓</span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <Link
          to="/pacientes"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Crear nuevo tutor
        </Link>
      </div>
    </div>
  )
}
