import { Banknote, HandCoins, Package, ShoppingBag, Truck, MoreHorizontal } from 'lucide-react'

export const MOVIMIENTO_CAJA_MOTIVOS = [
  { value: 'fondo_adicional', label: 'Fondo adicional' },
  { value: 'retiro_domicilio', label: 'Retiro para domicilio' },
  { value: 'gasto_menor', label: 'Gasto menor' },
  { value: 'pago_proveedor', label: 'Pago a proveedor' },
  { value: 'prestamo_caja_chica', label: 'Prestamo de caja chica' },
  { value: 'otro', label: 'Otro' },
]

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
