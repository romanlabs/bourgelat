import { Banknote, HandCoins, Package, ShoppingBag, Truck, MoreHorizontal } from 'lucide-react'

export const MOVIMIENTO_CAJA_MOTIVOS = [
  { value: 'fondo_adicional', label: 'Fondo adicional' },
  { value: 'retiro_domicilio', label: 'Retiro para domicilio' },
  { value: 'gasto_menor', label: 'Gasto menor' },
  { value: 'pago_proveedor', label: 'Pago a proveedor' },
  { value: 'prestamo_caja_chica', label: 'Prestamo de caja chica' },
  { value: 'otro', label: 'Otro' },
]

// Motivos que solo genera el sistema (no se ofrecen en el formulario manual).
const MOTIVOS_SISTEMA_LABELS = {
  gasto_negocio: 'Gasto del negocio',
  devolucion_venta: 'Devolución de venta anulada',
}

export const motivoMovimientoLabel = (motivo) =>
  MOVIMIENTO_CAJA_MOTIVOS.find((m) => m.value === motivo)?.label ||
  MOTIVOS_SISTEMA_LABELS[motivo] ||
  motivo

export const MOVIMIENTO_CAJA_ICONS = {
  fondo_adicional: Banknote,
  retiro_domicilio: Truck,
  gasto_menor: ShoppingBag,
  pago_proveedor: Package,
  prestamo_caja_chica: HandCoins,
  otro: MoreHorizontal,
}

// Categorias exactas para justificar una diferencia de caja al cierre.
export const CATEGORIA_DIFERENCIA_OPCIONES = [
  { value: 'error_vuelto', label: 'Error en el vuelto' },
  { value: 'gasto_no_registrado', label: 'Gasto pagado en efectivo no registrado en el sistema' },
  { value: 'redondeo', label: 'Diferencia por redondeo' },
  { value: 'pago_no_registrado', label: 'Falto registrar un pago' },
  { value: 'causa_desconocida', label: 'No identifico la causa' },
  { value: 'otro', label: 'Otro' },
]

export const CATEGORIA_DIFERENCIA_LABELS = CATEGORIA_DIFERENCIA_OPCIONES.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

// Notas rapidas sugeridas cuando la diferencia es leve (entre $1 y $3.000).
export const NOTAS_RAPIDAS_DIFERENCIA_LEVE = ['Redondeo', 'Vuelto', 'Propina no registrada']

export const UMBRAL_COMENTARIO_OPCIONAL = 3000
export const UMBRAL_REVISION_ADMIN = 30000
export const MIN_CARACTERES_JUSTIFICACION = 20

// Rango de fechas de los filtros de los listados: en escritorio fijo de 150px;
// en celular reparte el ancho y usa letra de 16px (iOS no hace zoom al enfocar).
export const claseFechaFiltro = (movil) =>
  movil
    ? 'h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 text-base tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    : 'h-10 w-[150px] rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Botón «Ver historial / Ocultar» de los listados plegables.
export const claseToggleLista = (movil) =>
  movil
    ? 'inline-flex h-11 w-full items-center justify-center gap-1.5 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    : 'inline-flex h-10 shrink-0 items-center gap-1.5 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
