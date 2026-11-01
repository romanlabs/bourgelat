import { useMemo, useRef, useState } from 'react'
import { CircleAlert, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import {
  CATEGORY_LABELS,
  downloadImportTemplate,
  parseExcelFile,
  validateImportRows,
} from './inventarioImportSchema'

const RESULTADO_VACIO = {
  productos: { validRows: [], invalidRows: [] },
  servicios: { validRows: [], invalidRows: [] },
  globalError: null,
}

const MOTIVOS = {
  nombre_duplicado: 'Ya existe uno con ese nombre',
  codigo_barras_duplicado: 'Ese código de barras ya está en uso',
  duplicado_en_archivo: 'Está repetido en el archivo',
  datos_invalidos: 'Le faltan datos obligatorios',
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function detalleProducto(data) {
  return [CATEGORY_LABELS[data.categoria] || data.categoria, data.unidadMedida, data.stock !== undefined ? `${data.stock} en stock` : null]
    .filter(Boolean)
    .join(' · ')
}

// Une productos y servicios en una sola lista para la vista previa,
// con los errores primero para que se vean sin bajar.
function filasVistaPrevia(resultado) {
  const filas = []
  ;[['productos', 'Producto'], ['servicios', 'Servicio']].forEach(([clave, tipo]) => {
    resultado[clave].invalidRows.forEach((fila) => filas.push({ ...fila, tipo, hoja: clave, valida: false }))
    resultado[clave].validRows.forEach((fila) => filas.push({ ...fila, tipo, hoja: clave, valida: true }))
  })
  return filas.sort((a, b) => Number(a.valida) - Number(b.valida) || a.hoja.localeCompare(b.hoja) || a.rowNumber - b.rowNumber)
}

function Paso({ numero, titulo, children }) {
  return (
    <div className="grid content-start gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
          {numero}
        </span>
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
      </div>
      {children}
    </div>
  )
}

function Pastilla({ tono, children }) {
  const tonos = {
    exito: 'bg-success-soft text-success',
    error: 'bg-danger-soft text-danger',
    aviso: 'bg-warning-soft text-warning',
  }
  return <span className={cn('rounded-lg px-2 py-1 text-[13px] font-semibold', tonos[tono])}>{children}</span>
}

export default function ImportarInventarioDialog({ open, onClose, onConfirm, isPending, resultado }) {
  const inputRef = useRef(null)
  const [step, setStep] = useState('seleccion')
  const [fileName, setFileName] = useState('')
  const [parseResult, setParseResult] = useState(RESULTADO_VACIO)
  const [parsing, setParsing] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const filas = useMemo(() => filasVistaPrevia(parseResult), [parseResult])
  const productosValidos = parseResult.productos.validRows.length
  const serviciosValidos = parseResult.servicios.validRows.length
  const conErrores = parseResult.productos.invalidRows.length + parseResult.servicios.invalidRows.length

  function resetState() {
    setStep('seleccion')
    setFileName('')
    setParseResult(RESULTADO_VACIO)
    setParsing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function leerArchivo(file) {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setParseResult({ ...RESULTADO_VACIO, globalError: 'El archivo debe ser de Excel (.xlsx).' })
      setStep('preview')
      return
    }

    setFileName(file.name)
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      setParseResult(validateImportRows(parseExcelFile(buffer)))
    } catch {
      setParseResult({ ...RESULTADO_VACIO, globalError: 'No fue posible leer el archivo. Verifique que sea un Excel (.xlsx) válido.' })
    } finally {
      setStep('preview')
      setParsing(false)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setArrastrando(false)
    leerArchivo(event.dataTransfer.files?.[0])
  }

  async function handleDescargarPlantilla() {
    setDescargando(true)
    try {
      await downloadImportTemplate()
    } catch {
      toast.error('No fue posible generar la plantilla. Intente de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  function handleConfirm() {
    onConfirm({
      productos: parseResult.productos.validRows.map((row) => row.data),
      servicios: parseResult.servicios.validRows.map((row) => row.data),
    })
  }

  // El backend numera las omitidas segun el orden enviado; se traduce a la fila de Excel.
  const omitidos = resultado
    ? [['productos', 'Producto'], ['servicios', 'Servicio']].flatMap(([clave, tipo]) =>
        (resultado[clave]?.omitidos || []).map((item) => ({
          ...item,
          tipo,
          filaExcel: parseResult[clave].validRows[item.fila - 1]?.rowNumber ?? item.fila,
        })),
      )
    : []

  const textoConfirmar = [
    productosValidos ? plural(productosValidos, 'producto', 'productos') : null,
    serviciosValidos ? plural(serviciosValidos, 'servicio', 'servicios') : null,
  ].filter(Boolean).join(' y ')

  return (
    <DialogRoot open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cargar productos y servicios desde Excel</DialogTitle>
          <DialogDescription>
            Use la plantilla de Bourgelat o un Excel exportado desde aquí. Antes de guardar va a ver fila por fila qué se carga.
          </DialogDescription>
        </DialogHeader>

        {!resultado && step === 'seleccion' && (
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Paso numero={1} titulo="Descargue la plantilla">
              <p className="text-[13px] leading-5 text-muted-foreground">
                Trae una hoja de <strong className="font-semibold text-foreground">Productos</strong> y otra de{' '}
                <strong className="font-semibold text-foreground">Servicios</strong>, con listas para elegir la categoría y una
                ayuda en cada columna.
              </p>
              <Button type="button" variant="secondary" className="h-12 lg:h-10 w-fit px-3.5" onClick={handleDescargarPlantilla} disabled={descargando}>
                <Download />
                {descargando ? 'Generando…' : 'Descargar plantilla'}
              </Button>
            </Paso>

            <Paso numero={2} titulo="Súbala con sus datos">
              <label
                htmlFor="import-inventario-file"
                onDragOver={(event) => { event.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition',
                  arrastrando ? 'border-primary bg-accent' : 'border-border bg-muted/60 hover:bg-muted',
                )}
              >
                <FileSpreadsheet className={cn('h-8 w-8', arrastrando ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-semibold text-foreground">
                  {parsing ? 'Leyendo archivo…' : 'Elija el archivo .xlsx'}
                </span>
                <span className="text-[13px] text-muted-foreground">o arrástrelo hasta aquí</span>
              </label>
              <input
                id="import-inventario-file"
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => leerArchivo(event.target.files?.[0])}
                className="sr-only"
                disabled={parsing}
              />
            </Paso>
          </div>
        )}

        {!resultado && step === 'preview' && (
          <div className="mt-4 grid gap-4">
            {parseResult.globalError ? (
              <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {parseResult.globalError}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    {fileName}
                  </span>
                  {productosValidos > 0 && <Pastilla tono="exito">{plural(productosValidos, 'producto listo', 'productos listos')}</Pastilla>}
                  {serviciosValidos > 0 && <Pastilla tono="exito">{plural(serviciosValidos, 'servicio listo', 'servicios listos')}</Pastilla>}
                  {conErrores > 0 && <Pastilla tono="error">{plural(conErrores, 'fila con errores', 'filas con errores')}</Pastilla>}
                </div>

                {conErrores > 0 && (
                  <p className="text-[13px] leading-5 text-muted-foreground">
                    Las filas con errores no se cargan. Corríjalas en el Excel y vuelva a subirlo; las que ya entraron se omiten solas.
                  </p>
                )}

                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[560px] text-[13px]">
                    <thead className="sticky top-0 bg-card text-left">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 font-medium text-muted-foreground">Fila</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Nombre</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio venta</th>
                        <th className="px-3 py-2 font-medium text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(({ rowNumber, data, errors, tipo, hoja, valida }) => (
                        <tr key={`${hoja}-${rowNumber}`} className={cn('border-t border-border/60 align-top', !valida && 'bg-danger-soft/40')}>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{rowNumber}</td>
                          <td className="px-3 py-2 text-muted-foreground">{tipo}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">{data.nombre || '—'}</p>
                            {valida && hoja === 'productos' && <p className="text-muted-foreground">{detalleProducto(data)}</p>}
                            {valida && hoja === 'servicios' && data.categoria && <p className="text-muted-foreground">{data.categoria}</p>}
                            {!valida && (
                              <ul className="mt-1 grid gap-0.5 text-danger">
                                {errors.map((error) => <li key={error}>{error}</li>)}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                            {valida ? formatCurrency(data.precioVenta) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {valida ? <Pastilla tono="exito">Lista</Pastilla> : <Pastilla tono="error">Revisar</Pastilla>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3">
              {!parseResult.globalError && (
                <Button type="button" className="h-12 lg:h-11 px-4" onClick={handleConfirm} disabled={isPending || !textoConfirmar}>
                  <Upload />
                  {isPending ? 'Cargando…' : textoConfirmar ? `Cargar ${textoConfirmar}` : 'Nada para cargar'}
                </Button>
              )}
              <Button type="button" variant="secondary" className="h-12 lg:h-11 px-4" onClick={resetState} disabled={isPending}>
                Elegir otro archivo
              </Button>
            </div>
          </div>
        )}

        {resultado && (
          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {resultado.productos && (
                <Pastilla tono="exito">{plural(resultado.productos.creados?.length || 0, 'producto creado', 'productos creados')}</Pastilla>
              )}
              {resultado.servicios && (
                <Pastilla tono="exito">{plural(resultado.servicios.creados?.length || 0, 'servicio creado', 'servicios creados')}</Pastilla>
              )}
              {omitidos.length > 0 && <Pastilla tono="aviso">{plural(omitidos.length, 'omitido', 'omitidos')}</Pastilla>}
            </div>

            {resultado.error && (
              <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] font-semibold text-warning">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                No se pudo terminar la carga: {resultado.error} Lo que aparece como creado sí quedó guardado.
              </div>
            )}

            {resultado.servicios?.creados?.length > 0 && (
              <p className="text-[13px] leading-5 text-muted-foreground">
                Los servicios entraron sin receta de insumos. Si alguno descuenta inventario, ármela en la pestaña Servicios.
              </p>
            )}

            {omitidos.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-card text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Fila</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Nombre</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Por qué se omitió</th>
                    </tr>
                  </thead>
                  <tbody>
                    {omitidos.map((item, index) => (
                      <tr key={`${item.tipo}-${item.fila}-${index}`} className="border-t border-border/60">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{item.filaExcel}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.tipo}</td>
                        <td className="px-3 py-2 text-foreground">{item.nombre}</td>
                        <td className="px-3 py-2 text-foreground">{MOTIVOS[item.motivo] || item.motivo.replaceAll('_', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button type="button" className="h-12 lg:h-11 w-fit px-4" onClick={handleClose}>
              Listo
            </Button>
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
