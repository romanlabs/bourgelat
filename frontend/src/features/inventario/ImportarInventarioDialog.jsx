import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import {
  CATEGORY_INFO,
  CATEGORY_LABELS,
  downloadImportTemplate,
  parseExcelFile,
  validateImportRows,
} from './inventarioImportSchema'

export default function ImportarInventarioDialog({ open, onClose, onConfirm, isPending, resultado }) {
  const inputRef = useRef(null)
  const [step, setStep] = useState('seleccion')
  const [fileName, setFileName] = useState('')
  const [parseResult, setParseResult] = useState({ validRows: [], invalidRows: [], globalError: null })
  const [parsing, setParsing] = useState(false)

  function resetState() {
    setStep('seleccion')
    setFileName('')
    setParseResult({ validRows: [], invalidRows: [], globalError: null })
    setParsing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const rawRows = parseExcelFile(buffer)
      const result = validateImportRows(rawRows)
      setParseResult(result)
      setStep('preview')
    } catch (error) {
      setParseResult({ validRows: [], invalidRows: [], globalError: 'No fue posible leer el archivo. Verifica que sea un .xlsx valido.' })
      setStep('preview')
    } finally {
      setParsing(false)
    }
  }

  function handleConfirm() {
    onConfirm(parseResult.validRows.map((row) => row.data))
  }

  function handleChooseAnother() {
    resetState()
  }

  return (
    <DialogRoot open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar inventario desde Excel</DialogTitle>
          <DialogDescription>
            Carga un archivo .xlsx con tus productos. Vas a poder revisar los datos antes de confirmar la importacion.
          </DialogDescription>
        </DialogHeader>

        {!resultado && step === 'seleccion' && (
          <div className="mt-4 grid gap-4">
            {parseResult.globalError && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {parseResult.globalError}
              </div>
            )}

            <button
              type="button"
              onClick={downloadImportTemplate}
              className="inline-flex w-fit items-center gap-2 border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla
            </button>

            <div className="grid gap-2 border border-border bg-muted/50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Categorias validas para la columna "Categoria"
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_INFO.map((c) => (
                  <span
                    key={c.value}
                    title={c.descripcion}
                    className="inline-flex items-center gap-1.5 border border-border bg-card px-2 py-1 text-xs font-medium text-foreground"
                  >
                    <code className="text-[11px] text-primary">{c.value}</code>
                    <span className="text-muted-foreground">— {c.label}</span>
                  </span>
                ))}
              </div>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Escribe el valor exacto (en minusculas) en la columna Categoria. La plantilla descargable incluye
                estas mismas categorias en filas de ejemplo y en la hoja "Categorias validas".
              </p>
            </div>

            <label
              htmlFor="import-inventario-file"
              className="flex cursor-pointer flex-col items-center gap-2 border border-dashed border-border bg-muted px-6 py-10 text-center transition hover:bg-muted/80"
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {parsing ? 'Leyendo archivo...' : 'Selecciona un archivo .xlsx'}
              </span>
              <span className="text-xs text-muted-foreground">O arrastralo aqui</span>
            </label>
            <input
              id="import-inventario-file"
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="sr-only"
              disabled={parsing}
            />
          </div>
        )}

        {!resultado && step === 'preview' && (
          <div className="mt-4 grid gap-4">
            {parseResult.globalError ? (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {parseResult.globalError}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-foreground">{fileName}</span>
                  <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                    {parseResult.validRows.length} validas
                  </span>
                  {parseResult.invalidRows.length > 0 && (
                    <span className="border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
                      {parseResult.invalidRows.length} con errores
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Fila</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Nombre</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Categoria</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Cantidad</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Precio venta</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.validRows.map(({ rowNumber, data }) => (
                        <tr key={`valid-${rowNumber}`} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">{rowNumber}</td>
                          <td className="px-3 py-2 text-foreground">{data.nombre}</td>
                          <td className="px-3 py-2 text-foreground">{CATEGORY_LABELS[data.categoria] || data.categoria}</td>
                          <td className="px-3 py-2 text-foreground">{data.stock}</td>
                          <td className="px-3 py-2 text-foreground">{formatCurrency(data.precioVenta)}</td>
                          <td className="px-3 py-2">
                            <span className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              Valido
                            </span>
                          </td>
                        </tr>
                      ))}
                      {parseResult.invalidRows.map(({ rowNumber, data, errors }) => (
                        <tr key={`invalid-${rowNumber}`} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">{rowNumber}</td>
                          <td className="px-3 py-2 text-foreground">{data.nombre || '-'}</td>
                          <td className="px-3 py-2 text-foreground">{data.categoria || '-'}</td>
                          <td className="px-3 py-2 text-foreground">{data.stock ?? '-'}</td>
                          <td className="px-3 py-2 text-foreground">-</td>
                          <td className="px-3 py-2">
                            <span
                              className="border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700"
                              title={errors.join(' | ')}
                            >
                              {errors[0]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending || parseResult.validRows.length === 0}
                className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {isPending ? 'Importando...' : `Importar ${parseResult.validRows.length} productos`}
              </button>
              <button
                type="button"
                onClick={handleChooseAnother}
                className="border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Elegir otro archivo
              </button>
            </div>
          </div>
        )}

        {resultado && (
          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                {resultado.creados?.length || 0} creados
              </span>
              {resultado.omitidos?.length > 0 && (
                <span className="border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                  {resultado.omitidos.length} omitidos
                </span>
              )}
            </div>

            {resultado.omitidos?.length > 0 && (
              <div className="max-h-64 overflow-y-auto border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-muted-foreground">Fila</th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground">Nombre</th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.omitidos.map((item, index) => (
                      <tr key={`${item.fila}-${index}`} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{item.fila}</td>
                        <td className="px-3 py-2 text-foreground">{item.nombre}</td>
                        <td className="px-3 py-2 text-foreground">{item.motivo.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-fit border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
