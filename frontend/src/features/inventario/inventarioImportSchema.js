import * as XLSX from 'xlsx'
import { z } from 'zod'

export const MAX_IMPORT_ROWS = 500

// Fuente unica de verdad: valor exacto que espera el backend, label en espanol
// y una descripcion corta para que el usuario elija la categoria correcta.
export const CATEGORY_INFO = [
  { value: 'medicamento', label: 'Medicamento', descripcion: 'Farmacos y tratamientos que requieren formula o dosificacion.' },
  { value: 'vacuna', label: 'Vacuna', descripcion: 'Biologicos preventivos aplicados en consulta.' },
  { value: 'insumo', label: 'Insumo', descripcion: 'Material medico o de consumo general: gasas, jeringas, guantes.' },
  { value: 'alimento', label: 'Alimento', descripcion: 'Concentrados, snacks y dietas para mascotas.' },
  { value: 'antiparasitario', label: 'Antiparasitario', descripcion: 'Productos contra pulgas, garrapatas y parasitos internos.' },
  { value: 'suplemento', label: 'Suplemento', descripcion: 'Vitaminas y complementos nutricionales.' },
  { value: 'accesorio', label: 'Accesorio', descripcion: 'Collares, correas, juguetes y otros articulos.' },
  { value: 'otro', label: 'Otro', descripcion: 'Cualquier producto que no encaje en las categorias anteriores.' },
]

export const CATEGORY_LABELS = Object.fromEntries(CATEGORY_INFO.map((c) => [c.value, c.label]))

export const IMPORT_CATEGORY_VALUES = CATEGORY_INFO.map((c) => c.value)

// Header del Excel (fila 1) -> clave interna del producto
export const EXCEL_COLUMN_MAP = {
  'Nombre': 'nombre',
  'Categoria': 'categoria',
  'Categoría': 'categoria',
  'Unidad de Medida': 'unidadMedida',
  'Stock': 'stock',
  'Stock Minimo': 'stockMinimo',
  'Stock Mínimo': 'stockMinimo',
  'Precio Compra': 'precioCompra',
  'Precio Venta': 'precioVenta',
  'Codigo de Barras': 'codigoBarras',
  'Código de Barras': 'codigoBarras',
  'Descripcion': 'descripcion',
  'Descripción': 'descripcion',
  'Subcategoria': 'subcategoria',
  'Subcategoría': 'subcategoria',
  'Fecha Vencimiento': 'fechaVencimiento',
  'Lote': 'lote',
  'Laboratorio': 'laboratorio',
  'Requiere Formula': 'requiereFormula',
  'Requiere Fórmula': 'requiereFormula',
}

const TEMPLATE_HEADERS = [
  'Nombre',
  'Categoria',
  'Unidad de Medida',
  'Stock',
  'Stock Minimo',
  'Precio Compra',
  'Precio Venta',
  'Codigo de Barras',
  'Descripcion',
  'Subcategoria',
  'Fecha Vencimiento',
  'Lote',
  'Laboratorio',
  'Requiere Formula',
]

const TEMPLATE_EXAMPLE_ROWS = [
  ['Meloxicam suspension oral', 'medicamento', 'frasco', 10, 5, 15000, 25000, '7701234567890', 'Antiinflamatorio para uso veterinario', '', '2027-01-31', 'LOT-2024-001', 'Bayer', 'no'],
  ['Vacuna Quintuple', 'vacuna', 'dosis', 20, 5, 18000, 32000, '', 'Vacuna preventiva canina', '', '2026-11-30', 'LOT-VAC-2024', 'Zoetis', 'no'],
  ['Jeringa 5ml', 'insumo', 'unidad', 100, 20, 400, 900, '', '', '', '', '', '', 'no'],
  ['Concentrado adulto raza pequeña 3kg', 'alimento', 'bolsa', 15, 3, 32000, 48000, '', 'Alimento seco para perro adulto', '', '', '', '', 'no'],
  ['Pipeta antipulgas', 'antiparasitario', 'pipeta', 30, 5, 9000, 16000, '', '', '', '2026-06-30', '', '', 'no'],
]

const TRUE_VALUES = new Set(['si', 'sí', 'true', '1', 'x', 'yes'])

const normalizeBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor
  if (valor === undefined || valor === null || valor === '') return false
  return TRUE_VALUES.has(String(valor).trim().toLowerCase())
}

const normalizeMoney = (valor) => {
  if (valor === undefined || valor === null || valor === '') return 0
  if (typeof valor === 'number') return valor
  const limpio = String(valor).trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  return limpio === '' ? 0 : Number(limpio)
}

export const importRowSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(160, 'Maximo 160 caracteres'),
  categoria: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => IMPORT_CATEGORY_VALUES.includes(value), {
      message: `Categoria invalida. Usa: ${IMPORT_CATEGORY_VALUES.join(', ')}`,
    }),
  unidadMedida: z.string().trim().min(1, 'La unidad de medida es requerida').max(40, 'Maximo 40 caracteres'),
  stock: z.coerce.number().int('Debe ser un entero').min(0, 'No puede ser negativo').default(0),
  stockMinimo: z.coerce.number().int('Debe ser un entero').min(0, 'No puede ser negativo').default(5),
  precioCompra: z.coerce.number().min(0, 'No puede ser negativo').default(0),
  precioVenta: z.coerce.number().min(0, 'No puede ser negativo').default(0),
  codigoBarras: z.string().trim().max(120).optional().or(z.literal('')),
  descripcion: z.string().trim().max(1000).optional().or(z.literal('')),
  subcategoria: z.string().trim().max(120).optional().or(z.literal('')),
  fechaVencimiento: z.string().trim().optional().or(z.literal('')),
  lote: z.string().trim().max(80).optional().or(z.literal('')),
  laboratorio: z.string().trim().max(120).optional().or(z.literal('')),
  requiereFormula: z.boolean().default(false),
})

export function normalizeExcelRow(rawRow) {
  const row = {}
  Object.entries(rawRow).forEach(([header, valor]) => {
    const key = EXCEL_COLUMN_MAP[header.trim()]
    if (key) row[key] = valor
  })

  return {
    ...row,
    precioCompra: normalizeMoney(row.precioCompra),
    precioVenta: normalizeMoney(row.precioVenta),
    requiereFormula: normalizeBoolean(row.requiereFormula),
  }
}

function isRowEmpty(rawRow) {
  return Object.values(rawRow).every((valor) => valor === undefined || valor === null || String(valor).trim() === '')
}

export function validateImportRows(rawRows) {
  const filasConDatos = rawRows.filter((rawRow) => !isRowEmpty(rawRow))

  if (filasConDatos.length === 0) {
    return { validRows: [], invalidRows: [], globalError: 'El archivo no contiene filas de datos.' }
  }

  if (filasConDatos.length > MAX_IMPORT_ROWS) {
    return {
      validRows: [],
      invalidRows: [],
      globalError: `El archivo tiene ${filasConDatos.length} filas. El maximo permitido por importacion es ${MAX_IMPORT_ROWS}.`,
    }
  }

  const validRows = []
  const invalidRows = []

  filasConDatos.forEach((rawRow, index) => {
    const normalizado = normalizeExcelRow(rawRow)
    const resultado = importRowSchema.safeParse(normalizado)
    const rowNumber = index + 2 // fila 1 es encabezado

    if (resultado.success) {
      validRows.push({ rowNumber, data: resultado.data })
    } else {
      const errors = resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      invalidRows.push({ rowNumber, data: normalizado, errors })
    }
  })

  return { validRows, invalidRows, globalError: null }
}

export function downloadImportTemplate() {
  const hojaInventario = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE_ROWS])

  const hojaCategorias = XLSX.utils.aoa_to_sheet([
    ['Valor exacto a escribir', 'Nombre', 'Cuando usarla'],
    ...CATEGORY_INFO.map((c) => [c.value, c.label, c.descripcion]),
  ])
  hojaCategorias['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 60 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, hojaInventario, 'Inventario')
  XLSX.utils.book_append_sheet(workbook, hojaCategorias, 'Categorias validas')
  XLSX.writeFile(workbook, 'plantilla-inventario-bourgelat.xlsx')
}

export function parseExcelFile(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
}
