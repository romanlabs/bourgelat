export const PRODUCT_CATEGORIES = [
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'vacuna', label: 'Vacuna' },
  { value: 'insumo', label: 'Insumo' },
  { value: 'alimento', label: 'Alimento' },
  { value: 'accesorio', label: 'Accesorio' },
  { value: 'antiparasitario', label: 'Antiparasitario' },
  { value: 'suplemento', label: 'Suplemento' },
]

// Mismo ENUM que backend/src/models/Gasto.js. El orden fija también el color de
// cada categoría en las gráficas: no reordenar.
export const CATEGORIAS_GASTO = [
  { value: 'nomina', label: 'Nómina' },
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'servicios_publicos', label: 'Servicios públicos' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

import { Banknote, CreditCard, HandCoins, Landmark, MoreHorizontal, Smartphone } from 'lucide-react'

export const PAYMENT_METHOD_ICONS = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  tarjeta_debito: CreditCard,
  tarjeta_credito: CreditCard,
  transferencia: Landmark,
  nequi: Smartphone,
  daviplata: Smartphone,
  credito: HandCoins,
  otro: MoreHorizontal,
}

// Etiquetas cortas del selector del carrito. Ya no se abrevian: la grilla de
// dos columnas les da ancho suficiente y "Transfer." se leia cortado.
export const PAYMENT_METHOD_SHORT = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Débito',
  tarjeta_credito: 'Crédito',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  otro: 'Otro',
}

// Medios por los que entra la plata, en el mismo orden que el backend
// (reportes/medios-pago) y que los gastos. 'credito' no está: el fiado entra por
// el medio de cada abono. Bancos y billeteras van en transferencia.
export const MEDIOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'otro', label: 'Otro' },
]
