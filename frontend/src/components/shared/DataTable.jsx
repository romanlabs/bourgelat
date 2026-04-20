import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from './EmptyState'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow({ columns }) {
  return (
    <tr>
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-muted" style={{ width: col.skeletonWidth ?? '80%' }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Sort icon ───────────────────────────────────────────────────────────────

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-clinical-600" />
    : <ChevronDown className="h-3 w-3 text-clinical-600" />
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ page, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-caption text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{from}–{to}</span>{' '}
        de <span className="font-semibold text-foreground">{totalCount}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-clinical-300 hover:bg-clinical-50 hover:text-clinical-700 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-caption tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-clinical-300 hover:bg-clinical-50 hover:text-clinical-700 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── DataTable ───────────────────────────────────────────────────────────────

/**
 * Tabla reutilizable con ordenamiento y paginación.
 *
 * Modos de operación:
 *
 * 1. Cliente (sin handlers): el componente ordena y pagina internamente.
 *    Pasar solo `columns`, `rows` y opcionalmente `pageSize`.
 *
 * 2. Servidor (con handlers): el padre controla el estado.
 *    Pasar `sortKey`, `sortDir`, `onSort`, `page`, `totalCount`, `onPageChange`.
 *
 * Columnas — shape:
 *   { key, label, sortable?, align?, render?, skeletonWidth? }
 *   - key          clave del objeto fila (también se usa como id de columna)
 *   - label        texto del encabezado
 *   - sortable     habilita click para ordenar (default: false)
 *   - align        'left' | 'right' | 'center' (default: 'left')
 *   - render(row)  función de renderizado personalizado
 *   - skeletonWidth ancho del skeleton en loading (ej: '60%')
 *
 * Ejemplo:
 *   <DataTable
 *     columns={[
 *       { key: 'nombre', label: 'Producto', sortable: true },
 *       { key: 'stock',  label: 'Stock',    sortable: true, align: 'right' },
 *       { key: 'estado', label: 'Estado',   render: (r) => <StatusBadge variant={r.estado} /> },
 *     ]}
 *     rows={productos}
 *     pageSize={10}
 *     emptyIcon={<Boxes />}
 *     emptyTitle="Sin productos"
 *     emptyDescription="Agrega el primer producto al inventario."
 *     emptyAction={<Button size="sm">Agregar</Button>}
 *   />
 */
export function DataTable({
  // Datos
  columns = [],
  rows = [],
  keyField = 'id',

  // Ordenamiento controlado (servidor)
  sortKey: sortKeyProp,
  sortDir: sortDirProp,
  onSort,

  // Paginación controlada (servidor)
  page: pageProp,
  pageSize = 15,
  totalCount,
  onPageChange,

  // UI
  loading = false,
  skeletonRows = 5,
  emptyIcon,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  emptyAction,

  className,
}) {
  // ── Estado interno (modo cliente) ────────────────────────────
  const [sortKeyLocal, setSortKeyLocal] = useState(null)
  const [sortDirLocal, setSortDirLocal] = useState('asc')
  const [pageLocal, setPageLocal] = useState(1)

  const isControlledSort = onSort !== undefined
  const isControlledPage = onPageChange !== undefined

  const sortKey = isControlledSort ? sortKeyProp : sortKeyLocal
  const sortDir = isControlledSort ? sortDirProp : sortDirLocal
  const page    = isControlledPage ? pageProp    : pageLocal

  // ── Handlers ─────────────────────────────────────────────────
  function handleSort(key) {
    if (isControlledSort) {
      onSort(key, sortKey === key && sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      if (sortKeyLocal === key) {
        setSortDirLocal((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKeyLocal(key)
        setSortDirLocal('asc')
      }
      setPageLocal(1)
    }
  }

  function handlePageChange(newPage) {
    if (isControlledPage) {
      onPageChange(newPage)
    } else {
      setPageLocal(newPage)
    }
  }

  // ── Datos procesados (modo cliente) ──────────────────────────
  const processedRows = useMemo(() => {
    if (isControlledSort && isControlledPage) return rows

    let result = [...rows]

    if (!isControlledSort && sortKey) {
      result.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = typeof av === 'string'
          ? av.localeCompare(bv, 'es', { sensitivity: 'base' })
          : av - bv
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    if (!isControlledPage) {
      const start = (page - 1) * pageSize
      result = result.slice(start, start + pageSize)
    }

    return result
  }, [rows, sortKey, sortDir, page, pageSize, isControlledSort, isControlledPage])

  const effectiveTotal = totalCount ?? rows.length
  const showPagination = effectiveTotal > pageSize

  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">

          {/* Encabezado */}
          <thead className="bg-muted/60">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
                    alignClass[col.align ?? 'left'],
                    col.sortable && 'cursor-pointer select-none hover:text-foreground'
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Cuerpo */}
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} columns={columns} />
              ))
            ) : processedRows.length > 0 ? (
              processedRows.map((row) => (
                <tr
                  key={row[keyField] ?? row.key}
                  className="transition-colors hover:bg-muted/40"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 align-middle text-foreground [overflow-wrap:anywhere]',
                        alignClass[col.align ?? 'left']
                      )}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                    size="sm"
                    bordered
                    className="m-4"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && showPagination && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={effectiveTotal}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
