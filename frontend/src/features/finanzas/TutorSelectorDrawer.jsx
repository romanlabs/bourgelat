import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'

export default function TutorSelectorDrawer({
  open,
  onClose,
  propietariosQuery,
  ownerSearch,
  setOwnerSearch,
  onSelect,
  selectedId,
}) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const propietarios = propietariosQuery.data?.propietarios || []

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar tutor"
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[480px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Seleccionar tutor</h2>
            <p className="text-xs text-muted-foreground">Busca por nombre, documento o teléfono</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={ownerSearch}
              onChange={(event) => setOwnerSearch(event.target.value)}
              placeholder="Nombre, documento o teléfono"
              autoFocus
              className="h-10 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {propietariosQuery.isFetching ? (
            <div className="space-y-2 p-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse border border-border bg-muted" />
              ))}
            </div>
          ) : propietarios.length ? (
            <ul className="divide-y divide-border">
              {propietarios.map((propietario) => (
                <li key={propietario.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(propietario)}
                    className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${
                      propietario.id === selectedId
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-secondary text-sm font-semibold text-primary">
                      {propietario.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {propietario.nombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {propietario.numeroDocumento}
                        {propietario.telefono ? ` · ${propietario.telefono}` : ''}
                      </p>
                    </div>
                    {propietario.id === selectedId && (
                      <span className="shrink-0 text-xs font-semibold text-primary">Seleccionado</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              {ownerSearch
                ? `Sin resultados para "${ownerSearch}"`
                : 'Escribe para buscar tutores registrados'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <Link
            to="/pacientes"
            onClick={onClose}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Crear tutor nuevo →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  )
}
