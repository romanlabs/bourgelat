import * as XLSX from 'xlsx'
import { z } from 'zod'
import {
  CATEGORIAS_PRODUCTO,
  COLUMNAS_PRODUCTOS,
  COLUMNAS_SERVICIOS,
  HOJA_PRODUCTOS,
  HOJA_SERVICIOS,
  construirLibroInventario,
  descargarArchivo,
} from './inventarioExcel'

export const MAX_IMPORT_ROWS = 500

// Fuente unica de verdad en inventarioExcel.js: valor que espera el backend,
// label en espanol y descripcion corta para elegir la categoria correcta.
export const CATEGORY_INFO = CATEGORIAS_PRODUCTO

export const CATEGORY_LABELS = Object.fromEntries(CATEGORY_INFO.map((c) => [c.value, c.label]))

export const IMPORT_CATEGORY_VALUES = CATEGORY_INFO.map((c) => c.value)

// «Código de barras *» -> «codigo de barras»: tolera tildes, asteriscos y mayúsculas.
const normalizarTitulo = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const mapaColumnas = (columnas, alias = {}) => ({
  ...Object.fromEntries(columnas.map((c) => [normalizarTitulo(c.titulo), c.key])),
  ...alias,
})

// Alias: titulos de la plantilla anterior (encabezado en la fila 1).
const MAPA_PRODUCTOS = mapaColumnas(COLUMNAS_PRODUCTOS, { 'fecha vencimiento': 'fechaVencimiento' })
const MAPA_SERVICIOS = mapaColumnas(COLUMNAS_SERVICIOS)

const TITULO_PRODUCTOS = Object.fromEntries(COLUMNAS_PRODUCTOS.map((c) => [c.key, c.titulo]))
const TITULO_SERVICIOS = Object.fromEntries(COLUMNAS_SERVICIOS.map((c) => [c.key, c.titulo]))

const TRUE_VALUES = new Set(['si', 'sí', 'true', '1', 'x', 'yes'])

const normalizeBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor
  if (valor === undefined || valor === null || valor === '') return false
  return TRUE_VALUES.has(String(valor).trim().toLowerCase())
}

// Excel guarda los precios como numero; si llegan como texto («$ 25.000»,
// «25.000,50») se quitan separadores de miles al estilo colombiano.
const normalizeMoney = (valor) => {
  if (valor === undefined || valor === null || valor === '') return undefined
  if (typeof valor === 'number') return valor
  const limpio = String(valor).trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  return limpio === '' ? Number.NaN : Number(limpio)
}

const normalizeEntero = (valor) => {
  if (valor === undefined || valor === null || valor === '') return undefined
  if (typeof valor === 'number') return valor
  const limpio = String(valor).trim().replace(/\./g, '')
  return limpio === '' ? undefined : Number(limpio)
}

// Lo que no es número se marca NaN para que zod lo reporte como error.
const nanSiInvalido = (n) => (n === undefined || Number.isFinite(n) ? n : Number.NaN)

const dosDigitos = (n) => String(n).padStart(2, '0')

// Celda de fecha (serial de Excel), «31/01/2027» o «2027-01-31» -> «2027-01-31».
const normalizeFecha = (valor) => {
  if (valor === undefined || valor === null || valor === '') return ''
  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor)
    return fecha ? `${fecha.y}-${dosDigitos(fecha.m)}-${dosDigitos(fecha.d)}` : String(valor)
  }
  const texto = String(valor).trim()
  const latina = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (latina) return `${latina[3]}-${dosDigitos(latina[2])}-${dosDigitos(latina[1])}`
  return texto
}

const normalizeTexto = (valor) => (valor === undefined || valor === null ? '' : String(valor).trim())

const fechaValida = (valor) => {
  if (!valor) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [y, m, d] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  return fecha.getUTCFullYear() === y && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

const numero = () => z.number({ error: (issue) => (issue.input === undefined ? 'Es obligatorio' : 'Debe ser un número') })

export const importRowSchema = z.object({
  nombre: z.string().trim().min(1, 'Es obligatorio').max(160, 'Máximo 160 caracteres'),
  categoria: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => IMPORT_CATEGORY_VALUES.includes(value), {
      message: `Elija una de la lista (${CATEGORY_INFO.map((c) => c.label).join(', ')})`,
    }),
  unidadMedida: z.string().trim().min(1, 'Es obligatoria').max(40, 'Máximo 40 caracteres'),
  stock: numero().int('Debe ser un número entero').min(0, 'No puede ser negativo').default(0),
  stockMinimo: numero().int('Debe ser un número entero').min(0, 'No puede ser negativo').default(5),
  precioCompra: numero().min(0, 'No puede ser negativo').default(0),
  precioVenta: numero().min(0, 'No puede ser negativo').default(0),
  codigoBarras: z.string().trim().max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
  subcategoria: z.string().trim().max(120, 'Máximo 120 caracteres'),
  fechaVencimiento: z.string().trim().refine(fechaValida, 'Fecha no válida; use día/mes/año'),
  lote: z.string().trim().max(80, 'Máximo 80 caracteres'),
  laboratorio: z.string().trim().max(120, 'Máximo 120 caracteres'),
  requiereFormula: z.boolean().default(false),
})

export const servicioRowSchema = z.object({
  nombre: z.string().trim().min(1, 'Es obligatorio').max(160, 'Máximo 160 caracteres'),
  categoria: z.string().trim().max(80, 'Máximo 80 caracteres'),
  precioVenta: numero().min(0, 'No puede ser negativo'),
  descripcion: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
})

function filaPorClave(rawRow, mapa) {
  const row = {}
  Object.entries(rawRow).forEach(([header, valor]) => {
    const key = mapa[normalizarTitulo(header)]
    if (key) row[key] = valor
  })
  return row
}

export function normalizeExcelRow(rawRow) {
  const row = filaPorClave(rawRow, MAPA_PRODUCTOS)

  return {
    nombre: normalizeTexto(row.nombre),
    categoria: normalizeTexto(row.categoria),
    unidadMedida: normalizeTexto(row.unidadMedida),
    stock: nanSiInvalido(normalizeEntero(row.stock)),
    stockMinimo: nanSiInvalido(normalizeEntero(row.stockMinimo)),
    precioCompra: nanSiInvalido(normalizeMoney(row.precioCompra)),
    precioVenta: nanSiInvalido(normalizeMoney(row.precioVenta)),
    codigoBarras: normalizeTexto(row.codigoBarras),
    descripcion: normalizeTexto(row.descripcion),
    subcategoria: normalizeTexto(row.subcategoria),
    fechaVencimiento: normalizeFecha(row.fechaVencimiento),
    lote: normalizeTexto(row.lote),
    laboratorio: normalizeTexto(row.laboratorio),
    requiereFormula: normalizeBoolean(row.requiereFormula),
  }
}

export function normalizeServicioRow(rawRow) {
  const row = filaPorClave(rawRow, MAPA_SERVICIOS)
  return {
    nombre: normalizeTexto(row.nombre),
    categoria: normalizeTexto(row.categoria),
    precioVenta: nanSiInvalido(normalizeMoney(row.precioVenta)),
    descripcion: normalizeTexto(row.descripcion),
  }
}

function isRowEmpty(rawRow) {
  return Object.values(rawRow).every((valor) => valor === undefined || valor === null || String(valor).trim() === '')
}

function validarFilas(rawRows, { normalizar, schema, titulos }) {
  const validRows = []
  const invalidRows = []

  rawRows.forEach((rawRow) => {
    const normalizado = normalizar(rawRow)
    const resultado = schema.safeParse(normalizado)
    // Numero de fila real en Excel, para que la clinica la encuentre.
    const rowNumber = rawRow.__rowNum__ + 1

    if (resultado.success) {
      validRows.push({ rowNumber, data: resultado.data })
    } else {
      const errors = resultado.error.issues.map((issue) => `${titulos[issue.path[0]] || issue.path[0]}: ${issue.message}`)
      invalidRows.push({ rowNumber, data: normalizado, errors })
    }
  })

  return { validRows, invalidRows }
}

/**
 * Recibe { productos, servicios } (filas crudas de parseExcelFile) y devuelve
 * las filas validas e invalidas de cada hoja.
 */
export function validateImportRows({ productos = [], servicios = [] }) {
  const vacio = { validRows: [], invalidRows: [] }
  const productosConDatos = productos.filter((rawRow) => !isRowEmpty(rawRow))
  const serviciosConDatos = servicios.filter((rawRow) => !isRowEmpty(rawRow))

  if (productosConDatos.length === 0 && serviciosConDatos.length === 0) {
    return { productos: vacio, servicios: vacio, globalError: 'El archivo no tiene productos ni servicios para cargar.' }
  }

  const excedida = [
    ['productos', productosConDatos.length],
    ['servicios', serviciosConDatos.length],
  ].find(([, total]) => total > MAX_IMPORT_ROWS)
  if (excedida) {
    return {
      productos: vacio,
      servicios: vacio,
      globalError: `El archivo tiene ${excedida[1]} ${excedida[0]}. El máximo por carga es ${MAX_IMPORT_ROWS}; divídalo en varios archivos.`,
    }
  }

  return {
    productos: validarFilas(productosConDatos, { normalizar: normalizeExcelRow, schema: importRowSchema, titulos: TITULO_PRODUCTOS }),
    servicios: validarFilas(serviciosConDatos, { normalizar: normalizeServicioRow, schema: servicioRowSchema, titulos: TITULO_SERVICIOS }),
    globalError: null,
  }
}

export async function downloadImportTemplate() {
  const bytes = await construirLibroInventario()
  descargarArchivo(bytes, 'plantilla-inventario-bourgelat.xlsx')
}

function buscarHoja(workbook, nombres) {
  const nombre = workbook.SheetNames.find((n) => nombres.includes(normalizarTitulo(n)))
  return nombre ? workbook.Sheets[nombre] : null
}

// El encabezado ya no esta en la fila 1 (arriba van el titulo y el logo):
// se busca, entre las 20 primeras, la fila que tenga la columna «Nombre».
function leerHoja(sheet) {
  if (!sheet?.['!ref']) return []
  const rango = XLSX.utils.decode_range(sheet['!ref'])
  const filas = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: true })
  const indice = filas.slice(0, 20).findIndex((fila) => fila.some((celda) => normalizarTitulo(celda) === 'nombre'))
  if (indice === -1) return []
  return XLSX.utils.sheet_to_json(sheet, { range: rango.s.r + indice, raw: true, defval: '' })
}

export function parseExcelFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const hojaServicios = buscarHoja(workbook, [normalizarTitulo(HOJA_SERVICIOS)])
  const primeraHoja = workbook.Sheets[workbook.SheetNames[0]]
  // Plantilla anterior: una sola hoja «Inventario» con los productos.
  const hojaProductos =
    buscarHoja(workbook, [normalizarTitulo(HOJA_PRODUCTOS), 'inventario']) ||
    (primeraHoja !== hojaServicios ? primeraHoja : null)

  return {
    productos: leerHoja(hojaProductos),
    servicios: leerHoja(hojaServicios),
  }
}
