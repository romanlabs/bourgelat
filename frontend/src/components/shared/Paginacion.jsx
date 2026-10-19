export default function Paginacion({ pagina, paginas, onChange }) {
  if (!paginas || paginas <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm tabular-nums text-muted-foreground">
        Página {pagina} de {paginas}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(pagina - 1, 1))}
          disabled={pagina <= 1}
          className="inline-flex h-10 items-center rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(pagina + 1, paginas))}
          disabled={pagina >= paginas}
          className="inline-flex h-10 items-center rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
