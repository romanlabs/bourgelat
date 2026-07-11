import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, ScanLine, Search, X } from 'lucide-react'
import {
  formatCurrency,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'

const DRAWER_TABS = [
  { id: 'buscar', label: 'Buscar' },
  { id: 'escaner', label: 'Escaner' },
]

export default function ProductSelectorDrawer({
  open,
  onClose,
  productosDisponibles,
  productosQuery,
  productSearch,
  setProductSearch,
  barcodeInput,
  setBarcodeInput,
  onAddProduct,
  onBarcodeScan,
  buscarProductoPorBarcodeMutation,
}) {
  const [activeTab, setActiveTab] = useState('buscar')
  const [addedIds, setAddedIds] = useState(new Set())

  useEffect(() => {
    if (!open) {
      setAddedIds(new Set())
      setActiveTab('buscar')
      return
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleAdd = (product) => {
    onAddProduct(product)
    setAddedIds((prev) => new Set([...prev, product.id]))
  }

  const addedCount = addedIds.size

  if (typeof document === 'undefined') return null

  return createPortal(
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
        aria-label="Agregar productos al borrador"
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[540px] sm:border-l sm:border-border ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Agregar productos al borrador
            </h2>
            {addedCount > 0 ? (
              <p className="text-xs font-semibold text-primary">
                {addedCount} producto{addedCount !== 1 ? 's' : ''} agregado
                {addedCount !== 1 ? 's' : ''} en esta sesion
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Busca por nombre o escanea el codigo de barras
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-0 border-b border-border px-5">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'buscar' ? (
            <div className="flex flex-col gap-4 p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Buscar producto por nombre"
                  autoFocus={activeTab === 'buscar' && open}
                  className="h-10 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                />
              </div>

              {productosQuery?.isFetching ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse border border-border bg-muted" />
                  ))}
                </div>
              ) : productosDisponibles.length ? (
                <div className="grid gap-2">
                  {productosDisponibles.map((producto) => {
                    const yaAgregado = addedIds.has(producto.id)
                    return (
                      <div
                        key={producto.id}
                        className="flex items-center justify-between gap-3 border border-border bg-muted px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {producto.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stock {formatNumber(producto.stock)} ·{' '}
                            {formatCurrency(producto.precioVenta)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(producto)}
                          className={`shrink-0 inline-flex items-center gap-1.5 border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                            yaAgregado
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {yaAgregado ? 'Agregar otro' : 'Agregar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-border bg-muted px-4 py-8 text-center text-sm leading-7 text-muted-foreground">
                  {productSearch
                    ? `Sin resultados para "${productSearch}"`
                    : 'Escribe para buscar productos del inventario'}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                La pistola lectora escribe el codigo y cierra con Enter. Si el producto existe en
                inventario y tiene stock, se agrega directo al borrador.
              </div>

              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Codigo de barras
                </span>
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(event) => setBarcodeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        onBarcodeScan()
                      }
                    }}
                    placeholder="Escanea o escribe el codigo"
                    autoFocus={activeTab === 'escaner' && open}
                    className="h-10 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={onBarcodeScan}
                disabled={buscarProductoPorBarcodeMutation.isPending}
                className="inline-flex items-center justify-center gap-2 border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ScanLine className="h-4 w-4" />
                {buscarProductoPorBarcodeMutation.isPending ? 'Buscando...' : 'Agregar por codigo'}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {addedCount > 0
              ? `Listo · ${addedCount} producto${addedCount !== 1 ? 's' : ''} agregado${addedCount !== 1 ? 's' : ''}`
              : 'Cerrar'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
