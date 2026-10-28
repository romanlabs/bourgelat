// Libro de Excel de inventario: la misma estructura sirve de plantilla vacia
// y de exportacion, asi un archivo exportado se puede editar y volver a importar.
// ExcelJS se carga solo al descargar (pesa ~1 MB) y es el que pone colores,
// bordes y listas desplegables; la lectura sigue en SheetJS (inventarioImportSchema).

// Colores en ARGB, alineados con el rediseño «Petróleo y blanco» (index.css).
const COLOR = {
  petroleo: 'FF0F4C5C',
  tinta: 'FF10262E',
  textoSuave: 'FF5D727A',
  ambar: 'FFF2A93B',
  blanco: 'FFFFFFFF',
  filaClara: 'FFF5FAFB',
  filaAlterna: 'FFE6F0F2',
  borde: 'FFC5DAE0',
}

export const CATEGORIAS_PRODUCTO = [
  { value: 'medicamento', label: 'Medicamento', descripcion: 'Fármacos y tratamientos que requieren fórmula o dosificación.' },
  { value: 'vacuna', label: 'Vacuna', descripcion: 'Biológicos preventivos aplicados en consulta.' },
  { value: 'insumo', label: 'Insumo', descripcion: 'Material médico o de consumo general: gasas, jeringas, guantes.' },
  { value: 'alimento', label: 'Alimento', descripcion: 'Concentrados, snacks y dietas para mascotas.' },
  { value: 'antiparasitario', label: 'Antiparasitario', descripcion: 'Productos contra pulgas, garrapatas y parásitos internos.' },
  { value: 'suplemento', label: 'Suplemento', descripcion: 'Vitaminas y complementos nutricionales.' },
  { value: 'accesorio', label: 'Accesorio', descripcion: 'Collares, correas, juguetes y otros artículos.' },
  { value: 'otro', label: 'Otro', descripcion: 'Cualquier producto que no encaje en las categorías anteriores.' },
]

// Sugerencias: la columna acepta cualquier texto, la lista solo ayuda.
const UNIDADES_SUGERIDAS = ['unidad', 'frasco', 'caja', 'tableta', 'ampolla', 'dosis', 'pipeta', 'bolsa', 'sobre', 'tubo', 'ml', 'kg']
const CATEGORIAS_SERVICIO = ['Consulta', 'Vacunación', 'Cirugía', 'Laboratorio', 'Imagenología', 'Hospitalización', 'Estética', 'Procedimiento', 'Otro']

const FORMATO_PESOS = '"$" #,##0'
const FORMATO_FECHA = 'dd/mm/yyyy'

// key = campo del backend. requerido marca el encabezado con «*».
export const COLUMNAS_PRODUCTOS = [
  { key: 'nombre', titulo: 'Nombre', ancho: 36, requerido: true, ayuda: 'Nombre con el que lo busca en caja. Ej: Meloxicam 1,5 mg/ml' },
  { key: 'categoria', titulo: 'Categoría', ancho: 18, requerido: true, lista: CATEGORIAS_PRODUCTO.map((c) => c.label), estricta: true, ayuda: 'Elija de la lista.' },
  { key: 'unidadMedida', titulo: 'Unidad de medida', ancho: 17, requerido: true, lista: UNIDADES_SUGERIDAS, ayuda: 'Cómo lo vende: unidad, frasco, caja… Puede escribir otra.' },
  { key: 'stock', titulo: 'Stock', ancho: 10, tipo: 'entero', ayuda: 'Cantidad que hay hoy en bodega.' },
  { key: 'stockMinimo', titulo: 'Stock mínimo', ancho: 13, tipo: 'entero', ayuda: 'Con esta cantidad o menos le avisamos que se está acabando. Si lo deja vacío: 5.' },
  { key: 'precioCompra', titulo: 'Precio compra', ancho: 16, tipo: 'pesos', ayuda: 'Lo que le cuesta a la clínica, sin puntos ni signo $.' },
  { key: 'precioVenta', titulo: 'Precio venta', ancho: 16, tipo: 'pesos', ayuda: 'Precio al cliente, sin puntos ni signo $.' },
  { key: 'codigoBarras', titulo: 'Código de barras', ancho: 19, tipo: 'texto', ayuda: 'Opcional. Para vender con el lector.' },
  { key: 'descripcion', titulo: 'Descripción', ancho: 38, ayuda: 'Opcional.' },
  { key: 'subcategoria', titulo: 'Subcategoría', ancho: 18, ayuda: 'Opcional. Ej: antibiótico, AINE, felino.' },
  { key: 'fechaVencimiento', titulo: 'Fecha de vencimiento', ancho: 15, tipo: 'fecha', ayuda: 'Opcional. Formato día/mes/año.' },
  { key: 'lote', titulo: 'Lote', ancho: 16, tipo: 'texto', ayuda: 'Opcional.' },
  { key: 'laboratorio', titulo: 'Laboratorio', ancho: 20, ayuda: 'Opcional.' },
  { key: 'requiereFormula', titulo: 'Requiere fórmula', ancho: 13, lista: ['Sí', 'No'], estricta: true, ayuda: 'Sí si solo se vende con fórmula médica.' },
]

export const COLUMNAS_SERVICIOS = [
  { key: 'nombre', titulo: 'Nombre', ancho: 40, requerido: true, ayuda: 'Ej: Consulta general, Vacuna antirrábica (aplicación).' },
  { key: 'categoria', titulo: 'Categoría', ancho: 20, lista: CATEGORIAS_SERVICIO, ayuda: 'Para agrupar en reportes. Puede escribir otra.' },
  { key: 'precioVenta', titulo: 'Precio venta', ancho: 16, requerido: true, tipo: 'pesos', ayuda: 'Precio al cliente, sin puntos ni signo $.' },
  { key: 'descripcion', titulo: 'Descripción', ancho: 50, ayuda: 'Opcional.' },
]

export const HOJA_PRODUCTOS = 'Productos'
export const HOJA_SERVICIOS = 'Servicios'

const EJEMPLOS_PRODUCTOS = [
  { nombre: 'Meloxicam suspensión oral', categoria: 'medicamento', unidadMedida: 'frasco', stock: 10, stockMinimo: 5, precioCompra: 15000, precioVenta: 25000, codigoBarras: '7701234567890', descripcion: 'Antiinflamatorio para uso veterinario', laboratorio: 'Bayer', lote: 'LOT-2024-001', fechaVencimiento: '2027-01-31', requiereFormula: true },
  { nombre: 'Vacuna quíntuple canina', categoria: 'vacuna', unidadMedida: 'dosis', stock: 20, stockMinimo: 5, precioCompra: 18000, precioVenta: 32000, laboratorio: 'Zoetis', lote: 'LOT-VAC-2024', fechaVencimiento: '2026-11-30', requiereFormula: false },
  { nombre: 'Concentrado adulto raza pequeña 3 kg', categoria: 'alimento', unidadMedida: 'bolsa', stock: 15, stockMinimo: 3, precioCompra: 32000, precioVenta: 48000, requiereFormula: false },
]

const EJEMPLOS_SERVICIOS = [
  { nombre: 'Consulta general', categoria: 'Consulta', precioVenta: 50000, descripcion: 'Valoración clínica completa' },
  { nombre: 'Aplicación de vacuna', categoria: 'Vacunación', precioVenta: 15000 },
  { nombre: 'Baño medicado', categoria: 'Estética', precioVenta: 40000 },
]

export const FILA_ENCABEZADO = 6
// Filas con formato listas para escribir debajo de los datos.
const FILAS_PREPARADAS = 300

const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS_PRODUCTO.map((c) => [c.value, c.label]))

function bordeFino(color = COLOR.borde) {
  const lado = { style: 'thin', color: { argb: color } }
  return { top: lado, left: lado, bottom: lado, right: lado }
}

function relleno(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

// '2027-01-31' -> Date en UTC (ExcelJS escribe fechas en UTC y asi no se corre un dia).
function aFecha(valor) {
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function valorCelda(columna, fila) {
  const valor = fila[columna.key]
  if (columna.key === 'requiereFormula') return valor === undefined || valor === null ? null : valor ? 'Sí' : 'No'
  if (valor === undefined || valor === null || valor === '') return null
  if (columna.key === 'categoria' && CATEGORIA_LABEL[valor]) return CATEGORIA_LABEL[valor]
  if (columna.tipo === 'fecha') return aFecha(valor)
  if (columna.tipo === 'pesos' || columna.tipo === 'entero') {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
  }
  return String(valor)
}

function encabezadoMarca(hoja, columnas, { titulo, subtitulo, nota }) {
  const ultimaColumna = columnas.length

  hoja.getRow(1).height = 30
  hoja.getRow(2).height = 20
  hoja.getRow(3).height = 20
  hoja.getRow(4).height = 4
  hoja.getRow(5).height = 10

  // Espacio reservado para el logo de Bourgelat (A1:A3), vacio para poner la
  // imagen encima con libro.addImage sin mover el resto del diseño.
  hoja.mergeCells(1, 1, 3, 1)

  const textos = [
    { fila: 1, valor: titulo, font: { size: 18, bold: true, color: { argb: COLOR.petroleo } }, vertical: 'bottom' },
    { fila: 2, valor: subtitulo, font: { size: 11, color: { argb: COLOR.tinta } }, vertical: 'middle' },
    { fila: 3, valor: nota, font: { size: 10, italic: true, color: { argb: COLOR.textoSuave } }, vertical: 'top' },
  ]
  textos.forEach(({ fila, valor, font, vertical }) => {
    hoja.mergeCells(fila, 2, fila, ultimaColumna)
    const celda = hoja.getCell(fila, 2)
    celda.value = valor
    celda.font = { name: 'Calibri', ...font }
    celda.alignment = { vertical, indent: 1 }
  })

  // Franja ámbar bajo el encabezado, el acento de la marca.
  for (let columna = 1; columna <= ultimaColumna; columna += 1) {
    hoja.getCell(4, columna).fill = relleno(COLOR.ambar)
  }
}

function filaTitulos(hoja, columnas) {
  const fila = hoja.getRow(FILA_ENCABEZADO)
  fila.height = 34
  columnas.forEach((columna, indice) => {
    const celda = fila.getCell(indice + 1)
    celda.value = columna.requerido ? `${columna.titulo} *` : columna.titulo
    celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR.blanco } }
    celda.fill = relleno(COLOR.petroleo)
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    celda.border = bordeFino(COLOR.petroleo)
    celda.note = columna.ayuda
  })
}

function validacion(columna) {
  if (columna.lista) {
    return {
      type: 'list',
      allowBlank: true,
      formulae: [`"${columna.lista.join(',')}"`],
      showErrorMessage: true,
      errorStyle: columna.estricta ? 'stop' : 'information',
      errorTitle: columna.titulo,
      error: columna.estricta ? 'Elija un valor de la lista.' : 'No está en la lista; se guardará tal cual.',
    }
  }
  if (columna.tipo === 'pesos' || columna.tipo === 'entero') {
    return {
      type: columna.tipo === 'entero' ? 'whole' : 'decimal',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: columna.titulo,
      error: 'Escriba solo el número, sin puntos ni signo $.',
    }
  }
  if (columna.tipo === 'fecha') {
    return {
      type: 'date',
      operator: 'greaterThan',
      allowBlank: true,
      formulae: [new Date(Date.UTC(2000, 0, 1))],
      showErrorMessage: true,
      errorTitle: columna.titulo,
      error: 'Escriba la fecha como día/mes/año, por ejemplo 31/01/2027.',
    }
  }
  return null
}

function formatoFila(hoja, columnas, numeroFila, { ejemplo = false } = {}) {
  const fila = hoja.getRow(numeroFila)
  fila.height = 22
  const fondo = (numeroFila - FILA_ENCABEZADO) % 2 === 0 ? COLOR.filaAlterna : COLOR.filaClara

  columnas.forEach((columna, indice) => {
    const celda = fila.getCell(indice + 1)
    const numerica = columna.tipo === 'pesos' || columna.tipo === 'entero'
    celda.fill = relleno(fondo)
    celda.border = bordeFino()
    celda.font = { name: 'Calibri', size: 11, italic: ejemplo, color: { argb: ejemplo ? COLOR.textoSuave : COLOR.tinta } }
    celda.alignment = {
      vertical: 'middle',
      horizontal: numerica ? 'right' : columna.lista || columna.tipo === 'fecha' ? 'center' : 'left',
      indent: numerica || columna.lista || columna.tipo === 'fecha' ? 0 : 1,
    }

    if (columna.tipo === 'pesos') celda.numFmt = FORMATO_PESOS
    if (columna.tipo === 'entero') celda.numFmt = '0'
    if (columna.tipo === 'fecha') celda.numFmt = FORMATO_FECHA
    // Texto: evita que Excel convierta códigos de barras en 7,7E+12.
    if (columna.tipo === 'texto') celda.numFmt = '@'

    const reglas = validacion(columna)
    if (reglas) celda.dataValidation = reglas
  })
}

function hojaDatos(libro, { nombre, columnas, filas, ejemplo, encabezado }) {
  const hoja = libro.addWorksheet(nombre, {
    properties: { tabColor: { argb: COLOR.petroleo } },
    views: [{ state: 'frozen', xSplit: 1, ySplit: FILA_ENCABEZADO, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
  hoja.columns = columnas.map((columna) => ({ width: columna.ancho }))

  encabezadoMarca(hoja, columnas, encabezado)
  filaTitulos(hoja, columnas)

  filas.forEach((fila, indice) => {
    const numeroFila = FILA_ENCABEZADO + 1 + indice
    formatoFila(hoja, columnas, numeroFila, { ejemplo })
    columnas.forEach((columna, columnaIndice) => {
      hoja.getRow(numeroFila).getCell(columnaIndice + 1).value = valorCelda(columna, fila)
    })
  })

  const desde = FILA_ENCABEZADO + 1 + filas.length
  const hasta = FILA_ENCABEZADO + Math.max(FILAS_PREPARADAS, filas.length + 50)
  for (let numeroFila = desde; numeroFila <= hasta; numeroFila += 1) {
    formatoFila(hoja, columnas, numeroFila)
  }

  hoja.autoFilter = {
    from: { row: FILA_ENCABEZADO, column: 1 },
    to: { row: FILA_ENCABEZADO, column: columnas.length },
  }
}

function hojaAyuda(libro, { esExportacion }) {
  const hoja = libro.addWorksheet('Ayuda', {
    properties: { tabColor: { argb: COLOR.ambar } },
    views: [{ showGridLines: false }],
  })
  hoja.columns = [{ width: 3 }, { width: 22 }, { width: 24 }, { width: 70 }]

  const titulo = hoja.getCell('B2')
  titulo.value = 'Cómo llenar este archivo'
  titulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR.petroleo } }
  hoja.getRow(2).height = 28

  const pasos = [
    esExportacion
      ? 'Este archivo es una copia de su inventario. Puede editarlo y volver a cargarlo: los nombres que ya existen se omiten.'
      : 'Las filas en gris y cursiva son ejemplos: reemplácelas o bórrelas antes de cargar el archivo.',
    'En la hoja «Productos» va lo que vende o usa la clínica; en «Servicios», consultas, cirugías y procedimientos.',
    'Las columnas con * son obligatorias. Pase el mouse por cada título para ver una ayuda.',
    'Los precios van sin puntos ni signo $: escriba 25000 y Excel lo muestra como $ 25.000.',
    'La receta de insumos de cada servicio se arma después en Bourgelat, en Inventario › Servicios.',
    'Para cargarlo: Inventario › Importar Excel. Antes de guardar puede revisar fila por fila.',
  ]
  pasos.forEach((texto, indice) => {
    const fila = 4 + indice
    const numero = hoja.getCell(fila, 2)
    numero.value = `${indice + 1}.`
    numero.alignment = { horizontal: 'right', vertical: 'top' }
    numero.font = { bold: true, color: { argb: COLOR.petroleo } }
    hoja.mergeCells(fila, 3, fila, 4)
    const celda = hoja.getCell(fila, 3)
    celda.value = texto
    celda.alignment = { wrapText: true, vertical: 'top', indent: 1 }
    celda.font = { color: { argb: COLOR.tinta } }
    hoja.getRow(fila).height = 30
  })

  const inicioTabla = 4 + pasos.length + 2
  const subtitulo = hoja.getCell(inicioTabla - 1, 2)
  subtitulo.value = 'Categorías de productos'
  subtitulo.font = { size: 13, bold: true, color: { argb: COLOR.petroleo } }

  hoja.mergeCells(inicioTabla, 3, inicioTabla, 4)
  ;[[2, 'Categoría'], [3, 'Cuándo usarla']].forEach(([columna, texto]) => {
    const celda = hoja.getCell(inicioTabla, columna)
    celda.value = texto
    celda.font = { bold: true, color: { argb: COLOR.blanco } }
    celda.fill = relleno(COLOR.petroleo)
    celda.border = bordeFino(COLOR.petroleo)
    celda.alignment = { vertical: 'middle', indent: 1 }
  })
  hoja.getRow(inicioTabla).height = 24

  CATEGORIAS_PRODUCTO.forEach((categoria, indice) => {
    const fila = inicioTabla + 1 + indice
    hoja.mergeCells(fila, 3, fila, 4)
    hoja.getCell(fila, 2).value = categoria.label
    hoja.getCell(fila, 3).value = categoria.descripcion
    const fondo = indice % 2 === 0 ? COLOR.filaClara : COLOR.filaAlterna
    ;[2, 3, 4].forEach((columna) => {
      const celda = hoja.getCell(fila, columna)
      celda.fill = relleno(fondo)
      celda.border = bordeFino()
      celda.alignment = { vertical: 'middle', indent: 1, wrapText: true }
    })
    hoja.getCell(fila, 2).font = { bold: true, color: { argb: COLOR.tinta } }
    hoja.getRow(fila).height = 22
  })
}

function fechaHoy() {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
}

/**
 * Arma el libro y devuelve sus bytes.
 * Sin productos ni servicios es la plantilla con ejemplos; con datos, la exportacion.
 */
export async function construirLibroInventario({ productos = null, servicios = null, nombreClinica = '' } = {}) {
  const { default: ExcelJS } = await import('exceljs')
  const esExportacion = Array.isArray(productos) || Array.isArray(servicios)

  const libro = new ExcelJS.Workbook()
  libro.creator = 'Bourgelat'
  libro.created = new Date()

  const subtituloExportacion = `Exportado el ${fechaHoy()}${nombreClinica ? ` · ${nombreClinica}` : ''}`

  hojaDatos(libro, {
    nombre: HOJA_PRODUCTOS,
    columnas: COLUMNAS_PRODUCTOS,
    filas: esExportacion ? productos || [] : EJEMPLOS_PRODUCTOS,
    ejemplo: !esExportacion,
    encabezado: {
      titulo: esExportacion ? 'Inventario de productos' : 'Plantilla de productos',
      subtitulo: esExportacion ? subtituloExportacion : 'Medicamentos, vacunas, insumos, alimentos y accesorios: una fila por producto.',
      nota: 'Los títulos con * son obligatorios. Pase el mouse por cada título para ver una ayuda.',
    },
  })

  hojaDatos(libro, {
    nombre: HOJA_SERVICIOS,
    columnas: COLUMNAS_SERVICIOS,
    filas: esExportacion ? servicios || [] : EJEMPLOS_SERVICIOS,
    ejemplo: !esExportacion,
    encabezado: {
      titulo: esExportacion ? 'Servicios de la clínica' : 'Plantilla de servicios',
      subtitulo: esExportacion ? subtituloExportacion : 'Consultas, vacunaciones, cirugías y procedimientos: una fila por servicio.',
      nota: 'La receta de insumos de cada servicio se arma después en Bourgelat.',
    },
  })

  hojaAyuda(libro, { esExportacion })

  return libro.xlsx.writeBuffer()
}

export function descargarArchivo(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
