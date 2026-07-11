export default function Paginacion({ pagina, paginas, onChange }) {
  if (!paginas || paginas <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Pagina {pagina} de {paginas}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(pagina - 1, 1))}
          disabled={pagina <= 1}
          className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(pagina + 1, paginas))}
          disabled={pagina >= paginas}
          className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
