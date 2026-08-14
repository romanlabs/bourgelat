import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { inventarioApi } from '@/features/inventario/inventarioApi'

export default function ProductoComboBox({
  value,
  onChange,
  productoSeleccionado,
  placeholder = 'Buscar producto...',
  hasError = false,
  disabled = false,
  id,
}) {
  const [query, setQuery] = useState(productoSeleccionado?.nombre || '')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)

  // Sincroniza el texto mostrado cuando `value` cambia desde afuera (ej. al
  // abrir el drawer en modo edición). Se ajusta durante el render, no en un
  // efecto, siguiendo el patrón recomendado por React para derivar estado de props.
  const [lastSyncedValue, setLastSyncedValue] = useState(value)
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value)
    setQuery(value && productoSeleccionado?.id === value ? productoSeleccionado.nombre : '')
  }

  const queryDiferida = useDeferredValue(query.trim())

  const productosQuery = useQuery({
    queryKey: ['producto-combobox', queryDiferida],
    queryFn: () => inventarioApi.obtenerProductos({ buscar: queryDiferida || undefined, limite: 8 }),
    enabled: open,
    placeholderData: (prev) => prev,
  })

  const resultados = productosQuery.data?.productos || []
  const highlightedIndexClamped = Math.min(highlightedIndex, Math.max(resultados.length - 1, 0))

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery(productoSeleccionado?.id === value ? productoSeleccionado.nombre : '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, productoSeleccionado, value])

  function seleccionar(producto) {
    onChange(producto.id, producto)
    setQuery(producto.nombre)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(Math.min(highlightedIndexClamped + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(Math.max(highlightedIndexClamped - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const producto = resultados[highlightedIndexClamped]
      if (producto) seleccionar(producto)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(productoSeleccionado?.id === value ? productoSeleccionado.nombre : '')
    }
  }

  function handleBlurRevert() {
    // El cierre real ocurre en el click-outside handler; esto solo asegura
    // que si el usuario tabuló hacia afuera sin click, el texto se revierta.
    if (!open) return
    setTimeout(() => {
      setOpen(false)
      setQuery(productoSeleccionado?.id === value ? productoSeleccionado.nombre : '')
    }, 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex h-11 items-center gap-2 border bg-card px-3 text-sm text-foreground transition focus-within:border-primary ${
          hasError ? 'border-red-400' : 'border-border'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (value) onChange('', null)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlurRevert}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto border border-border bg-card shadow-lg">
          {productosQuery.isLoading ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            resultados.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(p)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  idx === highlightedIndexClamped ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{p.nombre}</span>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground">Cantidad: {p.stock}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
